'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    setLoading(true); setError('');
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    const qp = new URLSearchParams(window.location.search);
    router.push(qp.get('redirect') || '/dashboard');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; }`}} />
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-5 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.08] pointer-events-none" />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-10">
            <div className="flex items-baseline justify-center gap-2.5 mb-2">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
              <span className="text-zinc-500 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
            </div>
            <p className="text-zinc-600 text-[12px]">Host Dashboard</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col gap-3 mb-4">
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white" />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" type="password"
                onKeyDown={e => e.key === 'Enter' && handle()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white" />
            </div>
            {error && <p className="text-red-400 text-[12px] mb-3">{error}</p>}
            <button onClick={handle} disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 mb-3">
              {loading ? '...' : isSignUp ? '회원가입' : '로그인'}
            </button>
            <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-zinc-600 text-[12px] hover:text-zinc-400 transition-colors">
              {isSignUp ? '이미 계정이 있어요' : '계정이 없어요'}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}