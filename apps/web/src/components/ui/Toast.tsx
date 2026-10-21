'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  description?: React.ReactNode;
  duration?: number;
  persistent?: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: React.ReactNode;
  duration: number;
  persistent: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
  createdAt: number;
  isExiting?: boolean;
}

// Internal listener type
type Listener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private queue: ToastItem[] = [];
  private listeners: Set<Listener> = new Set();
  private maxVisible = 3;
  private maxQueue = 10;
  private exitTimers = new Map<string, NodeJS.Timeout>();

  private emit() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public add(title: string, options: ToastOptions & { variant?: ToastVariant } = {}): string {
    const variant = options.variant || 'info';
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Default durations: success ~4000ms, info ~5000ms, warning ~6000ms, error persistent by default unless explicit duration provided
    let defaultDuration = 4000;
    let isPersistent = options.persistent ?? false;

    if (variant === 'info') {
      defaultDuration = 5000;
    } else if (variant === 'warning') {
      defaultDuration = 6000;
    } else if (variant === 'loading') {
      isPersistent = true;
      defaultDuration = Infinity;
    } else if (variant === 'error') {
      // Errors requiring action stay until dismissed or resolved, unless an explicit duration was specified
      if (options.duration !== undefined) {
        defaultDuration = options.duration;
      } else {
        isPersistent = true;
        defaultDuration = Infinity;
      }
    }

    const duration = options.duration !== undefined ? options.duration : defaultDuration;

    const newItem: ToastItem = {
      id,
      variant,
      title,
      description: options.description,
      duration,
      persistent: isPersistent,
      action: options.action,
      onDismiss: options.onDismiss,
      createdAt: Date.now(),
      isExiting: false,
    };

    // If any exit animation timer was pending for this ID, clear it
    if (this.exitTimers.has(id)) {
      clearTimeout(this.exitTimers.get(id)!);
      this.exitTimers.delete(id);
    }

    // 1. Check if toast with same ID is already visible: update in place!
    const existingIndex = this.toasts.findIndex((t) => t.id === id);
    if (existingIndex !== -1) {
      this.toasts[existingIndex] = newItem;
      this.emit();
      return id;
    }

    // 2. Check if toast with same ID is in pending queue: update in queue
    const queueIndex = this.queue.findIndex((t) => t.id === id);
    if (queueIndex !== -1) {
      this.queue[queueIndex] = newItem;
      return id;
    }

    // 3. If room in visible list, display immediately
    if (this.toasts.length < this.maxVisible) {
      this.toasts.push(newItem);
      this.emit();
      return id;
    }

    // 4. Max visible reached (3 visible):
    // Check if we can gracefully evict the oldest non-persistent visible toast to make room
    const oldestNonPersistentIdx = this.toasts.findIndex((t) => !t.persistent && !t.isExiting);
    if (oldestNonPersistentIdx !== -1) {
      // Dismiss oldest
      const toEvict = this.toasts[oldestNonPersistentIdx];
      this.dismiss(toEvict.id);
      // Put new item into queue so it displays right after eviction
      if (this.queue.length < this.maxQueue) {
        this.queue.push(newItem);
      }
      return id;
    }

    // Otherwise, enqueue bounded
    if (this.queue.length < this.maxQueue) {
      this.queue.push(newItem);
    }
    return id;
  }

  public dismiss(id?: string): void {
    if (!id) {
      // Dismiss all visible
      this.toasts.forEach((t) => this.dismiss(t.id));
      this.queue = [];
      return;
    }

    // Remove from queue if present
    this.queue = this.queue.filter((q) => q.id !== id);

    const index = this.toasts.findIndex((t) => t.id === id);
    if (index === -1) return;

    const item = this.toasts[index];
    if (item.isExiting) return;

    // Call onDismiss callback
    try {
      item.onDismiss?.();
    } catch (e) {
      console.error('Error in toast onDismiss callback:', e);
    }

    // Mark as exiting for smooth animation
    this.toasts[index] = { ...item, isExiting: true };
    this.emit();

    // After animation (180ms matches .animate-toast-exit), remove from visible array
    const timer = setTimeout(() => {
      this.exitTimers.delete(id);
      this.toasts = this.toasts.filter((t) => t.id !== id);

      // Promote next item from queue if available
      if (this.queue.length > 0 && this.toasts.length < this.maxVisible) {
        const nextItem = this.queue.shift();
        if (nextItem) {
          this.toasts.push(nextItem);
        }
      }

      this.emit();
    }, 180);

    this.exitTimers.set(id, timer);
  }

  public clear(): void {
    // Clear everything immediately without waiting for animations (used on logout/account switch)
    this.exitTimers.forEach((timer) => clearTimeout(timer));
    this.exitTimers.clear();
    this.toasts = [];
    this.queue = [];
    this.emit();
  }
}

// Global singleton instance
export const toastManager = new ToastManager();

