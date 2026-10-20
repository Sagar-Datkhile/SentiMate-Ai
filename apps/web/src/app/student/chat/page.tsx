'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
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
} from 'lucide-react';
import { StudentShell, ChatSessionItem } from '@/components/layout/StudentShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { ChatMessageSkeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  senderRole: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'pending' | 'streaming' | 'completed' | 'failed';
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
        throw new Error(errorData?.error || `Chat API error (${response.status})`);
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
              ? { ...m, content: m.content + ' [Generation stopped]', status: 'completed' }
              : m
          )
        );
      } else {
        // Preserve failed input for retry without creating duplicates
        setLastFailedInput(text);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content:
                    err.message ||
                    'Assistant service is currently unavailable or API key not configured. Your message was preserved so you can retry below.',
                  status: 'failed',
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
    if (lastFailedInput) {
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
      <div className="flex flex-col h-full bg-[#FBFBFA] dark:bg-[#0F1115] relative">
        {/* Workspace Sub-header */}
        <div className="border-b border-[#E2E2DC] dark:border-[#2C3038] bg-white/70 dark:bg-[#17191E]/70 backdrop-blur-xs px-4 py-2.5 flex items-center justify-between text-xs shrink-0">
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
            ) : (
              messages.map((m) => {
                const isUser = m.senderRole === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-[#0D766E] dark:bg-[#14B8A6] text-white dark:text-[#0F1115] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                        AI
                      </div>
                    )}

                    <div className={`space-y-1 max-w-[85%] sm:max-w-[80%]`}>
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border ${
                          isUser
                            ? 'bg-[#0D766E] text-white dark:bg-[#14B8A6] dark:text-[#0F1115] border-transparent rounded-tr-xs'
                            : m.status === 'failed'
                            ? 'bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-red-800 dark:text-red-300 rounded-tl-xs'
                            : 'bg-white dark:bg-[#17191E] text-[#18191B] dark:text-[#F3F4F6] border-[#E2E2DC] dark:border-[#2C3038] rounded-tl-xs shadow-xs'
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
                      <div
                        className={`text-[10px] text-[#71757E] px-1 ${
                          isUser ? 'text-right' : 'text-left'
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-[#E2E2DC] dark:bg-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] flex items-center justify-center text-xs font-semibold shrink-0">
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
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to send: "{lastFailedInput.slice(0, 40)}..."</span>
            </div>
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="gap-1 min-h-[36px] bg-white dark:bg-[#17191E]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        )}

        {/* Bottom Accessible Multiline Composer */}
        <div className="border-t border-[#E2E2DC] dark:border-[#2C3038] bg-white dark:bg-[#17191E] p-3 sm:p-4 shrink-0">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-end gap-2 bg-[#F4F4F1] dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038] rounded-xl p-2 focus-within:border-[#0D766E] dark:focus-within:border-[#14B8A6] transition-all"
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
                placeholder="Talk about what is on your mind... (Shift+Enter for newline)"
                className="w-full bg-transparent border-0 text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] placeholder-[#71757E] focus:outline-none resize-none max-h-32 min-h-[38px] py-1.5 px-2"
              />

              <div className="flex items-center gap-1 shrink-0 pb-0.5">
                {isGenerating ? (
                  <Button
                    type="button"
                    onClick={handleStop}
                    variant="danger"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-lg min-h-[36px] min-w-[36px]"
                    title="Stop generation"
                    aria-label="Stop generating response"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!inputValue.trim()}
                    variant="primary"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-lg min-h-[36px] min-w-[36px]"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-2 flex items-center justify-between text-[11px] text-[#71757E] px-1">
              <span>SentiMate AI offers conversational reflections, not medical diagnosis.</span>
              <a href="/resources" className="text-[#0D766E] dark:text-[#2DD4BF] hover:underline font-medium">
                Immediate Crisis Support →
              </a>
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
          <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038] space-y-2">
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

          <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038] space-y-2">
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
