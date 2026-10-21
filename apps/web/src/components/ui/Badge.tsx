import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'teal' | 'brand' | 'emerald' | 'amber' | 'red' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ className = '', variant = 'neutral', size = 'md', children, ...props }: BadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantStyles = {
    brand:
      'bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#91A7D0] border border-[#D5DFEE] dark:border-[rgba(145,167,208,0.25)]',
    teal:
      'bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#91A7D0] border border-[#D5DFEE] dark:border-[rgba(145,167,208,0.25)]',
    emerald:
      'bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)] text-[#047857] dark:text-[#34D399] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.3)]',
    amber:
      'bg-[#FFFBEB] dark:bg-[rgba(245,158,11,0.15)] text-[#B45309] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[rgba(245,158,11,0.3)]',
    red:
      'bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.15)] text-[#B91C1C] dark:text-[#F87171] border border-[#FECACA] dark:border-[rgba(239,68,68,0.3)]',
    neutral:
      'bg-[#F4F4F1] dark:bg-[#18191C] text-[#4A4D54] dark:text-[#9CA3AF] border border-[#E2E2DC] dark:border-[#1F2024]',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
