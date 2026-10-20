'use client';

import React, { useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Layers,
  Shield,
  Eye,
} from 'lucide-react';

export default function ToastPreviewPage() {
  const [loadingOperationActive, setLoadingOperationActive] = useState(false);

  // 1. Success Toast
  const triggerSuccess = () => {
    toast.success('Profile changes saved.', {
      description: 'Your contact information and academic details were updated.',
    });
  };

  // 2. Error Toast
  const triggerError = () => {
    toast.error('Profile update failed.', {
      description: 'The server could not verify your permanent registration number.',
    });
  };

  // 3. Warning Toast
  const triggerWarning = () => {
    toast.warning('Appointment slot limited.', {
      description: 'Only 1 remaining session available with this counsellor today.',
    });
  };

  // 4. Info Toast
  const triggerInfo = () => {
    toast.info('Appointment cancelled.', {
      description: 'The scheduled session has been removed from your calendar.',
    });
  };

  // 5. In-Place Loading to Success Transition
  const triggerAsyncSuccess = async () => {
    const id = 'async-save-demo';
    setLoadingOperationActive(true);
    toast.loading('Saving profile changes...', {
      id,
      description: 'Validating unique username and academic records.',
    });

    setTimeout(() => {
      toast.success('Profile changes saved.', {
        id,
        description: 'All records have been securely written to the database.',
      });
      setLoadingOperationActive(false);
    }, 1500);
  };

  // 6. In-Place Loading to Error Transition
  const triggerAsyncError = async () => {
    const id = 'async-conflict-demo';
    setLoadingOperationActive(true);
    toast.loading('Verifying appointment slot availability...', {
      id,
      description: 'Checking concurrency lock on calendar slot.',
    });

    setTimeout(() => {
      toast.error('Appointment slot is no longer available.', {
        id,
        description: 'Another student just reserved this slot. Please select a different time.',
      });
      setLoadingOperationActive(false);
    }, 1500);
  };

  // 7. Deduplication Test (repeated clicks don't stack duplicates)
  const triggerDeduplicated = () => {
    toast.info('Counsellor office hours updated.', {
      id: 'static-office-hours-notice',
      description: 'Spring term walk-in hours now begin at 9:00 AM weekdays.',
    });
  };

  // 8. Max 3 Stacking & Queue Overflow Test
  const triggerBatchToasts = () => {
    toast.info('Item 1: Syncing records...', { description: 'Batch operation started.' });
    setTimeout(() => {
      toast.success('Item 2: Student assignment updated.', { description: 'Assigned to Dr. Miller.' });
    }, 100);
    setTimeout(() => {
      toast.warning('Item 3: Low storage threshold.', { description: 'Log archive is 85% full.' });
    }, 200);
    setTimeout(() => {
      toast.success('Item 4: Resource changes saved.', { description: 'Promoted to active list.' });
    }, 300);
  };

  // 9. Long Message Wrapping Test
  const triggerLongMessage = () => {
    toast.info('Data rights request processed according to institutional retention rules.', {
      description:
        'A comprehensive archive including all anonymized audit events, consent declarations, and voluntary self-reflection notes has been compiled and delivered to the registered compliance officer. No raw student chat transcripts were exported.',
    });
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#0F1115] text-[#18191B] dark:text-[#F3F4F6] p-4 sm:p-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0D766E] dark:text-[#14B8A6]" />
              <h1 className="text-2xl font-bold tracking-tight">
                Glassmorphic Toast Verification Playground
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Verify top-right placement, light/dark themes, semantic tokens, in-place transitions, deduplication, and max 3 visible stacking.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => toast.clear()}>
              Clear All Toasts
            </Button>
          </div>
        </div>

        {/* Section 1: Standard Semantic Variants */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757E]">
            1. Semantic Variants
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={triggerSuccess}
              variant="outline"
              className="gap-2 justify-start border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Success Toast</span>
            </Button>

            <Button
              onClick={triggerError}
              variant="outline"
              className="gap-2 justify-start border-rose-500/30 text-rose-700 dark:text-rose-400"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Error Toast</span>
            </Button>

            <Button
              onClick={triggerWarning}
              variant="outline"
              className="gap-2 justify-start border-amber-500/30 text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Warning Toast</span>
            </Button>

            <Button
              onClick={triggerInfo}
              variant="outline"
              className="gap-2 justify-start border-blue-500/30 text-blue-700 dark:text-blue-400"
            >
              <Info className="w-4 h-4" />
              <span>Info Toast</span>
            </Button>
          </div>
        </div>

        {/* Section 2: In-Place Transitions (Loading -> Success/Error) */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757E]">
            2. In-Place State Transitions (No Duplicate Stacking)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                Async Operation &rarr; Success
              </h3>
              <p className="text-xs text-[#71757E]">
                Spawns a loading indicator with a stable ID, then transitions in-place to success after 1.5 seconds.
              </p>
              <Button
                onClick={triggerAsyncSuccess}
                variant="primary"
                size="sm"
                disabled={loadingOperationActive}
                className="gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOperationActive ? 'animate-spin' : ''}`} />
                <span>Simulate Async Save</span>
              </Button>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                Async Operation &rarr; Conflict Error
              </h3>
              <p className="text-xs text-[#71757E]">
                Spawns a loading indicator, then transitions in-place to a persistent error requiring dismissal.
              </p>
              <Button
                onClick={triggerAsyncError}
                variant="outline"
                size="sm"
                disabled={loadingOperationActive}
                className="gap-2"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Simulate Async Conflict</span>
              </Button>
            </Card>
          </div>
        </div>

        {/* Section 3: Queue Management, Stacking & Long Text */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757E]">
            3. Layout, Stacking & Queue Guard
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={triggerDeduplicated}
              variant="outline"
              className="gap-2 justify-start"
            >
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Deduplicated ID Toast</span>
            </Button>

            <Button
              onClick={triggerBatchToasts}
              variant="outline"
              className="gap-2 justify-start"
            >
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Spawn 4 Toasts (Max 3)</span>
            </Button>

            <Button
              onClick={triggerLongMessage}
              variant="outline"
              className="gap-2 justify-start"
            >
              <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Long Text Wrap Test</span>
            </Button>
          </div>
        </div>

        {/* Technical Specification Summary Card */}
        <Card className="p-5 space-y-3 text-xs leading-relaxed text-[#71757E] border-[#E2E2DC] dark:border-[#2C3038]">
          <h4 className="font-semibold text-sm text-[#18191B] dark:text-[#F3F4F6]">
            Architectural Guarantees
          </h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Surface:</strong> Frosted translucent glass with <code>backdrop-filter: blur(16px)</code>, fine neutral border, and soft shadow token.
            </li>
            <li>
              <strong>Placement:</strong> Fixed top-right (20px margin desktop, 12px margin mobile) with safe-area inset protection.
            </li>
            <li>
              <strong>Timing:</strong> Success (~4s), Info (~5s), Warning (~6s), Persistent for Actionable Errors.
            </li>
            <li>
              <strong>Interactivity:</strong> Timers automatically pause on mouse hover and keyboard focus.
            </li>
            <li>
              <strong>Accessibility:</strong> <code>role=&quot;region&quot;</code> with polite live-region announcements, hidden decorative icons, and visible close button focus ring.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
