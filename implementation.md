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

---

## 7. Glassmorphic Toast Notification System

### 7.1 Architecture & Pub/Sub Store
- **Pure React 19 Implementation**: Zero external dependencies, eliminating React 19 peer-dependency conflicts with third-party libraries (e.g. `sonner` / `react-hot-toast`).
- **Pub/Sub Singleton**: `toastManager` (`apps/web/src/components/ui/Toast.tsx`) manages visible items, bounded queuing (max 10), and subscriber synchronization.
- **Typed Notification API**:
  - `toast.success(title: string, options?: ToastOptions)`
  - `toast.error(title: string, options?: ToastOptions)`
  - `toast.warning(title: string, options?: ToastOptions)`
  - `toast.info(title: string, options?: ToastOptions)`
  - `toast.loading(title: string, options?: ToastOptions)`
  - `toast.promise<T>(promise, { loading, success, error }, options?: ToastOptions)`
  - `toast.dismiss(id?: string)`
  - `toast.clear()`: Instant flush of all visible and queued toasts without waiting for exit animations.

### 7.2 Invariants & Operational Rules
- **Top-Right Viewport Positioning**:
  - Fixed independent of page scrolling at `top-4 right-3 left-3 sm:left-auto sm:right-5 sm:top-5 z-[100] sm:w-[380px] max-w-[400px]`.
  - Respects `safe-area-inset-top` via CSS environment variables.
  - Overlay container is `pointer-events-none`; toast cards are `pointer-events-auto`.
- **Display Limit & Bounded Queue**:
  - Displays at most 3 visible toasts concurrently.
  - New incoming toasts evict the oldest non-persistent card or enter a bounded pending queue (max 10).
- **In-Place Transitions & Deduplication**:
  - Passing a stable `id` updates an active toast in place (e.g., loading spinner transitions smoothly to checkmark or error alert) without stacking duplicate cards.
- **Timing & Pause Behavior**:
  - Success auto-dismiss: ~4000ms.
  - Info auto-dismiss: ~5000ms.
  - Warning auto-dismiss: ~6000ms.
  - Errors requiring action remain persistent (`persistent: true`, `duration: Infinity`) until dismissed or resolved.
  - Timers automatically pause when hovering with mouse cursor or when keyboard focus moves into the toast card.
- **Accessibility**:
  - `role="region" aria-label="Notifications"`.
  - Dedicated screen-reader live region (`aria-live="polite"` for success/info/warning, `aria-live="assertive"` for critical errors).
  - Decorative icons are `aria-hidden="true"`.
  - Accessible dismiss button with `aria-label="Dismiss notification"` and visible teal focus ring.
  - Never automatically steals keyboard focus.
- **Privacy & Security**:
  - Never exposes sensitive wellbeing data, case notes, student PRNs, or raw provider exceptions in toast text.
  - All transient toasts are cleared (`toast.clear()`) on user logout or account switching in `StudentShell`, `CounsellorShell`, and `AdminShell`.

### 7.3 Integration Points
- **Student Profile (`/student/profile`)**:
  - `toast.success('Profile changes saved.')` / `toast.success('Username changed.')` on confirmed backend write.
  - `toast.error('Username is already taken.')` on 409 conflict.
  - `toast.error('Profile update failed.')` on mutation rejection.
- **Student Appointments (`/student/appointments`)**:
  - `toast.success('Appointment request submitted.')` on reservation.
  - `toast.info('Appointment cancelled.')` on session cancellation.
  - `toast.error('Appointment slot is no longer available.')` on concurrent booking collision.
- **Student Check-ins (`/student/checkins`)**:
  - `toast.success('Wellbeing check-in saved.')` on recording reflection.
- **Student Referrals (`/student/referrals`)**:
  - `toast.success('Support referral submitted.')` on triage submission.
- **Counsellor Cases (`/counsellor/cases`)**:
  - `toast.success('Case note saved.')` on confidential clinical note recording.
- **Counsellor Availability (`/counsellor/availability`)**:
  - `toast.success('Availability slot created.')` on publishing booking window.
  - `toast.info('Availability slot removed.')` on deleting slot.
