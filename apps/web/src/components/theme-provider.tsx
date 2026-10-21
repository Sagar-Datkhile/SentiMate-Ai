'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sentimate-theme');
      if (stored === 'light') {
        setThemeState('light');
        document.documentElement.classList.remove('dark');
      } else {
        setThemeState('dark');
        document.documentElement.classList.add('dark');
        if (stored !== 'dark') {
          localStorage.setItem('sentimate-theme', 'dark');
        }
      }
    } catch {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sentimate-theme') {
        const val = e.newValue;
        if (val === 'light') {
          setThemeState('light');
          document.documentElement.classList.remove('dark');
        } else {
          setThemeState('dark');
          document.documentElement.classList.add('dark');
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('sentimate-theme', newTheme);
    } catch {
      // ignore
    }
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

