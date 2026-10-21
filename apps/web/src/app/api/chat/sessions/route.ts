import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { env } from '@/lib/env';

/**
 * GET /api/chat/sessions
 * Returns the authenticated student's chat sessions ordered by last_activity_at DESC.
 * Returns metadata only (no message bodies) suitable for sidebar/My Conversations list.
 */
export async function GET(req: NextRequest) {
  if (!env.isConfigured.supabase) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const profile = await authRepository.getCurrentUserProfile();
    if (!profile || profile.role !== 'student') {
      return NextResponse.json(
        { error: 'Student account required', code: 'FORBIDDEN_ROLE' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at, last_activity_at')
      .eq('student_id', profile.id)
      .eq('is_archived', false)
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[GET /api/chat/sessions] DB error:', error.code);
      return NextResponse.json(
        { error: 'Failed to load conversation list', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (err: any) {
    console.error('[GET /api/chat/sessions] Unexpected error:', err?.message);
    return NextResponse.json(
      { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/sessions
 * Creates a new chat session for the authenticated student.
 * Body: { title?: string }
 * Returns: { session: ChatSessionRecord }
 */
export async function POST(req: NextRequest) {
  if (!env.isConfigured.supabase) {
    return NextResponse.json({
      session: {
        id: `local-${Date.now()}`,
        title: 'New Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity_at: null,
      },
    });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // title is optional; empty body is fine
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const profile = await authRepository.getCurrentUserProfile();
    if (!profile || profile.role !== 'student') {
      return NextResponse.json(
        { error: 'Student account required', code: 'FORBIDDEN_ROLE' },
        { status: 403 }
      );
    }

    const title: string =
      typeof body?.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 120)
        : 'New Conversation';

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        student_id: profile.id,
        title,
        is_archived: false,
      })
      .select('id, title, created_at, updated_at, last_activity_at')
      .single();

    if (error || !data) {
      console.error('[POST /api/chat/sessions] Insert error:', error?.code);
      return NextResponse.json(
        { error: 'Failed to create conversation session', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/chat/sessions] Unexpected error:', err?.message);
    return NextResponse.json(
      { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
