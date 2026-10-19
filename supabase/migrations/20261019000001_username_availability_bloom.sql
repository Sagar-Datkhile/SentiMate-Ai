-- ============================================================================
-- Migration: 20261019000001_username_availability_bloom.sql
-- Description: Allow username to remain NULL until selected in My Profile;
--              Enforce lowercase ASCII username format and unique expression index.
-- ============================================================================

-- 1. Allow username to remain NULL until chosen by student in profile settings
ALTER TABLE student_profiles ALTER COLUMN username DROP NOT NULL;

-- 2. Add format check constraint for non-null usernames:
--    Lowercase alphanumeric with underscores and hyphens (3 to 30 characters)
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS chk_student_username_format;
ALTER TABLE student_profiles ADD CONSTRAINT chk_student_username_format
CHECK (username IS NULL OR (length(trim(username)) >= 3 AND length(trim(username)) <= 30 AND username ~ '^[a-z0-9_-]+$'));

-- 3. Authoritative unique expression index on LOWER(username) for non-null entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_username_lower
ON student_profiles (LOWER(username)) WHERE username IS NOT NULL;

-- 4. Update signup trigger so newly registered students start with NULL username
--    until they configure it in My Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        is_active
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student', -- FORCED DEFAULT: Never trust user_meta_data for role elevation
        TRUE
    );

    INSERT INTO public.student_profiles (
        id,
        username,
        prn,
        admission_year,
        current_semester
    ) VALUES (
        NEW.id,
        NULL, -- Allows student to select and claim username in My Profile
        'PRN-' || substr(md5(random()::text), 1, 8),
        EXTRACT(YEAR FROM now())::INTEGER,
        1
    );

    INSERT INTO public.student_semester_results (student_id, semester_number, sgpa)
    SELECT NEW.id, s, NULL
    FROM generate_series(1, 8) AS s;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
