# Project Specification: SentiMate

> **SentiMate**: Full-Stack Student Wellbeing & Counsellor-Support SaaS

## Mission
Build a complete, responsive application connecting private student conversations and voluntary wellbeing check-ins with explainable support indicators, consent-based counselling referrals, appointments and professional follow-up.

## Delivery Scope
- Monorepo containing:
  - `apps/web`: Next.js 15+ App Router, React 19, TypeScript, Tailwind CSS
  - `services/ml`: Python FastAPI ML Microservice (DistilBERT + XGBoost + SHAP)
  - `supabase/migrations`: 26 normalized entities with strict RLS policies
  - `packages/contracts`: Shared schema definitions
  - `tests`: Database authorization tests and cross-role workflows
- Full end-to-end operational functionality covering students, counsellors, and administrators.

## Stack
- Frontend: Next.js (App Router), React 19, Tailwind CSS, Lucide Icons
- Database & Auth: Supabase PostgreSQL, Supabase Auth, Row-Level Security
- Machine Learning: Hugging Face Transformers (DistilBERT), XGBoost, SHAP
- Conversational AI: Google Gemini Server-Side Streaming
- Deployment: Vercel (web), Supabase (data), Container/PaaS (ML service)
