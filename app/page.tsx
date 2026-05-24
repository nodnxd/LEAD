'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !name.trim() || !artistName.trim()) {
      setError('이름, 활동명, 이메일, 비밀번호는 필수예요'); return;
    }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err || !data.user) { setError(err?.message||'오류가 났어요'); setLoading(false); return; }
    // guests 테이블에 프로필 저장
    await supabase.from('guests').insert({
      id: data.user.id, name, email, artist_name: artistName,
      phone: phone||null, status: 'pending',
    });
    setLoading(false); setDone(true);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}`}}/>
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-5 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.08] pointer-events-none"/>
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.04] pointer-events-none"/>

        <div className="w-full max-w-sm relative z-10">
          {/* 로고 */}
          <div className="text-center mb-10">
            <div className="flex items-baseline justify-center gap-2.5 mb-3">
              <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
              <span className="text-zinc-500 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
            </div>
            <p className="text-zinc-600 text-[12px]">
              {mode==='login'?'피칭 플랫폼에 오신 걸 환영해요':'아티스트 계정을 만들어요'}
            </p>
          </div>

          {/* 탭 */}
          <div className="flex bg-white/[0.03] border border-white/10 rounded-2xl p-1 gap-1 mb-5">
            <button onClick={()=>{setMode('login');setError('');}} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${mode==='login'?'bg-white/10 text-white':'text-zinc-600 hover:text-zinc-400'}`}>로그인</button>
            <button onClick={()=>{setMode('register');setError('');}} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${mode==='register'?'bg-white/10 text-white':'text-zinc-600 hover:text-zinc-400'}`}>회원가입</button>
          </div>

          {done ? (
            /* 가입 완료 화면 */
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="text-white font-black text-[18px] mb-2">신청 완료!</h2>
              <p className="text-zinc-400 text-[13px] leading-relaxed mb-1">
                <span className="text-white font-bold">{artistName}</span> 님의 가입 신청이 접수됐어요.
              </p>
              <p className="text-zinc-600 text-[12px] leading-relaxed">
                담당자 승인 후 이용하실 수 있어요.<br/>승인 완료 시 이메일로 안내드릴게요.
              </p>
              <button onClick={()=>{setDone(false);setMode('login');}} className="mt-6 w-full py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">로그인으로 돌아가기</button>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col gap-3">
                {mode==='register'&&(
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1.5 block">이름 *</label>
                        <input value={name} onChange={e=>setName(e.target.value)} placeholder="실명" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                      </div>
                      <div>
                        <label className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1.5 block">활동명 *</label>
                        <input value={artistName} onChange={e=>setArtistName(e.target.value)} placeholder="아티스트명" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1.5 block">전화번호</label>
                      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="010-0000-0000 (선택)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                    </div>
                    <div className="border-t border-white/5 pt-3"/>
                  </>
                )}
                <div>
                  <label className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1.5 block">이메일 *</label>
                  <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="이메일 주소" type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                </div>
                <div>
                  <label className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-1.5 block">비밀번호 *</label>
                  <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="6자 이상" type="password"
                    onKeyDown={e=>e.key==='Enter'&&(mode==='login'?handleLogin():handleRegister())}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                </div>
              </div>

              {error&&(
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-[12px]">{error}</p>
                </div>
              )}

              {mode==='register'&&(
                <div className="mt-4 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-zinc-600 text-[11px] leading-relaxed">가입 신청 후 담당자 승인이 완료되면 이용하실 수 있어요. 승인에는 1–2일 소요될 수 있어요.</p>
                </div>
              )}

              <button onClick={mode==='login'?handleLogin:handleRegister} disabled={loading}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20">
                {loading?'처리 중...':(mode==='login'?'로그인':'가입 신청')}
              </button>
            </div>
          )}

          <p className="text-center text-zinc-700 text-[11px] mt-6">Contact : everplayground@gmail.com</p>
        </div>
      </main>
    </>
  );
}