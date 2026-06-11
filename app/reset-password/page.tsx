'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // 재설정 링크로 들어오면 Supabase가 복구 세션을 만들어줌
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요'); return; }
    if (password !== confirm) { setError('비밀번호가 일치하지 않아요'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true); setLoading(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; } @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}` }} />
      <main className="min-h-screen bg-[#141414] flex items-center justify-center p-5 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{background:'#368B78',filter:'blur(200px)',animation:'orb-pulse 4s ease-in-out infinite'}} />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-[#368B78] uppercase tracking-tighter">LEAD</h1>
            <p className="text-zinc-600 text-[12px] mt-1">비밀번호 재설정</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-white font-black text-[15px] mb-1">변경 완료!</p>
                <p className="text-zinc-500 text-[12px] mb-5">새 비밀번호로 로그인할 수 있어요.</p>
                <button onClick={() => router.push('/')} className="w-full py-3 rounded-xl bg-[#368B78] text-white font-semibold text-[13px] hover:opacity-90 transition-all">로그인하러 가기</button>
              </div>
            ) : !ready ? (
              <div className="text-center py-6">
                <div className="w-6 h-6 border-2 border-[#368B78] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-zinc-500 text-[12px]">재설정 링크를 확인하는 중...</p>
                <p className="text-zinc-700 text-[11px] mt-2">메일의 링크로 접속해야 변경할 수 있어요.</p>
              </div>
            ) : (
              <>
                <p className="text-white font-black text-[15px] mb-1">새 비밀번호</p>
                <p className="text-zinc-500 text-[12px] mb-4">6자 이상으로 설정해주세요.</p>
                <div className="flex flex-col gap-3 mb-3">
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder="새 비밀번호" type="password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#368B78]/50 transition-all placeholder:text-zinc-600 text-white" />
                  <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="비밀번호 확인" type="password"
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#368B78]/50 transition-all placeholder:text-zinc-600 text-white" />
                </div>
                {error && <p className="text-red-400 text-[12px] mb-3">{error}</p>}
                <button onClick={submit} disabled={loading} className="w-full py-3 rounded-xl bg-[#368B78] text-white font-semibold text-[13px] hover:opacity-90 transition-all disabled:opacity-50">
                  {loading ? '...' : '비밀번호 변경'}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
