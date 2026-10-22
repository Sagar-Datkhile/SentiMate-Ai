import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authRepository } from '@/server/repositories/auth.repository';
import { consentRepository } from '@/server/repositories/consent.repository';
import { UpdateConsentRequestSchema } from '@sentimate/contracts';
import { env } from '@/lib/env';

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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload', code: 'INVALID_JSON' }, { status: 400 });
    }

    const validation = UpdateConsentRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid consent payload', details: validation.error.flatten(), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { consentType, status, termsVersion } = validation.data;

    // Record immutable audit event
    const recorded = await consentRepository.recordConsentEvent(
      studentId,
      consentType,
      status,
      termsVersion
    );

    // Enforce consent revocation immediately in underlying database tables
    if (status === 'revoked' && env.isConfigured.supabase) {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
      if (consentType === 'counsellor_data_sharing') {
        // Prevent assigned counsellors from viewing future check-ins
        await supabase
          .from('wellbeing_checkins')
          .update({ shared_with_counsellor: false })
          .eq('student_id', studentId);
      } else if (consentType === 'nlp_sentiment_analysis') {
        // Cancel any pending ML analysis jobs for this student
        await supabase
          .from('analysis_jobs')
          .update({ status: 'failed', error_message: 'Cancelled due to user consent withdrawal' })
          .eq('student_id', studentId)
          .eq('status', 'pending');
      }
    }

    const fullMap = await consentRepository.getConsentMap(studentId);

    return NextResponse.json({
      ok: true,
      recorded,
      consent: fullMap,
    });
  } catch (error: any) {
    console.error('[POST /api/student/consent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record consent event', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
