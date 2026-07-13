'use client';

// App-wide light/dark theme, stored in localStorage `lead_theme` (shared with dashboard/mypage).
// Synced across components via a window event, same pattern as lib/lang.

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'lead_theme';
const EVT = 'lead-theme-change';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');
  useEffect(() => {
    setThemeState(getTheme());
    const h = () => setThemeState(getTheme());
    window.addEventListener(EVT, h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', h); };
  }, []);
  function setTheme(t: Theme) { localStorage.setItem(KEY, t); window.dispatchEvent(new Event(EVT)); }
  return { theme, dark: theme === 'dark', setTheme };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(dark ? 'light' : 'dark')} title={dark ? 'Light mode' : 'Dark mode'}
      className={className ?? 'w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-[13px] hover:bg-white/10 transition-all'}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
