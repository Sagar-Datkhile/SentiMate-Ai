'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Bell,
  Shield,
  Download,
  Trash2,
  Lock,
  KeyRound,
  AlertTriangle,
  HelpCircle,
  LifeBuoy,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Info,
  Clock,
  LogOut,
  Send,
  Languages,
  Sliders,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { useStudent } from '@/components/layout/StudentContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { clearStudentCache } from '@/components/layout/StudentContext';
import {
  UserPreferences,
  ConsentType,
  ConsentStatus,
} from '@sentimate/contracts';

type SettingsSection =
  | 'security'
  | 'chat'
  | 'notifications'
  | 'privacy'
  | 'conversations'
  | 'support';

interface AccountInfo {
  id: string;
  email: string;
  providers: string[];
  primaryProvider: string;
  hasPasswordAccount: boolean;
  createdAt: string;
  lastSignInAt: string;
}

interface ConsentRecord {
  consentType: ConsentType;
  status: ConsentStatus;
  termsVersion: string;
  updatedAt: string;
}

interface NotificationStatus {
  emailConfigured: boolean;
  emailStatusMessage: string;
  inAppConfigured: boolean;
}

const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English (Default)' },
  { code: 'auto', label: 'Automatic (Match student input language)' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'French', label: 'French (Français)' },
  { code: 'German', label: 'German (Deutsch)' },
  { code: 'Hindi', label: 'Hindi (हिन्दी)' },
  { code: 'Marathi', label: 'Marathi (मराठी)' },
];

