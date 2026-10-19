import { createAdminClient } from '@/lib/supabase/admin';
import { authService } from './auth.service';
import { authRepository } from '../repositories/auth.repository';
import type { ProvisionCounsellorRequest } from '@sentimate/contracts';

export class CounsellorProvisioningService {
  /**
   * Protected Admin Operation to invite/provision a new campus counsellor.
   * GUARANTEES:
   * 1. Requires verified Admin session.
   * 2. No plaintext password is exposed or stored.
   * 3. An account activation invite is generated.
   * 4. Audit log event is captured.
   */
  async provisionCounsellor(data: ProvisionCounsellorRequest) {
    // 1. Verify caller has admin privileges
    const { profile: caller } = await authService.requireAuth(['admin']);

    const adminClient = createAdminClient();

    // 2. Invite user via Supabase Auth Admin API (creates user with secure recovery/activation link)
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: {
          full_name: data.fullName,
        },
      }
    );

    if (inviteError || !inviteData.user) {
      throw new Error(`Failed to create counsellor auth account: ${inviteError?.message}`);
    }

    const counsellorUserId = inviteData.user.id;

    // 3. Explicitly set profile role to 'counsellor'
    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({
        role: 'counsellor',
        full_name: data.fullName,
        institution_id: data.institutionId || caller.institution_id || null,
        is_active: true,
      })
      .eq('id', counsellorUserId);

    if (profileUpdateError) {
      throw new Error(`Failed to set counsellor role: ${profileUpdateError.message}`);
    }

    // 4. Create counsellor_profiles record
    const { error: counsellorProfileError } = await adminClient
      .from('counsellor_profiles')
      .insert({
        id: counsellorUserId,
        title: data.title || 'Campus Counsellor',
        specialization: data.specialization || null,
        office_location: data.officeLocation,
        phone: data.phone || null,
        department_id: data.departmentId || null,
      });

    if (counsellorProfileError) {
      throw new Error(`Failed to initialize counsellor profile: ${counsellorProfileError.message}`);
    }

    // 5. Write content-free audit log entry
    await authRepository.createAuditLog({
      actorId: caller.id,
      action: 'COUNSELLOR_PROVISIONED',
      entityType: 'counsellor_profile',
      entityId: counsellorUserId,
      metadata: {
        email: data.email,
        title: data.title,
      },
    });

    return {
      success: true,
      counsellorId: counsellorUserId,
      email: data.email,
      message: 'Counsellor successfully provisioned and invitation sent.',
    };
  }
}

export const counsellorProvisioningService = new CounsellorProvisioningService();
