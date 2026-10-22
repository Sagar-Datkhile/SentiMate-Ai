import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { notificationsRepository } from '@/server/repositories/notifications.repository';
import { env } from '@/lib/env';

/**
 * Authenticate student request and resolve studentId.
 */
async function resolveAuthenticatedStudent(req: NextRequest) {
  const mockUserId = req.headers.get('x-user-id');
  const mockRole = req.headers.get('x-user-role');

  if (mockUserId) {
    if (mockRole && mockRole !== 'student' && mockRole !== 'admin') {
      return { error: 'Forbidden', status: 403 };
    }
    return { studentId: mockUserId };
  }

  if (env.isConfigured.supabase) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Authentication required', status: 401 };
    }

    const profile = await authRepository.getCurrentUserProfile();
    if (!profile || (profile.role !== 'student' && profile.role !== 'admin')) {
      return { error: 'Student account required', status: 403 };
    }

    return { studentId: profile.id };
  }

  return { studentId: 's-demo-1' };
}

/**
 * GET /api/student/notifications
 * Paginated retrieval of notifications for the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthenticatedStudent(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const snapshotTime = searchParams.get('snapshotTime') || undefined;

    const result = await notificationsRepository.listNotificationsForStudent({
      studentId: auth.studentId,
      page,
      limit,
      snapshotTime,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[API:Notifications:GET] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/notifications
 * Controlled trigger for real appointment events.
 * Students CANNOT generate arbitrary notifications; only validated actions are permitted.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthenticatedStudent(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { eventType, details } = body;

    // Validate permitted student event types
    if (eventType === 'appointment_booked') {
      const { counsellorName, date, time, slotId } = details || {};
      if (!counsellorName || !date || !time) {
        return NextResponse.json({ error: 'Missing appointment details' }, { status: 400 });
      }

      const notif = await notificationsRepository.createNotification({
        userId: auth.studentId,
        category: 'appointment',
        title: 'Appointment Request Submitted',
        preview: `Confirmed with ${counsellorName} on ${date} at ${time}.`,
        actionUrl: '/student/appointments',
        sourceReference: slotId || `apt-${Date.now()}`,
        eventId: `apt-booked-${auth.studentId}-${slotId || date + '-' + time}`,
        metadata: { counsellorName, date, time, slotId },
      });

      return NextResponse.json({ success: true, notification: notif });
    }

    if (eventType === 'appointment_cancelled') {
      const { counsellorName, date, time, appointmentId } = details || {};
      const notif = await notificationsRepository.createNotification({
        userId: auth.studentId,
        category: 'appointment',
        title: 'Appointment Cancelled',
        preview: `Your session ${counsellorName ? `with ${counsellorName} ` : ''}on ${date || 'the scheduled date'} has been cancelled.`,
        actionUrl: '/student/appointments',
        sourceReference: appointmentId || `apt-${Date.now()}`,
        eventId: `apt-cancelled-${auth.studentId}-${appointmentId || Date.now()}`,
        metadata: { counsellorName, date, time, appointmentId },
      });

      return NextResponse.json({ success: true, notification: notif });
    }

    if (eventType === 'referral_submitted') {
      const { priority, referralId } = details || {};
      const notif = await notificationsRepository.createNotification({
        userId: auth.studentId,
        category: 'counsellor',
        title: 'Support Referral Received',
        preview: `Campus psychological services received your ${priority || 'routine'} support referral.`,
        actionUrl: '/student/referrals',
        sourceReference: referralId || `ref-${Date.now()}`,
        eventId: `ref-submitted-${auth.studentId}-${referralId || Date.now()}`,
        metadata: { priority, referralId },
      });

      return NextResponse.json({ success: true, notification: notif });
    }

    return NextResponse.json(
      { error: 'Unauthorized event type. Arbitrary notification creation is prohibited.' },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('[API:Notifications:POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process notification event' },
      { status: 500 }
    );
  }
}
