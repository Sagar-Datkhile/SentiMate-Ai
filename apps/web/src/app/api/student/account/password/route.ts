import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request payload', code: 'INVALID_JSON' }, { status: 400 });
    }

    if (!env.isConfigured.supabase) {
      return NextResponse.json({ ok: true, message: 'Password updated (mock mode)' });
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

    // Password reset email request
    if (body.requestReset) {
      const email = user.email || profile.email;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${env.appUrl}/auth/callback?next=/student/settings`,
      });

      if (resetErr) {
        return NextResponse.json(
          { error: resetErr.message || 'Failed to dispatch password recovery email', code: 'RECOVERY_ERROR' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: `A secure password setup/recovery link has been sent to ${email}.`,
      });
    }

    const { currentPassword, newPassword } = body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters in length', code: 'INVALID_PASSWORD' },
        { status: 400 }
      );
    }

    // If current password provided, re-authenticate first to verify identity
    if (currentPassword && user.email) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return NextResponse.json(
          { error: 'Current password verification failed. Please verify your existing password.', code: 'INVALID_CURRENT_PASSWORD' },
          { status: 400 }
        );
      }
    }

    // Update password using Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update account password', code: 'AUTH_UPDATE_ERROR' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Account password has been successfully updated.',
    });
  } catch (error: any) {
    console.error('[POST /api/student/account/password] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating password', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
