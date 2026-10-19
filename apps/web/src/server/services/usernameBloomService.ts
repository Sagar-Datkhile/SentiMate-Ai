import {
  normalizeUsername,
  validateUsernameFormat,
  RESERVED_USERNAMES,
  UsernameAvailabilityResponse,
} from '@sentimate/contracts';
import { UsernameBloomFilter } from './bloomFilter';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

interface CachedAvailability {
  available: boolean;
  expiresAt: number;
}

export class UsernameBloomService {
  private filter: UsernameBloomFilter;
  private queryCache: Map<string, CachedAvailability> = new Map();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60-second shared query cache
  private readonly MAX_CACHE_SIZE = 1000;

  // Local in-memory set for testing and offline development
  private localMockUsernames: Map<string, string> = new Map([
    ['alex_student', 's-demo-1'],
    ['sam_scholar', 's-demo-2'],
  ]);

  constructor() {
    // 1. Immediately initialize a ready, robust Bloom filter with reserved & seed usernames
    this.filter = new UsernameBloomFilter(10000, 0.01);
    for (const r of RESERVED_USERNAMES) {
      this.filter.add(r);
    }
    for (const [name] of this.localMockUsernames) {
      this.filter.add(name);
    }

    // 2. Perform background DB sync without blocking startup
    this.syncFromDatabase().catch(() => {});
  }

