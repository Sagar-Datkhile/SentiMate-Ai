-- ============================================================================
-- Migration: 20261019000000_init_sentimate_schema.sql
-- Description: Core SentiMate Database Schema, RLS Policies, and Triggers
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'counsellor', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'case_status') THEN
        CREATE TYPE case_status AS ENUM ('submitted', 'acknowledged', 'contacted', 'in_progress', 'follow_up', 'resolved', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_priority') THEN
        CREATE TYPE referral_priority AS ENUM ('routine', 'medium', 'urgent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status') THEN
        CREATE TYPE referral_status AS ENUM ('pending', 'accepted', 'declined', 'completed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE appointment_status AS ENUM ('requested', 'confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
        CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'elevated', 'high');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
        CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_type') THEN
        CREATE TYPE consent_type AS ENUM ('ai_chat_processing', 'nlp_sentiment_analysis', 'counsellor_data_sharing', 'academic_record_correlation');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'consent_status') THEN
        CREATE TYPE consent_status AS ENUM ('granted', 'revoked');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_rights_type') THEN
        CREATE TYPE data_rights_type AS ENUM ('export_all_data', 'delete_account', 'anonymize_records');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'processing', 'completed', 'rejected');
    END IF;
END $$;

-- 1. INSTITUTIONS & DEPARTMENTS
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    grading_scale_max NUMERIC(4, 2) NOT NULL DEFAULT 10.00,
    service_hours_start TIME NOT NULL DEFAULT '08:00:00',
    service_hours_end TIME NOT NULL DEFAULT '18:00:00',
    contact_email TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(institution_id, code)
);

-- 2. PROFILES & ROLE-SPECIFIC ENTITIES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'student',
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    prn TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    admission_year INTEGER NOT NULL,
    current_semester INTEGER NOT NULL CHECK (current_semester BETWEEN 1 AND 8),
    about TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_prn UNIQUE (prn)
);

CREATE TABLE IF NOT EXISTS student_semester_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    semester_number INTEGER NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    sgpa NUMERIC(4, 2) CHECK (sgpa IS NULL OR (sgpa >= 0.00 AND sgpa <= 10.00)),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, semester_number)
);

CREATE TABLE IF NOT EXISTS counsellor_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Campus Counsellor',
    specialization TEXT,
    office_location TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    max_active_cases INTEGER NOT NULL DEFAULT 30,
    is_accepting_cases BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS student_counsellor_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    counsellor_id UUID NOT NULL REFERENCES counsellor_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, counsellor_id)
);

-- 3. CONSENT EVENTS
CREATE TABLE IF NOT EXISTS consent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    consent_type consent_type NOT NULL,
    status consent_status NOT NULL,
    terms_version TEXT NOT NULL DEFAULT '1.0',
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. CHAT SESSIONS & MESSAGES
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model_version TEXT,
    token_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. WELLBEING CHECKINS
