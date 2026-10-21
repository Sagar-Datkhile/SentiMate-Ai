'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError] Application error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#000000] text-[#18191B] dark:text-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] text-[#B91C1C] dark:text-[#F87171] flex items-center justify-center shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-xs sm:text-sm text-[#71757E] leading-relaxed">
            An unexpected error occurred while rendering this page. Your session and saved conversations remain safe.
          </p>
          {error.message && (
            <div className="p-3 bg-[#F4F4F1] dark:bg-[#18191C] rounded-xl text-xs font-mono text-[#71757E] text-left break-words">
              {error.message}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Button onClick={() => reset()} variant="primary" size="md" className="gap-2 font-semibold">
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
          <Link href="/">
            <Button variant="outline" size="md" className="gap-2 font-semibold">
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
