'use client';

import React from 'react';
import { Tooltip } from '../ui/Tooltip';
import { Skeleton } from '../ui/Skeleton';
import { UserProfileData } from './AccountMenu';

interface AccountTriggerProps {
  userProfile: UserProfileData;
  isLoading?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export function AccountTrigger({
  userProfile,
  isLoading = false,
  isOpen,
  onToggle,
  isCollapsed = false,
  buttonRef,
}: AccountTriggerProps) {
  const initialLetter = (userProfile.displayName || 'S').charAt(0).toUpperCase();

  if (isLoading) {
    return isCollapsed ? (
      <div className="flex items-center justify-center p-2" aria-hidden="true">
        <Skeleton variant="circular" className="w-9 h-9" />
      </div>
    ) : (
      <div className="flex items-center gap-2.5 p-2 rounded-xl" aria-hidden="true">
        <Skeleton variant="circular" className="w-8 h-8" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    );
  }

  // Collapsed Mode Trigger: Icon-only Avatar button with Tooltip
  if (isCollapsed) {
    return (
      <Tooltip content={`Account: ${userProfile.displayName}`} side="right">
        <button
          ref={buttonRef}
          type="button"
          onClick={onToggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Account menu for ${userProfile.displayName}`}
          className={`w-9 h-9 rounded-full bg-[#0D766E] dark:bg-[#14B8A6] text-white dark:text-[#000000] font-bold text-xs flex items-center justify-center shrink-0 transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D766E] dark:focus-visible:ring-[#14B8A6] cursor-pointer shadow-xs ${
            isOpen ? 'ring-2 ring-[#0D766E] dark:ring-[#14B8A6]' : ''
          }`}
        >
          {initialLetter}
        </button>
      </Tooltip>
    );
  }

  // Expanded Mode Trigger: Full Row Button with Avatar and Name (no shifting indicator)
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-label={`Account menu for ${userProfile.displayName}`}
      className={`w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#EAEAE5] dark:hover:bg-[#18191C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D766E] dark:focus-visible:ring-[#14B8A6] cursor-pointer text-left select-none ${
        isOpen ? 'bg-[#EAEAE5] dark:bg-[#18191C]' : ''
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-[#0D766E] dark:bg-[#14B8A6] text-white dark:text-[#000000] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
        {initialLetter}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-xs text-[#18191B] dark:text-[#F3F4F6] truncate leading-tight">
          {userProfile.displayName}
        </div>
        <div className="text-[11px] text-[#71757E] truncate mt-0.5">
          {userProfile.email || (userProfile.username ? `@${userProfile.username}` : 'Student')}
        </div>
      </div>
    </button>
  );
}
