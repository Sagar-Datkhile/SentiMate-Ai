import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authRepository } from '@/server/repositories/auth.repository';
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

    const {
      inquiryType,
      subject,
      message,
      category,
      includeDiagnosticContext,
      diagnosticContext,
    } = validation.data;

    let ticketId = `ticket-${Date.now()}`;

    if (env.isConfigured.supabase) {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
      
      const insertPayload: Record<string, any> = {
        user_id: studentId,
        inquiry_type: inquiryType,
        subject: subject.trim(),
        message: message.trim(),
        category,
        include_diagnostic_context: includeDiagnosticContext,
        diagnostic_context: includeDiagnosticContext ? (diagnosticContext || {}) : null,
        status: 'open',
      };

      const { data, error } = await supabase
        .from('support_inquiries')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        console.error('[Support API] Failed to insert inquiry:', error.message);
        return NextResponse.json(
          { error: 'Failed to record support inquiry in database', code: 'DB_ERROR' },
          { status: 500 }
        );
      }

      if (data?.id) {
        ticketId = data.id;
      }
    }

    return NextResponse.json({
      ok: true,
      ticketId,
      message:
        inquiryType === 'report_problem'
          ? 'Thank you for reporting this issue. Our campus platform engineering team has received your ticket.'
          : 'Your inquiry has been submitted to SentiMate campus support. A member of our support team will respond to your university email.',
    });
  } catch (error: any) {
    console.error('[POST /api/student/support] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while submitting inquiry', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
