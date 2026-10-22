import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const variantStyles = {
      primary:
        'bg-[#4F648C] text-[#FFFFFF] hover:bg-[#405374] dark:bg-[#2C67C5] dark:hover:bg-[#3875DC] dark:text-white focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#2C67C5]',
      secondary:
        'bg-[#F4F4F1] text-[#18191B] hover:bg-[#EAEAE5] dark:bg-[#18191C] dark:text-[#F3F4F6] dark:hover:bg-[#222327] focus-visible:ring-[#71757E]',
      outline:
        'border border-[#E2E2DC] text-[#18191B] bg-transparent hover:bg-[#F4F4F1] dark:border-[#1F2024] dark:text-[#F3F4F6] dark:hover:bg-[#18191C] focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#2C67C5]',
      ghost:
        'text-[#4A4D54] hover:bg-[#F4F4F1] dark:text-[#9CA3AF] dark:hover:bg-[#18191C] hover:text-[#18191B] dark:hover:text-[#F3F4F6]',
      danger:
        'bg-[#B91C1C] text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 focus-visible:ring-red-600',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
