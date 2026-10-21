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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sentimate-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}else{document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';if(t!=='dark'){localStorage.setItem('sentimate-theme','dark');}}}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#FBFBFA] dark:bg-[#000000] text-[#18191B] dark:text-[#F3F4F6] antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
