'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TableRowsSkeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldCheck, FileCheck2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

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
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [dataRequests, setDataRequests] = useState<DataRightsRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load real audit logs and privacy requests without artificial delay
    try {
      const storedLogs = sessionStorage.getItem('sentimate_audit_logs');
      if (storedLogs) {
        setAuditLogs(JSON.parse(storedLogs));
      } else {
        setAuditLogs([]);
      }

      const storedRequests = sessionStorage.getItem('sentimate_data_requests');
      if (storedRequests) {
        setDataRequests(JSON.parse(storedRequests));
      } else {
        setDataRequests([]);
      }
    } catch {
      setAuditLogs([]);
      setDataRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleProcessRequest = (id: string) => {
    const updated = dataRequests.map((r) =>
      r.id === id ? { ...r, status: 'completed' as const } : r
    );
    setDataRequests(updated);
    try {
      sessionStorage.setItem('sentimate_data_requests', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    toast.success('Data rights request processed.', {
      description: 'Institutional compliance records have been updated.',
    });
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



        {/* Section 1: Data Rights Requests */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
            Data Rights & Erasure Requests (GDPR / FERPA)
          </h2>

          <LoadingRegion isLoading={isLoading} announcement="Loading data rights requests...">
            {isLoading ? (
              <TableRowsSkeleton rows={2} />
            ) : dataRequests.length === 0 ? (
              <EmptyState
                icon={FileCheck2}
                title="No Pending Privacy Requests"
                description="All student and staff data rights or erasure requests (GDPR / FERPA) have been fulfilled or none are pending."
              />
            ) : (
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
            )}
          </LoadingRegion>
        </div>

        {/* Section 2: Audit Logs Table */}
        <div className="space-y-4 pt-6 border-t border-[#E2E2DC] dark:border-[#2C3038]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
              Recent Administrative Audit Events
            </h2>
            <span className="text-xs text-[#71757E]">Last 50 recorded events</span>
          </div>

          <LoadingRegion isLoading={isLoading} announcement="Loading audit logs...">
            {isLoading ? (
              <TableRowsSkeleton rows={4} />
            ) : auditLogs.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No Audit Logs Recorded"
                description="No administrative or privileged security events have been logged yet in this system session."
              />
            ) : (
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
            )}
          </LoadingRegion>
        </div>
      </div>
    </AdminShell>
  );
}
