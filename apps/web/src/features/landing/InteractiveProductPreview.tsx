'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Activity,
  UserCheck,
  ChevronRight,
  Shield,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type PreviewTab = 'chat' | 'checkin' | 'indicators' | 'counsellor';

export function InteractiveProductPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>('chat');

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] shadow-xl overflow-hidden transition-all">
      {/* Top Banner / Mode Switcher */}
      <div className="border-b border-[#E2E2DC] dark:border-[#1F2024] bg-[#F4F4F1] dark:bg-[#18191C] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="teal" size="sm">
            Interactive Product Demo
          </Badge>
          <span className="text-xs text-[#71757E]">Sample mock data • No live chat or data submission</span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#0D0E11] p-1 rounded-lg border border-[#E2E2DC] dark:border-[#1F2024]">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-[#4F648C] text-white dark:bg-[#2C67C5] dark:text-white'
                : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
            }`}
          >
            Student Chat
          </button>
          <button
            onClick={() => setActiveTab('checkin')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'checkin'
                ? 'bg-[#4F648C] text-white dark:bg-[#2C67C5] dark:text-white'
                : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
            }`}
          >
            Voluntary Check-in
          </button>
          <button
            onClick={() => setActiveTab('indicators')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'indicators'
                ? 'bg-[#4F648C] text-white dark:bg-[#2C67C5] dark:text-white'
                : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
            }`}
          >
            SHAP Explainability
          </button>
          <button
            onClick={() => setActiveTab('counsellor')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'counsellor'
                ? 'bg-[#4F648C] text-white dark:bg-[#2C67C5] dark:text-white'
                : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
            }`}
          >
            Counsellor Review
          </button>
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="p-6 md:p-8 min-h-[380px]">
        {activeTab === 'chat' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#4F648C] dark:bg-[#2C67C5] text-white dark:text-white flex items-center justify-center text-xs font-bold shrink-0">
                AI
              </div>
              <div className="bg-[#F4F4F1] dark:bg-[#18191C] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] max-w-[85%] leading-relaxed border border-[#E2E2DC] dark:border-[#1F2024]">
                Hello Alex. Midterms are approaching next week for your semester. How have you been feeling balancing study and sleep lately?
              </div>
            </div>

            <div className="flex items-start justify-end">
              <div className="bg-[#4F648C] text-white dark:bg-[#2C67C5] dark:text-white rounded-2xl rounded-tr-sm p-4 text-xs sm:text-sm max-w-[85%] leading-relaxed">
                Honestly, pretty overwhelmed with algorithms and lab reports. I haven't slept more than 4 hours in three nights.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#4F648C] dark:bg-[#2C67C5] text-white dark:text-white flex items-center justify-center text-xs font-bold shrink-0">
                AI
              </div>
              <div className="bg-[#F4F4F1] dark:bg-[#18191C] rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] max-w-[85%] leading-relaxed border border-[#E2E2DC] dark:border-[#1F2024] space-y-3">
                <p>
                  That sounds like a heavy strain, especially when prolonged lack of sleep compounds the pressure. Would you like to explore a quick practical pacing technique, or would you prefer to connect with Dr. Adams from campus counselling?
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center text-xs font-medium text-[#4F648C] dark:text-[#5B8DEF] bg-[#EEF2F8] dark:bg-[#242E40] px-3 py-1.5 rounded-lg border border-[#D6E0EE] dark:border-[#2C67C5]/20">
                    Request Human Support
                  </span>
                  <span className="inline-flex items-center text-xs font-medium text-[#4A4D54] dark:text-[#9CA3AF] bg-white dark:bg-[#0D0E11] px-3 py-1.5 rounded-lg border border-[#E2E2DC] dark:border-[#1F2024]">
                    Try Sleep Hygiene Guide
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'checkin' && (
          <div className="max-w-xl mx-auto space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                Voluntary Weekly Check-in (Sample)
              </h4>
              <p className="text-xs text-[#71757E]">
                Skippable at any time. You choose whether to share this summary with your assigned counsellor.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-[#F4F4F1] dark:bg-[#18191C]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF]">
                    How was your sleep over the past 3 days?
                  </span>
                  <Badge variant="neutral" size="sm">
                    4.5 hrs/night
                  </Badge>
                </div>
                <div className="w-full bg-[#E2E2DC] dark:bg-[#18191C] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#B45309] h-full rounded-full" style={{ width: '35%' }} />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-[#F4F4F1] dark:bg-[#18191C]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF]">
                    Current Academic Stress Level
                  </span>
                  <Badge variant="amber" size="sm">
                    Elevated (4 / 5)
                  </Badge>
                </div>
                <div className="w-full bg-[#E2E2DC] dark:bg-[#18191C] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#B45309] h-full rounded-full" style={{ width: '80%' }} />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-white dark:bg-[#0D0E11] rounded-lg border border-[#E2E2DC] dark:border-[#1F2024] text-xs text-[#4A4D54] dark:text-[#9CA3AF]">
                <Shield className="w-4 h-4 text-[#4F648C] dark:text-[#5B8DEF]" />
                <span>Sharing preference: Consented for assigned counsellor review during appointments.</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'indicators' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  SHAP Explainability Indicator Breakdown
                </h4>
                <p className="text-xs text-[#71757E]">
                  Transparent feature contributions from XGBoost inference on consented signals.
                </p>
              </div>
              <Badge variant="amber" size="md">
                Moderate Priority Indicator
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-[#F4F4F1] dark:bg-[#18191C] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                    Consecutive Low Sleep (&lt; 5 hrs)
                  </div>
                  <div className="text-[11px] text-[#71757E]">
                    Strongest positive push toward review recommendation
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#B45309] dark:text-[#FBBF24]">
                  +0.42 SHAP
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-[#F4F4F1] dark:bg-[#18191C] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                    DistilBERT Stress Valence in Conversational Text
                  </div>
                  <div className="text-[11px] text-[#71757E]">
                    Elevated linguistic anxiety cues in recent exchange
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#B45309] dark:text-[#FBBF24]">
                  +0.31 SHAP
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-[#F4F4F1] dark:bg-[#18191C] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                    Academic History & Continuity (Semester 4 SGPA)
                  </div>
                  <div className="text-[11px] text-[#71757E]">
                    Consistent academic performance moderates overall risk index
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#047857] dark:text-[#34D399]">
                  -0.18 SHAP
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#71757E] bg-white dark:bg-[#0D0E11] p-3 rounded-lg border border-[#E2E2DC] dark:border-[#1F2024]">
              💡 <strong>Decision Support Boundary:</strong> These factors reflect algorithmic model weights and do not constitute clinical pathology or diagnosis.
            </div>
          </div>
        )}

        {activeTab === 'counsellor' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  Assigned Student Review: Alex P.
                </h4>
                <p className="text-xs text-[#71757E]">Case ID: CS-2026-089 • Department of Computer Engineering</p>
              </div>
              <Badge variant="teal" size="md">
                Active Referral
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024]">
                <div className="font-semibold text-[#18191B] dark:text-[#F3F4F6] mb-1">Permitted Evidence</div>
                <ul className="text-[#4A4D54] dark:text-[#9CA3AF] space-y-1">
                  <li>• Consented weekly sleep & stress trends</li>
                  <li>• Self-reported referral note</li>
                  <li>• Raw chat transcripts: <strong className="text-[#4F648C] dark:text-[#5B8DEF]">Hidden (Not Consented)</strong></li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024]">
                <div className="font-semibold text-[#18191B] dark:text-[#F3F4F6] mb-1">Upcoming Appointment</div>
                <p className="text-[#4A4D54] dark:text-[#9CA3AF]">
                  Thursday, Oct 22 at 2:00 PM • Wellness Center Room 302
                </p>
                <div className="mt-2 text-[#4F648C] dark:text-[#5B8DEF] font-medium">
                  Confirmed (Transactional slot reserved)
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#0D0E11]">
              <div className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6] mb-1">
                Confidential Counsellor Assessment (Private to Dr. Adams)
              </div>
              <p className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] italic">
                "Student experiencing acute midterm stress compounded by sleep deficit. Pacing and exam workload management plan developed for Thursday session."
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
