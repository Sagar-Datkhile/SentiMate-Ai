'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useStudent } from '@/components/layout/StudentContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Save,
  GraduationCap,
  Shield,
  Loader2,
  Info,
  MessageSquare,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { ProfileSkeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { toast } from '@/components/ui/Toast';
import {
  normalizeUsername,
  validateUsernameFormat,
  UsernameAvailabilityResponse,
} from '@sentimate/contracts';

/**
 * Validates that an optional profile photo URL uses a secure HTTPS scheme
 * and contains no embedded user credentials (RFC 3986).
 */
function validatePhotoUrl(urlStr: string): { isValid: boolean; error?: string } {
  const trimmed = urlStr.trim();
  if (!trimmed) {
    return { isValid: true };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      error: 'Please enter a valid URL (e.g. https://example.com/photo.jpg).',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'Only secure HTTPS image URLs are supported.',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      error: 'URLs with embedded credentials are not allowed.',
    };
  }

  return { isValid: true };
}

/** Locally-defined department options used when the API returns no departments. */
const LOCAL_DEPARTMENT_OPTIONS = [
  'Computer Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Mechanical Engineering',
  'Electronics and Telecommunication Engineering',
] as const;

const FORM_LABEL_CLASS = 'block text-[13px] sm:text-sm font-medium text-[#18191B] dark:text-[#F3F4F6] mb-1.5';
const FORM_FIELD_CLASS = '!h-12 !min-h-[48px] !rounded-xl border-[#E2E2DC] dark:border-[#222428] text-sm';

/**
 * Automatically calculates the student's current semester based on their admission year,
 * expected passing year, and current academic calendar (July start).
 * - July to December: Odd semesters (1, 3, 5, 7)
 * - January to June: Even semesters (2, 4, 6, 8)
 * - Clamped within [1, min(8, degreeSemesters)].
 */
function calculateCurrentSemester(
  admissionYearStr: string,
  expectedPassingYearStr?: string
): number | null {
  const admYear = parseInt(admissionYearStr, 10);
  if (isNaN(admYear) || admYear < 1990 || admYear > 2100) {
    return null;
  }

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth(); // 0 = Jan, 6 = July

  const semFromAdmission =
    curMonth >= 6
      ? (curYear - admYear) * 2 + 1
      : (curYear - admYear) * 2;

  let maxSem = 8;
  const passYear = parseInt(expectedPassingYearStr || '', 10);
  if (!isNaN(passYear) && passYear >= admYear) {
    const degreeSemesters = Math.max(1, (passYear - admYear) * 2);
    maxSem = Math.min(8, degreeSemesters);
  }

  return Math.max(1, Math.min(maxSem, semFromAdmission));
}

interface SemesterSGPA {
  semester: number;
  sgpa: string;
}

interface InstitutionInfo {
  id: string;
  name: string;
  code: string;
}

interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
}

type AvailabilityStatus =
  | 'idle'
  | 'current_user'
  | 'checking'
  | 'appears_available'
  | 'already_taken'
  | 'invalid_format'
  | 'reserved'
  | 'unable_to_check';

interface AvailabilityState {
  status: AvailabilityStatus;
  message?: string;
  appearsAvailable: boolean | null;
}

