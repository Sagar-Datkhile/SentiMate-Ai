'use client';

import React, { useState } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, FileCheck2, Lock, Trash2, Download, CheckCircle2 } from 'lucide-react';

interface AuditEvent {
  id: string;
  actorRole: string;
  action: string;
  entityType: string;
  timestamp: string;
  ipHash: string;
}

interface DataRightsRequest {
  id: string;
  userEmail: string;
  type: 'export_all_data' | 'delete_account';
  requestedAt: string;
  status: 'pending' | 'completed';
}

export default function AdminAuditPage() {
  const [auditLogs] = useState<AuditEvent[]>([
    {
      id: 'aud-01',
      actorRole: 'admin',
      action: 'COUNSELLOR_PROVISIONED',
      entityType: 'counsellor_profile',
      timestamp: 'Today, 10:14 AM UTC',
      ipHash: 'sha256:7b9a4c...',
    },
    {
      id: 'aud-02',
      actorRole: 'counsellor',
      action: 'CASE_STATUS_UPDATED',
      entityType: 'case_record',
      timestamp: 'Today, 09:45 AM UTC',
      ipHash: 'sha256:3d1f2e...',
    },
    {
      id: 'aud-03',
      actorRole: 'student',
      action: 'CONSENT_GRANTED',
      entityType: 'consent_event',
      timestamp: 'Yesterday, 04:12 PM UTC',
      ipHash: 'sha256:a4c901...',
    },
    {
      id: 'aud-04',
      actorRole: 'student',
      action: 'APPOINTMENT_REQUESTED',
      entityType: 'appointment_record',
      timestamp: 'Yesterday, 02:30 PM UTC',
      ipHash: 'sha256:88fa2b...',
    },
  ]);

  const [dataRequests, setDataRequests] = useState<DataRightsRequest[]>([
    {
      id: 'dr-1',
      userEmail: 'student.sample@university.edu',
      type: 'export_all_data',
      requestedAt: 'Oct 18, 2026',
      status: 'pending',
    },
  ]);

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleProcessRequest = (id: string) => {
    setDataRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'completed' } : r))
    );
    setActionNotice('Data rights request processed according to institutional retention rules.');
  };

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Content-Free Audit Trail & Privacy Operations
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Verifiable event logs without recording private conversational text or case notes.
            </p>
          </div>
          <Badge variant="teal" size="md">
            Zero PII Event Logs
          </Badge>
        </div>

        {actionNotice && (
          <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.25)] text-[#047857] dark:text-[#34D399] flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Section 1: Data Rights Requests */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
            Data Rights & Erasure Requests (GDPR / FERPA)
          </h2>

          <div className="space-y-2">
            {dataRequests.map((req) => (
              <Card
                key={req.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#18191B] dark:text-[#F3F4F6]">
                      {req.userEmail}
                    </span>
                    <Badge variant={req.status === 'completed' ? 'teal' : 'amber'} size="sm">
                      {req.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-[#71757E]">
                    Request: <strong>{req.type}</strong> • Requested: {req.requestedAt}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <Button
                    onClick={() => handleProcessRequest(req.id)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Execute Rights Request
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Section 2: Audit Logs Table */}
        <div className="space-y-4 pt-6 border-t border-[#E2E2DC] dark:border-[#2C3038]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
              Recent Administrative Audit Events
            </h2>
            <span className="text-xs text-[#71757E]">Last 50 recorded events</span>
          </div>

          <div className="rounded-xl border border-[#E2E2DC] dark:border-[#2C3038] overflow-hidden bg-white dark:bg-[#17191E]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F4F1] dark:bg-[#1F2228] border-b border-[#E2E2DC] dark:border-[#2C3038] text-[#71757E] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Anonymized Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2DC] dark:divide-[#2C3038]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4F4F1]/50 dark:hover:bg-[#1F2228]/50">
                    <td className="px-4 py-3 text-[#71757E] whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral" size="sm">
                        {log.actorRole}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-[#4A4D54] dark:text-[#9CA3AF]">{log.entityType}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-[#71757E]">{log.ipHash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
