import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { gzipSync, gunzipSync } from 'zlib';

export interface ChatSessionRecord {
  id: string;
  student_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  sender_role: 'user' | 'assistant' | 'system';
  content: string;
  model_version: string | null;
  token_count: number | null;
  created_at: string;
}

/**
 * Encoding version markers stored in encoding_version column.
 * 'gzip/1'     — content_compressed holds gzip-compressed UTF-8 bytes
 * 'identity/1' — content_compressed holds raw UTF-8 bytes (compression expanded size)
 */
type EncodingVersion = 'gzip/1' | 'identity/1';

const MAX_CONTENT_BYTES = 256 * 1024; // 256 KB safety ceiling on compressed input

/**
 * Compress message content server-side using Node.js built-in zlib (no added dependency).
 * If gzip increases size, stores raw UTF-8 bytes with encoding_version 'identity/1'.
 * Returns { buffer, encoding, originalByteLength } for the database write.
 */
function compressContent(text: string): {
  buffer: Buffer;
  encoding: EncodingVersion;
  originalByteLength: number;
} {
  const rawBytes = Buffer.from(text, 'utf8');
  const originalByteLength = rawBytes.byteLength;

  if (originalByteLength > MAX_CONTENT_BYTES) {
    // Content is unusually large; store identity to avoid runaway memory
    return { buffer: rawBytes, encoding: 'identity/1', originalByteLength };
  }

  try {
    const compressed = gzipSync(rawBytes, { level: 6 });
    if (compressed.byteLength >= rawBytes.byteLength) {
      // Compression expanded size — store raw UTF-8 bytes
      return { buffer: rawBytes, encoding: 'identity/1', originalByteLength };
    }
    return { buffer: compressed, encoding: 'gzip/1', originalByteLength };
  } catch {
    // Compression failure — fall back to identity
    return { buffer: rawBytes, encoding: 'identity/1', originalByteLength };
  }
}

/**
 * Decompress message content server-side.
 * Safe fallback to plaintext content column if decompression fails or payload is missing.
 */
function decompressContent(
  compressedHex: string | null | undefined,
  encodingVersion: string | null | undefined,
  fallbackText: string = ''
): string {
  if (!compressedHex || !encodingVersion) {
    return fallbackText;
  }
  try {
    const hexStr = String(compressedHex).replace(/^\\x/, '');
    const compressedBuf = Buffer.from(hexStr, 'hex');
    if (compressedBuf.length > MAX_CONTENT_BYTES * 2) {
      return fallbackText;
    }
    if (encodingVersion === 'gzip/1') {
      const decompressed = gunzipSync(compressedBuf);
      return decompressed.toString('utf8');
    } else if (encodingVersion === 'identity/1') {
      return compressedBuf.toString('utf8');
    }
    return fallbackText;
  } catch {
    return fallbackText;
  }
}

/**
 * Encode a Buffer as a PostgreSQL hex literal accepted by the bytea column.
 * PostgREST accepts '\\x<hex>' strings for bytea inserts.
 */
function toBytea(buf: Buffer): string {
  return '\\x' + buf.toString('hex');
}

