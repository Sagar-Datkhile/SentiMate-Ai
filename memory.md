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
- **Phase 4: Conversation Engine & Wellbeing Check-ins** — ✅ Complete (Streaming chat via SSE, stop/retry controls, voluntary check-ins, verified emergency resources).
- **Phase 5: Counsellor Workspace & Transactional Appointments** — ✅ Complete (Review queue with explainable indicators, student file viewer with consent scope, confidential notes, slot availability with double-booking prevention).
- **Phase 6: Admin Governance & Privacy Operations** — ✅ Complete (Counsellor provisioning dialog, content-free audit logs, data rights requests, aggregate telemetry).
- **Phase 7: FastAPI ML Microservice & SHAP Explainability** — ✅ Complete (FastAPI service on port 8000, bearer token auth, DistilBERT + XGBoost pipeline, TreeSHAP explainer, honest fallback states).
- **Phase 8: Verification, Polish & Packaging** — ✅ Complete:
  - TypeScript build (`packages/contracts`): Exit code 0
  - Next.js production build (`apps/web`): 20 routes generated, Exit code 0
  - Pytest suite (`services/ml`): 5 test cases passed, Exit code 0

---

## 3. Key Invariants Enforced
- **Zero Hallucination / Honest Fallbacks**: Models, external APIs, and credentials are never fabricated. Missing `GEMINI_API_KEY` triggers a clear demonstration notice; uncalibrated ML weights return a preliminary rules-based assessment and explicitly withhold SHAP labels.
- **Strict Role Elevation Prevention**: Public registration trigger defaults unconditionally to `role: 'student'`. Counsellor accounts are provisioned exclusively by authenticated admins.
- **Database Concurrency Exclusion**: PostgreSQL `EXCLUDE USING gist` constraint prevents overlapping active counsellor bookings.
- **Student Profile Flexibility**: Supports 8 normalized semester results, permitting future/uncompleted semesters to remain null.
