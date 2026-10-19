'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Calendar,
  Clock,
  UserCheck,
  LogOut,
  Menu,
  X,
  HeartHandshake,
  Shield,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Badge } from '../ui/Badge';

interface CounsellorShellProps {
  children: React.ReactNode;
  counsellorName?: string;
}

export function CounsellorShell({
  children,
  counsellorName = 'Dr. Sarah Adams',
}: CounsellorShellProps) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navLinks = [
    { href: '/counsellor/dashboard', label: 'Dashboard & Review Queue', icon: LayoutDashboard },
    { href: '/counsellor/students', label: 'Assigned Students', icon: Users },
    { href: '/counsellor/cases', label: 'Active Cases & Notes', icon: FolderOpen },
    { href: '/counsellor/availability', label: 'Availability & Slots', icon: Clock },
  ];

  const sidebar = (
    <div className="flex flex-col h-full bg-[#17191E] text-[#F3F4F6] border-r border-[#2C3038] select-none">
      {/* Brand */}
      <div className="p-4 flex items-center justify-between border-b border-[#2C3038]">
        <Link href="/counsellor/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#0D766E] flex items-center justify-center text-white shadow-sm">
            <HeartHandshake className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight">SentiMate</span>
            <span className="block text-[10px] text-teal-400 uppercase font-semibold">Counsellor Portal</span>
          </div>
        </Link>
        {mobileDrawerOpen && (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1F2228] md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
          Clinical Navigation
        </div>
        {navLinks.map((link) => {
          const isCurrent = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileDrawerOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isCurrent
                  ? 'bg-[#1F2228] text-teal-300 font-semibold border-l-2 border-teal-400'
                  : 'text-slate-300 hover:bg-[#1F2228] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="p-3 border-t border-[#2C3038] flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            {counsellorName.charAt(0)}
          </div>
          <div className="truncate">
            <span className="text-xs font-medium block truncate">{counsellorName}</span>
            <span className="text-[10px] text-teal-400 block truncate">Licensed Counsellor</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/auth/login" title="Sign out">
            <button
              className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1F2228] transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FBFBFA] dark:bg-[#0F1115] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-full">{sidebar}</aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 max-w-[85%] h-full z-10 shadow-2xl">{sidebar}</div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-[#E2E2DC] dark:border-[#2C3038] bg-white dark:bg-[#17191E] shrink-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
            <span className="font-semibold text-sm">Counsellor Portal</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
