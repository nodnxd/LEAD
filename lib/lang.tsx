'use client';

// Lightweight KO/EN switch. No i18n framework — call t('한국어','English') at each string.
// Language is stored in localStorage and synced across components/pages via a window event.

import { useEffect, useState } from 'react';

export type Lang = 'ko' | 'en';
const KEY = 'lead-lang';
export const LANG_EVENT = 'lead-lang-change';
const EVT = LANG_EVENT;

export function getLang(): Lang {
  if (typeof window === 'undefined') return 'ko';
  return (localStorage.getItem(KEY) as Lang) === 'en' ? 'en' : 'ko';
}

// Set the app-wide language from anywhere (legacy pages with their own lang state).
export function setLangValue(l: Lang) {
  localStorage.setItem(KEY, l);
  window.dispatchEvent(new Event(EVT));
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>('ko');
  useEffect(() => {
    setLangState(getLang());
    const h = () => setLangState(getLang());
    window.addEventListener(EVT, h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener('storage', h); };
  }, []);
  function setLang(l: Lang) {
    localStorage.setItem(KEY, l);
    setLangState(l);
    window.dispatchEvent(new Event(EVT));
  }
  const t = (ko: string, en: string) => (lang === 'en' ? en : ko);
  return { lang, setLang, t };
}

// Pill toggle. Shows the language you'll switch TO.
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
      title={lang === 'ko' ? 'Switch to English' : '한국어로 전환'}
      className={className ?? 'px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-[11px] font-semibold hover:text-white transition-all'}>
      {lang === 'ko' ? 'EN' : '한국어'}
    </button>
  );
}