- **Counsellor Dashboard (`/counsellor/dashboard`)**:
  - `toast.success('Referral acknowledged.')` on reviewing referral.
  - `toast.success('Case assessment saved.')` on triage status update.
- **Admin Counsellor Provisioning (`/admin/counsellors`)**:
  - `toast.success('Counsellor account invitation sent.')` on clinician dispatch.
- **Session Shells (`StudentShell`, `CounsellorShell`, `AdminShell`)**:
  - Invokes `toast.clear()` in `handleSignOut()` to flush notifications prior to redirect.

---

## 8. Student Sidebar Redesign & ChatGPT-Style Account Menu

### 8.1 Component Decomposition
- **`SidebarToggle` (`apps/web/src/components/layout/SidebarToggle.tsx`)**:
  - Accessible toggle control switching between desktop expanded mode (`w-64 lg:w-72`) and narrow rail mode (`w-16`).
  - Employs Lucide `PanelLeftClose` (expanded) and `PanelLeftOpen` (collapsed).
  - Supplies accessible `aria-expanded={!isCollapsed}`, `aria-label`, and interactive `Tooltip`.
  - Persists preference locally in `localStorage.getItem('sentimate_sidebar_collapsed')` without server calls.
- **`AccountTrigger` (`apps/web/src/components/layout/AccountTrigger.tsx`)**:
  - Anchored at the bottom of the sidebar/rail.
  - In expanded mode: Full-width button with user avatar (real initial), display name, handle/email, and `ChevronsUpDown` menu indicator.
  - In collapsed mode: Centered circular avatar button with accessible `Tooltip` (`Account: {displayName}`) and `aria-label`.
  - Specifies `aria-haspopup="menu"` and `aria-expanded={isOpen}`.
- **`AccountMenu` (`apps/web/src/components/layout/AccountMenu.tsx`)**:
  - ChatGPT-style floating popup rendered via React Portal (`createPortal`) into `document.body` to avoid clipping.
  - Automatic collision detection: dynamically positions above trigger in expanded desktop and mobile views, or beside trigger in collapsed rail mode. Clamped within viewport bounds with internal scrolling.
  - Content Hierarchy:
    1. Compact identity header (avatar, display name, handle/email, "Student" badge).
    2. Primary navigation (My Profile, Conversations, Wellbeing, Appointments, Resources, Human Support Referral) with active route indicator dot.
    3. Settings & Appearance with inline Light, Dark, System theme radio selectors connected to `useTheme()`.
    4. Divider line.
    5. Log out action with loading state, `toast.clear()`, Supabase session termination, and error toast fallback.
  - Keyboard & Focus Control: Dismisses on `Escape` key, outside click, or link navigation, returning focus to the trigger. Arrow keys support navigating focus through menu items.
- **`Tooltip` (`apps/web/src/components/ui/Tooltip.tsx`)**:
  - Reusable accessible tooltip wrapper for icon-only buttons in collapsed mode.

### 8.2 Cleaned Sidebar Navigation Layout
- Removed standalone navigation links (Conversations, Wellbeing, Appointments, Resources, Profile, Request support button), standalone theme toggle, and standalone logout button from the main sidebar body.
- Replaced with a unified ChatGPT-style paradigm:
  - Top: Header with branding and collapse toggle.
  - Action: "New conversation" button (icon-only in collapsed rail).
  - Center: Recent Conversations list (expanded only).
  - Bottom: Unified Account Trigger opening the Account Menu.

---

## 9. Default Institution & Department Dropdown Configuration

### 9.1 Overview & Requirements
- **Default Institution**:
  - Name: `"Pune Vidyarthi Griha's College of Engineering & S.S. Dhamankar Institute of Management, Nashik"`
  - Code: `'PVGCOE_NASHIK'`
  - Behavior: Displayed by default for new student profiles; read-only in My Profile with clean text-wrapping on mobile; resolved through database `institution_id` (foreign key) rather than duplicating name string in profiles; assigned via trusted backend logic; existing non-null institution assignments preserved.
