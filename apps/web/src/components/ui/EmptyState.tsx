import React from 'react';
import Link from 'next/link';
import { LucideIcon, FolderOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const resolvedAction = action || (actionLabel ? { label: actionLabel, onClick: onAction } : undefined);

  return (
    <div
      className={`rounded-2xl border border-dashed border-[#E2E2DC] dark:border-[#2C3038] bg-white/60 dark:bg-[#17191E]/60 p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#F4F4F1] dark:bg-[#1F2228] text-[#71757E] flex items-center justify-center">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="font-semibold text-sm sm:text-base text-[#18191B] dark:text-[#F3F4F6]">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-[#71757E] leading-relaxed">
          {description}
        </p>
      </div>
      {resolvedAction && (
        <div className="pt-2">
          {resolvedAction.href ? (
            <Link href={resolvedAction.href}>
              <Button variant="outline" size="sm" className="text-xs">
                {resolvedAction.label}
              </Button>
            </Link>
          ) : (
            <Button
              onClick={resolvedAction.onClick}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {resolvedAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
