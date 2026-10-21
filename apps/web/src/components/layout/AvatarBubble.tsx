'use client';

import React, { useState } from 'react';

interface AvatarBubbleProps {
  avatarUrl?: string;
  displayName: string;
  /** Tailwind size unit (e.g. 8 → w-8 h-8). Supports 7, 8, 9. Default 8. */
  size?: 7 | 8 | 9;
  className?: string;
}

const SIZE_CLASSES: Record<number, string> = {
  7: 'w-7 h-7 text-[10px]',
  8: 'w-8 h-8 text-xs',
  9: 'w-9 h-9 text-sm',
};

/**
 * Circular avatar that shows a profile photo when available, or a branded
 * initial-letter fallback. Handles broken-image gracefully.
 */
export function AvatarBubble({ avatarUrl, displayName, size = 8, className = '' }: AvatarBubbleProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES[8];
  const initialLetter = (displayName || 'S').charAt(0).toUpperCase();
  const showPhoto = !!avatarUrl && !imgError;

  const base = `rounded-full shrink-0 overflow-hidden flex items-center justify-center shadow-xs ${sizeClass} ${className}`;

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName}
        onError={() => setImgError(true)}
        className={`${base} object-cover`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`${base} bg-[#4F648C] dark:bg-[#91A7D0] text-white dark:text-[#151B26] font-bold`}
      aria-hidden="true"
    >
      {initialLetter}
    </div>
  );
}
