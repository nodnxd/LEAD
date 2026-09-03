'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CopyrightProfile, SplitSheet, PRO_GROUPS, PRO_LABEL } from '@/lib/splitsheet';
import { useLang, LangToggle } from '@/lib/lang';
import { useTheme, ThemeToggle } from '@/lib/theme';
import ProductHeader from '@/components/ProductHeader';

const EMPTY_PROFILE: Omit<CopyrightProfile, 'id'> = {
  legal_name: '', stage_name: '', pro: '', ipi: '',
  publisher_name: '', publisher_pro: '', publisher_ipi: '',
  email: '', phone: '', address: '',
};

function ProSelect({ value, onChange, className, placeholder }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      className={className ?? 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-body text-white focus:outline-none focus:border-brand-split'}>
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
  const { dark: D } = useTheme();
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Omit<CopyrightProfile, 'id'>>(EMPTY_PROFILE);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [sheets, setSheets] = useState<SplitSheet[]>([]);
  const [needSign, setNeedSign] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState<Set<string>>(new Set());
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
      // owned sheets where everyone signed (and not locked) → ready to finalize
      const ownedIds = ownedList.filter((s) => !s.locked).map((s) => s.id);
      if (ownedIds.length) {
        const { data: allC } = await supabase.from('split_contributors').select('sheet_id, signed').in('sheet_id', ownedIds);
        const bySheet = new Map<string, { total: number; signed: number }>();
        (allC ?? []).forEach((r) => {
          const e = bySheet.get(r.sheet_id) ?? { total: 0, signed: 0 };
          e.total += 1; if (r.signed) e.signed += 1; bySheet.set(r.sheet_id, e);
        });
        setReady(new Set([...bySheet.entries()].filter(([, e]) => e.total > 0 && e.signed === e.total).map(([id]) => id)));
      }
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

  const field = D
    ? 'w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-body text-white placeholder:text-white/55 focus:outline-none focus:border-brand-split'
    : 'w-full rounded-lg bg-white border border-black/15 px-3 py-2 text-body text-[#1a1a1a] placeholder:text-black/30 focus:outline-none focus:border-brand-split';
  const bg = D ? 'bg-surface-0 text-white' : 'bg-[#f6f6f7] text-[#1a1a1a]';
  const panel = D ? 'border-white/10 bg-white/[0.02]' : 'border-black/[0.08] bg-white';
  const muted = D ? 'text-white/55' : 'text-black/50';
  const faint = D ? 'text-white/55' : 'text-black/40';
  const btn = D ? 'border-white/15 hover:bg-white/5' : 'border-black/15 hover:bg-black/[0.04]';
  const hov = D ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]';
  const lbl = `block text-mini mb-1 ${muted}`;

  if (loading) return <div className={`min-h-[100dvh] flex items-center justify-center ${bg} ${faint}`}>…</div>;

  return (
    <div className={`font-ui min-h-[100dvh] ${bg}`}>
      <div className="w-full px-5 lg:px-8 py-8">
        {/* header */}
        <h1 className="sr-only">{t('스플릿시트', 'Split sheets')}</h1>
        <ProductHeader product="split" dark={D} className="mb-8"
          right={<>
            <LangToggle />
            <ThemeToggle className={`w-8 h-8 rounded-lg border flex items-center justify-center text-body transition ${btn}`} />
            <button onClick={newSheet} disabled={creating}
              className="text-body px-4 py-2 rounded-full bg-brand-split hover:bg-[#3fcbb6] text-white disabled:opacity-50 font-medium transition-colors">
              {t('+ 새 스플릿시트', '+ New split sheet')}
            </button>
          </>}
        />

        {/* my copyright profile */}
        <div className={`rounded-xl border mb-8 overflow-hidden ${panel}`}>
          <button onClick={() => setProfileOpen((v) => !v)} className={`w-full flex items-center gap-2 px-5 py-3.5 text-left transition-colors ${hov}`}>
            <span className="text-body font-semibold">{t('내 저작권 프로필', 'My copyright profile')}</span>
            <span className={`text-mini truncate ${faint}`}>{profile.pro ? `${PRO_LABEL[profile.pro] ?? profile.pro}${profile.ipi ? ` · IPI ${profile.ipi}` : ''}` : t('미설정 — 스플릿시트에 자동채움돼요', 'Not set — auto-fills into split sheets')}</span>
            <span className={`ml-auto text-mini ${faint}`}>{profileOpen ? '▾' : '▸'}</span>
          </button>
          {profileOpen && (
            <div className={`px-5 pb-5 border-t pt-4 ${D ? 'border-white/5' : 'border-black/5'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className={lbl}>{t('법적 이름', 'Legal name')}</label>
                  <input value={profile.legal_name ?? ''} onChange={(e) => up('legal_name', e.target.value)} className={field} placeholder={t('여권/신분증상 이름', 'Name as on ID/passport')} /></div>
                <div><label className={lbl}>{t('활동명', 'Stage name')}</label>
                  <input value={profile.stage_name ?? ''} onChange={(e) => up('stage_name', e.target.value)} className={field} /></div>
                <div><label className={lbl}>{t('저작권협회 (PRO/CMO)', 'Society (PRO/CMO)')}</label>
                  <ProSelect value={profile.pro ?? ''} onChange={(v) => up('pro', v)} className={field} placeholder={t('저작권협회 선택', 'Select society')} /></div>
                <div><label className={lbl}>{t('IPI / CAE 번호', 'IPI / CAE number')}</label>
                  <input value={profile.ipi ?? ''} onChange={(e) => up('ipi', e.target.value)} className={field} placeholder={t('예: 00123456789', 'e.g. 00123456789')} /></div>
                <div><label className={lbl}>{t('퍼블리셔', 'Publisher')}</label>
                  <input value={profile.publisher_name ?? ''} onChange={(e) => up('publisher_name', e.target.value)} className={field} placeholder={t('없으면 비워두기', 'Leave blank if none')} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>{t('퍼블리셔 PRO', 'Publisher PRO')}</label>
                    <ProSelect value={profile.publisher_pro ?? ''} onChange={(v) => up('publisher_pro', v)} className={field} placeholder={t('선택', 'Select')} /></div>
                  <div><label className={lbl}>{t('퍼블리셔 IPI', 'Publisher IPI')}</label>
                    <input value={profile.publisher_ipi ?? ''} onChange={(e) => up('publisher_ipi', e.target.value)} className={field} /></div>
                </div>
                <div><label className={lbl}>{t('이메일', 'Email')}</label>
                  <input value={profile.email ?? ''} onChange={(e) => up('email', e.target.value)} className={field} /></div>
                <div><label className={lbl}>{t('전화', 'Phone')}</label>
                  <input value={profile.phone ?? ''} onChange={(e) => up('phone', e.target.value)} className={field} /></div>
                <div className="md:col-span-2"><label className={lbl}>{t('주소', 'Address')}</label>
                  <input value={profile.address ?? ''} onChange={(e) => up('address', e.target.value)} className={field} /></div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button onClick={saveProfile} disabled={savingProfile}
                  className={`text-body px-4 py-2 rounded-full border disabled:opacity-50 transition-colors ${btn}`}>
                  {savingProfile ? t('저장 중…', 'Saving…') : profileSaved ? t('✓ 저장됨', '✓ Saved') : t('프로필 저장', 'Save profile')}
                </button>
                <span className={`text-mini ${faint}`}>{t('한 번 저장하면 스플릿시트에서 내 정보로 자동채움돼요.', 'Saved once, it auto-fills into every split sheet.')}</span>
              </div>
            </div>
          )}
        </div>

        {/* sheets list */}
        <div className={`text-mini uppercase tracking-widest mb-3 ${faint}`}>{t('내 스플릿시트', 'My split sheets')}</div>
        {sheets.length === 0 ? (
          <div className={`rounded-xl border border-dashed py-14 text-center text-body ${D ? 'border-white/10 text-white/55' : 'border-black/10 text-black/40'}`}>
            {t('아직 없어요. ', 'None yet. ')}<button onClick={newSheet} className="text-brand-split-text hover:underline">{t('새 스플릿시트', 'Create one')}</button>{t('를 만들어보세요.', '.')}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sheets.map((s) => (
              <button key={s.id} onClick={() => router.push(`/split/${s.id}`)}
                className={`text-left px-5 py-4 rounded-full border transition-colors flex items-center gap-3 ${panel} ${hov}`}>
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.song_title || t('(제목 없음)', '(Untitled)')}</div>
                  <div className={`text-mini truncate ${muted}`}>{s.artist_name || t('아티스트 미정', 'Artist TBD')}{s.iswc ? ` · ISWC ${s.iswc}` : ''}</div>
                </div>
                {needSign.has(s.id) && <span className="ml-auto text-micro px-2 py-0.5 rounded-full border border-brand-split/40 text-[#6fa0f0]">{t('✍ 서명 필요', '✍ Sign')}</span>}
                {ready.has(s.id) && <span className={`${needSign.has(s.id) ? '' : 'ml-auto'} text-micro px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-500`}>{t('✓ 확정 가능', '✓ Ready')}</span>}
                {s.owner_id !== me && <span className={`${needSign.has(s.id) || ready.has(s.id) ? '' : 'ml-auto'} text-micro px-2 py-0.5 rounded-full border ${D ? 'border-white/15 text-white/50' : 'border-black/15 text-black/50'}`}>{t('참여', 'Shared')}</span>}
                {s.locked && <span className="text-micro px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-500"><i className="ti ti-lock" aria-hidden="true"></i></span>}
                <span className={`text-mini ${faint}`}>{s.work_date ?? ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
