'use client';

import React, { useState } from 'react';
import { CounsellorShell } from '@/components/layout/CounsellorShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  Users,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  FileText,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

interface ReviewQueueItem {
  id: string;
  studentName: string;
  prn: string;
  semester: number;
  submittedAt: string;
  reason: string;
  priority: 'routine' | 'medium' | 'urgent';
  modelIndicator: {
    level: 'moderate' | 'elevated' | 'low';
    score: number;
    shapTopFactors: Array<{ name: string; impact: string }>;
  };
  status: 'submitted' | 'acknowledged' | 'in_progress';
}

export default function CounsellorDashboardPage() {
  const [stats, setStats] = useState({
    assignedCount: 24,
    awaitingReview: 3,
    pendingAppointments: 2,
    openCases: 8,
  });

  const [queue, setQueue] = useState<ReviewQueueItem[]>([
    {
      id: 'case-101',
      studentName: 'Alex P.',
      prn: 'PRN-2024-ENG-0892',
      semester: 4,
      submittedAt: 'Today, 9:30 AM',
      reason: 'Feeling acute burnout with midterms and lab assignments. Sleep severely reduced (<4 hrs).',
      priority: 'medium',
      modelIndicator: {
        level: 'moderate',
        score: 0.68,
        shapTopFactors: [
          { name: 'Consecutive sleep deficit (<5 hrs)', impact: '+0.42 SHAP' },
          { name: 'DistilBERT conversational stress cues', impact: '+0.31 SHAP' },
          { name: 'Consistent academic history (Sem 3 SGPA 8.10)', impact: '-0.18 SHAP' },
        ],
      },
      status: 'submitted',
    },
    {
      id: 'case-102',
      studentName: 'Marcus V.',
      prn: 'PRN-2023-CS-0419',
      semester: 6,
      submittedAt: 'Yesterday, 3:15 PM',
      reason: 'Seeking advice on balancing graduation project with campus internship interviews.',
      priority: 'routine',
      modelIndicator: {
        level: 'low',
        score: 0.22,
        shapTopFactors: [
          { name: 'Normal sleep pattern (7.5 hrs)', impact: '-0.35 SHAP' },
          { name: 'Stable self-reported mood score', impact: '-0.20 SHAP' },
        ],
      },
      status: 'acknowledged',
    },
  ]);

  const [selectedCase, setSelectedCase] = useState<ReviewQueueItem | null>(null);
  const [assessmentNote, setAssessmentNote] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleAcknowledge = (item: ReviewQueueItem) => {
    setQueue((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, status: 'acknowledged' } : c))
    );
    setActionSuccess(`Referral for ${item.studentName} marked as Acknowledged.`);
  };

  const handleSaveAssessment = () => {
    if (!selectedCase) return;
    setQueue((prev) =>
      prev.map((c) => (c.id === selectedCase.id ? { ...c, status: 'in_progress' } : c))
    );
    setActionSuccess(
      `Confidential counsellor assessment saved for ${selectedCase.studentName}. Case status updated to In Progress.`
    );
    setSelectedCase(null);
    setAssessmentNote('');
  };

  return (
    <CounsellorShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 w-full">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Clinical Dashboard & Review Queue
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Review assigned students, triage support referrals, and inspect explainable risk indicators.
            </p>
          </div>
          <Badge variant="teal" size="md">
            Assigned Caseload: 24 / 30 max
          </Badge>
        </div>

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.25)] text-[#047857] dark:text-[#34D399] flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Assigned Students</div>
            <div className="text-2xl font-bold text-[#18191B] dark:text-[#F3F4F6]">{stats.assignedCount}</div>
            <div className="text-[10px] text-[#0D766E] dark:text-[#2DD4BF]">Institutional scope active</div>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Awaiting Review</div>
            <div className="text-2xl font-bold text-[#B45309] dark:text-[#FBBF24]">{stats.awaitingReview}</div>
            <div className="text-[10px] text-[#71757E]">New referrals pending triage</div>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Appointment Requests</div>
            <div className="text-2xl font-bold text-[#0D766E] dark:text-[#14B8A6]">{stats.pendingAppointments}</div>
            <div className="text-[10px] text-[#71757E]">Pending confirmation</div>
          </Card>

          <Card className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-[#71757E] uppercase">Active Open Cases</div>
            <div className="text-2xl font-bold text-[#18191B] dark:text-[#F3F4F6]">{stats.openCases}</div>
            <div className="text-[10px] text-[#71757E]">Longitudinal follow-ups</div>
          </Card>
        </div>

        {/* Review Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
              Referral Triage & Review Queue
            </h2>
            <span className="text-xs text-[#71757E]">
              Includes explainable model indicators (SHAP)
            </span>
          </div>

          <div className="space-y-3">
            {queue.map((item) => (
              <Card key={item.id} className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E2DC]/60 dark:border-[#2C3038]/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-[#18191B] dark:text-[#F3F4F6]">
                      {item.studentName}
                    </span>
                    <Badge variant="neutral" size="sm">
                      {item.prn}
                    </Badge>
                    <span className="text-xs text-[#71757E]">Semester {item.semester}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.priority === 'urgent'
                          ? 'red'
                          : item.priority === 'medium'
                          ? 'amber'
                          : 'teal'
                      }
                      size="sm"
                    >
                      {item.priority} priority
                    </Badge>
                    <Badge variant={item.status === 'in_progress' ? 'teal' : 'neutral'} size="sm">
                      {item.status}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs sm:text-sm text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                  <strong>Referral Reason:</strong> "{item.reason}"
                </div>

                {/* Model Explainability Breakdown */}
                <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#0D766E] dark:text-[#14B8A6]" />
                      Explainable Support Indicator (TreeSHAP on XGBoost)
                    </span>
                    <Badge variant={item.modelIndicator.level === 'moderate' ? 'amber' : 'neutral'} size="sm">
                      Indicator Level: {item.modelIndicator.level} (Score {item.modelIndicator.score})
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {item.modelIndicator.shapTopFactors.map((fac, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-[#4A4D54] dark:text-[#9CA3AF]">• {fac.name}</span>
                        <span className="font-mono font-bold text-[#0D766E] dark:text-[#2DD4BF]">
                          {fac.impact}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-[#71757E] pt-1">
                    ⚠️ Model outputs are decision-support aids based on consented inputs. They do not constitute diagnostic findings.
                  </div>
                </div>

                {/* Counsellor Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  {item.status === 'submitted' && (
                    <Button
                      onClick={() => handleAcknowledge(item)}
                      variant="outline"
                      size="sm"
                    >
                      Acknowledge Referral
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setSelectedCase(item);
                      setAssessmentNote('');
                    }}
                    variant="primary"
                    size="sm"
                  >
                    Open Case & Record Assessment
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Case Assessment Dialog */}
      <Dialog
        isOpen={Boolean(selectedCase)}
        onClose={() => setSelectedCase(null)}
        title={selectedCase ? `Case Review: ${selectedCase.studentName}` : ''}
        description="Record your professional assessment separately from automated model outputs."
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-3 bg-[#F4F4F1] dark:bg-[#1F2228] rounded-xl text-xs space-y-1">
            <div className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">Student Referral Summary:</div>
            <p className="text-[#4A4D54] dark:text-[#9CA3AF]">"{selectedCase?.reason}"</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
              Confidential Counsellor Assessment (Restricted to you)
            </label>
            <textarea
              value={assessmentNote}
              onChange={(e) => setAssessmentNote(e.target.value)}
              placeholder="Record your clinical observations, recommended workload adjustments, or therapy goals..."
              rows={4}
              className="w-full rounded-lg p-2.5 bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-xs text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#0D766E]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setSelectedCase(null)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssessment}
              disabled={!assessmentNote.trim()}
              variant="primary"
            >
              Save Assessment & Update Case
            </Button>
          </div>
        </div>
      </Dialog>
    </CounsellorShell>
  );
}
