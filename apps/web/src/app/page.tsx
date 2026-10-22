'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronDown,
  UserCheck,
  Clock,
  Lock,
  Compass,
} from 'lucide-react';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InteractiveProductPreview } from '@/features/landing/InteractiveProductPreview';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: 'Does SentiMate replace campus counsellors or doctors?',
      a: 'No. SentiMate is strictly a wellbeing and decision-support tool. It provides students with a private conversational space, voluntary self-reflection check-ins, and a direct path to book appointments with qualified campus counsellors. It does not provide clinical diagnosis or emergency medical care.',
    },
    {
      q: 'Who can read my private chat messages?',
      a: 'Your chat messages are stored privately in your student account and protected by database Row-Level Security. Counsellors and campus administrators cannot read your raw chat history by default. If you request a counselling referral, you explicitly choose what summary data (e.g., self-reported mood trends or academic history) is shared.',
    },
    {
      q: 'Is SentiMate continuously monitored 24/7 by human counsellors?',
      a: 'No. Counsellors review referrals and appointments during configured campus office hours. SentiMate is not a 24/7 emergency dispatch or live monitoring service. Immediate emergency hotline numbers and campus security contacts are prominently displayed if you ever need crisis support.',
    },
    {
      q: 'How does the machine learning explainability (SHAP) work?',
      a: 'When students opt into automated insight analysis, our system uses natural language processing (DistilBERT) and tree-based modeling (XGBoost). SHAP (SHapley Additive exPlanations) highlights transparently which consented factors—such as sleep patterns or linguistic stress cues—contributed to a review recommendation, avoiding "black box" decisions.',
    },
    {
      q: 'Can I delete my account and data?',
      a: 'Yes. Under our privacy governance policies, students can request data exports or permanent account deletion at any time through their profile settings.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA] dark:bg-[#000000] text-[#18191B] dark:text-[#F3F4F6] transition-colors selection:bg-[#EEF2F8] selection:text-[#4F648C] dark:selection:bg-[#242E40] dark:selection:text-[#5B8DEF]">
      <LandingNavbar />

      <main className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF2F8] dark:bg-[#242E40] border border-[#D6E0EE] dark:border-[#2C67C5]/20 text-[#4F648C] dark:text-[#5B8DEF] text-xs font-semibold tracking-wide">
                <HeartHandshake className="w-4 h-4" />
                <span>Student Wellbeing & Professional Counsellor Support</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6] leading-[1.15]">
                A little space to talk.{' '}
                <span className="text-[#4F648C] dark:text-[#5B8DEF]">A clearer path to support.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#4A4D54] dark:text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
                Connect your everyday university journey with private conversational reflections, voluntary wellbeing check-ins, explainable indicators, and confidential counsellor appointments.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/auth/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto text-base gap-2">
                    Start private conversation
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <a href="#preview" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base">
                    Explore how support works
                  </Button>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-[#71757E]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#4F648C] dark:text-[#5B8DEF]" />
                  <span>Student-only registration guard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#4F648C] dark:text-[#5B8DEF]" />
                  <span>Row-Level Security on all chats</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#4F648C] dark:text-[#5B8DEF]" />
                  <span>Human-in-the-loop counselling</span>
                </div>
              </div>
            </div>

            {/* 2. INTERACTIVE PRODUCT PREVIEW */}
            <div id="preview" className="mt-16 md:mt-20 max-w-5xl mx-auto">
              <InteractiveProductPreview />
            </div>
          </div>
        </section>

        {/* 3. HOW SENTIMATE HELPS */}
        <section className="py-20 border-t border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#0D0E11] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <Badge variant="teal" size="sm">
                Careful Architecture
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
                Designed around student comfort and counsellor clarity
              </h2>
              <p className="text-sm text-[#4A4D54] dark:text-[#9CA3AF]">
                Three interconnected pillars ensuring you are supported at every step without ever compromising your privacy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  1. Natural Conversational Space
                </h3>
                <p className="text-sm text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                  Talk through academic workload, loneliness, or sleep concerns using natural conversational reflections powered by NVIDIA Nemotron. Your chats are completely private to your session.
                </p>
              </Card>

              {/* Feature 2 */}
              <Card className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] flex items-center justify-center">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  2. Voluntary Check-ins & Indicators
                </h3>
                <p className="text-sm text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                  Track your mood, stress, and sleep trends with optional skippable check-ins. If opted in, our transparent DistilBERT and XGBoost models produce explainable SHAP indicators without black-box guesswork.
                </p>
              </Card>

              {/* Feature 3 */}
              <Card className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  3. Direct Counsellor Connection
                </h3>
                <p className="text-sm text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                  When you need human support, connect directly with your assigned campus counsellor. Book transactional appointment slots with instant conflict prevention and dedicated case follow-up.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* 4. PRIVACY & CONTROL */}
        <section id="privacy" className="py-20 border-t border-[#E2E2DC] dark:border-[#1F2024] bg-[#FBFBFA] dark:bg-[#000000] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge variant="teal" size="sm">
                  Trust & Governance
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
                  Honest privacy boundaries and student-first data control
                </h2>
                <p className="text-sm text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                  We believe mental wellbeing platforms must earn trust through explicit transparency. We do not make misleading claims of "total anonymity" while silently logging messages, nor do we sell data to third parties.
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)] text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <strong className="text-[#18191B] dark:text-[#F3F4F6]">Chat History is Yours Alone:</strong> Campus administrators and counsellors cannot inspect your raw chat conversation transcripts without explicit consent.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)] text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <strong className="text-[#18191B] dark:text-[#F3F4F6]">Granular Referral Choices:</strong> When requesting a counsellor referral, you choose whether to share recent check-in trends or academic records.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)] text-[#047857] dark:text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <strong className="text-[#18191B] dark:text-[#F3F4F6]">Full Right to Deletion:</strong> Submit data export and account erasure requests directly from your settings.
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Breakdown Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] shadow-lg space-y-4">
                <h3 className="font-semibold text-base text-[#18191B] dark:text-[#F3F4F6]">
                  Data Access Boundaries at a Glance
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] flex justify-between items-center">
                    <span className="font-medium text-[#18191B] dark:text-[#F3F4F6]">Private Student Chat</span>
                    <Badge variant="teal" size="sm">Only Student</Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] flex justify-between items-center">
                    <span className="font-medium text-[#18191B] dark:text-[#F3F4F6]">Voluntary Check-in Trends</span>
                    <Badge variant="neutral" size="sm">Student + Consented Counsellor</Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] flex justify-between items-center">
                    <span className="font-medium text-[#18191B] dark:text-[#F3F4F6]">Confidential Case Notes</span>
                    <Badge variant="amber" size="sm">Assigned Counsellor Only</Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] flex justify-between items-center">
                    <span className="font-medium text-[#18191B] dark:text-[#F3F4F6]">System Audit Logs</span>
                    <Badge variant="neutral" size="sm">Content-Free Metadata Only</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. HUMAN SUPPORT & SERVICE HOURS */}
        <section id="support" className="py-20 border-t border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#0D0E11] transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl space-y-6">
            <Badge variant="teal" size="sm">
              Real Humans in the Loop
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Professional counsellors working alongside technology
            </h2>
            <p className="text-sm sm:text-base text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
              SentiMate does not replace human care. Campus counsellors hold scheduled office hours, manage confidential cases, and offer supportive guidance in a safe, non-judgmental environment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4">
              <div className="p-4 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-[#FBFBFA] dark:bg-[#000000]">
                <Clock className="w-5 h-5 text-[#4F648C] dark:text-[#5B8DEF] mb-2" />
                <h4 className="font-semibold text-sm text-[#18191B] dark:text-[#F3F4F6]">Official Service Hours</h4>
                <p className="text-xs text-[#71757E] mt-1">
                  Counsellors respond to referrals and conduct appointments during campus operating hours (Monday–Friday, 9:00 AM – 5:00 PM).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-[#FBFBFA] dark:bg-[#000000]">
                <HeartHandshake className="w-5 h-5 text-[#4F648C] dark:text-[#5B8DEF] mb-2" />
                <h4 className="font-semibold text-sm text-[#18191B] dark:text-[#F3F4F6]">No Waiting for a Model Score</h4>
                <p className="text-xs text-[#71757E] mt-1">
                  You can request a counselling appointment at any time regardless of automated scores or whether you completed a check-in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ SECTION */}
        <section id="faq" className="py-20 border-t border-[#E2E2DC] dark:border-[#1F2024] bg-[#FBFBFA] dark:bg-[#000000] transition-colors">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 space-y-2">
              <Badge variant="teal" size="sm">
                Questions & Answers
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#0D0E11] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-[#18191B] dark:text-[#F3F4F6] min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#2C67C5]"
                    aria-expanded={openFaq === idx}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#71757E] transition-transform duration-200 shrink-0 ml-2 ${
                        openFaq === idx ? 'rotate-180 text-[#4F648C] dark:text-[#5B8DEF]' : ''
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed border-t border-[#E2E2DC]/50 dark:border-[#1F2024]/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. FINAL CALL TO ACTION */}
        <section className="py-20 border-t border-[#E2E2DC] dark:border-[#1F2024] bg-[#4F648C] dark:bg-[#242E40] text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Take the first step toward clearer support today.
            </h2>
            <p className="text-slate-100 dark:text-slate-200 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
              Create your confidential student account in seconds and enter a calm, private space designed for you.
            </p>
            <div className="pt-2 flex justify-center">
              <Link href="/auth/register">
                <Button
                  size="lg"
                  className="bg-white text-[#4F648C] hover:bg-[#EEF2F8] dark:bg-white dark:text-[#4F648C] font-semibold text-base shadow-lg"
                >
                  Create Student Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
