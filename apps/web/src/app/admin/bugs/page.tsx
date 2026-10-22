'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import {
  Bug,
  Search,
  Filter,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  X,
  ShieldAlert,
  Calendar,
  User,
  Monitor,
  FileText,
  Lock,
} from 'lucide-react';
import type { BugStatus, BugPriority, EmailDeliveryStatus, SupportCategory } from '@sentimate/contracts';

interface InquiryItem {
  id: string;
  referenceId: string;
  userId: string;
  submitterEmail: string | null;
  submitterName: string | null;
  inquiryType: string;
  category: SupportCategory | string;
  subject: string;
  message: string;
  reproductionSteps?: string | null;
  expectedBehavior?: string | null;
  actualBehavior?: string | null;
  includeDiagnosticContext: boolean;
  diagnosticContext?: Record<string, any> | null;
  idempotencyKey?: string | null;
  status: BugStatus;
  priority: BugPriority;
  internalNotes?: string;
  emailDeliveryStatus: EmailDeliveryStatus;
  emailDeliveryAttempts: number;
  emailLastError?: string | null;
  emailRecipients?: string[];
  createdAt: string;
  updatedAt: string;
  events?: Array<{
    action: string;
    actorEmail?: string;
    timestamp?: string;
    notes?: string;
  }>;
}

