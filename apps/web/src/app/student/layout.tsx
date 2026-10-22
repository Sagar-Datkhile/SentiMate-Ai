import React, { Suspense } from 'react';
import { StudentProvider } from '@/components/layout/StudentContext';
import { StudentShell } from '@/components/layout/StudentShell';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudentProvider>
      <Suspense fallback={null}>
        <StudentShell>{children}</StudentShell>
      </Suspense>
    </StudentProvider>
  );
}
