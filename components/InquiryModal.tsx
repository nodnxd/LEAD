'use client';

// 문의하기 — 운영자 이메일을 화면에 노출하지 않고 앱 안 수신함(public.inquiries)으로 받는다.
// 쓰기는 submit_inquiry RPC로만 (비로그인도 가능). 운영자는 LEAD 대시보드 "운영 수신함"에서 본다.
// 쓰는 쪽: const [inqTopic,setInqTopic]=useState<string|null>(null) → 버튼에서 setInqTopic('일반')
// 모달은 body로 포털 — 페이지의 zoom/transform 안에 있어도 화면에 고정된다.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/lang';

// supabase/2026-09-15-host-approval-inquiries.sql 의 허용 목록과 같게 유지
export const INQUIRY_TOPICS = ['일반', 'LEAD 호스트 신청', 'CAST 호스트 신청'] as const;
const TOPIC_EN: Record<string, string> = { '일반': 'General', 'LEAD 호스트 신청': 'LEAD host access', 'CAST 호스트 신청': 'CAST host access' };
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i; // SQL과 같은 규칙

type Props = { topic: string | null; onClose: () => void; dark?: boolean; brand?: 'lead' | 'cast' };

export default function InquiryModal({ topic, onClose, dark = true, brand = 'lead' }: Props) {
  if (!topic) return null;
  return createPortal(<InquiryForm initialTopic={topic} onClose={onClose} dark={dark} brand={brand} />, document.body);
}

function InquiryForm({ initialTopic, onClose, dark, brand }: { initialTopic: string; onClose: () => void; dark: boolean; brand: 'lead' | 'cast' }) {
  const { t } = useLang();
  const D = dark;
  const [topic, setTopic] = useState(initialTopic);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [trap, setTrap] = useState(''); // 허니팟: 사람은 못 보는 칸
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [err, setErr] = useState('');

  // 로그인했으면 답장 이메일 미리 채우기
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { const e = data.session?.user?.email; if (e) setEmail(v => v || e); });
  }, []);

  const msgLen = message.trim().length;
  const valid = EMAIL_RE.test(email.trim()) && msgLen >= 10 && msgLen <= 2000 && name.trim().length <= 80;

  const submit = async () => {
    if (!valid || state === 'sending') return;
    setErr('');
    if (trap) { setState('done'); return; } // 봇이면 보낸 척만
    setState('sending');
    const { error } = await supabase.rpc('submit_inquiry', {
      p_topic: topic, p_name: name.trim(), p_reply_email: email.trim(), p_message: message.trim(), p_source: window.location.pathname,
    });
    if (error) {
      setState('idle');
      setErr(error.message.includes('rate_limited')
        ? t('짧은 시간에 문의가 많았어요. 10분쯤 뒤에 다시 보내주세요.', 'Too many messages just now — please try again in about 10 minutes.')
        : t('보내지 못했어요. 입력을 확인하고 다시 시도해주세요.', 'Could not send — check your input and try again.'));
      return;
    }
    setState('done');
  };

  const primary = brand === 'cast' ? 'bg-brand-cast text-black' : 'bg-brand-lead text-white';
  const chipOn = brand === 'cast' ? 'bg-brand-cast/20 border-brand-cast/50 text-brand-cast-text' : 'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text';
  const focus = brand === 'cast' ? 'focus:border-brand-cast/50' : 'focus:border-brand-lead/50';
  const inputCls = `w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${focus} ${D ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-700' : 'bg-black/[0.04] border-black/[0.08] text-[#111] placeholder:text-zinc-400'}`;
  const labelCls = `block text-micro font-black uppercase tracking-widest mb-2 ${D ? 'text-zinc-600' : 'text-zinc-400'}`;
  const dimText = 'text-zinc-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md font-ui p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="inquiry-title" tabIndex={-1} className={`anim-rise w-full max-w-lg border rounded-t-[2rem] sm:rounded-xl shadow-lg max-h-[90vh] flex flex-col ${D ? 'bg-surface-2 border-[rgba(255,255,255,0.08)]' : 'bg-white border-black/[0.08]'}`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-center justify-between p-5 border-b ${D ? 'border-white/10' : 'border-black/[0.08]'}`}>
          <div>
            <h2 id="inquiry-title" className={`font-black text-sub ${D ? 'text-white' : 'text-[#111]'}`}><i className="ti ti-message-circle" aria-hidden="true"></i> {t('문의하기', 'Contact us')}</h2>
            <p className={`text-mini mt-0.5 ${dimText}`}>{t('운영자에게 바로 전달돼요. 답장은 적어주신 이메일로 보내드려요.', 'Goes straight to the team. We reply to the email you enter.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('닫기', 'Close')} className={`w-8 h-8 rounded-full border flex items-center justify-center text-body ${D ? 'bg-white/5 border-white/10 text-zinc-500' : 'bg-black/[0.04] border-black/[0.08] text-zinc-500'}`}>✕</button>
        </div>

        {state === 'done' ? (
          <div className="p-8 text-center">
            <div className="text-display mb-3 text-emerald-400"><i className="ti ti-circle-check" aria-hidden="true"></i></div>
            <p className={`font-black text-sub mb-1 ${D ? 'text-white' : 'text-[#111]'}`}>{t('문의를 보냈어요', 'Message sent')}</p>
            <p className={`text-body ${dimText}`}>{t('확인하고 적어주신 이메일로 답장드릴게요.', 'We will reply to your email.')}</p>
            <button type="button" onClick={onClose} className={`mt-6 px-5 py-2.5 rounded-full font-semibold text-body hover:opacity-90 transition ${primary}`}>{t('닫기', 'Close')}</button>
          </div>
        ) : (
          <form className="overflow-y-auto p-5 flex flex-col gap-4 relative" onSubmit={e => { e.preventDefault(); submit(); }}>
            <div>
              <span className={labelCls}>{t('주제', 'Topic')}</span>
              <div className="flex flex-wrap gap-1.5">
                {INQUIRY_TOPICS.map(tp => (
                  <button key={tp} type="button" onClick={() => setTopic(tp)} aria-pressed={topic === tp}
                    className={`px-3 py-1.5 rounded-full text-mini font-bold border transition ${topic === tp ? chipOn : D ? 'bg-white/5 border-white/10 text-zinc-500 hover:text-white' : 'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
                    {t(tp, TOPIC_EN[tp])}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span className={labelCls}>{t('이름 (선택)', 'Name (optional)')}</span>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>{t('답장 받을 이메일', 'Reply email')}</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="you@example.com" className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>{t('내용', 'Message')}</span>
              <textarea required value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={6} placeholder={t('10자 이상 적어주세요', 'At least 10 characters')} className={`${inputCls} resize-none`} />
              <span className={`block text-right text-micro mt-1 ${msgLen > 0 && msgLen < 10 ? 'text-red-400' : dimText}`}>{msgLen}/2000</span>
            </label>
            {/* 허니팟 — 화면·스크린리더에서 숨김 */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={e => setTrap(e.target.value)} className="absolute -left-[9999px] w-px h-px opacity-0" />
            {err && <p className="text-red-400 text-mini" role="alert">{err}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className={`px-4 py-2 rounded-full text-body font-bold ${dimText} hover:opacity-80`}>{t('취소', 'Cancel')}</button>
              <button type="submit" disabled={!valid || state === 'sending'} className={`px-4 py-2 rounded-full font-semibold text-body disabled:opacity-40 ${primary}`}>{state === 'sending' ? '…' : t('보내기', 'Send')}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
