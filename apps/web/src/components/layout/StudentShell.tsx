'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageSquare,
  Plus,
  Compass,
  Calendar,
  LifeBuoy,
  User,
  LogOut,
  Menu,
  X,
  HeartHandshake,
  Shield,
  Trash2,
  Edit2,
  Check,
  MoreVertical,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { ChatHistorySkeleton, Skeleton } from '../ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

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
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState(studentName);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0];
          if (name) setDisplayName(name);
        }
      } catch {
        // Fall back to prop
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, [studentName]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[StudentShell] Sign out error:', err);
    } finally {
      router.push('/auth/login');
      router.refresh();
    }
  };

  const navLinks = [
    { href: '/student/chat', label: 'Conversations', icon: MessageSquare },
    { href: '/student/checkins', label: 'Wellbeing Check-ins', icon: Compass },
    { href: '/student/appointments', label: 'Appointments', icon: Calendar },
    { href: '/resources', label: 'Support Resources', icon: LifeBuoy },
    { href: '/student/profile', label: 'My Profile', icon: User },
  ];

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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F4F4F1] dark:bg-[#17191E] border-r border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] select-none">
      {/* Top Header / Branding */}
      <div className="p-4 flex items-center justify-between border-b border-[#E2E2DC] dark:border-[#2C3038]">
        <Link href="/student/chat" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0D766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0F1115] shadow-sm">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight">SentiMate</span>
            <span className="block text-[10px] text-[#71757E] uppercase font-medium">Student Space</span>
          </div>
        </Link>
        {mobileDrawerOpen && (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 rounded-lg text-[#71757E] hover:bg-[#EAEAE5] dark:hover:bg-[#1F2228] md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <Button
          onClick={() => {
            if (onNewSession) onNewSession();
            else router.push('/student/chat');
            setMobileDrawerOpen(false);
          }}
          variant="outline"
          className="w-full justify-start gap-2 bg-white dark:bg-[#1F2228] border-[#E2E2DC] dark:border-[#2C3038] hover:border-[#0D766E] dark:hover:border-[#14B8A6] text-xs font-semibold"
        >
          <Plus className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
          <span>New conversation</span>
        </Button>
      </div>

      {/* Conversation History List (if on chat route) */}
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
                className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-[#1F2228] font-medium text-[#0D766E] dark:text-[#2DD4BF] shadow-xs'
                    : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#EAEAE5] dark:hover:bg-[#1F2228]'
                }`}
                onClick={() => {
                  if (onSelectSession) onSelectSession(s.id);
                  setMobileDrawerOpen(false);
                }}
              >
                {editingSessionId === s.id ? (
                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(s.id)}
                      className="w-full px-1.5 py-0.5 rounded bg-white dark:bg-[#17191E] border border-[#0D766E] text-xs"
                      autoFocus
                    />
                    <button
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

      {/* Main Feature Nav Links */}
      <div className="border-t border-[#E2E2DC] dark:border-[#2C3038] p-3 space-y-1">
        {navLinks.map((link) => {
          const isCurrent = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileDrawerOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isCurrent
                  ? 'bg-white dark:bg-[#1F2228] text-[#0D766E] dark:text-[#2DD4BF] font-semibold shadow-xs'
                  : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#EAEAE5] dark:hover:bg-[#1F2228]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* Request Human Support Action */}
        <div className="pt-2">
          <Button
            onClick={() => setSupportModalOpen(true)}
            variant="primary"
            size="sm"
            className="w-full text-xs font-semibold gap-1.5 shadow-sm"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Request human support</span>
          </Button>
        </div>
      </div>

      {/* Account & Theme Footer */}
      <div className="p-3 border-t border-[#E2E2DC] dark:border-[#2C3038] flex items-center justify-between">
        {isLoadingUser ? (
          <div className="flex items-center gap-2 overflow-hidden flex-1" aria-hidden="true">
            <Skeleton variant="circular" className="w-7 h-7" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#0D766E] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium truncate">{displayName}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-[#71757E] hover:bg-[#EAEAE5] dark:hover:bg-[#1F2228] transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FBFBFA] dark:bg-[#0F1115] overflow-hidden">
      {/* Desktop Sidebar (Fixed width) */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Accessible Slide-over Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85%] h-full bg-[#F4F4F1] dark:bg-[#17191E] z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-[#E2E2DC] dark:border-[#2C3038] bg-white dark:bg-[#17191E] shrink-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
            <span className="font-semibold text-sm">SentiMate</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Content Body */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Quick Request Human Support Modal */}
      <Dialog
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        title="Request Human Support"
        description="Connect with a campus counsellor directly. Your request will be queued for counsellor review during operating hours."
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <p className="text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
            Would you like to schedule an appointment with your campus counsellor or submit a support referral?
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => {
                setSupportModalOpen(false);
                router.push('/student/appointments');
              }}
              variant="primary"
              className="w-full justify-center"
            >
              Book an Appointment Slot
            </Button>
            <Button
              onClick={() => {
                setSupportModalOpen(false);
                router.push('/student/referrals');
              }}
              variant="outline"
              className="w-full justify-center"
            >
              Submit Confidential Referral Note
            </Button>
          </div>
          <div className="p-3 bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] rounded-lg border border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-red-700 dark:text-red-400 text-xs">
            <strong>In immediate distress?</strong> Please call 988 or campus emergency services directly.
          </div>
        </div>
      </Dialog>
    </div>
  );
}
