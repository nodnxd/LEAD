'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLang, LangToggle } from '@/lib/lang';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLang();
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
    if (password.length < 6) { setError(t('비밀번호는 6자 이상이어야 해요', 'Password must be at least 6 characters')); return; }
    if (password !== confirm) { setError(t('비밀번호가 일치하지 않아요', 'Passwords don’t match')); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true); setLoading(false);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `}` }} />
      <main className="min-h-screen bg-[#141414] flex items-center justify-center p-5 font-ui relative overflow-hidden">
        <div className="absolute top-5 right-5 z-20"><LangToggle /></div>
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl text-[#7C5AE8] uppercase tracking-tighter">LEAD</h1>
            <p className="text-zinc-600 text-[12px] mt-1">{t('비밀번호 재설정', 'Reset password')}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl">
            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-white font-black text-[15px] mb-1">{t('변경 완료!', 'Done!')}</p>
                <p className="text-zinc-500 text-[12px] mb-5">{t('새 비밀번호로 로그인할 수 있어요.', 'You can now log in with your new password.')}</p>
                <button onClick={() => router.push('/')} className="w-full py-3 rounded-xl bg-[#7C5AE8] text-white font-semibold text-[13px] hover:opacity-90 transition-all">{t('로그인하러 가기', 'Go to login')}</button>
              </div>
            ) : !ready ? (
              <div className="text-center py-6">
                <div className="w-6 h-6 border-2 border-[#7C5AE8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-zinc-500 text-[12px]">{t('재설정 링크를 확인하는 중...', 'Checking your reset link…')}</p>
                <p className="text-zinc-700 text-[11px] mt-2">{t('메일의 링크로 접속해야 변경할 수 있어요.', 'Open the link from your email to reset.')}</p>
              </div>
            ) : (
              <>
                <p className="text-white font-black text-[15px] mb-1">{t('새 비밀번호', 'New password')}</p>
                <p className="text-zinc-500 text-[12px] mb-4">{t('6자 이상으로 설정해주세요.', 'Use at least 6 characters.')}</p>
                <div className="flex flex-col gap-3 mb-3">
                  <input value={password} onChange={e => setPassword(e.target.value)} placeholder={t('새 비밀번호', 'New password')} type="password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#7C5AE8]/50 transition-all placeholder:text-zinc-600 text-white" />
                  <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder={t('비밀번호 확인', 'Confirm password')} type="password"
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#7C5AE8]/50 transition-all placeholder:text-zinc-600 text-white" />
                </div>
                {error && <p className="text-red-400 text-[12px] mb-3">{error}</p>}
                <button onClick={submit} disabled={loading} className="w-full py-3 rounded-xl bg-[#7C5AE8] text-white font-semibold text-[13px] hover:opacity-90 transition-all disabled:opacity-50">
                  {loading ? '...' : t('비밀번호 변경', 'Change password')}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
