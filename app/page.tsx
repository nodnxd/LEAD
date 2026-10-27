'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/lang';
import { BRAND } from '@/lib/brand';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLang(); // auto by region (Korea → Korean, else English)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lead_saved_email');
    if (saved) { setEmail(saved); setRememberMe(true); }
    if (new URLSearchParams(window.location.search).get('verified') === '1') setVerified(true);
  }, []);

  const handle = async () => {
    // 에러는 첫 번째 문제 필드로 포커스를 옮긴다 — 폼이 길지 않아도 스크린리더가 위치를 잡아야 한다.
    if (!email) { setError(t('이메일과 비밀번호를 입력해주세요.', 'Enter your email and password.')); emailRef.current?.focus(); return; }
    if (!password) { setError(t('이메일과 비밀번호를 입력해주세요.', 'Enter your email and password.')); passwordRef.current?.focus(); return; }
    setLoading(true); setError('');
    if (rememberMe && email) localStorage.setItem('lead_saved_email', email);
    else localStorage.removeItem('lead_saved_email');
    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/?verified=1` } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); emailRef.current?.focus(); return; }
    if (isSignUp) {
      // 이메일 본인인증이 켜져 있으면 세션 없이 확인 메일만 발송됨
      if (!data.session) { setConfirmSent(true); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('user_products').upsert({ user_id: user.id, product: 'lead' }, { onConflict: 'user_id,product' });
    }
    router.push(isSignUp ? '/onboarding' : '/hub');
  };

  const handleReset = async () => {
    if (!email.trim()) { setError(t('이메일을 입력해주세요', 'Enter your email')); emailRef.current?.focus(); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setResetSent(true); setLoading(false);
  };

  // globals.css가 입력을 '밑줄만'으로 강제한다(!important). 여기서 상자 유틸리티를 적어봐야
  // 덮어쓰여 죽은 코드가 되므로, 실제로 살아남는 것만 남긴다 — 세로 여백·글자색·밑선 색.
  const inputCls = 'w-full border-bone-faint py-3 text-sub text-bone placeholder:text-bone-dim';
  // label-mono를 쓰지 않는다 — 자간 0.22em이 "이 메 일"로 흩어진다(globals.css 주석 참고).
  // 모노 라벨은 이 화면에서 라틴인 'by NEN' 한 자리에만 쓴다.
  const labelCls = 'block text-mini uppercase tracking-[0.08em] text-bone-dim mb-2.5';
  const quietBtn = 'text-lead text-bone-dim rounded-lg transition-colors hover:text-bone';

  // 세 제품 — 이름만 있고 설명이 없어서 첫 방문자가 뭘 고르는지 모르던 자리.
  const products = [
    { key: 'lead' as const, label: 'LEAD', desc: t('리드·피칭 관리', 'Leads & pitching') },
    { key: 'cast' as const, label: 'CAST', desc: t('로스터·가능일', 'Roster & availability') },
    { key: 'split' as const, label: 'SPLIT', desc: t('분배·스플릿시트', 'Splits & split sheets') },
  ];

  const Wordmark = () => (
    // 가로 한 줄이던 워드마크를 세로로 쌓았다. 320px에서 53px 잘려나가던 문제의 근본 수정이고,
    // Archivo Black 포스터 방향과도 이쪽이 맞는다.
    // 설명은 제품명 옆에 그냥 붙이면 안 된다 — LEAD/CAST/SPLIT 글자폭이 제각각이라
    // 설명 시작점이 줄마다 어긋나 톱니처럼 보인다. 이름 칸에 하한폭을 줘서 설명을
    // 한 컬럼으로 떨군다. 하한폭 3.25em은 실측값이다 — Archivo Black에서 LEAD 2.85em,
    // CAST 2.90em, SPLIT 3.10em이라 제일 긴 SPLIT에 0.15em 여유만 준 값.
    // 넉넉하게 잡으면(4.6em에서 그랬다) 설명이 멀리 떠서 제품명과 관계가 끊긴다.
    // 좁은 화면에선 하한을 풀어 설명이 아래로 내려간다.
    <ul className="space-y-3">
      {products.map((p) => (
        <li key={p.key} className="flex items-baseline gap-x-6 gap-y-1 flex-wrap">
          <span
            className="font-display text-hero uppercase leading-[0.92] sm:min-w-[3.25em]"
            style={{ color: BRAND[p.key].onDark }}
            translate="no"
          >
            {p.label}
          </span>
          <span className="text-body text-bone-dim">{p.desc}</span>
        </li>
      ))}
    </ul>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} className={`mt-6 ${quietBtn}`}>
      ← {t('로그인으로 돌아가기', 'Back to login')}
    </button>
  );

  return (
    <main className="min-h-screen bg-surface-0 text-bone font-ui safe-x">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-14 px-6 py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-20">

        {/* 좌 — 브랜드 포스터. 세 제품이 각각 뭔지 여기서 읽힌다. */}
        <header className="lg:flex-1">
          <h1 className="sr-only">LEAD · CAST · SPLIT by NEN</h1>
          <p className="mb-10 label-mono text-bone-dim" translate="no">by NEN</p>
          <Wordmark />
          <p className="mt-10 max-w-sm text-body leading-relaxed text-bone-dim">
            {t('하나의 계정으로 세 도구를 씁니다.', 'One account, three tools.')}
          </p>
        </header>

        {/* 우 — 인증 */}
        <section className="w-full lg:w-[420px] lg:shrink-0" aria-label={t('로그인', 'Sign in')}>
          {/* 비동기 상태(에러·성공)는 스크린리더에 알려야 한다 */}
          <div aria-live="polite" className="contents">

          {confirmSent ? (
            <div>
              <div className="text-display mb-4 text-signal"><i className="ti ti-mail" aria-hidden="true"></i></div>
              <p className="font-display text-title mb-2">{t('인증 메일을 보냈어요', 'Confirmation email sent')}</p>
              <p className="text-body leading-relaxed text-bone-dim">
                {email}<br />
                {t('메일 속 링크를 눌러 본인인증을 마치면 로그인할 수 있어요.', 'Click the link in the email to verify, then log in.')}
              </p>
              <BackButton onClick={() => { setConfirmSent(false); setIsSignUp(false); }} />
            </div>
          ) : forgotMode ? (
            resetSent ? (
              <div>
                <div className="text-display mb-4 text-signal"><i className="ti ti-mail" aria-hidden="true"></i></div>
                <p className="font-display text-title mb-2">{t('재설정 메일을 보냈어요', 'Reset email sent')}</p>
                <p className="text-body leading-relaxed text-bone-dim">
                  {t(`${email}로`, 'We sent a reset link to')}<br />
                  {t('비밀번호 재설정 링크를 보냈어요.', email)}
                </p>
                <BackButton onClick={() => { setForgotMode(false); setResetSent(false); }} />
              </div>
            ) : (
              <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); handleReset(); }}>
                <p className="text-lead text-bone-dim">{t('가입한 이메일로 재설정 링크를 보내드려요.', 'We’ll email a reset link to your account.')}</p>
                <div>
                  <label htmlFor="reset-email" className={labelCls}>{t('이메일', 'Email')}</label>
                  <input
                    id="reset-email" name="email" ref={emailRef}
                    type="email" autoComplete="email" inputMode="email" spellCheck={false}
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={t('you@example.com', 'you@example.com')}
                    aria-describedby={error ? 'reset-error' : undefined}
                    className={inputCls}
                  />
                </div>
                {error && <p id="reset-error" role="alert" className="text-lead text-red-400">{error}</p>}
                <button
                  type="submit"
                  className="w-full rounded-full px-5 py-4 text-sub font-semibold transition-colors disabled:opacity-60"
                  style={{ background: BRAND.lead.base, color: BRAND.lead.on }}
                  onMouseEnter={e => (e.currentTarget.style.background = BRAND.lead.hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = BRAND.lead.base)}
                  disabled={loading}
                >
                  {loading ? t('보내는 중…', 'Sending…') : t('재설정 메일 보내기', 'Send Reset Email')}
                </button>
                <button type="button" onClick={() => { setForgotMode(false); setError(''); }} className={quietBtn}>
                  ← {t('돌아가기', 'Back')}
                </button>
              </form>
            )
          ) : (
            <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); handle(); }}>
              {verified && (
                <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-body font-bold text-emerald-300">
                  {t('이메일 인증 완료! 이제 로그인하세요.', 'Email verified — you can log in now.')}
                </p>
              )}

              <div>
                <label htmlFor="email" className={labelCls}>{t('이메일', 'Email')}</label>
                <input
                  id="email" name="email" ref={emailRef}
                  type="email" autoComplete="email" inputMode="email" spellCheck={false}
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t('you@example.com', 'you@example.com')}
                  aria-describedby={error ? 'login-error' : undefined}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="password" className={labelCls}>{t('비밀번호', 'Password')}</label>
                <input
                  id="password" name="password" ref={passwordRef}
                  type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} spellCheck={false}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={t('8자 이상', 'At least 8 characters')}
                  aria-describedby={error ? 'login-error' : undefined}
                  className={inputCls}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                {!isSignUp ? (
                  // 체크박스와 라벨이 한 덩어리 — 죽은 영역 없이 글자를 눌러도 토글된다.
                  <label className="flex cursor-pointer select-none items-center gap-3">
                    <input
                      type="checkbox" name="remember" checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-5 w-5 shrink-0 rounded-lg border-2 border-bone-faint bg-transparent accent-brand-lead"
                    />
                    <span className="text-lead text-bone-dim">{t('아이디 기억하기', 'Remember Me')}</span>
                  </label>
                ) : <span />}
                <button type="button" onClick={() => { setForgotMode(true); setError(''); }} className={quietBtn}>
                  {t('비밀번호 찾기', 'Forgot Password')}
                </button>
              </div>

              {error && <p id="login-error" role="alert" className="text-lead text-red-400">{error}</p>}

              <button
                type="submit"
                className="w-full rounded-full px-5 py-4 text-sub font-semibold transition-colors disabled:opacity-60"
                style={{ background: BRAND.lead.base, color: BRAND.lead.on }}
                onMouseEnter={e => (e.currentTarget.style.background = BRAND.lead.hover)}
                onMouseLeave={e => (e.currentTarget.style.background = BRAND.lead.base)}
                disabled={loading}
              >
                {loading
                  ? (isSignUp ? t('가입하는 중…', 'Signing Up…') : t('로그인하는 중…', 'Logging In…'))
                  : (isSignUp ? t('회원가입', 'Sign Up') : t('로그인', 'Log In'))}
              </button>

              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className={`self-center ${quietBtn}`}>
                {isSignUp
                  ? t('이미 계정이 있으신가요? 로그인', 'Already have an account? Log in')
                  : t('계정이 없으신가요? 회원가입', 'No account? Sign up')}
              </button>
            </form>
          )}

          </div>
        </section>
      </div>
    </main>
  );
}
