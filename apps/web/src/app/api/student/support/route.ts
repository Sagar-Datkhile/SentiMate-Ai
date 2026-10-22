import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { supportRepository } from '@/server/repositories/support.repository';
import { SupportInquiryRequestSchema } from '@sentimate/contracts';
import { env } from '@/lib/env';

// In-memory rate limiting map: userId -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(userId, valid);
    return true;
  }
  valid.push(now);
  rateLimitMap.set(userId, valid);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const mockUserId = req.headers.get('x-user-id');
    const mockRole = req.headers.get('x-user-role');

    let studentId = mockUserId || 's-demo-1';
    let userRole = mockRole || 'student';
    let submitterEmail: string | null = req.headers.get('x-user-email') || 'student@university.edu';
    let submitterName: string | null = 'Student User';

    if (!mockUserId && env.isConfigured.supabase) {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 });
      }

      const profile = await authRepository.getCurrentUserProfile();
      if (!profile || profile.role !== 'student') {
        return NextResponse.json({ error: 'Student account required', code: 'FORBIDDEN_ROLE' }, { status: 403 });
      }

      studentId = profile.id;
      userRole = profile.role;
      submitterEmail = profile.email || user.email || null;
      submitterName = profile.full_name || null;
    }

    if (userRole !== 'student') {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    // Rate limiting check
    if (isRateLimited(studentId)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded: You have submitted multiple inquiries recently. Please wait a few minutes before submitting another report.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload', code: 'INVALID_JSON' }, { status: 400 });
    }

    const validation = SupportInquiryRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten(), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Normalize category into canonical categories: feedback, enquiry, support, bug
    let category = data.category || (data.inquiryType === 'report_problem' ? 'bug' : 'support');
    if (['chat_bug', 'appointments_bug', 'appearance_bug', 'performance_bug'].includes(category)) {
      category = 'bug';
    } else if (['general', 'privacy'].includes(category)) {
      category = 'enquiry';
    } else if (['counsellor', 'account'].includes(category)) {
      category = 'support';
    } else if (!['feedback', 'enquiry', 'support', 'bug'].includes(category)) {
      category = data.inquiryType === 'report_problem' ? 'bug' : 'support';
    }

    const result = await supportRepository.submitInquiry({
      userId: studentId,
      submitterEmail,
      submitterName,
      inquiryType: data.inquiryType || (category === 'bug' ? 'report_problem' : 'contact_support'),
      category,
      subject: data.subject.trim(),
      message: data.message.trim(),
      reproductionSteps: data.reproductionSteps?.trim(),
      expectedBehavior: data.expectedBehavior?.trim(),
      actualBehavior: data.actualBehavior?.trim(),
      includeDiagnosticContext: data.includeDiagnosticContext,
      diagnosticContext: data.diagnosticContext,
      idempotencyKey: data.idempotencyKey,
    });

    return NextResponse.json({
      ok: true,
      ticketId: result.inquiryId,
      referenceId: result.referenceId,
      emailDeliveryStatus: result.emailDeliveryStatus,
      isDuplicate: result.isDuplicate,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[POST /api/student/support] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred while submitting inquiry', details: String(error?.stack || error), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

