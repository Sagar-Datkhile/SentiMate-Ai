'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme-provider';

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-lg p-2 text-[#4A4D54] dark:text-[#9CA3AF] hover:bg-[#F4F4F1] dark:hover:bg-[#18191C] transition-colors min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F648C] dark:focus-visible:ring-[#2C67C5]"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme (currently ${theme})`}
      title={`Theme: ${theme}`}
    >
      {theme === 'light' ? (
        <Sun className="w-5 h-5 text-[#4F648C]" />
      ) : (
        <Moon className="w-5 h-5 text-[#5B8DEF]" />
      )}
      {showLabel && <span className="text-xs capitalize font-medium">{theme}</span>}
    </button>
  );
}
