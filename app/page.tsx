'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [product, setProduct] = useState<'lead' | 'cast'>('lead');
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
    const savedProduct = localStorage.getItem('lead_login_product');
    if (savedProduct === 'lead' || savedProduct === 'cast') setProduct(savedProduct);
  }, []);
  const pickProduct = (p: 'lead' | 'cast') => { setProduct(p); localStorage.setItem('lead_login_product', p); };

  const handle = async () => {
    if (!email || !password) return setError('이메일과 비밀번호를 입력해주세요.');
    setLoading(true); setError('');
    if (rememberMe && email) localStorage.setItem('lead_saved_email', email);
    else localStorage.removeItem('lead_saved_email');
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (isSignUp) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('user_products').upsert({ user_id: user.id, product: product === 'cast' ? 'roster' : 'lead' }, { onConflict: 'user_id,product' });
    }
    if (product === 'cast') { router.push('/roster/dashboard'); return; }
    router.push(isSignUp ? '/onboarding' : '/hub');
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

  const isCast = product === 'cast';
  // 제품별 액센트
  const accent = isCast ? '#E0A63C' : '#3E78DB';
  const accentHover = isCast ? '#C68F2E' : '#2F62C2';
  const accentLight = isCast ? '#EEC57A' : '#A9C4F0';
  const inputCls = 'w-full rounded-xl bg-white/5 border border-white/10 px-5 py-4 text-lg text-white placeholder:text-white/30 focus:outline-none transition-colors';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        .font-pretendard { font-family: 'Pretendard', sans-serif; }
        @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.05;}50%{transform:scale(1.1);opacity:0.09;}}
        .login-input:focus { border-color: ${accent} !important; }
      `}} />
      <main className="min-h-screen bg-[#141414] text-white flex items-center justify-center px-6 font-pretendard relative overflow-hidden">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none transition-colors"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, animation: 'orb-pulse 6s ease-in-out infinite' }} />

        <div className="relative z-10 w-full max-w-md">
          {/* 로고 + 제품 토글 */}
          <div className="mb-12">
            <div className="flex items-baseline gap-3">
              <h1 className="text-6xl font-black uppercase tracking-tighter text-transparent bg-clip-text transition-colors"
                style={{ backgroundImage: `linear-gradient(to right, ${accent}, ${accentLight})` }}>
                {isCast ? 'CAST' : 'LEAD'}
              </h1>
              <span className="text-white/30 text-xs font-bold tracking-[0.2em]">by NEN</span>
            </div>
            <p className="mt-3 text-lg text-white/40">{isCast ? 'manage your roster' : 'find your next lead'}</p>

            {!forgotMode && (
              <div className="mt-6 inline-flex gap-1 p-1 bg-white/5 border border-white/10 rounded-full">
                {(['lead', 'cast'] as const).map(p => {
                  const on = product === p;
                  return (
                    <button key={p} onClick={() => pickProduct(p)}
                      className="px-5 py-1.5 rounded-full text-sm font-bold transition-all"
                      style={on
                        ? { background: p === 'lead' ? '#3E78DB' : '#E0A63C', color: '#fff' }
                        : { color: 'rgba(255,255,255,0.35)' }}>
                      {p === 'lead' ? 'LEAD' : 'CAST'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {forgotMode ? (
            resetSent ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📩</div>
                <p className="text-white font-bold text-lg mb-1">재설정 메일을 보냈어요</p>
                <p className="text-white/40 text-sm leading-relaxed">{email}로<br />비밀번호 재설정 링크를 보냈어요.</p>
                <button onClick={() => { setForgotMode(false); setResetSent(false); }} className="mt-6 text-base text-white/40 hover:text-white/70 transition-colors">← 로그인으로 돌아가기</button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <p className="text-white/50 text-base">가입한 이메일로 재설정 링크를 보내드려요.</p>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email"
                  onKeyDown={e => e.key === 'Enter' && handleReset()} className={`login-input ${inputCls}`} />
                {error && <p className="text-base text-red-400">{error}</p>}
                <button onClick={handleReset} disabled={loading}
                  className="w-full rounded-xl px-5 py-4 text-lg font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: accent }}
                  onMouseEnter={e => (e.currentTarget.style.background = accentHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = accent)}>
                  {loading ? '...' : '재설정 메일 보내기'}
                </button>
                <button onClick={() => { setForgotMode(false); setError(''); }} className="text-base text-white/30 hover:text-white/60 transition-colors">← 돌아가기</button>
              </div>
            )
          ) : (
            <>
              <div className="flex flex-col gap-5">
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" type="email" className={`login-input ${inputCls}`} />
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" type="password"
                  onKeyDown={e => e.key === 'Enter' && handle()} className={`login-input ${inputCls}`} />

                <div className="flex items-center justify-between">
                  {!isSignUp ? (
                    <button type="button" onClick={() => setRememberMe(v => !v)} className="flex items-center gap-3 select-none">
                      <span className="relative w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={rememberMe ? { background: accent, borderColor: accent } : { borderColor: 'rgba(255,255,255,0.2)' }}>
                        {rememberMe && <span className="text-[10px] text-white leading-none">✓</span>}
                      </span>
                      <span className="text-base text-white/40">아이디 기억하기</span>
                    </button>
                  ) : <span />}
                  <button onClick={() => { setForgotMode(true); setError(''); }} className="text-base text-white/30 hover:text-white/60 transition-colors">비밀번호 찾기</button>
                </div>

                {error && <p className="text-base text-red-400">{error}</p>}

                <button onClick={handle} disabled={loading}
                  className="w-full rounded-xl px-5 py-4 text-lg font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: accent }}
                  onMouseEnter={e => (e.currentTarget.style.background = accentHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = accent)}>
                  {loading ? '...' : isSignUp ? '회원가입' : '로그인'}
                </button>
              </div>

              <div className="mt-5 flex justify-center">
                <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-base text-white/30 hover:text-white/60 transition-colors">
                  {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-white/20 text-xs mt-10">
            {isCast ? '아티스트 로스터 관리' : '로그인하면 참여·운영할 회사를 선택해요'}
          </p>
        </div>
      </main>
    </>
  );
}
