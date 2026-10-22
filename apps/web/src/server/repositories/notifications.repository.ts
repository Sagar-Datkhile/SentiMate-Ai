import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { preferencesRepository } from './preferences.repository';
import type {
  NotificationItem,
  NotificationCategory,
  NotificationListResponse,
} from '@sentimate/contracts';

export interface CreateNotificationInput {
  userId: string;
  category: NotificationCategory;
  title: string;
  preview: string;
  actionUrl?: string | null;
  sourceReference?: string | null;
  eventId?: string | null;
  metadata?: Record<string, any>;
}

export interface ListNotificationsParams {
  studentId: string;
  page?: number;
  limit?: number;
  snapshotTime?: string;
}

// In-memory fallback cache for development/test environments or mock sessions
const inMemoryNotifications = new Map<string, NotificationItem[]>();

function sanitizePreview(text: string): string {
  if (!text) return '';
  // Strip control characters, excessive whitespace, and limit length to 200 chars
  const cleaned = text.replace(/[\r\n\t]+/g, ' ').trim();
  if (cleaned.length > 200) {
    return cleaned.slice(0, 197) + '...';
  }
  return cleaned;
}

function validateActionUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Strictly enforce internal relative paths only
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes(':')) {
    return null;
  }
  return trimmed;
}

function mapRowToNotification(row: any): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    preview: row.message || row.preview || '',
    category: (['support', 'appointment', 'counsellor', 'announcement', 'system'].includes(row.category)
      ? row.category
      : 'system') as NotificationCategory,
    actionUrl: validateActionUrl(row.action_url),
    isRead: Boolean(row.is_read),
    readAt: row.read_at || null,
    dismissedAt: row.dismissed_at || null,
    sourceReference: row.source_reference || null,
    eventId: row.event_id || null,
    createdAt: row.created_at || new Date().toISOString(),
    metadata: row.metadata || {},
  };
}

export class NotificationsRepository {
  /**
   * Create a notification through trusted server operations.
   * Enforces in-app preferences, internal destination validation, preview sanitization,
   * and idempotency constraints.
   */
  async createNotification(input: CreateNotificationInput): Promise<NotificationItem | null> {
    const { userId, category, title, preview, actionUrl, sourceReference, eventId, metadata } = input;

    if (!userId || !title) {
      throw new Error('User ID and title are required for notification creation.');
    }

    // 1. Honor student in-app notification preferences
    try {
      const prefs = await preferencesRepository.getPreferences(userId);
      if (category === 'appointment' && prefs.inAppAppointmentReminders === false) {
        // Student has opted out of in-app appointment notifications
        return null;
      }
      if (category === 'counsellor' && prefs.inAppCounsellorUpdates === false) {
        // Student has opted out of in-app counsellor update notifications
        return null;
      }
    } catch (prefErr) {
      console.warn('[NotificationsRepository] Failed to check preferences, proceeding with safe default:', prefErr);
    }

    const sanitizedPreview = sanitizePreview(preview);
    const validatedUrl = validateActionUrl(actionUrl);
    const nowIso = new Date().toISOString();

    // 2. Supabase DB persistence
    if (env.isConfigured.supabase) {
      try {
        const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();

        // Check idempotency if eventId is provided
        if (eventId) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('event_id', eventId)
            .maybeSingle();

          if (existing) {
            // Already created for this event, prevent duplicate
            return null;
          }
        }

        const insertPayload: Record<string, any> = {
          user_id: userId,
          title: title.slice(0, 200),
          message: sanitizedPreview,
          category,
          action_url: validatedUrl,
          source_reference: sourceReference || null,
          event_id: eventId || null,
          metadata: metadata || {},
          is_read: false,
          created_at: nowIso,
        };

        const { data, error } = await supabase
          .from('notifications')
          .insert(insertPayload)
          .select('*')
          .single();

        if (error) {
          // Check if failure was due to additive columns not being present yet
          if (error.code === '42703' || error.message?.includes('column')) {
            const fallbackPayload = {
              user_id: userId,
              title: title.slice(0, 200),
              message: sanitizedPreview,
              action_url: validatedUrl,
              is_read: false,
            };
            const { data: fbData, error: fbError } = await supabase
              .from('notifications')
              .insert(fallbackPayload)
              .select('*')
              .single();

            if (!fbError && fbData) {
              return mapRowToNotification({ ...fbData, category });
            }
          }
          console.warn('[NotificationsRepository] Insert error:', error.message);
        } else if (data) {
          return mapRowToNotification(data);
        }
      } catch (dbErr: any) {
        console.warn('[NotificationsRepository] Database exception:', dbErr?.message);
      }
    }

    // 3. In-memory fallback
    const userList = inMemoryNotifications.get(userId) || [];
    if (eventId && userList.some((n) => n.eventId === eventId)) {
      return null;
    }

