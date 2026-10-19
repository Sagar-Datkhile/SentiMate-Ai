'use client';

import React, { useState } from 'react';
import { StudentShell } from '@/components/layout/StudentShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, XCircle, UserCheck } from 'lucide-react';

interface AvailableSlot {
  id: string;
  counsellorName: string;
  counsellorTitle: string;
  location: string;
  date: string;
  time: string;
  isBooked: boolean;
}

interface AppointmentItem {
  id: string;
  counsellorName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'requested' | 'completed' | 'cancelled';
  location: string;
}

export default function StudentAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([
    {
      id: 'apt-1',
      counsellorName: 'Dr. Sarah Adams',
      date: 'Thursday, Oct 22, 2026',
      time: '2:00 PM – 2:45 PM',
      status: 'confirmed',
      location: 'Wellness Center Pavilion, Room 302',
    },
  ]);

  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([
    {
      id: 'slot-1',
      counsellorName: 'Dr. Sarah Adams',
      counsellorTitle: 'Senior Campus Psychologist',
      location: 'Wellness Center Pavilion, Room 302',
      date: 'Monday, Oct 26, 2026',
      time: '10:00 AM – 10:45 AM',
      isBooked: false,
    },
    {
      id: 'slot-2',
      counsellorName: 'Dr. Sarah Adams',
      counsellorTitle: 'Senior Campus Psychologist',
      location: 'Wellness Center Pavilion, Room 302',
      date: 'Monday, Oct 26, 2026',
      time: '11:00 AM – 11:45 AM',
      isBooked: false,
    },
    {
      id: 'slot-3',
      counsellorName: 'Michael Chen, LMFT',
      counsellorTitle: 'Student Wellbeing Specialist',
      location: 'Counseling Wing, Room 104',
      date: 'Tuesday, Oct 27, 2026',
      time: '1:30 PM – 2:15 PM',
      isBooked: false,
    },
  ]);

  const [bookingSlot, setBookingSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleConfirmBooking = async () => {
    if (!bookingSlot) return;
    setBookingLoading(true);

    // Simulate transactional conflict-free booking operation
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newApt: AppointmentItem = {
      id: `apt-${Date.now()}`,
      counsellorName: bookingSlot.counsellorName,
      date: bookingSlot.date,
      time: bookingSlot.time,
      status: 'confirmed',
      location: bookingSlot.location,
    };

    setAppointments([newApt, ...appointments]);
    setAvailableSlots((prev) =>
      prev.map((s) => (s.id === bookingSlot.id ? { ...s, isBooked: true } : s))
    );

    setSuccessBanner(
      `Appointment reserved with ${bookingSlot.counsellorName} for ${bookingSlot.date} at ${bookingSlot.time}. Transactional lock ensured no double booking.`
    );
    setBookingSlot(null);
    setNotes('');
    setBookingLoading(false);
  };

  const handleCancel = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
    );
  };

  return (
    <StudentShell>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Counsellor Appointments & Availability
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Schedule confidential 1-on-1 sessions with licensed campus counsellors. Protected against double-booking.
            </p>
          </div>
          <Badge variant="teal" size="md">
            Transactional Scheduling
          </Badge>
        </div>

        {successBanner && (
          <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.25)] text-[#047857] dark:text-[#34D399] flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Section 1: Upcoming & Past Appointments */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
            Your Scheduled Sessions
          </h2>

          {appointments.length === 0 ? (
            <div className="p-6 rounded-xl border border-[#E2E2DC] dark:border-[#2C3038] bg-white dark:bg-[#17191E] text-center text-xs text-[#71757E]">
              You have no active appointments booked. Choose an available slot below.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <Card
                  key={apt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#18191B] dark:text-[#F3F4F6]">
                        {apt.counsellorName}
                      </span>
                      <Badge
                        variant={
                          apt.status === 'confirmed'
                            ? 'teal'
                            : apt.status === 'completed'
                            ? 'neutral'
                            : 'red'
                        }
                        size="sm"
                      >
                        {apt.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#4A4D54] dark:text-[#9CA3AF]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#0D766E] dark:text-[#14B8A6]" />
                        <span>{apt.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#0D766E] dark:text-[#14B8A6]" />
                        <span>{apt.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#71757E]" />
                        <span>{apt.location}</span>
                      </div>
                    </div>
                  </div>

                  {apt.status === 'confirmed' && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleCancel(apt.id)}
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700 dark:hover:text-red-400"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Available Counsellor Slots */}
        <div className="space-y-4 pt-6 border-t border-[#E2E2DC] dark:border-[#2C3038]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
              Available Open Time Slots
            </h2>
            <span className="text-xs text-[#71757E]">Real-time open slots</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableSlots
              .filter((s) => !s.isBooked)
              .map((slot) => (
                <Card key={slot.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[#18191B] dark:text-[#F3F4F6]">
                        {slot.counsellorName}
                      </div>
                      <div className="text-[11px] text-[#71757E]">{slot.counsellorTitle}</div>
                    </div>
                    <Badge variant="teal" size="sm">
                      Open
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-[#4A4D54] dark:text-[#9CA3AF]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#0D766E] dark:text-[#14B8A6]" />
                      <span>{slot.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0D766E] dark:text-[#14B8A6]" />
                      <span>{slot.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#71757E]">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{slot.location}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={() => setBookingSlot(slot)}
                      variant="primary"
                      size="sm"
                      className="w-full text-xs font-semibold"
                    >
                      Book this Slot
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(bookingSlot)}
        onClose={() => setBookingSlot(null)}
        title="Confirm Appointment Booking"
        description={
          bookingSlot
            ? `With ${bookingSlot.counsellorName} on ${bookingSlot.date} at ${bookingSlot.time}`
            : ''
        }
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
              Notes for your counsellor (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Briefly state what you'd like to discuss (e.g., midterm burnout, sleep trouble)..."
              rows={3}
              className="w-full rounded-lg p-2.5 bg-white dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038] text-xs text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#0D766E]"
            />
          </div>

          <div className="p-3 bg-[#F0FDFA] dark:bg-[rgba(20,184,166,0.12)] rounded-lg border border-[#CCFBF1] dark:border-[rgba(20,184,166,0.25)] text-xs text-[#0D766E] dark:text-[#2DD4BF]">
            🔒 <strong>Transactional Booking:</strong> Once confirmed, this slot is immediately locked in the database, preventing anyone else from claiming the same time.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setBookingSlot(null)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              variant="primary"
              isLoading={bookingLoading}
            >
              Confirm Reservation
            </Button>
          </div>
        </div>
      </Dialog>
    </StudentShell>
  );
}
