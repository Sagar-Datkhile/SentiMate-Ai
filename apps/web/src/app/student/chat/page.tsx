'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useStudent, ChatSessionItem } from '@/components/layout/StudentContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { ChatMessageSkeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { AssistantAvatar } from '@/components/layout/AssistantAvatar';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { createClient } from '@/lib/supabase/client';

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

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    sessions,
    isLoadingSessions,
    setSessions,
    addSession,
    updateSessionTitle,
    deleteSession,
    setActiveSessionId: setContextActiveSessionId,
  } = useStudent();

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

  // ── Auto-resize composer textarea smoothly ──────────────────────────────────
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Temporarily reset height to auto so scrollHeight can shrink when removing text
    textarea.style.height = 'auto';

    const maxHeight = 160; // ~6-7 lines
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${Math.max(36, scrollHeight)}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  useEffect(() => {
    window.addEventListener('resize', adjustTextareaHeight);
    return () => window.removeEventListener('resize', adjustTextareaHeight);
  }, [adjustTextareaHeight]);

  // Continuity & Title Generation Refs:
  // - loadedSessionIdRef: tracks the session whose messages are currently in state to eliminate remount/flicker
  // - manuallyRenamedSessionIdsRef: tracks sessions renamed by the user so auto-titles never overwrite them
  // - autoTitleGeneratedSessionIdsRef: guarantees at most one automatic title generation per conversation
  // - titleJobsInFlightRef: deduplicates in-flight background title requests
  const loadedSessionIdRef = useRef<string | null>(null);
  const manuallyRenamedSessionIdsRef = useRef<Set<string>>(new Set());
  const autoTitleGeneratedSessionIdsRef = useRef<Set<string>>(new Set());
  const titleJobsInFlightRef = useRef<Set<string>>(new Set());

  // ── Welcome heading first-name & profile loading ───────────────────────────
  const [firstName, setFirstName] = useState<string>('');
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && mounted) {
          const full =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            '';
          // Extract only the first word (first name), trimming whitespace
          const first = full.trim().split(/\s+/)[0] ?? '';
          setFirstName(first);
        }
      } catch {
        // Ignore — heading degrades gracefully without a name
      } finally {
        if (mounted) {
          setIsProfileLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);


  const latestAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderRole === 'assistant') {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  // ── Session loading ──────────────────────────────────────────────────────────

  // ── Sync active session with URL search parameter ────────────────────────────

  const sessionParam = searchParams.get('session');

  useEffect(() => {
    if (sessionParam && isUUID(sessionParam)) {
      setActiveSessionId(sessionParam);
      setContextActiveSessionId(sessionParam);
    } else {
      setActiveSessionId(null);
      setContextActiveSessionId(null);
    }
  }, [sessionParam, setContextActiveSessionId]);

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
        updateSessionTitle(sessionId, newTitle);

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
          addSession(newSessionItem);
          setContextActiveSessionId(serverSessionId);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `/student/chat?session=${serverSessionId}`);
          }
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
    loadedSessionIdRef.current = null;
    setActiveSessionId(null);
    setContextActiveSessionId(null);
    setMessages([]);
    router.push('/student/chat');
  };

  const handleSelectSession = (id: string) => {
    if (id === activeSessionId) return;
    setActiveSessionId(id);
    setContextActiveSessionId(id);
    router.push(`/student/chat?session=${id}`);
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    manuallyRenamedSessionIdsRef.current.add(id);
    updateSessionTitle(id, newTitle);

    if (!isUUID(id)) return;

    try {
      const res = await fetch(`/api/chat/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) {
        toast.error('Failed to rename conversation');
      }
    } catch {
      toast.error('Failed to rename conversation');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        router.push(`/student/chat?session=${remaining[0].id}`);
      } else {
        handleNewSession();
      }
    }

    try {
      await deleteSession(id);
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  // ── Derived layout state ──────────────────────────────────────────────────────
  // "New chat" = no real DB session and no messages sent yet.
  // Drives both the centered composer and heading visibility without any persistent flag.
  const isNewChat = activeSessionId === null && messages.length === 0;
  const isInitialLoading = isLoadingSessions || isProfileLoading;

  return (
    <>
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
                              ? 'bg-[#4F648C] text-white dark:bg-[#91A7D0] dark:text-[#151B26] border-transparent rounded-tr-xs whitespace-pre-wrap break-words'
                              : 'bg-white dark:bg-[#18191C] text-[#18191B] dark:text-[#F3F4F6] border-[#E2E2DC] dark:border-[#1F2024] rounded-tl-xs shadow-xs min-w-0 max-w-full overflow-hidden break-words'
                          }`}
                        >
                          {isUser ? (
                            m.content
                          ) : m.status === 'streaming' && !m.content ? (
                            <div className="flex items-center gap-1.5 py-1 px-0.5" aria-label="Assistant is thinking">
                              <span className="w-2 h-2 rounded-full bg-[#4F648C]/70 dark:bg-[#91A7D0]/70 animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-[#4F648C]/70 dark:bg-[#91A7D0]/70 animate-pulse [animation-delay:200ms]" />
                              <span className="w-2 h-2 rounded-full bg-[#4F648C]/70 dark:bg-[#91A7D0]/70 animate-pulse [animation-delay:400ms]" />
                              <span className="sr-only">Preparing response...</span>
                            </div>
                          ) : (
                            <MarkdownContent content={m.content} isStreaming={m.status === 'streaming'} />
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
        {/* ── Centered welcome layout (only visible in new-chat state) ── */}
        <div
          aria-hidden={!isNewChat}
          className={`w-full text-center px-4 transition-all duration-[250ms] ease-out motion-reduce:transition-none ${
            isNewChat
              ? 'max-h-80 mb-5'
              : 'max-h-0 overflow-hidden pointer-events-none mb-0'
          } ${isInitialLoading ? 'opacity-0' : isNewChat ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="mx-auto max-w-[720px] px-2 select-none">
            {/* Small greeting */}
            <p className="sentimate-welcome-greeting text-sm sm:text-base md:text-[17px] font-normal mb-1.5 sm:mb-2">
              {firstName ? `Hey ${firstName},` : 'Hey there,'}
            </p>

            {/* Playfair Display main heading (40-48px on desktop, responsively smaller on mobile) */}
            <h1 className="sentimate-welcome-heading text-[32px] sm:text-[40px] md:text-[44px] lg:text-[48px] leading-[1.15] font-normal tracking-[-0.01em] mb-2.5 sm:mb-3">
              What’s on your mind today?
            </h1>

            {/* Muted supporting line */}
            <p className="sentimate-welcome-subline text-xs sm:text-sm font-normal">
              No need to find the perfect words.
            </p>
          </div>
        </div>

        {/* ── Composer — single instance, always mounted ── */}
        <div className={`shrink-0 w-full px-4 sm:px-6 pb-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col justify-center transition-all duration-[250ms] ease-out ${
          isNewChat ? 'pt-0' : 'pt-3 md:min-h-[104px]'
        }`}>
          <div className="max-w-[720px] w-full mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end gap-2 bg-white/70 dark:bg-[#121316]/65 backdrop-blur-md border border-[#E2E2DC]/80 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] focus-within:border-[#4F648C] dark:focus-within:border-[#91A7D0] focus-within:ring-2 focus-within:ring-[#4F648C]/15 dark:focus-within:ring-[#91A7D0]/20 transition-all"
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="How are you feeling today?"
                className="w-full min-w-0 bg-transparent border-0 text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] placeholder-[#71757E] dark:placeholder-[#8C9099] focus:outline-none resize-none min-h-[36px] max-h-40 py-2 px-3 leading-5 overflow-hidden [scrollbar-width:thin] [scrollbar-color:#71757E_transparent] dark:[scrollbar-color:#4A4D54_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/15 dark:[&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/25 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0"
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
    </>
  );
}

export default function StudentChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}