    const memoryItem: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      title,
      preview: sanitizedPreview,
      category,
      actionUrl: validatedUrl,
      isRead: false,
      readAt: null,
      dismissedAt: null,
      sourceReference: sourceReference || null,
      eventId: eventId || null,
      createdAt: nowIso,
      metadata: metadata || {},
    };

    inMemoryNotifications.set(userId, [memoryItem, ...userList]);
    return memoryItem;
  }

  /**
   * Paginated retrieval of non-dismissed notifications for a student.
   * Returns independent unreadCount and consistent snapshotTime boundary.
   */
  async listNotificationsForStudent(params: ListNotificationsParams): Promise<NotificationListResponse> {
    const { studentId } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 15));
    const snapshotTime = params.snapshotTime || new Date().toISOString();

    if (env.isConfigured.supabase) {
      try {
        const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();

        // 1. Calculate unread count independently of current page
        const { count: unreadCount, error: countErr } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', studentId)
          .eq('is_read', false)
          .is('dismissed_at', null);

        if (countErr) {
          console.warn('[NotificationsRepository] unread count error:', countErr.message);
        }

        // 2. Query paginated notifications up to snapshotTime
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
          .from('notifications')
          .select('*', { count: 'exact' })
          .eq('user_id', studentId)
          .is('dismissed_at', null)
          .lte('created_at', snapshotTime)
          .order('created_at', { ascending: false })
          .range(from, to);

        const { data, count: totalCount, error: listErr } = await query;

        if (!listErr && data) {
          const notifications = data.map(mapRowToNotification);
          const total = totalCount ?? notifications.length;
          const hasMore = from + notifications.length < total;

          return {
            notifications,
            unreadCount: unreadCount ?? 0,
            total,
            page,
            limit,
            hasMore,
            snapshotTime,
          };
        }
      } catch (err: any) {
        console.warn('[NotificationsRepository] list error:', err?.message);
      }
    }

    // In-memory fallback
    const all = inMemoryNotifications.get(studentId) || [];
    const active = all.filter(
      (n) => !n.dismissedAt && (!snapshotTime || new Date(n.createdAt).getTime() <= new Date(snapshotTime).getTime())
    );
    active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = active.length;
    const from = (page - 1) * limit;
    const paged = active.slice(from, from + limit);
    const unreadCount = all.filter((n) => !n.dismissedAt && !n.isRead).length;

    return {
      notifications: paged,
      unreadCount,
      total,
      page,
      limit,
      hasMore: from + paged.length < total,
      snapshotTime,
    };
  }

  /**
   * Get unread count for badge display.
   */
  async getUnreadCount(studentId: string): Promise<number> {
    if (env.isConfigured.supabase) {
      try {
        const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', studentId)
          .eq('is_read', false)
          .is('dismissed_at', null);

        if (!error && typeof count === 'number') {
          return count;
        }
      } catch {
        // Fallback below
      }
    }

    const items = inMemoryNotifications.get(studentId) || [];
    return items.filter((n) => !n.dismissedAt && !n.isRead).length;
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(studentId: string, notificationId: string): Promise<boolean> {
    const nowIso = new Date().toISOString();

    if (env.isConfigured.supabase) {
      try {
        const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: nowIso,
          })
          .eq('id', notificationId)
          .eq('user_id', studentId);

        if (!error) return true;
      } catch {
        // Fallback below
      }
    }

    const items = inMemoryNotifications.get(studentId) || [];
    const target = items.find((n) => n.id === notificationId && n.userId === studentId);
    if (target) {
      target.isRead = true;
      target.readAt = nowIso;
      return true;
    }
    return false;
  }

  /**
   * Mark all active notifications as read, scoped to snapshot boundary.
   * Newly arriving notifications after beforeTimestamp remain unread!
   */
  async markAllAsRead(studentId: string, beforeTimestamp?: string): Promise<number> {
    const cutoff = beforeTimestamp || new Date().toISOString();
    const nowIso = new Date().toISOString();

    if (env.isConfigured.supabase) {
      try {
        const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
        const { error, count } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: nowIso,
          })
          .eq('user_id', studentId)
          .eq('is_read', false)
          .is('dismissed_at', null)
          .lte('created_at', cutoff);

        if (!error) {
          return count || 0;
        }
      } catch {
        // Fallback below
      }
    }

    const items = inMemoryNotifications.get(studentId) || [];
    let updatedCount = 0;
    for (const item of items) {
      if (
        !item.dismissedAt &&
        !item.isRead &&
        new Date(item.createdAt).getTime() <= new Date(cutoff).getTime()
      ) {
        item.isRead = true;
        item.readAt = nowIso;
        updatedCount++;
      }
    }
    return updatedCount;
  }

  /**
   * Clear all notifications (soft dismissal) for this student only.
   * Scoped to snapshot boundary so newly arriving notifications are preserved.
   */
  async clearAllNotifications(studentId: string, beforeTimestamp?: string): Promise<number> {
    const cutoff = beforeTimestamp || new Date().toISOString();
    const nowIso = new Date().toISOString();

    if (env.isConfigured.supabase) {
      try {
        const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
        const { error, count } = await supabase
          .from('notifications')
          .update({
            dismissed_at: nowIso,
          })
          .eq('user_id', studentId)
          .is('dismissed_at', null)
          .lte('created_at', cutoff);

        if (!error) {
          return count || 0;
        }
      } catch {
        // Fallback below
      }
    }

    const items = inMemoryNotifications.get(studentId) || [];
    let dismissedCount = 0;
    for (const item of items) {
      if (
        !item.dismissedAt &&
        new Date(item.createdAt).getTime() <= new Date(cutoff).getTime()
      ) {
        item.dismissedAt = nowIso;
        dismissedCount++;
      }
    }
    return dismissedCount;
  }
}

export const notificationsRepository = new NotificationsRepository();
