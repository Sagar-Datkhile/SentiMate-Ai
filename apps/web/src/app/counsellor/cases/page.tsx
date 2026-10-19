'use client';

import React, { useState } from 'react';
import { CounsellorShell } from '@/components/layout/CounsellorShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import {
  FolderOpen,
  Plus,
  Lock,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface CaseNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface CaseItem {
  id: string;
  studentName: string;
  prn: string;
  status: 'submitted' | 'acknowledged' | 'in_progress' | 'follow_up' | 'resolved';
  priority: 'routine' | 'medium' | 'urgent';
  nextFollowUp: string;
  assessmentSummary: string;
  notes: CaseNote[];
}

export default function CounsellorCasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([
    {
      id: 'case-01',
      studentName: 'Alex P.',
      prn: 'PRN-2024-ENG-0892',
      status: 'in_progress',
      priority: 'medium',
      nextFollowUp: '2026-10-25',
      assessmentSummary:
        'Midterm burnout complicated by chronic sleep deprivation. Student consented to weekly pacing check-in.',
      notes: [
        {
          id: 'note-1',
          title: 'Initial Intake Session Observations',
          content:
            'Discussed time-blocking strategies for engineering lab reports. Student engaged well. Scheduled follow-up session for Oct 25.',
          createdAt: 'Oct 19, 2026 at 11:30 AM',
        },
      ],
    },
    {
      id: 'case-02',
      studentName: 'Marcus V.',
      prn: 'PRN-2023-CS-0419',
      status: 'acknowledged',
      priority: 'routine',
      nextFollowUp: '2026-10-28',
      assessmentSummary: 'Internship interview anxiety management.',
      notes: [],
    },
  ]);

  const [activeCase, setActiveCase] = useState<CaseItem | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [newStatus, setNewStatus] = useState<string>('in_progress');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleAddNote = () => {
    if (!activeCase || !noteTitle.trim() || !noteContent.trim()) return;

    const newNote: CaseNote = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      createdAt: 'Just now',
    };

    setCases((prev) =>
      prev.map((c) =>
        c.id === activeCase.id
          ? {
              ...c,
              notes: [newNote, ...c.notes],
              status: (newStatus as any) || c.status,
            }
          : c
      )
    );

    setSuccessBanner(`Confidential case note added for ${activeCase.studentName}.`);
    setNoteTitle('');
    setNoteContent('');
    setActiveCase(null);
  };

  return (
    <CounsellorShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Longitudinal Case Management
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Confidential case records, progress tracking, and clinical session notes.
            </p>
          </div>
          <Badge variant="teal" size="md">
            {cases.length} Open Cases
          </Badge>
        </div>

        {successBanner && (
          <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.25)] text-[#047857] dark:text-[#34D399] flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        <div className="space-y-4">
          {cases.map((c) => (
            <Card key={c.id} className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E2DC]/60 dark:border-[#2C3038]/60 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base text-[#18191B] dark:text-[#F3F4F6]">
                    {c.studentName}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {c.prn}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      c.status === 'in_progress'
                        ? 'teal'
                        : c.status === 'follow_up'
                        ? 'amber'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    Status: {c.status}
                  </Badge>
                  <Badge variant={c.priority === 'urgent' ? 'red' : 'neutral'} size="sm">
                    {c.priority}
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                <strong>Clinical Assessment Summary:</strong> "{c.assessmentSummary}"
              </div>

              <div className="flex items-center gap-4 text-xs text-[#71757E]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0D766E] dark:text-[#14B8A6]" />
                  <span>Next Follow-up: {c.nextFollowUp}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{c.notes.length} Confidential Notes Recorded</span>
                </div>
              </div>

              {/* Confidential Notes Accordion / List */}
              {c.notes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E2E2DC]/40 dark:border-[#2C3038]/40">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71757E] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#0D766E] dark:text-[#14B8A6]" />
                    Confidential Session Notes
                  </span>
                  {c.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg bg-[#F4F4F1] dark:bg-[#1F2228] border border-[#E2E2DC] dark:border-[#2C3038] space-y-1 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                          {note.title}
                        </span>
                        <span className="text-[10px] text-[#71757E]">{note.createdAt}</span>
                      </div>
                      <p className="text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => {
                    setActiveCase(c);
                    setNewStatus(c.status);
                  }}
                  variant="primary"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Confidential Case Note</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Case Note Dialog */}
      <Dialog
        isOpen={Boolean(activeCase)}
        onClose={() => setActiveCase(null)}
        title={activeCase ? `New Case Note: ${activeCase.studentName}` : ''}
        description="Confidential clinical notes are encrypted and restricted exclusively to you. Students and administrators cannot access note content."
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
              Note Title
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Session 2 Observations & Coping Plan"
              className="w-full rounded-lg px-3 py-2 text-xs bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#0D766E] min-h-[40px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
              Clinical Note Content
            </label>
            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Record intervention strategies, student affect, and action steps..."
              className="w-full rounded-lg p-2.5 text-xs bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#0D766E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4D54] dark:text-[#9CA3AF] mb-1">
              Update Case Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs bg-white dark:bg-[#17191E] border border-[#E2E2DC] dark:border-[#2C3038] text-[#18191B] dark:text-[#F3F4F6] min-h-[40px]"
            >
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="follow_up">Follow Up</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setActiveCase(null)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteTitle.trim() || !noteContent.trim()}
              variant="primary"
            >
              Save Confidential Note
            </Button>
          </div>
        </div>
      </Dialog>
    </CounsellorShell>
  );
}
