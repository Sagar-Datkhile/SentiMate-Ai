import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Privileged Supabase Admin client using SUPABASE_SERVICE_ROLE_KEY.
 * STRICT SECURITY INVARIANT: Must NEVER be exposed to or imported in client components!
 * Only used for:
 * 1. Admin provisioning of counsellors (creating auth user with activation token)
 * 2. System audit logging and background job processing
 */
export function createAdminClient() {
  if (!env.supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for administrative operations');
  }

  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