CREATE TABLE IF NOT EXISTS wellbeing_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
    sleep_hours NUMERIC(3, 1) CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24)),
    stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    social_connectedness INTEGER CHECK (social_connectedness BETWEEN 1 AND 5),
    academic_pressure INTEGER CHECK (academic_pressure BETWEEN 1 AND 5),
    notes TEXT,
    shared_with_counsellor BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. ANALYSIS JOBS, SIGNALS, ASSESSMENTS & SHAP EXPLANATIONS
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('chat_message', 'wellbeing_checkin', 'aggregate')),
    source_id UUID NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS text_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES analysis_jobs(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    source_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    sentiment_label TEXT NOT NULL,
    sentiment_score NUMERIC(5, 4) NOT NULL,
    emotion_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    linguistic_cues JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_checkpoint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS support_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES analysis_jobs(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    risk_level risk_level NOT NULL,
    confidence_score NUMERIC(5, 4) NOT NULL,
    model_version TEXT NOT NULL,
    is_rules_based_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS assessment_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES support_assessments(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    shap_value NUMERIC(7, 4) NOT NULL,
    feature_value TEXT NOT NULL,
    importance_rank INTEGER NOT NULL,
    human_explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. SUPPORT REFERRALS, CASES & CASE NOTES
CREATE TABLE IF NOT EXISTS support_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    preferred_counsellor_id UUID REFERENCES counsellor_profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    share_recent_checkins BOOLEAN NOT NULL DEFAULT TRUE,
    share_academic_history BOOLEAN NOT NULL DEFAULT FALSE,
    priority referral_priority NOT NULL DEFAULT 'routine',
    status referral_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    counsellor_id UUID NOT NULL REFERENCES counsellor_profiles(id) ON DELETE RESTRICT,
    referral_id UUID REFERENCES support_referrals(id) ON DELETE SET NULL,
    status case_status NOT NULL DEFAULT 'submitted',
    counsellor_assessment TEXT,
    priority referral_priority NOT NULL DEFAULT 'routine',
    next_follow_up_date DATE,
    reopen_reason TEXT,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS case_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES counsellor_profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    note_content TEXT NOT NULL,
    is_confidential BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    from_status case_status,
    to_status case_status NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. AVAILABILITY SLOTS & APPOINTMENTS
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counsellor_id UUID NOT NULL REFERENCES counsellor_profiles(id) ON DELETE CASCADE,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_slot_time CHECK (slot_end > slot_start),
    CONSTRAINT uq_counsellor_slot_exclude EXCLUDE USING gist (
        counsellor_id WITH =,
        tstzrange(slot_start, slot_end, '[)') WITH &&
    )
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    counsellor_id UUID NOT NULL REFERENCES counsellor_profiles(id) ON DELETE RESTRICT,
    slot_id UUID UNIQUE REFERENCES availability_slots(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'requested',
    meeting_link TEXT,
    location_details TEXT,
    student_notes TEXT,
    counsellor_notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_appointment_time CHECK (end_time > start_time),
    CONSTRAINT uq_counsellor_active_booking EXCLUDE USING gist (
        counsellor_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status IN ('requested', 'confirmed'))
);

-- 9. RESOURCES, NOTIFICATIONS, AUDIT & DATA RIGHTS
CREATE TABLE IF NOT EXISTS support_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    phone TEXT,
    url TEXT,
    available_hours TEXT NOT NULL DEFAULT '24/7',
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    ip_hash TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS data_rights_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_type data_rights_type NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    resolution_notes TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE & LOOKUPS
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_student_created ON wellbeing_checkins(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_student_counsellor ON cases(student_id, counsellor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_semester_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsellor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_counsellor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellbeing_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_rights_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Counsellors view assigned students" ON profiles;
CREATE POLICY "Counsellors view assigned students" ON profiles FOR SELECT USING (
    auth_user_role() = 'counsellor' AND id IN (
        SELECT student_id FROM student_counsellor_assignments WHERE counsellor_id = auth.uid() AND is_active = TRUE
    )
);

DROP POLICY IF EXISTS "Admins full manage profiles" ON profiles;
CREATE POLICY "Admins full manage profiles" ON profiles FOR ALL USING (auth_user_role() = 'admin');

-- Student Profiles & Semesters
DROP POLICY IF EXISTS "Students view/update own student profile" ON student_profiles;
CREATE POLICY "Students view/update own student profile" ON student_profiles FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "Counsellors view assigned student profile" ON student_profiles;
CREATE POLICY "Counsellors view assigned student profile" ON student_profiles FOR SELECT USING (
    auth_user_role() = 'counsellor' AND id IN (
        SELECT student_id FROM student_counsellor_assignments WHERE counsellor_id = auth.uid() AND is_active = TRUE
    )
);

DROP POLICY IF EXISTS "Students view/update own semester results" ON student_semester_results;
CREATE POLICY "Students view/update own semester results" ON student_semester_results FOR ALL USING (student_id = auth.uid());

-- Chat Sessions & Messages (STUDENTS ONLY)
DROP POLICY IF EXISTS "Students manage own chat sessions" ON chat_sessions;
CREATE POLICY "Students manage own chat sessions" ON chat_sessions FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students manage own chat messages" ON chat_messages;
CREATE POLICY "Students manage own chat messages" ON chat_messages FOR ALL USING (
    session_id IN (SELECT id FROM chat_sessions WHERE student_id = auth.uid())
);

-- Case Notes (COUNSELLORS ONLY)
DROP POLICY IF EXISTS "Counsellors manage own case notes" ON case_notes;
CREATE POLICY "Counsellors manage own case notes" ON case_notes FOR ALL USING (
    auth_user_role() = 'counsellor' AND case_id IN (
        SELECT id FROM cases WHERE counsellor_id = auth.uid()
    )
);

-- Appointments
DROP POLICY IF EXISTS "Users view own appointments" ON appointments;
CREATE POLICY "Users view own appointments" ON appointments FOR SELECT USING (
    student_id = auth.uid() OR counsellor_id = auth.uid() OR auth_user_role() = 'admin'
);

DROP POLICY IF EXISTS "Students request appointments" ON appointments;
CREATE POLICY "Students request appointments" ON appointments FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Participants update appointments" ON appointments;
CREATE POLICY "Participants update appointments" ON appointments FOR UPDATE USING (
    student_id = auth.uid() OR counsellor_id = auth.uid()
);

-- Resources
DROP POLICY IF EXISTS "Users view active resources" ON support_resources;
CREATE POLICY "Users view active resources" ON support_resources FOR SELECT TO authenticated USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins manage resources" ON support_resources;
CREATE POLICY "Admins manage resources" ON support_resources FOR ALL USING (auth_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- SECURE PUBLIC REGISTRATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
        LOWER(split_part(NEW.email, '@', 1)),
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
