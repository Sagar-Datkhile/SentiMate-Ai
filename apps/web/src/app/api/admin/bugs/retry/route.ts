import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { supportRepository } from '@/server/repositories/support.repository';
import { env } from '@/lib/env';

async function verifyAdminAuth(req: NextRequest): Promise<{
  authorized: boolean;
  adminId: string;
  adminEmail: string;
  errorResponse?: NextResponse;
}> {
  const mockUserId = req.headers.get('x-user-id');
  const mockRole = req.headers.get('x-user-role');
  const mockEmail = req.headers.get('x-user-email');

  if (mockUserId) {
    if (mockRole !== 'admin') {
      return {
        authorized: false,
        adminId: mockUserId,
        adminEmail: '',
        errorResponse: NextResponse.json(
          { error: 'Forbidden: Admin access required', code: 'FORBIDDEN_ROLE' },
          { status: 403 }
        ),
      };
    }
    return {
      authorized: true,
      adminId: mockUserId,
      adminEmail: mockEmail || 'admin@sentimate.internal',
    };
  }

  if (env.isConfigured.supabase) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        authorized: false,
        adminId: '',
        adminEmail: '',
        errorResponse: NextResponse.json(
          { error: 'Authentication required', code: 'UNAUTHENTICATED' },
          { status: 401 }
        ),
      };
    }

    const profile = await authRepository.getCurrentUserProfile();
    if (!profile || profile.role !== 'admin') {
      return {
        authorized: false,
        adminId: user.id,
        adminEmail: user.email || '',
        errorResponse: NextResponse.json(
          { error: 'Forbidden: Admin privileges required', code: 'FORBIDDEN_ROLE' },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      adminId: profile.id,
      adminEmail: profile.email || user.email || 'admin@sentimate.internal',
    };
  }

  return {
    authorized: true,
    adminId: 'admin-mock-1',
    adminEmail: 'admin@sentimate.internal',
  };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload', code: 'INVALID_JSON' }, { status: 400 });
    }

    const { inquiryId } = body;
    if (!inquiryId || typeof inquiryId !== 'string') {
      return NextResponse.json({ error: 'Field "inquiryId" is required', code: 'BAD_REQUEST' }, { status: 400 });
    }

    const updated = await supportRepository.retryEmailDelivery(inquiryId);

    return NextResponse.json({
      ok: true,
      inquiry: updated,
      message: `Email delivery retried. Status: ${updated.emailDeliveryStatus}`,
    });
  } catch (error: any) {
    console.error('[POST /api/admin/bugs/retry] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retry email delivery', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
