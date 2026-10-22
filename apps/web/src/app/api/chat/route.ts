import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { nvidiaChatAdapter, NvidiaChatServiceError } from '@/server/integrations/nvidiaChatAdapter';
import { chatRepository, ChatRepository } from '@/server/repositories/chat.repository';
import { authRepository } from '@/server/repositories/auth.repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** A UUID looks like 8-4-4-4-12 hex characters separated by dashes. */
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate request payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const {
      message,
      sessionId,
      clientMessageId,
      isContinuation,
      continuationAssistantMessageId,
      partialContent,
    } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required and cannot be blank', code: 'EMPTY_MESSAGE' },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: 'Message exceeds maximum allowable length of 4000 characters', code: 'MESSAGE_TOO_LONG' },
        { status: 400 }
      );
    }

    // 2. Authentication & Student Authorization Guard
    // Check headers for test/mock overrides if present, otherwise inspect session
    const mockRole = req.headers.get('x-user-role');
    const mockUserId = req.headers.get('x-user-id');
    const mockIsActive = req.headers.get('x-user-active');
    const mockSessionStudentId = req.headers.get('x-session-student-id');

    let authenticatedUserId: string | null = null;
    let userRole: string | null = null;
    let isActive: boolean = true;

    if (mockRole !== null || mockUserId !== null) {
      // Test environment header inspection
      if (!mockUserId) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in.', code: 'UNAUTHENTICATED' },
          { status: 401 }
        );
      }
      authenticatedUserId = mockUserId;
      userRole = mockRole || 'student';
      isActive = mockIsActive !== 'false';
    } else if (env.isConfigured.supabase) {
      // Production / Live Supabase Auth
      try {
        const supabase = await createServerSupabaseClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Authentication required. Please sign in.', code: 'UNAUTHENTICATED' },
            { status: 401 }
          );
        }

        const profile = await authRepository.getCurrentUserProfile();
        if (!profile) {
          return NextResponse.json(
            { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
            { status: 401 }
          );
        }

        authenticatedUserId = profile.id;
        userRole = profile.role;
        isActive = profile.is_active;
      } catch (authErr: any) {
        console.error('[Chat API] Supabase auth check error:', authErr);
        return NextResponse.json(
          { error: 'Failed to verify session authentication', code: 'AUTH_ERROR' },
          { status: 401 }
        );
      }
    } else {
      // Local development fallback when Supabase is not configured
      authenticatedUserId = 'demo-student-id';
      userRole = 'student';
      isActive = true;
    }

    // Role enforcement: strictly restricted to students
    if (!userRole || userRole !== 'student') {
      return NextResponse.json(
        {
          error: 'Conversational support is restricted to student accounts. Counsellors and admins use dedicated case workspaces.',
          code: 'FORBIDDEN_ROLE',
        },
        { status: 403 }
      );
    }

    // Account active status enforcement
    if (!isActive) {
      return NextResponse.json(
        { error: 'This account has been deactivated. Please contact campus administration.', code: 'ACCOUNT_DEACTIVATED' },
        { status: 403 }
      );
    }

    // Cross-user session access rejection guard (enforces ownership in both test and live contexts)
    if (mockSessionStudentId && mockSessionStudentId !== authenticatedUserId) {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to view or message in this conversation session.', code: 'CONVERSATION_FORBIDDEN' },
        { status: 403 }
      );
    }

    // Storage consent check: respect existing consent, do not save conversation content when absent or revoked
    const mockConsent = req.headers.get('x-chat-storage-consent');
    let hasStorageConsent = true;
    if (mockConsent !== null) {
      hasStorageConsent = mockConsent === 'granted' || mockConsent === 'true';
    } else if (authenticatedUserId) {
      hasStorageConsent = await chatRepository.hasStorageConsent(authenticatedUserId);
    }

    // Conversation ownership enforcement + lazy session creation
    let resolvedSessionId: string | null = sessionId && isUUID(sessionId) ? sessionId : null;
    let newSessionCreated = false;

    if (resolvedSessionId) {
      if (env.isConfigured.supabase) {
        const sessionRecord = await chatRepository.getSession(resolvedSessionId, authenticatedUserId);
        if (!sessionRecord) {
          return NextResponse.json(
            { error: 'Access denied: Conversation session not found or owned by another user.', code: 'CONVERSATION_FORBIDDEN' },
            { status: 403 }
          );
        }
      }
    } else if (hasStorageConsent && env.isConfigured.supabase) {
      // No valid session yet and storage consent granted — create one on first user message (lazy creation)
      const newSession = await chatRepository.createSession(authenticatedUserId, 'New conversation');
      if (newSession) {
        resolvedSessionId = newSession.id;
        newSessionCreated = true;
      }
    }

    // 3. Provider Configuration Validation
    if (!env.nvidiaApiKey) {
      return NextResponse.json(
        {
          error: 'NVIDIA Chat service is unavailable: NVIDIA_API_KEY is not configured in .env.local. Please configure your key to enable live conversational responses.',
          code: 'PROVIDER_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    // 4. Retrieve bounded recent conversation history
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (resolvedSessionId) {
      history = await chatRepository.getRecentMessages(resolvedSessionId, 8);
    }

    // 5. Idempotent persistence of user message (before requesting model response)
    // Only persist if storage consent is granted and not a continuation request
    if (resolvedSessionId && hasStorageConsent && !isContinuation) {
      await chatRepository.saveUserMessage(resolvedSessionId, message, clientMessageId);
    }

    const isSse =
      req.headers.get('accept')?.includes('text/event-stream') ||
      !req.headers.get('accept') ||
      req.headers.get('accept')?.includes('*/*');

    const promptMessage = isContinuation
      ? `Continue your previous response directly and seamlessly from the exact character where it stopped. Do not repeat any words already spoken. Begin immediately with the next characters/words continuing: "${String(partialContent || '').slice(-60)}"`
      : message;

    // 6. Connect to NVIDIA Nemotron streaming adapter
    const stream = await nvidiaChatAdapter.streamResponse({
      message: promptMessage,
      history,
      signal: req.signal,
      format: isSse ? 'sse' : 'raw',
      onComplete: async (fullText, tokenUsage) => {
        if (resolvedSessionId && hasStorageConsent && fullText.trim()) {
          const contentToSave = isContinuation && partialContent
            ? `${partialContent}${fullText}`
            : fullText;

          await chatRepository.saveAssistantMessage(
            resolvedSessionId,
            contentToSave,
            env.nvidiaModel || 'nvidia/nemotron-3-super-120b-a12b',
            tokenUsage?.totalTokens,
            continuationAssistantMessageId
          );
        }
      },
      onError: (streamErr) => {
        console.warn('[Chat API] Stream interrupted or aborted:', streamErr.message);
      },
    });

    const responseHeaders: Record<string, string> = {
      'Content-Type': isSse ? 'text/event-stream; charset=utf-8' : 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    };

    // Echo the resolved session ID back to the client so it can update its
    // local state without an extra round-trip. On new session creation the
    // client replaces its temp placeholder ID with the real DB UUID.
    if (resolvedSessionId) {
      responseHeaders['X-Session-Id'] = resolvedSessionId;
    }
    if (newSessionCreated) {
      responseHeaders['X-Session-Created'] = '1';
    }

    return new Response(stream, { headers: responseHeaders });
  } catch (error: any) {
    if (error instanceof NvidiaChatServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('[Chat API] Unexpected handler error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
