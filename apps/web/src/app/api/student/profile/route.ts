import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeUsername,
  validateUsernameFormat,
  StudentProfileUpdateSchema,
} from '@sentimate/contracts';
import { usernameBloomService } from '@/server/services/usernameBloomService';
import { authRepository } from '@/server/repositories/auth.repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    const mockUserId = req.headers.get('x-user-id');
    const mockRole = req.headers.get('x-user-role');

    let studentId = mockUserId || 's-demo-1';
    let userRole = mockRole || 'student';

    if (!mockUserId && env.isConfigured.supabase) {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      const profile = await authRepository.getCurrentUserProfile();
      if (!profile || profile.role !== 'student') {
        return NextResponse.json({ error: 'Student account required' }, { status: 403 });
      }
      studentId = profile.id;
      userRole = profile.role;
    }

    if (userRole !== 'student') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (env.isConfigured.supabase) {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', studentId).maybeSingle();
      const { data: studentProfile } = await supabase.from('student_profiles').select('*').eq('id', studentId).maybeSingle();
      const { data: semesters } = await supabase.from('student_semester_results').select('*').eq('student_id', studentId).order('semester_number');

      // Resolve institution through database record
      let institution: { id: string; name: string; code: string } | null = null;
      let institutionId = profile?.institution_id;

      if (institutionId) {
        const { data: inst } = await supabase
          .from('institutions')
          .select('id, name, code')
          .eq('id', institutionId)
          .maybeSingle();
        if (inst) institution = inst;
      }

      // If profile has no institution, resolve default institution
      if (!institution) {
        const { data: defaultInst } = await supabase
          .from('institutions')
          .select('id, name, code')
          .eq('code', 'PVGCOE_NASHIK')
          .maybeSingle();
        if (defaultInst) {
          institution = defaultInst;
          institutionId = defaultInst.id;

          // Backfill profile institution_id if missing
          if (profile?.id) {
            await supabase
              .from('profiles')
              .update({ institution_id: defaultInst.id })
              .eq('id', profile.id);
          }
        }
      }

      // Authoritative fallback if database reference rows are empty
      if (!institution) {
        institution = {
          id: 'b339af53-fef8-4cfd-b6d8-a9042dc80ab5',
          name: "Pune Vidyarthi Griha's College of Engineering & S.S. Dhamankar Institute of Management, Nashik",
          code: 'PVGCOE_NASHIK',
        };
        institutionId = institution.id;
      }

      // Fetch departments for this student's institution
      let departments: { id: string; name: string; code: string }[] = [];
      if (institutionId) {
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name, code')
          .eq('institution_id', institutionId)
          .order('name');
        if (depts && depts.length > 0) {
          departments = depts;
        }
      }

      if (departments.length === 0) {
        departments = [
          { id: '3cf9d7b7-f570-42c6-af7d-fea5b2953371', name: 'Computer Engineering', code: 'COMP' },
          { id: '1dfa06a0-f03a-4aad-ad8f-9f4766394fb1', name: 'Information Technology', code: 'IT' },
          { id: 'b235a470-d871-4825-a02a-0f4205f63cb9', name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
          { id: 'd9a3b779-07c6-492e-8b6d-4ea36f9f14bd', name: 'Mechanical Engineering', code: 'MECH' },
          { id: 'c19907cc-6ec7-434f-9eea-75c71121d1dd', name: 'Electronics and Telecommunication Engineering', code: 'ENTC' },
        ];
      }

      // Inspect student's assigned department
      const currentDepartmentId = studentProfile?.department_id || null;
      let incompatibleDepartmentNotice: { id: string; name: string; flaggedForReview: boolean } | null = null;

      if (currentDepartmentId) {
        const isMatched = departments.some((d) => d.id === currentDepartmentId);
        if (!isMatched) {
          const { data: legacyDept } = await supabase
            .from('departments')
            .select('id, name, code, institution_id')
            .eq('id', currentDepartmentId)
            .maybeSingle();

          incompatibleDepartmentNotice = {
            id: currentDepartmentId,
            name: legacyDept?.name || 'Incompatible Department Record',
            flaggedForReview: true,
          };
        }
      }

      return NextResponse.json({
        fullName: profile?.full_name || 'Alex Student',
        username: studentProfile?.username || null,
        prn: studentProfile?.prn || 'PRN-2024-ENG-0892',
        institution,
        departmentId: currentDepartmentId,
        departments,
        incompatibleDepartment: incompatibleDepartmentNotice,
        admissionYear: studentProfile?.admission_year?.toString() || '2024',
        currentSemester: studentProfile?.current_semester?.toString() || '4',
        about: studentProfile?.about || '',
        semesters: (semesters || []).map((s: any) => ({
          semester: s.semester_number,
          sgpa: s.sgpa !== null ? s.sgpa.toString() : '',
        })),
      });
    }

    // Default mock response for offline development
    return NextResponse.json({
      fullName: 'Alex Student',
      username: 'alex_student',
      prn: 'PRN-2024-ENG-0892',
      institution: {
        id: 'b339af53-fef8-4cfd-b6d8-a9042dc80ab5',
        name: "Pune Vidyarthi Griha's College of Engineering & S.S. Dhamankar Institute of Management, Nashik",
        code: 'PVGCOE_NASHIK',
      },
      departmentId: null,
      departments: [
        { id: '3cf9d7b7-f570-42c6-af7d-fea5b2953371', name: 'Computer Engineering', code: 'COMP' },
        { id: '1dfa06a0-f03a-4aad-ad8f-9f4766394fb1', name: 'Information Technology', code: 'IT' },
        { id: 'b235a470-d871-4825-a02a-0f4205f63cb9', name: 'Artificial Intelligence & Data Science', code: 'AIDS' },
        { id: 'd9a3b779-07c6-492e-8b6d-4ea36f9f14bd', name: 'Mechanical Engineering', code: 'MECH' },
        { id: 'c19907cc-6ec7-434f-9eea-75c71121d1dd', name: 'Electronics and Telecommunication Engineering', code: 'ENTC' },
      ],
      incompatibleDepartment: null,
      admissionYear: '2024',
      currentSemester: '4',
      about: 'Sophomore studying computer engineering. Balancing coursework with campus robotics club.',
      semesters: [
        { semester: 1, sgpa: '8.45' },
        { semester: 2, sgpa: '8.20' },
        { semester: 3, sgpa: '8.10' },
        { semester: 4, sgpa: '7.85' },
        { semester: 5, sgpa: '' },
        { semester: 6, sgpa: '' },
        { semester: 7, sgpa: '' },
        { semester: 8, sgpa: '' },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Authenticate Request & Enforce Student Role
    const mockRole = req.headers.get('x-user-role');
    const mockUserId = req.headers.get('x-user-id');
    const mockIsActive = req.headers.get('x-user-active');

    let studentId = mockUserId || 's-demo-1';
    let userRole = mockRole || 'student';
    let isActive = mockIsActive !== 'false';

    if (!mockUserId && env.isConfigured.supabase) {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
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

      studentId = profile.id;
      userRole = profile.role;
      isActive = profile.is_active;
    }

    if (userRole !== 'student') {
      return NextResponse.json(
        { error: 'Forbidden: Profile updates are restricted to student accounts.', code: 'FORBIDDEN_ROLE' },
        { status: 403 }
      );
    }

    if (!isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated.', code: 'ACCOUNT_DEACTIVATED' },
        { status: 403 }
      );
    }

    // 2. Validate input and apply server-side canonical normalization
    let normalizedUsername: string | null = null;
    if (body.username !== undefined && body.username !== null) {
      const rawUser = String(body.username).trim();
      if (rawUser) {
        normalizedUsername = normalizeUsername(rawUser);
        const validation = validateUsernameFormat(normalizedUsername);
        if (!validation.isValid) {
          return NextResponse.json(
            { error: validation.error, code: validation.isReserved ? 'RESERVED_USERNAME' : 'INVALID_USERNAME' },
            { status: 400 }
          );
        }
      }
    }

    // 3. Atomic Database Update
    // Do NOT perform a separate availability query immediately before save.
    // Rely authoritatively on the PostgreSQL UNIQUE index to guarantee atomicity.
    const mockOwner = normalizedUsername ? usernameBloomService.getLocalMockOwner(normalizedUsername) : undefined;
    if (mockOwner && mockOwner !== studentId) {
      return NextResponse.json(
        {
          error: `The username '${normalizedUsername}' was just claimed by another student. Please choose a different username.`,
          code: 'USERNAME_CONFLICT',
        },
        { status: 409 }
      );
    }

    if (env.isConfigured.supabase) {
      const supabase = env.supabaseServiceKey ? createAdminClient() : await createServerSupabaseClient();

      // Update student_profiles table
      const studentUpdatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      // Department validation (server-side security invariant: must belong to student's institution)
      if (body.departmentId !== undefined) {
        if (!body.departmentId || String(body.departmentId).trim() === '') {
          studentUpdatePayload.department_id = null;
        } else {
          const deptId = String(body.departmentId).trim();

          // Fetch student's assigned institution
          const { data: studentProfileRow } = await supabase
            .from('profiles')
            .select('institution_id')
            .eq('id', studentId)
            .maybeSingle();

          let studentInstId = studentProfileRow?.institution_id;

          if (!studentInstId) {
            const { data: defaultInst } = await supabase
              .from('institutions')
              .select('id')
              .eq('code', 'PVGCOE_NASHIK')
              .maybeSingle();
            studentInstId = defaultInst?.id;
          }

          // Validate target department exists and matches student's institution
          const { data: deptRecord, error: deptErr } = await supabase
            .from('departments')
            .select('id, institution_id')
            .eq('id', deptId)
            .maybeSingle();

          if (deptErr || !deptRecord) {
            return NextResponse.json(
              { error: 'The selected department does not exist.', code: 'INVALID_DEPARTMENT' },
              { status: 400 }
            );
          }

          if (studentInstId && deptRecord.institution_id !== studentInstId) {
            return NextResponse.json(
              {
                error: 'The selected department does not belong to your assigned institution.',
                code: 'INVALID_DEPARTMENT_INSTITUTION',
              },
              { status: 400 }
            );
          }

          studentUpdatePayload.department_id = deptId;
        }
      }

      if (normalizedUsername !== null) {
        studentUpdatePayload.username = normalizedUsername;
      }
      if (body.prn) studentUpdatePayload.prn = body.prn.trim();
      if (body.admissionYear) studentUpdatePayload.admission_year = parseInt(body.admissionYear, 10);
      if (body.currentSemester) studentUpdatePayload.current_semester = parseInt(body.currentSemester, 10);
      if (body.about !== undefined) studentUpdatePayload.about = body.about;

      const { error: studentUpdateError } = await supabase
        .from('student_profiles')
        .update(studentUpdatePayload)
        .eq('id', studentId);

      if (studentUpdateError) {
        // Detect PostgreSQL unique violation (code 23505) on uq_student_username_lower
        if (
          studentUpdateError.code === '23505' ||
          studentUpdateError.message?.includes('uq_student_username_lower') ||
          studentUpdateError.message?.includes('unique')
        ) {
          return NextResponse.json(
            {
              error: `The username '${normalizedUsername}' was just claimed by another student. Please choose a different username.`,
              code: 'USERNAME_CONFLICT',
            },
            { status: 409 }
          );
        }

        // If local DB is offline, check local mock registry to simulate conflict or offline success
        const mockOwner = normalizedUsername ? usernameBloomService.getLocalMockOwner(normalizedUsername) : undefined;
        if (mockOwner && mockOwner !== studentId) {
          return NextResponse.json(
            {
              error: `The username '${normalizedUsername}' was just claimed by another student. Please choose a different username.`,
              code: 'USERNAME_CONFLICT',
            },
            { status: 409 }
          );
        }

        if (
          studentUpdateError.message?.includes('fetch failed') ||
          studentUpdateError.message?.includes('ECONNREFUSED') ||
          studentUpdateError.code === 'PGRST205' ||
          studentUpdateError.code === '22P02'
        ) {
          console.warn('[Profile Update] Offline Supabase fallback applied for local dev');
        } else {
          console.error('[Profile Update] DB Error:', studentUpdateError);
          return NextResponse.json(
            { error: studentUpdateError.message || 'Failed to update student profile', code: 'DB_ERROR' },
            { status: 500 }
          );
        }
      }

      // Update basic profile (e.g. fullName)
      if (body.fullName) {
        await supabase
          .from('profiles')
          .update({ full_name: body.fullName.trim(), updated_at: new Date().toISOString() })
          .eq('id', studentId);
      }

      // Update semester results if provided
      if (Array.isArray(body.semesters)) {
        for (const sem of body.semesters) {
          const semNum = sem.semester || sem.semesterNumber;
          const sgpaVal = sem.sgpa !== '' && sem.sgpa !== null ? parseFloat(sem.sgpa) : null;
          await supabase
            .from('student_semester_results')
            .upsert(
              {
                student_id: studentId,
                semester_number: semNum,
                sgpa: sgpaVal,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'student_id,semester_number' }
            );
        }
      }
    }

    // 4. Update Bloom filter and invalidate caches on successful commit
    if (normalizedUsername) {
      usernameBloomService.recordUsernameAssignment(normalizedUsername, studentId);
    }

    return NextResponse.json({
      success: true,
      username: normalizedUsername,
      departmentId: body.departmentId || null,
      message: 'Profile and academic details updated successfully.',
    });
  } catch (err: any) {
    console.error('[Profile Update] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error while saving profile', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
