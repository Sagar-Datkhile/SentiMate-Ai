import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { ConsentType, ConsentStatus } from '@sentimate/contracts';

export interface AuthoritativeConsentRecord {
  consentType: ConsentType;
  status: ConsentStatus;
  termsVersion: string;
  updatedAt: string;
}

export type StudentConsentMap = Record<ConsentType, AuthoritativeConsentRecord>;

export const DEFAULT_CONSENT_MAP: StudentConsentMap = {
  ai_chat_processing: {
    consentType: 'ai_chat_processing',
    status: 'granted',
    termsVersion: '1.0',
    updatedAt: new Date().toISOString(),
  },
  nlp_sentiment_analysis: {
    consentType: 'nlp_sentiment_analysis',
    status: 'granted',
    termsVersion: '1.0',
    updatedAt: new Date().toISOString(),
  },
  counsellor_data_sharing: {
    consentType: 'counsellor_data_sharing',
    status: 'revoked',
    termsVersion: '1.0',
    updatedAt: new Date().toISOString(),
  },
  academic_record_correlation: {
    consentType: 'academic_record_correlation',
    status: 'revoked',
    termsVersion: '1.0',
    updatedAt: new Date().toISOString(),
  },
};

export class ConsentRepository {
  /**
   * Derive authoritative current consent from latest consent_events audit rows.
   */
  async getConsentMap(studentId: string): Promise<StudentConsentMap> {
    if (!env.isConfigured.supabase) {
      return DEFAULT_CONSENT_MAP;
    }

    try {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('consent_events')
        .select('consent_type, status, terms_version, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[ConsentRepository] fetch error:', error.message);
        return DEFAULT_CONSENT_MAP;
      }

      const map: StudentConsentMap = { ...DEFAULT_CONSENT_MAP };

      // Latest event per consent_type takes precedence
      const seen = new Set<string>();
      for (const row of data || []) {
        const type = row.consent_type as ConsentType;
        if (!seen.has(type) && map[type]) {
          seen.add(type);
          map[type] = {
            consentType: type,
            status: row.status as ConsentStatus,
            termsVersion: row.terms_version || '1.0',
            updatedAt: row.created_at,
          };
        }
      }

      return map;
    } catch (e: any) {
      console.warn('[ConsentRepository] getConsentMap exception:', e?.message);
      return DEFAULT_CONSENT_MAP;
    }
  }

  /**
   * Record an immutable consent change event.
   */
  async recordConsentEvent(
    studentId: string,
    consentType: ConsentType,
    status: ConsentStatus,
    termsVersion: string = '1.0',
    ipHash?: string
  ): Promise<AuthoritativeConsentRecord> {
    if (!env.isConfigured.supabase) {
      return {
        consentType,
        status,
        termsVersion,
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('consent_events')
        .insert({
          student_id: studentId,
          consent_type: consentType,
          status,
          terms_version: termsVersion,
          ip_hash: ipHash || null,
        })
        .select('consent_type, status, terms_version, created_at')
        .single();

      if (error || !data) {
        console.error('[ConsentRepository] record event error:', error?.message);
        throw new Error('Failed to record consent event in authoritative audit log');
      }

      return {
        consentType: data.consent_type as ConsentType,
        status: data.status as ConsentStatus,
        termsVersion: data.terms_version,
        updatedAt: data.created_at,
      };
    } catch (e: any) {
      console.error('[ConsentRepository] recordConsentEvent exception:', e?.message);
      throw e;
    }
  }
}

export const consentRepository = new ConsentRepository();