export default function StudentProfilePage() {
  const router = useRouter();
  const { sessions, isLoadingSessions, updateUserProfile } = useStudent();
  const [fullName, setFullName] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [username, setUsername] = useState('');
  const [prn, setPrn] = useState('');
  const [institution, setInstitution] = useState<InstitutionInfo>({
    id: 'b339af53-fef8-4cfd-b6d8-a9042dc80ab5',
    name: "Pune Vidyarthi Griha's College of Engineering & S.S. Dhamankar Institute of Management, Nashik",
    code: 'PVGCOE_NASHIK',
  });
  const [departmentId, setDepartmentId] = useState<string>('');
  const [availableDepartments, setAvailableDepartments] = useState<DepartmentInfo[]>([]);
  // Holds the selected label when running in local-only mode (no API departments).
  // This is NEVER sent as departmentId to the backend.
  const [localDepartmentLabel, setLocalDepartmentLabel] = useState<string>('');
  const [incompatibleDepartment, setIncompatibleDepartment] = useState<{
    id: string;
    name: string;
    flaggedForReview: boolean;
  } | null>(null);
  const [admissionYear, setAdmissionYear] = useState('');
  const [expectedPassingYear, setExpectedPassingYear] = useState('');
  const [currentSemester, setCurrentSemester] = useState('');
  const [about, setAbout] = useState('');

  // 8 Semesters with null/empty support for future semesters
  const [semesters, setSemesters] = useState<SemesterSGPA[]>([
    { semester: 1, sgpa: '' },
    { semester: 2, sgpa: '' },
    { semester: 3, sgpa: '' },
    { semester: 4, sgpa: '' },
    { semester: 5, sgpa: '' },
    { semester: 6, sgpa: '' },
    { semester: 7, sgpa: '' },
    { semester: 8, sgpa: '' },
  ]);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile photo URL state
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [stagedPhotoUrl, setStagedPhotoUrl] = useState('');
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  const [oauthAvatarUrl, setOauthAvatarUrl] = useState<string | null>(null);
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Availability query state
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>({
    status: 'idle',
    message: undefined,
    appearsAvailable: null,
  });

  // Short session-local cache for debounced username checks
  const cacheRef = useRef<
    Map<string, { status: AvailabilityStatus; message?: string; appearsAvailable: boolean; expiresAt: number }>
  >(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup pending timer and abort on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/student/profile');
      if (!res.ok) {
        throw new Error('Could not load profile details from server.');
      }
      const data = await res.json();
      if (data.fullName) {
        setFullName(data.fullName);
        updateUserProfile({
          fullName: data.fullName,
          displayName: data.fullName,
          avatarUrl: data.avatarUrl || undefined,
        });
      }
      if (data.username) {
        setCurrentUsername(data.username);
        setUsername(data.username);
        setAvailabilityState({
          status: 'current_user',
          message: 'Currently your username',
          appearsAvailable: true,
        });
      } else {
        setCurrentUsername('');
        setUsername('');
        setAvailabilityState({
          status: 'idle',
          message: undefined,
          appearsAvailable: null,
        });
      }
      if (data.prn) setPrn(data.prn);
      if (data.institution) {
        if (typeof data.institution === 'object' && data.institution.name) {
          setInstitution(data.institution);
        } else if (typeof data.institution === 'string') {
          setInstitution((prev) => ({ ...prev, name: data.institution }));
        }
      }
      if (Array.isArray(data.departments)) {
        setAvailableDepartments(data.departments);
      }
      if (data.departmentId !== undefined && data.departmentId !== null) {
        setDepartmentId(data.departmentId);
      } else if (data.department) {
        const matched = data.departments?.find(
          (d: any) => d.name === data.department || d.code === data.department || d.id === data.department
        );
        if (matched) setDepartmentId(matched.id);
      }
      if (data.incompatibleDepartment) {
        setIncompatibleDepartment(data.incompatibleDepartment);
      } else {
        setIncompatibleDepartment(null);
      }
      if (data.admissionYear !== undefined && data.admissionYear !== null) {
        setAdmissionYear(String(data.admissionYear));
      }
      if (data.currentSemester !== undefined && data.currentSemester !== null) {
        setCurrentSemester(String(data.currentSemester));
      }
      if (typeof data.about === 'string') {
        setAbout(data.about);
      }
      if (typeof window !== 'undefined') {
        const cachedExp = localStorage.getItem('sentimate_expected_passing_year');
        if (cachedExp) {
          setExpectedPassingYear(cachedExp);
        }
      }
      // Resolve saved photo and Google OAuth photo
      let loadedSavedPhoto: string | null = data.avatarUrl || null;
      let googlePhoto: string | null = null;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const meta = user.user_metadata || {};
          const identityMeta =
            (user.identities?.[0]?.identity_data as Record<string, string> | undefined) || {};
          googlePhoto =
            meta.avatar_url ||
            meta.picture ||
            meta.photoURL ||
            identityMeta.avatar_url ||
            identityMeta.picture ||
            null;

          if (!loadedSavedPhoto) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', user.id)
              .maybeSingle();
            if (prof?.avatar_url) {
              loadedSavedPhoto = prof.avatar_url;
            }
          }
        }
      } catch {
        // Ignore optional client lookup failure
      }

      setOauthAvatarUrl(googlePhoto);
      if (loadedSavedPhoto) {
        setSavedAvatarUrl(loadedSavedPhoto);
        setPhotoUrlInput(loadedSavedPhoto);
        setStagedPhotoUrl(loadedSavedPhoto);
      } else {
        setSavedAvatarUrl(null);
        setPhotoUrlInput('');
        setStagedPhotoUrl('');
      }
      if (Array.isArray(data.semesters)) {
        setSemesters((prev) =>
          prev.map((s) => {
            const found = data.semesters.find(
              (ds: any) => ds.semester === s.semester || ds.semester_number === s.semester
            );
            return found
              ? {
                  semester: s.semester,
                  sgpa:
                    found.sgpa !== null && found.sgpa !== undefined ? String(found.sgpa) : '',
                }
              : s;
          })
        );
      }
    } catch (err: any) {
      console.warn('[Profile] Failed to load profile:', err);
      setLoadError(err.message || 'Unable to retrieve your student profile.');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Load real profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const handleSemesterChange = (semesterNum: number, value: string) => {
    setSemesters((prev) =>
      prev.map((s) => (s.semester === semesterNum ? { ...s, sgpa: value } : s))
    );
  };

  // ── Profile Photo URL handlers ────────────────────────────────────────────────

  const handleApplyPhotoUrl = useCallback(() => {
    const trimmed = photoUrlInput.trim();
    if (!trimmed) {
      setUrlValidationError(null);
      setImageLoadError(false);
      setStagedPhotoUrl('');
      return;
    }

    const validation = validatePhotoUrl(trimmed);
    if (!validation.isValid) {
      setUrlValidationError(validation.error || 'Please enter a valid HTTPS image URL.');
      return;
    }

    setUrlValidationError(null);
    setImageLoadError(false);
    setStagedPhotoUrl(trimmed);
  }, [photoUrlInput]);

  const handlePhotoUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setPhotoUrlInput(val);
      setImageLoadError(false);
      if (urlValidationError) {
        setUrlValidationError(null);
      }
    },
    [urlValidationError]
  );

  const handleImageError = useCallback(() => {
    setImageLoadError(true);
  }, []);

  // Determine active photo for preview according to priority:
  // 1. Staged new URL (if valid and not broken)
  // 2. Saved photo URL (previous photo retained on load error)
  // 3. Google OAuth photo from sign-in metadata
  // 4. Initials fallback
  let displayPhotoUrl: string | null = null;
  if (stagedPhotoUrl) {
    if (!imageLoadError) {
      displayPhotoUrl = stagedPhotoUrl;
    } else if (savedAvatarUrl) {
      displayPhotoUrl = savedAvatarUrl;
    } else if (oauthAvatarUrl) {
      displayPhotoUrl = oauthAvatarUrl;
    }
  } else if (photoUrlInput.trim() === '' && stagedPhotoUrl === '') {
    // Custom URL is explicitly cleared: fall back to Google OAuth photo, then initials
    displayPhotoUrl = oauthAvatarUrl || null;
  } else if (savedAvatarUrl) {
    displayPhotoUrl = savedAvatarUrl;
  } else if (oauthAvatarUrl) {
    displayPhotoUrl = oauthAvatarUrl;
  }

  /**
   * Username input change handler with:
   * - Local canonical normalization (lowercase, trimmed)
   * - Pre-network format and reserved name checks
   * - No check when equal to current username
   * - ~600ms debounce
   * - Session-local TTL cache
   * - In-flight deduplication / cancellation
   */
  const handleUsernameChange = (raw: string) => {
    setUsername(raw);
    const normalized = normalizeUsername(raw);

    // Cancel pending debounce and in-flight fetch
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 1. If equal to student's current username, avoid network call
    if (normalized === normalizeUsername(currentUsername)) {
      setAvailabilityState({
        status: 'current_user',
        message: 'Currently your username',
        appearsAvailable: true,
      });
      return;
    }

    // 2. Pre-network client validation (length, characters, system reserved names)
    const validation = validateUsernameFormat(normalized);
    if (!validation.isValid) {
      setAvailabilityState({
        status: validation.isReserved ? 'reserved' : 'invalid_format',
        message: validation.error,
        appearsAvailable: false,
      });
      return; // Do NOT fire network request on invalid input
    }

    // 3. Check session-local cache (TTL 30s)
    const cached = cacheRef.current.get(normalized);
    if (cached && Date.now() < cached.expiresAt) {
      setAvailabilityState({
        status: cached.status,
        message: cached.message,
        appearsAvailable: cached.appearsAvailable,
      });
      return;
    }

    // 4. Set checking state and debounce network check by 600ms
    setAvailabilityState({
      status: 'checking',
      message: 'Checking availability...',
      appearsAvailable: null,
    });

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/student/username-availability?username=${encodeURIComponent(normalized)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }

        const data: UsernameAvailabilityResponse = await res.json();

        let newStatus: AvailabilityStatus;
        let msg = data.message;
        let avail = data.appears_available;

        if (data.is_current) {
          newStatus = 'current_user';
          msg = 'Currently your username';
        } else if (data.status === 'already_taken' || !data.available) {
          newStatus = 'already_taken';
          msg = data.message || 'Username is already taken by another student.';
        } else if (data.status === 'reserved') {
          newStatus = 'reserved';
        } else {
          newStatus = 'appears_available';
          msg = 'Username appears available';
        }

        // Cache result in session cache for 30s
        cacheRef.current.set(normalized, {
          status: newStatus,
          message: msg,
          appearsAvailable: avail,
          expiresAt: Date.now() + 30000,
        });

        setAvailabilityState({
          status: newStatus,
          message: msg,
          appearsAvailable: avail,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Graceful fallback: unable_to_check permits saving
          setAvailabilityState({
            status: 'unable_to_check',
            message: 'Unable to verify availability right now. You can still save to verify.',
            appearsAvailable: true,
          });
        }
      } finally {
        abortControllerRef.current = null;
      }
    }, 600);
  };

  /**
   * Submit single profile-update request with atomic database write
   */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const normalized = normalizeUsername(username);

    // Validate photo URL if entered
    const trimmedPhotoUrl = photoUrlInput.trim();
    if (trimmedPhotoUrl) {
      const urlVal = validatePhotoUrl(trimmedPhotoUrl);
      if (!urlVal.isValid) {
        setUrlValidationError(urlVal.error || 'Please enter a valid HTTPS image URL.');
        setErrorMessage(urlVal.error || 'Please correct the profile photo URL before saving.');
        setSaving(false);
        return;
      }
    }

    // Client validation
    if (normalized) {
      const validation = validateUsernameFormat(normalized);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Please enter a valid username.');
        setSaving(false);
        return;
      }
    }

    if (!prn.trim()) {
      setErrorMessage('PRN (Permanent Registration Number) cannot be empty.');
      setSaving(false);
      return;
    }

    // Validation: prevent saving if an invalid department selection was made while reference data is unavailable
    if (departmentId && availableDepartments.length > 0) {
      const isValidDept =
        availableDepartments.some((d) => d.id === departmentId) ||
        (incompatibleDepartment && incompatibleDepartment.id === departmentId);
      if (!isValidDept) {
        setErrorMessage('The selected department is not recognized. Please choose a valid department.');
        setSaving(false);
        return;
      }
    }

    for (const sem of semesters) {
      if (sem.sgpa.trim() !== '') {
        const val = parseFloat(sem.sgpa);
        if (isNaN(val) || val < 0 || val > 10) {
          setErrorMessage(`Semester ${sem.semester} SGPA must be a valid number between 0.00 and 10.00 (or left blank).`);
          setSaving(false);
          return;
        }
      }
    }

    // Validate expected passing year is not earlier than admission year when both are provided
    if (expectedPassingYear && admissionYear) {
      const expYr = parseInt(expectedPassingYear, 10);
      const admYr = parseInt(admissionYear, 10);
      if (!isNaN(expYr) && !isNaN(admYr) && expYr < admYr) {
        setErrorMessage('Expected passing year cannot be earlier than admission year.');
        setSaving(false);
        return;
      }
    }

    const newAvatarUrl = trimmedPhotoUrl || null;

    try {
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          avatarUrl: newAvatarUrl,
          username: normalized,
          prn: prn.trim(),
          departmentId: departmentId || null,
          admissionYear: admissionYear ? parseInt(admissionYear, 10) : undefined,
          currentSemester: activeCurrentSemester ?? (currentSemester ? parseInt(currentSemester, 10) : undefined),
          about,
          semesters,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 409) {
        // Atomic conflict: another student claimed the username concurrently
        const msg = data?.error || `The username '${normalized}' was just claimed by another student.`;
        setErrorMessage(msg);
        toast.error('Username is already taken.', {
          description: 'Please choose a different username.',
        });
        setAvailabilityState({
          status: 'already_taken',
          message: 'Username was just claimed by another student.',
          appearsAvailable: false,
        });
        return;
      }

      if (!response.ok) {
        const errorDetail = data?.error || 'Failed to save profile. Please try again.';
        setErrorMessage(errorDetail);
        toast.error('Profile update failed.', {
          description: errorDetail,
        });
        // Retain the existing saved photo on save failure
        return;
      }

      // Confirmed success: update saved avatar and reset error state
      const confirmedAvatarUrl = data?.avatarUrl !== undefined ? data.avatarUrl : newAvatarUrl;
      setSavedAvatarUrl(confirmedAvatarUrl);
      setStagedPhotoUrl(confirmedAvatarUrl || '');
      setPhotoUrlInput(confirmedAvatarUrl || '');
      setImageLoadError(false);

      // Dispatch shared profile state update for sidebar without page reload
      const activeSidebarPhoto = confirmedAvatarUrl || oauthAvatarUrl || undefined;
      const trimmedFullName = fullName.trim();
      updateUserProfile({
        fullName: trimmedFullName,
        displayName: trimmedFullName,
        avatarUrl: activeSidebarPhoto,
      });

      window.dispatchEvent(
        new CustomEvent('sentimate:profile-updated', {
          detail: {
            avatarUrl: activeSidebarPhoto,
            fullName: trimmedFullName,
          },
        })
      );

      const usernameChanged = normalized && normalized !== currentUsername;
      setCurrentUsername(normalized);
      setAvailabilityState({
        status: 'current_user',
        message: 'Currently your username',
        appearsAvailable: true,
      });

      if (usernameChanged) {
        toast.success('Username changed.', {
          description: 'Your profile changes were also saved successfully.',
        });
      } else {
        toast.success('Profile changes saved.');
      }
    } catch (err: any) {
      const fallbackMsg = err.message || 'Failed to save profile. Please try again.';
      setErrorMessage(fallbackMsg);
      toast.error('Profile update failed.', {
        description: fallbackMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  const autoCurrentSemester = useMemo(() => {
    return calculateCurrentSemester(admissionYear, expectedPassingYear);
  }, [admissionYear, expectedPassingYear]);

  const activeCurrentSemester = autoCurrentSemester ?? (currentSemester ? parseInt(currentSemester, 10) : null);

  useEffect(() => {
    if (autoCurrentSemester !== null) {
      setCurrentSemester(String(autoCurrentSemester));
    }
  }, [autoCurrentSemester]);

  const expectedPassingYearError =
    expectedPassingYear && admissionYear && parseInt(expectedPassingYear, 10) < parseInt(admissionYear, 10)
      ? 'Expected passing year cannot be earlier than admission year.'
      : undefined;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Page Title */}
        <div className="border-b border-[#E2E2DC] dark:border-[#1F2024] pb-5">
          <h1
            className="text-3xl sm:text-4xl font-serif text-[#18191B] dark:text-[#F3F4F6] tracking-tight"
            style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
          >
            My Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#71757E] mt-1">
            Manage your personal and academic details
          </p>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-[#B91C1C] dark:text-[#F87171] flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoadingProfile ? (
          <LoadingRegion isLoading={true} announcement="Loading student profile and academic details...">
            <ProfileSkeleton />
          </LoadingRegion>
        ) : loadError ? (
          <ErrorState
            title="Profile Unavailable"
            message={loadError}
            onRetry={loadProfile}
          />
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Basic Identity */}
            <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E2DC] dark:border-[#1F2024] pb-3">
              <User className="w-4 h-4 text-[#4F648C] dark:text-[#91A7D0]" />
              <h2 className="text-[18px] font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                Personal identity
              </h2>
            </div>

            {/* ── Profile Photo URL Section ── */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-1">
              {/* Circular preview */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#E2E2DC] dark:border-[#2C2D32] bg-[#EEF2F8] dark:bg-[#242E40] flex items-center justify-center shadow-xs shrink-0">
                  {displayPhotoUrl ? (
                    <img
                      src={displayPhotoUrl}
                      alt={fullName || 'Profile preview'}
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#4F648C] dark:bg-[#91A7D0] text-white dark:text-[#151B26] font-bold flex items-center justify-center text-xl select-none">
                      {(fullName || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-[#71757E] text-center">Preview</span>
              </div>

              {/* URL Input & Controls */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <label
                  htmlFor="profile-photo-url-input"
                  className="block text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6]"
                >
                  Profile photo URL
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="profile-photo-url-input"
                    type="url"
                    value={photoUrlInput}
                    onChange={handlePhotoUrlChange}
                    onBlur={handleApplyPhotoUrl}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyPhotoUrl();
                      }
                    }}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1"
                  />
                  {photoUrlInput.trim() !== stagedPhotoUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyPhotoUrl}
                      className="shrink-0"
                    >
                      Apply
                    </Button>
                  )}
                </div>

                {/* Inline error or help text */}
                {urlValidationError ? (
                  <p className="text-xs text-[#B91C1C] dark:text-[#F87171] mt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{urlValidationError}</span>
                  </p>
                ) : imageLoadError && stagedPhotoUrl ? (
                  <p className="text-xs text-[#B91C1C] dark:text-[#F87171] mt-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Unable to load image from this URL. Retaining previous photo.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-[#71757E] leading-snug">
                    Optional HTTPS image URL. Preview updates when applied or on blur.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              {/* Username Input with Live Availability Feedback */}
              <div className="space-y-1.5">
                <Input
                  label="Username (unique identifier)"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="e.g. alex_student"
                  required
                />
                <div className="flex items-center gap-1.5 text-xs px-1 min-h-[20px]">
                  {availabilityState.status === 'checking' && (
                    <span className="flex items-center gap-1 text-[#71757E]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F648C] dark:text-[#91A7D0]" />
                      Checking availability...
                    </span>
                  )}
                  {availabilityState.status === 'appears_available' && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {availabilityState.message || 'Username appears available'}
                    </span>
                  )}
                  {availabilityState.status === 'current_user' && (
                    <span className="flex items-center gap-1 text-[#4F648C] dark:text-[#91A7D0] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {availabilityState.message || 'Currently your username'}
                    </span>
                  )}
                  {availabilityState.status === 'already_taken' && (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {availabilityState.message || 'Username is already taken'}
                    </span>
                  )}
                  {(availabilityState.status === 'invalid_format' || availabilityState.status === 'reserved') && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {availabilityState.message}
                    </span>
                  )}
                  {availabilityState.status === 'unable_to_check' && (
                    <span className="flex items-center gap-1 text-[#71757E]">
                      <Info className="w-3.5 h-3.5 text-amber-500" />
                      {availabilityState.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Textarea
              label="About Summary"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
              placeholder="Tell us a little bit about yourself (optional)..."
            />
          </Card>

          {/* Section 2: Educational Context */}
          <Card className="space-y-5">
            <div className="flex items-center gap-2 border-b border-[#E2E2DC] dark:border-[#1F2024] pb-3">
              <GraduationCap className="w-4 h-4 text-[#4F648C] dark:text-[#91A7D0]" />
              <h2 className="text-[18px] font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                Institution details
              </h2>
            </div>

            <div className="space-y-4">
              {/* Institution (Read-Only) across full card width allowing natural wrapping */}
              <div className="w-full">
                <label
                  htmlFor="institution-display"
                  className={FORM_LABEL_CLASS}
                >
                  Institution
                </label>
                <div
                  id="institution-display"
                  tabIndex={0}
                  aria-readonly="true"
                  className="w-full !min-h-[48px] !rounded-xl px-3.5 py-3 text-sm bg-[#F5F5F3] dark:bg-[#141518] border border-[#E2E2DC] dark:border-[#222428] text-[#18191B] dark:text-[#F3F4F6] flex items-center leading-relaxed select-text focus:outline-none focus:ring-2 focus:ring-[#4F648C]/20 dark:focus:ring-[#91A7D0]/20"
                >
                  <span className="break-words whitespace-normal w-full font-medium">
                    {institution.name || "Pune Vidyarthi Griha's College of Engineering & S.S. Dhamankar Institute of Management, Nashik"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#5A5E67] dark:text-[#9CA3AF]">
                  Default institutional affiliation (read-only).
                </p>
              </div>

              {/* Department and PRN in a two-column row (stacked on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full">
                  {availableDepartments.length > 0 ? (
                    <Select
                      id="department-select"
                      label="Department"
                      labelClassName={FORM_LABEL_CLASS}
                      placeholder="Select your department"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      options={availableDepartments.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                      className={FORM_FIELD_CLASS}
                    />
                  ) : (
                    <>
                      <Select
                        id="department-select"
                        label="Department"
                        labelClassName={FORM_LABEL_CLASS}
                        placeholder="Select your department"
                        value={localDepartmentLabel}
                        onChange={(e) => setLocalDepartmentLabel(e.target.value)}
                        options={LOCAL_DEPARTMENT_OPTIONS.map((name) => ({
                          value: name,
                          label: name,
                        }))}
                        className={FORM_FIELD_CLASS}
                      />
                      {localDepartmentLabel && (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          Department selection is display-only until department data loads from the server.
                        </p>
                      )}
                    </>
                  )}
                  {incompatibleDepartment && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div className="leading-relaxed">
                        <span className="font-semibold">Review Flag:</span> Existing assignment (<span className="font-medium underline">{incompatibleDepartment.name}</span>) is outside verified departments and has been preserved. You may select an active department above or leave it preserved.
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full">
                  <Input
                    id="prn-input"
                    label="PRN"
                    labelClassName={FORM_LABEL_CLASS}
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                    className={FORM_FIELD_CLASS}
                    required
                  />
                </div>
              </div>

              {/* Admission year and Expected passing year in a two-column row (stacked on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="w-full">
                  <Input
                    id="admission-year-input"
                    label="Admission year"
                    labelClassName={FORM_LABEL_CLASS}
                    type="number"
                    placeholder="e.g. 2023"
                    value={admissionYear}
                    onChange={(e) => setAdmissionYear(e.target.value)}
                    className={FORM_FIELD_CLASS}
                    required
                  />
                </div>
                <div className="w-full">
                  <Input
                    id="expected-passing-year-input"
                    label="Expected passing year"
                    labelClassName={FORM_LABEL_CLASS}
                    type="number"
                    placeholder="e.g. 2027"
                    value={expectedPassingYear}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExpectedPassingYear(val);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('sentimate_expected_passing_year', val);
                      }
                    }}
                    className={FORM_FIELD_CLASS}
                    error={expectedPassingYearError}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: 8 Semesters Academic Records */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E2DC] dark:border-[#1F2024] pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#4F648C] dark:text-[#91A7D0]" />
                <h2 className="text-[18px] font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  Academic progress
                </h2>
              </div>
              <span className="text-xs font-medium text-[#4A4D54] dark:text-[#9CA3AF] bg-[#F4F4F1] dark:bg-[#18191C] px-2.5 py-1 rounded-md self-start sm:self-auto border border-[#E2E2DC]/60 dark:border-[#222428]">
                SGPA · 0–10
              </span>
            </div>

            <p className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
              Add available semester results. Leave unfinished semesters blank. Academic history helps counsellors contextualize exam stress when you consent to referral sharing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {semesters.map((sem) => (
                <div
                  key={sem.semester}
                  className="p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#222428] bg-white dark:bg-[#141518] space-y-2 transition-colors"
                >
                  <div className="flex items-center justify-between min-h-[22px]">
                    <span className="text-xs font-medium text-[#18191B] dark:text-[#F3F4F6]">
                      Semester {sem.semester}
                    </span>
                    {activeCurrentSemester === sem.semester && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF2F8] text-[#4F648C] dark:bg-[#242E40] dark:text-[#91A7D0] font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter SGPA"
                    value={sem.sgpa}
                    onChange={(e) => handleSemesterChange(sem.semester, e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-xs sm:text-sm font-mono bg-[#FAFAF8] dark:bg-[#18191C] border border-[#E2E2DC]/80 dark:border-[#2A2B30] text-[#18191B] dark:text-[#F3F4F6] placeholder-[#8C9099] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#4F648C] dark:focus:border-[#91A7D0] focus:ring-2 focus:ring-[#4F648C]/20 dark:focus:ring-[#91A7D0]/20 transition-all"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Section 4: Recent Conversations */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E2DC] dark:border-[#1F2024] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#4F648C] dark:text-[#91A7D0]" />
                <h2 className="text-[18px] font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  Recent conversations
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push('/student/chat')}
                className="gap-1.5 text-xs text-[#4F648C] dark:text-[#91A7D0] hover:bg-[#EEF2F8] dark:hover:bg-[#242E40]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New chat</span>
              </Button>
            </div>

            <p className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
              Your conversational history with SentiMate AI. All chats are private and encrypted.
            </p>

            {isLoadingSessions ? (
              <div className="space-y-2.5 py-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-[#E2E2DC]/60 dark:border-[#222428] bg-white dark:bg-[#141518] flex items-center justify-between animate-pulse"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-[#E2E2DC] dark:bg-[#222428] rounded w-1/3" />
                      <div className="h-3 bg-[#EAEAE5] dark:bg-[#1A1B1F] rounded w-1/5" />
                    </div>
                    <div className="h-8 w-20 bg-[#E2E2DC] dark:bg-[#222428] rounded-lg" />
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-[#E2E2DC] dark:border-[#222428] bg-[#FAFAF8] dark:bg-[#141518]/50">
                <MessageSquare className="w-8 h-8 mx-auto text-[#8C9099] dark:text-[#636773] mb-2 opacity-60" />
                <p className="text-sm font-medium text-[#18191B] dark:text-[#F3F4F6]">No previous chats yet</p>
                <p className="text-xs text-[#5A5E67] dark:text-[#9CA3AF] mt-1 mb-4">Start a conversation to get empathetic reflections and support.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push('/student/chat')}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start a conversation</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#222428] bg-white dark:bg-[#141518] hover:border-[#4F648C]/40 dark:hover:border-[#91A7D0]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-[#4F648C] dark:text-[#91A7D0] shrink-0" />
                        <h3 className="text-sm font-medium text-[#18191B] dark:text-[#F3F4F6] truncate">
                          {session.title || 'Untitled conversation'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#5A5E67] dark:text-[#9CA3AF]">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>
                          {session.lastActivityAt
                            ? new Date(session.lastActivityAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Recently'}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/student/chat?session=${session.id}`)}
                      className="shrink-0 gap-1.5 text-xs text-[#4F648C] dark:text-[#91A7D0] hover:bg-[#EEF2F8] dark:hover:bg-[#242E40]"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {sessions.length > 5 && (
                  <div className="text-center pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/student/chat')}
                      className="text-xs text-[#4F648C] dark:text-[#91A7D0]"
                    >
                      <span>View all {sessions.length} conversations in chat</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={
                saving ||
                availabilityState.status === 'checking' ||
                availabilityState.status === 'already_taken' ||
                availabilityState.status === 'invalid_format' ||
                availabilityState.status === 'reserved'
              }
              className="gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </div>
  );
}
