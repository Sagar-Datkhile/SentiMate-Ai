'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HeartHandshake, Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { GoogleIcon } from '@/components/ui/GoogleIcon';
import { createClient } from '@/lib/supabase/client';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'oauth_failed') {
      setErrorMessage('Google authentication could not be completed. Please try again.');
    } else if (errorParam === 'account_deactivated') {
      setErrorMessage('This account has been deactivated. Please contact campus administration.');
    }

    if (searchParams.get('registered') === 'true') {
      setInfoMessage('Account created successfully. Please sign in with your credentials.');
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate Google sign-in.');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData.user) {
        setErrorMessage(authError?.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      // Query user's profile to resolve role and verify account status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
        setErrorMessage('This account has been deactivated. Please contact campus administration.');
        setIsLoading(false);
        return;
      }

      // Route directly based on database role
      const userRole = profile?.role || 'student';
      if (userRole === 'admin') {
        router.push('/admin/dashboard');
      } else if (userRole === 'counsellor') {
        router.push('/counsellor/dashboard');
      } else {
        router.push('/student/chat');
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 flex items-center justify-center bg-transparent shrink-0">
            <HeartHandshake className="w-6 h-6 text-[#18191B] dark:text-white" />
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

      {infoMessage && (
        <div className="p-3.5 rounded-xl bg-[#F0FDF4] dark:bg-[rgba(34,197,94,0.12)] border border-[#BBF7D0] dark:border-[rgba(34,197,94,0.25)] text-emerald-800 dark:text-emerald-400 text-xs">
          {infoMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Card className="p-6 space-y-5 shadow-xl">
        {/* Sign in with Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#18191C] hover:bg-[#F4F4F0] dark:hover:bg-[#222327] text-[#18191B] dark:text-[#F3F4F6] text-sm font-semibold transition-colors shadow-xs min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#4F648C] dark:text-[#91A7D0]" />
          ) : (
            <GoogleIcon className="w-5 h-5" />
          )}
          <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <Divider>or continue with email</Divider>

        {/* Real Supabase Email + Password Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isGoogleLoading || isLoading}
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
          className="font-semibold text-[#4F648C] dark:text-[#91A7D0] hover:underline"
        >
          Create student account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#FBFBFA] dark:bg-[#000000] text-[#18191B] dark:text-[#F3F4F6] transition-colors relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-[#4F648C] dark:text-[#91A7D0]" />}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
