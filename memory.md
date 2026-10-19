# SentiMate — Active Project Memory

## 1. Project Context
- **Product**: SentiMate (Full-Stack Student Wellbeing & Counsellor-Support SaaS).
- **Mission**: Bridge university students and authorized counselling services with private conversational support, voluntary check-ins, explainable Machine Learning (DistilBERT + XGBoost + SHAP), consent-governed referrals, and scheduling.
- **Methodology**: Get Shit Done (GSD) spec-driven development with persistent state tracking, comprehensive documentation, and empirical verification.

---

## 2. Completed Milestones & Status
- **Phase 1: Foundation & Context Setup** — ✅ Complete (`design.md`, `implementation.md`, `memory.md`, `schema.db`, `README.md`, `.gsd/`).
- **Phase 2: Supabase Schema & Auth System** — ✅ Complete (`supabase/migrations/20261019000000_init_sentimate_schema.sql`, `supabase/tests/authorization_and_integrity_test.sql`, `packages/contracts/`).
- **Phase 3: Design System, Landing Page & Student Shell** — ✅ Complete (Light/Dark themes, responsive landing page with interactive preview, student chat shell, profile with 8 semesters).
- **Phase 4: Conversation Engine & Wellbeing Check-ins** — ✅ Complete (Streaming chat via OpenAI-compatible NVIDIA Nemotron `nvidia/nemotron-3-super-120b-a12b`, reasoning exclusion, stop/retry controls, voluntary check-ins, verified emergency resources).
- **Phase 5: Counsellor Workspace & Transactional Appointments** — ✅ Complete (Review queue with explainable indicators, student file viewer with consent scope, confidential notes, slot availability with double-booking prevention).
- **Phase 6: Admin Governance & Privacy Operations** — ✅ Complete (Counsellor provisioning dialog, content-free audit logs, data rights requests, aggregate telemetry).
- **Phase 7: FastAPI ML Microservice & SHAP Explainability** — ✅ Complete (FastAPI service on port 8000, bearer token auth, DistilBERT + XGBoost pipeline, TreeSHAP explainer, honest fallback states).
- **Phase 8: Verification, Polish & Packaging** — ✅ Complete:
  - TypeScript build (`packages/contracts`): Exit code 0
  - Next.js production build (`apps/web`): 22 routes generated, Exit code 0
  - Pytest suite (`services/ml`): 5 test cases passed, Exit code 0
- **Provider Migration: Gemini to NVIDIA Nemotron** — ✅ Complete:
  - Installed `openai` SDK, uninstalled `@google/generative-ai`.
  - Built `NvidiaChatAdapter` (`src/server/integrations/nvidiaChatAdapter.ts`) with `enable_thinking: false`, reasoning token filtering (`delta.reasoning_content` discarded), and 30s upstream timeout.
  - Hardened `/api/chat` with student authentication check, active status check, and conversation session ownership validation.
  - Verified 7 test scenarios (missing key 503, empty message 400, max length 4000 400, unauthenticated 401, non-student role 403, inactive account 403, cross-user session 403).
- **Bloom Filter & PostgreSQL Username Availability** — ✅ Complete:
  - Single canonical normalization function `normalizeUsername()` and format validator in `@sentimate/contracts`.
  - Database migration `20261019000001_username_availability_bloom.sql` adding nullable username, format check constraint, and `idx_student_profiles_username_lower` unique expression index.
  - Server-side `UsernameBloomFilter` with 10k capacity, 1% target FPR, $k=7$ hash functions, FNV-1a + Murmur3 double hashing, and serialization metadata.
  - `UsernameBloomService` with tiered pipeline (client validation -> 60s query cache -> Bloom test -> single indexed DB lookup).
  - Authenticated and rate-limited `GET /api/student/username-availability` endpoint with private cache headers.
  - Atomic `PUT /api/student/profile` endpoint handling PostgreSQL unique constraint violations (`23505`) as friendly HTTP 409 Conflict responses.
  - Frontend optimization in `My Profile` with 600ms debounce, session TTL cache, AbortController cancellation, unchanged username bypass, neutral visual state badges, and non-blocking save button.
  - Verification test suite `npm run test:bloom` passing all unit, math, API, and conflict scenarios.

---

## 3. Key Invariants Enforced
- **Zero Hallucination / Honest Fallbacks**: Models, external APIs, and credentials are never fabricated. Missing `NVIDIA_API_KEY` returns a truthful 503 Service Unavailable error (`PROVIDER_NOT_CONFIGURED`); uncalibrated ML weights return a preliminary rules-based assessment and explicitly withhold SHAP labels.
- **Strict Role Elevation Prevention**: Public registration trigger defaults unconditionally to `role: 'student'`. Counsellor accounts are provisioned exclusively by authenticated admins.
- **Database Concurrency Exclusion**: PostgreSQL `EXCLUDE USING gist` constraint prevents overlapping active counsellor bookings.
- **Student Profile Flexibility**: Supports 8 normalized semester results, permitting future/uncompleted semesters to remain null.
- **Conversational Reasoning Privacy**: Thinking tokens and reasoning traces from Nemotron-3 Super are disabled (`enable_thinking: false`) and filtered out to never display or persist internal reasoning traces as assistant messages.
- **Authoritative Database Uniqueness**: The PostgreSQL unique index on `LOWER(username)` is the sole authoritative uniqueness guarantee. The Bloom filter is an acceleration layer, never an authoritative barrier or security boundary.
- **No Pre-Save Check Anti-Pattern**: Profile updates commit in one atomic write; concurrent claim collisions are detected authoritatively via the unique index error code `23505` and surfaced as a clear HTTP 409 Conflict.

