import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { preferencesRepository } from '@/server/repositories/preferences.repository';
import { consentRepository } from '@/server/repositories/consent.repository';
import { UpdateUserPreferencesSchema } from '@sentimate/contracts';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const mockUserId = req.headers.get('x-user-id');
    const mockRole = req.headers.get('x-user-role');

    let studentId = mockUserId || 's-demo-1';
    let userRole = mockRole || 'student';
    let userEmail = 'student@university.edu';
    let providers = ['email'];
    let createdAt = new Date().toISOString();
    let lastSignInAt = new Date().toISOString();

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
      userEmail = user.email || profile.email;
      providers = user.app_metadata?.providers || (user.app_metadata?.provider ? [user.app_metadata.provider] : ['email']);
      createdAt = user.created_at || profile.created_at;
      lastSignInAt = user.last_sign_in_at || new Date().toISOString();
    }

    if (userRole !== 'student') {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const [preferences, consentMap] = await Promise.all([
      preferencesRepository.getPreferences(studentId),
      consentRepository.getConsentMap(studentId),
    ]);

    const isEmailConfigured = Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY);

    return NextResponse.json({
      preferences,
      consent: consentMap,
      accountInfo: {
        id: studentId,
        email: userEmail,
        providers,
        primaryProvider: providers[0] || 'email',
        hasPasswordAccount: providers.includes('email'),
        createdAt,
        lastSignInAt,
      },
      notificationStatus: {
        emailConfigured: isEmailConfigured,
        emailStatusMessage: isEmailConfigured
          ? 'Email delivery is operational via configured campus delivery provider.'
          : 'Email delivery credentials (SMTP_HOST or RESEND_API_KEY) are not configured in .env.local. Outbound email transmission is currently inactive, but preferences are saved.',
        inAppConfigured: true,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/student/settings] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve settings', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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

    // Protect against privilege escalation: never allow role, activation, or email changes via preferences
    if ('role' in body || 'is_active' in body || 'email' in body || 'institution_id' in body) {
      return NextResponse.json(
        { error: 'Privileged user attributes cannot be modified via preferences.', code: 'FORBIDDEN_MUTATION' },
        { status: 403 }
      );
    }

    const validation = UpdateUserPreferencesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten(), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await preferencesRepository.updatePreferences(studentId, validation.data);

    return NextResponse.json({ ok: true, preferences: updated });
  } catch (error: any) {
    console.error('[PATCH /api/student/settings] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
