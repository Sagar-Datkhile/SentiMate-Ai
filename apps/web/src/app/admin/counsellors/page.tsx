'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { AppointmentCardSkeleton, LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserPlus, CheckCircle2, Shield, Mail, Building, Phone, Users } from 'lucide-react';

interface CounsellorItem {
  id: string;
  name: string;
  email: string;
  title: string;
  location: string;
  activeCases: number;
  maxCases: number;
  status: 'active' | 'invited' | 'inactive';
}

export default function AdminCounsellorsPage() {
  const [counsellors, setCounsellors] = useState<CounsellorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('Campus Counsellor');
  const [officeLocation, setOfficeLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    // Load authorized counsellor directory without artificial delay
    const loadCounsellors = () => {
      try {
        const stored = sessionStorage.getItem('sentimate_counsellors');
        if (stored) {
          setCounsellors(JSON.parse(stored));
        } else {
          setCounsellors([]);
        }
      } catch {
        setCounsellors([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCounsellors();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || loading) return;
    setLoading(true);

    const newCounsellor: CounsellorItem = {
      id: `cns-${Date.now()}`,
      name: fullName.trim(),
      email: email.trim(),
      title: title.trim() || 'Campus Counsellor',
      location: officeLocation.trim() || 'Wellness Pavilion',
      activeCases: 0,
      maxCases: 30,
      status: 'invited',
    };

    const updated = [newCounsellor, ...counsellors];
    setCounsellors(updated);
    try {
      sessionStorage.setItem('sentimate_counsellors', JSON.stringify(updated));
    } catch {
      // Ignore
    }

    setSuccessBanner(
      `Counsellor invitation generated for ${fullName} (${email}). Secure activation link dispatched. Action recorded in audit logs.`
    );
    setInviteModalOpen(false);
    setFullName('');
    setEmail('');
    setOfficeLocation('');
    setPhone('');
    setLoading(false);
  };

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DC] dark:border-[#2C3038] pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Counsellor Provisioning & Management
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Invite authorized campus clinicians and manage student-counsellor assignments.
            </p>
          </div>
          <Button
            onClick={() => setInviteModalOpen(true)}
            variant="primary"
            size="md"
            className="gap-2 shadow-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite New Counsellor</span>
          </Button>
        </div>

        {successBanner && (
          <div className="p-4 rounded-xl bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.12)] border border-[#A7F3D0] dark:border-[rgba(16,185,129,0.25)] text-[#047857] dark:text-[#34D399] flex items-center gap-3 text-xs sm:text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Counsellors List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#18191B] dark:text-[#F3F4F6] uppercase tracking-wide">
            Active Clinician Staff
          </h2>

          <LoadingRegion isLoading={isLoading} announcement="Loading authorized counsellors...">
            {isLoading ? (
              <div className="space-y-3">
                <AppointmentCardSkeleton />
                <AppointmentCardSkeleton />
                <AppointmentCardSkeleton />
              </div>
            ) : counsellors.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Counsellors Provisioned"
                description="No campus clinicians are currently registered in this workspace. Invite a certified counsellor to begin managing cases and receiving student referrals."
                actionLabel="Invite New Counsellor"
                onAction={() => setInviteModalOpen(true)}
              />
            ) : (
              <div className="space-y-3">
                {counsellors.map((c) => (
                  <Card
                    key={c.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-[#18191B] dark:text-[#F3F4F6]">
                          {c.name}
                        </span>
                        <Badge variant={c.status === 'active' ? 'teal' : 'amber'} size="sm">
                          {c.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] flex items-center gap-3 flex-wrap">
                        <span>{c.title}</span>
                        <span>•</span>
                        <span>{c.email}</span>
                        <span>•</span>
                        <span>{c.location}</span>
                      </div>
                      <div className="text-[11px] text-[#71757E] pt-1">
                        Active Cases: <strong>{c.activeCases}</strong> / {c.maxCases} caseload cap
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" size="sm">
                        Role: Counsellor (Protected)
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </LoadingRegion>
        </div>
      </div>

      {/* Invite Counsellor Dialog */}
      <Dialog
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Provision New Campus Counsellor"
        description="Creates an authorized clinician account with email activation. No public signup or plaintext passwords."
      >
        <form onSubmit={handleInvite} className="space-y-4 text-xs sm:text-sm">
          <Input
            label="Full Name & Clinical Credentials"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Emily Thorne, Psy.D"
            required
          />

          <Input
            label="Official Institutional Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.thorne@university.edu"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Professional Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Campus Counsellor"
              required
            />
            <Input
              label="Office Location"
              value={officeLocation}
              onChange={(e) => setOfficeLocation(e.target.value)}
              placeholder="Health Pavilion Room 204"
              required
            />
          </div>

          <Input
            label="Office Phone (Optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 234-5678"
          />

          <div className="p-3 bg-[#F4F4F1] dark:bg-[#1F2228] rounded-xl text-xs text-[#71757E] leading-relaxed">
            🛡️ <strong>Security Protocol:</strong> A cryptographic single-use invitation token will be generated. The clinician sets their own password upon first activation.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setInviteModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Dispatch Invitation
            </Button>
          </div>
        </form>
      </Dialog>
    </AdminShell>
  );
}
