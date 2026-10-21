'use client';

import React, { useState, useEffect } from 'react';
import { CounsellorShell } from '@/components/layout/CounsellorShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { StudentCardSkeleton, LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, Search, Shield, Eye, GraduationCap, CheckCircle2 } from 'lucide-react';

interface AssignedStudent {
  id: string;
  name: string;
  prn: string;
  department: string;
  semester: number;
  activeCase: boolean;
  sharingScope: {
    checkins: boolean;
    academics: boolean;
    chatHistory: boolean;
  };
  recentCheckin?: {
    mood: number;
    sleep: number;
    stress: number;
  };
}

export default function CounsellorStudentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<AssignedStudent | null>(null);
  const [students, setStudents] = useState<AssignedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load assigned students directory from institutional records
    const loadStudents = () => {
      try {
        const stored = sessionStorage.getItem('sentimate_assigned_students');
        if (stored) {
          setStudents(JSON.parse(stored));
        } else {
          setStudents([]);
        }
      } catch {
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadStudents();
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.prn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CounsellorShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#1F2024] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Assigned Students Directory
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Students assigned to your caseload under institutional boundary policies.
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-28" />
          ) : (
            <Badge variant="teal" size="md">
              {students.length} Total Assigned
            </Badge>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-[#71757E]" />
          <input
            type="text"
            placeholder="Search by student name, PRN, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#0D766E] min-h-[44px]"
          />
        </div>

        {/* Students Table / List */}
        <LoadingRegion
          isLoading={isLoading}
          announcement="Loading assigned students directory..."
        >
          {isLoading ? (
            <div className="space-y-3">
              <StudentCardSkeleton />
              <StudentCardSkeleton />
              <StudentCardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="No Matching Students Found"
                description={`No assigned students match "${searchQuery}". Check the name, PRN or department filter.`}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="No Students Assigned Yet"
                description="Your caseload currently has no active student assignments. Newly assigned students from institutional administration will appear here."
              />
            )
          ) : (
            <div className="space-y-3">
              {filtered.map((student) => (
                <Card
                  key={student.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#0D766E]/40 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[#18191B] dark:text-[#F3F4F6]">
                        {student.name}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {student.prn}
                      </Badge>
                      {student.activeCase && (
                        <Badge variant="amber" size="sm">
                          Active Case
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-[#71757E] flex items-center gap-3 flex-wrap">
                      <span>{student.department}</span>
                      <span>•</span>
                      <span>Semester {student.semester}</span>
                    </div>

                    {/* Scope of Sharing Badges */}
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="text-[#71757E]">Consented Access:</span>
                      <Badge variant={student.sharingScope.checkins ? 'teal' : 'neutral'} size="sm">
                        Check-ins: {student.sharingScope.checkins ? 'Permitted' : 'Restricted'}
                      </Badge>
                      <Badge variant={student.sharingScope.academics ? 'teal' : 'neutral'} size="sm">
                        Academics: {student.sharingScope.academics ? 'Permitted' : 'Restricted'}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        Raw Chat: Restricted (Protected)
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => setSelectedStudent(student)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Inspect Permitted File</span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </LoadingRegion>
      </div>

      {/* Student Permitted Profile Dialog */}
      <Dialog
        isOpen={Boolean(selectedStudent)}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent ? `Student File: ${selectedStudent.name}` : ''}
        description={
          selectedStudent
            ? `${selectedStudent.prn} • ${selectedStudent.department} (Semester ${selectedStudent.semester})`
            : ''
        }
      >
        <div className="space-y-4 text-xs sm:text-sm">
          {/* Privacy Scope Notice */}
          <div className="p-3 bg-[#F4F4F1] dark:bg-[#18191C] rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] space-y-1 text-xs">
            <div className="font-semibold text-[#18191B] dark:text-[#F3F4F6] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#0D766E] dark:text-[#14B8A6]" />
              Strict Confidentiality & Privacy Enforcement
            </div>
            <p className="text-[#71757E]">
              You can only view information explicitly consented to by the student. Raw conversational chat logs are never exposed to counsellor views.
            </p>
          </div>

          {selectedStudent?.sharingScope.checkins && selectedStudent.recentCheckin ? (
            <div className="p-3.5 rounded-xl border border-[#E2E2DC] dark:border-[#1F2024] space-y-2">
              <span className="font-semibold text-xs uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF]">
                Most Recent Consented Check-in
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-[#F4F4F1] dark:bg-[#141518]">
                  <div className="text-[10px] text-[#71757E]">Mood Score</div>
                  <div className="text-base font-bold text-[#18191B] dark:text-[#F3F4F6]">
                    {selectedStudent.recentCheckin.mood} / 5
                  </div>
                </div>
                <div className="p-2 rounded bg-[#F4F4F1] dark:bg-[#141518]">
                  <div className="text-[10px] text-[#71757E]">Sleep Hours</div>
                  <div className="text-base font-bold text-[#B45309] dark:text-[#FBBF24]">
                    {selectedStudent.recentCheckin.sleep} hrs
                  </div>
                </div>
                <div className="p-2 rounded bg-[#F4F4F1] dark:bg-[#141518]">
                  <div className="text-[10px] text-[#71757E]">Stress Level</div>
                  <div className="text-base font-bold text-[#B45309] dark:text-[#FBBF24]">
                    {selectedStudent.recentCheckin.stress} / 5
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 text-xs text-[#71757E] italic border rounded-lg">
              Check-in sharing is not permitted by this student.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => setSelectedStudent(null)} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </CounsellorShell>
  );
}
