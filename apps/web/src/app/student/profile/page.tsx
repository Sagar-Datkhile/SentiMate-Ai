'use client';

import React, { useState } from 'react';
import { StudentShell } from '@/components/layout/StudentShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { User, CheckCircle2, AlertCircle, Save, GraduationCap, Shield } from 'lucide-react';

interface SemesterSGPA {
  semester: number;
  sgpa: string; // string for input state (converted to float or null)
}

export default function StudentProfilePage() {
  const [fullName, setFullName] = useState('Alex Student');
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

  const handleSemesterChange = (semesterNum: number, value: string) => {
    setSemesters((prev) =>
      prev.map((s) => (s.semester === semesterNum ? { ...s, sgpa: value } : s))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate username: alphanumeric, underscores, hyphens, min 3
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      setErrorMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens.');
      setSaving(false);
      return;
    }

    // Validate PRN
    if (!prn.trim()) {
      setErrorMessage('PRN (Permanent Registration Number) cannot be empty.');
      setSaving(false);
      return;
    }

    // Validate SGPAs
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
      // Simulate/trigger save operation
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccessMessage('Profile and semester records updated successfully.');
    } catch {
      setErrorMessage('Failed to save profile. Please try again.');
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
              <Input
                label="Username (unique identifier)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                helperText="Allowed: letters, numbers, underscores, hyphens"
                required
              />
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
                label="Department / Course"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
              <Input
                label="Permanent Registration Number (PRN)"
                value={prn}
                onChange={(e) => setPrn(e.target.value)}
                helperText="Preserves exact letters and leading zeros"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Admission Year"
                  type="number"
                  value={admissionYear}
                  onChange={(e) => setAdmissionYear(e.target.value)}
                  min={2000}
                  max={2100}
                  required
                />
                <Input
                  label="Current Semester"
                  type="number"
                  value={currentSemester}
                  onChange={(e) => setCurrentSemester(e.target.value)}
                  min={1}
                  max={8}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Section 3: Semester SGPAs (1 through 8) */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0D766E] dark:text-[#14B8A6]" />
                <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
                  Academic Performance Records (Semesters 1 – 8)
                </h2>
              </div>
              <span className="text-xs text-[#71757E]">
                0.00 – 10.00 grading scale • Leave future semesters blank (null)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {semesters.map((s) => (
                <div key={s.semester} className="p-3 rounded-lg bg-[#F4F4F1] dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038]">
                  <label className="block text-xs font-semibold text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
                    Semester {s.semester} SGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="Null / Uncompleted"
                    value={s.sgpa}
                    onChange={(e) => handleSemesterChange(s.semester, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#0D766E] dark:focus:border-[#14B8A6]"
                  />
                  <span className="text-[10px] text-[#71757E] mt-1 block">
                    {s.sgpa.trim() ? `${parseFloat(s.sgpa).toFixed(2)} / 10.00` : 'Not completed'}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white dark:bg-[#17191E] rounded-lg border border-[#E2E2DC] dark:border-[#2C3038] text-xs text-[#71757E] leading-relaxed">
              🔒 <strong>Model Input Protection:</strong> Educational details are not used as automatic model inputs. Any correlation analysis requires your explicit consent under our data governance rules.
            </div>
          </Card>

          {/* Submit action */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={saving}
              className="gap-2 shadow-sm font-semibold"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </StudentShell>
  );
}
