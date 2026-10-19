import React from 'react';
import Link from 'next/link';
import { HeartHandshake, ShieldCheck, PhoneCall, AlertCircle } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-[#E2E2DC] dark:border-[#2C3038] bg-white dark:bg-[#17191E] text-sm">
      {/* Emergency Notice Banner */}
      <div className="bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border-b border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3 text-xs text-[#B91C1C] dark:text-[#F87171]">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Immediate crisis support:</strong> If you or someone you know is in immediate danger, call campus security or emergency services (911 / 112 / 988) immediately. SentiMate is not an emergency monitoring service.
            </span>
          </div>
          <Link
            href="/resources"
            className="font-semibold underline hover:text-red-900 dark:hover:text-red-300 min-h-[32px] flex items-center"
          >
            Emergency Hotlines Directory →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & mission */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0D766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0F1115]">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg text-[#18191B] dark:text-[#F3F4F6]">SentiMate</span>
            </div>
            <p className="text-[#4A4D54] dark:text-[#9CA3AF] max-w-md leading-relaxed text-xs sm:text-sm">
              Connecting university students with private conversational wellbeing support, optional check-ins, explainable indicators, and confidential counsellor appointments.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#71757E]">
              <ShieldCheck className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
              <span>Consent-governed data sharing • Strict institutional boundaries</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[#18191B] dark:text-[#F3F4F6] mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-[#4A4D54] dark:text-[#9CA3AF] text-xs sm:text-sm">
              <li>
                <Link href="/auth/login" className="hover:text-[#0D766E] dark:hover:text-[#14B8A6]">
                  Student Chat Space
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-[#0D766E] dark:hover:text-[#14B8A6]">
                  Counsellor Portal
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-[#0D766E] dark:hover:text-[#14B8A6]">
                  Crisis Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Governance & Privacy */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[#18191B] dark:text-[#F3F4F6] mb-3">
              Trust & Governance
            </h4>
            <ul className="space-y-2 text-[#4A4D54] dark:text-[#9CA3AF] text-xs sm:text-sm">
              <li>
                <a href="#privacy" className="hover:text-[#0D766E] dark:hover:text-[#14B8A6]">
                  Data Sharing Rules
                </a>
              </li>
              <li>
                <span className="text-[#71757E]">FERPA & GDPR Aligned</span>
              </li>
              <li>
                <span className="text-[#71757E]">Non-Diagnostic Disclaimer</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E2E2DC] dark:border-[#2C3038] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71757E]">
          <p>© {new Date().getFullYear()} SentiMate. All rights reserved. University Wellbeing Support Platform.</p>
          <p>Decision-support only. Not a medical or clinical diagnosis system.</p>
        </div>
      </div>
    </footer>
  );
}
