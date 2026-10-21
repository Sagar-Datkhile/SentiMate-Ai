import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { chatRepository } from '@/server/repositories/chat.repository';
import { nvidiaChatAdapter } from '@/server/integrations/nvidiaChatAdapter';
import { env } from '@/lib/env';

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Returns true when the text is a simple greeting with no topical content. */
function isGreetingOnly(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  if (clean.length <= 2) return true;
  const greetings = new Set([
    'hi', 'hello', 'hey', 'hiya', 'howdy', 'yo', 'sup',
    'good morning', 'good afternoon', 'good evening', 'good day',
    'hi there', 'hello there', 'hey there', 'greetings',
    'whats up', 'how are you', 'how r u',
  ]);
  return greetings.has(clean);
}

/** Returns a short normalized excerpt (up to maxWords words) suitable as a fallback title. */
function normalizedExcerpt(text: string, maxWords = 6): string {
  return text.trim().replace(/\s+/g, ' ').split(' ').slice(0, maxWords).join(' ');
}

/**
 * POST /api/chat/sessions/[sessionId]/title
 * Generates and saves a concise 3-7 word contextual conversation title.
 * Body: { message?: string, force?: boolean }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId || !isUUID(sessionId)) {
    return NextResponse.json(
      { error: 'Valid session UUID required', code: 'INVALID_SESSION_ID' },
      { status: 400 }
    );
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    const { message, force = false } = body;
    const firstUserMessage = typeof message === 'string' ? message.trim() : '';

    // 1. Authentication & student authorization
    let authenticatedUserId: string | null = null;
    if (env.isConfigured.supabase) {
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
      authenticatedUserId = profile.id;
    } else {
      authenticatedUserId = 'demo-student-id';
    }

    // 2. Verify ownership boundary
    const session = await chatRepository.getSession(sessionId, authenticatedUserId);
    if (!session) {
      return NextResponse.json(
        { error: 'Conversation session not found or forbidden', code: 'CONVERSATION_FORBIDDEN' },
        { status: 403 }
      );
    }

    // 3. Never overwrite a manually renamed title (unless explicitly forced by user action)
    if (!force) {
      const currentTitle = session.title.trim().toLowerCase();
      if (currentTitle !== 'new conversation' && currentTitle !== 'conversational wellbeing session') {
        return NextResponse.json({ ok: true, title: session.title, preserved: true });
      }
    }

    // 4. Gather conversation context
    let contextSnippet = typeof message === 'string' ? message.trim() : '';
    if (env.isConfigured.supabase) {
      const recentMessages = await chatRepository.getRecentMessages(sessionId, 4);
      if (recentMessages.length > 0) {
        contextSnippet = recentMessages
          .map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
          .join('\n');
      }
    }

    // 5a. Greeting-only: resolve to a fixed friendly title without a model call
    if (isGreetingOnly(firstUserMessage || contextSnippet)) {
      const greetingTitle = 'Friendly Check-in';
      await chatRepository.renameSession(sessionId, authenticatedUserId, greetingTitle);
      return NextResponse.json({ ok: true, title: greetingTitle });
    }

    if (!contextSnippet) {
      return NextResponse.json({ ok: false, title: null });
    }

    // 5b. Generate contextual title via model
    const generatedTitle = await nvidiaChatAdapter.generateTitle(contextSnippet);

    // Determine the best title: model result → excerpt fallback (never return the placeholder)
    const resolvedTitle =
      generatedTitle ||
      (firstUserMessage ? normalizedExcerpt(firstUserMessage, 6) : null);

    if (!resolvedTitle) {
      return NextResponse.json({ ok: false, title: null });
    }

    // 6. Check again before writing: ensure user didn't rename concurrently
    if (!force && env.isConfigured.supabase) {
      const latestSession = await chatRepository.getSession(sessionId, authenticatedUserId);
      if (
        latestSession &&
        latestSession.title.trim().toLowerCase() !== 'new conversation' &&
        latestSession.title.trim().toLowerCase() !== 'conversational wellbeing session'
      ) {
        return NextResponse.json({ ok: true, title: latestSession.title, preserved: true });
      }
    }

    // Save to database
    await chatRepository.renameSession(sessionId, authenticatedUserId, resolvedTitle);
    return NextResponse.json({ ok: true, title: resolvedTitle });
  } catch (err: any) {
    console.error('[POST /title] Unexpected error:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to generate title', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
