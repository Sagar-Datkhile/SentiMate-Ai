'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  UserPlus,
  Settings,
  FileCheck2,
  Activity,
  LogOut,
  Menu,
  X,
  HeartHandshake,
  Database,
  Lock,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { createClient } from '@/lib/supabase/client';

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [displayName, setDisplayName] = useState('System Administrator');
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0];
          if (name) setDisplayName(name);
        }
      } catch {
        // Fall back to default
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AdminShell] Sign out error:', err);
    } finally {
      router.push('/auth/login');
      router.refresh();
    }
  };

  const navLinks = [
    { href: '/admin/dashboard', label: 'Overview & System Health', icon: Activity },
    { href: '/admin/counsellors', label: 'Counsellor Provisioning', icon: UserPlus },
    { href: '/admin/audit', label: 'Audit Logs & Privacy Ops', icon: FileCheck2 },
  ];

  const sidebar = (
    <div className="flex flex-col h-full bg-[#111318] text-[#F3F4F6] border-r border-[#242832] select-none">
      {/* Brand */}
      <div className="p-4 flex items-center justify-between border-b border-[#242832]">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight">SentiMate</span>
            <span className="block text-[10px] text-amber-400 uppercase font-semibold">Admin Console</span>
          </div>
        </Link>
        {mobileDrawerOpen && (
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1E222B] md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1 mb-1">
          Governance & Administration
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
                  ? 'bg-[#1E222B] text-amber-300 font-semibold border-l-2 border-amber-500'
                  : 'text-slate-300 hover:bg-[#1E222B] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 border-t border-[#242832] px-3 space-y-2">
          <div className="p-3 bg-[#1A1E26] rounded-xl text-[11px] text-slate-400 leading-relaxed border border-[#242832]">
            <Lock className="w-3.5 h-3.5 text-amber-400 mb-1" />
            <strong className="text-white block">Strict Privacy Invariant:</strong>
            Administrative access does not authorize reading private student conversations or confidential case notes.
          </div>
        </div>
      </nav>

      {/* Account Footer */}
      <div className="p-3 border-t border-[#242832] flex items-center justify-between">
        {isLoadingUser ? (
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <Skeleton variant="circular" className="w-7 h-7" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="text-xs font-medium block truncate">{displayName}</span>
              <span className="text-[10px] text-amber-400 block truncate">Institution Admin</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#1E222B] transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
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
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-[#E2E2DC] dark:border-[#2C3038] bg-white dark:bg-[#17191E] shrink-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228] min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-sm">Admin Console</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
