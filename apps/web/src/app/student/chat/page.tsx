'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  Shield,
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
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/Toast';

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

export default function StudentChatPage() {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [activeSessionId, setActiveSessionId] = useState<string>('sess-current');

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(true);

  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const [consentAcknowledged, setConsentAcknowledged] = useState(true);
  const [consentModalOpen, setConsentModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;
    const initChat = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const name =
          user?.user_metadata?.full_name ||
          user?.user_metadata?.name ||
          user?.email?.split('@')[0] ||
          '';

        const greetingText = name
          ? `Hello ${name}. Welcome to your private conversation space. How are you feeling today with your courses, exams, and routines?`
          : 'Hello. Welcome to your private conversation space. How are you feeling today with your courses, exams, and routines?';

        if (isMounted) {
          const currentSession: ChatSessionItem = {
            id: 'sess-current',
            title: 'Current Session',
            createdAt: new Date().toISOString(),
          };
          setSessions([currentSession]);
          setActiveSessionId('sess-current');

          setMessages([
            {
              id: 'm-welcome',
              senderRole: 'assistant',
              content: greetingText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'completed',
            },
          ]);
        }
      } catch {
        if (isMounted) {
          setMessages([
            {
              id: 'm-welcome',
              senderRole: 'assistant',
              content:
                'Hello. Welcome to your private conversation space. How are you feeling today with your courses, exams, and routines?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'completed',
            },
          ]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSessions(false);
          setIsLoadingMessages(false);
        }
      }
    };
    initChat();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isGenerating) return;

    setInputValue('');
    setLastFailedInput(null);

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
      // Call server-side streaming API `/api/chat`
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
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
        setLastFailedInput(text);
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
        toast.error('Unable to receive response', {
          description: sanitized,
          duration: 5000,
        });
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

    // Find preceding user prompt
    let precedingUserPrompt: Message | null = null;
    for (let i = failedIndex - 1; i >= 0; i--) {
      if (messages[i].senderRole === 'user') {
        precedingUserPrompt = messages[i];
        break;
      }
    }

    if (!precedingUserPrompt) return;
    const textToRetry = precedingUserPrompt.content;

    setLastFailedInput(null);
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
          sessionId: activeSessionId,
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
        setLastFailedInput(textToRetry);
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
        toast.error('Unable to receive response', {
          description: sanitized,
          duration: 5000,
        });
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
    // If a failed assistant message is present, retry it in place
    const lastFailed = [...messages].reverse().find((m) => m.status === 'failed');
    if (lastFailed) {
      handleRetryMessage(lastFailed.id);
    } else if (lastFailedInput) {
      handleSendMessage(lastFailedInput);
    }
  };

  const handleNewSession = () => {
    const newId = `sess-${Date.now()}`;
    const newSession: ChatSessionItem = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
    setMessages([
      {
        id: `m-${Date.now()}`,
        senderRole: 'assistant',
        content:
          "Welcome to a new conversation. What would you like to reflect on or talk about today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'completed',
      },
    ]);
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
  };

  const handleDeleteSession = (id: string) => {
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id && remaining.length > 0) {
      setActiveSessionId(remaining[0].id);
    }
  };

  return (
    <StudentShell
      sessions={sessions}
      activeSessionId={activeSessionId}
      isLoadingSessions={isLoadingSessions}
      onNewSession={handleNewSession}
      onSelectSession={(id) => setActiveSessionId(id)}
      onRenameSession={handleRenameSession}
      onDeleteSession={handleDeleteSession}
    >
      <div className="flex flex-col h-full bg-[#FBFBFA] dark:bg-[#000000] relative">
        {/* Workspace Sub-header */}
        <div className="border-b border-[#E2E2DC] dark:border-[#1F2024] bg-white/70 dark:bg-[#0D0E11]/70 backdrop-blur-xs px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">
              {sessions.find((s) => s.id === activeSessionId)?.title || 'Active Conversation'}
            </span>
            <Badge variant="neutral" size="sm">
              Private Student Session
            </Badge>
          </div>

          <button
            onClick={() => setConsentModalOpen(true)}
            className="flex items-center gap-1.5 text-[#0D766E] dark:text-[#2DD4BF] hover:underline"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Consent & Privacy Settings</span>
          </button>
        </div>

        {/* Message Thread Area */}
        <LoadingRegion
          isLoading={isLoadingMessages}
          announcement="Loading conversation messages..."
          className="flex-1 overflow-y-auto px-4 py-6 md:px-6"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {isLoadingMessages ? (
              <ChatMessageSkeleton />
            ) : messages.length === 0 ? (
              <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center px-4 select-none">
                <div className="w-12 h-12 rounded-2xl bg-[#0D766E]/10 dark:bg-[#14B8A6]/10 text-[#0D766E] dark:text-[#14B8A6] flex items-center justify-center mb-4">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18191B] dark:text-[#F3F4F6] mb-2">
                  What&apos;s on your mind today?
                </h2>
                <p className="text-xs sm:text-sm text-[#71757E] dark:text-[#8C9099] max-w-md">
                  Talk through academic stress, daily thoughts, or anything weighing on you in private.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.senderRole === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${
                          m.status === 'failed'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                            : 'bg-[#0D766E] dark:bg-[#14B8A6] text-white dark:text-[#000000]'
                        }`}
                        title={m.status === 'failed' ? 'Service Notification' : 'AI Companion'}
                      >
                        {m.status === 'failed' ? <AlertCircle className="w-4 h-4" /> : 'AI'}
                      </div>
                    )}

                    <div className={`space-y-1 max-w-[85%] sm:max-w-[80%]`}>
                      {m.status === 'failed' ? (
                        <div className="p-4 rounded-2xl rounded-tl-xs text-xs sm:text-sm bg-amber-50/80 dark:bg-[#1A1813] border border-amber-200 dark:border-amber-900/40 text-[#78350F] dark:text-[#FDE68A] shadow-xs space-y-3">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <div className="space-y-1 min-w-0">
                              <p className="font-semibold text-xs text-amber-900 dark:text-amber-300">
                                Unable to generate response
                              </p>
                              <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                                {m.errorMessage || 'The conversational companion is temporarily unavailable. Your message was preserved.'}
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
                              ? 'bg-[#0D766E] text-white dark:bg-[#14B8A6] dark:text-[#000000] border-transparent rounded-tr-xs'
                              : 'bg-white dark:bg-[#18191C] text-[#18191B] dark:text-[#F3F4F6] border-[#E2E2DC] dark:border-[#1F2024] rounded-tl-xs shadow-xs'
                          }`}
                        >
                          {m.status === 'streaming' && !m.content ? (
                            <div className="flex items-center gap-1.5 py-1 px-0.5" aria-label="Assistant is thinking">
                              <span className="w-2 h-2 rounded-full bg-[#0D766E]/70 dark:bg-[#14B8A6]/70 animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-[#0D766E]/70 dark:bg-[#14B8A6]/70 animate-pulse [animation-delay:200ms]" />
                              <span className="w-2 h-2 rounded-full bg-[#0D766E]/70 dark:bg-[#14B8A6]/70 animate-pulse [animation-delay:400ms]" />
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

                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-[#E2E2DC] dark:bg-[#18191C] text-[#18191B] dark:text-[#F3F4F6] flex items-center justify-center text-xs font-semibold shrink-0">
                        You
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </LoadingRegion>

        {/* Failed Input Retry Bar */}
        {lastFailedInput && (
          <div className="bg-[#FFFBEB] dark:bg-[rgba(245,158,11,0.12)] border-t border-[#FDE68A] dark:border-[rgba(245,158,11,0.25)] p-2.5 px-4 flex items-center justify-between text-xs text-[#B45309] dark:text-[#FBBF24]">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Response could not be generated for: &quot;{lastFailedInput.slice(0, 40)}{lastFailedInput.length > 40 ? '...' : ''}&quot;</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="gap-1 min-h-[32px] bg-white dark:bg-[#18191C]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </Button>
              <button
                type="button"
                onClick={() => setLastFailedInput(null)}
                aria-label="Dismiss retry notice"
                className="p-1 rounded text-[#B45309] dark:text-[#FBBF24] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Multiline Composer with Pill Input and Circular Up Arrow Send Button */}
        <div className="border-t border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#000000] p-3 sm:p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end gap-2 bg-[#F4F4F1] dark:bg-[#1E1F22] border border-[#E2E2DC] dark:border-[#2C2D32] rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 focus-within:border-[#2563EB] dark:focus-within:border-[#3B82F6] transition-all shadow-xs"
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
                placeholder="Talk about what is on your mind..."
                className="w-full bg-transparent border-0 text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] placeholder-[#71757E] dark:placeholder-[#8C9099] focus:outline-none resize-none max-h-32 min-h-[38px] py-1.5 px-3"
              />

              <div className="flex items-center gap-1 shrink-0 pb-0.5">
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    title="Stop generation"
                    aria-label="Stop generating response"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      inputValue.trim()
                        ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm cursor-pointer'
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

            <div className="mt-2 text-center text-[11px] text-[#71757E] px-1">
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
