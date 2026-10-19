'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Menu, X, HeartHandshake } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '../ui/Button';

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 text-[#18191B] dark:text-[#F3F4F6] group">
            <div className="w-9 h-9 rounded-xl bg-[#0D766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0F1115] shadow-sm">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight">SentiMate</span>
              <span className="text-[10px] text-[#71757E] uppercase tracking-wider font-medium -mt-1">Wellbeing SaaS</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4A4D54] dark:text-[#9CA3AF]">
            <a href="#preview" className="hover:text-[#18191B] dark:hover:text-[#F3F4F6] transition-colors">
              How It Works
            </a>
            <a href="#privacy" className="hover:text-[#18191B] dark:hover:text-[#F3F4F6] transition-colors">
              Privacy & Control
            </a>
            <a href="#support" className="hover:text-[#18191B] dark:hover:text-[#F3F4F6] transition-colors">
              Human Support
            </a>
            <a href="#faq" className="hover:text-[#18191B] dark:hover:text-[#F3F4F6] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="primary" size="sm">
                Get started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228] min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E2E2DC] dark:border-[#2C3038] bg-white dark:bg-[#17191E] px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-2 text-base font-medium text-[#4A4D54] dark:text-[#9CA3AF]">
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228]"
            >
              How It Works
            </a>
            <a
              href="#privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228]"
            >
              Privacy & Control
            </a>
            <a
              href="#support"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228]"
            >
              Human Support
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228]"
            >
              FAQ
            </a>
          </nav>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" className="w-full">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
