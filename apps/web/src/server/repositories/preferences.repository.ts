import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { UserPreferences, UserPreferencesSchema } from '@sentimate/contracts';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'dark',
  textSize: 'default',
  reducedAnimations: false,
  enterToSend: true,
  responseLanguage: 'auto',
  responseLength: 'balanced',
  emailAppointmentReminders: true,
  emailCounsellorUpdates: true,
  inAppAppointmentReminders: true,
  inAppCounsellorUpdates: true,
};

function mapDbToPreferences(row: any): UserPreferences {
  if (!row) return DEFAULT_USER_PREFERENCES;
  return {
    theme: row.theme === 'light' ? 'light' : 'dark',
    textSize: ['small', 'default', 'large'].includes(row.text_size) ? row.text_size : 'default',
    reducedAnimations: Boolean(row.reduced_animations),
    enterToSend: row.enter_to_send !== undefined ? Boolean(row.enter_to_send) : true,
    responseLanguage: typeof row.response_language === 'string' ? row.response_language : 'auto',
    responseLength: ['concise', 'balanced', 'detailed'].includes(row.response_length) ? row.response_length : 'balanced',
    emailAppointmentReminders: row.email_appointment_reminders !== undefined ? Boolean(row.email_appointment_reminders) : true,
    emailCounsellorUpdates: row.email_counsellor_updates !== undefined ? Boolean(row.email_counsellor_updates) : true,
    inAppAppointmentReminders: row.in_app_appointment_reminders !== undefined ? Boolean(row.in_app_appointment_reminders) : true,
    inAppCounsellorUpdates: row.in_app_counsellor_updates !== undefined ? Boolean(row.in_app_counsellor_updates) : true,
  };
}

export class PreferencesRepository {
  /**
   * Retrieve user preferences. Creates default record if absent.
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    if (!env.isConfigured.supabase) {
      return DEFAULT_USER_PREFERENCES;
    }

    try {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('[PreferencesRepository] fetch error:', error.message);
      }

      if (data) {
        return mapDbToPreferences(data);
      }

      // Record not found - initialize with safe defaults
      const initialRow = {
        user_id: userId,
        theme: DEFAULT_USER_PREFERENCES.theme,
        text_size: DEFAULT_USER_PREFERENCES.textSize,
        reduced_animations: DEFAULT_USER_PREFERENCES.reducedAnimations,
        enter_to_send: DEFAULT_USER_PREFERENCES.enterToSend,
        response_language: DEFAULT_USER_PREFERENCES.responseLanguage,
        response_length: DEFAULT_USER_PREFERENCES.responseLength,
        email_appointment_reminders: DEFAULT_USER_PREFERENCES.emailAppointmentReminders,
        email_counsellor_updates: DEFAULT_USER_PREFERENCES.emailCounsellorUpdates,
        in_app_appointment_reminders: DEFAULT_USER_PREFERENCES.inAppAppointmentReminders,
        in_app_counsellor_updates: DEFAULT_USER_PREFERENCES.inAppCounsellorUpdates,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('user_preferences')
        .upsert(initialRow, { onConflict: 'user_id' })
        .select()
        .single();

      if (insertErr) {
        console.warn('[PreferencesRepository] upsert default failed:', insertErr.message);
        return DEFAULT_USER_PREFERENCES;
      }

      return mapDbToPreferences(inserted);
    } catch (e: any) {
      console.warn('[PreferencesRepository] getPreferences exception:', e?.message);
      return DEFAULT_USER_PREFERENCES;
    }
  }

  /**
   * Update allowlisted user preferences.
   */
  async updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
    if (!env.isConfigured.supabase) {
      return { ...DEFAULT_USER_PREFERENCES, ...patch };
    }

    try {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
      
      const dbPatch: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (patch.theme !== undefined) dbPatch.theme = patch.theme;
      if (patch.textSize !== undefined) dbPatch.text_size = patch.textSize;
      if (patch.reducedAnimations !== undefined) dbPatch.reduced_animations = patch.reducedAnimations;
      if (patch.enterToSend !== undefined) dbPatch.enter_to_send = patch.enterToSend;
      if (patch.responseLanguage !== undefined) dbPatch.response_language = patch.responseLanguage;
      if (patch.responseLength !== undefined) dbPatch.response_length = patch.responseLength;
      if (patch.emailAppointmentReminders !== undefined) dbPatch.email_appointment_reminders = patch.emailAppointmentReminders;
      if (patch.emailCounsellorUpdates !== undefined) dbPatch.email_counsellor_updates = patch.emailCounsellorUpdates;
      if (patch.inAppAppointmentReminders !== undefined) dbPatch.in_app_appointment_reminders = patch.inAppAppointmentReminders;
      if (patch.inAppCounsellorUpdates !== undefined) dbPatch.in_app_counsellor_updates = patch.inAppCounsellorUpdates;

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userId, ...dbPatch }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error || !data) {
        console.error('[PreferencesRepository] update failed:', error?.message);
        throw new Error('Failed to update preferences in database');
      }

      return mapDbToPreferences(data);
    } catch (e: any) {
      console.error('[PreferencesRepository] updatePreferences exception:', e?.message);
      throw e;
    }
  }
}

export const preferencesRepository = new PreferencesRepository();
