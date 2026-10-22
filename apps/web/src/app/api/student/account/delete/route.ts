import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

    if (body.confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Explicit confirmation required. You must submit "DELETE" to confirm permanent account deletion.', code: 'MISSING_CONFIRMATION' },
        { status: 400 }
      );
    }

    if (!env.isConfigured.supabase) {
      return NextResponse.json({ ok: true, message: 'Account deleted (mock mode).' });
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

    // If password provided and user has email credentials, verify password for recent auth guarantee
    if (body.password && user.email) {
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: body.password,
      });

      if (verifyErr) {
        return NextResponse.json(
          { error: 'Password authentication failed. Please enter your valid current password to confirm deletion.', code: 'INVALID_PASSWORD' },
          { status: 400 }
        );
      }
    }

    const adminClient = createAdminClient();

    // 1. Record data rights request record for audit compliance
    try {
      await adminClient.from('data_rights_requests').insert({
        user_id: user.id,
        request_type: 'delete_account',
        status: 'completed',
        resolution_notes: 'Account deleted via self-service student settings deletion flow.',
        processed_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('[Account Delete] Failed to record data rights request:', logErr);
    }

    // 2. Record content-free audit log entry
    try {
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'ACCOUNT_SELF_DELETION',
        entity_type: 'profile',
        entity_id: user.id,
        metadata: {
          role: profile.role,
          deleted_at: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('[Account Delete] Failed to write audit log:', auditErr);
    }

    // 3. Privileged delete from Supabase Auth (cascades to public.profiles and related tables)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error('[Account Delete] Supabase admin.deleteUser failed:', deleteUserError);
      return NextResponse.json(
        { error: 'Failed to complete account deletion on auth provider. Please contact campus support.', code: 'DELETION_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Your SentiMate account and associated data have been permanently deleted.',
    });
  } catch (error: any) {
    console.error('[POST /api/student/account/delete] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during account deletion', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
