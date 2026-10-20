import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export interface ChatSessionRecord {
  id: string;
  student_id: string;
  title: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
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

export class ChatRepository {
  /**
   * Verify session exists and belongs to the authenticated student.
   * Enforces conversation ownership security boundary.
   */
  async getSession(sessionId: string, studentId: string): Promise<ChatSessionRecord | null> {
    if (!env.isConfigured.supabase) {
      // In local demo / test environment without live Supabase
      return {
        id: sessionId,
        student_id: studentId,
        title: 'Conversational Wellbeing Session',
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
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
   * Retrieve bounded recent conversation history for context budgeting.
   * Prevents unbounded token growth while preserving multi-turn context.
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
        .select('sender_role, content')
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
          content: m.content,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Idempotently persist user message.
   */
  async saveUserMessage(
    sessionId: string,
    content: string,
    messageId?: string
  ): Promise<void> {
    if (!env.isConfigured.supabase) return;

    try {
      const supabase = await createServerSupabaseClient();
      const payload: Record<string, any> = {
        session_id: sessionId,
        sender_role: 'user',
        content,
      };
      if (messageId && messageId.includes('-') && messageId.length === 36) {
        payload.id = messageId;
      }

      await supabase.from('chat_messages').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[ChatRepository] Skipped user message persistence:', e);
    }
  }

  /**
   * Idempotently persist completed assistant message with provider model and usage metadata.
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
      const payload: Record<string, any> = {
        session_id: sessionId,
        sender_role: 'assistant',
        content,
        model_version: modelVersion,
        token_count: tokenCount ?? null,
      };
      if (messageId && messageId.includes('-') && messageId.length === 36) {
        payload.id = messageId;
      }

      await supabase.from('chat_messages').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[ChatRepository] Skipped assistant message persistence:', e);
    }
  }
}

export const chatRepository = new ChatRepository();
