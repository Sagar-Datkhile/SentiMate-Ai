'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeartHandshake, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      // In production with live Supabase, call authService.registerStudent
      // Public signup is guaranteed to create only 'student' role.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setRegisteredSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
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
            Create your confidential student account
          </h1>
          <p className="text-xs text-[#71757E]">
            A private space to express your thoughts and access campus support
          </p>
        </div>

        {registeredSuccess ? (
          <Card className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)] text-[#047857] dark:text-[#34D399] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#18191B] dark:text-[#F3F4F6]">
              Account Created Successfully
            </h2>
            <p className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
              If your university requires email verification, a confirmation link has been dispatched to{' '}
              <strong>{email}</strong>. You can now sign in to enter your chat workspace directly.
            </p>
            <div className="pt-2">
              <Link href="/student/chat">
                <Button variant="primary" size="lg" className="w-full">
                  Enter Student Workspace Now
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="p-6 space-y-5 shadow-xl">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-[#F0FDFA] dark:bg-[rgba(20,184,166,0.12)] rounded-lg border border-[#CCFBF1] dark:border-[rgba(20,184,166,0.25)] text-xs text-[#0D766E] dark:text-[#2DD4BF]">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Public registration grants student role access. Counsellor and staff accounts are provisioned exclusively by administration.
              </span>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Student"
                required
              />

              <Input
                label="University Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                required
              />

              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full gap-2 shadow-sm font-semibold"
              >
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </Card>
        )}

        <div className="text-center text-xs text-[#71757E]">
          Already registered?{' '}
          <Link
            href="/auth/login"
            className="font-semibold text-[#0D766E] dark:text-[#14B8A6] hover:underline"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
