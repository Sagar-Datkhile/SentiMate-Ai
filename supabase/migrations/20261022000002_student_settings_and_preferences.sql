-- ============================================================================
-- SentiMate Migration: Student Settings, Preferences, Consent RLS & Support
-- Version: 20261022000002
-- Purpose:
--   1. Create user_preferences table for appearance, chat, and notification settings
--   2. Add RLS policies for user_preferences (strict user ownership)
--   3. Add student self-service RLS policies for consent_events
--   4. Create support_inquiries table for Contact Support & Problem Reports
--   5. Add RLS policies for support_inquiries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USER PREFERENCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Appearance
    theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    text_size TEXT NOT NULL DEFAULT 'default' CHECK (text_size IN ('small', 'default', 'large')),
    reduced_animations BOOLEAN NOT NULL DEFAULT FALSE,
    -- Chat Preferences
    enter_to_send BOOLEAN NOT NULL DEFAULT TRUE,
    response_language TEXT NOT NULL DEFAULT 'auto',
    response_length TEXT NOT NULL DEFAULT 'balanced' CHECK (response_length IN ('concise', 'balanced', 'detailed')),
    -- Notifications
    email_appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    email_counsellor_updates BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_counsellor_updates BOOLEAN NOT NULL DEFAULT TRUE,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- User Ownership Policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. CONSENT EVENTS SELF-SERVICE RLS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view own consent events" ON public.consent_events;
CREATE POLICY "Students can view own consent events"
    ON public.consent_events FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own consent events" ON public.consent_events;
CREATE POLICY "Students can insert own consent events"
    ON public.consent_events FOR INSERT
    TO authenticated
    WITH CHECK (student_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. SUPPORT INQUIRIES & ISSUE REPORTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('contact_support', 'report_problem')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    include_diagnostic_context BOOLEAN NOT NULL DEFAULT FALSE,
    diagnostic_context JSONB,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own support inquiries" ON public.support_inquiries;
CREATE POLICY "Users can view own support inquiries"
    ON public.support_inquiries FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own support inquiries" ON public.support_inquiries;
CREATE POLICY "Users can insert own support inquiries"
    ON public.support_inquiries FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
