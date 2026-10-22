-- ============================================================================
-- Migration: 20261023000002_student_notifications_center.sql
-- Module: Student In-App Notification Center
-- ============================================================================

-- 1. ENSURE BASE notifications TABLE EXISTS WITH ALL ADDITIVE COLUMNS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add additive columns if notifications was created by prior schema
DO $$ 
BEGIN
    -- Category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='category') THEN
        ALTER TABLE public.notifications ADD COLUMN category TEXT NOT NULL DEFAULT 'system';
    END IF;

    -- Event ID (for idempotent generation)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='event_id') THEN
        ALTER TABLE public.notifications ADD COLUMN event_id TEXT UNIQUE;
    END IF;

    -- Source reference (e.g. ticket REF-ID, appointment UUID)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='source_reference') THEN
        ALTER TABLE public.notifications ADD COLUMN source_reference TEXT;
    END IF;

    -- Read at timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='read_at') THEN
        ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ;
    END IF;

    -- Dismissed at timestamp (for clear all / soft dismissal)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='dismissed_at') THEN
        ALTER TABLE public.notifications ADD COLUMN dismissed_at TIMESTAMPTZ;
    END IF;

    -- Extra metadata (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Update category check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_category_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_category_check 
    CHECK (category IN ('support', 'appointment', 'counsellor', 'announcement', 'system'));

-- 2. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_user_active 
    ON public.notifications(user_id, dismissed_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications(user_id, is_read) 
    WHERE is_read = FALSE AND dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_event_id 
    ON public.notifications(event_id);

CREATE INDEX IF NOT EXISTS idx_notifications_category 
    ON public.notifications(category);

-- 3. ROW-LEVEL SECURITY POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Students view own non-dismissed notifications
DROP POLICY IF EXISTS "Students view own active notifications" ON public.notifications;
CREATE POLICY "Students view own active notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() 
        AND dismissed_at IS NULL
    );

-- Admins can view all notifications for oversight
DROP POLICY IF EXISTS "Admins view all notifications" ON public.notifications;
CREATE POLICY "Admins view all notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Students can update read and dismissed state on own notifications only
DROP POLICY IF EXISTS "Students update own notification status" ON public.notifications;
CREATE POLICY "Students update own notification status"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Only admins and trusted server operations can insert notifications
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 4. ENABLE REALTIME REPLICATION IF PUBLICATION EXISTS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        END IF;
    END IF;
END $$;
