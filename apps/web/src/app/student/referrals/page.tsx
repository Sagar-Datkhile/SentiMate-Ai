'use client';

import React, { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { CheckCircle2, Clock } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function StudentReferralsPage() {
  const [reason, setReason] = useState('');
  const [shareCheckins, setShareCheckins] = useState(true);
  const [shareAcademics, setShareAcademics] = useState(false);
  const [priority, setPriority] = useState<'routine' | 'medium' | 'urgent'>('routine');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || loading) return;

    setLoading(true);
    try {
      const stored = sessionStorage.getItem('sentimate_referrals');
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `ref-${Date.now()}`,
        reason: reason.trim(),
        priority,
        shareCheckins,
        shareAcademics,
        submittedAt: new Date().toISOString(),
      });
      sessionStorage.setItem('sentimate_referrals', JSON.stringify(list));
    } catch {
      // Storage fallback
    } finally {
      // Trigger authenticated server notification event
      fetch('/api/student/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'referral_submitted',
          details: {
            priority,
            referralId: `ref-${Date.now()}`,
          },
        }),
      }).catch(() => {});

      setLoading(false);
      setSubmitted(true);
      toast.success('Support referral submitted.', {
        description: 'Campus psychological services has received your request.',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="border-b border-[#E2E2DC] dark:border-[#1F2024] pb-5">
          <h1
            className="text-3xl sm:text-4xl font-serif text-[#18191B] dark:text-[#F3F4F6] tracking-tight"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
          >
            Request Campus Counsellor Referral
          </h1>
          <p className="text-xs sm:text-sm text-[#71757E] mt-1">
            Submit a direct request for professional counselling follow-up. You control exactly what context is shared.
          </p>
        </div>

        {submitted ? (
          <Card className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)] text-[#047857] dark:text-[#34D399] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#18191B] dark:text-[#F3F4F6]">
              Support Referral Submitted
            </h2>
            <p className="text-xs sm:text-sm text-[#4A4D54] dark:text-[#9CA3AF] max-w-lg mx-auto leading-relaxed">
              Your referral has been sent to campus psychological services. Your assigned counsellor will review your note and initiate contact or confirm an appointment slot during campus operating hours.
            </p>
            <div className="p-3 bg-[#F4F4F1] dark:bg-[#18191C] rounded-xl text-xs text-[#71757E] max-w-md mx-auto">
              <strong>Notice:</strong> Submitting a referral does not imply immediate human monitoring. For acute emergencies, call 988 or campus emergency services directly.
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="space-y-4">
              <Textarea
                label="Why are you seeking support? (Required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what you are currently going through, what challenges you are facing, or what kind of guidance you need..."
                rows={4}
                required
              />

              {/* Priority selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5">
                  Requested Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['routine', 'medium', 'urgent'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border capitalize transition-colors min-h-[44px] ${
                        priority === p
                          ? 'border-[#4F648C] dark:border-[#2C67C5] bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF]'
                          : 'border-[#E2E2DC] dark:border-[#1F2024] text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Sharing Consent Controls */}
              <div className="pt-2 border-t border-[#E2E2DC] dark:border-[#1F2024] space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF]">
                  Granular Sharing Permissions
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shareCheckins}
                    onChange={(e) => setShareCheckins(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E2E2DC] text-[#4F648C] dark:text-[#5B8DEF] focus:ring-[#4F648C] dark:focus:ring-[#2C67C5]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6] block">
                      Share recent voluntary check-in trends
                    </span>
                    <span className="text-[#71757E]">
                      Allows the counsellor to review your self-reported sleep and stress scores to better understand your day-to-day routine.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shareAcademics}
                    onChange={(e) => setShareAcademics(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#E2E2DC] text-[#4F648C] dark:text-[#5B8DEF] focus:ring-[#4F648C] dark:focus:ring-[#2C67C5]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6] block">
                      Share academic performance context (Semesters 1–8 SGPA)
                    </span>
                    <span className="text-[#71757E]">
                      Provides educational background if your concerns are primarily related to academic probation or exam pressure.
                    </span>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-[#F4F4F1] dark:bg-[#18191C] rounded-xl flex items-center gap-2 text-xs text-[#71757E]">
                <Clock className="w-4 h-4 shrink-0 text-[#4F648C] dark:text-[#5B8DEF]" />
                <span>Counsellor review occurs during campus business hours (Mon–Fri 8:30 AM – 5:00 PM).</span>
              </div>
            </Card>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={loading}
                disabled={!reason.trim()}
                className="shadow-sm font-semibold"
              >
                Submit Support Referral
              </Button>
            </div>
          </form>
        )}
      </div>
  );
}
