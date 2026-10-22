import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          className={`w-full rounded-lg px-3.5 py-2.5 text-sm bg-white dark:bg-[#18191C] border ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[#E2E2DC] dark:border-[#1F2024] focus:border-[#4F648C] dark:focus:border-[#2C67C5] focus:ring-[#4F648C]/20'
          } text-[#18191B] dark:text-[#F3F4F6] placeholder-[#71757E] [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 transition-all resize-y ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-[#71757E]">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
