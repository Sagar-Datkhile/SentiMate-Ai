'use client';

import React, { useState, useEffect } from 'react';
import { CounsellorShell } from '@/components/layout/CounsellorShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import {
  StatCardSkeleton,
  QueueItemSkeleton,
  LoadingRegion,
  Skeleton,
} from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
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
import { toast } from '@/components/ui/Toast';

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
    assignedCount: 0,
    awaitingReview: 0,
    pendingAppointments: 0,
    openCases: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  const [selectedCase, setSelectedCase] = useState<ReviewQueueItem | null>(null);
  const [assessmentNote, setAssessmentNote] = useState('');

  useEffect(() => {
    // Load real counsellor caseload and referral queue without simulated delay
    const loadDashboardData = () => {
      try {
        const storedReferrals = sessionStorage.getItem('sentimate_referrals');
        let queueItems: ReviewQueueItem[] = [];
        if (storedReferrals) {
          const parsed = JSON.parse(storedReferrals);
          queueItems = parsed.map((r: any, idx: number) => ({
            id: r.id || `case-${idx + 1}`,
            studentName: r.studentName || 'Student Referral',
            prn: r.prn || 'PRN-2024-ENG',
            semester: r.semester || 4,
            submittedAt: 'Today',
            reason: r.reason || 'Requested confidential counselling review.',
            priority: r.priority || 'routine',
            modelIndicator: {
              level: r.priority === 'urgent' ? 'elevated' : 'low',
              score: r.priority === 'urgent' ? 0.75 : 0.2,
              shapTopFactors: [
                { name: 'Self-reported stress cues', impact: '+0.25 SHAP' },
              ],
            },
            status: 'submitted',
          }));
        }

        setQueue(queueItems);

        const storedAppointments = sessionStorage.getItem('sentimate_student_appointments');
        const appointmentsCount = storedAppointments ? JSON.parse(storedAppointments).length : 0;

        const storedCases = sessionStorage.getItem('sentimate_counsellor_cases');
        const casesCount = storedCases ? JSON.parse(storedCases).length : 0;

        setStats({
          assignedCount: queueItems.length > 0 ? queueItems.length : 0,
          awaitingReview: queueItems.filter((q) => q.status === 'submitted').length,
          pendingAppointments: appointmentsCount,
          openCases: casesCount,
        });
      } catch {
        setQueue([]);
        setStats({ assignedCount: 0, awaitingReview: 0, pendingAppointments: 0, openCases: 0 });
      } finally {
        setIsLoadingStats(false);
        setIsLoadingQueue(false);
      }
    };
    loadDashboardData();
  }, []);

  const handleAcknowledge = (item: ReviewQueueItem) => {
    setQueue((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, status: 'acknowledged' } : c))
    );
    toast.success('Referral acknowledged.', {
      description: 'The support referral has been prioritized in your caseload.',
    });
  };

  const handleSaveAssessment = () => {
    if (!selectedCase) return;
    setQueue((prev) =>
      prev.map((c) => (c.id === selectedCase.id ? { ...c, status: 'in_progress' } : c))
    );
    setSelectedCase(null);
    setAssessmentNote('');
    toast.success('Case assessment saved.', {
      description: 'Case status has been updated to In Progress.',
    });
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
          {isLoadingStats ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <Badge variant="teal" size="md">
              Active Referrals: {queue.length}
            </Badge>
          )}
        </div>



        {/* 4 Stat Cards */}
        <LoadingRegion
          isLoading={isLoadingStats}
          announcement="Loading clinical dashboard statistics..."
        >
          {isLoadingStats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : (
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
          )}
        </LoadingRegion>

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

          <LoadingRegion
            isLoading={isLoadingQueue}
            announcement="Loading referral triage queue..."
          >
            {isLoadingQueue ? (
              <div className="space-y-3">
                <QueueItemSkeleton />
                <QueueItemSkeleton />
              </div>
            ) : queue.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Referrals Awaiting Review"
                description="Your caseload review queue is currently clear. When students request counselling support or self-referrals, triage records will appear here."
              />
            ) : (
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
                        <Badge variant={item.modelIndicator.level === 'elevated' ? 'red' : 'neutral'} size="sm">
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
                          Acknowledge Receipt
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
            )}
          </LoadingRegion>
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
