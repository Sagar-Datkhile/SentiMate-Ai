import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { emailService } from '../services/email.service';
import { notificationsRepository } from './notifications.repository';
import type { SupportCategory, BugPriority, BugStatus, EmailDeliveryStatus } from '@sentimate/contracts';

export interface CreateInquiryInput {
  userId: string;
  submitterEmail?: string | null;
  submitterName?: string | null;
  inquiryType?: string;
  category: SupportCategory | string;
  subject: string;
  message: string;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  includeDiagnosticContext?: boolean;
  diagnosticContext?: Record<string, any>;
  idempotencyKey?: string;
}

export interface InquiryRecord {
  id: string;
  referenceId: string;
  userId: string;
  submitterEmail: string | null;
  submitterName: string | null;
  inquiryType: string;
  category: string;
  subject: string;
  message: string;
  reproductionSteps?: string | null;
  expectedBehavior?: string | null;
  actualBehavior?: string | null;
  includeDiagnosticContext: boolean;
  diagnosticContext?: Record<string, any> | null;
  idempotencyKey?: string | null;
  status: BugStatus | string;
  priority: BugPriority | string;
  internalNotes?: string;
  emailDeliveryStatus: EmailDeliveryStatus | string;
  emailDeliveryAttempts: number;
  emailLastError?: string | null;
  emailRecipients?: string[];
  createdAt: string;
  updatedAt: string;
  events?: InquiryAuditEvent[];
}

export interface InquiryAuditEvent {
  id: string;
  inquiryId: string;
  actorId: string;
  actorEmail?: string | null;
  action: string;
  oldState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  createdAt: string;
}

