'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Mode = 'login' | 'register' | 'find-id' | 'find-pw';

function GuestAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const hostId = searchParams.get('hostId') || '';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // 아이디 찾기
  const [findName, setFindName] = useState('');
  const [findPhone, setFindPhone] = useState('');
  const [foundEmail, setFoundEmail] = useState('');

  // 비밀번호 찾기
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m); setError(''); setFoundEmail(''); setResetSent(false);
  };

  // ─── 로그인 ───────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('이메일과 비밀번호를 입력해주세요'); return; }
    setLoading(true); setError('');

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }

    if (hostId) {
      const { data: approval } = await supabase
        .from('guest_approvals')
        .select('status')
        .eq('guest_id', data.user.id)
        .eq('host_id', hostId)
        .single();

      if (!approval) {
        await supabase.from('guest_approvals').insert({
          guest_id: data.user.id, host_id: hostId, status: 'pending',
        });
        await supabase.auth.signOut();
        setError('이 페이지 접근 승인을 요청했어요. 담당자 승인 후 이용 가능해요.');
        setLoading(false); return;
      }
      if (approval.status === 'pending') {
        await supabase.auth.signOut();
        setError('아직 승인 대기 중이에요. 담당자 승인 후 이용 가능해요.');
        setLoading(false); return;
      }
      if (approval.status === 'rejected') {
        await supabase.auth.signOut();
        setError('접근이 거절됐어요. 문의사항은 everplayground@gmail.com으로 연락해주세요.');
        setLoading(false); return;
      }
    }
    router.push(redirect);
  };

  // ─── 회원가입 ─────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim() || !artistName.trim()) {
      setError('이름, 활동명, 이메일, 비밀번호는 필수예요'); return;
    }
    if (password !== confirmPassword) { setError('비밀번호가 일치하지 않아요'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요'); return; }

    setLoading(true); setError('');

    // signUp — 이메일 인증 ON이어도 data.user는 반환됨
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err || !data.user) {
      setError(err?.message || '회원가입 중 오류가 났어요');
      setLoading(false); return;
    }

    const userId = data.user.id;

    // guests 프로필 저장 (anyone insert 정책 적용 상태 — anon 키로도 동작)
    const { error: guestErr } = await supabase.from('guests').upsert({
      id: userId, name, email, artist_name: artistName, phone: phone || null,
    });
    if (guestErr) console.error('[guests upsert]', guestErr.code, guestErr.message);

    // 승인 요청 생성
    if (hostId) {
      const { error: approvalErr } = await supabase.from('guest_approvals').upsert({
        guest_id: userId, host_id: hostId, status: 'pending',
      });
      if (approvalErr) console.error('[guest_approvals upsert]', approvalErr.code, approvalErr.message);
    }

    await supabase.auth.signOut();
    setLoading(false); setDone(true);
  };

  // ─── 아이디 찾기 ──────────────────────────────────────────────────────────
  const handleFindId = async () => {
    if (!findName.trim() || !findPhone.trim()) { setError('이름과 전화번호를 입력해주세요'); return; }
    setLoading(true); setError(''); setFoundEmail('');

    const { data, error: err } = await supabase.rpc('find_guest_email', {
      p_name: findName.trim(), p_phone: findPhone.trim(),
    });

    if (err || !data) { setError('일치하는 계정을 찾을 수 없어요'); }
    else { setFoundEmail(data as string); }
    setLoading(false);
  };

  // ─── 비밀번호 찾기 ────────────────────────────────────────────────────────
  const handleFindPw = async () => {
    if (!resetEmail.trim()) { setError('이메일을 입력해주세요'); return; }
    setLoading(true); setError('');

    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/guest/reset-password`,
    });

    if (err) { setError(err.message); } else { setResetSent(true); }
    setLoading(false);
  };

  // ─── 공통 인풋 스타일 ────────────────────────────────────────────────────
  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white';
  const labelCls = 'text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1.5 block';
  const btnPrimary = 'w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20';
  const btnBack = 'w-full mt-3 py-2.5 text-zinc-600 text-[12px] font-bold hover:text-zinc-400 transition-all';

  const subtitleMap: Record<Mode, string> = {
    'login': '계정으로 로그인하세요',
    'register': '아티스트 계정을 만들어요',
    'find-id': '아이디(이메일) 찾기',
    'find-pw': '비밀번호 재설정',
  };

  return (
    <div className="w-full max-w-sm relative z-10">
      {/* ── 헤더 ── */}
      <div className="text-center mb-8">
        <div className="flex items-baseline justify-center gap-2.5 mb-3">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
          <span className="text-zinc-500 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
        </div>
        <p className="text-zinc-600 text-[12px]">
          {done ? '신청 완료' : subtitleMap[mode]}
        </p>
      </div>

      {/* ── 가입 완료 ── */}
      {done && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-5">✉️</div>
          <h2 className="text-white font-black text-[20px] mb-3">신청 완료!</h2>
          <p className="text-zinc-400 text-[13px] leading-relaxed">
            <span className="text-white font-bold">{artistName}</span> 님의 가입 신청이 접수됐어요.
          </p>
          <p className="text-zinc-600 text-[12px] leading-relaxed mt-2">담당자 승인 후 이용하실 수 있어요.</p>
          <button onClick={() => { setDone(false); switchMode('login'); }}
            className="mt-6 w-full py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">
            로그인으로 돌아가기
          </button>
        </div>
      )}

      {/* ── 아이디 찾기 ── */}
      {!done && mode === 'find-id' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
          {foundEmail ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <p className="text-zinc-500 text-[12px] mb-2">가입된 이메일 주소</p>
              <p className="text-white font-black text-[17px] mb-6 tracking-wide">{foundEmail}</p>
              <button onClick={() => switchMode('login')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">
                로그인하기
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>이름 *</label>
                  <input value={findName} onChange={e => setFindName(e.target.value)}
                    placeholder="가입 시 입력한 실명" className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>전화번호 *</label>
                  <input value={findPhone} onChange={e => setFindPhone(e.target.value)}
                    placeholder="가입 시 입력한 전화번호"
                    onKeyDown={e => e.key === 'Enter' && handleFindId()}
                    className={inputCls}/>
                </div>
              </div>
              {error && <ErrorBox msg={error}/>}
              <button onClick={handleFindId} disabled={loading} className={btnPrimary}>
                {loading ? '확인 중...' : '아이디 찾기'}
              </button>
            </>
          )}
          <button onClick={() => switchMode('login')} className={btnBack}>← 로그인으로</button>
        </div>
      )}

      {/* ── 비밀번호 찾기 ── */}
      {!done && mode === 'find-pw' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
          {resetSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📩</div>
              <p className="text-white font-black text-[16px] mb-2">이메일을 확인해주세요</p>
              <p className="text-zinc-500 text-[12px] leading-relaxed mb-6">
                <span className="text-zinc-300">{resetEmail}</span>으로<br/>비밀번호 재설정 링크를 보냈어요.
              </p>
              <button onClick={() => switchMode('login')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">
                로그인으로 돌아가기
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>가입한 이메일 *</label>
                <input value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  placeholder="이메일 주소" type="email"
                  onKeyDown={e => e.key === 'Enter' && handleFindPw()}
                  className={inputCls}/>
              </div>
              {error && <ErrorBox msg={error}/>}
              <button onClick={handleFindPw} disabled={loading} className={btnPrimary}>
                {loading ? '전송 중...' : '재설정 이메일 보내기'}
              </button>
              <button onClick={() => switchMode('login')} className={btnBack}>← 로그인으로</button>
            </>
          )}
        </div>
      )}

      {/* ── 로그인 / 회원가입 ── */}
      {!done && (mode === 'login' || mode === 'register') && (
        <>
          <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1 gap-1 mb-5">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${mode === m ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col gap-3">

              {/* 회원가입 전용 필드 */}
              {mode === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>이름 *</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="실명"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                    </div>
                    <div>
                      <label className={labelCls}>활동명 *</label>
                      <input value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="아티스트명"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>전화번호 <span className="text-zinc-700 font-normal normal-case">(선택)</span></label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000"
                      className={inputCls}/>
                  </div>
                  <div className="border-t border-white/5"/>
                </>
              )}

              {/* 공통 필드 */}
              <div>
                <label className={labelCls}>이메일 *</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="이메일 주소" type="email" className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>비밀번호 *</label>
                <input value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '6자 이상' : '비밀번호'} type="password"
                  onKeyDown={e => e.key === 'Enter' && mode === 'login' && handleLogin()}
                  className={inputCls}/>
              </div>

              {/* 비밀번호 확인 (회원가입만) */}
              {mode === 'register' && (
                <div>
                  <label className={labelCls}>비밀번호 확인 *</label>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 재입력" type="password"
                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all placeholder:text-zinc-700 text-white ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-red-500/50 focus:border-red-500/70'
                        : 'border-white/10 focus:border-[#5B8CFF]/50'
                    }`}/>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-red-400 text-[11px] mt-1 ml-1">비밀번호가 일치하지 않아요</p>
                  )}
                </div>
              )}
            </div>

            {error && <ErrorBox msg={error}/>}

            {mode === 'register' && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-zinc-600 text-[11px] leading-relaxed">
                  가입 신청 후 담당자 승인이 완료되면 이용하실 수 있어요.
                </p>
              </div>
            )}

            <button onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}
              className={btnPrimary}>
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입 신청'}
            </button>

            {/* 아이디/비밀번호 찾기 링크 (로그인 탭만) */}
            {mode === 'login' && (
              <div className="flex justify-center gap-4 mt-4">
                <button onClick={() => switchMode('find-id')}
                  className="text-zinc-600 text-[11px] font-bold hover:text-zinc-400 transition-all">
                  아이디 찾기
                </button>
                <span className="text-zinc-700 text-[11px]">|</span>
                <button onClick={() => switchMode('find-pw')}
                  className="text-zinc-600 text-[11px] font-bold hover:text-zinc-400 transition-all">
                  비밀번호 찾기
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-center text-zinc-700 text-[11px] mt-6">Contact : everplayground@gmail.com</p>
    </div>
  );
}

// ── 에러 박스 컴포넌트 ───────────────────────────────────────────────────────
function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
      <p className="text-red-400 text-[12px]">{msg}</p>
    </div>
  );
}

export default function GuestAuthPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}` }}/>
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-5 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.08] pointer-events-none"/>
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.03] pointer-events-none"/>
        <Suspense fallback={<div className="text-zinc-600 text-[11px] font-black tracking-widest">Loading...</div>}>
          <GuestAuthContent />
        </Suspense>
      </main>
    </>
  );
}