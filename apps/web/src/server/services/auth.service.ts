import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authRepository, UserProfileRecord } from '@/server/repositories/auth.repository';
import type { SignUpRequest, SignInRequest, UserRole } from '@sentimate/contracts';

export class AuthService {
  /**
   * Public Student Signup.
   * GUARANTEE: Always creates a student account. Any elevated role in input is strictly ignored.
   */
  async registerStudent(data: SignUpRequest) {
    const supabase = await createServerSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          // Intentionally omitting 'role' to guarantee database trigger defaults to 'student'
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Registration failed to initialize user' };
    }

    return {
      success: true,
      user: authData.user,
      requiresEmailConfirmation: !authData.session,
    };
  }

  /**
   * User Sign In & Role Route Resolution
   */
  async login(data: SignInRequest) {
    const supabase = await createServerSupabaseClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Invalid credentials' };
    }

    // Fetch user profile and verify account status
    const profile = await authRepository.getCurrentUserProfile();

    if (!profile) {
      // If profile hasn't loaded or user record is uninitialized
      return {
        success: true,
        user: authData.user,
        role: 'student' as UserRole,
        redirectTo: '/student/chat',
      };
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your institution administrator.',
      };
    }

    const redirectTo = this.getRoleRedirectPath(profile.role);

    return {
      success: true,
      user: authData.user,
      profile,
      role: profile.role,
      redirectTo,
    };
  }

  /**
   * Map user role to its designated primary workspace path
   */
  getRoleRedirectPath(role: UserRole): string {
    switch (role) {
      case 'student':
        return '/student/chat';
      case 'counsellor':
        return '/counsellor/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/student/chat';
    }
  }

  /**
   * Current user session guard
   */
  async requireAuth(allowedRoles?: UserRole[]): Promise<{
    user: any;
    profile: UserProfileRecord;
  }> {
    const profile = await authRepository.getCurrentUserProfile();

    if (!profile) {
      throw new Error('UNAUTHORIZED: No active user session');
    }

    if (!profile.is_active) {
      throw new Error('FORBIDDEN: Account is deactivated');
    }

    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      throw new Error(`FORBIDDEN: User role '${profile.role}' lacks access to this resource`);
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { user, profile };
  }

  /**
   * Sign Out
   */
  async logout() {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
    return { success: true };
  }
}

export const authService = new AuthService();
