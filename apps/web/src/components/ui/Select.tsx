'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  label?: string;
  labelClassName?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  triggerClassName?: string;
  name?: string;
  required?: boolean;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      id,
      label,
      labelClassName,
      options = [],
      value: controlledValue,
      defaultValue,
      placeholder = 'Select an option',
      disabled = false,
      error,
      helperText,
      className = '',
      triggerClassName = '',
      name,
      required,
      onChange,
      onValueChange,
    },
    forwardedRef
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const containerRef = useRef<HTMLDivElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);
    const internalTriggerRef = useRef<HTMLButtonElement>(null);
    const triggerRef = (forwardedRef as React.RefObject<HTMLButtonElement>) || internalTriggerRef;

    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState<string>(defaultValue || '');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    const selectedOption = options.find((opt) => opt.value === currentValue);

    // Sync highlighted index when opening
    useEffect(() => {
      if (isOpen) {
        const selectedIdx = options.findIndex((opt) => opt.value === currentValue);
        setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      }
    }, [isOpen, currentValue, options]);

    // Close on click outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [isOpen]);

    // Scroll highlighted option into view
    useEffect(() => {
      if (isOpen && listboxRef.current && highlightedIndex >= 0) {
        const optionEl = listboxRef.current.children[highlightedIndex] as HTMLElement;
        if (optionEl && typeof optionEl.scrollIntoView === 'function') {
          optionEl.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [isOpen, highlightedIndex]);

    const handleSelect = useCallback(
      (optValue: string) => {
        if (!isControlled) {
          setInternalValue(optValue);
        }
        if (onChange) {
          onChange({ target: { value: optValue, name } });
        }
        if (onValueChange) {
          onValueChange(optValue);
        }
        setIsOpen(false);
        triggerRef.current?.focus();
      },
      [isControlled, onChange, onValueChange, name, triggerRef]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen) {
            if (highlightedIndex >= 0 && highlightedIndex < options.length) {
              const opt = options[highlightedIndex];
              if (!opt.disabled) {
                handleSelect(opt.value);
              }
            }
          } else {
            setIsOpen(true);
          }
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) => {
              let next = prev + 1;
              while (next < options.length && options[next].disabled) {
                next++;
              }
              return next < options.length ? next : prev;
            });
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) => {
              let next = prev - 1;
              while (next >= 0 && options[next].disabled) {
                next--;
              }
              return next >= 0 ? next : prev;
            });
          }
          break;

        case 'Home':
          if (isOpen) {
            e.preventDefault();
            const first = options.findIndex((opt) => !opt.disabled);
            if (first >= 0) setHighlightedIndex(first);
          }
          break;

        case 'End':
          if (isOpen) {
            e.preventDefault();
            for (let i = options.length - 1; i >= 0; i--) {
              if (!options[i].disabled) {
                setHighlightedIndex(i);
                break;
              }
            }
          }
          break;

        case 'Escape':
          if (isOpen) {
            e.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
          }
          break;

        case 'Tab':
          if (isOpen) {
            setIsOpen(false);
          }
          break;
      }
    };

    return (
      <div ref={containerRef} className={`relative w-full ${className}`}>
        {label && (
          <label
            id={`${selectId}-label`}
            htmlFor={selectId}
            className={labelClassName || "block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5"}
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative w-full">
          <button
            id={selectId}
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? `${selectId}-label ${selectId}` : undefined}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            onKeyDown={handleKeyDown}
            className={`w-full flex items-center justify-between text-left rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer select-none min-h-[44px] ${
              disabled
                ? 'opacity-60 cursor-not-allowed bg-[#F5F5F3] dark:bg-[#141518] text-[#71757E]'
                : 'bg-white dark:bg-[#18191C] text-[#18191B] dark:text-[#F3F4F6] hover:border-[#4F648C]/40 dark:hover:border-[#2C67C5]/50'
            } border ${
              error
                ? 'border-red-500 ring-2 ring-red-500/20'
                : isOpen
                ? 'border-[#4F648C] dark:border-[#2C67C5] ring-2 ring-[#4F648C]/20 dark:ring-[#2C67C5]/25'
                : 'border-[#E2E2DC] dark:border-[#1F2024]'
            } ${triggerClassName}`}
          >
            <span className={`truncate ${!selectedOption ? 'text-[#71757E]' : ''}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={`w-4 h-4 ml-2 text-[#71757E] dark:text-[#9CA3AF] shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-[#4F648C] dark:text-[#5B8DEF]' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Floating Dropdown Menu */}
          {isOpen && (
            <div
              className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-[#E2E2DC] dark:border-[#282A30] bg-white dark:bg-[#18191C] shadow-2xl backdrop-blur-xl overflow-hidden py-1 animate-in fade-in-0 zoom-in-95 duration-100"
            >
              <ul
                ref={listboxRef}
                role="listbox"
                id={`${selectId}-listbox`}
                aria-labelledby={label ? `${selectId}-label` : undefined}
                className="max-h-60 overflow-y-auto py-0.5 focus:outline-none"
                tabIndex={-1}
              >
                {options.length === 0 ? (
                  <li className="px-3.5 py-2.5 text-xs text-[#71757E] italic select-none">
                    No options available
                  </li>
                ) : (
                  options.map((option, index) => {
                    const isSelected = option.value === currentValue;
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <li
                        key={option.value}
                        role="option"
                        id={`${selectId}-option-${index}`}
                        aria-selected={isSelected}
                        aria-disabled={option.disabled}
                        onClick={() => {
                          if (!option.disabled) {
                            handleSelect(option.value);
                          }
                        }}
                        onMouseEnter={() => {
                          if (!option.disabled) {
                            setHighlightedIndex(index);
                          }
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer select-none ${
                          option.disabled
                            ? 'opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#EEF2F8] dark:bg-[#202738] text-[#4F648C] dark:text-[#5B8DEF] font-semibold'
                            : isHighlighted
                            ? 'bg-[#F4F4F1] dark:bg-[#22242A] text-[#18191B] dark:text-[#F3F4F6]'
                            : 'text-[#18191B] dark:text-[#F3F4F6]'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate">{option.label}</span>
                          {option.description && (
                            <span className="text-[11px] text-[#71757E] truncate mt-0.5 font-normal">
                              {option.description}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-[#4F648C] dark:text-[#5B8DEF] shrink-0" aria-hidden="true" />
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
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
