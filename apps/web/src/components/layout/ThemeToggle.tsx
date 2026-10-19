'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../theme-provider';

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, setTheme } = useTheme();

  const toggle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-lg p-2 text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#1F2228] transition-colors min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D766E]"
      aria-label={`Toggle theme (currently ${theme})`}
      title={`Theme: ${theme}`}
    >
      {theme === 'light' && <Sun className="w-5 h-5 text-[#0D766E]" />}
      {theme === 'dark' && <Moon className="w-5 h-5 text-[#14B8A6]" />}
      {theme === 'system' && <Monitor className="w-5 h-5 text-[#71757E]" />}
      {showLabel && <span className="text-xs capitalize font-medium">{theme}</span>}
    </button>
  );
}
