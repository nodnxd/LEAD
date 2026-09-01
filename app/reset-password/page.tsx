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
      <main className="min-h-screen bg-surface-1 flex items-center justify-center p-5 font-ui relative overflow-hidden">
        <div className="absolute top-5 right-5 z-20"><LangToggle /></div>
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <h1 className="font-display text-display text-brand-lead-text uppercase tracking-tighter">LEAD</h1>
            <p className="text-zinc-600 text-mini mt-1">{t('비밀번호 재설정', 'Reset password')}</p>
          </div>
          <div className="/[0.03] border border-white/10 rounded-xl p-6 shadow-lg">
            {done ? (
              <div className="text-center py-4">
                <div className="text-display mb-3 text-emerald-400"><i className="ti ti-circle-check" aria-hidden="true"></i></div>
                <p className="text-white font-black text-body mb-1">{t('변경 완료!', 'Done!')}</p>
                <p className="text-zinc-500 text-mini mb-5">{t('새 비밀번호로 로그인할 수 있어요.', 'You can now log in with your new password.')}</p>
                <button onClick={() => router.push('/')} className="w-full py-3 rounded-full bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition">{t('로그인하러 가기', 'Go to login')}</button>
              </div>
            ) : !ready ? (
              <div className="text-center py-6">
                <div className="w-6 h-6 border-2 border-brand-lead border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-zinc-500 text-mini">{t('재설정 링크를 확인하는 중...', 'Checking your reset link…')}</p>
                <p className="text-zinc-700 text-mini mt-2">{t('메일의 링크로 접속해야 변경할 수 있어요.', 'Open the link from your email to reset.')}</p>
              </div>
            ) : (
              <>
                <p className="text-white font-black text-body mb-1">{t('새 비밀번호', 'New password')}</p>
                <p className="text-zinc-500 text-mini mb-4">{t('6자 이상으로 설정해주세요.', 'Use at least 6 characters.')}</p>
                <div className="flex flex-col gap-3 mb-3">
                  <input value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" name="new-password" placeholder={t('새 비밀번호', 'New password')} type="password"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body outline-none focus:border-brand-lead/50 transition placeholder:text-zinc-600 text-white" />
                  <input value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" name="confirm-password" placeholder={t('비밀번호 확인', 'Confirm password')} type="password"
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body outline-none focus:border-brand-lead/50 transition placeholder:text-zinc-600 text-white" />
                </div>
                {error && <p className="text-red-400 text-mini mb-3">{error}</p>}
                <button onClick={submit} disabled={loading} className="w-full py-3 rounded-full bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition disabled:opacity-50">
                  {loading ? '…' : t('비밀번호 변경', 'Change password')}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
