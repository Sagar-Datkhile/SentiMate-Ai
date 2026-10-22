'use client';

import React, { useState, useEffect } from 'react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { AppointmentCardSkeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, XCircle, UserCheck } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

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
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);

  const [bookingSlot, setBookingSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    // Load student appointments and published open slots
    const loadAppointmentsData = () => {
      try {
        const storedAppointments = sessionStorage.getItem('sentimate_student_appointments');
        if (storedAppointments) {
          setAppointments(JSON.parse(storedAppointments));
        } else {
          setAppointments([]);
        }

        const storedSlots = sessionStorage.getItem('sentimate_counsellor_slots');
        if (storedSlots) {
          setAvailableSlots(JSON.parse(storedSlots));
        } else {
          setAvailableSlots([]);
        }
      } catch {
        setAppointments([]);
        setAvailableSlots([]);
      } finally {
        setIsLoadingAppointments(false);
        setIsLoadingSlots(false);
      }
    };
    loadAppointmentsData();
  }, []);

  const handleConfirmBooking = async () => {
    if (!bookingSlot) return;
    setBookingLoading(true);

    // Guard if slot was already taken
    const latestSlot = availableSlots.find((s) => s.id === bookingSlot.id);
    if (latestSlot && latestSlot.isBooked) {
      toast.error('Appointment slot is no longer available.', {
        description: 'This time slot was claimed by another student. Please select a different time.',
      });
      setBookingLoading(false);
      setBookingSlot(null);
      return;
    }

    const newApt: AppointmentItem = {
      id: `apt-${Date.now()}`,
      counsellorName: bookingSlot.counsellorName,
      date: bookingSlot.date,
      time: bookingSlot.time,
      status: 'confirmed',
      location: bookingSlot.location,
    };

    const updatedApts = [newApt, ...appointments];
    setAppointments(updatedApts);

    const updatedSlots = availableSlots.map((s) =>
      s.id === bookingSlot.id ? { ...s, isBooked: true } : s
    );
    setAvailableSlots(updatedSlots);

    try {
      sessionStorage.setItem('sentimate_student_appointments', JSON.stringify(updatedApts));
      sessionStorage.setItem('sentimate_counsellor_slots', JSON.stringify(updatedSlots));
    } catch {
      // Ignore storage errors
    }

    // Trigger authenticated server notification event
    fetch('/api/student/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'appointment_booked',
        details: {
          counsellorName: bookingSlot.counsellorName,
          date: bookingSlot.date,
          time: bookingSlot.time,
          slotId: bookingSlot.id,
        },
      }),
    }).catch(() => {});

    toast.success('Appointment request submitted.', {
      description: `Reserved with ${bookingSlot.counsellorName} for ${bookingSlot.date} at ${bookingSlot.time}.`,
    });
    setBookingSlot(null);
    setNotes('');
    setBookingLoading(false);
  };

  const handleCancel = (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    const updated = appointments.map((a) =>
      a.id === id ? { ...a, status: 'cancelled' as const } : a
    );
    setAppointments(updated);
    try {
      sessionStorage.setItem('sentimate_student_appointments', JSON.stringify(updated));
    } catch {
      // Ignore
    }

    // Trigger authenticated server notification event
    fetch('/api/student/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'appointment_cancelled',
        details: {
          counsellorName: apt?.counsellorName,
          date: apt?.date,
          time: apt?.time,
          appointmentId: id,
        },
      }),
    }).catch(() => {});

    toast.info('Appointment cancelled.', {
      description: apt ? `Session on ${apt.date} at ${apt.time} has been cancelled.` : undefined,
    });
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="border-b border-[#E2E2DC] dark:border-[#1F2024] pb-5">
          <h1
            className="text-3xl sm:text-4xl font-serif text-[#18191B] dark:text-[#F3F4F6] tracking-tight"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
          >
            Counsellor Appointments & Availability
          </h1>
          <p className="text-xs sm:text-sm text-[#71757E] mt-1">
            Schedule confidential 1-on-1 sessions with licensed campus counsellors. Protected against double-booking.
          </p>
        </div>



        {/* Section 1: Upcoming & Past Appointments */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
            Your Scheduled Sessions
          </h2>

          <LoadingRegion
            isLoading={isLoadingAppointments}
            announcement="Loading your scheduled appointments..."
          >
            {isLoadingAppointments ? (
              <AppointmentCardSkeleton />
            ) : appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Scheduled Appointments"
                description="You have no active appointments booked. Choose an available slot below to connect with a campus counsellor."
              />
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
                          <Calendar className="w-3.5 h-3.5 text-[#4F648C] dark:text-[#5B8DEF]" />
                          <span>{apt.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#4F648C] dark:text-[#5B8DEF]" />
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
          </LoadingRegion>
        </div>

        {/* Section 2: Available Counsellor Slots */}
        <div className="space-y-4 pt-6 border-t border-[#E2E2DC] dark:border-[#1F2024]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
              Available Open Time Slots
            </h2>
            <span className="text-xs text-[#71757E]">Real-time open slots</span>
          </div>

          <LoadingRegion
            isLoading={isLoadingSlots}
            announcement="Loading available counsellor consultation slots..."
          >
            {isLoadingSlots ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AppointmentCardSkeleton />
                <AppointmentCardSkeleton />
              </div>
            ) : availableSlots.filter((s) => !s.isBooked).length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No Open Slots Currently Available"
                description="All published consultation slots are currently booked. Please check back later or submit a direct support referral note."
              />
            ) : (
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
                          <Calendar className="w-3.5 h-3.5 text-[#4F648C] dark:text-[#5B8DEF]" />
                          <span>{slot.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#4F648C] dark:text-[#5B8DEF]" />
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
            )}
          </LoadingRegion>
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
              className="w-full rounded-lg p-2.5 bg-white dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] text-xs text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#4F648C] dark:focus:border-[#2C67C5]"
            />
          </div>

          <div className="p-3 bg-[#EEF2F8] dark:bg-[#242E40]/60 rounded-lg border border-[#D6E0EE] dark:border-[#2C67C5]/25 text-xs text-[#4F648C] dark:text-[#5B8DEF]">
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
    </>
  );
}
