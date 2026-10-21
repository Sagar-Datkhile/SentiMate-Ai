'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  HeartHandshake,
  Trash2,
  Edit2,
  Check,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { ChatHistorySkeleton } from '../ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { SidebarToggle } from './SidebarToggle';
import { AccountTrigger } from './AccountTrigger';
import { AccountMenu, UserProfileData } from './AccountMenu';

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
}

interface StudentShellProps {
  children: React.ReactNode;
  sessions?: ChatSessionItem[];
  activeSessionId?: string;
  isLoadingSessions?: boolean;
  onNewSession?: () => void;
  onSelectSession?: (id: string) => void;
  onRenameSession?: (id: string, newTitle: string) => void;
  onDeleteSession?: (id: string) => void;
  studentName?: string;
}

export function StudentShell({
  children,
  sessions = [],
  activeSessionId,
  isLoadingSessions = false,
  onNewSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  studentName = 'Alex',
}: StudentShellProps) {
  const router = useRouter();

  // Desktop sidebar collapse state (persisted locally)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // User profile information
  const [userProfile, setUserProfile] = useState<UserProfileData>({
    displayName: studentName,
    email: undefined,
    username: undefined,
    role: 'Student',
  });
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Conversation renaming state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Refs for trigger button positioning
  const desktopTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);

  // Initialize desktop collapse preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sentimate_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sentimate_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Fetch real authenticated user profile data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            studentName;

          // Also check profiles table for username
          let username: string | undefined = undefined;
          try {
            const { data: profile } = await supabase
              .from('student_profiles')
              .select('username')
              .eq('id', user.id)
              .maybeSingle();
            if (profile?.username) {
              username = profile.username;
            }
          } catch {
            // Ignore optional profile lookup
          }

          setUserProfile({
            displayName: name,
            email: user.email,
            username,
            role: 'Student',
          });
        }
      } catch {
        // Fall back to studentName prop
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, [studentName]);

  const handleStartRename = (session: ChatSessionItem) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim() && onRenameSession) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleNewChatAction = () => {
    if (onNewSession) onNewSession();
    else router.push('/student/chat');
    setMobileDrawerOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#FBFBFA] dark:bg-[#000000] overflow-hidden">
      {/* 1. Desktop Sidebar / Rail */}
      <aside
        className={`hidden md:flex flex-col h-full bg-[#F4F4F1] dark:bg-[#0D0E11] border-r border-[#E2E2DC] dark:border-[#1F2024] text-[#18191B] dark:text-[#F3F4F6] shrink-0 transition-[width] duration-200 ease-in-out select-none relative z-30 ${
          isCollapsed ? 'w-16' : 'w-64 lg:w-72'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center border-b border-[#E2E2DC] dark:border-[#1F2024] shrink-0 ${
            isCollapsed ? 'p-2 justify-center h-16' : 'p-3.5 justify-between h-16'
          }`}
        >
          {isCollapsed ? (
            /* Collapsed header: show brand icon by default, toggle icon on hover */
            <div className="group relative flex items-center justify-center">
              {/* Brand icon (default) */}
              <div
                onClick={handleToggleCollapse}
                role="button"
                aria-label="Expand sidebar"
                className="w-9 h-9 rounded-xl bg-[#0D766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#000000] shadow-xs shrink-0 cursor-pointer transition-opacity duration-150 group-hover:opacity-0 select-none"
              >
                <HeartHandshake className="w-4 h-4" aria-hidden="true" />
              </div>
              {/* Expand toggle icon (revealed on hover) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <SidebarToggle
                  isCollapsed={true}
                  onToggle={handleToggleCollapse}
                  side="right"
                />
              </div>
            </div>
          ) : (
            <>
              <Link href="/student/chat" className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#0D766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#000000] shadow-xs shrink-0">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs sm:text-sm tracking-tight truncate block leading-tight">
                    SentiMate
                  </span>
                  <span className="block text-[10px] text-[#71757E] uppercase font-medium truncate">
                    Student Space
                  </span>
                </div>
              </Link>
              <SidebarToggle
                isCollapsed={false}
                onToggle={handleToggleCollapse}
                side="bottom"
              />
            </>
          )}
        </div>

        {/* New Conversation Control */}
        <div className={`shrink-0 ${isCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}>
          {isCollapsed ? (
            <Tooltip content="New conversation" side="right">
              <button
                type="button"
                onClick={handleNewChatAction}
                aria-label="New conversation"
                className="w-10 h-10 rounded-xl bg-white dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] hover:border-[#0D766E] dark:hover:border-[#14B8A6] text-[#0D766E] dark:text-[#14B8A6] flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D766E]"
              >
                <Plus className="w-5 h-5" />
              </button>
            </Tooltip>
          ) : (
            <Button
              onClick={handleNewChatAction}
              variant="outline"
              className="w-full justify-start gap-2 bg-white dark:bg-[#18191C] border-[#E2E2DC] dark:border-[#1F2024] hover:border-[#0D766E] dark:hover:border-[#14B8A6] text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
              <span>New conversation</span>
            </Button>
          )}
        </div>

        {/* Center Area: Conversation History (Expanded) or Minimal Rail (Collapsed) */}
        {isCollapsed ? (
          <div className="flex-1 flex flex-col items-center justify-start py-2" />
        ) : (
          <div
            className="flex-1 overflow-y-auto px-3 py-1 space-y-1"
            aria-busy={isLoadingSessions}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71757E] px-2 py-1">
              Recent Conversations
            </div>

            {isLoadingSessions ? (
              <>
                <span className="sr-only" role="status" aria-live="polite">
                  Loading recent conversations...
                </span>
                <ChatHistorySkeleton count={3} />
              </>
            ) : sessions.length === 0 ? (
              <div className="px-2 py-3 text-xs text-[#71757E] italic">No previous chats yet</div>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#18191C] font-medium text-[#0D766E] dark:text-[#2DD4BF] shadow-xs'
                        : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#EAEAE5] dark:hover:bg-[#18191C]'
                    }`}
                    onClick={() => {
                      if (onSelectSession) onSelectSession(s.id);
                    }}
                  >
                    {editingSessionId === s.id ? (
                      <div
                        className="flex items-center gap-1 w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(s.id)}
                          className="w-full px-1.5 py-0.5 rounded bg-white dark:bg-[#121316] border border-[#0D766E] text-xs"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(s.id)}
                          className="p-1 hover:text-green-600"
                          aria-label="Confirm rename"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate flex-1">{s.title}</span>
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(s);
                            }}
                            className="p-1 text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6]"
                            aria-label="Rename conversation"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onDeleteSession) onDeleteSession(s.id);
                            }}
                            className="p-1 text-[#71757E] hover:text-red-600"
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Bottom Account Trigger */}
        <div className={`border-t border-[#E2E2DC] dark:border-[#1F2024] shrink-0 ${
          isCollapsed ? 'p-2 flex justify-center' : 'p-2.5'
        }`}>
          <AccountTrigger
            buttonRef={desktopTriggerRef}
            userProfile={userProfile}
            isLoading={isLoadingUser}
            isOpen={accountMenuOpen}
            onToggle={() => setAccountMenuOpen((prev) => !prev)}
            isCollapsed={isCollapsed}
          />
        </div>
      </aside>

      {/* 2. Mobile Accessible Slide-over Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85%] h-full bg-[#F4F4F1] dark:bg-[#0D0E11] z-10 shadow-2xl flex flex-col text-[#18191B] dark:text-[#F3F4F6]">
            {/* Mobile Header */}
            <div className="p-3.5 flex items-center justify-between border-b border-[#E2E2DC] dark:border-[#1F2024] h-16 shrink-0">
              <Link
                href="/student/chat"
                className="flex items-center gap-2.5 min-w-0"
                onClick={() => setMobileDrawerOpen(false)}
              >
                <div className="w-8 h-8 rounded-xl bg-[#0D766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#000000] shadow-xs">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-sm tracking-tight">SentiMate</span>
                  <span className="block text-[10px] text-[#71757E] uppercase font-medium">Student Space</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#71757E] hover:bg-[#EAEAE5] dark:hover:bg-[#18191C] min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile New Chat Action */}
            <div className="p-3 shrink-0">
              <Button
                onClick={handleNewChatAction}
                variant="outline"
                className="w-full justify-start gap-2 bg-white dark:bg-[#18191C] border-[#E2E2DC] dark:border-[#1F2024] hover:border-[#0D766E] dark:hover:border-[#14B8A6] text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                <span>New conversation</span>
              </Button>
            </div>

            {/* Mobile Recent Conversations */}
            <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71757E] px-2 py-1">
                Recent Conversations
              </div>
              {sessions.length === 0 ? (
                <div className="px-2 py-3 text-xs text-[#71757E] italic">No previous chats yet</div>
              ) : (
                sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white dark:bg-[#18191C] font-medium text-[#0D766E] dark:text-[#2DD4BF] shadow-xs'
                          : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#EAEAE5] dark:hover:bg-[#18191C]'
                      }`}
                      onClick={() => {
                        if (onSelectSession) onSelectSession(s.id);
                        setMobileDrawerOpen(false);
                      }}
                    >
                      <span className="truncate flex-1">{s.title}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile Account Trigger */}
            <div className="border-t border-[#E2E2DC] dark:border-[#1F2024] p-2.5 shrink-0">
              <AccountTrigger
                buttonRef={mobileTriggerRef}
                userProfile={userProfile}
                isLoading={isLoadingUser}
                isOpen={accountMenuOpen}
                onToggle={() => setAccountMenuOpen((prev) => !prev)}
                isCollapsed={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Account Menu Popup (Portal) */}
      <AccountMenu
        isOpen={accountMenuOpen}
        onClose={() => setAccountMenuOpen(false)}
        triggerRef={mobileDrawerOpen ? mobileTriggerRef : desktopTriggerRef}
        userProfile={userProfile}
        isCollapsed={isCollapsed && !mobileDrawerOpen}
      />

      {/* 4. Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#0D0E11] shrink-0 h-14">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
            <span className="font-semibold text-sm">SentiMate</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Content Body */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
