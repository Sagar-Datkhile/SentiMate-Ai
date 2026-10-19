import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'accent';
}

export function Card({ className = '', variant = 'default', children, ...props }: CardProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038]',
    muted: 'bg-[#F4F4F1] dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038]',
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
