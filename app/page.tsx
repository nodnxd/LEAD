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
    setLoading(true); setError('');
    if (rememberMe && email) localStorage.setItem('lead_saved_email', email);
    else localStorage.removeItem('lead_saved_email');
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    // 가입 시 선택한 제품 권한 부여
    if (isSignUp) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from('user_products').upsert({ user_id: user.id, product: product === 'cast' ? 'roster' : 'lead' }, { onConflict: 'user_id,product' });
    }
    if (product === 'cast') { router.push('/roster/dashboard'); return; }
    // LEAD: 가입은 온보딩(프로필 생성), 로그인은 허브(참여/운영 선택)
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; }` }} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}` }} />
      <main className="min-h-screen bg-[#141414] flex items-center justify-center p-5 font-pretendard relative overflow-hidden">
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none transition-colors`} style={{background: isCast ? '#DE6B35' : '#5B8CFF', filter:'blur(200px)', animation:'orb-pulse 4s ease-in-out infinite'}} />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex items-baseline gap-2">
                <h1 className={`text-5xl font-semibold uppercase tracking-tighter transition-colors ${isCast ? 'text-[#DE6B35]' : 'text-[#5B8CFF]'}`}>
                  {isCast ? 'CAST' : 'LEAD'}
                </h1>
                <span className="text-zinc-500 text-[11px] font-normal tracking-[0.2em]">by NEN</span>
              </div>
              {!forgotMode && (
                <div className="flex gap-0.5 p-0.5 bg-white/[0.06] border border-white/10 rounded-full">
                  {(['lead', 'cast'] as const).map(p => (
                    <button key={p} onClick={() => pickProduct(p)}
                      className={`px-3 py-1 rounded-full text-[11px] font-normal transition-all ${product === p
                        ? (p === 'lead' ? 'bg-[#5B8CFF] text-white' : 'bg-[#DE6B35] text-white')
                        : 'text-zinc-500 hover:text-zinc-300'}`}>
                      {p === 'lead' ? 'LEAD' : 'CAST'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-zinc-600 text-[11px]">{isCast ? 'Roster Manager' : 'Pitching Platform'}</p>
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
                    className="w-full py-3 rounded-xl bg-[#5B8CFF] text-white font-semibold text-[13px] hover:opacity-90 transition-all disabled:opacity-50 mb-2">
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
                    <button type="button" onClick={() => setRememberMe(v => !v)} className="flex items-center gap-2 group">
                      <span className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${rememberMe ? 'bg-[#5B8CFF]' : 'bg-white/10 border border-white/15'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${rememberMe ? 'left-[18px]' : 'left-0.5'}`} />
                      </span>
                      <span className={`text-[12px] transition-colors ${rememberMe ? 'text-zinc-300' : 'text-zinc-500'}`}>아이디 기억하기</span>
                    </button>
                  ) : <span />}
                  <button onClick={() => { setForgotMode(true); setError(''); }} className="text-zinc-500 text-[12px] hover:text-[#5B8CFF] transition-colors">비밀번호 찾기</button>
                </div>
                <button onClick={handle} disabled={loading}
                  className={`w-full py-3 rounded-xl text-white font-semibold text-[13px] hover:opacity-90 transition-all disabled:opacity-50 mb-3 ${isCast ? 'bg-[#DE6B35]' : 'bg-[#5B8CFF]'}`}>
                  {loading ? '...' : isSignUp ? '회원가입' : '로그인'}
                </button>
                <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="w-full text-zinc-600 text-[12px] hover:text-zinc-400 transition-colors">
                  {isSignUp ? '이미 계정이 있어요' : '계정이 없어요'}
                </button>
              </>
            )}
          </div>
          <p className="text-center text-zinc-700 text-[11px] mt-5">
            {isCast ? '아티스트 로스터 관리' : '로그인하면 참여·운영할 회사를 선택해요'}
          </p>
        </div>
      </main>
    </>
  );
}
