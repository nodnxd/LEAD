'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SplitSheet, Contributor, CATEGORIES, CategoryKey, PRO_GROUPS, PRO_LABEL, categoryTotal } from '@/lib/splitsheet';

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
  const [addEmail, setAddEmail] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState('');
  const [audioUrl, setAudioUrl] = useState('');       // signed playback URL
  const [audioUploading, setAudioUploading] = useState(false);
  const [signRow, setSignRow] = useState<Contributor | null>(null);  // signature-capture modal target

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

  // Finalized sheets are read-only until the owner unlocks (which invalidates signatures).
  function lockedGuard(): boolean {
    if (sheet?.locked) { flash('확정(잠금)된 시트예요 — 잠금 해제 후 수정하세요'); return true; }
    return false;
  }

  // ── sheet header ──
  function setSheetLocal<K extends keyof SplitSheet>(k: K, v: SplitSheet[K]) { setSheet((s) => s ? { ...s, [k]: v } : s); }
  async function commitSheet<K extends keyof SplitSheet>(k: K) {
    if (!sheet || !isOwner || lockedGuard()) return;
    await supabase.from('split_sheets').update({ [k]: sheet[k], updated_at: new Date().toISOString() }).eq('id', sheet.id);
  }

  async function uploadAudio(file: File | undefined) {
    if (!file || !sheet || !isOwner || lockedGuard()) return;
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
    if (!sheet || !isOwner || lockedGuard()) return;
    if (sheet.audio_path) await supabase.storage.from('member-demos').remove([sheet.audio_path]);
    await supabase.from('split_sheets').update({ audio_path: null, audio_name: null }).eq('id', sheet.id);
    setSheet((s) => s ? { ...s, audio_path: null, audio_name: null } : s);
    setAudioUrl('');
  }

  // ── contributors (entry = person × one category) ──
  async function addRow(category: CategoryKey, base: Partial<Contributor>, userId: string | null, email: string) {
    if (lockedGuard()) return;
    setAdding(true);
    const { data, error } = await supabase.from('split_contributors')
      .insert({ sheet_id: id, user_id: userId, email, category, share: 0, order_index: rows.length, ...base })
      .select('*').single();
    setAdding(false);
    if (!error && data) { setRows((r) => [...r, data as Contributor]); setAddEmail((m) => ({ ...m, [category]: '' })); }
    else flash('추가 실패');
  }

  async function addByEmail(category: CategoryKey) {
    const email = (addEmail[category] ?? '').trim();
    if (!isOwner) return;
    if (!email) { await addRow(category, {}, null, ''); return; }
    let userId: string | null = null;
    const base: Partial<Contributor> = {};
    // 1) copyright_profiles (authenticated-readable) — links the account AND auto-fills in one shot
    const { data: cp } = await supabase.from('copyright_profiles').select('*').ilike('email', email).limit(1).maybeSingle();
    if (cp) {
      userId = cp.id;
      Object.assign(base, {
        legal_name: cp.legal_name, stage_name: cp.stage_name, pro: cp.pro, ipi: cp.ipi,
        publisher_name: cp.publisher_name, publisher_pro: cp.publisher_pro, publisher_ipi: cp.publisher_ipi,
        email: cp.email ?? email, phone: cp.phone, address: cp.address,
      });
      flash('계정 연동 · 저작권 프로필 자동채움됨');
    } else {
      // 2) fall back to the member directory (id only — no PRO profile saved yet)
      const { data: m } = await supabase.from('members').select('id').ilike('email', email).limit(1).maybeSingle();
      if (m?.id) { userId = m.id; flash('계정 연동됨 (저작권 프로필 미설정 — 본인이 채우면 반영)'); }
      else flash('해당 이메일 계정 없음 — 이름만 채워 추가 (상대가 가입 후 자동 연동은 안 됨)');
    }
    await addRow(category, { ...base, email: (base.email as string) ?? email }, userId, (base.email as string) ?? email);
  }

  function setRowLocal(rid: string, patch: Partial<Contributor>) {
    setRows((rs) => rs.map((r) => r.id === rid ? { ...r, ...patch } : r));
  }
  async function commitRow(rid: string, patch: Partial<Contributor>) {
    if (lockedGuard()) return;
    setRowLocal(rid, patch);
    await supabase.from('split_contributors').update(patch).eq('id', rid);
  }
  async function deleteRow(rid: string) {
    if (lockedGuard()) return;
    setRows((rs) => rs.filter((r) => r.id !== rid));
    await supabase.from('split_contributors').delete().eq('id', rid);
  }
  // SHA-256 of a canonical snapshot of the agreement at signing time (tamper-evidence).
  async function agreementHash(): Promise<string> {
    const snap = JSON.stringify({
      song: sheet && { t: sheet.song_title, a: sheet.artist_name, iswc: sheet.iswc, audio: sheet.audio_name },
      rows: rows.map((r) => ({ c: r.category, s: Number(r.share) || 0, n: r.legal_name })),
    });
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snap));
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function submitSignature(row: Contributor, name: string, dataUrl: string) {
    if (lockedGuard()) return;
    const hash = await agreementHash();
    const patch = { signed: true, signed_at: new Date().toISOString(), signature_name: name || row.legal_name, signature_data: dataUrl || null, signed_hash: hash };
    setRowLocal(row.id, patch);
    await supabase.from('split_contributors').update(patch).eq('id', row.id);
    setSignRow(null);
    flash('서명 완료 — 문서 해시로 봉인됨');
  }
  async function unsign(row: Contributor) {
    if (lockedGuard()) return;
    const patch = { signed: false, signed_at: null, signature_name: null, signature_data: null, signed_hash: null };
    setRowLocal(row.id, patch);
    await supabase.from('split_contributors').update(patch).eq('id', row.id);
  }

  // ── finalize / lock / request signatures ──
  const allSigned = rows.length > 0 && rows.every((r) => r.signed);
  // each category with entries must total 100%; empty categories are fine
  const sharesOk = rows.length > 0 && CATEGORIES.every((c) => {
    const n = rows.filter((r) => r.category === c.key).length;
    return n === 0 || categoryTotal(rows, c.key) === 100;
  });

  async function requestSignatures() {
    if (!sheet || !isOwner) return;
    const ts = new Date().toISOString();
    setSheet((s) => s ? { ...s, signature_requested_at: ts } : s);
    await supabase.from('split_sheets').update({ signature_requested_at: ts }).eq('id', sheet.id);
    flash('기여자들에게 서명 요청됨 — 각자 목록에 “서명 필요”로 표시돼요');
  }

  async function lockSheet() {
    if (!sheet || !isOwner) return;
    if (!allSigned) { flash('전원 서명 후 확정할 수 있어요'); return; }
    if (!sharesOk) { flash('작사/작곡/편곡 지분이 각각 100%가 아니에요'); return; }
    const ts = new Date().toISOString();
    setSheet((s) => s ? { ...s, locked: true, locked_at: ts } : s);
    await supabase.from('split_sheets').update({ locked: true, locked_at: ts }).eq('id', sheet.id);
    flash('확정(잠금)됨 — 이제 읽기 전용');
  }

  async function unlockSheet() {
    if (!sheet || !isOwner) return;
    if (!confirm('잠금을 해제하면 모든 서명이 초기화되고 버전이 올라가요. 계속할까요?')) return;
    const nextVer = (sheet.version ?? 1) + 1;
    setSheet((s) => s ? { ...s, locked: false, locked_at: null, version: nextVer } : s);
    setRows((rs) => rs.map((r) => ({ ...r, signed: false, signed_at: null })));
    await supabase.from('split_sheets').update({ locked: false, locked_at: null, version: nextVer }).eq('id', sheet.id);
    await supabase.from('split_contributors').update({ signed: false, signed_at: null }).eq('sheet_id', sheet.id);
    flash(`잠금 해제 · 버전 ${nextVer} — 수정 후 재서명 필요`);
  }

  // ── evidence bundle (zip): agreement + audio + tamper-evident manifest(SHA-256) ──
  async function exportBundle() {
    if (!sheet) return;
    flash('증빙 번들 생성 중…');
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    // audio + hash
    let audioSha = null as string | null;
    if (sheet.audio_path && audioUrl) {
      try {
        const buf = await (await fetch(audioUrl)).arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buf);
        audioSha = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
        zip.file(sheet.audio_name || 'audio', buf);
      } catch { /* audio fetch failed — bundle still useful */ }
    }
    const manifest = {
      document: 'Songwriter Split Sheet — evidence bundle',
      generated_at: new Date().toISOString(),
      version: sheet.version ?? 1,
      locked: !!sheet.locked,
      song: { title: sheet.song_title, aka: sheet.aka, artist: sheet.artist_name, album: sheet.album, duration: sheet.duration, iswc: sheet.iswc, isrc: sheet.isrc, date: sheet.work_date },
      audio: sheet.audio_name ? { file: sheet.audio_name, sha256: audioSha } : null,
      entries: rows.map((r) => ({
        category: r.category, share: Number(r.share) || 0,
        legal_name: r.legal_name, stage_name: r.stage_name,
        pro: r.pro, ipi: r.ipi, publisher: r.publisher_name,
        signed: !!r.signed, signed_at: r.signed_at, signature_name: r.signature_name, signed_hash: r.signed_hash,
        contact: { email: r.email, phone: r.phone },
      })),
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('agreement.html', agreementHtml(false));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${(sheet.song_title || 'splitsheet').replace(/[^\w가-힣-]+/g, '_')}_v${sheet.version ?? 1}_evidence.zip`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── printable agreement HTML (shared by PDF print + evidence bundle) ──
  function agreementHtml(autoPrint: boolean): string {
    if (!sheet) return '';
    const esc = (t: string | null | undefined) => (t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
    const proTxt = (c: string | null) => c ? (PRO_LABEL[c] ?? c) : '—';
    const info = (label: string, val: string | null | undefined) => `<div class="kv"><span>${label}</span><b>${esc(val) || '—'}</b></div>`;
    const sigCell = (r: Contributor) => r.signed
      ? (r.signature_data ? `<img class="sig" src="${r.signature_data}"/>` : `<span class="sub">✓ ${esc(r.signature_name) || 'signed'}</span>`)
        + `<br><span class="sub">${esc((r.signed_at ?? '').slice(0, 10))}</span>`
      : '<span class="sub">미서명</span>';
    const sections = CATEGORIES.map((cat) => {
      const cr = rows.filter((r) => r.category === cat.key);
      if (cr.length === 0) return '';
      const total = categoryTotal(rows, cat.key);
      const body = cr.map((r) => `
        <tr>
          <td><b>${esc(r.legal_name) || '—'}</b>${r.stage_name ? `<br><span class="sub">${esc(r.stage_name)}</span>` : ''}</td>
          <td class="num">${Number(r.share) || 0}%</td>
          <td>${esc(proTxt(r.pro))}${r.ipi ? `<br><span class="sub">IPI ${esc(r.ipi)}</span>` : ''}</td>
          <td>${esc(r.publisher_name) || '—'}</td>
          <td>${esc(r.email) || '—'}</td>
          <td class="sign">${sigCell(r)}</td>
        </tr>`).join('');
      return `<h2>${cat.label} · ${cat.en}</h2>
        <table>
          <thead><tr><th>Writer (legal / stage)</th><th class="num">Share</th><th>Society / IPI</th><th>Publisher</th><th>Contact</th><th>Signature</th></tr></thead>
          <tbody>${body}<tr class="tot"><td>TOTAL</td><td class="num ${total === 100 ? '' : 'bad'}">${total}%</td><td colspan="4"></td></tr></tbody>
        </table>`;
    }).join('');
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
      h2 { font-size: 13px; margin: 16px 0 5px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 4px; }
      th, td { border: 1px solid #ddd; padding: 6px 7px; text-align: left; vertical-align: top; }
      th { background: #f4f4f4; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
      td.num, th.num { text-align: center; white-space: nowrap; }
      .sub { color: #999; font-size: 9.5px; }
      img.sig { height: 34px; max-width: 130px; object-fit: contain; }
      tr.tot td { background: #fafafa; font-weight: 700; }
      td.bad { color: #c0392b; }
      .foot { margin-top: 18px; font-size: 10px; color: #999; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>
      <h1>SPLIT SHEET</h1>
      <div class="muted">저작권 지분 확인서 · Songwriter Split Sheet · v${sheet.version ?? 1}${sheet.locked ? ` · 확정 ${esc((sheet.locked_at ?? '').slice(0, 10))}` : ' · 초안(DRAFT)'}</div>
      <div class="grid">
        ${info('Title', sheet.song_title)} ${info('AKA', sheet.aka)} ${info('Artist', sheet.artist_name)}
        ${info('Album', sheet.album)} ${info('Duration', sheet.duration)} ${info('Date', sheet.work_date)}
        ${info('ISWC', sheet.iswc)} ${info('ISRC', sheet.isrc)} ${info('Sample?', sheet.contains_sample ? `Yes${sheet.sample_note ? ' — ' + sheet.sample_note : ''}` : 'No')}
        ${info('Audio', sheet.audio_name)}
      </div>
      ${sections || '<p class="sub">기여자 없음</p>'}
      ${sheet.notes ? `<div class="foot"><b>Notes:</b> ${esc(sheet.notes)}</div>` : ''}
      <div class="foot">By signing, each writer confirms the ownership splits above are accurate and agreed. Generated by CAST · ${new Date().toISOString().slice(0, 10)}</div>
      ${autoPrint ? `<script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>` : ''}
    </body></html>`;
    return html;
  }

  function exportPdf() {
    if (!sheet) return;
    const w = window.open('', '_blank');
    if (!w) { flash('팝업 차단 해제 필요'); return; }
    w.document.open(); w.document.write(agreementHtml(true)); w.document.close();
  }

  const field = 'w-full rounded-md bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#3E78DB]';
  const hfield = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#3E78DB]';

  if (loading || !sheet) return <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center text-white/40">…</div>;

  const locked = !!sheet.locked;
  const editable = isOwner && !locked;         // owner may edit only while unlocked
  const myUnsigned = rows.filter((r) => r.user_id === me && !r.signed);
  const needMySign = myUnsigned.length > 0 && !locked;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#3E78DB] text-sm shadow-lg">{toast}</div>}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* header bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => router.push('/split')} className="text-sm text-white/40 hover:text-white transition-colors">← 목록</button>
          <h1 className="text-lg font-bold truncate">{sheet.song_title || '새 스플릿시트'}</h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/45">v{sheet.version ?? 1}</span>
          {locked
            ? <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400">🔒 확정됨</span>
            : <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-400/90">초안</span>}
          {!isOwner && <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/50">참여</span>}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportBundle} title="합의서+음원+무결성해시(zip)" className="text-sm px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5 transition-colors">증빙 번들</button>
            <button onClick={exportPdf} className="text-sm px-3 py-2 rounded-xl border border-white/15 hover:bg-white/5 transition-colors">⎙ PDF</button>
          </div>
        </div>

        {/* owner finalize controls */}
        {isOwner && (
          <div className="flex items-center gap-2 mb-5 flex-wrap text-xs">
            <span className="text-white/40">서명 {rows.filter((r) => r.signed).length}/{rows.length}</span>
            {!locked ? (
              <>
                <button onClick={requestSignatures} className="px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition-colors">기여자에게 서명 요청</button>
                <button onClick={lockSheet} disabled={!allSigned || !sharesOk}
                  className="px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-35 disabled:hover:bg-transparent transition-colors"
                  title={!allSigned ? '전원 서명 필요' : !sharesOk ? '지분 100% 필요' : '확정'}>
                  확정 (잠금)
                </button>
              </>
            ) : (
              <button onClick={unlockSheet} className="px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition-colors">잠금 해제 (서명 초기화 · 새 버전)</button>
            )}
          </div>
        )}

        {/* contributor sign prompt */}
        {needMySign && (
          <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl border border-[#3E78DB]/30 bg-[#3E78DB]/[0.08]">
            <span className="text-sm">{sheet.signature_requested_at ? '서명 요청이 왔어요.' : '내 지분을 확인하고'} <b>{myUnsigned.length}건</b> 서명이 필요해요.</span>
            <button onClick={() => setSignRow(myUnsigned[0])} className="ml-auto text-sm px-4 py-1.5 rounded-lg bg-[#3E78DB] hover:bg-[#4d86e8] transition-colors">지금 서명</button>
          </div>
        )}

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
                <input value={(sheet[k] as string) ?? ''} disabled={!editable}
                  onChange={(e) => setSheetLocal(k, e.target.value as SplitSheet[typeof k])}
                  onBlur={() => commitSheet(k)} className={hfield} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input type="checkbox" checked={!!sheet.contains_sample} disabled={!editable}
                onChange={(e) => { setSheetLocal('contains_sample', e.target.checked); if (editable) supabase.from('split_sheets').update({ contains_sample: e.target.checked }).eq('id', sheet.id); }} />
              샘플/인터폴레이션 포함
            </label>
            {sheet.contains_sample && (
              <input value={sheet.sample_note ?? ''} disabled={!editable} placeholder="샘플 출처/원곡"
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
                  {editable && (
                    <label className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 cursor-pointer transition-colors">
                      {audioUploading ? '…' : '교체'}
                      <input type="file" accept="audio/*" onChange={(e) => uploadAudio(e.target.files?.[0])} className="hidden" />
                    </label>
                  )}
                  {editable && <button onClick={removeAudio} className="text-xs text-white/25 hover:text-red-400 transition-colors">삭제</button>}
                </>
              ) : editable ? (
                <label className="text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 cursor-pointer transition-colors">
                  {audioUploading ? '업로드 중…' : '+ 음원 첨부 (데모/마스터)'}
                  <input type="file" accept="audio/*" onChange={(e) => uploadAudio(e.target.files?.[0])} className="hidden" />
                </label>
              ) : <span className="text-xs text-white/30">첨부된 음원 없음</span>}
            </div>
          </div>
        </div>

        {/* contributors — one section per category (작사/작곡/편곡) */}
        <div className="flex flex-col gap-5">
          {CATEGORIES.map((cat) => {
            const catRows = rows.filter((r) => r.category === cat.key);
            const total = categoryTotal(rows, cat.key);
            return (
              <div key={cat.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold">{cat.label} <span className="text-white/30 text-xs font-normal">{cat.en}</span></h3>
                  {catRows.length > 0 && (
                    <span className={`text-xs ${total === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>합계 {total}%{total === 100 ? ' ✓' : ' (100%여야 함)'}</span>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {catRows.length === 0 && <p className="text-xs text-white/25">아직 없음 — 아래에서 추가</p>}
                  {catRows.map((r) => {
                    const mine = r.user_id === me;
                    const rowEditable = (isOwner || mine) && !locked;
                    return (
                      <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input value={r.legal_name ?? ''} disabled={!rowEditable} placeholder="법적 이름"
                            onChange={(e) => setRowLocal(r.id, { legal_name: e.target.value })} onBlur={(e) => commitRow(r.id, { legal_name: e.target.value })}
                            className={`${field} max-w-[170px] font-medium`} />
                          <input value={r.stage_name ?? ''} disabled={!rowEditable} placeholder="활동명"
                            onChange={(e) => setRowLocal(r.id, { stage_name: e.target.value })} onBlur={(e) => commitRow(r.id, { stage_name: e.target.value })}
                            className={`${field} max-w-[130px]`} />
                          <div className="flex items-center gap-1">
                            <input type="number" min={0} max={100} value={Number(r.share) || 0} disabled={!editable}
                              onChange={(e) => setRowLocal(r.id, { share: e.target.value === '' ? 0 : Number(e.target.value) })}
                              onBlur={(e) => commitRow(r.id, { share: e.target.value === '' ? 0 : Number(e.target.value) })}
                              className="w-16 rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-[#3E78DB] disabled:opacity-60" />
                            <span className="text-[11px] text-white/30">%</span>
                          </div>
                          {r.user_id && <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400/80">연동</span>}
                          {r.signed ? (
                            <span className="text-xs px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                              ✓ {r.signature_name || '서명됨'}
                              {mine && !locked && <button onClick={() => unsign(r)} className="text-white/30 hover:text-red-400 ml-0.5" title="서명 취소">×</button>}
                            </span>
                          ) : (
                            <button onClick={() => setSignRow(r)} disabled={!mine || locked}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${mine ? 'border-white/15 text-white/60 hover:bg-white/5' : 'border-white/10 text-white/25'}`}
                              title={mine ? '서명' : '연동된 본인만 서명 가능'}>서명</button>
                          )}
                          {editable && <button onClick={() => deleteRow(r.id)} className="text-xs text-white/25 hover:text-red-400 transition-colors px-1 ml-auto">삭제</button>}
                        </div>
                        <details className="mt-2">
                          <summary className="text-[11px] text-white/35 cursor-pointer select-none">상세 — 협회·IPI·퍼블리셔·연락처</summary>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                            <ProSelect value={r.pro ?? ''} disabled={!rowEditable} onChange={(v) => commitRow(r.id, { pro: v })} />
                            <input value={r.ipi ?? ''} disabled={!rowEditable} placeholder="IPI/CAE"
                              onChange={(e) => setRowLocal(r.id, { ipi: e.target.value })} onBlur={(e) => commitRow(r.id, { ipi: e.target.value })} className={field} />
                            <input value={r.publisher_name ?? ''} disabled={!rowEditable} placeholder="퍼블리셔"
                              onChange={(e) => setRowLocal(r.id, { publisher_name: e.target.value })} onBlur={(e) => commitRow(r.id, { publisher_name: e.target.value })} className={field} />
                            <input value={r.email ?? ''} disabled={!rowEditable} placeholder="이메일"
                              onChange={(e) => setRowLocal(r.id, { email: e.target.value })} onBlur={(e) => commitRow(r.id, { email: e.target.value })} className={field} />
                          </div>
                        </details>
                      </div>
                    );
                  })}
                </div>

                {editable && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <input value={addEmail[cat.key] ?? ''} onChange={(e) => setAddEmail((m) => ({ ...m, [cat.key]: e.target.value }))}
                      placeholder="이메일로 추가(자동채움) · 비우면 직접 입력"
                      onKeyDown={(e) => { if (e.key === 'Enter') addByEmail(cat.key); }}
                      className={`${hfield} max-w-[300px]`} />
                    <button onClick={() => addByEmail(cat.key)} disabled={adding}
                      className="text-sm px-4 py-2 rounded-xl bg-[#3E78DB] hover:bg-[#4d86e8] disabled:opacity-50 font-medium transition-colors">
                      {adding ? '…' : `+ ${cat.label} 추가`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* notes */}
        <div className="mt-6">
          <label className="block text-[11px] text-white/40 mb-1">비고 (Notes)</label>
          <textarea value={sheet.notes ?? ''} disabled={!editable} rows={2}
            onChange={(e) => setSheetLocal('notes', e.target.value)} onBlur={() => commitSheet('notes')}
            className={`${hfield} resize-none`} placeholder="추가 합의사항, 마스터 지분(별도) 등" />
        </div>
      </div>

      {signRow && (
        <SignatureModal row={signRow} catLabel={CATEGORIES.find((c) => c.key === signRow.category)?.label ?? ''}
          onClose={() => setSignRow(null)} onSubmit={(name, data) => submitSignature(signRow, name, data)} />
      )}
    </div>
  );
}

function SignatureModal({ row, catLabel, onClose, onSubmit }: {
  row: Contributor; catLabel: string;
  onClose: () => void; onSubmit: (name: string, dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [name, setName] = useState(row.legal_name ?? '');
  const [agree, setAgree] = useState(false);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true; const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return; const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    ctx.lineTo(p.x, p.y); ctx.stroke(); dirty.current = true;
  }
  function up() { drawing.current = false; }
  function clear() { const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); dirty.current = false; }

  function submit() {
    if (!name.trim()) return;
    const dataUrl = dirty.current ? canvasRef.current!.toDataURL('image/png') : '';
    onSubmit(name.trim(), dataUrl);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161616] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold mb-1">전자 서명</h3>
        <p className="text-xs text-white/45 mb-4">{catLabel} · {row.stage_name || row.legal_name || '기여자'} · {Number(row.share) || 0}% — 아래 지분에 동의하고 서명합니다.</p>
        <label className="block text-[11px] text-white/40 mb-1">서명자 법적 이름</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#3E78DB] mb-3" />
        <label className="block text-[11px] text-white/40 mb-1">서명 (손으로 그리기 · 선택)</label>
        <div className="rounded-lg bg-white overflow-hidden mb-1">
          <canvas ref={canvasRef} width={400} height={140} className="w-full touch-none"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
        </div>
        <button onClick={clear} className="text-[11px] text-white/40 hover:text-white mb-3">지우기</button>
        <label className="flex items-start gap-2 text-xs text-white/70 mb-4">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
          <span>위 지분이 정확하며 이에 동의함을 확인합니다. 서명 시각·문서 해시(SHA-256)가 함께 기록됩니다.</span>
        </label>
        <div className="flex gap-2">
          <button onClick={submit} disabled={!name.trim() || !agree}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-[#3E78DB] hover:bg-[#4d86e8] disabled:opacity-40 font-medium transition-colors">서명 완료</button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/15 text-sm hover:bg-white/5 transition-colors">취소</button>
        </div>
      </div>
    </div>
  );
}