export interface ListInquiriesFilter {
  category?: string;
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function generateReferenceId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF-${dateStr}-${randomSuffix}`;
}

export class SupportRepository {
  private getClient(useAdmin = true) {
    if (useAdmin && env.supabaseServiceKey) {
      return createAdminClient();
    }
    return createServerSupabaseClient();
  }

  /**
   * Submit and persist an inquiry or bug report with idempotency check,
   * then trigger email dispatch.
   */
  async submitInquiry(input: CreateInquiryInput): Promise<{
    ok: boolean;
    referenceId: string;
    inquiryId: string;
    emailDeliveryStatus: EmailDeliveryStatus | string;
    isDuplicate?: boolean;
    message: string;
  }> {
    const supabase = await this.getClient(true);

    // 1. Idempotency Check
    if (input.idempotencyKey) {
      try {
        const { data: existing, error: colError } = await supabase
          .from('support_inquiries')
          .select('*')
          .eq('idempotency_key', input.idempotencyKey)
          .maybeSingle();

        if (existing) {
          const refId = existing.reference_id || existing.diagnostic_context?.referenceId || `REF-${existing.id.slice(0, 8)}`;
          return {
            ok: true,
            referenceId: refId,
            inquiryId: existing.id,
            emailDeliveryStatus: existing.email_delivery_status || existing.diagnostic_context?.emailDelivery?.status || 'sent',
            isDuplicate: true,
            message: 'Request received (previous duplicate acknowledged).',
          };
        }

        // If column error or not found by column, fallback to diagnostic_context
        if (colError || !existing) {
          const { data: fallbackExisting } = await supabase
            .from('support_inquiries')
            .select('*')
            .contains('diagnostic_context', { idempotencyKey: input.idempotencyKey })
            .maybeSingle();

          if (fallbackExisting) {
            const refId = fallbackExisting.reference_id || fallbackExisting.diagnostic_context?.referenceId || `REF-${fallbackExisting.id.slice(0, 8)}`;
            return {
              ok: true,
              referenceId: refId,
              inquiryId: fallbackExisting.id,
              emailDeliveryStatus: fallbackExisting.email_delivery_status || fallbackExisting.diagnostic_context?.emailDelivery?.status || 'sent',
              isDuplicate: true,
              message: 'Request received (previous duplicate acknowledged).',
            };
          }
        }
      } catch (err: any) {
        // Proceed with creation
      }
    }

    const referenceId = generateReferenceId();
    const defaultPriority: BugPriority = 'medium';
    const initialStatus = 'open';

    // Pack comprehensive structured metadata into diagnostic_context as durable storage
    const richContext: Record<string, any> = {
      ...(input.includeDiagnosticContext ? input.diagnosticContext || {} : {}),
      referenceId,
      idempotencyKey: input.idempotencyKey || null,
      submitterEmail: input.submitterEmail || null,
      submitterName: input.submitterName || null,
      reproductionSteps: input.reproductionSteps || null,
      expectedBehavior: input.expectedBehavior || null,
      actualBehavior: input.actualBehavior || null,
      priority: defaultPriority,
      internalNotes: '',
      history: [
        {
          action: 'created',
          actorEmail: input.submitterEmail || 'Student User',
          timestamp: new Date().toISOString(),
          notes: 'Report submitted by student user.',
        },
      ],
      emailDelivery: {
        status: 'queued',
        attempts: 0,
        lastError: null,
        recipients: emailService.getRecipientsForCategory(input.category),
      },
    };

    let inquiryId = `inq-${Date.now()}`;

    if (env.isConfigured.supabase) {
      // Resolve valid UUID if non-UUID mock ID passed
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let targetUserId = input.userId;
      if (!UUID_REGEX.test(targetUserId)) {
        try {
          const { data: anyProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
          if (anyProfile?.id) {
            targetUserId = anyProfile.id;
          }
        } catch {
          // keep targetUserId
        }
      }

      // 2. Persist to support_inquiries
      // Try full additive schema first, fallback to basic if migration pending
      const fullPayload: Record<string, any> = {
        user_id: targetUserId,
        reference_id: referenceId,
        submitter_email: input.submitterEmail || null,
        submitter_name: input.submitterName || null,
        inquiry_type: input.inquiryType || (input.category === 'bug' ? 'report_problem' : 'contact_support'),
        category: input.category,
        subject: input.subject.trim(),
        message: input.message.trim(),
        reproduction_steps: input.reproductionSteps || null,
        expected_behavior: input.expectedBehavior || null,
        actual_behavior: input.actualBehavior || null,
        include_diagnostic_context: Boolean(input.includeDiagnosticContext),
        diagnostic_context: richContext,
        idempotency_key: input.idempotencyKey || null,
        status: initialStatus,
        email_delivery_status: 'queued',
        email_delivery_attempts: 0,
        email_recipients: richContext.emailDelivery.recipients,
      };

      let insertResult = await supabase
        .from('support_inquiries')
        .insert(fullPayload)
        .select('id')
        .maybeSingle();

      if (insertResult.error) {
        // Fallback for pre-migration schema: retain reference_id and base columns + richContext
        console.warn('[SupportRepository] Inserting with fallback schema due to column mismatch:', insertResult.error.message);
        const basePayload: Record<string, any> = {
          user_id: targetUserId,
          reference_id: referenceId,
          inquiry_type: input.inquiryType || (input.category === 'bug' ? 'report_problem' : 'contact_support'),
          subject: input.subject.trim(),
          message: input.message.trim(),
          category: input.category,
          include_diagnostic_context: Boolean(input.includeDiagnosticContext),
          diagnostic_context: richContext,
          status: 'open',
        };

        insertResult = await supabase
          .from('support_inquiries')
          .insert(basePayload)
          .select('id')
          .maybeSingle();

        if (insertResult.error && insertResult.error.message.includes('reference_id')) {
          delete basePayload.reference_id;
          insertResult = await supabase
            .from('support_inquiries')
            .insert(basePayload)
            .select('id')
            .single();
        }

        if (insertResult.error) {
          console.error('[SupportRepository] Fallback insert failed:', insertResult.error.message);
          throw new Error(`Failed to persist support inquiry: ${insertResult.error.message}`);
        }
      }

      if (insertResult.data?.id) {
        inquiryId = insertResult.data.id;
      }

      // Initialize admin metadata table if it exists
      try {
        await supabase
          .from('support_inquiry_admin_metadata')
          .insert({
            inquiry_id: inquiryId,
            priority: defaultPriority,
            internal_notes: '',
          });
      } catch {
        // Table migrating, richContext already holds priority and notes
      }
    }

    // 3. Dispatch Email via Nodemailer
    const adminUrl = env.appUrl ? `${env.appUrl}/admin/bugs?ref=${referenceId}` : undefined;

    const emailResult = await emailService.sendInquiryNotification({
      referenceId,
      category: input.category,
      subject: input.subject,
      message: input.message,
      submitterName: input.submitterName,
      submitterEmail: input.submitterEmail,
      reproductionSteps: input.reproductionSteps,
      expectedBehavior: input.expectedBehavior,
      actualBehavior: input.actualBehavior,
      diagnosticContext: input.includeDiagnosticContext ? input.diagnosticContext : undefined,
      adminUrl,
    });

    const finalDeliveryStatus: EmailDeliveryStatus =
      emailResult.status === 'sent' || emailResult.status === 'mocked' ? 'sent' : 'failed';

    // 4. Update delivery metadata
    if (env.isConfigured.supabase) {
      richContext.emailDelivery = {
        status: finalDeliveryStatus,
        attempts: 1,
        lastError: emailResult.error || null,
        recipients: emailResult.recipients,
        sentAt: finalDeliveryStatus === 'sent' ? new Date().toISOString() : null,
      };

      try {
        await supabase
          .from('support_inquiries')
          .update({
            email_delivery_status: finalDeliveryStatus,
            email_delivery_attempts: 1,
            email_last_error: emailResult.error || null,
            email_recipients: emailResult.recipients,
            diagnostic_context: richContext,
          })
          .eq('id', inquiryId);
      } catch {
        // Fallback: update diagnostic_context only
        await supabase
          .from('support_inquiries')
          .update({ diagnostic_context: richContext })
          .eq('id', inquiryId);
      }

      // Record in durable email_outbox_jobs table if it exists
      try {
        await supabase.from('email_outbox_jobs').insert({
          inquiry_id: inquiryId,
          recipients: emailResult.recipients,
          subject: input.subject,
          html_body: 'HTML body dispatched',
          text_body: input.message,
          reply_to: input.submitterEmail || null,
          status: finalDeliveryStatus,
          attempts: 1,
          last_error: emailResult.error || null,
          sent_at: finalDeliveryStatus === 'sent' ? new Date().toISOString() : null,
        });
      } catch {
        // Migration pending
      }
    }

    return {
      ok: true,
      referenceId,
      inquiryId,
      emailDeliveryStatus: finalDeliveryStatus,
      message: 'Request received. Thank you for contacting SentiMate.',
    };
  }

  /**
   * List inquiries and bug reports for Admin Panel with search, pagination, and filters.
   */
  async listInquiriesForAdmin(filter: ListInquiriesFilter): Promise<{
    reports: InquiryRecord[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const supabase = await this.getClient(true);

    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(50, Math.max(1, filter.limit || 15));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('support_inquiries')
      .select('*, support_inquiry_admin_metadata(priority, internal_notes, updated_at)', { count: 'exact' });

    // Category filter
    if (filter.category && filter.category !== 'all') {
      if (filter.category === 'bug') {
        query = query.or('category.eq.bug,category.like.%bug%,inquiry_type.eq.report_problem');
      } else if (filter.category === 'support_other') {
        query = query.not('category', 'like', '%bug%').neq('category', 'bug');
      } else {
        query = query.eq('category', filter.category);
      }
    }

    // Status filter
    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'new') {
        query = query.or('status.eq.new,status.eq.open');
      } else {
        query = query.eq('status', filter.status);
      }
    }

    // Search filter across reference_id, subject, message
    if (filter.search && filter.search.trim()) {
      const term = filter.search.trim();
      query = query.or(`subject.ilike.%${term}%,message.ilike.%${term}%,reference_id.ilike.%${term}%,submitter_email.ilike.%${term}%`);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[SupportRepository] listInquiriesForAdmin error:', error.message);
      // Fallback query without join
      const fallback = await supabase
        .from('support_inquiries')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (fallback.error) {
        throw new Error(`Failed to list inquiries: ${fallback.error.message}`);
      }

      const totalCount = fallback.count || 0;
      const reports = (fallback.data || []).map((row) => this.mapRowToInquiryRecord(row));

      return {
        reports,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit) || 1,
      };
    }

    const totalCount = count || 0;
    const reports = (data || []).map((row) => this.mapRowToInquiryRecord(row));

    // Priority filter (in memory if joined metadata)
    let filteredReports = reports;
    if (filter.priority && filter.priority !== 'all') {
      filteredReports = reports.filter((r) => r.priority === filter.priority);
    }

    return {
      reports: filteredReports,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  /**
   * Retrieve a single inquiry by ID or reference ID with full triage details.
   */
  async getInquiryById(idOrRef: string): Promise<InquiryRecord | null> {
    const supabase = await this.getClient(true);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);

    let query = supabase.from('support_inquiries').select('*, support_inquiry_admin_metadata(*)');

    if (isUuid) {
      query = query.eq('id', idOrRef);
    } else {
      query = query.eq('reference_id', idOrRef);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      // Fallback query without embedded relation
      let fallbackQuery = supabase.from('support_inquiries').select('*');
      if (isUuid) {
        fallbackQuery = fallbackQuery.eq('id', idOrRef);
      } else {
        fallbackQuery = fallbackQuery.eq('reference_id', idOrRef);
      }
      const fallback = await fallbackQuery.maybeSingle();
      if (fallback.data) {
        return this.mapRowToInquiryRecord(fallback.data);
      }

      // Also try searching diagnostic_context->referenceId
      const diagFallback = await supabase
        .from('support_inquiries')
        .select('*')
        .contains('diagnostic_context', { referenceId: idOrRef })
        .maybeSingle();

      if (!diagFallback.data) return null;
      return this.mapRowToInquiryRecord(diagFallback.data);
    }

    return this.mapRowToInquiryRecord(data);
  }

  /**
   * Update bug report triage status, priority, and internal notes.
   * Records audit event with actor details.
   */
  async updateTriage(
    inquiryId: string,
    actor: { id: string; email: string },
    patch: { status?: BugStatus | string; priority?: BugPriority | string; internalNotes?: string }
  ): Promise<InquiryRecord> {
    const supabase = await this.getClient(true);

    const current = await this.getInquiryById(inquiryId);
    if (!current) {
      throw new Error(`Inquiry with ID ${inquiryId} not found.`);
    }

    const oldState = {
      status: current.status,
      priority: current.priority,
      internalNotes: current.internalNotes,
    };

    const newState = {
      status: patch.status || current.status,
      priority: patch.priority || current.priority,
      internalNotes: patch.internalNotes !== undefined ? patch.internalNotes : current.internalNotes,
    };

    // 1. Update status on support_inquiries
    const updatedDiagnostic = {
      ...(current.diagnosticContext || {}),
      priority: newState.priority,
      internalNotes: newState.internalNotes,
      history: [
        ...(current.diagnosticContext?.history || []),
        {
          action: 'triage_updated',
          actorEmail: actor.email,
          timestamp: new Date().toISOString(),
          notes: patch.internalNotes ? `Note: "${patch.internalNotes.slice(0, 50)}..."` : 'Status/Priority updated',
        },
      ],
    };

    const updatePayload: Record<string, any> = {
      status: newState.status,
      diagnostic_context: updatedDiagnostic,
    };

    const { error: updErr } = await supabase
      .from('support_inquiries')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inquiryId);

    if (updErr) {
      await supabase
        .from('support_inquiries')
        .update(updatePayload)
        .eq('id', inquiryId);
    }

    // 2. Update support_inquiry_admin_metadata
    try {
      await supabase
        .from('support_inquiry_admin_metadata')
        .upsert(
          {
            inquiry_id: inquiryId,
            priority: newState.priority,
            internal_notes: newState.internalNotes,
            updated_by: actor.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'inquiry_id' }
        );
    } catch {
      // Handled via diagnostic_context
    }

    // 3. Record audit event
    try {
      await supabase.from('support_inquiry_events').insert({
        inquiry_id: inquiryId,
        actor_id: actor.id,
        actor_email: actor.email,
        action: 'triage_updated',
        old_state: oldState,
        new_state: newState,
      });
    } catch {
      // Table migrating
    }

    // 4. Create student notification if status changed
    if (current.userId && newState.status !== oldState.status) {
      try {
        const statusLabel = String(newState.status).replace('_', ' ');
        await notificationsRepository.createNotification({
          userId: current.userId,
          category: 'support',
          title: `Support update: ${current.referenceId}`,
          preview: `Your inquiry "${current.subject.slice(0, 40)}" status has been updated to ${statusLabel}.`,
          actionUrl: '/student/settings?tab=help',
          sourceReference: current.referenceId,
          eventId: `support-${inquiryId}-${newState.status}`,
          metadata: {
            inquiryId,
            oldStatus: oldState.status,
            newStatus: newState.status,
          },
        });
      } catch (notifErr) {
        console.warn('[SupportRepository] failed to create notification:', notifErr);
      }
    }

    const refreshed = await this.getInquiryById(inquiryId);
    return refreshed!;
  }

  /**
   * Retry email delivery for an existing inquiry/bug report.
   */
  async retryEmailDelivery(inquiryId: string): Promise<InquiryRecord> {
    const inquiry = await this.getInquiryById(inquiryId);
    if (!inquiry) {
      throw new Error(`Inquiry with ID ${inquiryId} not found.`);
    }

    const adminUrl = env.appUrl ? `${env.appUrl}/admin/bugs?ref=${inquiry.referenceId}` : undefined;
    const emailResult = await emailService.sendInquiryNotification({
      referenceId: inquiry.referenceId,
      category: inquiry.category,
      subject: inquiry.subject,
      message: inquiry.message,
      submitterName: inquiry.submitterName,
      submitterEmail: inquiry.submitterEmail,
      reproductionSteps: inquiry.reproductionSteps || undefined,
      expectedBehavior: inquiry.expectedBehavior || undefined,
      actualBehavior: inquiry.actualBehavior || undefined,
      diagnosticContext: inquiry.diagnosticContext || undefined,
      adminUrl,
    });

    const finalDeliveryStatus: EmailDeliveryStatus =
      emailResult.status === 'sent' || emailResult.status === 'mocked' ? 'sent' : 'failed';
    const newAttempts = (inquiry.emailDeliveryAttempts || 0) + 1;

    const supabase = await this.getClient(true);

    const updatedDiagnostic = {
      ...(inquiry.diagnosticContext || {}),
      emailDelivery: {
        status: finalDeliveryStatus,
        attempts: newAttempts,
        lastError: emailResult.error || null,
        recipients: emailResult.recipients,
      },
      history: [
        ...(inquiry.diagnosticContext?.history || []),
        {
          action: 'email_delivery_retried',
          actorEmail: 'admin',
          timestamp: new Date().toISOString(),
          notes: `Email retry result: ${finalDeliveryStatus} (${emailResult.error || 'delivered'})`,
        },
      ],
    };

    const retryPayload: Record<string, any> = {
      email_delivery_status: finalDeliveryStatus,
      email_delivery_attempts: newAttempts,
      email_last_error: emailResult.error || null,
      diagnostic_context: updatedDiagnostic,
    };

    const { error: retryErr } = await supabase
      .from('support_inquiries')
      .update({
        ...retryPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inquiryId);

    if (retryErr) {
      await supabase
        .from('support_inquiries')
        .update({
          diagnostic_context: updatedDiagnostic,
        })
        .eq('id', inquiryId);
    }

    const refreshed = await this.getInquiryById(inquiryId);
    return refreshed!;
  }

  /**
   * Helper to map database rows into typed InquiryRecord.
   */
  private mapRowToInquiryRecord(row: any): InquiryRecord {
    const meta = row.support_inquiry_admin_metadata;
    const diag = row.diagnostic_context || {};

    const rawStatus = row.status === 'open' ? 'new' : row.status || diag.status || 'new';
    const status: BugStatus = ['new', 'in_progress', 'resolved', 'closed'].includes(rawStatus)
      ? rawStatus
      : 'new';

    const rawPriority = meta?.priority || diag.priority || 'medium';
    const priority: BugPriority = ['low', 'medium', 'high', 'critical'].includes(rawPriority)
      ? rawPriority
      : 'medium';

    const internalNotes = meta?.internal_notes !== undefined ? meta.internal_notes : diag.internalNotes || '';

    const emailStatus = row.email_delivery_status || diag.emailDelivery?.status || 'sent';
    const attempts = row.email_delivery_attempts !== undefined ? row.email_delivery_attempts : diag.emailDelivery?.attempts || 1;
    const lastError = row.email_last_error || diag.emailDelivery?.lastError || null;
    const recipients = row.email_recipients || diag.emailDelivery?.recipients || [];

    const referenceId = row.reference_id || diag.referenceId || `REF-${row.id.slice(0, 8).toUpperCase()}`;

    return {
      id: row.id,
      referenceId,
      userId: row.user_id,
      submitterEmail: row.submitter_email || diag.submitterEmail || null,
      submitterName: row.submitter_name || diag.submitterName || null,
      inquiryType: row.inquiry_type || 'contact_support',
      category: row.category || 'support',
      subject: row.subject,
      message: row.message,
      reproductionSteps: row.reproduction_steps || diag.reproductionSteps || null,
      expectedBehavior: row.expected_behavior || diag.expectedBehavior || null,
      actualBehavior: row.actual_behavior || diag.actualBehavior || null,
      includeDiagnosticContext: Boolean(row.include_diagnostic_context),
      diagnosticContext: diag,
      idempotencyKey: row.idempotency_key || diag.idempotencyKey || null,
      status,
      priority,
      internalNotes,
      emailDeliveryStatus: emailStatus,
      emailDeliveryAttempts: attempts,
      emailLastError: lastError,
      emailRecipients: recipients,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      events: diag.history || [],
    };
  }
}

export const supportRepository = new SupportRepository();
