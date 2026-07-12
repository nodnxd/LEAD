'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SplitSheet, Contributor, CATEGORIES, ShareKey, PRO_GROUPS, PRO_LABEL, shareTotal } from '@/lib/splitsheet';

function ProSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#3E78DB] disabled:opacity-60">
      <option value="">PRO…</option>
      {PRO_GROUPS.map((g) => (
        <optgroup key={g.region} label={g.region}>
          {g.items.map((i) => <option key={i.code} value={i.code}>{i.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export default function SplitEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<SplitSheet | null>(null);
  const [rows, setRows] = useState<Contributor[]>([]);
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [audioUrl, setAudioUrl] = useState('');       // signed playback URL
  const [audioUploading, setAudioUploading] = useState(false);

  const isOwner = !!me && sheet?.owner_id === me;

  async function signAudio(path: string | null) {
    if (!path) { setAudioUrl(''); return; }
    const { data } = await supabase.storage.from('member-demos').createSignedUrl(path, 3600);
    setAudioUrl(data?.signedUrl ?? '');
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      setMe(user.id);
      const { data: s } = await supabase.from('split_sheets').select('*').eq('id', id).maybeSingle();
      if (!s) { router.push('/split'); return; }
      setSheet(s as SplitSheet);
      signAudio((s as SplitSheet).audio_path);
      const { data: c } = await supabase.from('split_contributors').select('*').eq('sheet_id', id).order('order_index', { ascending: true });
      setRows((c as Contributor[]) ?? []);
      setLoading(false);
    })();
  }, [id, router]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 1800); }

  // ── sheet header ──
  function setSheetLocal<K extends keyof SplitSheet>(k: K, v: SplitSheet[K]) { setSheet((s) => s ? { ...s, [k]: v } : s); }
  async function commitSheet<K extends keyof SplitSheet>(k: K) {
    if (!sheet || !isOwner) return;
    await supabase.from('split_sheets').update({ [k]: sheet[k], updated_at: new Date().toISOString() }).eq('id', sheet.id);
  }

  async function uploadAudio(file: File | undefined) {
    if (!file || !sheet || !isOwner) return;
    setAudioUploading(true);
    const ext = (file.name.split('.').pop() || 'mp3').toLowerCase();
    const path = `split/${sheet.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('member-demos').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (!error) {
      await supabase.from('split_sheets').update({ audio_path: path, audio_name: file.name, updated_at: new Date().toISOString() }).eq('id', sheet.id);
      setSheet((s) => s ? { ...s, audio_path: path, audio_name: file.name } : s);
      await signAudio(path);
    } else flash('음원 업로드 실패');
    setAudioUploading(false);
  }

  async function removeAudio() {
    if (!sheet || !isOwner) return;
    if (sheet.audio_path) await supabase.storage.from('member-demos').remove([sheet.audio_path]);
    await supabase.from('split_sheets').update({ audio_path: null, audio_name: null }).eq('id', sheet.id);
    setSheet((s) => s ? { ...s, audio_path: null, audio_name: null } : s);
    setAudioUrl('');
  }

  // ── contributors ──
  async function addRow(base: Partial<Contributor>, userId: string | null, email: string) {
    setAdding(true);
    const { data, error } = await supabase.from('split_contributors')
      .insert({ sheet_id: id, user_id: userId, email, order_index: rows.length, ...base })
      .select('*').single();
    setAdding(false);
    if (!error && data) { setRows((r) => [...r, data as Contributor]); setAddEmail(''); }
    else flash('추가 실패');
  }

  async function addByEmail() {
    const email = addEmail.trim();
    if (!email || !isOwner) return;
    const { data: m } = await supabase.from('members').select('id').eq('email', email).maybeSingle();
    let userId: string | null = null;
    const base: Partial<Contributor> = {};
    if (m?.id) {
      userId = m.id;
      const { data: cp } = await supabase.from('copyright_profiles').select('*').eq('id', m.id).maybeSingle();
      if (cp) {
        Object.assign(base, {
          legal_name: cp.legal_name, stage_name: cp.stage_name, pro: cp.pro, ipi: cp.ipi,
          publisher_name: cp.publisher_name, publisher_pro: cp.publisher_pro, publisher_ipi: cp.publisher_ipi,
          email: cp.email, phone: cp.phone, address: cp.address,
        });
        flash('저장된 저작권 프로필로 자동채움됨');
      } else flash('계정은 찾았지만 저작권 프로필 미설정 — 직접 입력하세요');
    } else flash('해당 이메일 계정 없음 — 빈 행으로 추가');
    await addRow(base, userId, base.email as string ?? email);
  }

  function setRowLocal(rid: string, patch: Partial<Contributor>) {
    setRows((rs) => rs.map((r) => r.id === rid ? { ...r, ...patch } : r));
  }
  async function commitRow(rid: string, patch: Partial<Contributor>) {
    setRowLocal(rid, patch);
    await supabase.from('split_contributors').update(patch).eq('id', rid);
  }
  async function deleteRow(rid: string) {
    setRows((rs) => rs.filter((r) => r.id !== rid));
    await supabase.from('split_contributors').delete().eq('id', rid);
  }
  async function toggleSign(row: Contributor) {
    const next = !row.signed;
    setRowLocal(row.id, { signed: next, signed_at: next ? new Date().toISOString() : null });
    await supabase.from('split_contributors').update({ signed: next, signed_at: next ? new Date().toISOString() : null }).eq('id', row.id);
  }

  // ── print / PDF ──
  function exportPdf() {
    if (!sheet) return;
    const esc = (t: string | null | undefined) => (t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
    const proTxt = (c: string | null) => c ? (PRO_LABEL[c] ?? c) : '—';
    const info = (label: string, val: string | null | undefined) => `<div class="kv"><span>${label}</span><b>${esc(val) || '—'}</b></div>`;
    const rowHtml = rows.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><b>${esc(r.legal_name) || '—'}</b>${r.stage_name ? `<br><span class="sub">${esc(r.stage_name)}</span>` : ''}</td>
        <td class="num">${Number(r.lyrics_share) || 0}%</td>
        <td class="num">${Number(r.composition_share) || 0}%</td>
        <td class="num">${Number(r.arrangement_share) || 0}%</td>
        <td>${esc(proTxt(r.pro))}${r.ipi ? `<br><span class="sub">IPI ${esc(r.ipi)}</span>` : ''}</td>
        <td>${esc(r.publisher_name) || '—'}${r.publisher_pro ? `<br><span class="sub">${esc(proTxt(r.publisher_pro))}${r.publisher_ipi ? ` · IPI ${esc(r.publisher_ipi)}` : ''}</span>` : ''}</td>
        <td>${esc(r.email) || '—'}${r.phone ? `<br><span class="sub">${esc(r.phone)}</span>` : ''}</td>
        <td class="sign">${r.signed ? '✓ signed' : ''}</td>
      </tr>`).join('');
    const totals = CATEGORIES.map((c) => shareTotal(rows, c.key)).map((t) => `<td class="num ${t === 100 ? '' : 'bad'}">${t}%</td>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Split Sheet — ${esc(sheet.song_title) || 'untitled'}</title>
    <style>
      @page { margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, 'Helvetica Neue', 'Apple SD Gothic Neo', sans-serif; color: #111; margin: 0; }
      h1 { font-size: 22px; letter-spacing: .04em; margin: 0 0 2px; }
      .muted { color: #888; font-size: 11px; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 24px; margin-bottom: 18px; }
      .kv { font-size: 12px; display: flex; gap: 6px; border-bottom: 1px solid #eee; padding: 3px 0; }
      .kv span { color: #999; min-width: 78px; } .kv b { font-weight: 600; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px 7px; text-align: left; vertical-align: top; }
      th { background: #f4f4f4; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
      td.num, th.num { text-align: center; white-space: nowrap; }
      .sub { color: #999; font-size: 9.5px; }
      tr.tot td { background: #fafafa; font-weight: 700; }
      td.bad { color: #c0392b; }
      .foot { margin-top: 18px; font-size: 10px; color: #999; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>
      <h1>SPLIT SHEET</h1>
      <div class="muted">저작권 지분 확인서 · Songwriter Split Sheet</div>
      <div class="grid">
        ${info('Title', sheet.song_title)} ${info('AKA', sheet.aka)} ${info('Artist', sheet.artist_name)}
        ${info('Album', sheet.album)} ${info('Duration', sheet.duration)} ${info('Date', sheet.work_date)}
        ${info('ISWC', sheet.iswc)} ${info('ISRC', sheet.isrc)} ${info('Sample?', sheet.contains_sample ? `Yes${sheet.sample_note ? ' — ' + sheet.sample_note : ''}` : 'No')}
        ${info('Audio', sheet.audio_name)}
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Writer (legal / stage)</th>
          <th class="num">작사<br>Lyrics</th><th class="num">작곡<br>Comp.</th><th class="num">편곡<br>Arr.</th>
          <th>Society / IPI</th><th>Publisher</th><th>Contact</th><th>Sign</th>
        </tr></thead>
        <tbody>
          ${rowHtml}
          <tr class="tot"><td colspan="2">TOTAL</td>${totals}<td colspan="4"></td></tr>
        </tbody>
      </table>
      ${sheet.notes ? `<div class="foot"><b>Notes:</b> ${esc(sheet.notes)}</div>` : ''}
      <div class="foot">By signing, each writer confirms the ownership splits above are accurate and agreed. Generated by CAST · ${new Date().toISOString().slice(0, 10)}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
    </body></html>`;
    const w = window.open('', '_blank');
    if (!w) { flash('팝업 차단 해제 필요'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }

  const field = 'w-full rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#3E78DB]';
  const hfield = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#3E78DB]';

  if (loading || !sheet) return <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center text-white/40">…</div>;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#3E78DB] text-sm shadow-lg">{toast}</div>}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* header bar */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/split')} className="text-sm text-white/40 hover:text-white transition-colors">← 목록</button>
          <h1 className="text-lg font-bold truncate">{sheet.song_title || '새 스플릿시트'}</h1>
          {!isOwner && <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/50">참여 (읽기·본인 행)</span>}
          <button onClick={exportPdf} className="ml-auto text-sm px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5 transition-colors">⎙ PDF / 인쇄</button>
        </div>

        {/* song header fields */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-6">
          <div className="text-[11px] uppercase tracking-widest text-white/30 mb-3">곡 정보</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              ['song_title', '곡 제목'], ['aka', 'AKA (부제)'], ['artist_name', '아티스트'],
              ['album', '앨범'], ['duration', '길이 (mm:ss)'], ['work_date', '작성일 (YYYY-MM-DD)'],
              ['iswc', 'ISWC (작품 표준코드)'], ['isrc', 'ISRC (음원코드)'],
            ] as [keyof SplitSheet, string][]).map(([k, label]) => (
              <div key={k}>
                <label className="block text-[11px] text-white/40 mb-1">{label}</label>
                <input value={(sheet[k] as string) ?? ''} disabled={!isOwner}
                  onChange={(e) => setSheetLocal(k, e.target.value as SplitSheet[typeof k])}
                  onBlur={() => commitSheet(k)} className={hfield} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input type="checkbox" checked={!!sheet.contains_sample} disabled={!isOwner}
                onChange={(e) => { setSheetLocal('contains_sample', e.target.checked); if (isOwner) supabase.from('split_sheets').update({ contains_sample: e.target.checked }).eq('id', sheet.id); }} />
              샘플/인터폴레이션 포함
            </label>
            {sheet.contains_sample && (
              <input value={sheet.sample_note ?? ''} disabled={!isOwner} placeholder="샘플 출처/원곡"
                onChange={(e) => setSheetLocal('sample_note', e.target.value)} onBlur={() => commitSheet('sample_note')}
                className={`${hfield} flex-1 min-w-[200px]`} />
            )}
          </div>

          {/* attached audio — ties the agreed splits to the actual work (evidence) */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] uppercase tracking-widest text-white/30">음원</span>
              {sheet.audio_path ? (
                <>
                  {audioUrl && <audio src={audioUrl} controls className="h-9 max-w-full" style={{ minWidth: 220 }} />}
                  <span className="text-xs text-white/50 truncate max-w-[220px]">{sheet.audio_name}</span>
                  {audioUrl && <a href={audioUrl} download={sheet.audio_name ?? 'audio'} className="text-xs text-white/50 hover:text-white underline">다운로드</a>}
                  {isOwner && (
                    <label className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 cursor-pointer transition-colors">
                      {audioUploading ? '…' : '교체'}
                      <input type="file" accept="audio/*" onChange={(e) => uploadAudio(e.target.files?.[0])} className="hidden" />
                    </label>
                  )}
                  {isOwner && <button onClick={removeAudio} className="text-xs text-white/25 hover:text-red-400 transition-colors">삭제</button>}
                </>
              ) : isOwner ? (
                <label className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 cursor-pointer transition-colors">
                  {audioUploading ? '업로드 중…' : '+ 음원 첨부 (데모/마스터)'}
                  <input type="file" accept="audio/*" onChange={(e) => uploadAudio(e.target.files?.[0])} className="hidden" />
                </label>
              ) : <span className="text-xs text-white/30">첨부된 음원 없음</span>}
            </div>
          </div>
        </div>

        {/* contributors */}
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[11px] uppercase tracking-widest text-white/30">기여자 · 지분</div>
          <div className="ml-auto flex items-center gap-3 text-[11px]">
            {CATEGORIES.map((c) => {
              const t = shareTotal(rows, c.key);
              return <span key={c.key} className={t === 100 ? 'text-emerald-400' : 'text-amber-400'}>{c.label} {t}%{t === 100 ? ' ✓' : ''}</span>;
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const mine = r.user_id === me;
            const rowEditable = isOwner || mine;
            return (
              <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-white/30 w-5">{i + 1}</span>
                  <input value={r.legal_name ?? ''} disabled={!rowEditable} placeholder="법적 이름"
                    onChange={(e) => setRowLocal(r.id, { legal_name: e.target.value })} onBlur={(e) => commitRow(r.id, { legal_name: e.target.value })}
                    className={`${field} max-w-[220px] font-medium`} />
                  <input value={r.stage_name ?? ''} disabled={!rowEditable} placeholder="활동명"
                    onChange={(e) => setRowLocal(r.id, { stage_name: e.target.value })} onBlur={(e) => commitRow(r.id, { stage_name: e.target.value })}
                    className={`${field} max-w-[160px]`} />
                  {r.user_id && <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400/80">계정 연동</span>}
                  <button onClick={() => toggleSign(r)} disabled={!mine}
                    title={mine ? '내 서명' : '본인만 서명 가능'}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${r.signed ? 'border-emerald-500/40 text-emerald-400' : mine ? 'border-white/15 text-white/60 hover:bg-white/5' : 'border-white/10 text-white/25'}`}>
                    {r.signed ? '✓ 서명됨' : '서명'}
                  </button>
                  {isOwner && <button onClick={() => deleteRow(r.id)} className="text-xs text-white/25 hover:text-red-400 transition-colors px-1">삭제</button>}
                </div>

                {/* shares — owner sets */}
                <div className="flex flex-wrap gap-3 mb-3">
                  {CATEGORIES.map((c) => (
                    <div key={c.key} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-white/40 w-8">{c.label}</span>
                      <input type="number" min={0} max={100} value={Number(r[c.key as ShareKey]) || 0} disabled={!isOwner}
                        onChange={(e) => setRowLocal(r.id, { [c.key]: e.target.value === '' ? 0 : Number(e.target.value) } as Partial<Contributor>)}
                        onBlur={(e) => commitRow(r.id, { [c.key]: e.target.value === '' ? 0 : Number(e.target.value) } as Partial<Contributor>)}
                        className="w-16 rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-[#3E78DB] disabled:opacity-60" />
                      <span className="text-[11px] text-white/30">%</span>
                    </div>
                  ))}
                </div>

                {/* PRO / publisher / contact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <ProSelect value={r.pro ?? ''} disabled={!rowEditable} onChange={(v) => commitRow(r.id, { pro: v })} />
                  <input value={r.ipi ?? ''} disabled={!rowEditable} placeholder="IPI/CAE"
                    onChange={(e) => setRowLocal(r.id, { ipi: e.target.value })} onBlur={(e) => commitRow(r.id, { ipi: e.target.value })} className={field} />
                  <input value={r.publisher_name ?? ''} disabled={!rowEditable} placeholder="퍼블리셔"
                    onChange={(e) => setRowLocal(r.id, { publisher_name: e.target.value })} onBlur={(e) => commitRow(r.id, { publisher_name: e.target.value })} className={field} />
                  <input value={r.email ?? ''} disabled={!rowEditable} placeholder="이메일"
                    onChange={(e) => setRowLocal(r.id, { email: e.target.value })} onBlur={(e) => commitRow(r.id, { email: e.target.value })} className={field} />
                </div>
              </div>
            );
          })}
        </div>

        {/* add contributor */}
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="이메일로 추가 (저장된 프로필 자동채움)"
              onKeyDown={(e) => { if (e.key === 'Enter') addByEmail(); }}
              className={`${hfield} max-w-[320px]`} />
            <button onClick={addByEmail} disabled={adding} className="text-sm px-4 py-2 rounded-xl bg-[#3E78DB] hover:bg-[#4d86e8] disabled:opacity-50 font-medium transition-colors">
              {adding ? '…' : '+ 추가'}
            </button>
            <button onClick={() => addRow({}, null, '')} disabled={adding} className="text-sm px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5 transition-colors">빈 행</button>
          </div>
        )}

        {/* notes */}
        <div className="mt-6">
          <label className="block text-[11px] text-white/40 mb-1">비고 (Notes)</label>
          <textarea value={sheet.notes ?? ''} disabled={!isOwner} rows={2}
            onChange={(e) => setSheetLocal('notes', e.target.value)} onBlur={() => commitSheet('notes')}
            className={`${hfield} resize-none`} placeholder="추가 합의사항, 마스터 지분(별도) 등" />
        </div>
      </div>
    </div>
  );
}
