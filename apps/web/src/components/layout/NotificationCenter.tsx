'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  Brush as BrushCleaning,
  Check,
  CheckCheck,
  Calendar,
  HeartHandshake,
  LifeBuoy,
  Megaphone,
  Sparkles,
  Info,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { createClient } from '@/lib/supabase/client';
import type { NotificationItem, NotificationCategory, NotificationListResponse } from '@sentimate/contracts';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function CategoryIcon({ category }: { category: NotificationCategory }) {
  switch (category) {
    case 'appointment':
      return <Calendar className="w-4 h-4 text-[#2C67C5] dark:text-[#5B8DEF]" />;
    case 'counsellor':
      return <HeartHandshake className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />;
    case 'support':
      return <LifeBuoy className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />;
    case 'announcement':
      return <Megaphone className="w-4 h-4 text-[#8B5CF6] dark:text-[#A78BFA]" />;
    case 'system':
    default:
      return <Sparkles className="w-4 h-4 text-[#71757E] dark:text-[#9CA3AF]" />;
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [snapshotTime, setSnapshotTime] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Fetch initial notifications or refresh
  const fetchNotifications = useCallback(
    async (targetPage = 1, append = false, forcedSnapshot?: string) => {
      try {
        if (targetPage === 1 && !append) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setHasError(false);

        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        params.set('limit', '15');
        if (forcedSnapshot || snapshotTime) {
          params.set('snapshotTime', forcedSnapshot || snapshotTime!);
        }

        const res = await fetch(`/api/student/notifications?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load notifications');

        const data: NotificationListResponse = await res.json();

        setUnreadCount(data.unreadCount);
        setHasMore(data.hasMore);
        setPage(data.page);
        if (!snapshotTime || !forcedSnapshot) {
          setSnapshotTime(data.snapshotTime);
        }

        if (append) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newItems = data.notifications.filter((n) => !existingIds.has(n.id));
            return [...prev, ...newItems];
          });
        } else {
          setNotifications(data.notifications);
        }
      } catch (err) {
        console.warn('[NotificationCenter] fetch error:', err);
        setHasError(true);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [snapshotTime]
  );

  // Initial load
  useEffect(() => {
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  // Supabase Realtime subscription for incoming notifications
  useEffect(() => {
    let supabase: any = null;
    let channel: any = null;

    try {
      supabase = createClient();
      if (supabase?.channel) {
        channel = supabase
          .channel('student-in-app-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
            },
            (payload: any) => {
              if (payload?.new) {
                const newRow = payload.new;
                // Only consider if not dismissed
                if (!newRow.dismissed_at) {
                  const mapped: NotificationItem = {
                    id: newRow.id,
                    userId: newRow.user_id,
                    title: newRow.title,
                    preview: newRow.message || newRow.preview || '',
                    category: (['support', 'appointment', 'counsellor', 'announcement', 'system'].includes(newRow.category)
                      ? newRow.category
                      : 'system') as NotificationCategory,
                    actionUrl: newRow.action_url || null,
                    isRead: Boolean(newRow.is_read),
                    readAt: newRow.read_at || null,
                    dismissedAt: newRow.dismissed_at || null,
                    sourceReference: newRow.source_reference || null,
                    eventId: newRow.event_id || null,
                    createdAt: newRow.created_at || new Date().toISOString(),
                    metadata: newRow.metadata || {},
                  };

                  setNotifications((prev) => [mapped, ...prev.filter((n) => n.id !== mapped.id)]);
                  setUnreadCount((c) => c + 1);
                }
              }
            }
          )
          .subscribe();
      }
    } catch {
      // Realtime fallback to window focus refresh
    }

    // Window focus refresh (restrained)
    const handleFocus = () => {
      fetchNotifications(1, false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (supabase && channel) {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [fetchNotifications]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (item: NotificationItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (item.isRead) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/student/notifications/${item.id}/read`, {
        method: 'PATCH',
      });
    } catch (err) {
      console.warn('[NotificationCenter] mark read failed:', err);
    }
  };

  // Mark all notifications as read up to snapshot boundary
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    const currentSnapshot = snapshotTime || new Date().toISOString();

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        new Date(n.createdAt).getTime() <= new Date(currentSnapshot).getTime()
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      )
    );
    setUnreadCount(0);

    try {
      await fetch('/api/student/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotTime: currentSnapshot }),
      });
    } catch (err) {
      console.warn('[NotificationCenter] mark all read failed:', err);
      // Re-sync on failure
      fetchNotifications(1, false);
    }
  };

  // Clear all notifications (soft dismissal)
  const handleClearAll = async () => {
    if (notifications.length === 0) return;

    const currentSnapshot = snapshotTime || new Date().toISOString();

    // Optimistic update
    setNotifications((prev) =>
      prev.filter((n) => new Date(n.createdAt).getTime() > new Date(currentSnapshot).getTime())
    );
    setUnreadCount(0);

    try {
      await fetch('/api/student/notifications/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotTime: currentSnapshot }),
      });
    } catch (err) {
      console.warn('[NotificationCenter] clear all failed:', err);
      // Re-sync on failure
      fetchNotifications(1, false);
    }
  };

  // Navigate to notification destination
  const handleItemClick = (item: NotificationItem) => {
    handleMarkAsRead(item);
    if (item.actionUrl) {
      setIsOpen(false);
      router.push(item.actionUrl);
    }
  };

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;
  const accessibleLabel =
    unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications (no unread)';

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id="student-notification-bell"
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            // Refresh up-to-date snapshot on open
            fetchNotifications(1, false, new Date().toISOString());
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={accessibleLabel}
        className={`relative p-2 rounded-xl text-[#4A4D54] dark:text-[#9CA3AF] hover:text-[#18191B] dark:hover:text-[#F3F4F6] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C67C5] transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
          isOpen ? 'bg-[#F4F4F1] dark:bg-[#18191C] text-[#18191B] dark:text-[#F3F4F6]' : ''
        }`}
      >
        <Bell className="w-5 h-5 transition-transform motion-reduce:transition-none" />

        {/* Unread badge capped visually at 99+ */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2C67C5] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm pointer-events-none ring-2 ring-white dark:ring-[#0D0E11] transition-transform motion-reduce:transition-none"
            aria-hidden="true"
          >
            {displayCount}
          </span>
        )}
      </button>

      {/* Floating Notification Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="region"
          aria-label="Notification center"
          className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[400px] max-h-[min(560px,calc(100vh-80px))] flex flex-col rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] shadow-2xl z-50 overflow-hidden transition-all duration-200 motion-reduce:transition-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E2DC] dark:border-[#1F2024] shrink-0 bg-white/80 dark:bg-[#0D0E11]/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#18191B] dark:text-[#F3F4F6] tracking-tight">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#2C67C5]/10 text-[#2C67C5] dark:text-[#5B8DEF] border border-[#2C67C5]/20">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-1 text-xs font-medium text-[#2C67C5] dark:text-[#5B8DEF] hover:bg-[#EEF2F8] dark:hover:bg-[#2C67C5]/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              {/* Clear all notifications button (BrushCleaning icon) */}
              <Tooltip content="Clear all notifications" side="bottom">
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                  aria-label="Clear all notifications"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                    notifications.length === 0
                      ? 'text-[#A0A4AB] dark:text-[#555861] cursor-not-allowed opacity-50'
                      : 'text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C]'
                  }`}
                >
                  <BrushCleaning className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Body: Scrollable list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E2DC]/50 dark:divide-[#1F2024]/50 min-h-0">
            {isLoading ? (
              // Loading Skeletons
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[#E2E2DC] dark:bg-[#1F2024] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-[#E2E2DC] dark:bg-[#1F2024] rounded w-3/4" />
                      <div className="h-2.5 bg-[#E2E2DC] dark:bg-[#1F2024] rounded w-full" />
                      <div className="h-2 bg-[#E2E2DC] dark:bg-[#1F2024] rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : hasError ? (
              // Error State with Retry
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                    Unable to load notifications
                  </p>
                  <p className="text-[11px] text-[#71757E]">
                    Please check your network connection and try again.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchNotifications(1, false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#2C67C5] text-white hover:bg-[#2557a7] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              // Empty State
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#EEF2F8] dark:bg-[#1F2024] text-[#2C67C5] dark:text-[#5B8DEF] flex items-center justify-center mx-auto">
                  <BellOff className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#18191B] dark:text-[#F3F4F6]">
                    You’re all caught up
                  </p>
                  <p className="text-xs text-[#71757E]">
                    No new notifications right now.
                  </p>
                </div>
              </div>
            ) : (
              // Notifications list
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item);
                    }
                  }}
                  className={`group w-full text-left p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer relative ${
                    item.isRead
                      ? 'bg-transparent hover:bg-[#F4F4F1] dark:hover:bg-[#141518]'
                      : 'bg-[#F4F8FD] dark:bg-[#131926]/40 hover:bg-[#EBF2FB] dark:hover:bg-[#1A2234]/60'
                  }`}
                >
                  {/* Category icon badge */}
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#2C2D32] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <CategoryIcon category={item.category} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6] truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#8C9099] dark:text-[#71757E] shrink-0">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-[#555861] dark:text-[#A0A4AB] line-clamp-2 leading-relaxed">
                      {item.preview}
                    </p>

                    {item.actionUrl && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#2C67C5] dark:text-[#5B8DEF]">
                        <span>View details</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Unread indicator / mark read action */}
                  <div className="flex flex-col items-center justify-start shrink-0 pt-1">
                    {!item.isRead ? (
                      <Tooltip content="Mark as read" side="left">
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item, e)}
                          className="w-2.5 h-2.5 rounded-full bg-[#2C67C5] ring-4 ring-[#2C67C5]/15 hover:ring-[#2C67C5]/30 transition-all cursor-pointer"
                          aria-label="Mark notification as read"
                        />
                      </Tooltip>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Load more / Pagination button */}
            {hasMore && !isLoading && (
              <div className="p-3 text-center bg-[#FAFAFA] dark:bg-[#111215]">
                <button
                  type="button"
                  onClick={() => fetchNotifications(page + 1, true)}
                  disabled={isLoadingMore}
                  className="text-xs font-medium text-[#2C67C5] dark:text-[#5B8DEF] hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingMore ? 'Loading older...' : 'Load older notifications'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
