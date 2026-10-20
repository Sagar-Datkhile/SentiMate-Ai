'use client';

import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface SidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
  side?: 'right' | 'bottom' | 'top' | 'left';
}

export function SidebarToggle({
  isCollapsed,
  onToggle,
  className = '',
  side = 'right',
}: SidebarToggleProps) {
  const label = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <Tooltip content={label} side={side}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={!isCollapsed}
        className={`p-2 rounded-xl text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6] hover:bg-[#EAEAE5] dark:hover:bg-[#1F2228] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D766E] dark:focus-visible:ring-[#14B8A6] flex items-center justify-center shrink-0 min-h-[38px] min-w-[38px] cursor-pointer ${className}`}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="w-5 h-5" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="w-5 h-5" aria-hidden="true" />
        )}
      </button>
    </Tooltip>
  );
}
