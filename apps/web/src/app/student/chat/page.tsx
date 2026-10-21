'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUp,
  Square,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  LifeBuoy,
  AlertCircle,
  Clock,
  User,
  Info,
  X,
} from 'lucide-react';
import { StudentShell, ChatSessionItem } from '@/components/layout/StudentShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { ChatMessageSkeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { AssistantAvatar } from '@/components/layout/AssistantAvatar';

interface Message {
  id: string;
  senderRole: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'pending' | 'streaming' | 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * Robustly sanitizes error messages from upstream providers or networks.
 * Ensures raw JSON payloads, account IDs, and stack traces never leak into the UI.
 */
function sanitizeErrorMessage(rawError: unknown): string {
  if (!rawError) {
    return 'The conversational companion is temporarily unavailable. Please try again in a moment.';
  }

  const raw = typeof rawError === 'string' ? rawError : (rawError as any)?.message || String(rawError);

  // Check if string contains raw JSON (e.g. 404 {"status":404,"detail":...})
  if (raw.includes('{') && raw.includes('}')) {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const detail = parsed.detail || parsed.message || parsed.title;
        if (detail && typeof detail === 'string') {
          if (detail.toLowerCase().includes('not found for account')) {
            return 'The AI conversation service is currently experiencing upstream account or credit limits. Please check back later or contact campus support.';
          }
          return detail;
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  if (raw.toLowerCase().includes('not found for account')) {
    return 'The AI conversation service is currently experiencing upstream account or credit limits. Please check back later or contact campus support.';
  }

  if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.toLowerCase().includes('failed to connect')) {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }

  if (raw.includes('429') || raw.toLowerCase().includes('rate limit')) {
    return 'SentiMate is experiencing high traffic right now. Please wait a moment and try again.';
  }

  if (raw.includes('502') || raw.includes('503') || raw.includes('504')) {
    return 'The conversation service is temporarily unavailable. Please try again shortly.';
  }

  return raw;
}

/** True if s is a real DB UUID (36 chars, 8-4-4-4-12 format) */
function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Detect simple greeting-only messages (e.g. 'hi', 'hello', 'hey there')
 * that lack contextual topic content for generating a meaningful title.
 */
function isGreetingOnly(text: string): boolean {
  if (!text) return true;
  const clean = text.trim().toLowerCase().replace(/[^\w\s]/g, '');
  if (clean.length <= 2) return true;
  const greetingPhrases = new Set([
    'hi',
    'hello',
    'hey',
    'hiya',
    'howdy',
    'yo',
    'sup',
    'good morning',
    'good afternoon',
    'good evening',
    'good day',
    'hi there',
    'hello there',
    'hey there',
    'greetings',
    'whats up',
    'how are you',
    'how r u',
  ]);
  return greetingPhrases.has(clean);
}

/** Map a DB message row to a UI Message */
function dbRowToMessage(row: any): Message {
  return {
    id: row.id,
    senderRole: row.sender_role,
    content: row.content,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'completed',
  };
}

export default function StudentChatPage() {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  // null = "new chat" (no DB session yet); string = DB UUID
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [consentAcknowledged, setConsentAcknowledged] = useState(true);
  const [consentModalOpen, setConsentModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Continuity & Title Generation Refs:
  // - loadedSessionIdRef: tracks the session whose messages are currently in state to eliminate remount/flicker
  // - manuallyRenamedSessionIdsRef: tracks sessions renamed by the user so auto-titles never overwrite them
  // - autoTitleGeneratedSessionIdsRef: guarantees at most one automatic title generation per conversation
  // - titleJobsInFlightRef: deduplicates in-flight background title requests
  const loadedSessionIdRef = useRef<string | null>(null);
  const manuallyRenamedSessionIdsRef = useRef<Set<string>>(new Set());
  const autoTitleGeneratedSessionIdsRef = useRef<Set<string>>(new Set());
  const titleJobsInFlightRef = useRef<Set<string>>(new Set());

  const latestAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderRole === 'assistant') {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  // ── Session loading ──────────────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (!res.ok) {
        setIsLoadingSessions(false);
        return;
      }
      const { sessions: dbSessions } = await res.json();
      const items: ChatSessionItem[] = (dbSessions ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        createdAt: s.created_at,
        lastActivityAt: s.last_activity_at ?? s.updated_at ?? s.created_at,
      }));
      setSessions(items);
    } catch {
      // Network error — keep empty list, no crash
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // ── Initial mount: load sessions ─────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadSessions();
      if (!mounted) return;
    })();
    return () => { mounted = false; };
  }, [loadSessions]);

  // ── Load messages when active session changes ────────────────────────────────

  useEffect(() => {
    if (!activeSessionId || !isUUID(activeSessionId)) {
      loadedSessionIdRef.current = null;
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    // Chat continuity invariant: If this session is already loaded in memory (e.g. freshly created
    // on the first send or actively streaming), do NOT clear or refetch to eliminate visible resets.
    if (loadedSessionIdRef.current === activeSessionId) {
      return;
    }

    loadedSessionIdRef.current = activeSessionId;
    let cancelled = false;
    setIsLoadingMessages(true);
    setMessages([]);

    (async () => {
      try {
        const res = await fetch(`/api/chat/sessions/${activeSessionId}/messages`);
        if (!res.ok || cancelled) {
          if (!cancelled) setIsLoadingMessages(false);
          return;
        }
        const { messages: dbMessages } = await res.json();
        if (cancelled) return;
        const uiMessages: Message[] = (dbMessages ?? []).map(dbRowToMessage);
        setMessages(uiMessages);
      } catch {
        if (!cancelled) {
          toast.error('Could not load conversation messages');
        }
      } finally {
        if (!cancelled) setIsLoadingMessages(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Independent contextual title generation ──────────────────────────────────

  const triggerTitleGeneration = useCallback(
    async (sessionId: string, currentMessage: string, force: boolean = false) => {
      if (!sessionId || !isUUID(sessionId)) return;
      if (!force && manuallyRenamedSessionIdsRef.current.has(sessionId)) return;
      if (!force && autoTitleGeneratedSessionIdsRef.current.has(sessionId)) return;
      if (titleJobsInFlightRef.current.has(sessionId)) return;

      titleJobsInFlightRef.current.add(sessionId);

      try {
        const res = await fetch(`/api/chat/sessions/${sessionId}/title`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: currentMessage, force }),
        });

        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        const newTitle = data?.title?.trim();

        // Reject null, empty, or placeholder titles — never lock the session in with a non-title
        if (!newTitle || newTitle.toLowerCase() === 'new conversation') return;

        // Check again: ensure user did not rename while title generation was in flight
        if (!force && manuallyRenamedSessionIdsRef.current.has(sessionId)) return;

        autoTitleGeneratedSessionIdsRef.current.add(sessionId);

        // Update conversation metadata in place without touching message state
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
        );

        if (force) {
          toast.success('Title updated', { description: `"${newTitle}"` });
        }
      } catch {
        // Non-blocking fallback: never disrupt chat or saves on title failure
      } finally {
        titleJobsInFlightRef.current.delete(sessionId);
      }
    },
    []
  );

  const handleRegenerateTitle = useCallback(
    async (sessionId: string) => {
      toast.info('Regenerating conversation title…');
      await triggerTitleGeneration(sessionId, '', true);
    },
    [triggerTitleGeneration]
  );

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isGenerating) return;

    setInputValue('');

    const userMessageId = `u-${Date.now()}`;
    const userMessage: Message = {
      id: userMessageId,
      senderRole: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'completed',
    };

    const assistantMessageId = `a-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      senderRole: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'streaming',
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId && isUUID(activeSessionId) ? activeSessionId : undefined,
          message: text,
          clientMessageId: userMessageId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => null);
        const errMsg = sanitizeErrorMessage(errorData?.error || `Chat API error (${response.status})`);
        throw new Error(errMsg);
      }

      // If server created a new session, capture its ID and add to sidebar
      const serverSessionId = response.headers.get('X-Session-Id');
      const sessionCreated = response.headers.get('X-Session-Created') === '1';
      const effectiveSessionId = serverSessionId || activeSessionId;

      if (serverSessionId && serverSessionId !== activeSessionId) {
        // Pre-mark loadedSessionIdRef to prevent useEffect from wiping out messages in-flight
        loadedSessionIdRef.current = serverSessionId;
        setActiveSessionId(serverSessionId);
        if (sessionCreated) {
          // Add new session to top of list with clean initial title
          const newSessionItem: ChatSessionItem = {
            id: serverSessionId,
            title: 'New conversation',
            createdAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
          };
          setSessions((prev) => [newSessionItem, ...prev]);
        }
      }

      // Run title generation independently alongside reply streaming
      if (effectiveSessionId && isUUID(effectiveSessionId)) {
        triggerTitleGeneration(effectiveSessionId, text);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: accumulated } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, status: 'completed' } : m
        )
      );

      // Move this conversation to the top of the sessions list after successful save
      if (serverSessionId) {
        setSessions((prev) => {
          const now = new Date().toISOString();
          const updated = prev.map((s) =>
            s.id === serverSessionId ? { ...s, lastActivityAt: now } : s
          );
          // Sort: most recently active first, stable by id
          return [...updated].sort((a, b) => {
            const ta = a.lastActivityAt ?? a.createdAt;
            const tb = b.lastActivityAt ?? b.createdAt;
            return ta < tb ? 1 : ta > tb ? -1 : a.id < b.id ? 1 : -1;
          });
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: (m.content ? m.content + ' [Generation stopped]' : 'Generation stopped by user.'), status: 'completed' }
              : m
          )
        );
      } else {
        const sanitized = sanitizeErrorMessage(err?.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: m.content || '',
                  status: 'failed',
                  errorMessage: sanitized,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Retries generating a response for a failed assistant message in-place
   * without duplicating the user's message in chat history.
   */
  const handleRetryMessage = async (failedAssistantId: string) => {
    if (isGenerating) return;

    const failedIndex = messages.findIndex((m) => m.id === failedAssistantId);
    if (failedIndex === -1) return;

    let precedingUserPrompt: Message | null = null;
    for (let i = failedIndex - 1; i >= 0; i--) {
      if (messages[i].senderRole === 'user') {
        precedingUserPrompt = messages[i];
        break;
      }
    }

    if (!precedingUserPrompt) return;
    const textToRetry = precedingUserPrompt.content;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === failedAssistantId
          ? { ...m, content: '', status: 'streaming', errorMessage: undefined }
          : m
      )
    );
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId && isUUID(activeSessionId) ? activeSessionId : undefined,
          message: textToRetry,
          clientMessageId: precedingUserPrompt.id,
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => null);
        const errMsg = sanitizeErrorMessage(errorData?.error || `Chat API error (${response.status})`);
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === failedAssistantId ? { ...m, content: accumulated } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === failedAssistantId ? { ...m, status: 'completed' } : m
        )
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === failedAssistantId
              ? { ...m, content: (m.content ? m.content + ' [Generation stopped]' : 'Generation stopped by user.'), status: 'completed' }
              : m
          )
        );
      } else {
        const sanitized = sanitizeErrorMessage(err?.message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === failedAssistantId
              ? {
                  ...m,
                  content: m.content || '',
                  status: 'failed',
                  errorMessage: sanitized,
                }
              : m
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    const lastFailed = [...messages].reverse().find((m) => m.status === 'failed');
    if (lastFailed) {
      handleRetryMessage(lastFailed.id);
    }
  };

  // ── Session management ───────────────────────────────────────────────────────

  const handleNewSession = () => {
    // Don't create a DB session yet — it will be created lazily on first message
    loadedSessionIdRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
  };

  const handleSelectSession = (id: string) => {
    if (id === activeSessionId) return;
    setActiveSessionId(id);
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    manuallyRenamedSessionIdsRef.current.add(id);
    // Optimistic update
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));

    if (!isUUID(id)) return; // temp ID — not yet in DB

    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) {
        // Rollback optimistic update
        await loadSessions();
        toast.error('Failed to rename conversation');
      }
    } catch {
      await loadSessions();
      toast.error('Failed to rename conversation');
    }
  };

  const handleDeleteSession = async (id: string) => {
    // Optimistic removal
    const removed = sessions.find((s) => s.id === id);
    setSessions((prev) => prev.filter((s) => s.id !== id));

    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else {
        handleNewSession();
      }
    }

    if (!isUUID(id)) return; // temp ID — nothing to delete in DB

    try {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        // Rollback: re-add the session
        if (removed) setSessions((prev) => [removed, ...prev]);
        throw new Error(errorData?.error || 'Failed to delete conversation on server.');
      }
    } catch (err: any) {
      if (removed) setSessions((prev) => [removed, ...prev]);
      throw err;
    }
  };

  // ── Derived layout state ──────────────────────────────────────────────────────
  // "New chat" = no real DB session and no messages sent yet.
  // Drives both the centered composer and heading visibility without any persistent flag.
  const isNewChat = activeSessionId === null && messages.length === 0;

  return (
    <StudentShell
      sessions={sessions}
      activeSessionId={activeSessionId ?? 'new-chat'}
      isLoadingSessions={isLoadingSessions}
      onNewSession={handleNewSession}
      onSelectSession={handleSelectSession}
      onRenameSession={handleRenameSession}
      onDeleteSession={handleDeleteSession}
    >
      {/*
        Main chat area. When `isNewChat` the flex column justifies to center so
        the composer + heading sit mid-screen. After the first message is sent the
        messages list becomes flex-1, pushing the composer to the natural bottom.
        A single `transition-all duration-[250ms] ease-out` on the inner wrapper
        keeps the motion restrained and respects the layout shift.
      */}
      <div
        className={`flex flex-col h-full bg-[#FBFBFA] dark:bg-[#000000] relative transition-all duration-[250ms] ease-out ${
          isNewChat ? 'justify-center' : 'justify-start'
        }`}
      >

        {/* ── Message Thread Area (hidden in new-chat centered state) ── */}
        <LoadingRegion
          isLoading={isLoadingMessages}
          announcement="Loading conversation messages..."
          className={`overflow-y-auto px-4 py-6 md:px-6 transition-all duration-[250ms] ease-out ${
            isNewChat
              ? 'flex-none max-h-0 overflow-hidden opacity-0 pointer-events-none select-none py-0'
              : 'flex-1 opacity-100'
          }`}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {isLoadingMessages ? (
              <ChatMessageSkeleton />
            ) : (
              messages.map((m) => {
                const isUser = m.senderRole === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && m.id === latestAssistantMessageId && (
                      <AssistantAvatar isLatest={true} animated={m.status !== 'failed'} />
                    )}

                    <div className={`space-y-1 max-w-[85%] sm:max-w-[80%]`}>
                      {m.status === 'failed' ? (
                        <div className="p-4 rounded-2xl rounded-tl-xs text-xs sm:text-sm bg-amber-50/80 dark:bg-[#1A1813] border border-amber-200 dark:border-amber-900/40 text-[#78350F] dark:text-[#FDE68A] shadow-xs space-y-3">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <div className="space-y-1 min-w-0">
                              <p className="font-semibold text-xs text-amber-900 dark:text-amber-300">
                                Unable to receive response
                              </p>
                              <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                                {m.errorMessage || 'Unable to receive a response from the AI companion service. Please try again in a few moments.'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-amber-200/70 dark:border-amber-900/30">
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(m.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#25231D] text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-[#2F2C23] transition-colors shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Try again</span>
                            </button>
                            <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                              Your message was preserved
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border ${
                            isUser
                              ? 'bg-[#4F648C] text-white dark:bg-[#91A7D0] dark:text-[#151B26] border-transparent rounded-tr-xs'
                              : 'bg-white dark:bg-[#18191C] text-[#18191B] dark:text-[#F3F4F6] border-[#E2E2DC] dark:border-[#1F2024] rounded-tl-xs shadow-xs'
                          }`}
                        >
                          {m.status === 'streaming' && !m.content ? (
                            <div className="flex items-center gap-1.5 py-1 px-0.5" aria-label="Assistant is thinking">
                              <span className="w-2 h-2 rounded-full bg-[#4F648C]/70 dark:bg-[#91A7D0]/70 animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-[#4F648C]/70 dark:bg-[#91A7D0]/70 animate-pulse [animation-delay:200ms]" />
                              <span className="w-2 h-2 rounded-full bg-[#4F648C]/70 dark:bg-[#91A7D0]/70 animate-pulse [animation-delay:400ms]" />
                              <span className="sr-only">Preparing response...</span>
                            </div>
                          ) : (
                            <>
                              {m.content}
                              {m.status === 'streaming' && (
                                <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse align-middle" aria-hidden="true" />
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <div
                        className={`text-[10px] text-[#71757E] px-1 ${
                          isUser ? 'text-right' : 'text-left'
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </LoadingRegion>

        {/* ── Centered welcome heading (only visible in new-chat state) ── */}
        <div
          aria-hidden={!isNewChat}
          className={`text-center px-4 pb-6 select-none transition-all duration-[250ms] ease-out motion-reduce:transition-none ${
            isNewChat
              ? 'opacity-100 max-h-48 mb-0'
              : 'opacity-0 max-h-0 overflow-hidden pointer-events-none pb-0'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#91A7D0] flex items-center justify-center mb-4 mx-auto">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18191B] dark:text-[#F3F4F6] mb-2">
            What&apos;s on your mind today?
          </h2>
          <p className="text-xs sm:text-sm text-[#71757E] dark:text-[#8C9099] max-w-sm mx-auto">
            Talk through academic stress, daily thoughts, or anything weighing on you in private.
          </p>
        </div>

        {/* ── Composer — single instance, always mounted ── */}
        <div className="bg-[#FBFBFA] dark:bg-[#000000] shrink-0 w-full px-4 sm:px-6 pt-3.5 pb-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:min-h-[104px] flex flex-col justify-center">
          <div className="max-w-3xl w-full mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ backgroundColor: 'transparent' }}
              className="relative flex items-center gap-2 !bg-transparent border border-[#E2E2DC] dark:border-[#2C2D32] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 focus-within:border-[#4F648C] dark:focus-within:border-[#91A7D0] transition-all"
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="How are you feeling today?"
                style={{ backgroundColor: 'transparent' }}
                className="w-full min-w-0 !bg-transparent !border-0 text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] placeholder-[#71757E] dark:placeholder-[#8C9099] focus:outline-none resize-none max-h-32 min-h-[36px] py-2 px-3 leading-5"
              />

              <div className="flex items-center shrink-0">
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    title="Stop generation"
                    aria-label="Stop generating response"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className={`w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] rounded-full flex items-center justify-center transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0] ${
                      inputValue.trim()
                        ? 'bg-[#4F648C] hover:bg-[#405374] dark:bg-[#91A7D0] dark:hover:bg-[#A6B9DC] text-white dark:text-[#151B26] shadow-sm cursor-pointer'
                        : 'bg-[#E2E2DC] dark:bg-[#2A2B30] text-[#8C9099] dark:text-[#636773] cursor-not-allowed opacity-60'
                    }`}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </form>

            <div className="mt-2.5 text-center text-[11px] leading-tight text-[#71757E] px-1 select-none">
              <span>SentiMate AI offers conversational reflections, not medical diagnosis.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Consent & Privacy Preferences Dialog */}
      <Dialog
        isOpen={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
        title="Privacy & Processing Consent"
        description="You have full control over how your conversation and check-in information are processed."
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                AI Chat Processing (NVIDIA Nemotron)
              </span>
              <Badge variant="teal" size="sm">Active</Badge>
            </div>
            <p className="text-xs text-[#71757E]">
              Generates empathetic, context-aware chatbot reflections using NVIDIA Nemotron-3 Super. Messages are streamed securely with reasoning tokens disabled, and are never used to train public foundation models.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                Explainable Support Indicators (NLP + SHAP)
              </span>
              <Badge variant="neutral" size="sm">Consented</Badge>
            </div>
            <p className="text-xs text-[#71757E]">
              Evaluates voluntary check-ins to provide transparent, explainable feature indicators to your assigned counsellor when you book an appointment.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setConsentModalOpen(false)} variant="primary">
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </StudentShell>
  );
}
