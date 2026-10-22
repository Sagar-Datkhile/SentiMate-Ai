import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository } from '@/server/repositories/auth.repository';
import { supportRepository } from '@/server/repositories/support.repository';
import { UpdateBugTriageSchema } from '@sentimate/contracts';
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const { id } = await params;
    const inquiry = await supportRepository.getInquiryById(id);

    if (!inquiry) {
      return NextResponse.json(
        { error: `Report with ID "${id}" not found.`, code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      inquiry,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/bugs/[id]] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve report', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const { id } = await params;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload', code: 'INVALID_JSON' }, { status: 400 });
    }

    const validation = UpdateBugTriageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten(), code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await supportRepository.updateTriage(
      id,
      { id: auth.adminId, email: auth.adminEmail },
      validation.data
    );

    return NextResponse.json({
      ok: true,
      inquiry: updated,
      message: 'Bug triage updated successfully.',
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/bugs/[id]] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update report triage', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
