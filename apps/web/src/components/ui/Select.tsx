import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      label,
      options,
      placeholder,
      error,
      helperText,
      id,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative w-full">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            value={value}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            className={`w-full appearance-none rounded-lg pl-3.5 pr-10 py-2.5 text-sm bg-white dark:bg-[#18191C] border ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-[#E2E2DC] dark:border-[#1F2024] focus:border-[#4F648C] dark:focus:border-[#91A7D0] focus:ring-[#4F648C]/20'
            } text-[#18191B] dark:text-[#F3F4F6] [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 transition-all min-h-[44px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-[#F5F5F3] dark:disabled:bg-[#141518] ${
              !value && placeholder ? 'text-[#71757E]' : ''
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled={false} className="text-[#71757E]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="text-[#18191B] dark:text-[#F3F4F6] bg-white dark:bg-[#18191C] py-1"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#71757E]">
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1 text-xs text-[#71757E]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
