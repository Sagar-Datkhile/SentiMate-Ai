---
milestone: v1.0.0
version: 1.0.0
updated: 2026-10-19T17:28:00Z
---

# SentiMate — Roadmap

> **Current Phase:** Phase 8 — Verification & Final Handoff
> **Status:** Complete (Ready for Deployment)

## Must-Haves
- [x] Context management setup with GSD (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `DECISIONS.md`)
- [x] Core root documents (`design.md`, `implementation.md`, `memory.md`, `schema.db`, `README.md`)
- [x] Complete PostgreSQL migration in `supabase/migrations/` with RLS and triggers
- [x] Next.js 15+ App Router application with modular features
- [x] Responsive landing page with light/dark theme support & interactive preview
- [x] Student chat-first workspace with history, streaming NVIDIA Nemotron, stop/retry controls
- [x] Student profile with 8 normalized semesters (nulls supported for uncompleted semesters)
- [x] Voluntary check-ins, consent controls, and emergency resources directory
- [x] Counsellor dashboard with assigned students, cases, confidential notes, and transactional appointments
- [x] Admin console for counsellor provisioning, user management, and content-free audit logs
- [x] FastAPI microservice with DistilBERT, XGBoost, and real SHAP explanations
- [x] End-to-end verification and deployment documentation

---

## Phases

### Phase 1: Foundation & Context Setup
**Status:** ✅ Complete
**Objective:** Repository inspection, Get Shit Done setup, context documents (`design.md`, `implementation.md`, `memory.md`, `schema.db`, `README.md`), and roadmap.

### Phase 2: Supabase Schema, RLS & Authentication
**Status:** ✅ Complete
**Objective:** Authoritative migrations, Row-Level Security, role triggers, Next.js auth integration, and database tests.

### Phase 3: Design System, Landing Page & Student Shell
**Status:** ✅ Complete
**Objective:** Tailwind design tokens, responsive landing page, student chat shell (`/student/chat`), and profile with 8 semesters.

### Phase 4: Conversation Engine, NVIDIA Nemotron Streaming & Check-ins
**Status:** ✅ Complete
**Objective:** Chat persistence, NVIDIA Nemotron streaming with reasoning suppression, consent management, wellbeing check-ins, and emergency resources.

### Phase 5: Counsellor Workspace & Transactional Appointments
**Status:** ✅ Complete
**Objective:** Counsellor dashboard, review queue, confidential case notes, availability slots, and conflict-free booking.

### Phase 6: Admin Governance & Privacy Operations
**Status:** ✅ Complete
**Objective:** Counsellor provisioning, student assignment, audit logs, system settings, and aggregate analytics.

### Phase 7: FastAPI ML Microservice & SHAP Explainability
**Status:** ✅ Complete
**Objective:** FastAPI service, DistilBERT NLP feature extraction, XGBoost classifier, TreeSHAP explainer, and fallback states.

### Phase 8: Verification, Polish & Packaging
**Status:** ✅ Complete
**Objective:** Cross-role verification, accessibility and responsive testing, cleanup, and deployment guides.
