'use client';
import { fmtDate } from '@/lib/format';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { useLang, LangToggle } from '@/lib/lang';

const ROLES = [
  { id: 'producer', label: 'Producer' },
  { id: 'topliner', label: 'Top-liner' },
  { id: 'lyricist', label: 'Lyricist' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'ar', label: 'A&R' },
];
const GENRES = [
  { id: 'POP', label: 'POP' },
  { id: 'RNB', label: 'R&B' },
  { id: 'HIPHOP', label: 'HIP HOP' },
  { id: 'BALLAD', label: 'BALLAD' },
  { id: 'BAND', label: 'BAND' },
  { id: 'EDM', label: 'EDM' },
  { id: 'ETC', label: 'ETC' },
];

// nullable은 DB 스키마를 따른 것 — 예전엔 string으로 적어놔서 null이 그대로 렌더될 수 있었다
type Work = { id?: string; song_title: string; artist_name: string; link: string; order_index?: number | null; member_id?: string | null; created_at?: string | null };
type Demo = { id?: string; file_url: string; file_name: string | null; order_index?: number | null; member_id?: string | null; created_at?: string | null };

const isExpired = (d: string | null) => { if (!d) return false; return d.includes('T') ? new Date(d) < new Date() : new Date(d) < new Date(new Date().toDateString()); };
const getDDay = (d: string | null) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (diff === 0) return 'D-DAY';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
};
const roleLabels: Record<string, string> = {
  producer: 'Producer', topliner: 'Top-liner', lyricist: 'Lyricist', engineer: 'Engineer', ar: 'A&R',
};