- **Department Dropdown**:
  - Label: `"Department"`, Component: Accessible single-select dropdown (`<Select>`), Placeholder: `"Select your department"` (empty value `""`).
  - Five Verified Options:
    1. `"Computer Engineering"` (Code: `'COMP'`)
    2. `"Information Technology"` (Code: `'IT'`)
    3. `"Artificial Intelligence & Data Science"` (Code: `'AIDS'`)
    4. `"Mechanical Engineering"` (Code: `'MECH'`)
    5. `"Electronics and Telecommunication Engineering"` (Code: `'ENTC'`)
  - Behavior: Optional (does not block chatbot access); does not automatically select the first department; displays student's saved selection on load; saves `department_id` through existing profile update flow; validates server-side that department belongs to student's assigned institution; preserves existing department assignments and flags incompatible legacy values for review rather than silently replacing them.

### 9.2 Database Schema & Migration (`20261019000002`)
- **Versioned Migration File**: `supabase/migrations/20261019000002_default_institution_and_departments.sql`.
- **Constraint Relaxation & Missing Configuration Report**:
  - `contact_email` and `emergency_contact` were defined as `NOT NULL` in the initial schema (`schema.db`).
  - Invariant: *Do not invent contact emails, emergency numbers or other required institutional details.*
  - The migration relaxes both columns to nullable:
    ```sql
    ALTER TABLE public.institutions ALTER COLUMN contact_email DROP NOT NULL;
    ALTER TABLE public.institutions ALTER COLUMN emergency_contact DROP NOT NULL;
    ```
  - **Missing Configuration**: Official university contact email and campus emergency hotline number were not provided in the specification. These columns are left unpopulated (`NULL`) pending official campus administration configuration.
- **Idempotent Seeding & Identification Reuse**:
  - Checks if institution exists by `code = 'PVGCOE_NASHIK'` or name, reusing existing UUID `b339af53-fef8-4cfd-b6d8-a9042dc80ab5`.
  - Seeds all 5 departments for this institution with unique composite index `(institution_id, code)` without duplicate records.
- **Backfill Migration**:
  - Explicitly updates `profiles` where `institution_id IS NULL` to `v_default_institution_id`.
  - Invariant: Strictly preserves existing non-null institution assignments.
- **Row Level Security (RLS)**:
  - Grants SELECT to authenticated users on `institutions` (where `is_active = TRUE`) and `departments`.
- **Registration Trigger Hardening**:
  - Updated `public.handle_new_user()` to resolve default institution and insert `profiles.institution_id = v_default_institution_id` while strictly locking role to `'student'`.

### 9.3 Backend Profile API (`/api/student/profile`)
- **GET Handler**:
  - Resolves student's assigned `institution_id` -> queries `institutions` for `id, name, code`. Falls back to default institution if unassigned.
  - Fetches available `departments` for this institution and returns them in the payload, allowing the client to cache reference data without separate requests.
  - Detects if the student has an assigned `department_id` that is not part of the active institution's offerings (e.g. legacy or cross-institution ID). Instead of wiping it, returns `incompatibleDepartment: { id, name, flaggedForReview: true }`.
- **PUT Handler**:
  - Accepts `departmentId` (UUID string or `null`/empty string to clear).
  - Strict Security Invariant: Ignores any client-supplied `institutionId` or `institution` strings; clients cannot alter institution affiliation.
  - Server-side validation: Verifies that the provided `departmentId` exists and belongs to the student's assigned `institution_id`. Rejects mismatches with HTTP 400 (`INVALID_DEPARTMENT_INSTITUTION`).
  - Updates `student_profiles.department_id` atomically.

### 9.4 Frontend UI (`/student/profile`)
- **Component**: `apps/web/src/components/ui/Select.tsx`:
  - Accessible single-select component wrapping native `<select>` with custom styling, `min-h-[44px]`, focus rings, `ChevronDown` indicator, and screen-reader label associations.
- **Institution Display**:
  - Rendered as read-only field with `tabIndex={0}`, `aria-readonly="true"`, and `break-words whitespace-normal` guaranteeing clean text-wrapping on mobile viewports.
- **Department Dropdown**:
  - Displays placeholder `"Select your department"`. Does not auto-select first item.
  - Pre-selects student's saved `department_id`.
  - Caches reference data in component state from `loadProfile()`; zero duplicate fetches on dropdown open or rerender.
  - If reference data is unavailable, prevents submitting invalid selections.
  - Renders informational review banner when an incompatible legacy assignment is detected.
