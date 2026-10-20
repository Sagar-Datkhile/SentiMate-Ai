import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'SentiMate — Student Wellbeing & Counsellor-Support SaaS',
  description:
    'A little space to talk. A clearer path to support. Connecting student conversations with explainable support indicators and professional campus counselling.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#FBFBFA] dark:bg-[#0F1115] text-[#18191B] dark:text-[#F3F4F6] antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
