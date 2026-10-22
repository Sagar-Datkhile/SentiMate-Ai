import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    if (!env.isConfigured.supabase) {
      return NextResponse.json({ ok: true, message: 'All other sessions signed out (mock mode).' });
    }

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

    // Revoke all other active sessions for this user while retaining current session
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });

    if (signOutError) {
      return NextResponse.json(
        { error: signOutError.message || 'Failed to revoke other sessions', code: 'REVOKE_ERROR' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'All other active browser and device sessions have been revoked.',
    });
  } catch (error: any) {
    console.error('[POST /api/student/account/signout-others] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
