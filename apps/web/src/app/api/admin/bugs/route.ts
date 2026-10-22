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

  // Supabase not configured in local mock mode without headers
  return {
    authorized: true,
    adminId: 'admin-mock-1',
    adminEmail: 'admin@sentimate.internal',
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await supportRepository.listInquiriesForAdmin({
      category,
      status,
      priority,
      search,
      page,
      limit,
    });

    return NextResponse.json({
      ok: true,
      items: result.reports,
      reports: result.reports,
      total: result.total,
      page: result.page,
      limit,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/bugs] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list bug reports', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
