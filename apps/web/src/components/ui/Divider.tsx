import React from 'react';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Reusable Divider component with balanced horizontal lines and centered text.
 * Uses flex layout with equal flex:1 lines on both sides and theme-aware subtle borders.
 */
export function Divider({ label, children, className = '', ...props }: DividerProps) {
  const content = children ?? label;

  if (!content) {
    return (
      <div
        role="separator"
        className={`w-full border-t border-[#E2E2DC] dark:border-[#1F2024] ${className}`}
        {...props}
      />
    );
  }

  return (
    <div
      role="separator"
      className={`w-full flex items-center ${className}`}
      {...props}
    >
      <div className="flex-1 border-t border-[#E2E2DC] dark:border-[#1F2024]" aria-hidden="true" />
      <span className="shrink-0 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wider text-[#71757E] dark:text-[#8C9099] select-none">
        {content}
      </span>
      <div className="flex-1 border-t border-[#E2E2DC] dark:border-[#1F2024]" aria-hidden="true" />
    </div>
  );
}