  /**
   * Background synchronization from authoritative PostgreSQL database
   */
  public async syncFromDatabase(): Promise<void> {
    if (!env.isConfigured.supabase) return;

    try {
      // Use short timeout so offline local development does not hang
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('DB_TIMEOUT')), 1500)
      );

      const fetchPromise = (async () => {
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
          .from('student_profiles')
          .select('username, id')
          .not('username', 'is', null);

        if (error || !data) return null;
        return data;
      })();

      const rows: any = await Promise.race([fetchPromise, timeoutPromise]);
      if (rows && Array.isArray(rows)) {
        for (const row of rows) {
          if (row.username) {
            const norm = normalizeUsername(row.username);
            this.filter.add(norm);
            this.localMockUsernames.set(norm, row.id);
          }
        }
      }
    } catch {
      // Graceful degraded mode: filter remains active with seeded & assigned usernames
    }
  }

  /**
   * Check username availability using three-tier architecture:
   * 1. Format validation & system reserved name check (instant, no DB)
   * 2. Short-lived bounded query cache (instant, no DB)
   * 3. Bloom filter membership test (definitely absent => no DB)
   * 4. One indexed DB lookup on Bloom filter positive (or false positive)
   */
  public async checkAvailability(
    rawCandidate: string,
    requestingStudentId?: string
  ): Promise<UsernameAvailabilityResponse> {
    const normalized = normalizeUsername(rawCandidate);

    // Tier 1: Canonical format validation & reserved system name check
    const formatCheck = validateUsernameFormat(normalized);
    if (!formatCheck.isValid) {
      return {
        username: normalized,
        available: false,
        appears_available: false,
        is_current: false,
        status: formatCheck.isReserved ? 'reserved' : 'invalid_format',
        message: formatCheck.error,
        checked_via: 'client_validation',
      };
    }

    // Tier 2: Short-lived shared query cache check
    // (Note: We only cache confirmed UNAVAILABLE usernames in shared cache to avoid cross-user state pollution)
    const now = Date.now();
    const cached = this.queryCache.get(normalized);
    if (cached && now < cached.expiresAt) {
      if (!cached.available) {
        return {
          username: normalized,
          available: false,
          appears_available: false,
          is_current: false,
          status: 'already_taken',
          message: 'Username is already taken.',
          checked_via: 'cache',
        };
      }
    }

    // Tier 3: Bloom Filter Membership Test
    const possiblyPresent = this.filter.has(normalized);

    // If Bloom filter reports definitely absent, return immediately WITHOUT hitting DB!
    if (!possiblyPresent) {
      return {
        username: normalized,
        available: true,
        appears_available: true,
        is_current: false,
        status: 'available',
        message: 'Username appears available.',
        checked_via: 'bloom_negative',
      };
    }

    // Tier 4: Bloom Filter reported positive (real match OR ~1% false positive)
    // Perform ONE indexed lookup on student_profiles table (with graceful offline mock fallback)
    try {
      if (env.isConfigured.supabase) {
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('DB_TIMEOUT')), 1500)
        );

        const dbPromise = (async () => {
          const supabase = await createServerSupabaseClient();
          return await supabase
            .from('student_profiles')
            .select('id, username')
            .eq('username', normalized)
            .maybeSingle();
        })();

        const result: any = await Promise.race([dbPromise, timeoutPromise]).catch(() => null);
        const { data, error } = result || {};

        if (error) {
          // Table not yet migrated or schema cache unrefreshed: fall through to local mock lookup
        } else if (data) {
          // Check if it's the requesting student's current username
          if (requestingStudentId && data.id === requestingStudentId) {
            return {
              username: normalized,
              available: true,
              appears_available: true,
              is_current: true,
              status: 'current_user',
              message: 'This is currently your username.',
              checked_via: 'db_lookup',
            };
          }

          this.setCache(normalized, false);
          return {
            username: normalized,
            available: false,
            appears_available: false,
            is_current: false,
            status: 'already_taken',
            message: 'Username is already taken by another student.',
            checked_via: 'db_lookup',
          };
        }
      }

      // Offline / Local Mock Lookup
      const existingOwnerId = this.localMockUsernames.get(normalized);
      if (existingOwnerId) {
        if (requestingStudentId && existingOwnerId === requestingStudentId) {
          return {
            username: normalized,
            available: true,
            appears_available: true,
            is_current: true,
            status: 'current_user',
            message: 'This is currently your username.',
            checked_via: 'db_lookup',
          };
        }
        this.setCache(normalized, false);
        return {
          username: normalized,
          available: false,
          appears_available: false,
          is_current: false,
          status: 'already_taken',
          message: 'Username is already taken.',
          checked_via: 'db_lookup',
        };
      }

      // Bloom false positive: Verified absent in database!
      return {
        username: normalized,
        available: true,
        appears_available: true,
        is_current: false,
        status: 'available',
        message: 'Username appears available.',
        checked_via: 'db_lookup',
      };
    } catch (err: any) {
      console.warn('[UsernameBloomService] DB check error:', err);
      return {
        username: normalized,
        available: true,
        appears_available: true,
        is_current: false,
        status: 'unable_to_check',
        message: 'Unable to check availability at this moment. You can still submit to save.',
        checked_via: 'fallback',
      };
    }
  }

  /**
   * Update the Bloom filter and invalidate caches after a successful username claim
   */
  public recordUsernameAssignment(normalizedUsername: string, studentId?: string): void {
    const normalized = normalizeUsername(normalizedUsername);
    if (!normalized) return;

    // 1. Add to in-memory Bloom filter
    this.filter.add(normalized);

    // 2. Add to local mock set
    if (studentId) {
      this.localMockUsernames.set(normalized, studentId);
    }

    // 3. Mark as unavailable in query cache
    this.setCache(normalized, false);
  }

  /**
   * Helper to set query cache with bounded size
   */
  private setCache(username: string, available: boolean): void {
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.queryCache.keys().next().value;
      if (firstKey) this.queryCache.delete(firstKey);
    }
    this.queryCache.set(username, {
      available,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });
  }

  /**
   * Check if local mock set has username
   */
  public getLocalMockOwner(normalized: string): string | undefined {
    return this.localMockUsernames.get(normalized);
  }

  /**
   * Retrieve Bloom filter serialization metadata for diagnostics or audit
   */
  public getFilterMetadata() {
    return this.filter.metadata;
  }
}

export const usernameBloomService = new UsernameBloomService();
