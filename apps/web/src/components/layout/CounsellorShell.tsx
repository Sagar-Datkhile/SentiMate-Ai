'use client';

import React, { useState, useEffect } from 'react';
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
import { Skeleton } from '../ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/ui/Toast';

interface CounsellorShellProps {
  children: React.ReactNode;
  counsellorName?: string;
}

export function CounsellorShell({
  children,
  counsellorName = 'Campus Counsellor',
}: CounsellorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [displayName, setDisplayName] = useState(counsellorName);
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
        // Fall back to prop
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUser();
  }, [counsellorName]);

  const handleSignOut = async () => {
    try {
      toast.clear();
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[CounsellorShell] Sign out error:', err);
    } finally {
      router.push('/auth/login');
      router.refresh();
    }
  };

  const navLinks = [
    { href: '/counsellor/dashboard', label: 'Dashboard & Review Queue', icon: LayoutDashboard },
    { href: '/counsellor/students', label: 'Assigned Students', icon: Users },
    { href: '/counsellor/cases', label: 'Active Cases & Notes', icon: FolderOpen },
    { href: '/counsellor/availability', label: 'Availability & Slots', icon: Clock },
  ];

  const sidebar = (
    <div className="flex flex-col h-full bg-[#0D0E11] text-[#F3F4F6] border-r border-[#1F2024] select-none">
      {/* Brand */}
      <div className="p-4 flex items-center justify-between border-b border-[#1F2024]">
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
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#18191C] md:hidden"
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
                  ? 'bg-[#18191C] text-teal-300 font-semibold border-l-2 border-teal-400'
                  : 'text-slate-300 hover:bg-[#18191C] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="p-3 border-t border-[#1F2024] flex items-center justify-between">
        {isLoadingUser ? (
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <Skeleton variant="circular" className="w-7 h-7" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="text-xs font-medium block truncate">{displayName}</span>
              <span className="text-[10px] text-teal-400 block truncate">Licensed Counsellor</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-[#18191C] transition-colors cursor-pointer"
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
    <div className="flex h-screen bg-[#FBFBFA] dark:bg-[#000000] overflow-hidden">
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
        <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#0D0E11] shrink-0">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] min-h-[44px] min-w-[44px] flex items-center justify-center"
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
