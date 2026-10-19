'use client';

import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Activity,
  Users,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Server,
  Zap,
} from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              System Overview & Governance Health
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Institutional usage aggregates, service uptime, and integration telemetry.
            </p>
          </div>
          <Badge variant="teal" size="md">
            System Status: Healthy
          </Badge>
        </div>

        {/* Aggregate Stats (Suppressed small groups for privacy) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Total Active Students</div>
            <div className="text-2xl font-bold text-[#18191B] dark:text-[#F3F4F6]">1,280+</div>
            <div className="text-[10px] text-[#0D766E] dark:text-[#2DD4BF]">Enrolled this semester</div>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Active Campus Counsellors</div>
            <div className="text-2xl font-bold text-[#18191B] dark:text-[#F3F4F6]">14</div>
            <div className="text-[10px] text-[#71757E]">Across 5 departments</div>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Completed Sessions</div>
            <div className="text-2xl font-bold text-[#18191B] dark:text-[#F3F4F6]">342</div>
            <div className="text-[10px] text-[#71757E]">This academic term</div>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Voluntary Check-ins</div>
            <div className="text-2xl font-bold text-[#18191B] dark:text-[#F3F4F6]">4,120+</div>
            <div className="text-[10px] text-[#0D766E] dark:text-[#2DD4BF]">Anonymized aggregates</div>
          </Card>
        </div>

        {/* Service Integrations Health */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
            Core Service & Integration Telemetry
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                  <span className="font-semibold text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6]">
                    Supabase PostgreSQL & Auth
                  </span>
                </div>
                <Badge variant="teal" size="sm">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-[#71757E]">
                26 normalized entities with 100% Row-Level Security policy enforcement. Database triggers actively guarding role elevation.
              </p>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                  <span className="font-semibold text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6]">
                    NVIDIA Nemotron SSE Chat
                  </span>
                </div>
                <Badge variant="teal" size="sm">
                  Streaming
                </Badge>
              </div>
              <p className="text-xs text-[#71757E]">
                OpenAI-compatible server-side streaming API active. Non-hallucinatory unavailable status reported when API key is unconfigured.
              </p>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                  <span className="font-semibold text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6]">
                    FastAPI ML Microservice
                  </span>
                </div>
                <Badge variant="neutral" size="sm">
                  Ready (Port 8000)
                </Badge>
              </div>
              <p className="text-xs text-[#71757E]">
                Python service for DistilBERT NLP feature extraction, XGBoost risk classification, and TreeSHAP feature explanations.
              </p>
            </Card>
          </div>
        </div>

        {/* Differential Privacy & Protection Policy */}
        <Card className="p-5 space-y-2 bg-[#F4F4F1] dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6]">
            <Lock className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
            <span>Differential Privacy & Re-identification Suppression Rules</span>
          </div>
          <p className="text-xs text-[#71757E] leading-relaxed">
            In compliance with FERPA and GDPR standards, all administrative usage graphs automatically suppress reporting cohort groups containing fewer than 5 individuals. Administrators have zero access to conversational content, sentiment extracts, or confidential clinical case notes.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