export default function AdminBugsPage() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref');

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState(initialRef || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Detail / Triage Modal State
  const [selectedReport, setSelectedReport] = useState<InquiryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [triageStatus, setTriageStatus] = useState<BugStatus>('new');
  const [triagePriority, setTriagePriority] = useState<BugPriority>('medium');
  const [triageNotes, setTriageNotes] = useState('');
  const [isUpdatingTriage, setIsUpdatingTriage] = useState(false);
  const [isRetryingEmail, setIsRetryingEmail] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await fetch(`/api/admin/bugs?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch bug reports');
      }

      const data = await res.json();
      setInquiries(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      // Auto-open report if 'ref' query parameter matched
      if (initialRef && data.items?.length > 0 && !selectedReport) {
        const match = data.items.find((i: InquiryItem) => i.referenceId === initialRef);
        if (match) {
          openDetail(match);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to bug report service.');
      toast.error('Data loading error', {
        description: err.message || 'Failed to load bug reports.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter, page, limit, initialRef]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const openDetail = (report: InquiryItem) => {
    setSelectedReport(report);
    setTriageStatus(report.status);
    setTriagePriority(report.priority);
    setTriageNotes(report.internalNotes || '');
    setIsDetailOpen(true);
  };

  const handleSaveTriage = async () => {
    if (!selectedReport) return;
    setIsUpdatingTriage(true);
    try {
      const res = await fetch(`/api/admin/bugs/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: triageStatus,
          priority: triagePriority,
          internalNotes: triageNotes.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update triage status');
      }

      const data = await res.json();
      toast.success('Triage updated.', {
        description: `Report ${selectedReport.referenceId} updated to ${triageStatus.toUpperCase()} / ${triagePriority.toUpperCase()}.`,
      });

      setSelectedReport(data.inquiry);
      // Update in table listing
      setInquiries((prev) =>
        prev.map((item) => (item.id === selectedReport.id ? data.inquiry : item))
      );
    } catch (err: any) {
      toast.error('Update failed.', {
        description: err.message || 'Unable to save triage status.',
      });
    } finally {
      setIsUpdatingTriage(false);
    }
  };

  const handleRetryEmail = async () => {
    if (!selectedReport) return;
    setIsRetryingEmail(true);
    try {
      const res = await fetch('/api/admin/bugs/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId: selectedReport.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Retry attempt failed');
      }

      const data = await res.json();
      toast.success('Email delivery retried.', {
        description: `New status: ${data.inquiry.emailDeliveryStatus}`,
      });

      setSelectedReport(data.inquiry);
      setInquiries((prev) =>
        prev.map((item) => (item.id === selectedReport.id ? data.inquiry : item))
      );
    } catch (err: any) {
      toast.error('Email retry failed.', {
        description: err.message || 'Could not dispatch retry notification.',
      });
    } finally {
      setIsRetryingEmail(false);
    }
  };

  const getStatusBadge = (status: BugStatus) => {
    switch (status) {
      case 'new':
        return <Badge variant="teal" size="sm">New</Badge>;
      case 'in_progress':
        return <Badge variant="amber" size="sm">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="emerald" size="sm">Resolved</Badge>;
      case 'closed':
        return <Badge variant="neutral" size="sm">Closed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: BugPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C47272]/20 text-[#C47272] border border-[#C47272]/40">
            Critical
          </span>
        );
      case 'high':
        return <Badge variant="red" size="sm">High</Badge>;
      case 'medium':
        return <Badge variant="amber" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="neutral" size="sm">Low</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{priority}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'bug':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Bug className="w-3 h-3" /> Bug
          </span>
        );
      case 'feedback':
        return <Badge variant="teal" size="sm">Feedback</Badge>;
      case 'enquiry':
        return <Badge variant="neutral" size="sm">Enquiry</Badge>;
      case 'support':
        return <Badge variant="amber" size="sm">Support</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{category}</Badge>;
    }
  };

  const getDeliveryBadge = (delivery: EmailDeliveryStatus, attempts: number) => {
    if (delivery === 'sent') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Sent
        </span>
      );
    }
    if (delivery === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C47272]">
          <AlertCircle className="w-3.5 h-3.5" /> Failed ({attempts}x)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
        <Clock className="w-3.5 h-3.5" /> Queued
      </span>
    );
  };

  return (
    <AdminShell>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#1F2024] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#2C67C5]/10 text-[#2C67C5] dark:text-[#5B8DEF]">
                <Bug className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
                Bug Reports & Platform Triage
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1 ml-9">
              Real persisted bug reports, technical inquiries, and student issue triage with delivery telemetry.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-9 sm:ml-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchReports()}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Card */}
        <Card className="p-4 bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                label="Search Reports"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search REF, subject, reporter..."
              />
            </div>

            {/* Category Filter */}
            <div>
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'bug', label: 'Bugs Only' },
                  { value: 'feedback', label: 'Feedback' },
                  { value: 'enquiry', label: 'Enquiry' },
                  { value: 'support', label: 'Support Request' },
                ]}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                label="Triage Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'new', label: 'New' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
            </div>

            {/* Priority Filter */}
            <div>
              <Select
                label="Priority"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Reports Table / List */}
        <Card className="overflow-hidden bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024]">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#C47272]/20 text-[#C47272] flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                Unable to load reports
              </h3>
              <p className="text-xs text-[#71757E] max-w-md mx-auto">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchReports()}>
                Try again
              </Button>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Bug}
                title="No reports found"
                description={
                  searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No bug reports or inquiries match your active filter criteria.'
                    : 'There are currently no recorded bug reports or support inquiries in the platform database.'
                }
                actionLabel={
                  searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Reset filters'
                    : undefined
                }
                onAction={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                  setPage(1);
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#71757E] border-collapse">
                <thead className="bg-[#F8F9FA] dark:bg-[#18191C] text-[#4A4D54] dark:text-[#9CA3AF] uppercase text-[10px] tracking-wider font-semibold border-b border-[#E2E2DC] dark:border-[#1F2024]">
                  <tr>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Reporter</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E2DC] dark:divide-[#1F2024]">
                  {inquiries.map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-[#F8F9FA]/50 dark:hover:bg-[#18191C]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-[#18191B] dark:text-[#F3F4F6] whitespace-nowrap">
                        {report.referenceId}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getCategoryBadge(report.category)}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-medium text-[#18191B] dark:text-[#F3F4F6]">
                        {report.subject}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[11px] text-[#18191B] dark:text-[#F3F4F6] font-medium">
                          {report.submitterName || 'Student'}
                        </div>
                        <div className="text-[10px] text-[#71757E] font-mono">
                          {report.submitterEmail || 'Verified session'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getPriorityBadge(report.priority)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getDeliveryBadge(report.emailDeliveryStatus, report.emailDeliveryAttempts)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetail(report)}
                          className="gap-1 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Triage</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!isLoading && inquiries.length > 0 && (
            <div className="p-4 border-t border-[#E2E2DC] dark:border-[#1F2024] flex items-center justify-between text-xs text-[#71757E]">
              <div>
                Showing <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  {Math.min(page * limit, total)}
                </span>{' '}
                of <span className="font-semibold text-[#18191B] dark:text-[#F3F4F6]">{total}</span> reports
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-2 text-xs font-semibold text-[#18191B] dark:text-[#F3F4F6]">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detail & Triage Modal */}
      {isDetailOpen && selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDetailOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024] p-6 shadow-2xl z-10 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E2E2DC] dark:border-[#1F2024]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-[#2C67C5]/10 text-[#2C67C5] dark:text-[#5B8DEF] font-bold">
                    {selectedReport.referenceId}
                  </span>
                  {getCategoryBadge(selectedReport.category)}
                  {getStatusBadge(selectedReport.status)}
                  {getPriorityBadge(selectedReport.priority)}
                </div>
                <h2 className="text-lg font-bold text-[#18191B] dark:text-[#F3F4F6] mt-2">
                  {selectedReport.subject}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#71757E] mt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {selectedReport.submitterName || 'Student'} ({selectedReport.submitterEmail || 'session'})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 rounded-lg text-[#71757E] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Grid: Details Left, Triage Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Submitted Content (2 cols) */}
              <div className="lg:col-span-2 space-y-5">
                {/* Description / Message */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#71757E] mb-1.5">
                    Description & Details
                  </h4>
                  <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#18191C] text-xs text-[#18191B] dark:text-[#F3F4F6] whitespace-pre-wrap leading-relaxed border border-[#E2E2DC] dark:border-[#1F2024]">
                    {selectedReport.message}
                  </div>
                </div>

                {/* Bug Specific Details */}
                {selectedReport.category === 'bug' && (
                  <div className="space-y-4">
                    {selectedReport.reproductionSteps && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#71757E] mb-1.5">
                          Steps to Reproduce
                        </h4>
                        <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#18191C] text-xs text-[#18191B] dark:text-[#F3F4F6] whitespace-pre-wrap leading-relaxed border border-[#E2E2DC] dark:border-[#1F2024]">
                          {selectedReport.reproductionSteps}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#71757E] mb-1">
                          Expected Behavior
                        </h4>
                        <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#18191C] text-xs text-[#18191B] dark:text-[#F3F4F6] border border-[#E2E2DC] dark:border-[#1F2024]">
                          {selectedReport.expectedBehavior || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#71757E] mb-1">
                          Actual Behavior
                        </h4>
                        <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#18191C] text-xs text-[#18191B] dark:text-[#F3F4F6] border border-[#E2E2DC] dark:border-[#1F2024]">
                          {selectedReport.actualBehavior || 'Not specified'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consented Technical Diagnostics */}
                {selectedReport.includeDiagnosticContext && selectedReport.diagnosticContext && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#71757E] mb-1.5 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" />
                      Consented Technical Diagnostics
                    </h4>
                    <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] text-[11px] font-mono text-[#71757E] space-y-1">
                      {selectedReport.diagnosticContext.userAgent && (
                        <div>
                          <strong className="text-[#18191B] dark:text-[#F3F4F6]">User-Agent:</strong>{' '}
                          {selectedReport.diagnosticContext.userAgent}
                        </div>
                      )}
                      {selectedReport.diagnosticContext.screenSize && (
                        <div>
                          <strong className="text-[#18191B] dark:text-[#F3F4F6]">Screen:</strong>{' '}
                          {selectedReport.diagnosticContext.screenSize}
                        </div>
                      )}
                      {selectedReport.diagnosticContext.language && (
                        <div>
                          <strong className="text-[#18191B] dark:text-[#F3F4F6]">Language:</strong>{' '}
                          {selectedReport.diagnosticContext.language}
                        </div>
                      )}
                      {selectedReport.diagnosticContext.timestamp && (
                        <div>
                          <strong className="text-[#18191B] dark:text-[#F3F4F6]">Client Timestamp:</strong>{' '}
                          {selectedReport.diagnosticContext.timestamp}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Email Delivery Telemetry */}
                <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#71757E] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Email Delivery Telemetry
                    </h4>
                    {getDeliveryBadge(selectedReport.emailDeliveryStatus, selectedReport.emailDeliveryAttempts)}
                  </div>
                  <div className="text-xs text-[#71757E] space-y-1">
                    <div>
                      <strong>Recipients:</strong>{' '}
                      {selectedReport.emailRecipients && selectedReport.emailRecipients.length > 0
                        ? selectedReport.emailRecipients.join(', ')
                        : 'Configured server routing'}
                    </div>
                    <div>
                      <strong>Delivery Attempts:</strong> {selectedReport.emailDeliveryAttempts}
                    </div>
                    {selectedReport.emailLastError && (
                      <div className="text-[#C47272] bg-[#C47272]/10 p-2 rounded-lg text-[11px] font-mono">
                        <strong>Error:</strong> {selectedReport.emailLastError}
                      </div>
                    )}
                  </div>
                  {selectedReport.emailDeliveryStatus === 'failed' && (
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetryEmail}
                        isLoading={isRetryingEmail}
                        className="gap-1.5 text-xs text-[#2C67C5] border-[#2C67C5]"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Email Notification</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Triage Actions (1 col) */}
              <div className="space-y-5 p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] h-fit">
                <div className="flex items-center gap-1.5 pb-2 border-b border-[#E2E2DC] dark:border-[#1F2024]">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#18191B] dark:text-[#F3F4F6]">
                    Admin Triage Controls
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Status Select */}
                  <div>
                    <Select
                      label="Update Status"
                      value={triageStatus}
                      onChange={(e) => setTriageStatus(e.target.value as BugStatus)}
                      options={[
                        { value: 'new', label: 'New' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'closed', label: 'Closed' },
                      ]}
                    />
                  </div>

                  {/* Priority Select */}
                  <div>
                    <Select
                      label="Update Priority"
                      value={triagePriority}
                      onChange={(e) => setTriagePriority(e.target.value as BugPriority)}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                    />
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <Textarea
                      label="Internal Admin Notes"
                      value={triageNotes}
                      onChange={(e) => setTriageNotes(e.target.value)}
                      placeholder="Add investigation notes, reproduction verification, or engineer assignment..."
                      rows={4}
                    />
                    <span className="block text-[10px] text-[#71757E] mt-1">
                      Internal notes are restricted to administrators and are never visible to students.
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSaveTriage}
                    isLoading={isUpdatingTriage}
                    className="w-full gap-2 font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Triage Updates</span>
                  </Button>
                </div>

                {/* Audit Trail */}
                {selectedReport.events && selectedReport.events.length > 0 && (
                  <div className="pt-3 border-t border-[#E2E2DC] dark:border-[#1F2024] space-y-2">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757E]">
                      Activity History
                    </h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {selectedReport.events.map((evt, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] p-2 rounded-lg bg-white dark:bg-[#0D0E11] border border-[#E2E2DC] dark:border-[#1F2024]"
                        >
                          <div className="font-semibold text-[#18191B] dark:text-[#F3F4F6] flex items-center justify-between">
                            <span>{evt.action}</span>
                            <span className="text-[9px] text-[#71757E]">
                              {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#71757E] truncate">{evt.actorEmail}</div>
                          {evt.notes && <div className="text-[10px] text-[#71757E] mt-0.5">{evt.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
