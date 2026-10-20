'use client';

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    'aria-describedby'?: string;
  }>;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  side = 'right',
  align = 'center',
  delayMs = 200,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substring(2, 9)}`);

  const handleShow = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);
  };

  const handleHide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getPositionClasses = () => {
    switch (side) {
      case 'top':
        return 'bottom-full mb-1.5 left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'top-full mt-1.5 left-1/2 -translate-x-1/2';
      case 'left':
        return 'right-full mr-1.5 top-1/2 -translate-y-1/2';
      case 'right':
      default:
        return 'left-full ml-2 top-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="relative inline-flex items-center" onMouseLeave={handleHide}>
      {React.cloneElement(children, {
        onMouseEnter: (e: React.MouseEvent) => {
          children.props.onMouseEnter?.(e);
          handleShow();
        },
        onMouseLeave: (e: React.MouseEvent) => {
          children.props.onMouseLeave?.(e);
          handleHide();
        },
        onFocus: (e: React.FocusEvent) => {
          children.props.onFocus?.(e);
          handleShow();
        },
        onBlur: (e: React.FocusEvent) => {
          children.props.onBlur?.(e);
          handleHide();
        },
        'aria-describedby': isVisible ? tooltipId.current : undefined,
      })}

      {isVisible && content && (
        <div
          id={tooltipId.current}
          role="tooltip"
          className={`absolute ${getPositionClasses()} z-50 pointer-events-none px-2.5 py-1 text-[11px] font-medium leading-none rounded-md bg-[#18191B] dark:bg-[#282C34] text-white dark:text-[#F3F4F6] shadow-md border border-black/10 dark:border-white/10 whitespace-nowrap transition-opacity animate-in fade-in-0 duration-150`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
