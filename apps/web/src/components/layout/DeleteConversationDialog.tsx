'use client';

import React, { useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';

export interface DeleteConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  isDeleting: boolean;
  error?: string | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function DeleteConversationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  isDeleting,
  error,
  triggerRef,
}: DeleteConversationDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  // Manage body scroll and initial focus
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus Cancel button initially as requested
    const timer = requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(timer);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Restore focus to trigger element on close
  useEffect(() => {
    if (!isOpen && triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [isOpen, triggerRef]);

  // Trap focus & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key handler
      if (e.key === 'Escape') {
        if (!isDeleting) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      // Tab focus trap
      if (e.key === 'Tab') {
        const focusableElements = [
          closeButtonRef.current,
          cancelButtonRef.current,
          deleteButtonRef.current,
        ].filter(Boolean) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      onClick={handleBackdropClick}
    >
      {/* Subtle Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-[2px] transition-opacity duration-150 motion-reduce:transition-none"
        aria-hidden="true"
      />

      {/* Dialog Panel: 440px desktop, calc(100% - 32px) mobile, 24px (p-6) padding, 16px corner radius */}
      <div
        ref={panelRef}
        className="relative z-10 w-[calc(100%-32px)] sm:w-[440px] max-w-[440px] rounded-[16px] bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] p-6 shadow-xl dark:shadow-2xl transition-all duration-150 ease-out motion-reduce:transition-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Row: Title and Close button aligned with centered icon */}
        <div className="flex items-center justify-between gap-3">
          <h2
            id="delete-dialog-title"
            className="text-[18px] font-semibold text-[#18191B] dark:text-[#F3F4F6] tracking-tight leading-snug"
          >
            Delete this conversation?
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#71757E] hover:text-[#18191B] dark:text-[#9CA3AF] dark:hover:text-[#F3F4F6] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description: 14px readable with comfortable line height and word wrap */}
        <p
          id="delete-dialog-description"
          className="text-[14px] leading-relaxed text-[#71757E] dark:text-[#9CA3AF] mt-2.5 break-words"
        >
          “<span className="font-medium text-[#18191B] dark:text-[#F3F4F6]">{title}</span>” will be permanently deleted. This cannot be undone.
        </p>

        {/* Error Callout if deletion fails */}
        {error && (
          <div
            role="alert"
            className="mt-3.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Actions Row: Bottom-right, 10px gap, equal 40px heights */}
        <div className="flex items-center justify-end gap-[10px] mt-6">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="h-10 min-h-[40px] px-4 rounded-xl text-sm font-medium bg-[#F4F4F1] hover:bg-[#EAEAE5] text-[#18191B] dark:bg-[#18191C] dark:hover:bg-[#222327] dark:text-[#F3F4F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71757E] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={deleteButtonRef}
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="h-10 min-h-[40px] px-4 rounded-xl text-sm font-medium bg-[#F4F4F1] hover:bg-[#EAEAE5] dark:bg-[#18191C] dark:hover:bg-[#222327] text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDeleting && (
              <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
