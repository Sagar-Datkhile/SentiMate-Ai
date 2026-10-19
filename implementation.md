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
  - `src/server/repositories`: Database data-access layer using Supabase client (`AuthRepository`)
  - `src/server/integrations`: Gemini streaming adapter, FastAPI ML client adapter (`MlServiceAdapter`)
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

## 4. Verification Evidence & Implementation Status

| Component | Status | Verification Evidence |
|---|---|---|
| PostgreSQL Migration & RLS | ✅ Verified | `supabase/migrations/20261019000000_init_sentimate_schema.sql` (26 entities, full RLS, triggers) |
| Database Authorization Tests | ✅ Verified | `supabase/tests/authorization_and_integrity_test.sql` (tests role guard, 8 semesters, chat isolation, double-booking exclusion) |
| Shared TypeScript Contracts | ✅ Verified | `packages/contracts/src/index.ts` compiled via `tsc` (exit code 0) |
| Next.js 15 Web Application | ✅ Verified | `npm run build:web` compiled 20 routes with 0 errors (exit code 0) |
| FastAPI ML Microservice | ✅ Verified | `pytest services/ml/tests` ran 5 test cases with 100% pass rate (exit code 0) |
| Responsive Landing Page | ✅ Verified | Full 7-section layout with interactive product preview, WCAG 2.2 AA tokens |
| Student Chat Workspace | ✅ Verified | Desktop sidebar, mobile drawer, multiline composer, stop/retry controls, Gemini streaming |
| Student Profile (8 Semesters) | ✅ Verified | Semesters 1-8 SGPA inputs with null support, PRN validation, username format checks |
| Voluntary Check-ins & History | ✅ Verified | Skippable questions, trend tracking, and granular counsellor sharing consent |
| Counsellor Review & Cases | ✅ Verified | Review queue with explainable indicators, confidential notes, transactional slots |
| Admin Console & Audit Ops | ✅ Verified | Counsellor provisioning dialog, content-free audit logs, data rights request execution |
