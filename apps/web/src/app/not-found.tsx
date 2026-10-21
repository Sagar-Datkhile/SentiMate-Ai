import React from 'react';
import Link from 'next/link';
import { HeartHandshake, Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#000000] text-[#18191B] dark:text-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#91A7D0] flex items-center justify-center shadow-sm">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">404 — Page Not Found</h1>
          <p className="text-xs sm:text-sm text-[#71757E] leading-relaxed">
            The page you are looking for doesn't exist, has been moved, or is restricted to another user role.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link href="/">
            <Button variant="primary" size="md" className="gap-2 font-semibold">
              <ArrowLeft className="w-4 h-4" />
              <span>Return to SentiMate</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
