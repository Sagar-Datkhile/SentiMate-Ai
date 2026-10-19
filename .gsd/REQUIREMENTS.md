# Requirements Traceability Matrix

## Functional Requirements

| ID | Title | Description | Phase | Status |
|---|---|---|---|---|
| REQ-AUTH-01 | Public Student Signup | Public signup strictly assigns role 'student'. Privileged role metadata rejected. | Phase 2 | Planned |
| REQ-AUTH-02 | Counsellor Provisioning | Admin creates counsellor via secure server operation. No public signup. | Phase 2, 6 | Planned |
| REQ-AUTH-03 | Admin Bootstrap | Secure CLI/migration bootstrap of initial admin account. | Phase 2 | Planned |
| REQ-AUTH-04 | Role Routing | Students land on `/student/chat`, counsellors on `/counsellor/dashboard`, admins on `/admin/dashboard`. | Phase 2, 3 | Planned |
| REQ-UI-01 | Design System & Themes | Light (warm off-white/teal) and Dark (deep charcoal/muted teal) themes with no theme flash. | Phase 3 | Planned |
| REQ-UI-02 | Responsive Landing Page | Calm, professional landing page with interactive preview, zero fake metrics. | Phase 3 | Planned |
| REQ-STU-01 | Student Chat Workspace | Chat-first interface inspired by ChatGPT with history, rename, delete, stop, and retry. | Phase 3, 4 | Planned |
| REQ-STU-02 | Student Profile | Profile management with username uniqueness, PRN, and Semesters 1-8 SGPA (nulls allowed). | Phase 3 | Planned |
| REQ-STU-03 | Wellbeing Check-ins | Voluntary skippable check-ins, mood/stress/sleep tracking, trends. | Phase 4 | Planned |
| REQ-STU-04 | Human Support Access | Persistent action to request counsellor referral and view verified emergency resources. | Phase 4, 5 | Planned |
| REQ-CNS-01 | Counsellor Dashboard | Review queue, assigned students, cases, appointment schedule. | Phase 5 | Planned |
| REQ-CNS-02 | Case Management | Longitudinal cases, status progression, separate confidential case notes. | Phase 5 | Planned |
| REQ-CNS-03 | Transactional Appointments | Availability slots, booking with database-level conflict prevention (no double booking). | Phase 5 | Planned |
| REQ-ADM-01 | User & Counsellor Management | Invite/provision counsellors, activate/deactivate accounts, assign counsellors to students. | Phase 6 | Planned |
| REQ-ADM-02 | Audit & Privacy Operations | Content-free audit logs, data export/deletion requests, system settings. | Phase 6 | Planned |
| REQ-ML-01 | FastAPI Microservice | DistilBERT feature extraction, XGBoost risk classification, TreeSHAP explanation. | Phase 7 | Planned |
| REQ-ML-02 | Honest Unavailable States | Truthful, graceful fallbacks when models/weights are not configured. | Phase 7 | Planned |
| REQ-QA-01 | Cross-Role E2E Verification | Automated verification of role boundaries, RLS, accessibility, and responsiveness. | Phase 8 | Planned |