// Imperative API
export const toast = {
  success: (title: string, options?: ToastOptions) =>
    toastManager.add(title, { ...options, variant: 'success' }),
  error: (title: string, options?: ToastOptions) =>
    toastManager.add(title, { ...options, variant: 'error' }),
  warning: (title: string, options?: ToastOptions) =>
    toastManager.add(title, { ...options, variant: 'warning' }),
  info: (title: string, options?: ToastOptions) =>
    toastManager.add(title, { ...options, variant: 'info' }),
  loading: (title: string, options?: ToastOptions) =>
    toastManager.add(title, { ...options, variant: 'loading' }),
  dismiss: (id?: string) => toastManager.dismiss(id),
  clear: () => toastManager.clear(),
  promise: async <T,>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
    options?: ToastOptions
  ): Promise<T> => {
    const id = options?.id || `promise-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    toastManager.add(msgs.loading, { ...options, id, variant: 'loading' });

    try {
      const data = await promise;
      const successTitle = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
      toastManager.add(successTitle, { ...options, id, variant: 'success', persistent: false });
      return data;
    } catch (err) {
      const errorTitle = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
      toastManager.add(errorTitle, { ...options, id, variant: 'error' });
      throw err;
    }
  },
};

// React Context for optional hook usage
const ToastContext = createContext(toast);

export const useToast = () => useContext(ToastContext);

// Individual Toast Card Component
function ToastCard({ item }: { item: ToastItem }) {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(item.duration);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset remaining time if duration updates dynamically (e.g. loading -> success)
  useEffect(() => {
    remainingTimeRef.current = item.duration;
  }, [item.duration]);

  // Setup auto-dismiss timer with pause capability
  useEffect(() => {
    if (item.persistent || item.duration === Infinity) {
      return;
    }

    if (isPaused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Calculate remaining time
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      return;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      toastManager.dismiss(item.id);
    }, remainingTimeRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [item.id, item.duration, item.persistent, isPaused]);

  // Variant Icon & Accents
  const renderIcon = () => {
    switch (item.variant) {
      case 'success':
        return (
          <div
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl"
            style={{
              backgroundColor: 'var(--toast-success-bg)',
              color: 'var(--toast-success-accent)',
            }}
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
          </div>
        );
      case 'error':
        return (
          <div
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl"
            style={{
              backgroundColor: 'var(--toast-error-bg)',
              color: 'var(--toast-error-accent)',
            }}
          >
            <AlertCircle className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
          </div>
        );
      case 'warning':
        return (
          <div
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl"
            style={{
              backgroundColor: 'var(--toast-warning-bg)',
              color: 'var(--toast-warning-accent)',
            }}
          >
            <AlertTriangle className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
          </div>
        );
      case 'loading':
        return (
          <div
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl"
            style={{
              backgroundColor: 'var(--toast-success-bg)',
              color: 'var(--toast-loading-accent)',
            }}
          >
            <Loader2 className="w-4 h-4 stroke-[2.2] animate-spin" aria-hidden="true" />
          </div>
        );
      case 'info':
      default:
        return (
          <div
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-xl"
            style={{
              backgroundColor: 'var(--toast-info-bg)',
              color: 'var(--toast-info-accent)',
            }}
          >
            <Info className="w-4 h-4 stroke-[2.2]" aria-hidden="true" />
          </div>
        );
    }
  };

  return (
    <div
      role="status"
      tabIndex={0}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={`pointer-events-auto toast-glass rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 transition-all duration-200 outline-none select-text ${
        item.isExiting ? 'animate-toast-exit' : 'animate-toast-enter'
      }`}
      style={{
        boxShadow: 'var(--toast-shadow)',
      }}
    >
      {/* Status Icon */}
      {renderIcon()}

      {/* Title & Description & Optional Action */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h4
          className="text-sm font-semibold tracking-tight leading-snug break-words"
          style={{ color: 'var(--toast-title)' }}
        >
          {item.title}
        </h4>
        {item.description && (
          <div
            className="text-xs mt-1 leading-relaxed break-words"
            style={{ color: 'var(--toast-desc)' }}
          >
            {item.description}
          </div>
        )}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              toastManager.dismiss(item.id);
            }}
            className="mt-2 text-xs font-medium px-2.5 py-1 rounded-lg bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#91A7D0] hover:bg-[#D5DFEE] dark:hover:bg-[#303E57] focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0] transition-colors"
          >
            {item.action.label}
          </button>
        )}
      </div>

      {/* Accessible Discreet Close Button */}
      <button
        type="button"
        onClick={() => toastManager.dismiss(item.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// Global Toast Container positioned top-right
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState<{
    text: string;
    assertive: boolean;
  } | null>(null);

  useEffect(() => {
    return toastManager.subscribe((items) => {
      setToasts(items);

      // Announce newly added items politely or assertively to screen readers
      const active = items.filter((i) => !i.isExiting);
      if (active.length > 0) {
        const latest = active[active.length - 1];
        if (latest.variant !== 'loading') {
          const descText = typeof latest.description === 'string' ? ` ${latest.description}` : '';
          setLatestAnnouncement({
            text: `${latest.variant}: ${latest.title}${descText}`,
            assertive: latest.variant === 'error',
          });
        }
      }
    });
  }, []);

  if (toasts.length === 0) {
    return (
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latestAnnouncement?.text}
      </div>
    );
  }

  return (
    <>
      {/* Screen Reader Live Region */}
      <div
        className="sr-only"
        aria-live={latestAnnouncement?.assertive ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {latestAnnouncement?.text}
      </div>

      {/* Fixed Top-Right Viewport Container */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed top-4 right-3 left-3 sm:left-auto sm:right-5 sm:top-5 z-[100] flex flex-col gap-2.5 pointer-events-none sm:w-[380px] max-w-[420px] transition-all"
        style={{
          marginTop: 'env(safe-area-inset-top, 0px)',
          marginRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}

// Global Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}
