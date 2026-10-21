'use client';

import React from 'react';
import { Tooltip } from '../ui/Tooltip';
import { Skeleton } from '../ui/Skeleton';
import { UserProfileData } from './AccountMenu';
import { AvatarBubble } from './AvatarBubble';

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
  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 px-2 h-11 rounded-xl" aria-hidden="true">
        <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
        <div className={`space-y-1 flex-1 min-w-0 overflow-hidden ${isCollapsed ? 'hidden' : 'block'}`}>
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
    );
  }

  return (
    <Tooltip
      content={isCollapsed ? `Account: ${userProfile.displayName}` : null}
      side="right"
      className="relative flex items-center w-full"
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Account menu for ${userProfile.displayName}`}
        className={`w-full h-11 flex items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#91A7D0] cursor-pointer text-left select-none overflow-hidden ${
          isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2'
        } hover:bg-[#EAEAE5] dark:hover:bg-[#18191C] ${
          isOpen ? 'bg-[#EAEAE5] dark:bg-[#18191C]' : ''
        }`}
      >
        <div className="shrink-0 flex items-center justify-center">
          <AvatarBubble
            avatarUrl={userProfile.avatarUrl}
            displayName={userProfile.displayName}
            size={8}
          />
        </div>
        <div
          className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-150 whitespace-nowrap ${
            isCollapsed ? 'opacity-0 w-0 max-w-0 pointer-events-none hidden' : 'opacity-100'
          }`}
        >
          <div className="font-semibold text-xs text-[#18191B] dark:text-[#F3F4F6] truncate leading-tight whitespace-nowrap">
            {userProfile.displayName}
          </div>
        </div>
      </button>
    </Tooltip>
  );
}
