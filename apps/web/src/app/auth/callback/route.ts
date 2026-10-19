import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[OAuth Callback] Session exchange error:', error);
        return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
      }

      if (data?.user) {
        // Query user's profile to resolve role and verify active status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, is_active')
          .eq('id', data.user.id)
          .maybeSingle();

        // If user profile is not yet initialized (e.g. initial Google OAuth registration),
        // initialize standard student profile using admin or server client
        let userRole = profile?.role;
        let isActive = profile?.is_active ?? true;

        if (!profile) {
          const userMeta = data.user.user_metadata || {};
          const fullName =
            userMeta.full_name ||
            userMeta.name ||
            data.user.email?.split('@')[0] ||
            'Student';

          try {
            // Guarantee student role for public OAuth signup
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email || '',
                full_name: fullName,
                role: 'student',
                is_active: true,
              })
              .select('id, role, is_active')
              .maybeSingle();

            // Initialize student profile
            await supabase
              .from('student_profiles')
              .insert({
                id: data.user.id,
                username: null,
                prn: 'PRN-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                admission_year: new Date().getFullYear(),
                current_semester: 1,
              });

            // Initialize 8 semester slots
            for (let sem = 1; sem <= 8; sem++) {
              await supabase
                .from('student_semester_results')
                .insert({
                  student_id: data.user.id,
                  semester_number: sem,
                  sgpa: null,
                });
            }

            userRole = newProfile?.role || 'student';
            isActive = true;
          } catch (initErr) {
            console.warn('[OAuth Callback] Profile initialization fallback:', initErr);
            userRole = 'student';
          }
        }

        // Deactivated account check
        if (!isActive) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/auth/login?error=account_deactivated`);
        }

        // Honor explicit next destination if safe
        if (next && next.startsWith('/')) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        // Direct to designated role workspace
        if (userRole === 'admin') {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        } else if (userRole === 'counsellor') {
          return NextResponse.redirect(`${origin}/counsellor/dashboard`);
        } else {
          return NextResponse.redirect(`${origin}/student/chat`);
        }
      }
    } catch (err) {
      console.error('[OAuth Callback] Unexpected error:', err);
      return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
}
