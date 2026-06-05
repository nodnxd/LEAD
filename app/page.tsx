'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'host' | 'guest'>('host');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lead_saved_email');
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  const handle = async () => {
    setLoading(true); setError('');
    if (rememberMe && email) localStorage.setItem('lead_saved_email', email);
    else localStorage.removeItem('lead_saved_email');
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (mode === 'host') {
      router.push('/dashboard');
    } else {
      if (isSignUp) { router.push('/onboarding'); return; }
      const lastHost = localStorage.getItem('last_host_id');
      router.push(lastHost ? `/view/${lastHost}` : '/guest');
    }
  };

  const handleReset = async () => {
    if (!email.trim()) { setError('이메일을 입력해주세요'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setResetSent(true); setLoading(false);
  };

  const isHost = mode === 'host';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; }` }} />
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-5 font-pretendard relative overflow-hidden">
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.1] pointer-events-none transition-colors ${isHost ? 'bg-[#1736B8]' : 'bg-[#9CC0FF]'}`} />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-2.5 mb-2">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
              <span className="text-zinc-500 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
            </div>
            <p className="text-zinc-600 text-[12px]">{isHost ? 'Host Dashboard' : 'Member Login'}</p>
          </div>

          {/* 호스트 / 게스트 토글 */}
          <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
            {(['host', 'guest'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setForgotMode(false); setResetSent(false); }}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all ${mode === m
                  ? (m === 'host' ? 'bg-[#3358E8]/25 text-[#8FB0FF] border border-[#3358E8]/55' : 'bg-[#9CC0FF]/15 text-[#BBD3FF] border border-[#9CC0FF]/45')
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}>
                {m === 'host' ? '🏢 호스트' : '🎤 게스트'}
              </button>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
            {forgotMode ? (
              resetSent ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">📩</div>
                  <p className="text-white font-black text-[15px] mb-1">재설정 메일을 보냈어요</p>
                  <p className="text-zinc-500 text-[12px] leading-relaxed">{email}로<br />비밀번호 재설정 링크를 보냈어요.<br />메일함을 확인해주세요.</p>
                  <button onClick={() => { setForgotMode(false); setResetSent(false); }} className="mt-5 w-full py-3 rounded-xl border border-white/10 text-zinc-400 font-bold text-[13px] hover:text-white transition-all">로그인으로 돌아가기</button>
                </div>
              ) : (
                <>
                  <p className="text-white font-black text-[15px] mb-1">비밀번호 찾기</p>
                  <p className="text-zinc-500 text-[12px] mb-4">가입한 이메일로 재설정 링크를 보내드려요.</p>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email"
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white mb-3" />
                  {error && <p className="text-red-400 text-[12px] mb-3">{error}</p>}
                  <button onClick={handleReset} disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 mb-2">
                    {loading ? '...' : '재설정 메일 보내기'}
                  </button>
                  <button onClick={() => { setForgotMode(false); setError(''); }} className="w-full text-zinc-600 text-[12px] hover:text-zinc-400 transition-colors">← 돌아가기</button>
                </>
              )
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-4">
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white" />
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" type="password"
                    onKeyDown={e => e.key === 'Enter' && handle()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white" />
                </div>
                {error && <p className="text-red-400 text-[12px] mb-3">{error}</p>}
                <div className="flex items-center justify-between mb-3">
                  {!isSignUp ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-3.5 h-3.5 accent-[#5B8CFF]" />
                      <span className="text-zinc-500 text-[12px]">아이디 기억하기</span>
                    </label>
                  ) : <span />}
                  <button onClick={() => { setForgotMode(true); setError(''); }} className="text-zinc-500 text-[12px] hover:text-[#5B8CFF] transition-colors">비밀번호 찾기</button>
                </div>
                <button onClick={handle} disabled={loading}
                  className={`w-full py-3 rounded-xl text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 mb-3 ${isHost ? 'bg-gradient-to-r from-[#1736B8] to-[#3358E8] shadow-lg shadow-[#1736B8]/30' : 'bg-gradient-to-r from-[#7BA4FF] to-[#A9C7FF] shadow-lg shadow-[#7BA4FF]/25'}`}>
                  {loading ? '...' : isSignUp ? (isHost ? '호스트 회원가입' : '게스트 회원가입') : '로그인'}
                </button>
                <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="w-full text-zinc-600 text-[12px] hover:text-zinc-400 transition-colors">
                  {isSignUp ? '이미 계정이 있어요' : '계정이 없어요'}
                </button>
              </>
            )}
          </div>
          <p className="text-center text-zinc-700 text-[11px] mt-5">
            {isHost ? '리드를 올리고 데모를 수급하는 담당자용' : '초대받은 멤버 · 데모를 제출하는 분용'}
          </p>
        </div>
      </main>
    </>
  );
}
