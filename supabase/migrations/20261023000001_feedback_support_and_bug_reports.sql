-- ============================================================================
-- Migration: 20261023000001_feedback_support_and_bug_reports.sql
-- Module: Feedback, Enquiry, Support, and Bug Report System
-- ============================================================================

-- 1. ADD EXTENSIONS AND COLUMNS TO support_inquiries
DO $$ 
BEGIN
    -- Reference ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='reference_id') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN reference_id TEXT UNIQUE;
    END IF;

    -- Submitter snapshot fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='submitter_email') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN submitter_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='submitter_name') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN submitter_name TEXT;
    END IF;

    -- Structured bug reproduction fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='reproduction_steps') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN reproduction_steps TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='expected_behavior') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN expected_behavior TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='actual_behavior') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN actual_behavior TEXT;
    END IF;

    -- Idempotency key
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='idempotency_key') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN idempotency_key TEXT UNIQUE;
    END IF;

    -- Email delivery status tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='email_delivery_status') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN email_delivery_status TEXT NOT NULL DEFAULT 'queued';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='email_delivery_attempts') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN email_delivery_attempts INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='email_last_error') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN email_last_error TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='email_recipients') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN email_recipients TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='support_inquiries' AND column_name='updated_at') THEN
        ALTER TABLE public.support_inquiries ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Populate default reference_ids for any legacy records
UPDATE public.support_inquiries
SET reference_id = 'REF-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substring(id::text from 1 for 6))
WHERE reference_id IS NULL;

-- Ensure reference_id has an automatic default generator so inserts without reference_id never fail
ALTER TABLE public.support_inquiries 
    ALTER COLUMN reference_id SET DEFAULT ('REF-' || to_char(timezone('utc'::text, now()), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 6)));

ALTER TABLE public.support_inquiries ALTER COLUMN reference_id SET NOT NULL;

-- Update status check constraint to support 'new', 'open', 'in_progress', 'resolved', 'closed'
ALTER TABLE public.support_inquiries DROP CONSTRAINT IF EXISTS support_inquiries_status_check;
ALTER TABLE public.support_inquiries ADD CONSTRAINT support_inquiries_status_check 
    CHECK (status IN ('new', 'open', 'in_progress', 'resolved', 'closed'));
ALTER TABLE public.support_inquiries ALTER COLUMN status SET DEFAULT 'open';

-- 2. PROTECTED ADMIN TRIAGE METADATA (Internal notes & priority isolated from students)
CREATE TABLE IF NOT EXISTS public.support_inquiry_admin_metadata (
    inquiry_id UUID PRIMARY KEY REFERENCES public.support_inquiries(id) ON DELETE CASCADE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    internal_notes TEXT DEFAULT '',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_inquiry_admin_metadata ENABLE ROW LEVEL SECURITY;

-- 3. ADMIN TRIAGE AUDIT EVENTS
CREATE TABLE IF NOT EXISTS public.support_inquiry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES public.support_inquiries(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_email TEXT,
    action TEXT NOT NULL,
    old_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_inquiry_events ENABLE ROW LEVEL SECURITY;

-- 4. DURABLE EMAIL OUTBOX JOBS
CREATE TABLE IF NOT EXISTS public.email_outbox_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inquiry_id UUID NOT NULL REFERENCES public.support_inquiries(id) ON DELETE CASCADE,
    recipients TEXT[] NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,
    reply_to TEXT,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    last_error TEXT,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ
);

ALTER TABLE public.email_outbox_jobs ENABLE ROW LEVEL SECURITY;

-- 5. ROW-LEVEL SECURITY POLICIES

-- support_inquiries: Admins can view all inquiries
DROP POLICY IF EXISTS "Admins can view all support inquiries" ON public.support_inquiries;
CREATE POLICY "Admins can view all support inquiries"
    ON public.support_inquiries FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- support_inquiries: Admins can update status
DROP POLICY IF EXISTS "Admins can update support inquiries status" ON public.support_inquiries;
CREATE POLICY "Admins can update support inquiries status"
    ON public.support_inquiries FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- support_inquiry_admin_metadata: Accessible ONLY to admins (students have 0 access)
DROP POLICY IF EXISTS "Admins have full access to inquiry metadata" ON public.support_inquiry_admin_metadata;
CREATE POLICY "Admins have full access to inquiry metadata"
    ON public.support_inquiry_admin_metadata FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- support_inquiry_events: Admins only
DROP POLICY IF EXISTS "Admins have full access to inquiry audit events" ON public.support_inquiry_events;
CREATE POLICY "Admins have full access to inquiry audit events"
    ON public.support_inquiry_events FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- email_outbox_jobs: Admins only
DROP POLICY IF EXISTS "Admins can access email outbox" ON public.email_outbox_jobs;
CREATE POLICY "Admins can access email outbox"
    ON public.email_outbox_jobs FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_support_inquiries_user_id ON public.support_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_category ON public.support_inquiries(category);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_status ON public.support_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_created_at ON public.support_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_ref_id ON public.support_inquiries(reference_id);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_idempotency ON public.support_inquiries(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_support_inquiry_meta_priority ON public.support_inquiry_admin_metadata(priority);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status_attempt ON public.email_outbox_jobs(status, next_attempt_at);
