import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@sentimate/contracts';

export interface UserProfileRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  institution_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class AuthRepository {
  async getCurrentUserProfile(): Promise<UserProfileRecord | null> {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return profile as UserProfileRecord;
  }

  async getProfileById(userId: string): Promise<UserProfileRecord | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data as UserProfileRecord;
  }

  async createAuditLog(entry: {
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    ipHash?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const adminClient = createAdminClient();
      await adminClient.from('audit_logs').insert({
        actor_id: entry.actorId || null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId || null,
        ip_hash: entry.ipHash || null,
        metadata: entry.metadata || {},
      });
    } catch (e) {
      console.warn('Audit log write skipped (Supabase unconfigured):', e);
    }
  }
}

export const authRepository = new AuthRepository();
