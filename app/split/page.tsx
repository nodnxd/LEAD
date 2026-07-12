'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CopyrightProfile, SplitSheet, PRO_GROUPS, PRO_LABEL } from '@/lib/splitsheet';
import { useLang, LangToggle } from '@/lib/lang';

const EMPTY_PROFILE: Omit<CopyrightProfile, 'id'> = {
  legal_name: '', stage_name: '', pro: '', ipi: '',
  publisher_name: '', publisher_pro: '', publisher_ipi: '',
  email: '', phone: '', address: '',
};

function ProSelect({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      className={className ?? 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3E78DB]'}>
      <option value="">{placeholder ?? '저작권협회 (PRO/CMO) 선택…'}</option>
      {PRO_GROUPS.map((g) => (
        <optgroup key={g.region} label={g.region}>
          {g.items.map((i) => <option key={i.code} value={i.code}>{i.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export default function SplitIndex() {
  const router = useRouter();
  const { t } = useLang();
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Omit<CopyrightProfile, 'id'>>(EMPTY_PROFILE);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [sheets, setSheets] = useState<SplitSheet[]>([]);
  const [needSign, setNeedSign] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      setMe(user.id);
      const { data: cp } = await supabase.from('copyright_profiles').select('*').eq('id', user.id).maybeSingle();
      if (cp) {
        const c = cp as CopyrightProfile;
        setProfile({
          legal_name: c.legal_name, stage_name: c.stage_name, pro: c.pro, ipi: c.ipi,
          publisher_name: c.publisher_name, publisher_pro: c.publisher_pro, publisher_ipi: c.publisher_ipi,
          email: c.email, phone: c.phone, address: c.address,
        });
      } else setProfileOpen(true); // first time — nudge to fill it
      // sheets I own
      const { data: owned } = await supabase.from('split_sheets').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
      // sheets I'm a contributor on (+ which still need my signature)
      const { data: contribRows } = await supabase.from('split_contributors').select('sheet_id, signed').eq('user_id', user.id);
      const contribIds = [...new Set((contribRows ?? []).map((r) => r.sheet_id))];
      setNeedSign(new Set((contribRows ?? []).filter((r) => !r.signed).map((r) => r.sheet_id)));
      let shared: SplitSheet[] = [];
      if (contribIds.length) {
        const { data } = await supabase.from('split_sheets').select('*').in('id', contribIds);
        shared = (data as SplitSheet[]) ?? [];
      }
      const ownedList = (owned as SplitSheet[]) ?? [];
      const merged = [...ownedList, ...shared.filter((s) => !ownedList.some((o) => o.id === s.id))];
      setSheets(merged);
      setLoading(false);
    })();
  }, [router]);

  function up<K extends keyof typeof EMPTY_PROFILE>(k: K, v: string) { setProfile((p) => ({ ...p, [k]: v })); }

  async function saveProfile() {
    if (!me) return;
    setSavingProfile(true);
    await supabase.from('copyright_profiles').upsert({ id: me, ...profile, updated_at: new Date().toISOString() });
    setSavingProfile(false);
    setProfileSaved(true); setTimeout(() => setProfileSaved(false), 1600);
  }

  async function newSheet() {
    if (!me || creating) return;
    setCreating(true);
    const { data, error } = await supabase.from('split_sheets')
      .insert({ owner_id: me, work_date: new Date().toISOString().slice(0, 10) })
      .select('*').single();
    setCreating(false);
    if (!error && data) router.push(`/split/${data.id}`);
  }

  const field = 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#3E78DB]';

  if (loading) return <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center text-white/40">…</div>;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* header */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <button onClick={() => router.push('/hub')} className="text-sm text-white/40 hover:text-white transition-colors">← hub</button>
          <h1 className="text-xl font-bold">Split Sheet</h1>
          <span className="text-xs text-white/30 hidden sm:inline">{t('저작권 지분 · 전세계 표준', 'Songwriter splits · global standard')}</span>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <button onClick={newSheet} disabled={creating}
              className="text-sm px-4 py-2 rounded-xl bg-[#3E78DB] hover:bg-[#4d86e8] disabled:opacity-50 font-medium transition-colors">
              {t('+ 새 스플릿시트', '+ New split sheet')}
            </button>
          </div>
        </div>

        {/* my copyright profile */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] mb-8 overflow-hidden">
          <button onClick={() => setProfileOpen((v) => !v)} className="w-full flex items-center gap-2 px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors">
            <span className="text-sm font-semibold">{t('내 저작권 프로필', 'My copyright profile')}</span>
            <span className="text-xs text-white/35 truncate">{profile.pro ? `${PRO_LABEL[profile.pro] ?? profile.pro}${profile.ipi ? ` · IPI ${profile.ipi}` : ''}` : t('미설정 — 스플릿시트에 자동채움돼요', 'Not set — auto-fills into split sheets')}</span>
            <span className="ml-auto text-white/30 text-xs">{profileOpen ? '▾' : '▸'}</span>
          </button>
          {profileOpen && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-[11px] text-white/40 mb-1">{t('법적 이름', 'Legal name')}</label>
                  <input value={profile.legal_name ?? ''} onChange={(e) => up('legal_name', e.target.value)} className={field} placeholder={t('여권/신분증상 이름', 'Name as on ID/passport')} /></div>
                <div><label className="block text-[11px] text-white/40 mb-1">{t('활동명', 'Stage name')}</label>
                  <input value={profile.stage_name ?? ''} onChange={(e) => up('stage_name', e.target.value)} className={field} /></div>
                <div><label className="block text-[11px] text-white/40 mb-1">{t('저작권협회 (PRO/CMO)', 'Society (PRO/CMO)')}</label>
                  <ProSelect value={profile.pro ?? ''} onChange={(v) => up('pro', v)} className={field} placeholder={t('저작권협회 선택…', 'Select society…')} /></div>
                <div><label className="block text-[11px] text-white/40 mb-1">{t('IPI / CAE 번호', 'IPI / CAE number')}</label>
                  <input value={profile.ipi ?? ''} onChange={(e) => up('ipi', e.target.value)} className={field} placeholder={t('예: 00123456789', 'e.g. 00123456789')} /></div>
                <div><label className="block text-[11px] text-white/40 mb-1">{t('퍼블리셔', 'Publisher')}</label>
                  <input value={profile.publisher_name ?? ''} onChange={(e) => up('publisher_name', e.target.value)} className={field} placeholder={t('없으면 비워두기', 'Leave blank if none')} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[11px] text-white/40 mb-1">{t('퍼블리셔 PRO', 'Publisher PRO')}</label>
                    <ProSelect value={profile.publisher_pro ?? ''} onChange={(v) => up('publisher_pro', v)} className={field} placeholder={t('선택…', 'Select…')} /></div>
                  <div><label className="block text-[11px] text-white/40 mb-1">{t('퍼블리셔 IPI', 'Publisher IPI')}</label>
                    <input value={profile.publisher_ipi ?? ''} onChange={(e) => up('publisher_ipi', e.target.value)} className={field} /></div>
                </div>
                <div><label className="block text-[11px] text-white/40 mb-1">{t('이메일', 'Email')}</label>
                  <input value={profile.email ?? ''} onChange={(e) => up('email', e.target.value)} className={field} /></div>
                <div><label className="block text-[11px] text-white/40 mb-1">{t('전화', 'Phone')}</label>
                  <input value={profile.phone ?? ''} onChange={(e) => up('phone', e.target.value)} className={field} /></div>
                <div className="md:col-span-2"><label className="block text-[11px] text-white/40 mb-1">{t('주소', 'Address')}</label>
                  <input value={profile.address ?? ''} onChange={(e) => up('address', e.target.value)} className={field} /></div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button onClick={saveProfile} disabled={savingProfile}
                  className="text-sm px-4 py-2 rounded-xl border border-white/15 hover:bg-white/5 disabled:opacity-50 transition-colors">
                  {savingProfile ? t('저장 중…', 'Saving…') : profileSaved ? t('✓ 저장됨', '✓ Saved') : t('프로필 저장', 'Save profile')}
                </button>
                <span className="text-[11px] text-white/30">{t('한 번 저장하면 스플릿시트에서 내 정보로 자동채움돼요.', 'Saved once, it auto-fills into every split sheet.')}</span>
              </div>
            </div>
          )}
        </div>

        {/* sheets list */}
        <div className="text-[11px] uppercase tracking-widest text-white/30 mb-3">{t('내 스플릿시트', 'My split sheets')}</div>
        {sheets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center text-white/35 text-sm">
            {t('아직 없어요. ', 'None yet. ')}<button onClick={newSheet} className="text-[#3E78DB] hover:underline">{t('새 스플릿시트', 'Create one')}</button>{t('를 만들어보세요.', '.')}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sheets.map((s) => (
              <button key={s.id} onClick={() => router.push(`/split/${s.id}`)}
                className="text-left px-5 py-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors flex items-center gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.song_title || t('(제목 없음)', '(Untitled)')}</div>
                  <div className="text-xs text-white/40 truncate">{s.artist_name || t('아티스트 미정', 'Artist TBD')}{s.iswc ? ` · ISWC ${s.iswc}` : ''}</div>
                </div>
                {needSign.has(s.id) && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full border border-[#3E78DB]/40 text-[#6fa0f0]">{t('✍ 서명 필요', '✍ Sign')}</span>}
                {s.owner_id !== me && <span className={`${needSign.has(s.id) ? '' : 'ml-auto'} text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/50`}>{t('참여', 'Shared')}</span>}
                {s.locked && <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400">🔒</span>}
                <span className="text-white/20 text-xs">{s.work_date ?? ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
