'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  HeartHandshake,
  Trash2,
  Pencil,
  Share2,
  MoreVertical,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Tooltip } from '../ui/Tooltip';
import { toast } from '@/components/ui/Toast';
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

  // Actions menu state
  const [mounted, setMounted] = useState(false);
  const [menuSession, setMenuSession] = useState<ChatSessionItem | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ left: number; top: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  // Rename dialog state
  const [renameModalSession, setRenameModalSession] = useState<ChatSessionItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete confirmation dialog state
  const [deleteModalSession, setDeleteModalSession] = useState<ChatSessionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleToggleMenu = (session: ChatSessionItem, triggerEl: HTMLElement) => {
    if (menuSession?.id === session.id) {
      setMenuSession(null);
      setMenuCoords(null);
      return;
    }

    const rect = triggerEl.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 135;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.right - menuWidth;
    if (left < margin) {
      left = Math.max(margin, rect.left);
    }
    if (left + menuWidth > viewportWidth - margin) {
      left = viewportWidth - menuWidth - margin;
    }

    let top: number;
    if (rect.bottom + menuHeight + margin <= viewportHeight) {
      top = rect.bottom + 4;
    } else if (rect.top - menuHeight - margin >= 0) {
      top = rect.top - menuHeight - 4;
    } else {
      top = Math.max(margin, viewportHeight - menuHeight - margin);
    }

    activeTriggerRef.current = triggerEl;
    setMenuCoords({ left, top });
    setMenuSession(session);
  };

  const handleOpenRename = (session: ChatSessionItem) => {
    setMenuSession(null);
    setMenuCoords(null);
    setMobileDrawerOpen(false);
    setRenameTitle(session.title);
    setRenameModalSession(session);
  };

  const handleConfirmRename = () => {
    if (!renameModalSession || isRenaming) return;
    const trimmed = renameTitle.trim();
    if (!trimmed) return;

    setIsRenaming(true);
    try {
      if (onRenameSession) {
        onRenameSession(renameModalSession.id, trimmed);
      }
      toast.success('Conversation renamed', {
        description: `Updated title to "${trimmed}".`,
      });
      setRenameModalSession(null);
    } catch {
      toast.error('Failed to rename conversation');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleOpenDelete = (session: ChatSessionItem) => {
    setMenuSession(null);
    setMenuCoords(null);
    setMobileDrawerOpen(false);
    setDeleteModalSession(session);
  };

  const handleConfirmDelete = () => {
    if (!deleteModalSession || isDeleting) return;
    const target = deleteModalSession;
    setIsDeleting(true);
    try {
      if (onDeleteSession) {
        onDeleteSession(target.id);
      }
      toast.success('Conversation deleted', {
        description: `"${target.title}" has been deleted.`,
      });
      if (target.id === activeSessionId) {
        handleNewChatAction();
      }
      setDeleteModalSession(null);
    } catch {
      toast.error('Failed to delete conversation');
    } finally {
      setIsDeleting(false);
    }
  };

  // Close menu on outside click, scroll or Escape
  useEffect(() => {
    if (!menuSession) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        activeTriggerRef.current &&
        !activeTriggerRef.current.contains(target)
      ) {
        setMenuSession(null);
        setMenuCoords(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuSession(null);
        setMenuCoords(null);
        activeTriggerRef.current?.focus();
      }
    };

    const handleClose = () => {
      setMenuSession(null);
      setMenuCoords(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleClose);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleClose);
    };
  }, [menuSession]);

  // Focus management inside menu
  useEffect(() => {
    if (menuSession) {
      requestAnimationFrame(() => {
        menuItemsRef.current[0]?.focus();
      });
    }
  }, [menuSession]);

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = menuItemsRef.current.filter(Boolean) as HTMLButtonElement[];
    if (items.length === 0) return;

    const currentIndex = items.findIndex((el) => el === document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[prevIndex]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMenuSession(null);
      setMenuCoords(null);
      activeTriggerRef.current?.focus();
    }
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
                className="w-9 h-9 flex items-center justify-center bg-transparent shrink-0 cursor-pointer transition-opacity duration-150 group-hover:opacity-0 select-none"
              >
                <HeartHandshake className="w-5 h-5 text-[#18191B] dark:text-white" aria-hidden="true" />
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
                <div className="w-8 h-8 flex items-center justify-center bg-transparent shrink-0">
                  <HeartHandshake className="w-5 h-5 text-[#18191B] dark:text-white" />
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
                className="w-10 h-10 rounded-xl bg-white dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] hover:border-[#4F648C] dark:hover:border-[#91A7D0] text-[#4F648C] dark:text-[#91A7D0] flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C]"
              >
                <Plus className="w-5 h-5" />
              </button>
            </Tooltip>
          ) : (
            <Button
              onClick={handleNewChatAction}
              variant="outline"
              className="w-full justify-start gap-2 bg-white dark:bg-[#18191C] border-[#E2E2DC] dark:border-[#1F2024] hover:border-[#4F648C] dark:hover:border-[#91A7D0] text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#4F648C] dark:text-[#91A7D0]" />
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
                const isMenuOpen = menuSession?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#18191C] font-medium text-[#4F648C] dark:text-[#91A7D0] shadow-xs'
                        : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#EAEAE5] dark:hover:bg-[#18191C]'
                    }`}
                    onClick={() => {
                      if (onSelectSession) onSelectSession(s.id);
                    }}
                  >
                    <span className="truncate flex-1 min-w-0 pr-1.5">{s.title}</span>

                    <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleToggleMenu(s, e.currentTarget);
                        }}
                        aria-label={`Options for "${s.title}"`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0] ${
                          isMenuOpen
                            ? 'opacity-100 bg-[#E2E2DC] dark:bg-[#222327] text-[#18191B] dark:text-[#F3F4F6]'
                            : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6] hover:bg-[#E2E2DC] dark:hover:bg-[#222327]'
                        }`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                <div className="w-8 h-8 flex items-center justify-center bg-transparent shrink-0">
                  <HeartHandshake className="w-5 h-5 text-[#18191B] dark:text-white" />
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
                className="w-full justify-start gap-2 bg-white dark:bg-[#18191C] border-[#E2E2DC] dark:border-[#1F2024] hover:border-[#4F648C] dark:hover:border-[#91A7D0] text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4 text-[#4F648C] dark:text-[#91A7D0]" />
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
                  const isMenuOpen = menuSession?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`group relative flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white dark:bg-[#18191C] font-medium text-[#4F648C] dark:text-[#91A7D0] shadow-xs'
                          : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#EAEAE5] dark:hover:bg-[#18191C]'
                      }`}
                      onClick={() => {
                        if (onSelectSession) onSelectSession(s.id);
                        setMobileDrawerOpen(false);
                      }}
                    >
                      <span className="truncate flex-1 min-w-0 pr-1.5">{s.title}</span>

                      <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleToggleMenu(s, e.currentTarget);
                          }}
                          aria-label={`Options for "${s.title}"`}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer opacity-100 text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6] hover:bg-[#E2E2DC] dark:hover:bg-[#222327] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0]"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

      {/* 4. Conversation Actions 3-dot Menu (Portal) */}
      {mounted && menuSession && menuCoords && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Options for ${menuSession.title}`}
          className="fixed z-[120] w-[190px] rounded-xl bg-white/95 dark:bg-[#0D0E11]/95 backdrop-blur-xl border border-[#E2E2DC] dark:border-[#1F2024] shadow-2xl p-1 text-[#18191B] dark:text-[#F3F4F6] animate-in fade-in-0 zoom-in-95 duration-100 select-none flex flex-col space-y-0.5"
          style={{ left: `${menuCoords.left}px`, top: `${menuCoords.top}px` }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleMenuKeyDown}
        >
          {/* Rename Action */}
          <button
            ref={(el) => { menuItemsRef.current[0] = el; }}
            type="button"
            role="menuitem"
            onClick={() => handleOpenRename(menuSession)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#18191B] dark:text-[#F3F4F6] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] focus-visible:bg-[#F4F4F1] dark:focus-visible:bg-[#18191C] focus-visible:outline-none transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-[#4F648C] dark:text-[#91A7D0] shrink-0" />
            <span>Rename</span>
          </button>

          {/* Share Action (Disabled with accessible explanation) */}
          <button
            ref={(el) => { menuItemsRef.current[1] = el; }}
            type="button"
            role="menuitem"
            disabled
            aria-disabled="true"
            title="Private conversations cannot be shared to protect student privacy"
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[#71757E] opacity-50 cursor-not-allowed select-none"
          >
            <div className="flex items-center gap-2.5">
              <Share2 className="w-3.5 h-3.5 text-[#71757E] shrink-0" />
              <span>Share</span>
            </div>
            <span className="text-[10px] text-[#71757E] bg-[#EAEAE5] dark:bg-[#1F2024] px-1.5 py-0.5 rounded font-normal">
              Private
            </span>
          </button>

          {/* Divider */}
          <div className="border-t border-[#E2E2DC]/70 dark:border-[#1F2024]/70 my-0.5" />

          {/* Delete Action */}
          <button
            ref={(el) => { menuItemsRef.current[2] = el; }}
            type="button"
            role="menuitem"
            onClick={() => handleOpenDelete(menuSession)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus-visible:bg-red-50 dark:focus-visible:bg-red-950/30 focus-visible:outline-none transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}

      {/* 5. Rename Dialog */}
      <Dialog
        isOpen={!!renameModalSession}
        onClose={() => {
          if (!isRenaming) setRenameModalSession(null);
        }}
        title="Rename Conversation"
        description="Enter a new title for this conversation."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmRename();
          }}
          className="space-y-4 pt-1"
        >
          <div>
            <label
              htmlFor="rename-session-title"
              className="block text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6] mb-1.5"
            >
              Title
            </label>
            <input
              id="rename-session-title"
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              placeholder="Conversation title"
              autoFocus
              maxLength={100}
              disabled={isRenaming}
              className="w-full px-3 py-2 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#2C2D32] text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] placeholder-[#71757E] focus:outline-none focus:ring-2 focus:ring-[#4F648C] dark:focus:ring-[#91A7D0] transition-colors"
            />
            {renameTitle.trim().length === 0 && (
              <p className="text-[11px] text-red-500 mt-1">Title cannot be empty.</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isRenaming}
              onClick={() => setRenameModalSession(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!renameTitle.trim() || isRenaming}
              isLoading={isRenaming}
            >
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 6. Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteModalSession}
        onClose={() => {
          if (!isDeleting) setDeleteModalSession(null);
        }}
        title="Delete Conversation"
        description={`Are you sure you want to delete "${deleteModalSession?.title}"? This conversation will be permanently removed.`}
      >
        <div className="space-y-4 pt-1">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-xs text-red-700 dark:text-red-300">
            This action cannot be undone. All messages within this conversation will be permanently removed.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeleteModalSession(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeleting}
              isLoading={isDeleting}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 7. Main Content Area */}
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
            <HeartHandshake className="w-4 h-4 text-[#18191B] dark:text-white" />
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
