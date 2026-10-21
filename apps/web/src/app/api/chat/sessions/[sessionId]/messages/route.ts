import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { chatRepository } from '@/server/repositories/chat.repository';
import { env } from '@/lib/env';
import { gunzipSync } from 'zlib';

const MAX_DECOMPRESSED_BYTES = 512 * 1024; // 512 KB safety ceiling

/**
 * GET /api/chat/sessions/[sessionId]/messages
 * Returns decompressed messages for a session the student owns.
 * Authorization is enforced both by RLS and explicit ownership check.
 * Decompression is performed server-side after authorization.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId || sessionId.length !== 36) {
    return NextResponse.json(
      { error: 'Invalid session ID', code: 'INVALID_SESSION_ID' },
      { status: 400 }
    );
  }

  if (!env.isConfigured.supabase) {
    return NextResponse.json({ messages: [] });
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

    // Ownership verification (defence in depth beyond RLS)
    const session = await chatRepository.getSession(sessionId, profile.id);
    if (!session) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied', code: 'CONVERSATION_FORBIDDEN' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 200);
    const before = url.searchParams.get('before'); // cursor: created_at ISO string

    let query = supabase
      .from('chat_messages')
      .select('id, session_id, sender_role, content, content_compressed, encoding_version, original_byte_length, model_version, token_count, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET messages] DB error:', error.code);
      return NextResponse.json(
        { error: 'Failed to load messages', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Decompress server-side; never expose raw compressed bytes to client
    const messages = (data ?? []).map((row) => {
      let content: string;

      if (row.content_compressed && row.encoding_version) {
        try {
          // content_compressed arrives from PostgREST as a hex string (\\x...)
          const hexStr = String(row.content_compressed).replace(/^\\x/, '');
          const compressedBuf = Buffer.from(hexStr, 'hex');

          if (compressedBuf.length > MAX_DECOMPRESSED_BYTES) {
            throw new Error('Compressed payload exceeds size ceiling');
          }

          if (row.encoding_version === 'gzip/1') {
            const decompressed = gunzipSync(compressedBuf);
            if (decompressed.byteLength > MAX_DECOMPRESSED_BYTES) {
              throw new Error('Decompressed content exceeds size ceiling');
            }
            content = decompressed.toString('utf8');
          } else {
            // identity/1 — stored as UTF-8 bytes directly
            content = compressedBuf.toString('utf8');
          }
        } catch (decompressionErr: any) {
          // Log without including message text; fall back to legacy column
          console.error(
            '[GET messages] Decompression failed for message',
            row.id,
            '—',
            decompressionErr?.message
          );
          content = row.content ?? '';
        }
      } else {
        // Legacy row: plain text in content column
        content = row.content ?? '';
      }

      return {
        id: row.id,
        session_id: row.session_id,
        sender_role: row.sender_role,
        content,
        model_version: row.model_version,
        token_count: row.token_count,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error('[GET messages] Unexpected error:', err?.message);
    return NextResponse.json(
      { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
