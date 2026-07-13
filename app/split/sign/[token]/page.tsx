'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { SplitSheet, Contributor, CATEGORIES, PRO_LABEL, categoryTotal } from '@/lib/splitsheet';
import { useLang, LangToggle } from '@/lib/lang';

type Payload = { sheet: SplitSheet; me: Contributor; contributors: Contributor[] };

export default function SignByTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t, lang } = useLang();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  async function load() {
    const { data: res } = await supabase.rpc('split_get_by_token', { p_token: token });
    const p = res as Payload | null;
    setData(p);
    if (p?.me) { setName(p.me.legal_name ?? ''); setDone(!!p.me.signed); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [token]); // eslint-disable-line

  async function agreementHash(p: Payload): Promise<string> {
    const snap = JSON.stringify({
      song: { t: p.sheet.song_title, a: p.sheet.artist_name, iswc: p.sheet.iswc, audio: p.sheet.audio_name },
      rows: p.contributors.map((r) => ({ c: r.category, s: Number(r.share) || 0, n: r.legal_name })),
    });
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snap));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) { drawing.current = true; const ctx = canvasRef.current!.getContext('2d')!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); (e.target as Element).setPointerCapture(e.pointerId); }
  function move(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const ctx = canvasRef.current!.getContext('2d')!; const p = pos(e); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'; ctx.lineTo(p.x, p.y); ctx.stroke(); dirty.current = true; }
  function up() { drawing.current = false; }
  function clear() { const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); dirty.current = false; }

  async function submit() {
    if (!data || !name.trim() || !agree) return;
    setSigning(true);
    const hash = await agreementHash(data);
    const dataUrl = dirty.current ? canvasRef.current!.toDataURL('image/png') : '';
    const { data: ok } = await supabase.rpc('split_sign_by_token', { p_token: token, p_name: name.trim(), p_data: dataUrl, p_hash: hash });
    setSigning(false);
    if (ok) { setDone(true); load(); }
  }

  const field = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#3E78DB]';

  if (loading) return <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center text-white/40">…</div>;
  if (!data) return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center gap-2 text-white px-6 text-center">
      <p className="text-white/70">{t('유효하지 않은 서명 링크예요.', 'This signing link is invalid.')}</p>
    </div>
  );

  const { sheet, me } = data;
  const locked = !!sheet.locked;
  const catLabel = (k: string) => { const c = CATEGORIES.find((x) => x.key === k); return c ? (lang === 'en' ? c.en : c.label) : ''; };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-lg font-bold">Split Sheet · {t('서명', 'Sign')}</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/45">v{sheet.version ?? 1}</span>
          <div className="ml-auto"><LangToggle /></div>
        </div>

        {/* song summary */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-5">
          <p className="text-[18px] font-bold">{sheet.song_title || t('(제목 없음)', '(Untitled)')}</p>
          <p className="text-sm text-white/45">{sheet.artist_name || t('아티스트 미정', 'Artist TBD')}{sheet.iswc ? ` · ISWC ${sheet.iswc}` : ''}{sheet.audio_name ? ` · ♪ ${sheet.audio_name}` : ''}</p>
        </div>

        {/* splits by category */}
        <div className="flex flex-col gap-4 mb-6">
          {CATEGORIES.map((cat) => {
            const rows = data.contributors.filter((r) => r.category === cat.key);
            if (rows.length === 0) return null;
            const total = categoryTotal(data.contributors, cat.key);
            return (
              <div key={cat.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold">{catLabel(cat.key)}</h3>
                  <span className={`text-xs ${total === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{t('합계', 'Total')} {total}%</span>
                </div>
                {rows.map((r) => (
                  <div key={r.id} className={`flex items-center gap-2 py-1.5 text-sm ${r.id === me.id ? 'text-white' : 'text-white/55'}`}>
                    <span className="font-medium">{r.legal_name || r.stage_name || '—'}</span>
                    {r.id === me.id && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#3E78DB]/40 text-[#6fa0f0]">{t('나', 'You')}</span>}
                    {r.pro && <span className="text-white/35 text-xs">{PRO_LABEL[r.pro] ?? r.pro}</span>}
                    <span className="ml-auto tabular-nums">{Number(r.share) || 0}%</span>
                    {r.signed && <span className="text-emerald-400 text-xs">✓</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* sign box */}
        {done ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-center">
            <p className="text-emerald-400 font-bold mb-1">✓ {t('서명 완료', 'Signed')}</p>
            <p className="text-white/45 text-sm">{t('참여해주셔서 감사합니다. 이 창은 닫아도 돼요.', 'Thanks — you can close this window.')}</p>
          </div>
        ) : locked ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center text-white/50 text-sm">
            {t('이미 확정된 문서라 서명할 수 없어요.', 'This document is finalized and can no longer be signed.')}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm mb-1">{catLabel(me.category ?? '')} · <b>{Number(me.share) || 0}%</b></p>
            <p className="text-xs text-white/45 mb-4">{t('위 지분에 동의하고 서명해주세요.', 'Sign to agree to your split above.')}</p>
            <label className="block text-[11px] text-white/40 mb-1">{t('서명자 법적 이름', 'Signer legal name')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('이름', 'Name')} className={`${field} mb-3`} />
            <label className="block text-[11px] text-white/40 mb-1">{t('서명 (손으로 그리기 · 선택)', 'Signature (draw · optional)')}</label>
            <div className="rounded-lg bg-white overflow-hidden mb-1">
              <canvas ref={canvasRef} width={520} height={150} className="w-full touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
            </div>
            <button onClick={clear} className="text-[11px] text-white/40 hover:text-white mb-3">{t('지우기', 'Clear')}</button>
            <label className="flex items-start gap-2 text-xs text-white/70 mb-4">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
              <span>{t('위 지분이 정확하며 이에 동의함을 확인합니다. 서명 시각·문서 해시(SHA-256)가 함께 기록됩니다.', 'I confirm the split above is accurate and I agree. The time and a document hash (SHA-256) are recorded.')}</span>
            </label>
            <button onClick={submit} disabled={!name.trim() || !agree || signing}
              className="w-full text-sm px-4 py-3 rounded-xl bg-[#3E78DB] hover:bg-[#4d86e8] disabled:opacity-40 font-medium transition-colors">
              {signing ? '…' : t('서명 완료', 'Sign')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
