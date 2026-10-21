import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'accent';
}

export function Card({ className = '', variant = 'default', children, ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024]',
    muted: 'bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024]',
    accent:
      'bg-[#F0FDFA] dark:bg-[rgba(20,184,166,0.1)] border border-[#CCFBF1] dark:border-[rgba(20,184,166,0.25)]',
  };

  return (
    <div
      className={`rounded-xl p-5 shadow-sm transition-all ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