- **Feedback**:
  - Dispatches top-right glassmorphic toast notification on save: `toast.success('Profile changes saved.')`.
  - Dispatches `toast.error('Profile update failed.')` on error.

### 9.5 Verification Summary
- **Test Suite**: `apps/web/test-institution-departments.ts` (`npm run test:institution`).
  - All 26 assertions passed:
    - Default institution name and code exact match.
    - All 5 departments exact names and codes match.
    - Reference data resolution via GET.
    - Selection persistence via PUT.
    - Optional clearing to null.
    - Rejection of invalid/cross-institution department IDs (HTTP 400).
    - Tamper resistance: client-supplied institution ID strictly ignored.
    - Role authorization: non-students rejected with HTTP 403.
- **Existing Checks Verified**:
  - `npm run test:bloom`: All username availability tests passed.
  - `npm run test:sidebar`: All sidebar and account menu tests passed.
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run build`: Next.js 15 production build succeeded (24 static & dynamic routes, exit code 0).

---

## 10. Chat Persistence with Compressed Storage (Supabase)

To support long-term student conversational continuity while minimizing PostgreSQL storage footprint and network payload overhead, SentiMate employs server-side gzip compression for completed message content, coupled with lazy session creation, activity-driven ordering, and strict consent governance.

### 10.1 Compression Specification & Invariants
- **Algorithm**: Node.js built-in `zlib.gzipSync` (level: 6) and `zlib.gunzipSync`. Zero external dependencies introduced.
- **Authoritative Single Representation**: New message writes populate `content_compressed BYTEA`, `encoding_version TEXT`, and `original_byte_length INTEGER`. The legacy `content` column is set to empty string `''` to satisfy PostgreSQL `NOT NULL` constraints without duplicate storage.
- **Identity Fallback**: If compression increases byte length (common with very short messages, e.g. "Hi" or single emoji), the system stores raw UTF-8 bytes with `encoding_version = 'identity/1'`.
- **Per-Message Compression**: Each message is compressed independently; reading or appending messages never requires re-compressing or rewriting entire conversations.
- **Metadata Transparency**: Session titles, ownership (`student_id`), timestamps (`created_at`, `updated_at`, `last_activity_at`), sender roles (`user`, `assistant`), model version, and token counts remain uncompressed and queryable.
- **Security & Decompression Bounds**:
  - Decompression is performed server-side only after user authentication and ownership authorization.
  - Strict input ceiling: 256 KB safety limit on compressed input.
  - Strict output ceiling: 512 KB safety limit on decompressed output.
  - Decompression failures fall back gracefully to plaintext without throwing unhandled exceptions or logging sensitive message text.
  - Transparent to UI: Compression is purely a storage optimization and is never described as encryption.

### 10.2 Database Schema & Additive Migration (`20261022000000`)
- **Versioned Migration File**: `supabase/migrations/20261022000000_chat_persistence_compressed.sql`.
- **Additive DDL Modifications**:
  - `chat_sessions`: Added `last_activity_at TIMESTAMPTZ` (back-filled from `updated_at`, default `timezone('utc'::text, now())`).
  - `chat_messages`: Added `content_compressed BYTEA`, `encoding_version TEXT CHECK (encoding_version IS NULL OR encoding_version IN ('gzip/1', 'identity/1'))`, and `original_byte_length INTEGER CHECK (original_byte_length IS NULL OR original_byte_length >= 0)`.
  - Coherence Constraint: `chk_compressed_encoding_coherence` enforces that `content_compressed`, `encoding_version`, and `original_byte_length` are either all NULL (legacy rows) or all NOT NULL (compressed rows).
- **Indexing**:
  - `idx_chat_sessions_student_activity`: `(student_id, last_activity_at DESC NULLS LAST, id DESC)` for fast recent-first session list retrieval.
  - `idx_chat_messages_session_chrono`: `(session_id, created_at ASC)` for chronological message pagination within conversations.
  - `idx_chat_messages_compressed_session`: Partial index on `(session_id, created_at) WHERE content_compressed IS NOT NULL`.

### 10.3 Backend Architecture & Route Handlers
- **Repository (`ChatRepository` in `src/server/repositories/chat.repository.ts`)**:
  - `compressContent(text)`: Compresses text via `gzipSync`, evaluates size, and returns buffer with encoding tag.
  - `decompressContent(hexStr, encoding, fallback)`: Decompresses PostgREST `\x<hex>` strings via `gunzipSync` or identity UTF-8 parsing.
  - `getRecentMessages(sessionId, limit)`: Decompresses recent messages to supply the model context window with actual text instead of empty strings.
  - `saveUserMessage(sessionId, content, messageId)`: Idempotently upserts compressed user message and updates `chat_sessions.last_activity_at` atomically.
  - `saveAssistantMessage(sessionId, content, modelVersion, tokenCount, messageId)`: Idempotently upserts compressed assistant response once generation completes.
  - `hasStorageConsent(studentId)`: Checks `consent_events` for `ai_chat_processing`; returns false if consent is revoked or absent.
  - `deriveTitleFromMessage(message)`: Fast local text truncation (max 50 chars at word boundary); zero LLM calls or network latency.
- **API Endpoints**:
  - `GET /api/chat/sessions`: Lists student sessions ordered by `last_activity_at DESC NULLS LAST, id DESC`. Metadata only (no message bodies).
  - `POST /api/chat/sessions`: Explicit session creation endpoint.
  - `PATCH /api/chat/sessions/[sessionId]`: Renames session without altering `last_activity_at`.
  - `DELETE /api/chat/sessions/[sessionId]`: Soft-archives session (`is_archived = true`).
  - `GET /api/chat/sessions/[sessionId]/messages`: Decompresses messages server-side with ownership and student role guards.
  - `POST /api/chat`:
    - Enforces student role, active account status, and conversation ownership.
    - Lazy session creation: creates database session on first user message send.
    - Echoes `X-Session-Id` and `X-Session-Created: 1` headers back to client.
    - Persists user message before streaming response; persists assistant response once upon stream completion.
    - Respects storage consent: suppresses persistence if consent is absent or revoked while maintaining real-time streaming response.

### 10.4 Frontend Experience & State Coordination (`/student/chat`)
- **Lazy Session Initialization**: Clicking "New Chat" resets `activeSessionId` to `null` without writing empty placeholder rows to Supabase.
- **Optimistic Recent-First Re-sorting**: When a message is sent, the client reads the `X-Session-Id` header, adopts the UUID, moves the session to the top of the sidebar with `lastActivityAt = now()`, and sorts cleanly without refetching the entire list.
- **Decompressed Chat Hydration**: Selecting an existing session fetches `/api/chat/sessions/[id]/messages`, populating decompressed chat bubbles.
- **In-Place Retry & Honest Status**: Stream errors render accessible status cards with retry buttons; retrying updates the assistant bubble in-place without duplicating the user's message.
- **Zero Dummy Data**: Renders skeletons during fetch and clean empty states when no conversations exist.

### 10.5 Verification Summary
- **Test Suites**:
  - `scratch/test-full-chat-verification.mjs`:
    - Unicode diacritics round-trip: PASS
    - Marathi script round-trip: PASS (`gzip/1`, raw 169b -> stored 122b)
    - Emoji & symbol preservation: PASS (`identity/1`)
    - Multiline formatting preservation: PASS
    - Identity fallback for short text: PASS (`identity/1`, raw 2b -> stored 2b)
    - Legacy uncompressed row fallback: PASS
    - Malformed compressed content safe error recovery: PASS
    - Live Supabase session creation and bytea insert/select/decompress: PASS
    - Idempotent upsert & duplicate-send protection: PASS (count = 1)
    - Recent-first session ordering after activity bump: PASS
  - `apps/web/test-chat-api.mjs`: All 7 security and validation tests passed (empty message 400, max length 400, live NVIDIA streaming 200, unauthenticated 401, non-student role 403, inactive account 403, cross-user session 403).
  - TypeScript Compilation: `npx tsc --noEmit` exited with code 0 (0 errors).