export default function StudentSettingsPage() {
  const router = useRouter();
  const student = useStudent();

  // Active section (Account & Security ranked first)
  const [activeSection, setActiveSection] = useState<SettingsSection>('security');

  // Initial loading state
  const [isLoading, setIsLoading] = useState(true);

  // Auto-save status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Settings state
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    textSize: 'default',
    reducedAnimations: false,
    enterToSend: true,
    responseLanguage: 'English',
    responseLength: 'balanced',
    emailAppointmentReminders: true,
    emailCounsellorUpdates: true,
    inAppAppointmentReminders: true,
    inAppCounsellorUpdates: true,
  });

  const [consentMap, setConsentMap] = useState<Record<string, ConsentRecord>>({});
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRequestingResetEmail, setIsRequestingResetEmail] = useState(false);

  // Conversation export state
  const [exportScope, setExportScope] = useState<'all' | string>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown'>('markdown');
  const [isExporting, setIsExporting] = useState(false);

  // Conversation deletion modal state
  const [deleteSingleModalOpen, setDeleteSingleModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string>('');
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [isDeletingConversations, setIsDeletingConversations] = useState(false);

  // Account deletion modal state
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Session sign-out others state
  const [isRevokingOtherSessions, setIsRevokingOtherSessions] = useState(false);

  // Help & Support form state
  const [supportTab, setSupportTab] = useState<'contact' | 'problem'>('contact');
  const [supportCategory, setSupportCategory] = useState('general');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [includeDiagnosticContext, setIncludeDiagnosticContext] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  // Consent update in progress tracking
  const [updatingConsentType, setUpdatingConsentType] = useState<string | null>(null);

  // Debounced auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── 1. Fetch initial settings ──────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/student/settings');
      if (!res.ok) {
        throw new Error('Failed to load settings');
      }
      const data = await res.json();
      if (data.preferences) {
        setPreferences(data.preferences);
        // Sync local storage tokens
        try {
          localStorage.setItem('sentimate-theme', data.preferences.theme);
          localStorage.setItem('sentimate-text-size', data.preferences.textSize);
          localStorage.setItem('sentimate-reduced-motion', String(data.preferences.reducedAnimations));
          localStorage.setItem('sentimate-enter-to-send', String(data.preferences.enterToSend));

          // Apply DOM classes
          if (data.preferences.textSize === 'small' || data.preferences.textSize === 'large') {
            document.documentElement.setAttribute('data-chat-size', data.preferences.textSize);
          } else {
            document.documentElement.removeAttribute('data-chat-size');
          }

          if (data.preferences.reducedAnimations) {
            document.documentElement.classList.add('reduce-motion');
          } else {
            document.documentElement.classList.remove('reduce-motion');
          }
        } catch {
          // ignore storage error
        }
      }
      if (data.consent) {
        setConsentMap(data.consent);
      }
      if (data.accountInfo) {
        setAccountInfo(data.accountInfo);
      }
      if (data.notificationStatus) {
        setNotificationStatus(data.notificationStatus);
      }
    } catch (err: any) {
      console.warn('[Settings] Load error:', err?.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── 2. Auto-save preferences with debounce ─────────────────────────────────
  const savePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    setSaveStatus('saving');
    setSaveErrorMessage(null);

    try {
      const res = await fetch('/api/student/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to persist preferences');
      }

      const data = await res.json();
      if (data.preferences) {
        setPreferences(data.preferences);
      }

      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err.message || 'Auto-save failed');
      toast.error('Settings save failed.', {
        description: err.message || 'Unable to update preferences. Click retry to attempt again.',
      });
    }
  }, []);

  const triggerAutoSave = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPreferences((prev) => ({ ...prev, ...patch }));

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        savePreferences(patch);
      }, 500);
    },
    [savePreferences]
  );

  // ── Chat Preferences Handlers ─────────────────────────────────────────────

  const handleEnterToSendChange = (checked: boolean) => {
    try {
      localStorage.setItem('sentimate-enter-to-send', String(checked));
    } catch {
      // ignore
    }
    triggerAutoSave({ enterToSend: checked });
  };

  // ── Privacy & Consent Handler ─────────────────────────────────────────────
  const handleConsentToggle = async (consentType: ConsentType, currentStatus: ConsentStatus) => {
    const newStatus: ConsentStatus = currentStatus === 'granted' ? 'revoked' : 'granted';
    setUpdatingConsentType(consentType);

    try {
      const res = await fetch('/api/student/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType,
          status: newStatus,
          termsVersion: '1.0',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update consent status');
      }

      const data = await res.json();
      if (data.consent) {
        setConsentMap(data.consent);
      }

      toast.success(
        newStatus === 'granted'
          ? 'Consent granted.'
          : 'Consent withdrawn.',
        {
          description:
            newStatus === 'granted'
              ? 'Your authorization has been recorded in the immutable audit log.'
              : 'Future optional processing has been halted. Retained clinical records remain governed by campus policy.',
        }
      );
    } catch (err: any) {
      toast.error('Failed to update consent.', {
        description: err.message || 'Unable to update consent record. Please try again.',
      });
    } finally {
      setUpdatingConsentType(null);
    }
  };

  // ── Conversation Export Handler ───────────────────────────────────────────
  const handleExportConversations = async () => {
    setIsExporting(true);
    try {
      const payload: Record<string, any> = { format: exportFormat };
      if (exportScope !== 'all') {
        payload.sessionId = exportScope;
      }

      const res = await fetch('/api/student/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Export failed');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `sentimate-export.${exportFormat === 'markdown' ? 'md' : 'json'}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Conversation exported.', {
        description: `Downloaded ${filename} successfully.`,
      });
    } catch (err: any) {
      toast.error('Export failed.', {
        description: err.message || 'Unable to generate conversation archive.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Conversation Deletion Handlers ────────────────────────────────────────
  const handleDeleteSingleConversation = async () => {
    if (!sessionToDelete) return;
    setIsDeletingConversations(true);

    try {
      const res = await fetch('/api/student/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionToDelete }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete conversation');
      }

      // Refresh student context sessions and clear cache
      student.deleteSession(sessionToDelete);
      clearStudentCache();

      toast.success('Conversation deleted.', {
        description: 'The conversation and message history have been permanently removed.',
      });
      setDeleteSingleModalOpen(false);
      setSessionToDelete('');
    } catch (err: any) {
      toast.error('Deletion failed.', {
        description: err.message || 'Unable to delete conversation.',
      });
    } finally {
      setIsDeletingConversations(false);
    }
  };

  const handleDeleteAllConversations = async () => {
    setIsDeletingConversations(true);

    try {
      const res = await fetch('/api/student/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete conversations');
      }

      student.setSessions([]);
      student.setActiveSessionId(null);
      clearStudentCache();

      toast.success('All conversations deleted.', {
        description: 'Your entire conversational history has been permanently wiped.',
      });
      setDeleteAllModalOpen(false);
    } catch (err: any) {
      toast.error('Bulk deletion failed.', {
        description: err.message || 'Unable to wipe conversations.',
      });
    } finally {
      setIsDeletingConversations(false);
    }
  };

  // ── Password Change Handler ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Invalid password length.', {
        description: 'Password must be at least 8 characters long.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.', {
        description: 'Please ensure both password fields match.',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/student/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Password update failed');
      }

      toast.success('Password updated.', {
        description: 'Your account password has been updated securely.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error('Failed to change password.', {
        description: err.message || 'Please verify your current password and try again.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRequestPasswordResetEmail = async () => {
    setIsRequestingResetEmail(true);
    try {
      const res = await fetch('/api/student/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestReset: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to request reset email');
      }

      const data = await res.json();
      toast.success('Reset email dispatched.', {
        description: data.message || 'Check your university email for recovery instructions.',
      });
    } catch (err: any) {
      toast.error('Reset request failed.', {
        description: err.message || 'Unable to dispatch reset link.',
      });
    } finally {
      setIsRequestingResetEmail(false);
    }
  };

  // ── Revoke Other Sessions Handler ─────────────────────────────────────────
  const handleRevokeOtherSessions = async () => {
    setIsRevokingOtherSessions(true);
    try {
      const res = await fetch('/api/student/account/signout-others', {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to revoke other sessions');
      }

      const data = await res.json();
      toast.success('Other sessions revoked.', {
        description: data.message || 'All other active device sessions have been signed out.',
      });
    } catch (err: any) {
      toast.error('Revocation failed.', {
        description: err.message || 'Unable to revoke other sessions.',
      });
    } finally {
      setIsRevokingOtherSessions(false);
    }
  };

  // ── Account Deletion Handler ──────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') {
      toast.error('Confirmation required.', {
        description: 'You must type "DELETE" exactly to confirm account deletion.',
      });
      return;
    }

    setIsDeletingAccount(true);

    try {
      const res = await fetch('/api/student/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: 'DELETE',
          password: deleteAccountPassword || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Account deletion failed');
      }

      toast.success('Account permanently deleted.', {
        description: 'All student data and credentials have been erased.',
      });

      clearStudentCache();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // ignore
      }

      // Sign out from Supabase client
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }

      window.location.href = '/';
    } catch (err: any) {
      toast.error('Account deletion failed.', {
        description: err.message || 'Please check your password or contact campus administration.',
      });
      setIsDeletingAccount(false);
    }
  };

  // ── Help & Support Handler ────────────────────────────────────────────────
  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;

    setIsSubmittingSupport(true);

    try {
      const diagnosticData = includeDiagnosticContext
        ? {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            language: typeof navigator !== 'undefined' ? navigator.language : 'en',
            screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
            timestamp: new Date().toISOString(),
          }
        : undefined;

      const res = await fetch('/api/student/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryType: supportTab === 'problem' ? 'report_problem' : 'contact_support',
          subject: supportSubject.trim(),
          message: supportMessage.trim(),
          category: supportCategory,
          includeDiagnosticContext,
          diagnosticContext: diagnosticData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Submission failed');
      }

      const data = await res.json();
      toast.success(
        supportTab === 'problem' ? 'Problem report submitted.' : 'Support inquiry dispatched.',
        {
          description: data.message || 'Campus support has received your request.',
        }
      );

      setSupportSubject('');
      setSupportMessage('');
      setIncludeDiagnosticContext(false);
    } catch (err: any) {
      toast.error('Submission failed.', {
        description: err.message || 'Unable to submit support ticket. Please try again.',
      });
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  // Navigation tabs list
  const navTabs: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'security', label: 'Account & Security', icon: KeyRound },
    { id: 'chat', label: 'Chat Preferences', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Consent', icon: Shield },
    { id: 'conversations', label: 'Conversations & Data', icon: Download },
    { id: 'support', label: 'Help & Support', icon: LifeBuoy },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#1F2024] pb-5">
        <div>
          <h1
            className="text-3xl sm:text-4xl font-serif text-[#18191B] dark:text-[#F3F4F6] tracking-tight"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
          >
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#71757E] mt-1">
            Personalize your workspace, manage privacy consent, and configure notifications
          </p>
        </div>

        {/* Auto-save status feedback badge */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving changes...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <button
              type="button"
              onClick={() => savePreferences(preferences)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#FEF2F2] dark:bg-[#BA6868]/15 text-[#9E4A4A] dark:text-[#C47272] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
              title="Click to retry saving"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Save error — Retry</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingRegion isLoading={true} announcement="Loading settings..." className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="md:col-span-3 space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </LoadingRegion>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* ── Desktop Section Navigation ────────────────────────────────────── */}
          <nav
            aria-label="Settings sections"
            className="hidden md:flex flex-col space-y-1 sticky top-6 bg-white dark:bg-[#0D0E11] p-1.5 rounded-2xl border border-[#E2E2DC] dark:border-[#1F2024]"
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#2C67C5] cursor-pointer ${
                    isActive
                      ? 'bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] font-semibold shadow-xs'
                      : 'text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#4F648C] dark:text-[#5B8DEF]' : 'text-[#71757E]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Mobile Horizontal Scrollable Tabs ─────────────────────────────── */}
          <div className="flex md:hidden overflow-x-auto pb-2 gap-2 scrollbar-none">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] font-semibold border border-[#D5DFEE] dark:border-[#2C67C5]/30'
                      : 'bg-white dark:bg-[#0D0E11] text-[#71757E] border border-[#E2E2DC] dark:border-[#1F2024]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Main Settings Content Area ─────────────────────────────────────── */}
          <div className="md:col-span-3 space-y-6">
            {/* 1. ACCOUNT & SECURITY (Ranked to top) */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                {/* Account Details */}
                <Card className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      Account Identity & Credentials
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Trusted authentication records linked to your university student account.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#71757E]">University Email</span>
                      <p className="font-semibold text-[#18191B] dark:text-[#F3F4F6] truncate">
                        {accountInfo?.email || 'Loading...'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-[#71757E]">Account Created On</span>
                      <p className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                        {accountInfo?.createdAt ? new Date(accountInfo.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Password Management */}
                <Card className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      Password & Authentication
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Update your login password or request a secure setup/recovery email link.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <Input
                      label="Current Password (Optional for OAuth)"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter existing password"
                      autoComplete="current-password"
                    />

                    <Input
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      autoComplete="new-password"
                    />

                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      autoComplete="new-password"
                    />

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isChangingPassword}
                        disabled={!newPassword || newPassword.length < 8}
                      >
                        Update Password
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        isLoading={isRequestingResetEmail}
                        onClick={handleRequestPasswordResetEmail}
                      >
                        Send Recovery Email
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* Session Revocation */}
                <Card className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                        Active Device Sessions
                      </h2>
                      <p className="text-xs text-[#71757E] mt-1 max-w-md">
                        Sign out of all other browsers, mobile devices, and active sessions while keeping this window active.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={isRevokingOtherSessions}
                      onClick={handleRevokeOtherSessions}
                      className="shrink-0"
                    >
                      Sign Out Other Sessions
                    </Button>
                  </div>
                </Card>

                {/* Danger Zone: Account Deletion */}
                <Card className="p-6 space-y-4 border-[#E2E2DC] dark:border-[#BA6868]/20 bg-[#FEF2F2]/10 dark:bg-[#BA6868]/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-[#9E4A4A] dark:text-[#C47272] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#9E4A4A] dark:text-[#C47272]" />
                        <span>Delete SentiMate Account</span>
                      </h2>
                      <p className="text-xs text-[#71757E] mt-1 max-w-md leading-relaxed">
                        Permanently erases your student profile, chat history, and personal preferences from the platform. This action is irreversible.
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteAccountModalOpen(true)}
                      className="text-[#9E4A4A] dark:text-[#C47272] border-[#E2E2DC] dark:border-[#BA6868]/30 hover:bg-[#FEF2F2] dark:hover:bg-[#BA6868]/10 shrink-0"
                    >
                      Delete Account
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* 2. CHAT PREFERENCES */}
            {activeSection === 'chat' && (
              <div className="space-y-6">
                <Card className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                        Enter Key Behavior
                      </h2>
                      <p className="text-xs text-[#71757E] mt-1 max-w-md leading-relaxed">
                        When enabled, pressing <kbd className="px-1 py-0.5 rounded bg-[#EAEAE5] dark:bg-[#282C34] text-[10px]">Enter</kbd> sends your message and <kbd className="px-1 py-0.5 rounded bg-[#EAEAE5] dark:bg-[#282C34] text-[10px]">Shift+Enter</kbd> inserts a newline. When disabled, Enter adds a newline and sending requires clicking the Send button. Mobile keyboards and IME compositions are never prematurely submitted.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={preferences.enterToSend}
                        onChange={(e) => handleEnterToSendChange(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#E2E2DC] dark:bg-[#2E3036] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F648C] dark:peer-checked:bg-[#2C67C5]" />
                    </label>
                  </div>
                </Card>

                <Card className="p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      Preferred Response Language
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Instructs the AI companion to converse in your chosen language. The companion preserves all campus safety boundaries and emergency crisis triage regardless of language.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Select
                      value={preferences.responseLanguage}
                      onChange={(e) => triggerAutoSave({ responseLanguage: e.target.value })}
                      options={SUPPORTED_LANGUAGES.map((lang) => ({
                        value: lang.code,
                        label: lang.label,
                      }))}
                    />
                  </div>
                </Card>

                <Card className="p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      Companion Response Length
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Tailor how much depth and detail the AI companion provides per turn without altering model safety instructions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'concise',
                        title: 'Concise',
                        desc: '1–2 brief paragraphs. Focuses on quick self-reflections.',
                      },
                      {
                        id: 'balanced',
                        title: 'Balanced (Default)',
                        desc: '2–3 paragraphs. Supportive exploration with one question.',
                      },
                      {
                        id: 'detailed',
                        title: 'Detailed',
                        desc: 'Comprehensive structured insights and thorough context.',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => triggerAutoSave({ responseLength: opt.id as any })}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          preferences.responseLength === opt.id
                            ? 'border-[#4F648C] dark:border-[#2C67C5] bg-[#EEF2F8] dark:bg-[#242E40] text-[#18191B] dark:text-[#F3F4F6]'
                            : 'border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#18191C] text-[#4A4D54] dark:text-[#9CA3AF] hover:border-[#C8C8C0]'
                        }`}
                      >
                        <span className="font-semibold text-xs text-[#18191B] dark:text-[#F3F4F6] block mb-1">
                          {opt.title}
                        </span>
                        <span className="text-[11px] text-[#71757E] leading-relaxed">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 3. NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <Card className="p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      Appointment & Counsellor Alerts
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Configure separate channels for transactional appointment bookings and counsellor communications.
                    </p>
                  </div>

                  <div className="divide-y divide-[#E2E2DC] dark:divide-[#1F2024] space-y-4 pt-1">
                    {/* Appointment reminders */}
                    <div className="pt-4 space-y-3">
                      <span className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6] block">
                        Counsellor Appointment Reminders
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#18191C] hover:border-[#C8C8C0] dark:hover:border-[#2E3036] transition-colors cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <Bell className="w-4 h-4 text-[#71757E]" />
                            <span className="text-xs font-medium text-[#18191B] dark:text-[#F3F4F6]">In-App Notification</span>
                          </div>
                          <div className="relative inline-flex items-center shrink-0">
                            <input
                              type="checkbox"
                              checked={preferences.inAppAppointmentReminders}
                              onChange={(e) => triggerAutoSave({ inAppAppointmentReminders: e.target.checked })}
                              className="sr-only peer"
                              aria-label="In-App Appointment Reminders"
                            />
                            <div className="w-11 h-6 bg-[#E2E2DC] dark:bg-[#2E3036] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F648C] dark:peer-focus-visible:ring-[#2C67C5] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F648C] dark:peer-checked:bg-[#2C67C5]" />
                          </div>
                        </label>
                        <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#18191C] hover:border-[#C8C8C0] dark:hover:border-[#2E3036] transition-colors cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-[#71757E]" />
                            <span className="text-xs font-medium text-[#18191B] dark:text-[#F3F4F6]">University Email</span>
                          </div>
                          <div className="relative inline-flex items-center shrink-0">
                            <input
                              type="checkbox"
                              checked={preferences.emailAppointmentReminders}
                              onChange={(e) => triggerAutoSave({ emailAppointmentReminders: e.target.checked })}
                              className="sr-only peer"
                              aria-label="University Email Appointment Reminders"
                            />
                            <div className="w-11 h-6 bg-[#E2E2DC] dark:bg-[#2E3036] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F648C] dark:peer-focus-visible:ring-[#2C67C5] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F648C] dark:peer-checked:bg-[#2C67C5]" />
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Counsellor updates */}
                    <div className="pt-4 space-y-3">
                      <span className="text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6] block">
                        Referral & Case Status Follow-ups
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#18191C] hover:border-[#C8C8C0] dark:hover:border-[#2E3036] transition-colors cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <Bell className="w-4 h-4 text-[#71757E]" />
                            <span className="text-xs font-medium text-[#18191B] dark:text-[#F3F4F6]">In-App Notification</span>
                          </div>
                          <div className="relative inline-flex items-center shrink-0">
                            <input
                              type="checkbox"
                              checked={preferences.inAppCounsellorUpdates}
                              onChange={(e) => triggerAutoSave({ inAppCounsellorUpdates: e.target.checked })}
                              className="sr-only peer"
                              aria-label="In-App Counsellor Updates"
                            />
                            <div className="w-11 h-6 bg-[#E2E2DC] dark:bg-[#2E3036] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F648C] dark:peer-focus-visible:ring-[#2C67C5] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F648C] dark:peer-checked:bg-[#2C67C5]" />
                          </div>
                        </label>
                        <label className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#18191C] hover:border-[#C8C8C0] dark:hover:border-[#2E3036] transition-colors cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-[#71757E]" />
                            <span className="text-xs font-medium text-[#18191B] dark:text-[#F3F4F6]">University Email</span>
                          </div>
                          <div className="relative inline-flex items-center shrink-0">
                            <input
                              type="checkbox"
                              checked={preferences.emailCounsellorUpdates}
                              onChange={(e) => triggerAutoSave({ emailCounsellorUpdates: e.target.checked })}
                              className="sr-only peer"
                              aria-label="University Email Counsellor Updates"
                            />
                            <div className="w-11 h-6 bg-[#E2E2DC] dark:bg-[#2E3036] peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F648C] dark:peer-focus-visible:ring-[#2C67C5] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4F648C] dark:peer-checked:bg-[#2C67C5]" />
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Honest Provider Status Notice */}
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                    notificationStatus?.emailConfigured
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-[#F4F4F1] dark:bg-[#18191C] border-[#E2E2DC] dark:border-[#1F2024] text-[#71757E]'
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#4F648C] dark:text-[#5B8DEF]" />
                  <div className="space-y-1">
                    <strong className="block text-[#18191B] dark:text-[#F3F4F6]">
                      Delivery Infrastructure Status
                    </strong>
                    <p>{notificationStatus?.emailStatusMessage}</p>
                    <p className="text-[11px] pt-1 border-t border-[#E2E2DC]/50 dark:border-[#1F2024]/50">
                      Security messages (password changes, session revocations, and account deletion confirmations) are mandatory and bypass notification opt-outs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. PRIVACY & CONSENT */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-[#EEF2F8] dark:bg-[#242E40]/40 border border-[#D5DFEE] dark:border-[#2C67C5]/20 text-xs text-[#4A4D54] dark:text-[#9CA3AF] space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                    <Shield className="w-4 h-4 text-[#4F648C] dark:text-[#5B8DEF]" />
                    <span>Authoritative Consent Governance</span>
                  </div>
                  <p>
                    SentiMate records every consent grant and withdrawal in an immutable backend audit trail. Withdrawing consent immediately halts optional background processing and prevents future access. Chatbot conversational reflections remain accessible regardless of your sharing decisions.
                  </p>
                </div>

                {/* 1. NLP Sentiment & Emotion Analysis */}
                <Card className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                          Wellbeing Trend & Sentiment Analysis
                        </h2>
                        <Badge
                          variant={consentMap['nlp_sentiment_analysis']?.status === 'granted' ? 'teal' : 'neutral'}
                          size="sm"
                        >
                          {consentMap['nlp_sentiment_analysis']?.status === 'granted' ? 'Active' : 'Withdrawn'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#71757E] leading-relaxed max-w-xl">
                        Authorizes local ML models (DistilBERT + XGBoost) to compute non-clinical stress and mood indicators from your self-reflections. Withdrawing halts future automated analysis jobs.
                      </p>
                    </div>

                    <Button
                      variant={consentMap['nlp_sentiment_analysis']?.status === 'granted' ? 'outline' : 'primary'}
                      size="sm"
                      isLoading={updatingConsentType === 'nlp_sentiment_analysis'}
                      onClick={() =>
                        handleConsentToggle(
                          'nlp_sentiment_analysis',
                          consentMap['nlp_sentiment_analysis']?.status || 'granted'
                        )
                      }
                      className="shrink-0"
                    >
                      {consentMap['nlp_sentiment_analysis']?.status === 'granted' ? 'Withdraw Consent' : 'Grant Consent'}
                    </Button>
                  </div>

                  <div className="pt-2 text-[11px] text-[#71757E] flex items-center justify-between border-t border-[#E2E2DC] dark:border-[#1F2024]">
                    <span>Terms version: {consentMap['nlp_sentiment_analysis']?.termsVersion || '1.0'}</span>
                    <span>
                      Last recorded:{' '}
                      {consentMap['nlp_sentiment_analysis']?.updatedAt
                        ? new Date(consentMap['nlp_sentiment_analysis'].updatedAt).toLocaleDateString()
                        : 'Default policy'}
                    </span>
                  </div>
                </Card>

                {/* 2. Counsellor Data Sharing */}
                <Card className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                          Counsellor Data Sharing
                        </h2>
                        <Badge
                          variant={consentMap['counsellor_data_sharing']?.status === 'granted' ? 'teal' : 'neutral'}
                          size="sm"
                        >
                          {consentMap['counsellor_data_sharing']?.status === 'granted' ? 'Active' : 'Withdrawn'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#71757E] leading-relaxed max-w-xl">
                        Authorizes assigned campus counsellors to view your voluntary wellbeing check-in records during reviews. Withdrawing stops future counsellor access; previously documented clinical case notes remain retained per university medical records retention standards.
                      </p>
                    </div>

                    <Button
                      variant={consentMap['counsellor_data_sharing']?.status === 'granted' ? 'outline' : 'primary'}
                      size="sm"
                      isLoading={updatingConsentType === 'counsellor_data_sharing'}
                      onClick={() =>
                        handleConsentToggle(
                          'counsellor_data_sharing',
                          consentMap['counsellor_data_sharing']?.status || 'revoked'
                        )
                      }
                      className="shrink-0"
                    >
                      {consentMap['counsellor_data_sharing']?.status === 'granted' ? 'Withdraw Consent' : 'Grant Consent'}
                    </Button>
                  </div>

                  <div className="pt-2 text-[11px] text-[#71757E] flex items-center justify-between border-t border-[#E2E2DC] dark:border-[#1F2024]">
                    <span>Terms version: {consentMap['counsellor_data_sharing']?.termsVersion || '1.0'}</span>
                    <span>
                      Last recorded:{' '}
                      {consentMap['counsellor_data_sharing']?.updatedAt
                        ? new Date(consentMap['counsellor_data_sharing'].updatedAt).toLocaleDateString()
                        : 'Default opt-in'}
                    </span>
                  </div>
                </Card>

                {/* 3. Chat History Persistence */}
                <Card className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                          Conversation History Storage
                        </h2>
                        <Badge
                          variant={consentMap['ai_chat_processing']?.status === 'granted' ? 'teal' : 'neutral'}
                          size="sm"
                        >
                          {consentMap['ai_chat_processing']?.status === 'granted' ? 'Active' : 'Withdrawn'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#71757E] leading-relaxed max-w-xl">
                        Stores compressed conversation sessions to restore your chat history when logging in. Withdrawing halts database storage for new messages (conversations will be ephemeral).
                      </p>
                    </div>

                    <Button
                      variant={consentMap['ai_chat_processing']?.status === 'granted' ? 'outline' : 'primary'}
                      size="sm"
                      isLoading={updatingConsentType === 'ai_chat_processing'}
                      onClick={() =>
                        handleConsentToggle(
                          'ai_chat_processing',
                          consentMap['ai_chat_processing']?.status || 'granted'
                        )
                      }
                      className="shrink-0"
                    >
                      {consentMap['ai_chat_processing']?.status === 'granted' ? 'Withdraw Consent' : 'Grant Consent'}
                    </Button>
                  </div>

                  <div className="pt-2 text-[11px] text-[#71757E] flex items-center justify-between border-t border-[#E2E2DC] dark:border-[#1F2024]">
                    <span>Terms version: {consentMap['ai_chat_processing']?.termsVersion || '1.0'}</span>
                    <span>
                      Last recorded:{' '}
                      {consentMap['ai_chat_processing']?.updatedAt
                        ? new Date(consentMap['ai_chat_processing'].updatedAt).toLocaleDateString()
                        : 'Active'}
                    </span>
                  </div>
                </Card>
              </div>
            )}

            {/* 5. CONVERSATIONS & DATA */}
            {activeSection === 'conversations' && (
              <div className="space-y-6">
                {/* Export Data */}
                <Card className="p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      Export Conversations
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Download your conversation history as readable Markdown or structured JSON. Internal model prompts, API tokens, and other students&apos; data are strictly excluded.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="Export Scope"
                        labelClassName="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5 normal-case"
                        value={exportScope}
                        onChange={(e) => setExportScope(e.target.value)}
                        options={[
                          { value: 'all', label: `All Conversations (${student.sessions.length} sessions)` },
                          ...student.sessions.map((s) => ({ value: s.id, label: s.title })),
                        ]}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5">
                        File Format
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExportFormat('markdown')}
                          className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                            exportFormat === 'markdown'
                              ? 'border-[#4F648C] dark:border-[#2C67C5] bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] font-semibold'
                              : 'border-[#E2E2DC] dark:border-[#1F2024] text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C]'
                          }`}
                        >
                          Markdown (.md)
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportFormat('json')}
                          className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                            exportFormat === 'json'
                              ? 'border-[#4F648C] dark:border-[#2C67C5] bg-[#EEF2F8] dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] font-semibold'
                              : 'border-[#E2E2DC] dark:border-[#1F2024] text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C]'
                          }`}
                        >
                          JSON (.json)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isExporting}
                      onClick={handleExportConversations}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Archive</span>
                    </Button>
                  </div>
                </Card>

                {/* Delete Conversations */}
                <Card className="p-6 space-y-5 border-[#E2E2DC] dark:border-[#BA6868]/20">
                  <div>
                    <h2 className="text-base font-semibold text-[#9E4A4A] dark:text-[#C47272]">
                      Delete Conversations
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Permanently erase conversation sessions and messages from the database. Deleted messages cannot be restored.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteSingleModalOpen(true)}
                      disabled={student.sessions.length === 0}
                      className="gap-2 text-[#9E4A4A] dark:text-[#C47272] border-[#E2E2DC] dark:border-[#BA6868]/30 hover:bg-[#FEF2F2] dark:hover:bg-[#BA6868]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Individual Conversation</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteAllModalOpen(true)}
                      disabled={student.sessions.length === 0}
                      className="gap-2 text-[#9E4A4A] dark:text-[#C47272] border-[#E2E2DC] dark:border-[#BA6868]/30 hover:bg-[#FEF2F2] dark:hover:bg-[#BA6868]/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete All Conversations</span>
                    </Button>
                  </div>
                </Card>
              </div>
            )}


            {/* 7. HELP & SUPPORT */}
            {activeSection === 'support' && (
              <div className="space-y-6">
                <Card className="p-6 space-y-6">
                  <div>
                    <h2 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      Campus Support & Feedback
                    </h2>
                    <p className="text-xs text-[#71757E] mt-1">
                      Get help from university platform administrators or report technical issues with the SentiMate application.
                    </p>
                  </div>

                  {/* Form Type Switcher */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F4F1] dark:bg-[#18191C] rounded-xl max-w-md">
                    <button
                      type="button"
                      onClick={() => setSupportTab('contact')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        supportTab === 'contact'
                          ? 'bg-white dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] shadow-xs'
                          : 'text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
                      }`}
                    >
                      Contact Support
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupportTab('problem')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        supportTab === 'problem'
                          ? 'bg-white dark:bg-[#242E40] text-[#4F648C] dark:text-[#5B8DEF] shadow-xs'
                          : 'text-[#71757E] hover:text-[#18191B] dark:hover:text-[#F3F4F6]'
                      }`}
                    >
                      Report a Problem
                    </button>
                  </div>

                  <form onSubmit={handleSubmitSupport} className="space-y-4">
                    <div>
                      <Select
                        label="Category"
                        labelClassName="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5 normal-case"
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value)}
                        options={
                          supportTab === 'contact'
                            ? [
                                { value: 'general', label: 'General Support Inquiry' },
                                { value: 'counsellor', label: 'Counselling Services Question' },
                                { value: 'account', label: 'Account Access & PRN Verification' },
                                { value: 'privacy', label: 'Privacy & Data Governance' },
                              ]
                            : [
                                { value: 'chat_bug', label: 'AI Companion Response Issue' },
                                { value: 'appointments_bug', label: 'Appointment Scheduling Glitch' },
                                { value: 'appearance_bug', label: 'Visual or Theme Rendering Bug' },
                                { value: 'performance_bug', label: 'Slow Loading or Disconnection' },
                              ]
                        }
                      />
                    </div>

                    <Input
                      label="Subject"
                      type="text"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder={supportTab === 'problem' ? 'Brief summary of the issue' : 'How can we help you?'}
                      required
                    />

                    <Textarea
                      label="Details"
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder={
                        supportTab === 'problem'
                          ? 'Describe what happened, steps to reproduce the problem, and any error message you saw...'
                          : 'Provide details about your question or inquiry...'
                      }
                      rows={4}
                      required
                    />

                    {supportTab === 'problem' && (
                      <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={includeDiagnosticContext}
                          onChange={(e) => setIncludeDiagnosticContext(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-[#E2E2DC] text-[#4F648C] dark:text-[#5B8DEF] focus:ring-[#4F648C]"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6] block">
                            Include non-sensitive browser & device diagnostic context
                          </span>
                          <span className="text-[#71757E]">
                            Attaches your browser version, screen dimensions, and submission timestamp. Conversation messages and private reflection content are NEVER attached.
                          </span>
                        </div>
                      </label>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={isSubmittingSupport}
                        disabled={!supportSubject.trim() || !supportMessage.trim()}
                        className="gap-2 shadow-sm font-semibold"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{supportTab === 'problem' ? 'Submit Bug Report' : 'Dispatch Inquiry'}</span>
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* Non-Medical Disclaimer & Policies */}
                <div className="p-4 rounded-2xl bg-[#F4F4F1] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] text-xs text-[#71757E] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                    <LifeBuoy className="w-4 h-4 text-[#4F648C] dark:text-[#5B8DEF]" />
                    <span>Non-Diagnostic Decision Support Notice</span>
                  </div>
                  <p className="leading-relaxed">
                    SentiMate provides empathetic reflection, self-check-ins, and campus counsellor connection. It does NOT provide medical or clinical diagnosis, psychiatric triage, or prescription of pharmaceuticals. For acute crisis or thoughts of self-harm, immediately reach out to <strong>988 Suicide & Crisis Lifeline</strong> or campus emergency services.
                  </p>
                  <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-[#4F648C] dark:text-[#5B8DEF]">
                    <Link href="/#privacy" className="hover:underline flex items-center gap-1">
                      <span>Privacy Policy & FERPA Compliance</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link href="/resources" className="hover:underline flex items-center gap-1">
                      <span>Campus Emergency Contacts</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dialog: Delete Single Conversation ───────────────────────────────── */}
      <Dialog
        isOpen={deleteSingleModalOpen}
        onClose={() => setDeleteSingleModalOpen(false)}
        title="Delete Conversation"
        description="Permanently erase a single conversation session and its messages."
      >
        <div className="space-y-4">
          <div>
            <Select
              label="Select Conversation to Delete"
              labelClassName="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1.5 normal-case"
              placeholder="-- Choose conversation --"
              value={sessionToDelete}
              onChange={(e) => setSessionToDelete(e.target.value)}
              options={student.sessions.map((s) => ({
                value: s.id,
                label: s.title,
              }))}
            />
          </div>

          <p className="text-xs text-[#9E4A4A] dark:text-[#C47272]">
            Warning: This action cannot be undone. All messages within this conversation will be permanently wiped from the database.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E2DC] dark:border-[#1F2024]">
            <Button variant="outline" size="sm" onClick={() => setDeleteSingleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isDeletingConversations}
              disabled={!sessionToDelete}
              onClick={handleDeleteSingleConversation}
              className="bg-[#943838] hover:bg-[#7D2E2E] text-white"
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Dialog: Delete All Conversations ─────────────────────────────────── */}
      <Dialog
        isOpen={deleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        title="Delete All Conversations"
        description="Are you sure you want to permanently erase your entire conversational history?"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[#BA6868]/10 border border-[#E2E2DC] dark:border-[#BA6868]/25 text-xs text-[#8A3A3A] dark:text-[#D18686] space-y-1">
            <strong>High-Risk Destructive Action</strong>
            <p>
              This will permanently delete all {student.sessions.length} conversation sessions and all associated messages. Your voluntary wellbeing check-ins and academic records will remain preserved.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E2DC] dark:border-[#1F2024]">
            <Button variant="outline" size="sm" onClick={() => setDeleteAllModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isDeletingConversations}
              onClick={handleDeleteAllConversations}
              className="bg-[#943838] hover:bg-[#7D2E2E] text-white"
            >
              Delete All Conversations
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Dialog: Delete Account ───────────────────────────────────────────── */}
      <Dialog
        isOpen={deleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
        title="Delete SentiMate Account"
        description="Permanently delete your student profile, chat history, and personal account."
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] dark:bg-[#BA6868]/10 border border-[#E2E2DC] dark:border-[#BA6868]/25 text-xs text-[#8A3A3A] dark:text-[#D18686] space-y-1.5">
            <strong>Permanent Account Deletion</strong>
            <p>
              This will immediately revoke authentication access, erase all conversations, delete your user preferences, and clean student records. This cannot be undone.
            </p>
            <p className="text-[11px] opacity-90">
              Note: Retained clinical notes recorded during past appointments by campus counsellors are preserved in compliance with university legal retention requirements.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6] mb-1">
                Type <strong>DELETE</strong> in all caps to confirm
              </label>
              <Input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                required
              />
            </div>

            {accountInfo?.hasPasswordAccount && (
              <div>
                <label className="block text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6] mb-1">
                  Current Password (Authentication Verification)
                </label>
                <Input
                  type="password"
                  value={deleteAccountPassword}
                  onChange={(e) => setDeleteAccountPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E2DC] dark:border-[#1F2024]">
            <Button variant="outline" size="sm" onClick={() => setDeleteAccountModalOpen(false)}>
              Keep Account
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isDeletingAccount}
              disabled={deleteConfirmationText !== 'DELETE'}
              onClick={handleDeleteAccount}
              className="bg-[#943838] hover:bg-[#7D2E2E] text-white"
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
