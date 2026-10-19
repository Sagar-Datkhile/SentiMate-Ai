'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartHandshake, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'counsellor' | 'admin'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // In production with live Supabase, call authService / signInWithPassword.
      // We route to appropriate designated dashboard based on role:
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (role === 'student') {
        router.push('/student/chat');
      } else if (role === 'counsellor') {
        router.push('/counsellor/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#FBFBFA] dark:bg-[#0F1115] text-[#18191B] dark:text-[#F3F4F6] transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0D766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0F1115] shadow-md">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="font-bold text-2xl tracking-tight">SentiMate</span>
          </Link>
          <h1 className="text-xl font-bold text-[#18191B] dark:text-[#F3F4F6]">
            Welcome back to your safe space
          </h1>
          <p className="text-xs text-[#71757E]">
            Sign in to access your conversations or counsellor dashboard
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Card className="p-6 space-y-5 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {/* Role Demo Selector for dev/review testing */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5">
                Target Role Workspace (Demo Testing)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['student', 'counsellor', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border capitalize transition-colors min-h-[44px] ${
                      role === r
                        ? 'border-[#0D766E] dark:border-[#14B8A6] bg-[#F0FDFA] dark:bg-[rgba(20,184,166,0.15)] text-[#0D766E] dark:text-[#2DD4BF] font-semibold'
                        : 'border-[#E2E2DC] dark:border-[#2C3038] text-[#4A4D54] dark:text-[#9CA3AF]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full gap-2 shadow-sm font-semibold"
            >
              <span>Sign in to SentiMate</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </Card>

        <div className="text-center text-xs text-[#71757E]">
          Don't have an account?{' '}
          <Link
            href="/auth/register"
            className="font-semibold text-[#0D766E] dark:text-[#14B8A6] hover:underline"
          >
            Create student account
          </Link>
        </div>
      </div>
    </div>
  );
}
