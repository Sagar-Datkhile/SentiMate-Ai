-- ============================================================================
-- Migration: Chat Persistence with Compressed Message Content
-- Version:   20261022000000
-- Purpose:   Add last_activity_at to chat_sessions; add compressed content
--            columns to chat_messages; add supporting indexes.
--            Existing plaintext content column is preserved and kept NOT NULL
--            so legacy rows remain fully readable without any rewrite.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. chat_sessions — add last_activity_at
--    Tracks the most recent message save time for recent-first ordering.
--    Defaults to created_at so existing rows get a sensible initial value.
-- ----------------------------------------------------------------------------
ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Back-fill existing sessions: use updated_at as a proxy for prior activity
UPDATE chat_sessions
SET    last_activity_at = updated_at
WHERE  last_activity_at IS NULL;

-- After back-fill, tighten with a server-side default going forward
ALTER TABLE chat_sessions
  ALTER COLUMN last_activity_at SET DEFAULT timezone('utc'::text, now());

-- ----------------------------------------------------------------------------
-- 2. chat_messages — compressed content columns
--
--    content          TEXT NOT NULL  — legacy plaintext (kept, never dropped)
--    content_compressed BYTEA        — gzip-compressed message bytes (new rows)
--    encoding_version   TEXT         — 'gzip/1' or 'identity/1'
--    original_byte_length INTEGER    — uncompressed UTF-8 byte size
--
--    Authoritative representation rule:
--      * New writes populate content_compressed + encoding_version +
--        original_byte_length.  content is set to '' (empty) for new rows to
--        satisfy the NOT NULL constraint without duplicate storage.
--      * Legacy rows have content_compressed IS NULL; read path falls back to
--        the content column automatically.
--      * The application NEVER stores both a non-empty content AND a non-null
--        content_compressed for the same row.
-- ----------------------------------------------------------------------------
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS content_compressed   BYTEA,
  ADD COLUMN IF NOT EXISTS encoding_version     TEXT
    CHECK (encoding_version IS NULL OR encoding_version IN ('gzip/1', 'identity/1')),
  ADD COLUMN IF NOT EXISTS original_byte_length INTEGER
    CHECK (original_byte_length IS NULL OR original_byte_length >= 0);

-- Partial index: only on rows that carry compressed content
CREATE INDEX IF NOT EXISTS idx_chat_messages_compressed_session
  ON chat_messages (session_id, created_at)
  WHERE content_compressed IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Indexes for session ordering and message pagination
-- ----------------------------------------------------------------------------

-- Recent-first session list (the primary retrieval order)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_student_activity
  ON chat_sessions (student_id, last_activity_at DESC NULLS LAST, id DESC);

-- Chronological message pagination within a session
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_chrono
  ON chat_messages (session_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 4. Constraint: encoding_version must be set whenever content_compressed is set
-- ----------------------------------------------------------------------------
ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chk_compressed_encoding_coherence;

ALTER TABLE chat_messages
  ADD CONSTRAINT chk_compressed_encoding_coherence CHECK (
    (content_compressed IS NULL AND encoding_version IS NULL AND original_byte_length IS NULL)
    OR
    (content_compressed IS NOT NULL AND encoding_version IS NOT NULL AND original_byte_length IS NOT NULL)
  );