export default function MyPage() {
  const router = useRouter();
  const { t } = useLang();
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'loading' | 'host' | 'member'>('loading');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toast, setToast] = useState('');

  // ── 멤버 state ──
  const [member, setMember] = useState<any>(null);
  const [demos, setDemos] = useState<Demo[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [myPitches, setMyPitches] = useState<any[]>([]);
  const [myPitchFiles, setMyPitchFiles] = useState<any[]>([]);
  const [myLeads, setMyLeads] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [gender, setGender] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [genreEtc, setGenreEtc] = useState('');
  const [demoLink, setDemoLink] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const setLink = (k: string, v: string) => setLinks(p => ({ ...p, [k]: v }));
  // 저작권 정보 (내부용 — 공개 카드에 안 나감, 스플릿 자동채움과 공유)
  const [cp, setCp] = useState<any>(null);
  const [cpPro, setCpPro] = useState('');
  const [cpIpi, setCpIpi] = useState('');
  const [cpLegalName, setCpLegalName] = useState('');
  const [cpPublisher, setCpPublisher] = useState('');
  const [cpPublisherIpi, setCpPublisherIpi] = useState('');
  const [cpPhone, setCpPhone] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editWorks, setEditWorks] = useState<Work[]>([]);
  const [newDemoFiles, setNewDemoFiles] = useState<File[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const demoRef = useRef<HTMLInputElement>(null);

  // ── 호스트 state ──
  const [hostLeads, setHostLeads] = useState<any[]>([]);
  const [hostPitches, setHostPitches] = useState<any[]>([]);
  const [hostPitchFiles, setHostPitchFiles] = useState<any[]>([]);
  const [hostMembers, setHostMembers] = useState<any[]>([]);
  const [hostTab, setHostTab] = useState<'pitches' | 'members'>('pitches');
  const [pitchSort, setPitchSort] = useState<'recent' | 'bpm' | 'vocal' | 'key'>('recent');
  const [pitchVocalFilter, setPitchVocalFilter] = useState<'all' | 'male' | 'female' | 'both'>('all');
  const [hostEditing, setHostEditing] = useState(false);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const [hostDisplayName, setHostDisplayName] = useState('');
  const [hostCompany, setHostCompany] = useState('');
  const [hostInstagram, setHostInstagram] = useState('');
  const [hostBio, setHostBio] = useState('');
  const [hostRoles, setHostRoles] = useState<string[]>([]);
  const [hostGenres, setHostGenres] = useState<string[]>([]);
  const [hostPhotoPreview, setHostPhotoPreview] = useState('');
  const [hostPhotoFile, setHostPhotoFile] = useState<File | null>(null);
  const hostPhotoRef = useRef<HTMLInputElement>(null);
  const [hostSaving, setHostSaving] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('lead_theme');
    if (s === 'light') setTheme('light');

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/'); return; }
      setUser(session.user);
      fetchAll(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!session) router.push('/');
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAll = async (uid: string) => {
    // 멤버인지 호스트인지 판별
    const [{ data: m }, { data: hLeads }] = await Promise.all([
      supabase.from('members').select('*').eq('id', uid).single(),
      supabase.from('leads').select('id').eq('host_id', uid).limit(1),
    ]);

    if (m) {
      // ── 멤버 ──
      setUserType('member');
      setMember(m);
      fillForm(m);
      const [{ data: d }, { data: w }, { data: pitches }, { data: cprof }] = await Promise.all([
        supabase.from('demo_tracks').select('*').eq('member_id', uid).order('order_index'),
        supabase.from('released_works').select('*').eq('member_id', uid).order('order_index'),
        supabase.from('pitches').select('*').eq('member_id', uid).order('created_at', { ascending: false }),
        supabase.from('copyright_profiles').select('*').eq('id', uid).maybeSingle(),
      ]);
      setCp(cprof || null);
      setCpPro(cprof?.pro || ''); setCpIpi(cprof?.ipi || ''); setCpLegalName(cprof?.legal_name || '');
      setCpPublisher(cprof?.publisher_name || ''); setCpPublisherIpi(cprof?.publisher_ipi || ''); setCpPhone(cprof?.phone || '');
      if (d) setDemos(d);
      if (w) setWorks(w);
      if (pitches && pitches.length > 0) {
        setMyPitches(pitches);
        const pitchIds = pitches.map((p: any) => p.id);
        const leadIds = [...new Set(pitches.map((p: any) => p.lead_id))];
        const [{ data: files }, { data: leads }] = await Promise.all([
          supabase.from('pitch_files').select('*').in('pitch_id', pitchIds),
          supabase.from('leads').select('id,artist,title,gender,group_type,album_type').in('id', leadIds),
        ]);
        if (files) setMyPitchFiles(files);
        if (leads) setMyLeads(leads);
      }
    } else if (hLeads && hLeads.length > 0) {
      // ── 호스트 ──
      setUserType('host');
      await fetchHostData(uid);
    } else {
      // 신규 유저
      router.push('/onboarding');
      return;
    }
    setLoading(false);
  };

  const fetchHostData = async (uid: string) => {
    const [{ data: leads }, { data: pitches }, { data: approvals }, { data: hp }] = await Promise.all([
      supabase.from('leads').select('*').eq('host_id', uid).order('created_at', { ascending: false }),
      supabase.from('pitches').select('*').eq('host_id', uid).order('created_at', { ascending: false }),
      supabase.from('member_approvals').select('*, members(id, artist_name, name, roles, photo_url, genres)').eq('host_id', uid),
      supabase.from('host_profiles').select('*').eq('id', uid).single(),
    ]);
    if (leads) setHostLeads(leads);
    if (pitches) {
      setHostPitches(pitches);
      if (pitches.length > 0) {
        const { data: files } = await supabase.from('pitch_files').select('*').in('pitch_id', pitches.map((p: any) => p.id));
        if (files) setHostPitchFiles(files);
      }
    }
    if (approvals) setHostMembers(approvals);
    if (hp) setHostProfile(hp);
  };

  const openHostEdit = () => {
    const hp = hostProfile;
    setHostDisplayName(hp?.display_name || user?.user_metadata?.display_name || '');
    setHostCompany(hp?.company || '');
    setHostInstagram(hp?.instagram || '');
    setHostBio(hp?.bio || '');
    setHostRoles(hp?.roles || []);
    setHostGenres(hp?.genres || []);
    setHostPhotoPreview(hp?.photo_url || '');
    setHostPhotoFile(null);
    setHostEditing(true);
  };
  const saveHostProfile = async () => {
    if (!user || hostSaving) return;
    setHostSaving(true);
    let photoUrl = hostProfile?.photo_url || null;
    if (hostPhotoFile) {
      const ext = hostPhotoFile.name.split('.').pop();
      const path = `hosts/${user.id}/avatar.${ext}`;
      await supabase.storage.from('member-photos').upload(path, hostPhotoFile, { upsert: true });
      photoUrl = supabase.storage.from('member-photos').getPublicUrl(path).data.publicUrl;
    }
    const data = {
      id: user.id,
      display_name: hostDisplayName.trim() || null,
      company: hostCompany.trim() || null,
      instagram: hostInstagram.trim() || null,
      bio: hostBio.trim() || null,
      photo_url: photoUrl,
      roles: hostRoles,
      genres: hostGenres,
      updated_at: new Date().toISOString(),
    };
    await supabase.from('host_profiles').upsert(data);
    setHostProfile(data);
    setHostEditing(false); setHostSaving(false); setHostPhotoFile(null);
    showToast(t('✅ 저장됐어요!', '✅ Saved!'));
  };

  // ── 멤버 폼 ──
  const fillForm = (m: any) => {
    setName(m.name || '');
    setArtistName(m.artist_name || '');
    setGender(m.gender || '');
    setCompany(m.company || '');
    setEmail(m.email || '');
    setInstagram(m.instagram || '');
    setRoles(m.roles || []);
    setGenres(m.genres || []);
    setGenreEtc(m.genre_etc || '');
    setDemoLink(m.demo_link || '');
    setBio(m.bio || '');
    setLinks(m.links || {});
    setPhotoPreview(m.photo_url || '');
  };
  const openEdit = () => {
    if (!member) return;
    fillForm(member);
    setEditWorks(works.map(w => ({ ...w })));
    setNewDemoFiles([]);
    setEditing(true);
  };
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const toggleArr = (arr: string[], val: string, setFn: (v: string[]) => void) =>
    setFn(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  const handlePhotoChange = (file: File) => { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); };
  const deleteDemo = async (demo: Demo) => {
    if (!demo.id) return;
    await supabase.from('demo_tracks').delete().eq('id', demo.id);
    setDemos(p => p.filter(d => d.id !== demo.id));
    showToast(t('🗑 삭제됐어요', '🗑 Deleted'));
  };
  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    let photoUrl = member?.photo_url || null;
    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `members/${user.id}/avatar.${ext}`;
      await supabase.storage.from('member-photos').upload(path, photoFile, { upsert: true });
      photoUrl = supabase.storage.from('member-photos').getPublicUrl(path).data.publicUrl;
    }
    const finalGenres = genres.includes('ETC') && genreEtc.trim()
      ? [...genres.filter(g => g !== 'ETC'), `ETC:${genreEtc.trim()}`] : genres;
    await supabase.from('members').upsert({
      id: user.id,
      name, artist_name: artistName, gender, company: company || null, email,
      instagram: instagram || null, photo_url: photoUrl, bio: bio.trim() || null,
      links: Object.fromEntries(Object.entries(links).filter(([, v]) => (v || '').trim())),
      roles, genres: finalGenres, genre_etc: genreEtc || null, demo_link: demoLink || null,
    }).eq('id', user.id);
    // 저작권 정보 (내부용)
    if (cpPro || cpIpi || cpLegalName || cpPublisher || cpPublisherIpi || cpPhone || cp) {
      await supabase.from('copyright_profiles').upsert({
        id: user.id,
        legal_name: cpLegalName.trim() || null, stage_name: artistName || null,
        pro: cpPro.trim() || null, ipi: cpIpi.trim() || null,
        publisher_name: cpPublisher.trim() || null, publisher_ipi: cpPublisherIpi.trim() || null,
        email, phone: cpPhone.trim() || null, updated_at: new Date().toISOString(),
      });
    }
    await supabase.from('released_works').delete().eq('member_id', user.id);
    const validWorks = editWorks.filter(w => w.song_title.trim() && w.artist_name.trim() && w.link.trim());
    if (validWorks.length > 0) {
      await supabase.from('released_works').insert(
        validWorks.map((w, i) => ({ member_id: user.id, song_title: w.song_title, artist_name: w.artist_name, link: w.link, order_index: i }))
      );
    }
    for (let i = 0; i < newDemoFiles.length; i++) {
      const f = newDemoFiles[i];
      const path = `demos/${user.id}/${Date.now()}_${i}.mp3`;
      const { error } = await supabase.storage.from('member-demos').upload(path, f);
      if (!error) {
        const url = supabase.storage.from('member-demos').getPublicUrl(path).data.publicUrl;
        await supabase.from('demo_tracks').insert({ member_id: user.id, file_url: url, file_name: f.name, order_index: demos.length + i });
      }
    }
    await fetchAll(user.id);
    setEditing(false); setSaving(false); setPhotoFile(null); setNewDemoFiles([]);
    showToast(t('✅ 저장됐어요!', '✅ Saved!'));
  };

  // ── 공통 스타일 ──
  const D = theme === 'dark';
  const bg = D ? 'bg-surface-1 text-white' : 'bg-[#E6E6EC] text-[#111]';
  const card = D ? 'bg-surface-2 border-[rgba(255,255,255,0.08)]' : 'bg-white border-black/[0.1] shadow-sm';
  const inputCls = D
    ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-brand-lead/60'
    : 'bg-black/[0.03] border-black/[0.08] text-[#111] placeholder:text-zinc-400 focus:border-brand-lead/60';
  const labelCls = `text-micro font-black uppercase tracking-widest mb-1.5 block ${D ? 'text-zinc-500' : 'text-zinc-400'}`;
  const dimText = D ? 'text-zinc-500' : 'text-zinc-600';
  const divider = D ? 'border-white/[0.07]' : 'border-black/[0.1]';

  const hostId = typeof window !== 'undefined' ? localStorage.getItem('last_host_id') : null;

  if (loading || userType === 'loading') return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-brand-lead border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ════════════════════════════════════════
  // ── HOST MY PAGE ──
  // ════════════════════════════════════════
  if (userType === 'host') {
    const activeLeads = hostLeads.filter(l => !isExpired(l.deadline2 || l.deadline));
    const approvedMembers = hostMembers.filter(m => m.status === 'approved');
    const pendingMembers = hostMembers.filter(m => m.status === 'pending');

    return (
      <>
        <main className={`${bg} font-ui p-5 lg:p-8 relative overflow-hidden`} style={{zoom:1.1, minHeight:'calc(100dvh / 1.1)'}}>
          <div className="relative z-10 max-w-2xl mx-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-baseline gap-2.5">
                <h1 className="font-display text-title text-brand-lead-text uppercase tracking-tighter">LEAD</h1>
                <span className={`text-mini font-bold tracking-[0.2em] ${dimText}`}>HOST PAGE</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/dashboard')}
                  className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-mini font-bold hover:bg-amber-500/20 transition">
                  📊 {t('대시보드', 'Dashboard')}
                </button>
                <LangToggle className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 text-mini font-bold hover:text-white transition" />
                <button onClick={() => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); localStorage.setItem('lead_theme', n); }}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-body ${D ? 'bg-white/5 border-white/10' : 'bg-black/[0.04] border-black/[0.08]'}`}>
                  {D ? '☀️' : '🌙'}
                </button>
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                  className={`text-mini font-bold transition-colors ${D ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}>
                  {t('로그아웃', 'Log out')}
                </button>
              </div>
            </div>

            {/* 호스트 정체성 카드 */}
            <div className={`border rounded-xl overflow-hidden mb-4 ${card}`}>
              <div className="flex items-center gap-4 p-5">
                <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center overflow-hidden shrink-0">
                  {hostProfile?.photo_url
                    ? <img loading="lazy" decoding="async" src={hostProfile.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-title">🎛</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-micro font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">HOST</span>
                  </div>
                  <p className={`font-bold text-lead ${D ? 'text-white' : 'text-[#111]'}`}>{hostProfile?.display_name || user?.email?.split('@')[0]}</p>
                  <p className={`text-mini ${D ? 'text-zinc-500' : 'text-zinc-500'}`}>{user?.email}</p>
                  {hostProfile?.company && <p className={`text-mini mt-0.5 ${D ? 'text-zinc-600' : 'text-zinc-400'}`}>{hostProfile.company}</p>}
                </div>
                <button onClick={openHostEdit}
                  className="shrink-0 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-mini font-bold hover:bg-amber-500/20 transition">
                  ✏️ {t('수정', 'Edit')}
                </button>
              </div>
              {(hostProfile?.roles?.length > 0 || hostProfile?.instagram || hostProfile?.bio) && (
                <div className={`px-5 pb-4 border-t ${D ? 'border-white/[0.06]' : 'border-black/[0.06]'} pt-3`}>
                  {hostProfile?.roles?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {hostProfile.roles.map((r: string) => (
                        <span key={r} className="text-micro font-black px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
                          {ROLES.find(x => x.id === r)?.label || r}
                        </span>
                      ))}
                    </div>
                  )}
                  {hostProfile?.bio && <p className={`text-mini leading-relaxed ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{hostProfile.bio}</p>}
                  {hostProfile?.instagram && (
                    <a href={`https://instagram.com/${hostProfile.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-mini text-brand-lead-text hover:underline">📸 @{hostProfile.instagram}</a>
                  )}
                </div>
              )}
              <div className={`px-5 pb-4 flex gap-2`}>
                <a href={`/card/${user?.id}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2 text-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-mini font-black hover:bg-amber-500/20 transition">
                  🪪 {t('내 컴카드 보기', 'View my comp card')}
                </a>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: t('전체 리드', 'Total leads'), value: hostLeads.length, sub: `${t('활성', 'Active')} ${activeLeads.length}`, color: 'text-brand-lead-text' },
                { label: t('피칭 수신', 'Pitches in'), value: hostPitches.length, sub: t('총 피칭', 'Total'), color: 'text-emerald-400' },
                { label: t('승인 멤버', 'Members'), value: approvedMembers.length, sub: `${t('대기', 'Pending')} ${pendingMembers.length}`, color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className={`cv-row border rounded-xl p-4 ${card}`}>
                  <p className={`text-title font-black ${s.color}`}>{s.value}</p>
                  <p className={`text-mini font-bold ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{s.label}</p>
                  <p className={`text-micro mt-0.5 ${dimText}`}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* 리드 목록 */}
            <div className={`border rounded-xl overflow-hidden mb-4 ${card}`}>
              <div className={`px-5 py-4 border-b ${divider}`}>
                <p className={`font-black text-body ${D ? 'text-white' : 'text-[#111]'}`}>📋 {t('내 리드', 'My leads')}</p>
                <p className={`text-mini mt-0.5 ${dimText}`}>{t('총', 'Total')} {hostLeads.length} · {t('활성', 'Active')} {activeLeads.length}</p>
              </div>
              <div className="p-4 flex flex-col gap-2 max-h-64 overflow-y-auto">
                {hostLeads.length === 0
                  ? <p className={`text-mini text-center py-6 ${dimText}`}>{t('등록된 리드가 없어요', 'No leads yet')}</p>
                  : hostLeads.map(lead => {
                    const expired = isExpired(lead.deadline2 || lead.deadline);
                    const dday = getDDay(lead.deadline2 || lead.deadline);
                    const pCount = hostPitches.filter(p => p.lead_id === lead.id).length;
                    return (
                      <div key={lead.id} className={`cv-row flex items-center gap-3 p-3 rounded-xl border transition ${expired ? 'opacity-40' : ''} ${D ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/10' : 'bg-black/[0.02] border-black/[0.06] hover:border-black/10'}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-body truncate ${D ? 'text-white' : 'text-[#111]'}`}>{lead.artist}</p>
                          <p className={`text-mini truncate ${dimText}`}>{lead.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pCount > 0 && (
                            <span className={`text-micro font-black px-2 py-0.5 rounded-full ${D ? 'bg-white/10 text-zinc-400' : 'bg-black/[0.06] text-zinc-500'}`}>
                              🎵 {pCount}
                            </span>
                          )}
                          {dday && (
                            <span className={`text-micro font-black px-2 py-0.5 rounded-full border ${expired ? 'text-red-400/60 border-red-500/20' : dday === 'D-DAY' ? 'text-yellow-400 border-yellow-500/30' : D ? 'text-zinc-400 border-zinc-700' : 'text-zinc-500 border-zinc-300'}`}>
                              {dday}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* 탭: 피칭 / 멤버 */}
            <div className={`border rounded-xl overflow-hidden ${card}`}>
              <div className={`flex border-b ${divider}`}>
                {(['pitches', 'members'] as const).map(tab => (
                  <button key={tab} onClick={() => setHostTab(tab)}
                    className={`flex-1 py-3.5 text-mini font-black transition ${hostTab === tab
                      ? D ? 'text-white border-b-2 border-brand-lead' : 'text-[#111] border-b-2 border-brand-lead'
                      : dimText}`}>
                    {tab === 'pitches' ? `📨 ${t('수신 피칭', 'Pitches')} (${hostPitches.length})` : `👥 ${t('멤버', 'Members')} (${hostMembers.length})`}
                  </button>
                ))}
              </div>

              {/* 피칭 탭 */}
              {hostTab === 'pitches' && (
                <div className="p-4 flex flex-col gap-3 max-h-96 overflow-y-auto">
                  {/* 정렬 / 필터 컨트롤 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-micro font-black uppercase tracking-widest w-8 shrink-0 ${dimText}`}>{t('정렬', 'Sort')}</span>
                      {([['recent',t('최신순','Recent')],['bpm','BPM'],['vocal',t('보컬','Vocal')],['key','Key']] as const).map(([v,l])=>(
                        <button key={v} onClick={()=>setPitchSort(v)} className={`text-micro font-black px-2.5 py-1 rounded-full border transition ${pitchSort===v?'bg-brand-lead border-brand-lead text-white':D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{l}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-micro font-black uppercase tracking-widest w-8 shrink-0 ${dimText}`}>{t('보컬', 'Vocal')}</span>
                      {([['all',t('전체','All')],['male',t('남성','Male')],['female',t('여성','Female')],['both',t('혼성','Mixed')]] as const).map(([v,l])=>(
                        <button key={v} onClick={()=>setPitchVocalFilter(v)} className={`text-micro font-black px-2.5 py-1 rounded-full border transition ${pitchVocalFilter===v?'bg-brand-lead border-brand-lead text-white':D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const minBpm = (p:any) => { const fs=hostPitchFiles.filter(f=>f.pitch_id===p.id&&f.bpm>0); return fs.length?Math.min(...fs.map(f=>f.bpm)):99999; };
                    const firstVocal = (p:any) => { const f=hostPitchFiles.find(x=>x.pitch_id===p.id&&x.vocal_gender); return f?.vocal_gender||'zzz'; };
                    const firstKey = (p:any) => { const f=hostPitchFiles.find(x=>x.pitch_id===p.id&&x.key); return f?.key||'zzz'; };
                    let view = hostPitches;
                    if (pitchVocalFilter !== 'all') view = view.filter(p => hostPitchFiles.some(f => f.pitch_id===p.id && f.vocal_gender===pitchVocalFilter));
                    view = [...view].sort((a,b)=>{
                      if(pitchSort==='bpm')return minBpm(a)-minBpm(b);
                      if(pitchSort==='vocal')return firstVocal(a).localeCompare(firstVocal(b));
                      if(pitchSort==='key')return firstKey(a).localeCompare(firstKey(b));
                      return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
                    });
                    return view.length === 0
                    ? <p className={`text-mini text-center py-8 ${dimText}`}>{hostPitches.length===0?t('아직 피칭이 없어요','No pitches yet'):t('조건에 맞는 피칭이 없어요','No pitches match')}</p>
                    : view.map(p => {
                      const lead = hostLeads.find(l => l.id === p.lead_id);
                      const files = hostPitchFiles.filter(f => f.pitch_id === p.id);
                      return (
                        <div key={p.id} className={`cv-row p-4 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-body ${D ? 'text-white' : 'text-[#111]'}`}>
                                {p.artist_name}
                                {lead && <span className={`font-normal ml-2 text-mini ${dimText}`}>→ {lead.artist}</span>}
                              </p>
                              <p className={`text-mini mt-0.5 ${dimText}`}>
                                {p.contact} · {fmtDate(p.created_at, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {files.length > 0 && (
                              <span className={`text-micro font-black px-2 py-0.5 rounded-full shrink-0 ml-2 ${D ? 'bg-white/10 text-zinc-400' : 'bg-black/[0.06] text-zinc-500'}`}>
                                🎵 {files.length}
                              </span>
                            )}
                          </div>
                          {p.message && (
                            <p className={`text-mini leading-relaxed whitespace-pre-line ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.message}</p>
                          )}
                          {files.length > 0 && (
                            <div className="flex flex-col gap-2 mt-2">
                              {files.map((f: any) => {
                                const vLabel = f.vocal_gender==='male'?t('남성','Male'):f.vocal_gender==='female'?t('여성','Female'):f.vocal_gender==='both'?t('혼성','Mixed'):'';
                                return (
                                <div key={f.id} className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg ${D ? 'bg-black/20' : 'bg-black/[0.04]'}`}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-mini">🎵</span>
                                    <span className={`flex-1 min-w-0 text-mini truncate ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{f.file_name || 'audio.mp3'}</span>
                                    {vLabel && <span className="text-micro font-black px-1.5 py-0.5 rounded-lg bg-brand-lead/15 text-brand-lead-text">{vLabel}</span>}
                                    {f.bpm > 0 && <span className={`text-micro font-black ${dimText}`}>{f.bpm}BPM</span>}
                                    {f.key && <span className={`text-micro font-black ${dimText}`}>{f.key}</span>}
                                    {f.genre && <span className="text-micro font-black text-emerald-400">{f.genre}</span>}
                                  </div>
                                  {f.file_url && <audio controls preload="none" src={f.file_url} className="w-full h-8" style={{height:'32px',colorScheme:D?'dark':'light'}} />}
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* 멤버 탭 */}
              {hostTab === 'members' && (
                <div className="p-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {hostMembers.length === 0
                    ? <p className={`text-mini text-center py-8 ${dimText}`}>{t('승인된 멤버가 없어요', 'No approved members')}</p>
                    : hostMembers.map((a: any) => {
                      const m = a.members;
                      const statusCls = a.status === 'approved'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : a.status === 'pending'
                          ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                          : 'text-red-400 border-red-500/30 bg-red-500/10';
                      const statusLabel = a.status === 'approved' ? t('승인', 'Approved') : a.status === 'pending' ? t('대기', 'Pending') : t('거절', 'Rejected');
                      return (
                        <div key={a.id} className={`cv-row flex items-center gap-3 p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-lead/10 border border-brand-lead/20 flex items-center justify-center shrink-0">
                            {m?.photo_url
                              ? <img loading="lazy" decoding="async" src={m.photo_url} alt="" className="w-full h-full object-cover" />
                              : <span className="text-body font-black text-brand-lead-text">{(m?.artist_name || '?')[0].toUpperCase()}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-body ${D ? 'text-white' : 'text-[#111]'}`}>{m?.artist_name || '—'}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {m?.roles?.slice(0, 2).map((r: string) => (
                                <span key={r} className={`text-micro font-black px-1.5 py-0.5 rounded-lg ${D ? 'bg-white/5 text-zinc-500' : 'bg-black/[0.05] text-zinc-400'}`}>
                                  {roleLabels[r] || r}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className={`text-micro font-black px-2 py-0.5 rounded-full border shrink-0 ${statusCls}`}>{statusLabel}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {hostEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md font-ui p-4 overflow-y-auto" onClick={() => setHostEditing(false)}>
              <div role="dialog" aria-modal="true" tabIndex={-1} className={`w-full max-w-lg border rounded-xl shadow-2xl my-4 ${D ? 'bg-[#0E0E0E] border-white/[0.07]' : 'bg-white border-black/[0.08]'}`} onClick={e => e.stopPropagation()}>
                <div className="p-6 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className={`font-black text-sub ${D ? 'text-white' : 'text-[#111]'}`}>{t('호스트 프로필 수정', 'Edit host profile')}</h2>
                    <button onClick={() => setHostEditing(false)} className={`text-body ${dimText}`}>✕</button>
                  </div>
                  <div className="flex flex-col gap-4">
                    {/* 사진 */}
                    <div className="flex items-center gap-4">
                      <button onClick={() => hostPhotoRef.current?.click()} className="relative group">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-amber-500/10 border-2 border-dashed border-amber-500/30 flex items-center justify-center">
                          {hostPhotoPreview ? <img loading="lazy" decoding="async" src={hostPhotoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-sub">📷</span>}
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-micro font-bold">{t('변경', 'Change')}</span>
                        </div>
                      </button>
                      <input ref={hostPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { setHostPhotoFile(e.target.files[0]); setHostPhotoPreview(URL.createObjectURL(e.target.files[0])); } }} />
                      <p className={`text-mini ${dimText}`}>{t('사진 클릭해서 변경', 'Click the photo to change')}</p>
                    </div>

                    <div>
                      <label className={labelCls}>{t('이메일', 'Email')}</label>
                      <p className={`text-body px-3 py-2.5 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06] text-zinc-500' : 'bg-black/[0.02] border-black/[0.06] text-zinc-400'}`}>{user?.email}</p>
                    </div>
                    <div>
                      <label className={labelCls}>{t('표시 이름', 'Display name')}</label>
                      <input value={hostDisplayName} onChange={e => setHostDisplayName(e.target.value)} placeholder={t('이름 또는 스튜디오명', 'Name or studio')} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('소속 / 레이블', 'Company / Label')}</label>
                      <input value={hostCompany} onChange={e => setHostCompany(e.target.value)} placeholder={t('회사명 또는 프리랜서', 'Company or freelance')} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('인스타그램', 'Instagram')}</label>
                      <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-body font-bold ${dimText}`}>@</span>
                        <input value={hostInstagram} onChange={e => setHostInstagram(e.target.value)} placeholder="username" className={`w-full border rounded-xl pl-7 pr-3 py-2.5 text-body outline-none transition ${inputCls}`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{t('한 줄 소개', 'Bio')}</label>
                      <textarea value={hostBio} onChange={e => setHostBio(e.target.value)} placeholder={t('간단한 소개를 입력하세요', 'A short intro')} rows={2} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition resize-none ${inputCls}`} />
                    </div>
                    <div>
                      <label className={labelCls}>{t('역할', 'Roles')}</label>
                      <div className="flex flex-wrap gap-2">
                        {ROLES.map(r => (
                          <button key={r.id} onClick={() => setHostRoles(p => p.includes(r.id) ? p.filter(x => x !== r.id) : [...p, r.id])}
                            className={`px-3 py-1.5 rounded-xl border text-mini font-bold transition ${hostRoles.includes(r.id) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{t('선호 장르', 'Genres')}</label>
                      <div className="flex flex-wrap gap-2">
                        {GENRES.map(g => (
                          <button key={g.id} onClick={() => setHostGenres(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])}
                            className={`px-3 py-1.5 rounded-xl border text-mini font-bold transition ${hostGenres.includes(g.id) ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setHostEditing(false)}
                      className={`flex-1 py-3 rounded-xl border font-bold text-body ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500'}`}>
                      {t('취소', 'Cancel')}
                    </button>
                    <button onClick={saveHostProfile} disabled={hostSaving}
                      className="flex-1 py-3 rounded-xl bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition disabled:opacity-50">
                      {hostSaving ? t('저장 중...', 'Saving…') : t('저장', 'Save')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-white/10 backdrop-blur-md border border-white/20 text-white text-mini font-bold px-5 py-3 rounded-xl shadow-2xl font-ui">{toast}</div>
          )}
        </main>
      </>
    );
  }

  // ════════════════════════════════════════
  // ── MEMBER MY PAGE ──
  // ════════════════════════════════════════
  return (
    <>
      <main className={`${bg} font-ui p-5 lg:p-8 relative overflow-hidden`} style={{zoom:1.1, minHeight:'calc(100dvh / 1.1)'}}>
        <div className="relative z-10 max-w-2xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-baseline gap-2.5">
              <h1 className="font-display text-title text-brand-lead-text uppercase tracking-tighter">LEAD</h1>
              <span className={`text-mini font-bold tracking-[0.2em] ${dimText}`}>MY PAGE</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { if (window.history.length > 1) router.back(); else router.push('/'); }}
                className={`px-3 py-1.5 rounded-xl border text-mini font-bold transition ${D ? 'border-white/10 bg-white/5 text-zinc-300 hover:text-white' : 'border-black/[0.08] bg-black/[0.04] text-zinc-600 hover:text-[#111]'}`}>
                ← {t('돌아가기', 'Back')}
              </button>
              <LangToggle className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 text-mini font-bold hover:text-white transition" />
              <button onClick={() => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); localStorage.setItem('lead_theme', n); }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-body ${D ? 'bg-white/5 border-white/10' : 'bg-black/[0.04] border-black/[0.08]'}`}>
                {D ? '☀️' : '🌙'}
              </button>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                className={`text-mini font-bold transition-colors ${D ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}>
                {t('로그아웃', 'Log out')}
              </button>
            </div>
          </div>

          {/* 프로필 카드 */}
          <div className={`border rounded-xl overflow-hidden mb-5 ${card}`}>
            <div className={`p-6 border-b ${divider}`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-lead/10 border border-brand-lead/20 flex items-center justify-center shrink-0">
                  {member?.photo_url
                    ? <img loading="lazy" decoding="async" src={member.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-title font-black text-brand-lead-text">{(member?.artist_name || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className={`font-black text-sub ${D ? 'text-white' : 'text-[#111]'}`}>{member?.artist_name}</h2>
                    {member?.roles?.map((r: string) => (
                      <span key={r} className="text-micro font-black px-2 py-0.5 rounded-full bg-brand-lead/10 border border-brand-lead/20 text-brand-lead-text">
                        {roleLabels[r] || r}
                      </span>
                    ))}
                  </div>
                  <p className={`text-mini ${dimText}`}>{member?.name}{member?.company && ` · ${member.company}`}</p>
                  {member?.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {member.genres.map((g: string) => (
                        <span key={g} className={`text-micro font-bold px-1.5 py-0.5 rounded-lg ${D ? 'bg-white/5 text-zinc-500' : 'bg-black/[0.05] text-zinc-400'}`}>
                          {g.startsWith('ETC:') ? g.slice(4) : g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={openEdit}
                    className="px-3 py-2 rounded-xl bg-brand-lead/10 border border-brand-lead/20 text-brand-lead-text text-mini font-bold hover:bg-brand-lead/20 transition">
                    ✏️ {t('수정', 'Edit')}
                  </button>
                  <a href={`/card/${user?.id}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-mini font-bold hover:text-white transition text-center">
                    🪪 {t('컴카드', 'Card')}
                  </a>
                </div>
              </div>
            </div>

            {member?.bio && (
              <div className={`px-6 py-4 border-b ${divider}`}>
                <p className={labelCls}>{t('바이오', 'Bio')}</p>
                <p className={`text-body leading-relaxed whitespace-pre-line ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{member.bio}</p>
              </div>
            )}
            <div className={`px-6 py-4 border-b ${divider} flex flex-wrap gap-4`}>
              {member?.email && (
                <div><p className={labelCls}>{t('이메일', 'Email')}</p><p className={`text-body ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{member.email}</p></div>
              )}
              {member?.instagram && (
                <div>
                  <p className={labelCls}>{t('인스타그램', 'Instagram')}</p>
                  <a href={`https://instagram.com/${member.instagram}`} target="_blank" rel="noopener noreferrer" className="text-body text-brand-lead-text hover:underline">@{member.instagram}</a>
                </div>
              )}
              {(cp?.pro || cp?.ipi) && (
                <div>
                  <p className={labelCls}>{t('저작권 정보', 'Copyright')} <span className="normal-case tracking-normal font-bold text-micro px-1.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 ml-1">{t('내부용', 'internal')}</span></p>
                  <p className={`text-body ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{[cp?.pro, cp?.ipi].filter(Boolean).join(' · ')}</p>
                </div>
              )}
            </div>

            <div className={`px-6 py-4 border-b ${divider}`}>
              <p className={labelCls}>{t('데모곡', 'Demos')}</p>
              {demos.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {demos.map(d => (
                    <div key={d.id} className={`cv-row flex items-center gap-3 p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <span className="text-body">🎵</span>
                      <span className={`flex-1 text-mini font-bold truncate ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{d.file_name}</span>
                      <button onClick={async () => {
                        const path = d.file_url.split('/member-demos/')[1];
                        if (!path) return;
                        const { data: signed } = await supabase.storage.from('member-demos').createSignedUrl(decodeURIComponent(path), 60);
                        if (!signed) return;
                        try {
                          const res = await fetch(signed.signedUrl);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = d.file_name || 'demo.mp3';
                          document.body.appendChild(a); a.click();
                          document.body.removeChild(a); URL.revokeObjectURL(url);
                        } catch { showToast(t('다운로드 실패', 'Download failed')); }
                      }} className="text-brand-lead-text text-mini font-bold hover:underline">⬇ {t('다운', 'Get')}</button>
                    </div>
                  ))}
                </div>
              ) : <p className={`text-mini ${dimText}`}>{t('등록된 데모곡이 없어요', 'No demos yet')}</p>}
              {member?.demo_link && (
                <a href={member.demo_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-mini text-brand-lead-text hover:underline">🔗 {t('추가 데모 링크', 'More demos')}</a>
              )}
            </div>

            <div className="px-6 py-4">
              <p className={labelCls}>{t('최근 컷난 작업물', 'Recent released works')}</p>
              {works.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {works.map((w, i) => (
                    <a key={i} href={w.link} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl border transition hover:border-brand-lead/30 ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <div className="w-8 h-8 rounded-lg bg-brand-lead/10 border border-brand-lead/20 flex items-center justify-center shrink-0">
                        <span className="text-mini">🎶</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-mini font-bold truncate ${D ? 'text-zinc-200' : 'text-zinc-700'}`}>{w.song_title}</p>
                        <p className={`text-mini ${dimText}`}>{w.artist_name}</p>
                      </div>
                      <span className="text-brand-lead-text text-mini">→</span>
                    </a>
                  ))}
                </div>
              ) : <p className={`text-mini ${dimText}`}>{t('등록된 작업물이 없어요', 'No works yet')}</p>}
            </div>
          </div>

          {/* 내가 피칭한 곡 */}
          {myPitches.length > 0 && (
            <div className={`border rounded-xl overflow-hidden mt-5 ${card}`}>
              <div className={`p-5 border-b ${divider}`}>
                <p className={`font-black text-body ${D ? 'text-white' : 'text-[#111]'}`}>📨 {t('내가 피칭한 곡', 'My pitches')}</p>
                <p className={`text-mini mt-0.5 ${dimText}`}>{t('총', 'Total')} {myPitches.length}</p>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {myPitches.map(p => {
                  const lead = myLeads.find(l => l.id === p.lead_id);
                  const files = myPitchFiles.filter(f => f.pitch_id === p.id);
                  return (
                    <div key={p.id} className={`cv-row p-4 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-body ${D ? 'text-white' : 'text-[#111]'}`}>
                            {lead?.artist || '—'} <span className={`font-normal ${dimText}`}>— {lead?.title || ''}</span>
                          </p>
                          <p className={`text-mini mt-0.5 ${dimText}`}>
                            {fmtDate(p.created_at, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {files.length > 0 && (
                          <span className={`text-micro font-black px-2 py-0.5 rounded-full shrink-0 ${D ? 'bg-white/10 text-zinc-400' : 'bg-black/[0.06] text-zinc-500'}`}>🎵 {files.length}</span>
                        )}
                      </div>
                      {p.message && <p className={`text-mini leading-relaxed whitespace-pre-line mb-2 ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.message}</p>}
                      {files.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                          {files.map((f: any) => {
                            const vLabel = f.vocal_gender==='male'?t('남성','Male'):f.vocal_gender==='female'?t('여성','Female'):f.vocal_gender==='both'?t('혼성','Mixed'):'';
                            return (
                            <div key={f.id} className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg ${D ? 'bg-black/20' : 'bg-black/[0.03]'}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-mini">🎵</span>
                                <span className={`flex-1 min-w-0 text-mini truncate ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{f.file_name || 'audio.mp3'}</span>
                                {vLabel && <span className="text-micro font-black px-1.5 py-0.5 rounded-lg bg-brand-lead/15 text-brand-lead-text">{vLabel}</span>}
                                {f.bpm > 0 && <span className={`text-micro font-black ${dimText}`}>{f.bpm}BPM</span>}
                                {f.key && <span className={`text-micro font-black ${dimText}`}>{f.key}</span>}
                                {f.genre && <span className="text-micro font-black text-emerald-400">{f.genre}</span>}
                              </div>
                              {f.file_url && <audio controls preload="none" src={f.file_url} className="w-full" style={{height:'32px',colorScheme:D?'dark':'light'}} />}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 수정 모달 */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md font-ui p-4 overflow-y-auto" onClick={() => setEditing(false)}>
            <div role="dialog" aria-modal="true" tabIndex={-1} className={`w-full max-w-lg border rounded-xl shadow-2xl my-4 ${D ? 'bg-[#0E0E0E] border-white/[0.07]' : 'bg-white border-black/[0.08]'}`} onClick={e => e.stopPropagation()}>
              <div className="p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h2 className={`font-black text-sub ${D ? 'text-white' : 'text-[#111]'}`}>{t('프로필 수정', 'Edit profile')}</h2>
                  <button onClick={() => setEditing(false)} className={`text-body ${dimText}`}>✕</button>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => photoRef.current?.click()} className="relative group">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-lead/10 border-2 border-dashed border-brand-lead/30 flex items-center justify-center">
                        {photoPreview ? <img loading="lazy" decoding="async" src={photoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-sub">📷</span>}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-micro font-bold">{t('변경', 'Change')}</span>
                      </div>
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoChange(e.target.files[0])} />
                    <p className={`text-mini ${dimText}`}>{t('사진 클릭해서 변경', 'Click the photo to change')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>{t('실명', 'Legal name')}</label><input value={name} onChange={e => setName(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`} /></div>
                    <div><label className={labelCls}>{t('활동명', 'Stage name')}</label><input value={artistName} onChange={e => setArtistName(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`} /></div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('성별', 'Gender')}</label>
                    <div className="flex gap-2">
                      {[['male', t('남성','Male')], ['female', t('여성','Female')], ['other', t('기타','Other')]].map(([v, l]) => (
                        <button key={v} onClick={() => setGender(v)}
                          className={`flex-1 py-2 rounded-xl border text-mini font-bold transition ${gender === v ? 'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div><label className={labelCls}>{t('소속 회사', 'Company')}</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder={t('회사명 또는 프리랜서', 'Company or freelance')} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`} /></div>
                  <div><label className={labelCls}>{t('이메일', 'Email')}</label><input value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" spellCheck={false} type="email" className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`} /></div>
                  <div>
                    <label className={labelCls}>{t('인스타그램', 'Instagram')}</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-body font-bold ${dimText}`}>@</span>
                      <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="username" className={`w-full border rounded-xl pl-7 pr-3 py-2.5 text-body outline-none transition ${inputCls}`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('역할', 'Roles')}</label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map(r => (
                        <button key={r.id} onClick={() => toggleArr(roles, r.id, setRoles)}
                          className={`px-3 py-1.5 rounded-xl border text-mini font-bold transition ${roles.includes(r.id) ? 'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('선호 장르', 'Genres')}</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => (
                        <button key={g.id} onClick={() => toggleArr(genres, g.id, setGenres)}
                          className={`px-3 py-1.5 rounded-xl border text-mini font-bold transition ${genres.includes(g.id) ? 'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                    {genres.includes('ETC') && (
                      <input value={genreEtc} onChange={e => setGenreEtc(e.target.value)} placeholder={t('장르 직접 입력', 'Custom genre')} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition mt-2 ${inputCls}`} />
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>{t('데모곡', 'Demos')}</label>
                    {demos.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-2">
                        {demos.map(d => (
                          <div key={d.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                            <span className="text-body">🎵</span>
                            <span className={`flex-1 text-mini truncate ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{d.file_name}</span>
                            <button onClick={() => deleteDemo(d)} className="text-red-400/60 hover:text-red-400 text-mini font-bold">{t('삭제', 'Delete')}</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {demos.length + newDemoFiles.length < 3 && (
                      <>
                        <input ref={demoRef} type="file" accept=".mp3,audio/mpeg" multiple className="hidden"
                          onChange={e => { const files = Array.from(e.target.files || []).slice(0, 3 - demos.length - newDemoFiles.length); setNewDemoFiles(p => [...p, ...files]); e.target.value = ''; }} />
                        <button onClick={() => demoRef.current?.click()}
                          className={`w-full py-2.5 rounded-xl border-2 border-dashed text-mini font-bold transition ${D ? 'border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:border-black/20'}`}>
                          {t('+ 데모곡 추가', '+ Add demo')} ({3 - demos.length - newDemoFiles.length} {t('개 남음', 'left')})
                        </button>
                      </>
                    )}
                    {newDemoFiles.length > 0 && (
                      <div className="flex flex-col gap-1 mt-2">
                        {newDemoFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-lead/5 border border-brand-lead/20">
                            <span className="text-mini">🎵</span>
                            <span className="flex-1 text-mini text-brand-lead-text truncate">{f.name}</span>
                            <button onClick={() => setNewDemoFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-400/60 text-micro">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <label className={labelCls}>{t('추가 데모 링크', 'More demos link')}</label>
                      <input value={demoLink} onChange={e => setDemoLink(e.target.value)} placeholder="https://..." className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('바이오 (공개)', 'Bio (public)')}</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder={t('소개, 대표 스타일, 이력 등 — 컴카드에 공개돼요', 'Intro, style, background — shown on your public card')} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition resize-none ${inputCls}`} />
                  </div>

                  <div>
                    <label className={labelCls}>{t('SNS · 링크 (공개)', 'SNS · Links (public)')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([['spotify','Spotify'],['youtube','YouTube'],['soundcloud','SoundCloud'],['x','X (Twitter)'],['tiktok','TikTok'],['website',t('웹사이트','Website')]] as const).map(([k,l])=>(
                        <input key={k} value={links[k]||''} onChange={e=>setLink(k,e.target.value)} placeholder={l} className={`w-full border rounded-lg px-2.5 py-2 text-mini outline-none ${inputCls}`} />
                      ))}
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.07]' : 'bg-black/[0.02] border-black/[0.08]'}`}>
                    <label className={labelCls}>{t('저작권 정보 (내부용)', 'Copyright info (internal)')}</label>
                    <p className={`text-mini mb-3 ${dimText}`}>{t('공개 카드에는 표시되지 않아요. 스플릿시트 자동채움과 워크스페이스 내부에서만 쓰여요.', 'Not shown on your public card. Used for split-sheet auto-fill and inside workspaces only.')}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input value={cpLegalName} onChange={e => setCpLegalName(e.target.value)} placeholder={t('본명 (법적 이름)', 'Legal name')} className={`w-full border rounded-lg px-2.5 py-2 text-mini outline-none ${inputCls}`} />
                      <input value={cpPhone} onChange={e => setCpPhone(e.target.value)} placeholder={t('연락처', 'Phone')} className={`w-full border rounded-lg px-2.5 py-2 text-mini outline-none ${inputCls}`} />
                      <input value={cpPro} onChange={e => setCpPro(e.target.value)} placeholder={t('협회 (예: KOMCA)', 'PRO (e.g. KOMCA)')} className={`w-full border rounded-lg px-2.5 py-2 text-mini outline-none ${inputCls}`} />
                      <input value={cpIpi} onChange={e => setCpIpi(e.target.value)} placeholder={t('회원번호 / IPI', 'Member no. / IPI')} className={`w-full border rounded-lg px-2.5 py-2 text-mini outline-none ${inputCls}`} />
                      <input value={cpPublisher} onChange={e => setCpPublisher(e.target.value)} placeholder={t('퍼블리셔 (선택)', 'Publisher (optional)')} className={`w-full border rounded-lg px-2.5 py-2 text-mini outline-none ${inputCls}`} />
                      <input value={cpPublisherIpi} onChange={e => setCpPublisherIpi(e.target.value)} placeholder={t('퍼블리셔 IPI (선택)', 'Publisher IPI (optional)')} className={`w-full border rounded-lg px-2.5 py-2 text-mini outline-none ${inputCls}`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('최근 컷난 작업물', 'Recent released works')}</label>
                    <div className="flex flex-col gap-2">
                      {editWorks.map((w, i) => (
                        <div key={i} className={`cv-row p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="flex justify-between mb-2">
                            <span className={`text-micro font-black ${dimText}`}>#{i + 1}</span>
                            <button onClick={() => setEditWorks(p => p.filter((_, idx) => idx !== i))} className="text-red-400/60 hover:text-red-400 text-mini">{t('삭제', 'Delete')}</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input value={w.song_title} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, song_title: e.target.value } : x))} placeholder={t('곡명', 'Song title')} className={`w-full border rounded-lg px-2.5 py-1.5 text-mini outline-none ${inputCls}`} />
                            <input value={w.artist_name} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, artist_name: e.target.value } : x))} placeholder={t('아티스트명', 'Artist')} className={`w-full border rounded-lg px-2.5 py-1.5 text-mini outline-none ${inputCls}`} />
                          </div>
                          <input value={w.link} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, link: e.target.value } : x))} placeholder={t('링크', 'Link')} className={`w-full border rounded-lg px-2.5 py-1.5 text-mini outline-none ${inputCls}`} />
                        </div>
                      ))}
                      {editWorks.length < 5 && (
                        <button onClick={() => setEditWorks(p => [...p, { song_title: '', artist_name: '', link: '' }])}
                          className={`py-2 rounded-xl border border-dashed text-mini font-bold ${D ? 'border-white/10 text-zinc-600 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:text-zinc-600'}`}>
                          + {t('추가', 'Add')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditing(false)}
                    className={`flex-1 py-3 rounded-xl border font-bold text-body ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500'}`}>
                    {t('취소', 'Cancel')}
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition disabled:opacity-50">
                    {saving ? t('저장 중...', 'Saving…') : t('저장', 'Save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-white/10 backdrop-blur-md border border-white/20 text-white text-mini font-bold px-5 py-3 rounded-xl shadow-2xl font-ui">{toast}</div>
        )}
      </main>
    </>
  );
}
