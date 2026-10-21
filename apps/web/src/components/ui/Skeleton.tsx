import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rounded' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

/**
 * Base accessible Skeleton primitive.
 * Always sets aria-hidden="true" to avoid screen-reader chatter on decorative shapes.
 * Uses semantic theme tokens (--skeleton-base, --skeleton-highlight) and respects prefers-reduced-motion.
 */
export function Skeleton({
  variant = 'rounded',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full shrink-0',
    rounded: 'rounded-lg',
    rectangular: 'rounded-none',
  }[variant];

  const inlineStyles: React.CSSProperties = {
    width,
    height,
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer select-none ${variantStyles} ${className}`}
      style={inlineStyles}
      {...props}
    />
  );
}

/**
 * Accessible wrapper for regions with asynchronous loading states.
 * Sets aria-busy="true" on the container and renders an accessible screen-reader announcement.
 */
export function LoadingRegion({
  children,
  isLoading,
  announcement = 'Loading content...',
  className = '',
}: {
  children: React.ReactNode;
  isLoading: boolean;
  announcement?: string;
  className?: string;
}) {
  return (
    <div
      aria-busy={isLoading}
      className={`relative ${className}`}
    >
      {isLoading && (
        <span className="sr-only" role="status" aria-live="polite">
          {announcement}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * Skeleton matching Stat Metric Cards (Dashboard & Telemetry)
 */
export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16 my-1" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  );
}

/**
 * Neutral Chart Skeleton Placeholder.
 * Replaces fabricated curves and fake risk scores with a restrained, neutral visual frame.
 */
export function NeutralChartSkeleton({ height = '180px' }: { height?: string }) {
  return (
    <div
      aria-hidden="true"
      className="w-full rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] p-4 flex flex-col justify-between"
      style={{ height }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Neutral grid silhouette */}
      <div className="flex items-end justify-between gap-3 h-28 pt-4 px-2">
        <Skeleton className="w-full h-14" />
        <Skeleton className="w-full h-20" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-24" />
        <Skeleton className="w-full h-16" />
        <Skeleton className="w-full h-22" />
      </div>
      <div className="flex justify-between pt-2">
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2 w-12" />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Student Profile Page (Avatar, Details, 8 Semesters, Bio)
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] flex flex-col sm:flex-row items-center gap-5">
        <Skeleton variant="circular" className="w-20 h-20" />
        <div className="space-y-2 text-center sm:text-left flex-1">
          <Skeleton className="h-6 w-48 mx-auto sm:mx-0" />
          <Skeleton className="h-4 w-36 mx-auto sm:mx-0" />
          <Skeleton className="h-3 w-56 mx-auto sm:mx-0" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Form Fields Grid */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] space-y-5">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* 8-Semester Grid Skeleton */}
        <div className="pt-4 border-t border-[#E2E2DC] dark:border-[#1F2024] space-y-3">
          <Skeleton className="h-4 w-44" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <div key={sem} className="p-3 rounded-lg border border-[#E2E2DC] dark:border-[#1F2024] space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Bio Textarea Skeleton */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Review Queue Item (Counsellor Dashboard)
 */
export function QueueItemSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E2DC]/60 dark:border-[#1F2024]/60 pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Model explanation container */}
      <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] space-y-2.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Assigned Student Directory Card
 */
export function StudentCardSkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-3 w-48" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Case Item (Counsellor Longitudinal Cases)
 */
export function CaseCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E2DC]/60 dark:border-[#1F2024]/60 pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="pt-2 flex justify-end gap-2">
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Appointment and Slot Cards
 */
export function AppointmentCardSkeleton() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

/**
 * Skeleton for Conversation History item in Sidebar
 */
export function ChatHistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1.5 py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg px-2.5 py-2 flex items-center justify-between bg-white/40 dark:bg-[#18191C]/40"
        >
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Chat Messages
 */
export function ChatMessageSkeleton() {
  return (
    <div className="space-y-4 py-2">
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" className="w-7 h-7" />
        <div className="space-y-2 max-w-md w-full">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Check-in History Cards
 */
export function CheckinCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

/**
 * Skeleton for Table Rows (Audit logs, Data Requests)
 */
export function TableRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="p-3.5 rounded-xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32 hidden md:block" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Resource Directory Cards
 */
export function ResourceCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] flex flex-col justify-between gap-4">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="pt-2 flex items-center justify-between border-t border-[#E2E2DC]/60 dark:border-[#1F2024]/60">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
