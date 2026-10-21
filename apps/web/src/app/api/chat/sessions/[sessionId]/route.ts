import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { chatRepository } from '@/server/repositories/chat.repository';
import { env } from '@/lib/env';

/**
 * PATCH /api/chat/sessions/[sessionId]
 * Rename a session. Does NOT update last_activity_at (rename ≠ new message).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!env.isConfigured.supabase) {
    return NextResponse.json({ ok: true });
  }

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body */ }

    const newTitle = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!newTitle) {
      return NextResponse.json({ error: 'Title is required', code: 'MISSING_TITLE' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const profile = await authRepository.getCurrentUserProfile();
    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Student account required', code: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const ok = await chatRepository.renameSession(sessionId, profile.id, newTitle);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to rename session', code: 'DB_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[PATCH session] Unexpected error:', err?.message);
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/sessions/[sessionId]
 * Soft-archives (is_archived = true) a session.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!env.isConfigured.supabase) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const profile = await authRepository.getCurrentUserProfile();
    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Student account required', code: 'FORBIDDEN_ROLE' }, { status: 403 });
    }

    const ok = await chatRepository.archiveSession(sessionId, profile.id);
    if (!ok) {
      return NextResponse.json({ error: 'Failed to archive session', code: 'DB_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[DELETE session] Unexpected error:', err?.message);
    return NextResponse.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