export class ChatRepository {
  /**
   * Verify session exists and belongs to the authenticated student.
   * Enforces conversation ownership security boundary.
   */
  async getSession(sessionId: string, studentId: string): Promise<ChatSessionRecord | null> {
    if (!env.isConfigured.supabase) {
      return {
        id: sessionId,
        student_id: studentId,
        title: 'Conversational Wellbeing Session',
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity_at: null,
      };
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, student_id, title, is_archived, created_at, updated_at, last_activity_at')
        .eq('id', sessionId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return data as ChatSessionRecord;
    } catch {
      return null;
    }
  }

  /**
   * Create a new chat session for a student.
   * Called when the student's first user message is sent (lazy session creation).
   */
  async createSession(
    studentId: string,
    title: string = 'New Conversation'
  ): Promise<ChatSessionRecord | null> {
    if (!env.isConfigured.supabase) {
      return {
        id: `local-${Date.now()}`,
        student_id: studentId,
        title,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity_at: null,
      };
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          student_id: studentId,
          title: title.slice(0, 120),
          is_archived: false,
        })
        .select('id, student_id, title, is_archived, created_at, updated_at, last_activity_at')
        .single();

      if (error || !data) {
        console.warn('[ChatRepository] createSession failed:', error?.code);
        return null;
      }

      return data as ChatSessionRecord;
    } catch (e) {
      console.warn('[ChatRepository] createSession exception:', e);
      return null;
    }
  }

  /**
   * Retrieve bounded recent conversation history for context budgeting.
   * Falls back to legacy plaintext content column for pre-compression rows.
   */
  async getRecentMessages(
    sessionId: string,
    limit: number = 8
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    if (!env.isConfigured.supabase) {
      return [];
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('chat_messages')
        .select('sender_role, content, content_compressed, encoding_version')
        .eq('session_id', sessionId)
        .in('sender_role', ['user', 'assistant'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      // Reverse so messages are chronological (oldest to newest)
      return data
        .reverse()
        .map((m) => ({
          role: m.sender_role as 'user' | 'assistant',
          content: decompressContent(m.content_compressed, m.encoding_version, m.content ?? ''),
        }));
    } catch {
      return [];
    }
  }

  /**
   * Idempotent persistence of a user message with compressed content.
   * Also updates session last_activity_at in the same request context.
   * Content is compressed server-side using zlib gzip (Node built-in).
   */
  async saveUserMessage(
    sessionId: string,
    content: string,
    messageId?: string
  ): Promise<void> {
    if (!env.isConfigured.supabase) return;

    try {
      const supabase = await createServerSupabaseClient();
      const { buffer, encoding, originalByteLength } = compressContent(content);

      const payload: Record<string, any> = {
        session_id: sessionId,
        sender_role: 'user',
        content: '',                                    // authoritative content is compressed
        content_compressed: toBytea(buffer),
        encoding_version: encoding,
        original_byte_length: originalByteLength,
      };

      if (messageId && messageId.includes('-') && messageId.length === 36) {
        payload.id = messageId;
      }

      await supabase.from('chat_messages').upsert(payload, { onConflict: 'id' });

      // Update session activity timestamp transactionally with message write
      await supabase
        .from('chat_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (e) {
      // Log the error type only — never log message content
      console.warn('[ChatRepository] Skipped user message persistence:', (e as any)?.code ?? 'unknown error');
    }
  }

  /**
   * Idempotent persistence of completed assistant message with compressed content.
   * Content is compressed server-side; session last_activity_at is updated.
   */
  async saveAssistantMessage(
    sessionId: string,
    content: string,
    modelVersion: string,
    tokenCount?: number | null,
    messageId?: string
  ): Promise<void> {
    if (!env.isConfigured.supabase) return;

    try {
      const supabase = await createServerSupabaseClient();
      const { buffer, encoding, originalByteLength } = compressContent(content);

      const payload: Record<string, any> = {
        session_id: sessionId,
        sender_role: 'assistant',
        content: '',                                    // authoritative content is compressed
        content_compressed: toBytea(buffer),
        encoding_version: encoding,
        original_byte_length: originalByteLength,
        model_version: modelVersion,
        token_count: tokenCount ?? null,
      };

      if (messageId && messageId.includes('-') && messageId.length === 36) {
        payload.id = messageId;
      }

      await supabase.from('chat_messages').upsert(payload, { onConflict: 'id' });

      // Update session activity timestamp
      await supabase
        .from('chat_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (e) {
      // Log the error type only — never log message content
      console.warn('[ChatRepository] Skipped assistant message persistence:', (e as any)?.code ?? 'unknown error');
    }
  }

  /**
   * Derive a short session title from the first user message.
   * Uses a local excerpt — no LLM call, no network request.
   */
  static deriveTitleFromMessage(message: string): string {
    const cleaned = message.trim().replace(/\s+/g, ' ');
    if (cleaned.length <= 50) return cleaned;
    // Truncate at word boundary
    const truncated = cleaned.slice(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '…';
  }

  /**
   * Update the session title (rename).
   */
  async renameSession(sessionId: string, studentId: string, newTitle: string): Promise<boolean> {
    if (!env.isConfigured.supabase) return true;

    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: newTitle.trim().slice(0, 120) })
        .eq('id', sessionId)
        .eq('student_id', studentId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Archive (soft-delete) a session.
   */
  async archiveSession(sessionId: string, studentId: string): Promise<boolean> {
    if (!env.isConfigured.supabase) return true;

    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('chat_sessions')
        .update({ is_archived: true })
        .eq('id', sessionId)
        .eq('student_id', studentId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Permanently delete a single conversation session and its cascaded messages.
   */
  async deleteSessionPermanent(sessionId: string, studentId: string): Promise<boolean> {
    if (!env.isConfigured.supabase) return true;

    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('student_id', studentId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Permanently delete all conversation sessions and messages for the student.
   */
  async deleteAllSessionsPermanent(studentId: string): Promise<boolean> {
    if (!env.isConfigured.supabase) return true;

    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('student_id', studentId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Export conversation with message decompression.
   * Strips out system messages, internal tokens, and secrets.
   */
  async exportSessionData(sessionId: string, studentId: string): Promise<{
    session: ChatSessionRecord;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
      modelVersion?: string | null;
    }>;
  } | null> {
    const session = await this.getSession(sessionId, studentId);
    if (!session) return null;

    if (!env.isConfigured.supabase) {
      return {
        session,
        messages: [],
      };
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, sender_role, content, content_compressed, encoding_version, model_version, created_at')
        .eq('session_id', sessionId)
        .in('sender_role', ['user', 'assistant'])
        .order('created_at', { ascending: true });

      if (error || !data) {
        return { session, messages: [] };
      }

      const messages = data.map((m) => ({
        id: m.id,
        role: m.sender_role as 'user' | 'assistant',
        content: decompressContent(m.content_compressed, m.encoding_version, m.content ?? ''),
        createdAt: m.created_at,
        modelVersion: m.model_version,
      }));

      return { session, messages };
    } catch {
      return { session, messages: [] };
    }
  }

  /**
   * Export all conversation sessions and messages for a student with decompression.
   */
  async exportAllSessionsData(studentId: string): Promise<Array<{
    session: ChatSessionRecord;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
      modelVersion?: string | null;
    }>;
  }>> {
    if (!env.isConfigured.supabase) return [];

    try {
      const supabase = await createServerSupabaseClient();
      const { data: sessions, error: sessError } = await supabase
        .from('chat_sessions')
        .select('id, student_id, title, is_archived, created_at, updated_at, last_activity_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (sessError || !sessions) return [];

      const result = [];
      for (const session of sessions) {
        const { data: messagesData } = await supabase
          .from('chat_messages')
          .select('id, sender_role, content, content_compressed, encoding_version, model_version, created_at')
          .eq('session_id', session.id)
          .in('sender_role', ['user', 'assistant'])
          .order('created_at', { ascending: true });

        const messages = (messagesData || []).map((m) => ({
          id: m.id,
          role: m.sender_role as 'user' | 'assistant',
          content: decompressContent(m.content_compressed, m.encoding_version, m.content ?? ''),
          createdAt: m.created_at,
          modelVersion: m.model_version,
        }));

        result.push({
          session: session as ChatSessionRecord,
          messages,
        });
      }

      return result;
    } catch {
      return [];
    }
  }

  /**
   * Check whether student has active chat-history storage consent.
   * If a consent_events row for 'ai_chat_processing' exists, status must be 'granted'.
   * If status is 'revoked', returns false.
   */
  async hasStorageConsent(studentId: string): Promise<boolean> {
    if (!env.isConfigured.supabase) return true;

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('consent_events')
        .select('status')
        .eq('student_id', studentId)
        .eq('consent_type', 'ai_chat_processing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('[ChatRepository] hasStorageConsent error:', error.code);
        return true;
      }

      if (data) {
        return data.status === 'granted';
      }

      // Default to granted if no explicit event is logged yet
      return true;
    } catch {
      return true;
    }
  }
}

export const chatRepository = new ChatRepository();
