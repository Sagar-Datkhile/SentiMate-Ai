# Architecture Decision Records (ADRs)

## ADR-001: Context and Requirements Management
- **Status**: Accepted
- **Context**: The project requires strict context engineering and phase traceability.
- **Decision**: Adopt Get Shit Done (GSD) spec-driven structure with persistent tracking in `.gsd/` and root documentation (`design.md`, `implementation.md`, `memory.md`, `schema.db`, `README.md`).

## ADR-002: Standalone Design System vs Figma MCP
- **Status**: Accepted
- **Context**: The user requested inspection of Figma MCP. Inspection confirmed Figma MCP is not configured in the execution environment.
- **Decision**: Accurately document the absence of Figma MCP and implement a standalone, cohesive design token system in `design.md` and Tailwind configuration featuring warm off-white (light), deep charcoal slate (dark), and restrained teal accents.

## ADR-003: Database Source of Truth
- **Status**: Accepted
- **Context**: Schema definitions need strict reproducibility across environments.
- **Decision**: Versioned SQL files in `supabase/migrations/` are authoritative. `schema.db` is maintained as a synchronized PostgreSQL DDL snapshot.

## ADR-004: Public Signup Security Guarantee
- **Status**: Accepted
- **Context**: Prevent unauthorized privilege escalation during user registration.
- **Decision**: A PostgreSQL `AFTER INSERT ON auth.users` trigger (`handle_new_user()`) unconditionally sets `role = 'student'` and initializes student profile records. Admin and counsellor roles can never be claimed via signup payloads.

## ADR-005: Concurrency Protection for Appointments
- **Status**: Accepted
- **Context**: Prevent double booking of counsellors.
- **Decision**: Utilize PostgreSQL `EXCLUDE USING gist` constraints on the `appointments` table over the `tstzrange(start_time, end_time)` span for active statuses.
