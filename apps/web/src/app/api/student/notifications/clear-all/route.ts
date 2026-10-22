import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { notificationsRepository } from '@/server/repositories/notifications.repository';
import { env } from '@/lib/env';

async function resolveAuthenticatedStudent(req: NextRequest) {
  const mockUserId = req.headers.get('x-user-id');
  if (mockUserId) return { studentId: mockUserId };

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

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthenticatedStudent(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let snapshotTime: string | undefined = undefined;
    try {
      const body = await req.json();
      snapshotTime = body?.snapshotTime;
    } catch {
      // Body is optional
    }

    const dismissedCount = await notificationsRepository.clearAllNotifications(
      auth.studentId,
      snapshotTime
    );

    const unreadCount = await notificationsRepository.getUnreadCount(auth.studentId);
    return NextResponse.json({
      success: true,
      dismissedCount,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[API:Notifications:ClearAll] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to clear all notifications' },
      { status: 500 }
    );
  }
}
