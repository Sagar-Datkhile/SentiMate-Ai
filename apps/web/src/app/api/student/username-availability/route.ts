import { NextRequest, NextResponse } from 'next/server';
import { usernameBloomService } from '@/server/services/usernameBloomService';
import { authRepository } from '@/server/repositories/auth.repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

// In-memory token bucket rate limiter: 40 requests per minute per user/IP
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();
const RATE_LIMIT_CAPACITY = 40;
const REFILL_RATE_PER_SEC = 40 / 60; // 40 tokens per 60 seconds

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  let bucket = rateLimitMap.get(key);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_CAPACITY - 1, lastRefill: now };
    rateLimitMap.set(key, bucket);
    return true;
  }

  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(RATE_LIMIT_CAPACITY, bucket.tokens + elapsedSec * REFILL_RATE_PER_SEC);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const usernameParam = searchParams.get('username');

    // 1. Authenticate Request & Enforce Student Role
    const mockRole = req.headers.get('x-user-role');
    const mockUserId = req.headers.get('x-user-id');
    const mockIsActive = req.headers.get('x-user-active');

    let requestingStudentId: string | undefined = undefined;
    let userRole: string | null = null;
    let isActive: boolean = true;

    if (mockRole !== null || mockUserId !== null) {
      if (!mockUserId) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in.', code: 'UNAUTHENTICATED' },
          { status: 401 }
        );
      }
      requestingStudentId = mockUserId;
      userRole = mockRole || 'student';
      isActive = mockIsActive !== 'false';
    } else if (env.isConfigured.supabase) {
      try {
        const supabase = await createServerSupabaseClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json(
            { error: 'Authentication required. Please sign in.', code: 'UNAUTHENTICATED' },
            { status: 401 }
          );
        }

        const profile = await authRepository.getCurrentUserProfile();
        if (!profile) {
          return NextResponse.json(
            { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
            { status: 401 }
          );
        }

        requestingStudentId = profile.id;
        userRole = profile.role;
        isActive = profile.is_active;
      } catch (authErr) {
        console.error('[Username Availability] Auth check error:', authErr);
        return NextResponse.json(
          { error: 'Failed to verify session authentication', code: 'AUTH_ERROR' },
          { status: 401 }
        );
      }
    } else {
      // Local development default
      requestingStudentId = 's-demo-1';
      userRole = 'student';
      isActive = true;
    }

    if (userRole !== 'student') {
      return NextResponse.json(
        { error: 'Forbidden: Username checks are restricted to student accounts.', code: 'FORBIDDEN_ROLE' },
        { status: 403 }
      );
    }

    if (!isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated.', code: 'ACCOUNT_DEACTIVATED' },
        { status: 403 }
      );
    }

    // 2. Rate Limiting Check
    const rateLimitKey = requestingStudentId || req.headers.get('x-forwarded-for') || 'anon';
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded: Too many username availability checks. Please wait a moment.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: { 'Retry-After': '5' },
        }
      );
    }

    // 3. Validate parameter presence
    if (!usernameParam || typeof usernameParam !== 'string') {
      return NextResponse.json(
        {
          username: '',
          available: false,
          appears_available: false,
          is_current: false,
          status: 'invalid_format',
          message: 'Username query parameter is required.',
          checked_via: 'client_validation',
        },
        { status: 400 }
      );
    }

    // 4. Perform tiered availability check
    const result = await usernameBloomService.checkAvailability(
      usernameParam,
      requestingStudentId
    );

    // Private cache headers: strictly prevent CDN / proxy caching of user checks
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Cookie, Authorization',
      },
    });
  } catch (err: any) {
    console.error('[Username Availability] Unexpected error:', err);
    return NextResponse.json(
      {
        error: 'Internal server error while evaluating username availability.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
