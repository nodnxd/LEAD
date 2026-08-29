'use client';

// App-wide light/dark theme, stored in localStorage `lead_theme` (shared with dashboard/mypage).
// Synced across components via a window event, same pattern as lib/lang.
//
// <html data-theme>는 layout.tsx의 인라인 스크립트가 페인트 전에 먼저 찍는다.
// 여기서만 찍으면 useEffect가 도는 시점까지 라이트 사용자에게 다크가 한 번 번쩍인다.
// globals.css의 color-scheme이 그 속성을 보고 네이티브 스크롤바·입력창을 맞춘다.

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'lead_theme';
const EVT = 'lead-theme-change';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
}

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');
  useEffect(() => {
    const t = getTheme();
    setThemeState(t); applyTheme(t);
    const h = () => { const n = getTheme(); setThemeState(n); applyTheme(n); };
    window.addEventListener(EVT, h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', h); };
  }, []);
  function setTheme(t: Theme) { localStorage.setItem(KEY, t); applyTheme(t); window.dispatchEvent(new Event(EVT)); }
  return { theme, dark: theme === 'dark', setTheme };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, setTheme } = useTheme();
  const label = dark ? '라이트 모드로 전환' : '다크 모드로 전환';
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      title={label}
      aria-label={label}
      className={className ?? 'w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-body hover:bg-white/10 transition-colors'}
    >
      <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
    </button>
  );
}
