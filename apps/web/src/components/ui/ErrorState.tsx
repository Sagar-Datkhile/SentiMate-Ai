import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Unable to load data',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
        <AlertCircle className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="font-semibold text-sm sm:text-base text-red-900 dark:text-red-200">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-red-700 dark:text-red-300/80 leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Try Again</span>
          </Button>
        </div>
      )}
    </div>
  );
}
