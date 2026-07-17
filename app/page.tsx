'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const t = (_ko: string, en: string) => en; // login is English-only (like room)
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
    if (!email || !password) return setError(t('이메일과 비밀번호를 입력해주세요.', 'Enter your email and password.'));
    setLoading(true); setError('');
    if (rememberMe && email) localStorage.setItem('lead_saved_email', email);
    else localStorage.removeItem('lead_saved_email');
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (isSignUp) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('user_products').upsert({ user_id: user.id, product: 'lead' }, { onConflict: 'user_id,product' });
    }
    router.push(isSignUp ? '/onboarding' : '/hub');
  };

  const handleReset = async () => {
    if (!email.trim()) { setError(t('이메일을 입력해주세요', 'Enter your email')); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setResetSent(true); setLoading(false);
  };

  const accent = '#6366F1';
  const accentHover = '#4F46E5';
  const inputCls = 'w-full rounded-xl bg-white/5 border border-white/10 focus:border-white px-5 py-4 text-lg text-white placeholder:text-white/30 focus:outline-none transition-colors';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        .font-pretendard { font-family: 'Pretendard', sans-serif; }
        @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.05;}50%{transform:scale(1.1);opacity:0.09;}}
      `}} />
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6 font-pretendard relative overflow-hidden">
        <div className="relative z-10 w-full max-w-md">
          {/* 브랜드 — 세 제품 통합 (선택은 로그인 후 hub에서) */}
          <div className="mb-12">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                <span style={{ color: '#6366F1' }}>LEAD</span>
                <span className="text-white/15"> · </span>
                <span style={{ color: '#E3B24A' }}>CAST</span>
                <span className="text-white/15"> · </span>
                <span style={{ color: '#2FB6A3' }}>SPLIT</span>
              </h1>
            </div>
            <p className="mt-3 text-lg text-white/40">{t('로그인하고 시작하세요', 'Sign in to get started')}</p>
          </div>

          {forgotMode ? (
            resetSent ? (
              <div className="text-center">
                <div className="text-4xl mb-3">📩</div>
                <p className="text-white font-bold text-lg mb-1">{t('재설정 메일을 보냈어요', 'Reset email sent')}</p>
                <p className="text-white/40 text-sm leading-relaxed">{t(`${email}로`, `We sent a reset link to`)}<br />{t('비밀번호 재설정 링크를 보냈어요.', email)}</p>
                <button onClick={() => { setForgotMode(false); setResetSent(false); }} className="mt-6 text-base text-white/40 hover:text-white/70 transition-colors">← {t('로그인으로 돌아가기', 'Back to login')}</button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <p className="text-white/50 text-base">{t('가입한 이메일로 재설정 링크를 보내드려요.', 'We’ll email a reset link to your account.')}</p>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('이메일', 'Email')} type="email"
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  onFocus={e => (e.currentTarget.style.borderColor = '#ffffff')} onBlur={e => (e.currentTarget.style.borderColor = '')}
                  className={`login-input ${inputCls}`} />
                {error && <p className="text-base text-red-400">{error}</p>}
                <button onClick={handleReset} disabled={loading}
                  className="w-full rounded-xl px-5 py-4 text-lg font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: accent }}
                  onMouseEnter={e => (e.currentTarget.style.background = accentHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = accent)}>
                  {loading ? '...' : t('재설정 메일 보내기', 'Send reset email')}
                </button>
                <button onClick={() => { setForgotMode(false); setError(''); }} className="text-base text-white/30 hover:text-white/60 transition-colors">← {t('돌아가기', 'Back')}</button>
              </div>
            )
          ) : (
            <>
              <div className="flex flex-col gap-5">
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('이메일', 'Email')} type="email"
                  onFocus={e => (e.currentTarget.style.borderColor = '#ffffff')} onBlur={e => (e.currentTarget.style.borderColor = '')}
                  className={`login-input ${inputCls}`} />
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder={t('비밀번호', 'Password')} type="password"
                  onKeyDown={e => e.key === 'Enter' && handle()}
                  onFocus={e => (e.currentTarget.style.borderColor = '#ffffff')} onBlur={e => (e.currentTarget.style.borderColor = '')}
                  className={`login-input ${inputCls}`} />

                <div className="flex items-center justify-between">
                  {!isSignUp ? (
                    <button type="button" onClick={() => setRememberMe(v => !v)} className="flex items-center gap-3 select-none">
                      <span className="relative w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                        style={rememberMe ? { background: accent, borderColor: accent } : { borderColor: 'rgba(255,255,255,0.2)' }}>
                        {rememberMe && <span className="text-[10px] text-white leading-none">✓</span>}
                      </span>
                      <span className="text-base text-white/40">{t('아이디 기억하기', 'Remember me')}</span>
                    </button>
                  ) : <span />}
                  <button onClick={() => { setForgotMode(true); setError(''); }} className="text-base text-white/30 hover:text-white/60 transition-colors">{t('비밀번호 찾기', 'Forgot password')}</button>
                </div>

                {error && <p className="text-base text-red-400">{error}</p>}

                <button onClick={handle} disabled={loading}
                  className="w-full rounded-xl px-5 py-4 text-lg font-semibold text-[#111] bg-white hover:bg-white/90 transition-colors disabled:opacity-50">
                  {loading ? '...' : isSignUp ? t('회원가입', 'Sign up') : t('로그인', 'Log in')}
                </button>
              </div>

              <div className="mt-5 flex justify-center">
                <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-base text-white/30 hover:text-white/60 transition-colors">
                  {isSignUp ? t('이미 계정이 있으신가요? 로그인', 'Already have an account? Log in') : t('계정이 없으신가요? 회원가입', 'No account? Sign up')}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-white/20 text-xs mt-10">
            {t('로그인하면 LEAD · CAST · SPLIT을 골라 들어가요', 'Sign in, then pick LEAD · CAST · SPLIT')}
          </p>
        </div>
      </main>
    </>
  );
}
