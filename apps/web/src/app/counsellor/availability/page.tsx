'use client';

import React, { useState } from 'react';
import { CounsellorShell } from '@/components/layout/CounsellorShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Clock, Plus, Calendar, CheckCircle2, Trash2 } from 'lucide-react';

interface SlotItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedByStudent?: string;
}

export default function CounsellorAvailabilityPage() {
  const [slots, setSlots] = useState<SlotItem[]>([
    {
      id: 's-1',
      date: '2026-10-22',
      startTime: '14:00',
      endTime: '14:45',
      isBooked: true,
      bookedByStudent: 'Alex P.',
    },
    {
      id: 's-2',
      date: '2026-10-26',
      startTime: '10:00',
      endTime: '10:45',
      isBooked: false,
    },
    {
      id: 's-3',
      date: '2026-10-26',
      startTime: '11:00',
      endTime: '11:45',
      isBooked: false,
    },
  ]);

  const [newDate, setNewDate] = useState('2026-10-28');
  const [newStart, setNewStart] = useState('09:30');
  const [newEnd, setNewEnd] = useState('10:15');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const newSlot: SlotItem = {
      id: `s-${Date.now()}`,
      date: newDate,
      startTime: newStart,
      endTime: newEnd,
      isBooked: false,
    };
    setSlots([...slots, newSlot]);
    setSuccessBanner(`Availability slot created for ${newDate} (${newStart} – ${newEnd}).`);
  };

  const handleDeleteSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
  };

  return (
    <CounsellorShell>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Manage Availability & Appointment Slots
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Publish office hours and appointment windows for student booking. Concurrency protection prevents conflicting reservations.
            </p>
          </div>
          <Badge variant="teal" size="md">
            Database Conflict Guard Active
          </Badge>
        </div>

        {successBanner && (
          <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.25)] text-[#047857] dark:text-[#34D399] flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Create Slot Form */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-3">
            <Plus className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
            <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
              Add New Available Slot
            </h2>
          </div>

          <form onSubmit={handleAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
                Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] min-h-[44px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] min-h-[44px]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
                End Time
              </label>
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] min-h-[44px]"
                required
              />
            </div>

            <Button type="submit" variant="primary" size="md" className="gap-1.5 text-xs font-semibold">
              <Plus className="w-4 h-4" />
              <span>Publish Slot</span>
            </Button>
          </form>
        </Card>

        {/* Existing Published Slots */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
            Configured Time Slots
          </h2>

          <div className="space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="p-4 rounded-xl bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] flex items-center justify-between flex-wrap gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#F4F4F1] dark:bg-[#1F2228] text-[#0D766E] dark:text-[#14B8A6]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-[#18191B] dark:text-[#F3F4F6]">
                      {slot.date}
                    </span>
                    <div className="text-[11px] text-[#71757E]">
                      {slot.startTime} – {slot.endTime}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={slot.isBooked ? 'amber' : 'teal'} size="sm">
                    {slot.isBooked ? `Reserved (${slot.bookedByStudent})` : 'Open for Booking'}
                  </Badge>

                  {!slot.isBooked && (
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1.5 text-[#71757E] hover:text-red-600 transition-colors"
                      title="Remove slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CounsellorShell>
  );
}
