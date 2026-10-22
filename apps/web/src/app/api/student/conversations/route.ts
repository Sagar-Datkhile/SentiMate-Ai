import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { chatRepository } from '@/server/repositories/chat.repository';
import { env } from '@/lib/env';

export async function DELETE(req: NextRequest) {
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    const { sessionId, all } = body;

    if (all === true) {
      const ok = await chatRepository.deleteAllSessionsPermanent(studentId);
      if (!ok) {
        return NextResponse.json(
          { error: 'Failed to delete all conversations', code: 'DB_ERROR' },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, message: 'All conversations successfully deleted' });
    }

    if (sessionId && typeof sessionId === 'string') {
      const ok = await chatRepository.deleteSessionPermanent(sessionId, studentId);
      if (!ok) {
        return NextResponse.json(
          { error: 'Failed to delete conversation session', code: 'DB_ERROR' },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, message: 'Conversation successfully deleted' });
    }

    return NextResponse.json(
      { error: 'Must provide either sessionId or all: true', code: 'INVALID_REQUEST' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[DELETE /api/student/conversations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversations', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
