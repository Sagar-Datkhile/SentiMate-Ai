'use client';

import React, { useState } from 'react';
import { StudentShell } from '@/components/layout/StudentShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Compass, CheckCircle2, TrendingUp, Moon, Zap, Smile, Users, BookOpen, Shield } from 'lucide-react';

interface CheckinHistoryItem {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  stress: number;
  shared: boolean;
}

export default function StudentCheckinsPage() {
  const [mood, setMood] = useState<number | null>(4);
  const [sleepHours, setSleepHours] = useState<string>('7.5');
  const [stress, setStress] = useState<number | null>(2);
  const [energy, setEnergy] = useState<number | null>(3);
  const [social, setSocial] = useState<number | null>(4);
  const [academicPressure, setAcademicPressure] = useState<number | null>(3);
  const [notes, setNotes] = useState('');
  const [shareWithCounsellor, setShareWithCounsellor] = useState(true);

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [history, setHistory] = useState<CheckinHistoryItem[]>([
    { id: 'c-1', date: 'Yesterday', mood: 4, sleep: 7.5, stress: 2, shared: true },
    { id: 'c-2', date: '3 days ago', mood: 3, sleep: 5.0, stress: 4, shared: true },
    { id: 'c-3', date: 'Last week', mood: 4, sleep: 8.0, stress: 2, shared: false },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const newItem: CheckinHistoryItem = {
      id: `c-${Date.now()}`,
      date: 'Just now',
      mood: mood || 3,
      sleep: parseFloat(sleepHours) || 7,
      stress: stress || 3,
      shared: shareWithCounsellor,
    };

    setHistory([newItem, ...history]);
    setSaving(false);
    setSubmitted(true);
  };

  return (
    <StudentShell>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Voluntary Wellbeing Check-in
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              A private moment of self-reflection. All questions are skippable.
            </p>
          </div>
          <Badge variant="teal" size="md">
            Confidential & Voluntary
          </Badge>
        </div>

        {submitted ? (
          <Card className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)] text-[#047857] dark:text-[#34D399] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#18191B] dark:text-[#F3F4F6]">
              Check-in Recorded
            </h2>
            <p className="text-xs sm:text-sm text-[#4A4D54] dark:text-[#9CA3AF] max-w-md mx-auto">
              Thank you for taking time to check in with yourself. Your reflection has been saved to your personal history.
            </p>
            <Button onClick={() => setSubmitted(false)} variant="outline" size="sm">
              Complete Another Check-in
            </Button>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question 1: Mood */}
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF]">
                    Overall Mood Today (1 = Very Low, 5 = Great)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMood(null)}
                  className="text-[11px] text-[#71757E] hover:underline"
                >
                  Skip
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMood(val)}
                    className={`py-3 rounded-lg border text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                      mood === val
                        ? 'bg-[#0D766E] text-white dark:bg-[#14B8A6] dark:text-[#0F1115] border-[#0D766E]'
                        : 'bg-[#F4F4F1] dark:bg-[#1F2228] border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] hover:bg-[#EAEAE5]'
                    }`}
                  >
                    {val === 1 ? '1 😔' : val === 2 ? '2 😕' : val === 3 ? '3 😐' : val === 4 ? '4 🙂' : '5 😃'}
                  </button>
                ))}
              </div>
            </Card>

            {/* Question 2: Sleep Hours */}
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF]">
                    Hours of Sleep Last Night
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSleepHours('')}
                  className="text-[11px] text-[#71757E] hover:underline"
                >
                  Skip
                </button>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="e.g. 7.5"
                  className="w-32 px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] min-h-[44px]"
                />
                <span className="text-xs text-[#71757E]">hours</span>
              </div>
            </Card>

            {/* Question 3: Stress Level */}
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF]">
                    Academic & Personal Stress (1 = Very Low, 5 = Extreme)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStress(null)}
                  className="text-[11px] text-[#71757E] hover:underline"
                >
                  Skip
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStress(val)}
                    className={`py-3 rounded-lg border text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                      stress === val
                        ? 'bg-[#B45309] text-white border-[#B45309]'
                        : 'bg-[#F4F4F1] dark:bg-[#1F2228] border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] hover:bg-[#EAEAE5]'
                    }`}
                  >
                    Level {val}
                  </button>
                ))}
              </div>
            </Card>

            {/* Question 4: Freeform Notes */}
            <Card className="space-y-3">
              <Textarea
                label="Self-Reflection Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write down any thoughts, triggers, or accomplishments from today..."
                rows={3}
              />

              {/* Consent Toggle */}
              <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shareWithCounsellor}
                  onChange={(e) => setShareWithCounsellor(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#E2E2DC] text-[#0D766E] focus:ring-[#0D766E]"
                />
                <span className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                  Allow my assigned counsellor to view this check-in during scheduled review appointments.
                </span>
              </label>
            </Card>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" size="lg" isLoading={saving} className="shadow-sm">
                Save Check-in
              </Button>
            </div>
          </form>
        )}

        {/* Section: Personal Check-in Trends */}
        <div className="space-y-4 pt-6 border-t border-[#E2E2DC] dark:border-[#2C3038]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
            <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
              Recent Check-in History & Weekly Trends
            </h2>
          </div>

          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] flex items-center justify-between flex-wrap gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">{item.date}</span>
                  <div className="text-[11px] text-[#71757E] mt-0.5">
                    Mood: {item.mood} / 5 • Sleep: {item.sleep} hrs • Stress: {item.stress} / 5
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.shared ? 'teal' : 'neutral'} size="sm">
                    {item.shared ? 'Shared with Counsellor' : 'Private'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
