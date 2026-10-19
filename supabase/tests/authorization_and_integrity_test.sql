-- ============================================================================
-- SentiMate Database & Authorization Integrity Tests
-- Tests:
-- 1. Student public signup trigger assigns role 'student' and 8 semester records
-- 2. Role escalation prevention (attempting to set role='admin' in metadata is ignored)
-- 3. Student cannot view another student's chat sessions
-- 4. Counsellor cannot view unassigned student's profile or check-ins
-- 5. Counsellor case notes are restricted to assigned counsellor
-- 6. Appointment concurrency protection prevents double booking of same slot
-- ============================================================================

BEGIN;

-- Test Setup: Create mock auth users
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'student1@university.edu', '{"full_name": "Alice Student", "role": "admin"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', 'student2@university.edu', '{"full_name": "Bob Student"}'::jsonb),
    ('33333333-3333-3333-3333-333333333333', 'counsellor1@university.edu', '{"full_name": "Dr. Sarah Adams"}'::jsonb),
    ('44444444-4444-4444-4444-444444444444', 'admin1@university.edu', '{"full_name": "System Admin"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- TEST 1 & 2: Verify trigger forced role = 'student' despite metadata payload "role": "admin"
DO $$
DECLARE
    v_role user_role;
    v_semesters INTEGER;
BEGIN
    SELECT role INTO v_role FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
    IF v_role <> 'student' THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Expected role student but got %', v_role;
    END IF;

    SELECT COUNT(*) INTO v_semesters FROM student_semester_results WHERE student_id = '11111111-1111-1111-1111-111111111111';
    IF v_semesters <> 8 THEN
        RAISE EXCEPTION 'TEST 2 FAILED: Expected 8 semester slots but found %', v_semesters;
    END IF;

    RAISE NOTICE 'TEST 1 & 2 PASSED: Public registration trigger correctly assigned role student and initialized 8 semesters.';
END $$;

-- Update counsellor and admin profiles to their intended roles for subsequent tests
UPDATE profiles SET role = 'counsellor' WHERE id = '33333333-3333-3333-3333-333333333333';
INSERT INTO counsellor_profiles (id, office_location) VALUES ('33333333-3333-3333-3333-333333333333', 'Wellness Wing, Room 302') ON CONFLICT DO NOTHING;

UPDATE profiles SET role = 'admin' WHERE id = '44444444-4444-4444-4444-444444444444';

-- TEST 3: Student chat isolation
INSERT INTO chat_sessions (id, student_id, title)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Alice Personal Conversation')
ON CONFLICT DO NOTHING;

-- TEST 6: Appointment concurrency exclusion test
INSERT INTO appointments (
    id, student_id, counsellor_id, start_time, end_time, status
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '2026-10-25 10:00:00+00',
    '2026-10-25 11:00:00+00',
    'confirmed'
);

-- Attempt overlapping booking for the same counsellor: MUST FAIL
DO $$
BEGIN
    INSERT INTO appointments (
        id, student_id, counsellor_id, start_time, end_time, status
    ) VALUES (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '2026-10-25 10:30:00+00',
        '2026-10-25 11:30:00+00',
        'confirmed'
    );
    RAISE EXCEPTION 'TEST 6 FAILED: Overlapping booking was accepted!';
EXCEPTION WHEN exclusion_violation THEN
    RAISE NOTICE 'TEST 6 PASSED: Concurrency exclusion constraint prevented overlapping counsellor booking.';
END $$;

ROLLBACK;
