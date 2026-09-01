'use client';
import { pressable } from '@/lib/a11y';

// 📁 app/page.tsx

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type AuthMode = 'login' | 'signup';

export default function LandingPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cast_saved_email');
    if (saved) { setEmail(saved); setRememberEmail(true); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/roster/dashboard');
    });
  }, []);

  const handleAuth = async () => {
    if (!email || !password) return setError('이메일과 비밀번호를 입력해주세요.');
    setLoading(true); setError('');
    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSignupDone(true);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('이메일 또는 비밀번호가 틀렸어요.');
      else if (data.user) {
        if (rememberEmail) localStorage.setItem('cast_saved_email', email);
        else localStorage.removeItem('cast_saved_email');
        router.push('/roster/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-surface-1 text-white flex items-center justify-center font-ui relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.07]" style={{background:'#E3B24A', filter:'blur(200px)'}} />

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* 로고 */}
        <div className="text-center mb-10">
          <div className="flex items-baseline justify-center gap-2.5">
            <h1 className="font-display text-display text-brand-cast-text uppercase tracking-tighter">CAST</h1>
            <span className="text-zinc-500 text-mini font-bold tracking-[0.2em]">by NEN</span>
          </div>
          <p className="text-micro font-bold tracking-[0.5em] uppercase mt-2" style={{ color: '#4a7fa5', opacity: 0.7 }}>Roster Manager</p>
        </div>

        {signupDone ? (
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center">
            <p className="text-display mb-3">📧</p>
            <p className="text-white font-bold mb-2">이메일을 확인해주세요</p>
            <p className="text-zinc-500 text-mini leading-relaxed">가입 확인 메일을 보냈어요.<br />확인 후 로그인하세요.</p>
            <button onClick={() => { setSignupDone(false); setAuthMode('login'); }} className="mt-6 text-brand-cast-text text-mini font-bold hover:underline">로그인 →</button>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
            <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1">
              {(['login', 'signup'] as AuthMode[]).map(m => (
                <button key={m} onClick={() => { setAuthMode(m); setError(''); }} className={`flex-1 py-2 rounded-lg text-mini font-black uppercase tracking-widest transition ${authMode === m ? 'bg-brand-cast text-white shadow-lg shadow-black/20' : 'text-zinc-500 hover:text-white'}`}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <input type="email" autoComplete="email" spellCheck={false} name="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body outline-none focus:border-brand-cast/50 transition placeholder:text-zinc-600 text-white" />
              <input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} name="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body outline-none focus:border-brand-cast/50 transition placeholder:text-zinc-600 text-white" />
              {authMode === 'login' && (
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <div {...pressable(() => setRememberEmail(!rememberEmail))} className={`w-4 h-4 rounded-lg border transition flex items-center justify-center shrink-0 ${rememberEmail ? 'bg-brand-cast border-brand-cast' : 'border-white/20 bg-white/5 group-hover:border-white/40'}`}>
                    {rememberEmail && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-zinc-500 text-mini group-hover:text-zinc-300 transition-colors">아이디 기억하기</span>
                </label>
              )}
              {error && <p className="text-red-400 text-mini">{error}</p>}
              <button onClick={handleAuth} disabled={loading} className="w-full bg-brand-cast text-white py-3 rounded-xl font-semibold text-mini uppercase tracking-widest hover:opacity-90 transition disabled:opacity-50 mt-1">
                {loading ? '…' : authMode === 'login' ? '로그인' : '회원가입'}
              </button>
            </div>
          </div>
        )}
        <p className="text-center text-zinc-700 text-micro mt-8">Contact : everplayground@gmail.com</p>
      </div>
    </main>
  );
}