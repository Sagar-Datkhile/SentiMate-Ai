'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  PhoneCall,
  Clock,
  ExternalLink,
  ShieldAlert,
  HeartHandshake,
  Search,
  ArrowLeft,
  Building,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ResourceCardSkeleton, LoadingRegion } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface SupportResource {
  id: string;
  title: string;
  category: 'crisis' | 'counselling' | 'helpline' | 'peer';
  description: string;
  phone?: string;
  url?: string;
  hours: string;
  isEmergency: boolean;
  location?: string;
}

export default function ResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial mount hydration without artificial delay
    setIsLoading(false);
  }, []);

  const resources: SupportResource[] = [
    {
      id: 'res-1',
      title: '988 Suicide & Crisis Lifeline',
      category: 'crisis',
      description: 'Free, confidential support available 24/7 for people in distress, crisis resources, and prevention.',
      phone: '988',
      url: 'https://988lifeline.org',
      hours: '24/7 / 365 Days',
      isEmergency: true,
    },
    {
      id: 'res-2',
      title: 'Crisis Text Line',
      category: 'crisis',
      description: 'Text HOME to 741741 to connect with a volunteer crisis counselor 24/7 via text message.',
      phone: 'Text HOME to 741741',
      url: 'https://www.crisistextline.org',
      hours: '24/7 Text Support',
      isEmergency: true,
    },
    {
      id: 'res-3',
      title: 'Campus Health & Psychological Counselling Center',
      category: 'counselling',
      description: 'Confidential individual sessions, acute triage, and mental health consultations for enrolled students.',
      phone: '(555) 234-5678',
      hours: 'Monday – Friday, 8:30 AM – 5:00 PM',
      isEmergency: false,
      location: 'Student Wellness Pavilion, 3rd Floor, Room 302',
    },
    {
      id: 'res-4',
      title: 'Campus Security & Emergency Escort',
      category: 'crisis',
      description: '24-hour campus security for immediate safety concerns, medical dispatch, or safety escorts.',
      phone: '(555) 234-9999',
      hours: '24/7 Campus Dispatch',
      isEmergency: true,
      location: 'Main Gate Security Office',
    },
    {
      id: 'res-5',
      title: 'The Trevor Project (LGBTQ+ Youth Crisis)',
      category: 'helpline',
      description: 'Confidential suicide prevention and crisis intervention services for LGBTQ young people.',
      phone: '1-866-488-7386',
      url: 'https://www.thetrevorproject.org',
      hours: '24/7 Support',
      isEmergency: true,
    },
    {
      id: 'res-6',
      title: 'Student Peer Listening Network',
      category: 'peer',
      description: 'Trained student volunteers providing non-judgmental peer listening and wellness check-in chats.',
      hours: 'Every evening, 7:00 PM – 11:00 PM',
      isEmergency: false,
      location: 'Student Union, Room 104',
    },
  ];

  const filtered = resources.filter((res) => {
    const matchesCategory = selectedCategory === 'all' || res.category === selectedCategory;
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#000000] text-[#18191B] dark:text-[#F3F4F6] transition-colors pb-16">
      {/* Top Header */}
      <header className="border-b border-[#E2E2DC] dark:border-[#1F2024] bg-white dark:bg-[#0D0E11] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/student/chat"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#4F648C] dark:text-[#91A7D0] hover:underline min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Urgent Emergency Warning Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FEF2F2] dark:bg-[rgba(239,68,68,0.12)] border border-[#FECACA] dark:border-[rgba(239,68,68,0.25)] text-red-800 dark:text-red-300 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-bold text-sm sm:text-base">
              Immediate Crisis or Medical Emergency?
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed">
              If you are in immediate danger of hurting yourself or someone else, please call emergency services (<strong>911 / 112</strong>) or call the Suicide & Crisis Lifeline at <strong>988</strong> immediately. These resources are always available independent of platform status.
            </p>
          </div>
        </div>

        {/* Directory Intro & Search */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#18191B] dark:text-[#F3F4F6]">
              Verified Campus & Community Support Resources
            </h1>
            <p className="text-xs sm:text-sm text-[#71757E] mt-1">
              Trusted, verified directory of university psychological services, crisis hotlines, and peer listening.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-[#71757E]" />
              <input
                type="text"
                placeholder="Search resources, helplines, or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white dark:bg-[#18191C] border border-[#E2E2DC] dark:border-[#1F2024] text-xs sm:text-sm text-[#18191B] dark:text-[#F3F4F6] focus:outline-none focus:border-[#4F648C] dark:focus:border-[#91A7D0] min-h-[44px]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Services' },
                { id: 'crisis', label: 'Crisis Hotlines' },
                { id: 'counselling', label: 'Campus Counselling' },
                { id: 'helpline', label: 'Specialized Helplines' },
                { id: 'peer', label: 'Peer Support' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                    selectedCategory === cat.id
                      ? 'bg-[#4F648C] text-white dark:bg-[#91A7D0] dark:text-[#151B26]'
                      : 'bg-[#F4F4F1] dark:bg-[#18191C] text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#EAEAE5] dark:hover:bg-[#222327]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Cards Grid */}
        <LoadingRegion isLoading={isLoading} announcement="Loading verified support resources...">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResourceCardSkeleton />
              <ResourceCardSkeleton />
              <ResourceCardSkeleton />
              <ResourceCardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Matching Resources Found"
              description="No crisis or support resources matched your current category or search criteria. Try broadening your keywords."
              actionLabel="Reset Search Filters"
              onAction={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((res) => (
                <Card
                  key={res.id}
                  className={`space-y-3.5 border ${
                    res.isEmergency
                      ? 'border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10'
                      : 'border-[#E2E2DC] dark:border-[#1F2024]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-[#18191B] dark:text-[#F3F4F6]">
                      {res.title}
                    </h3>
                    <Badge variant={res.isEmergency ? 'red' : 'teal'} size="sm">
                      {res.hours}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#4A4D54] dark:text-[#9CA3AF] leading-relaxed">
                    {res.description}
                  </p>

                  <div className="pt-2 border-t border-[#E2E2DC]/60 dark:border-[#1F2024]/60 space-y-2 text-xs">
                    {res.phone && (
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-3.5 h-3.5 text-[#4F648C] dark:text-[#91A7D0]" />
                        <a
                          href={`tel:${res.phone.replace(/[^0-9]/g, '')}`}
                          className="font-bold text-[#4F648C] dark:text-[#91A7D0] hover:underline"
                        >
                          {res.phone}
                        </a>
                      </div>
                    )}

                    {res.location && (
                      <div className="flex items-center gap-2 text-[#71757E]">
                        <Building className="w-3.5 h-3.5" />
                        <span>{res.location}</span>
                      </div>
                    )}

                    {res.url && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-3.5 h-3.5 text-[#71757E]" />
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#4F648C] dark:text-[#91A7D0] hover:underline truncate"
                        >
                          Official Website
                        </a>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </LoadingRegion>
      </div>
    </div>
  );
}
