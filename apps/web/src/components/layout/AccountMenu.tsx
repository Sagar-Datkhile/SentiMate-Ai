'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  User,
  MessageSquare,
  Compass,
  Calendar,
  LifeBuoy,
  HeartHandshake,
  Settings,
  LogOut,
  Sun,
  Moon,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../theme-provider';
import { toast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { AvatarBubble } from './AvatarBubble';
import { clearStudentCache } from './StudentContext';

export interface UserProfileData {
  displayName: string;
  email?: string;
  username?: string;
  role?: string;
  avatarUrl?: string;
}

interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  userProfile: UserProfileData;
  isCollapsed?: boolean;
}

export function AccountMenu({
  isOpen,
  onClose,
  triggerRef,
  userProfile,
  isCollapsed = false,
}: AccountMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; width?: number }>({ left: 0 });
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine positioning relative to trigger and viewport bounds
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const menuWidth = 272;
    const estimatedHeight = 420;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Anchor horizontally to trigger left, clamped to viewport bounds
    let left = triggerRect.left;
    if (left + menuWidth > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - menuWidth - margin);
    }
    if (left < margin) {
      left = margin;
    }

    // Anchor vertically above the trigger (or below if not enough room above)
    let bottom: number | undefined = viewportHeight - triggerRect.top + margin;
    let top: number | undefined = undefined;

    // If clipping at the top of the viewport when placed above:
    if (triggerRect.top - margin < estimatedHeight && triggerRect.bottom + estimatedHeight + margin <= viewportHeight) {
      bottom = undefined;
      top = triggerRect.bottom + margin;
    }

    setCoords({ left, bottom, top });
  }, [triggerRef]);

  // Determine viewport position when opened and keep stationary until closed.
  // Recalculate only when reopened and on viewport resize to prevent clipping.
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleResize = () => {
        updatePosition();
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Keyboard navigation & Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      const activeElements = itemRefs.current.filter(Boolean) as (HTMLAnchorElement | HTMLButtonElement)[];
      if (activeElements.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = (prev + 1) % activeElements.length;
          activeElements[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev <= 0 ? activeElements.length - 1 : prev - 1;
          activeElements[next]?.focus();
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
        activeElements[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(activeElements.length - 1);
        activeElements[activeElements.length - 1]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, triggerRef]);

  // Sign out handler
  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      toast.clear();
      clearStudentCache();
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      onClose();
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      console.error('[AccountMenu] Sign out failed:', err);
      setIsSigningOut(false);
      toast.error('Sign out failed.', {
        description: 'Unable to complete sign out. Please check your connection and try again.',
      });
    }
  };

  if (!mounted || !isOpen) return null;

  // Ordered navigation items
  const navItems = [
    { href: '/student/profile', label: 'My Profile', icon: User },
    { href: '/student/chat', label: 'Conversations', icon: MessageSquare },
    { href: '/student/checkins', label: 'Wellbeing', icon: Compass },
    { href: '/student/appointments', label: 'Appointments', icon: Calendar },
    { href: '/resources', label: 'Resources', icon: LifeBuoy },
    { href: '/student/referrals', label: 'Human Support Referral', icon: HeartHandshake },
  ];

  // Helper to register ref
  itemRefs.current = [];
  const setItemRef = (el: HTMLAnchorElement | HTMLButtonElement | null) => {
    if (el && !itemRefs.current.includes(el)) {
      itemRefs.current.push(el);
    }
  };

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Account and navigation menu"
      className="fixed z-[110] w-[272px] max-w-[calc(100vw-24px)] rounded-2xl bg-white/95 dark:bg-[#0D0E11]/95 backdrop-blur-xl border border-[#E2E2DC] dark:border-[#1F2024] shadow-2xl p-1.5 text-[#18191B] dark:text-[#F3F4F6] animate-in fade-in-0 zoom-in-95 duration-150 select-none overflow-hidden flex flex-col"
      style={{
        left: `${coords.left}px`,
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        top: coords.top !== undefined ? `${coords.top}px` : undefined,
        maxHeight: 'min(500px, calc(100vh - 32px))',
      }}
    >
      {/* 1. Compact Account Identity Header */}
      <div className="p-3 border-b border-[#E2E2DC]/70 dark:border-[#1F2024]/70 flex items-center gap-3">
        <AvatarBubble
          avatarUrl={userProfile.avatarUrl}
          displayName={userProfile.displayName}
          size={9}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs text-[#18191B] dark:text-[#F3F4F6] truncate leading-tight">
            {userProfile.displayName || 'Student Account'}
          </div>
          <div className="text-[11px] text-[#71757E] truncate mt-0.5">
            {userProfile.username ? `@${userProfile.username}` : ''}
          </div>
        </div>
      </div>

      {/* Scrollable Items Container */}
      <div className="overflow-y-auto py-1 space-y-0.5 flex-1 pr-0.5">
        {/* 2. Navigation Entries */}
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={setItemRef}
              role="menuitem"
              onClick={() => onClose()}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0] ${
                isActive
                  ? 'bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#91A7D0] font-semibold'
                  : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#4F648C] dark:text-[#91A7D0]' : 'text-[#71757E]'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#4F648C] dark:bg-[#91A7D0]" aria-hidden="true" />
              )}
            </Link>
          );
        })}

        {/* 3. Settings & Theme Selection */}
        <div className="pt-1">
          <button
            type="button"
            ref={setItemRef}
            role="menuitem"
            aria-expanded={settingsExpanded}
            onClick={() => setSettingsExpanded(!settingsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] hover:text-[#18191B] dark:hover:text-[#F3F4F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0]"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-[#71757E]" />
              <span>Settings & Appearance</span>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 text-[#71757E] transition-transform duration-200 ${
                settingsExpanded ? 'rotate-90' : ''
              }`}
            />
          </button>

          {/* Inline Theme Preferences */}
          {settingsExpanded && (
            <div className="ml-4 pl-3 border-l border-[#E2E2DC] dark:border-[#1F2024] my-1 space-y-1 animate-in fade-in-0 duration-150">
              <div className="text-[10px] uppercase font-semibold text-[#71757E] tracking-wider px-2 py-0.5">
                Theme
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F4F1] dark:bg-[#18191C] rounded-xl">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                    theme === 'light'
                      ? 'bg-white dark:bg-[#222327] text-[#4F648C] dark:text-[#91A7D0] shadow-xs font-semibold'
                      : 'text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
                  }`}
                  aria-label="Light theme"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-white dark:bg-[#222327] text-[#4F648C] dark:text-[#91A7D0] shadow-xs font-semibold'
                      : 'text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
                  }`}
                  aria-label="Dark theme"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Divider & Log out */}
      <div className="pt-1 mt-1 border-t border-[#E2E2DC]/70 dark:border-[#1F2024]/70">
        <button
          type="button"
          ref={setItemRef}
          role="menuitem"
          disabled={isSigningOut}
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 cursor-pointer"
        >
          {isSigningOut ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          ) : (
            <LogOut className="w-4 h-4 text-rose-500" />
          )}
          <span>{isSigningOut ? 'Signing out...' : 'Log out'}</span>
        </button>
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}
