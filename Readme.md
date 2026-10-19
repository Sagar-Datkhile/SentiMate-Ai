# SentiMate — Full-Stack Student Wellbeing & Counsellor-Support SaaS

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Auth-3ECF8E)](https://supabase.com/)

> **A little space to talk. A clearer path to support.**  
> SentiMate is an enterprise-grade decision-support and wellbeing SaaS platform connecting university students with conversational empathy, voluntary check-ins, explainable AI early indicators (DistilBERT + XGBoost + SHAP), consent-governed referrals, and professional counsellor follow-up.

---

## ⚠️ Clinical Disclaimer
**SentiMate is a decision-support, early-warning, and triage tool.** It is **not** a clinical diagnostic medical device and does not replace professional therapy, medical care, or crisis services. Urgent contacts and verified emergency hotlines are prominently available at all times regardless of system or model state.

---

## 🏛️ System Architecture

- **Web Frontend & Backend** (`apps/web`): Next.js App Router (React 19, TypeScript, Tailwind CSS).
- **Database & Auth** (`supabase`): Supabase PostgreSQL with 26 normalized entities, strict Row-Level Security (RLS), and database transactional concurrency control.
- **ML & Inference Microservice** (`services/ml`): Python FastAPI service running Hugging Face DistilBERT feature extraction, XGBoost risk classification, and TreeSHAP feature explanations.
- **AI Chatbot**: Server-side NVIDIA Nemotron (`nvidia/nemotron-3-super-120b-a12b`) integration via OpenAI-compatible streaming API with reasoning exclusion and student role protection.

---

## 🚀 Quick Start & Development Setup

### 1. Prerequisites
- **Node.js**: v20+ (v22.18+ recommended)
- **Python**: 3.11+ (Python 3.13 supported)
- **Supabase CLI**: installed via npx (`npx supabase`) or standalone binary
- **Git**

### 2. Monorepo Setup & Installation
```bash
# Clone the repository
git clone https://github.com/Sagar-Datkhile/SentiMate-Ai.git
cd SentiMate-Ai

# Install Next.js web application dependencies
cd apps/web
npm install
cd ../..

# Setup Python ML Microservice
cd services/ml
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` in `apps/web` and configure your credentials:
```bash
cp apps/web/.env.example apps/web/.env.local
```
Key variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Public Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Secret Service Role Key (Server-only)
- `CHAT_PROVIDER`: Conversational provider (default `nvidia`)
- `NVIDIA_API_KEY`: NVIDIA API Catalog key (from build.nvidia.com)
- `NVIDIA_BASE_URL`: NVIDIA NIM endpoint (default `https://integrate.api.nvidia.com/v1`)
- `NVIDIA_MODEL`: Model identifier (`nvidia/nemotron-3-super-120b-a12b`)
- `ML_SERVICE_URL`: URL of the FastAPI microservice (`http://127.0.0.1:8000`)
- `ML_SERVICE_API_KEY`: Shared bearer token between Next.js and FastAPI

### 4. Database Migrations
Migrations in `supabase/migrations/` are authoritative:
```bash
# Run local migrations with Supabase CLI
npx supabase db reset
# Or push to remote linked project
npx supabase db push
```

### 5. Running the Application
```bash
# Terminal 1: Run Next.js Web App
cd apps/web
npm run dev
# -> Opens http://localhost:3000

# Terminal 2: Run Python ML Service
cd services/ml
.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
# -> API Docs at http://localhost:8000/docs
```

---

## 👥 Roles & Workflows

1. **Student**:
   - Registers via public signup (strictly enforced role: `student`).
   - Lands directly on `/student/chat`.
   - Accesses conversation history, voluntary check-ins, profile editing (including 8 semester SGPAs), and self-referral to campus counsellors.
2. **Counsellor**:
   - Cannot register publicly. Provisioned securely by an Admin.
   - Lands on `/counsellor/dashboard`.
   - Manages assigned cases, reviews consented check-in signals and SHAP explainability indicators, sets availability, and conducts appointments.
3. **Admin**:
   - Initial admin bootstrapped via secure migration or CLI script.
   - Lands on `/admin/dashboard`.
   - Provisions counsellors, assigns counsellors to students, configures institutional service hours, and reviews audit logs. Cannot inspect private student conversations or case notes.

---

## 🔒 Security & Privacy Invariants
- **Database Row-Level Security (RLS)** is enabled on all 26 exposed tables.
- **Client-Role Elevation Prevention**: The `handle_new_user()` trigger guarantees student role on public signup.
- **Content-Free Audit Logging**: Audit trails log actor, action, and timestamps without logging sensitive conversational text or case note content.
- **Concurrency Protection**: Postgres `EXCLUDE` constraint on `appointments` prevents double booking of slots.

---

## 🧪 Testing & Verification
```bash
# Run web application tests & type checks
cd apps/web
npm run lint
npm run build

# Run ML microservice tests
cd services/ml
pytest
```

---

## 🌐 Conversational Provider & Language Limitations
- **Current Model**: `nvidia/nemotron-3-super-120b-a12b` via NVIDIA NIM OpenAI-compatible chat completions.
- **Thinking / Reasoning Mode**: Configured with `enable_thinking: false`. Internal reasoning traces (`delta.reasoning_content`) are stripped and never exposed or persisted as assistant messages.
- **Evaluated Languages**: Primary evaluations and safety guardrails are calibrated in English. Regional language support (e.g. Marathi or Hindi) is not promised or clinically evaluated in this version; students are advised to communicate in English for calibrated reflections.
