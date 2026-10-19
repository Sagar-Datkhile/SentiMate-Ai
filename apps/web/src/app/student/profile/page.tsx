'use client';

import React, { useState, useRef, useEffect } from 'react';
import { StudentShell } from '@/components/layout/StudentShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import {
  User,
  CheckCircle2,
  AlertCircle,
  Save,
  GraduationCap,
  Shield,
  Loader2,
  Info,
} from 'lucide-react';
import {
  normalizeUsername,
  validateUsernameFormat,
  UsernameAvailabilityResponse,
} from '@sentimate/contracts';

interface SemesterSGPA {
  semester: number;
  sgpa: string;
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
  const [fullName, setFullName] = useState('Alex Student');
  const [currentUsername, setCurrentUsername] = useState('alex_student');
  const [username, setUsername] = useState('alex_student');
  const [prn, setPrn] = useState('PRN-2024-ENG-0892');
  const [institution, setInstitution] = useState('Apex Institute of Technology');
  const [department, setDepartment] = useState('Computer Engineering');
  const [admissionYear, setAdmissionYear] = useState('2024');
  const [currentSemester, setCurrentSemester] = useState('4');
  const [about, setAbout] = useState(
    'Sophomore studying computer engineering. Balancing coursework with campus robotics club.'
  );

  // 8 Semesters with null/empty support for future semesters
  const [semesters, setSemesters] = useState<SemesterSGPA[]>([
    { semester: 1, sgpa: '8.45' },
    { semester: 2, sgpa: '8.20' },
    { semester: 3, sgpa: '8.10' },
    { semester: 4, sgpa: '7.85' },
    { semester: 5, sgpa: '' },
    { semester: 6, sgpa: '' },
    { semester: 7, sgpa: '' },
    { semester: 8, sgpa: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Availability query state
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>({
    status: 'current_user',
    message: 'Currently your username',
    appearsAvailable: true,
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

  // Load real profile data from Supabase backend on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/student/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.fullName) setFullName(data.fullName);
          if (data.username) {
            setCurrentUsername(data.username);
            setUsername(data.username);
          } else {
            setCurrentUsername('');
            setUsername('');
          }
          if (data.prn) setPrn(data.prn);
          if (data.institution) setInstitution(data.institution);
          if (data.department) setDepartment(data.department);
          if (data.admissionYear) setAdmissionYear(String(data.admissionYear));
          if (data.currentSemester) setCurrentSemester(String(data.currentSemester));
          if (data.about !== undefined) setAbout(data.about);
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
        }
      } catch (err) {
        console.warn('[Profile] Failed to load profile from backend:', err);
      }
    };
    loadProfile();
  }, []);

  const handleSemesterChange = (semesterNum: number, value: string) => {
    setSemesters((prev) =>
      prev.map((s) => (s.semester === semesterNum ? { ...s, sgpa: value } : s))
    );
  };

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
    setSuccessMessage(null);

    const normalized = normalizeUsername(username);

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

    try {
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          username: normalized,
          prn: prn.trim(),
          institution,
          department,
          admissionYear,
          currentSemester,
          about,
          semesters,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 409) {
        // Atomic conflict: another student claimed the username concurrently
        setErrorMessage(
          data?.error || `The username '${normalized}' was just claimed by another student. Please choose a different username.`
        );
        setAvailabilityState({
          status: 'already_taken',
          message: 'Username was just claimed by another student.',
          appearsAvailable: false,
        });
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save profile. Please try again.');
      }

      setCurrentUsername(normalized);
      setAvailabilityState({
        status: 'current_user',
        message: 'Currently your username',
        appearsAvailable: true,
      });
      setSuccessMessage('Profile and semester records updated successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentShell studentName={fullName}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Student Profile & Academics
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Manage your identity, academic details, and semester records. Profile completion is optional and never blocks chat access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="teal" size="md">
              Student Account
            </Badge>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.25)] text-[#047857] dark:text-[#34D399] flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-[#B91C1C] dark:text-[#F87171] flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Basic Identity */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-3">
              <User className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
              <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
                Personal Identity
              </h2>
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
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0D766E] dark:text-[#14B8A6]" />
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
                    <span className="flex items-center gap-1 text-[#0D766E] dark:text-[#14B8A6] font-medium">
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
          <Card className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-3">
              <GraduationCap className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
              <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
                Institutional Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
              <Input
                label="Department / Major"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
              <Input
                label="PRN (Permanent Registration Number)"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Admission Year"
                  type="number"
                  value={admissionYear}
                  onChange={(e) => setAdmissionYear(e.target.value)}
                  required
                />
                <Input
                  label="Current Semester"
                  type="number"
                  min="1"
                  max="8"
                  value={currentSemester}
                  onChange={(e) => setCurrentSemester(e.target.value)}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Section 3: 8 Semesters Academic Records */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E2DC] dark:border-[#2C3038] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
                  Academic Progress (Semesters 1 to 8)
                </h2>
              </div>
              <span className="text-xs text-[#71757E]">
                Scale: 0.00 - 10.00 • Future terms left blank
              </span>
            </div>

            <p className="text-xs text-[#71757E] leading-relaxed">
              Academic history helps counsellors contextualize exam stress when you consent to referral sharing. Uncompleted future semesters remain empty.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
              {semesters.map((sem) => (
                <div
                  key={sem.semester}
                  className="p-3 rounded-xl border border-[#E2E2DC] dark:border-[#2C3038] bg-[#FAFAF8] dark:bg-[#15171C] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#18191B] dark:text-[#F3F4F6]">
                      Semester {sem.semester}
                    </span>
                    {parseInt(currentSemester, 10) === sem.semester && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E6FFFA] text-[#0D766E] dark:bg-[rgba(20,184,166,0.15)] dark:text-[#2DD4BF] font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="SGPA (e.g. 8.5)"
                    value={sem.sgpa}
                    onChange={(e) => handleSemesterChange(sem.semester, e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              ))}
            </div>
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
      </div>
    </StudentShell>
  );
}
