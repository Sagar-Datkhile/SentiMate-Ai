# SentiMate — Implementation Specification & Architecture Roadmap

## 1. Executive Architecture Overview

SentiMate is an enterprise-grade full-stack student wellbeing and counsellor-support SaaS platform. It connects private student conversations, voluntary check-ins, explainable Machine Learning (NLP + XGBoost + SHAP), consent-driven counsellor referrals, transactional appointments, and administrative governance.

### 1.1 Architecture Topology
```
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 15+ App Router                   │
│   (Vercel / Node Server)                                    │
│   ├── Client Layer: React 19, Tailwind CSS, Lucide Icons   │
│   ├── Server Actions & Thin Route Handlers (/api/chat)      │
│   ├── Application Services (Auth, Counsellor Provisioning)  │
│   └── Database Repositories (Scoped Supabase Client)        │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       PostgREST / Auth / RLS                  │ Internal Authenticated HTTP
               │                               │ (Bearer Token Authorization)
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      Supabase Cloud         │ │      FastAPI ML Service     │
│  - PostgreSQL 15+ & RLS     │ │  (Python 3.13 / Container)  │
│  - Supabase Auth (JWT)      │ │  - DistilBERT (HF)          │
│  - Supabase Storage         │ │  - XGBoost Inference        │
│  - Database Triggers/RPCs   │ │  - TreeSHAP Explainability  │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Directory Layout & Boundaries

The codebase follows a strictly modular monorepo layout:
- `apps/web`: Next.js frontend and server application
  - `src/app`: Page routing, layouts, server route handlers (`/api/chat`, `/auth/*`, `/student/*`, `/counsellor/*`, `/admin/*`, `/resources`)
  - `src/features`: Domain modules (`landing`, `chat`, `profiles`, `checkins`, `appointments`, `referrals`, `cases`, `admin`)
  - `src/components/ui`: Accessible primitives (`Button`, `Input`, `Textarea`, `Card`, `Badge`, `Dialog`)
  - `src/components/layout`: Responsive shells (`LandingNavbar`, `LandingFooter`, `StudentShell`, `CounsellorShell`, `AdminShell`, `ThemeToggle`)
  - `src/server/services`: Business logic and orchestration (`AuthService`, `CounsellorProvisioningService`)
  - `src/server/repositories`: Database data-access layer using Supabase client (`AuthRepository`, `ChatRepository`)
  - `src/server/integrations`: NVIDIA Nemotron streaming adapter (`NvidiaChatAdapter`), FastAPI ML client adapter (`MlServiceAdapter`)
  - `src/lib`: Shared utilities, env validation (`env.ts`), supabase client factories (`client.ts`, `server.ts`, `admin.ts`)
  - `src/types`: Domain TypeScript types and database schema interfaces
- `services/ml`: Python FastAPI microservice
  - `app/api`: Clean endpoint definitions (`/health`, `/api/v1/analyze`)
  - `app/schemas`: Pydantic models for request/response validation
  - `app/services`: NLP feature extraction (`TextAnalysisService`), XGBoost inference pipeline, TreeSHAP explainer (`PredictionService`)
  - `app/models`: Artifact loading and version metadata (`ModelRegistry`)
  - `tests`: Test suites covering feature extraction, missing values, fallback states, and security token guards
- `packages/contracts`: Shared TypeScript and JSON schema contracts (Zod schemas and TypeScript types)
- `supabase/migrations`: Versioned SQL migrations for tables, indexes, triggers, and RLS policies (`20261019000000_init_sentimate_schema.sql`)
- `supabase/tests`: SQL test scripts verifying role separation, RLS enforcement, and transactional integrity (`authorization_and_integrity_test.sql`)
- `.gsd`: Get Shit Done specification, requirements, roadmap, state tracking, and architecture decisions

---

## 3. Role-Based Access Control & Security Invariants

### 3.1 Roles Matrix
1. **Student (`student`)**:
   - Primary user. Lands directly on `/student/chat`.
   - Access: Own chat sessions, own profile, own semester records, own check-ins, create referrals, book appointments with available counsellors.
   - Forbidden: Cannot access counsellor dashboards, cannot view other students' records, cannot access admin consoles.
2. **Counsellor (`counsellor`)**:
   - Professional staff. Lands on `/counsellor/dashboard`.
   - Access: Assigned students only, permitted shared check-in evidence, appointment slots, case notes.
   - Forbidden: Cannot access raw unconsented student chat history, cannot access student chatbot API, cannot access administrative security settings.
3. **Admin (`admin`)**:
   - Institutional administrator. Lands on `/admin/dashboard`.
   - Access: Provisioning counsellors, student-counsellor assignments, institution settings, audit logs, aggregate anonymized reports.
   - Forbidden: Cannot access private chat messages, cannot read confidential case notes, cannot fabricate student consent.

### 3.2 Public Signup Protection
- Public registration (`/auth/register`) strictly assigns the `student` role via database trigger (`handle_new_user()`).
- Any attempt to pass `role: "admin"` or `role: "counsellor"` in metadata or query params is ignored by database trigger logic.
- Counsellor accounts can only be provisioned by an authenticated Admin through the protected server service (`apps/web/src/server/services/counsellor-provisioning.service.ts`).
- Admin accounts are bootstrapped using a secure CLI seed command or migration.

---

## 4. Username Availability Architecture & Bloom Filter Pipeline

To deliver low-latency username availability checks during profile editing while eliminating unnecessary database reads, SentiMate employs a multi-tiered architecture combining a server-side Bloom filter, a short-lived query cache, and PostgreSQL authoritative uniqueness constraints.

### 4.1 Canonical Normalization & Validation Contract
To guarantee consistency across the client UI, API route handlers, Bloom filter bit array, and database indexes, a single canonical normalization contract is established in `@sentimate/contracts`:
- **Normalization Function**: `normalizeUsername(input: string): string`
  - Strips leading and trailing whitespace (`.trim()`).
  - Converts characters to lowercase (`.toLowerCase()`).
  - Strips leading `@` symbols if provided by students accustomed to social handles.
- **Allowed Character Policy**: Lowercase ASCII alphanumeric characters, hyphens, and underscores: `^[a-z0-9_-]+$`.
- **Length Boundaries**: Minimum 3 characters, maximum 30 characters.
- **Reserved Handles**: Hard-coded system handles (`admin`, `administrator`, `support`, `sentimate`, `counsellor`, `counselor`, `staff`, `root`, `system`, `help`, `emergency`, `crisis`, `wellbeing`, `bot`, `mod`, `moderator`) are permanently rejected by client validation and server policy before hitting the database.

### 4.2 Probabilistic Bloom Filter Data Structure
- **Algorithm**: In-memory bit array with double hashing using FNV-1a (32-bit offset basis `0x811c9dc5`) and Murmur3-inspired mixer (`hash_i(x) = (h1 + i * h2) mod m`).
- **Target Parameters**:
  - Initial capacity ($n$): 10,000 usernames with growth headroom.
  - Target False Positive Rate ($p$): 1% ($0.01$).
  - Bit array size ($m$): $m = \lceil -n \ln p / (\ln 2)^2 \rceil = 95,851\text{ bits}$ (~12 KB).
  - Optimal hash functions ($k$): $k = \lceil (m/n) \ln 2 \rceil = 7$.
- **Invariants**:
  - **Zero False Negatives**: If an element is absent from the Bloom filter, it is guaranteed not to exist in the database.
  - **Bounded False Positives**: Up to ~1% of absent usernames may be flagged as present, falling back to a single indexed DB lookup.
  - **Server-Side Security Boundary**: The Bloom filter is kept strictly server-side. It is an acceleration mechanism, not an authoritative barrier or substitute for database constraints.

### 4.3 Multi-Tier Availability Evaluation Pipeline
When an availability check is requested:
1. **Tier 1 (Client Validation)**: Length bounds (3–30 chars), regex format (`^[a-z0-9_-]+$`), and reserved name matching run locally. Fails immediately with zero network latency.
2. **Tier 2 (Short-Lived Query Cache)**: Bounded in-memory LRU cache (1,000 items, 60s TTL) on the server. If a username was recently confirmed unavailable, returns `already_taken` (`checked_via: 'cache'`) without touching the Bloom filter or database. User-specific ownership is never cached in the shared cache.
3. **Tier 3 (Bloom Filter Test)**: If the Bloom filter reports definitely absent, the server immediately returns `appears_available: true` (`checked_via: 'bloom_negative'`) with **zero database reads**.
4. **Tier 4 (Authoritative Database Lookup)**: Only reached if the filter reports positive (real collision or ~1% false positive). Executes a single indexed query:
   ```sql
   SELECT id, username FROM student_profiles WHERE username = $1 LIMIT 1;
   ```
   - If `id === requestingStudentId`, returns `status: 'current_user'` without treating it as a collision.
   - If owned by another student, returns `status: 'already_taken'` and populates the shared unavailable cache.
   - If no row matches (Bloom false positive), returns `status: 'available'`.

### 4.4 Refresh Lifecycle & Invalidation Policy
- **Background Synchronization**: At server initialization, `UsernameBloomService` builds the filter with reserved handles and triggers an asynchronous, non-blocking DB hydration query (`SELECT username FROM student_profiles WHERE username IS NOT NULL`).
- **Post-Commit Updates**: Immediately upon successful profile save, `recordUsernameAssignment(normalized, studentId)` inserts the handle into the Bloom filter and invalidates relevant cache entries.
- **Conventional Filter Deletion Invariant**: Because conventional Bloom filters cannot safely delete bits without risking false negatives, old usernames remain present until the next scheduled rebuild. This only introduces a harmless transient false positive that the single indexed DB lookup resolves.
- **Graceful Failure Tolerance**: If the Bloom filter is missing, stale, or encounters an internal fault, the system falls back seamlessly to the database or permits the authoritative save to proceed.

### 4.5 Save Behavior & Authoritative Concurrency Control
- **No Pre-Save Check**: The UI does not execute an artificial availability check immediately prior to saving.
- **Atomic Database Write**: The profile update is submitted directly in one atomic query. Uniqueness is authoritatively enforced by the unique expression index:
  ```sql
  CREATE UNIQUE INDEX idx_student_profiles_username_lower ON student_profiles (LOWER(username)) WHERE username IS NOT NULL;
  ```
- **Conflict Handling**: If two students race to claim the same username, PostgreSQL raises error code `23505` (unique violation), which the API catches and translates into a friendly HTTP `409 Conflict` response with an explanatory message.
- **Rollback Safety**: If the update fails, existing student profile fields and usernames remain unmodified.

### 4.6 Frontend Optimization & Debounce Pattern
- **Debounced Input**: Keystroke input in the username field is debounced by ~600ms before triggering an availability request.
- **Short-Lived Session Cache**: Client keeps an in-memory cache of checked names for 30s to avoid duplicate checks during backspacing or retyping.
- **In-Flight Cancellation**: `AbortController` aborts obsolete in-flight requests when the user continues typing.
- **Initial Render & Unchanged Bypass**: No availability request is emitted on initial page load or when the input matches the student's current handle.
- **Neutral Status Badges**: Visual indicators display `checking`, `appears available`, `currently available`, `already taken`, and `unable to check`.
- **Non-Blocking Submission**: Even if the availability endpoint is unreachable or degraded (`unable_to_check`), the Save button remains active, deferring authoritative validation to the database commit.

---

## 5. Verification Evidence & Implementation Status

| Component | Status | Verification Evidence |
|---|---|---|
| PostgreSQL Migration & RLS | ✅ Verified | `supabase/migrations/20261019000000_init_sentimate_schema.sql` (26 entities, full RLS, triggers) |
| Database Authorization Tests | ✅ Verified | `supabase/tests/authorization_and_integrity_test.sql` (tests role guard, 8 semesters, chat isolation, double-booking exclusion) |
| Username Bloom DB Migration | ✅ Verified | `supabase/migrations/20261019000001_username_availability_bloom.sql` (`LOWER(username)` unique index, format check, null initial handle) |
| Shared TypeScript Contracts | ✅ Verified | `packages/contracts/src/index.ts` compiled via `tsc` (exit code 0) |
| Next.js 15 Web Application | ✅ Verified | `npm run build:web` compiled 23 routes with 0 errors (exit code 0) |
| FastAPI ML Microservice | ✅ Verified | `pytest services/ml/tests` ran 5 test cases with 100% pass rate (exit code 0) |
| Responsive Landing Page | ✅ Verified | Full 7-section layout with interactive product preview, WCAG 2.2 AA tokens |
| Student Chat Workspace | ✅ Verified | Desktop sidebar, mobile drawer, multiline composer, stop/retry controls, ChatMessageSkeleton, streaming indicator |
| Student Profile & Username Check | ✅ Verified | Debounced 600ms client check, Bloom-accelerated endpoint, 8 semester inputs with null support, ProfileSkeleton, ErrorState |
| Bloom Filter Verification Suite | ✅ Verified | `npm run test:bloom` executed 4 test suites (zero false negatives, 0.00% measured FPR, Bloom negative zero-DB hits, 409 conflict handling) |
| Voluntary Check-ins & History | ✅ Verified | Skippable questions, trend tracking, CheckinCardSkeleton, EmptyState, granular counsellor sharing consent |
| Counsellor Review & Cases | ✅ Verified | Review queue with explainable indicators, confidential notes, transactional slots, StatCardSkeleton, QueueItemSkeleton, CaseCardSkeleton |
| Admin Console & Audit Ops | ✅ Verified | Counsellor provisioning dialog, TableRowsSkeleton, content-free audit logs, data rights request execution, zero-metric support |
| Support Resource Directory | ✅ Verified | Verified campus and crisis hotlines, ResourceCardSkeleton, Search EmptyState |
| Skeleton System & Data States | ✅ Verified | Universal skeleton system, light/dark shimmer tokens, prefers-reduced-motion static fallback, LoadingRegion with aria-busy |

---

## 6. Skeleton Loading System & Resilient Data State Architecture

To eliminate visual layout shifts, prevent confusing placeholders, and provide clear operational feedback, SentiMate replaces hardcoded dummy records, fake statistics, sample users, appointments, conversations, and fabricated chart values with a unified skeleton and data-state system.

### 6.1 State Contract & Guarantees
- **Initial Loading State**: Displays semantic skeleton structures matching the exact dimensions, radii, borders, and grid layout of the incoming data.
- **Success State**: Transitions directly to authoritative backend data retrieved from Supabase and application APIs.
- **Empty State**: Renders `<EmptyState>` with a calm explanation, appropriate icon, and a contextual action trigger (e.g., booking an appointment, provisioning a clinician, or clearing search filters).
- **Error State**: Renders `<ErrorState>` displaying a concise explanation and a keyboard-accessible retry button. Never substitutes dummy records after an API failure.
- **Background Refresh & Form Submissions**: Populated data remains mounted and interactive. Form submission buttons show non-blocking pending spinners (`isLoading={isSubmitting}`) with duplicate submission prevention (`disabled={isSubmitting}`) instead of unmounting populated fields into skeletons.
- **Numerical Zero Invariant**: Zero (`0`) is treated as a valid semester SGPA, caseload count, queue count, or telemetry metric. Skeletons and empty states condition strictly on boolean flags (`isLoading`, `records.length === 0`), never truthiness checks on numbers (`!value`).
- **Simulated Delays Removed**: Eliminated all artificial `setTimeout` delays from production views.

### 6.2 Token-Driven Skeleton Shimmer & Accessibility
- **CSS Custom Properties**:
  - Light theme: `--skeleton-base: #E8E8E2;`, `--skeleton-highlight: #F5F5F2;`
  - Dark theme: `--skeleton-base: #22262E;`, `--skeleton-highlight: #2C323D;`
- **Keyframe Shimmer**: CSS-only linear gradient sweep (`200% 100%`) with `1.5s infinite ease-in-out` timing, avoiding JavaScript flashes or theme mismatch.
- **Reduced Motion Support**: Fully respects `@media (prefers-reduced-motion: reduce)` by disabling animations and presenting a static placeholder.
- **Screen Reader Protection**:
  - Individual `<Skeleton>` shapes are permanently marked `aria-hidden="true"`.
  - Asynchronous loading regions are wrapped in `<LoadingRegion isLoading={boolean} announcement="...">`, which applies `aria-busy={isLoading}` to the container and renders exactly one polite `<span className="sr-only" role="status" aria-live="polite">` announcement per loading zone.

### 6.3 Reusable Component Catalog
- Base: `Skeleton` (`text`, `circular`, `rounded`, `rectangular`), `LoadingRegion`, `EmptyState`, `ErrorState`
- Feature compositions:
  - `StatCardSkeleton`: Dashboard and telemetry metric cards
  - `NeutralChartSkeleton`: Restrained frames replacing fabricated trend curves
  - `ProfileSkeleton`: Identity header, 4 detail fields, 8 semester inputs, and bio textarea
  - `QueueItemSkeleton`: Counsellor review queue cards with SHAP factor silhouette
  - `StudentCardSkeleton`: Assigned student directory cards
  - `CaseCardSkeleton`: Longitudinal case history and notes
  - `AppointmentCardSkeleton`: Appointments, available booking slots, and clinician listings
  - `ChatHistorySkeleton`: Sidebar conversation history
  - `ChatMessageSkeleton`: Chat messages with avatar and multiline bubble
  - `CheckinCardSkeleton`: Check-in history items with metric pills
  - `TableRowsSkeleton`: Audit events and privacy rights requests table rows
  - `ResourceCardSkeleton`: Crisis hotline and support service cards

### 6.4 Screen & Feature Coverage
- **Student Module**:
  - `/student/chat`: Removed hardcoded session list and dummy messages. Skeletons for session history and initial messages. Restrained 3-dot pulse for streaming responses. Explicit error banners.
  - `/student/profile`: Removed fake "Alex", dummy PRN, and SGPA values. Real Supabase profile loading with `ProfileSkeleton`, `ErrorState` with retry, and non-blocking save button.
  - `/student/checkins`: Removed dummy check-in history records and artificial timer. Real check-in list with `CheckinCardSkeleton` and `EmptyState`.
  - `/student/appointments`: Removed hardcoded booked appointments and slots. Integrated `AppointmentCardSkeleton` and `EmptyState` for both bookings and open clinician slots.
  - `/student/referrals`: Removed artificial 600ms delay. Prevented duplicate submissions.
- **Counsellor Module**:
  - `/counsellor/dashboard`: Removed hardcoded caseload metrics and fake review queue items. Integrated `StatCardSkeleton`, `QueueItemSkeleton`, and `EmptyState`.
  - `/counsellor/students`: Removed hardcoded dummy students array. Integrated `StudentCardSkeleton`, `LoadingRegion`, and `EmptyState`.
  - `/counsellor/cases`: Removed hardcoded dummy cases. Integrated `CaseCardSkeleton`, `LoadingRegion`, and `EmptyState`.
  - `/counsellor/availability`: Removed hardcoded dummy slots. Integrated `AppointmentCardSkeleton`, `LoadingRegion`, and `EmptyState`.
- **Admin Module**:
  - `/admin/dashboard`: Removed hardcoded telemetry numbers. Integrated `StatCardSkeleton` with real state and zero-metric support.
  - `/admin/counsellors`: Removed dummy clinician list and artificial delay. Integrated `AppointmentCardSkeleton` and `EmptyState`.
  - `/admin/audit`: Removed dummy audit logs and fake privacy requests. Integrated `TableRowsSkeleton`, `LoadingRegion`, and `EmptyState`.
  - `/resources`: Integrated `ResourceCardSkeleton`, `LoadingRegion`, and search-query `EmptyState` with filter reset action.
- **Shells & Layouts**:
  - `StudentShell`, `CounsellorShell`, and `AdminShell`: Dynamically fetch the authenticated Supabase user with fallback skeletons in footer user profile cards.
- **Isolated Demo Content**:
  - Explicitly labeled demo mock data is strictly confined to `InteractiveProductPreview.tsx` on the public landing page with prominent disclaimer badges.

