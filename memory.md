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
- **Universal Skeleton Loading & Real Data States** — ✅ Complete:
  - Replaced hardcoded dummy records, fake statistics, sample users, appointments, conversations, and fabricated chart values across all production screens.
  - Integrated semantic theme tokens `--skeleton-base` and `--skeleton-highlight` for seamless light/dark mode transitions with zero theme flashes.
  - Built reusable primitive `<Skeleton>` (`aria-hidden="true"`), 12 feature skeletons, `<LoadingRegion aria-busy>`, `<EmptyState>`, and `<ErrorState>`.
  - Added CSS-only keyframe shimmer (`1.5s`) with static fallback under `@media (prefers-reduced-motion: reduce)`.
  - Removed all artificial `setTimeout` loading delays from production views.
  - Preserved populated data during background refreshes and form saves with non-blocking pending indicators.
  - Verified across all Student, Counsellor, and Admin modules. Verified production build (`npm run build`, 23 routes, exit code 0) and test suites (`npm run test:bloom`).
- **Glassmorphic Toast Notification System** — ✅ Complete:
  - Created pure React 19 zero-dependency pub/sub notification manager (`apps/web/src/components/ui/Toast.tsx`).
  - Configured semantic tokens for light/dark glass surfaces, subtle borders, soft shadows, and variant accents in `globals.css`.
  - Fixed top-right viewport container (`sm:top-5 sm:right-5`, max-width ~400px; mobile 12px margin, safe-area inset protection, overlay layer `z-[100]`).
  - Strict display limit of at most 3 visible toasts with bounded queue (max 10) and FIFO non-persistent eviction.
  - In-place transition support via stable `id` (e.g. loading to success/error without duplicate stacking).
  - Auto-dismiss timing (~4s success, ~5s info, ~6s warning, persistent actionable errors) with pause on hover/focus.
  - Screen reader live-region accessibility (`aria-live="polite"` / `"assertive"`), decorative icon hiding (`aria-hidden="true"`), visible focus indicators.
  - Automatic notification flushing (`toast.clear()`) on user sign-out in `StudentShell`, `CounsellorShell`, and `AdminShell`.
  - Audited and integrated across Student (`/student/profile`, `/student/appointments`, `/student/checkins`, `/student/referrals`), Counsellor (`/counsellor/cases`, `/counsellor/availability`, `/counsellor/dashboard`), and Admin (`/admin/counsellors`, `/admin/audit`), removing duplicate inline alerts.
  - Created verification test suite `test-toast.ts` (all 6 assertions passed) and interactive playground (`/dev/toast-preview`).

---

## 3. Key Invariants Enforced
- **Zero Hallucination / Honest Fallbacks**: Models, external APIs, and credentials are never fabricated. Missing `NVIDIA_API_KEY` returns a truthful 503 Service Unavailable error (`PROVIDER_NOT_CONFIGURED`); uncalibrated ML weights return a preliminary rules-based assessment and explicitly withhold SHAP labels.
- **Strict Role Elevation Prevention**: Public registration trigger defaults unconditionally to `role: 'student'`. Counsellor accounts are provisioned exclusively by authenticated admins.
- **Database Concurrency Exclusion**: PostgreSQL `EXCLUDE USING gist` constraint prevents overlapping active counsellor bookings.
- **Student Profile Flexibility**: Supports 8 normalized semester results, permitting future/uncompleted semesters to remain null.
- **Conversational Reasoning Privacy**: Thinking tokens and reasoning traces from Nemotron-3 Super are disabled (`enable_thinking: false`) and filtered out to never display or persist internal reasoning traces as assistant messages.
- **Authoritative Database Uniqueness**: The PostgreSQL unique index on `LOWER(username)` is the sole authoritative uniqueness guarantee. The Bloom filter is an acceleration layer, never an authoritative barrier or security boundary.
- **No Pre-Save Check Anti-Pattern**: Profile updates commit in one atomic write; concurrent claim collisions are detected authoritatively via the unique index error code `23505` and surfaced as a clear HTTP 409 Conflict.
- **Zero Value & Real Data Invariants**: Telemetry metrics, queue lengths, caseload counts, and semester SGPAs can legitimately be `0`. UI conditions strictly on boolean `isLoading` and `records.length === 0`, never falsiness (`!value`). Production views never substitute dummy records after an API failure.
- **Accessible Loading Invariant**: Decorative placeholders default to `aria-hidden="true"`. Container regions use `aria-busy={isLoading}` with exactly one polite screen-reader announcement (`sr-only`) per region. Skeletons immediately halt when requests succeed, fail, or are cancelled.

