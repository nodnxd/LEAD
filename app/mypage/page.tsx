'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';

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

type Work = { id?: string; song_title: string; artist_name: string; link: string; order_index?: number };
type Demo = { id?: string; file_url: string; file_name: string; order_index?: number };

const isExpired = (d: string | null) => !!d && new Date(d) < new Date(new Date().toDateString());
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
      const [{ data: d }, { data: w }, { data: pitches }] = await Promise.all([
        supabase.from('demo_tracks').select('*').eq('member_id', uid).order('order_index'),
        supabase.from('released_works').select('*').eq('member_id', uid).order('order_index'),
        supabase.from('pitches').select('*').eq('member_id', uid).order('created_at', { ascending: false }),
      ]);
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
    const [{ data: leads }, { data: pitches }, { data: approvals }] = await Promise.all([
      supabase.from('leads').select('*').eq('host_id', uid).order('created_at', { ascending: false }),
      supabase.from('pitches').select('*').eq('host_id', uid).order('created_at', { ascending: false }),
      supabase.from('member_approvals')
        .select('*, members(id, artist_name, name, roles, photo_url, genres)')
        .eq('host_id', uid),
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
    showToast('🗑 삭제됐어요');
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
      instagram: instagram || null, photo_url: photoUrl,
      roles, genres: finalGenres, genre_etc: genreEtc || null, demo_link: demoLink || null,
    }).eq('id', user.id);
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
    showToast('✅ 저장됐어요!');
  };

  // ── 공통 스타일 ──
  const D = theme === 'dark';
  const bg = D ? 'bg-[#050505] text-white' : 'bg-[#F0F0F5] text-[#111]';
  const card = D ? 'bg-[#0E0E0E] border-white/[0.07]' : 'bg-white border-black/[0.1] shadow-sm';
  const inputCls = D
    ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-[#5B8CFF]/60'
    : 'bg-black/[0.03] border-black/[0.08] text-[#111] placeholder:text-zinc-400 focus:border-[#5B8CFF]/60';
  const labelCls = `text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D ? 'text-zinc-500' : 'text-zinc-400'}`;
  const dimText = D ? 'text-zinc-500' : 'text-zinc-600';
  const divider = D ? 'border-white/[0.07]' : 'border-black/[0.1]';

  const hostId = typeof window !== 'undefined' ? localStorage.getItem('last_host_id') : null;

  if (loading || userType === 'loading') return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin" />
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
        <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}` }} />
        <main className={`min-h-screen ${bg} font-pretendard p-5 lg:p-8 relative overflow-hidden`}>
          <div className={`absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-amber-500 rounded-full mix-blend-screen filter blur-[180px] ${D ? 'opacity-[0.04]' : 'opacity-[0.02]'} pointer-events-none`} />
          <div className={`absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[180px] ${D ? 'opacity-[0.04]' : 'opacity-[0.02]'} pointer-events-none`} />

          <div className="relative z-10 max-w-2xl mx-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-baseline gap-2.5">
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 uppercase tracking-tighter">LEAD</h1>
                <span className={`text-[11px] font-bold tracking-[0.2em] ${dimText}`}>HOST PAGE</span>
              </div>
              <div className="flex items-center gap-2">
                {hostId && (
                  <button onClick={() => router.push(`/view/${hostId}`)}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
                    ← 뷰 페이지
                  </button>
                )}
                <button onClick={() => router.push('/dashboard')}
                  className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition-all">
                  📊 대시보드
                </button>
                <button onClick={() => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); localStorage.setItem('lead_theme', n); }}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[15px] ${D ? 'bg-white/5 border-white/10' : 'bg-black/[0.04] border-black/[0.08]'}`}>
                  {D ? '☀️' : '🌙'}
                </button>
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                  className={`text-[11px] font-bold transition-colors ${D ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}>
                  로그아웃
                </button>
              </div>
            </div>

            {/* 호스트 정체성 카드 */}
            <div className={`border rounded-2xl p-5 mb-4 ${card}`}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="text-2xl">🎛</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">HOST</span>
                  </div>
                  <p className={`text-[13px] font-bold ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{user?.email}</p>
                </div>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: '전체 리드', value: hostLeads.length, sub: `활성 ${activeLeads.length}`, color: 'text-[#5B8CFF]' },
                { label: '피칭 수신', value: hostPitches.length, sub: '총 피칭', color: 'text-emerald-400' },
                { label: '승인 멤버', value: approvedMembers.length, sub: `대기 ${pendingMembers.length}`, color: 'text-amber-400' },
              ].map(s => (
                <div key={s.label} className={`border rounded-2xl p-4 ${card}`}>
                  <p className={`text-[24px] font-black ${s.color}`}>{s.value}</p>
                  <p className={`text-[11px] font-bold ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{s.label}</p>
                  <p className={`text-[10px] mt-0.5 ${dimText}`}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* 리드 목록 */}
            <div className={`border rounded-2xl overflow-hidden mb-4 ${card}`}>
              <div className={`px-5 py-4 border-b ${divider}`}>
                <p className={`font-black text-[14px] ${D ? 'text-white' : 'text-[#111]'}`}>📋 내 리드</p>
                <p className={`text-[11px] mt-0.5 ${dimText}`}>총 {hostLeads.length}개 · 활성 {activeLeads.length}개</p>
              </div>
              <div className="p-4 flex flex-col gap-2 max-h-64 overflow-y-auto">
                {hostLeads.length === 0
                  ? <p className={`text-[12px] text-center py-6 ${dimText}`}>등록된 리드가 없어요</p>
                  : hostLeads.map(lead => {
                    const expired = isExpired(lead.deadline2 || lead.deadline);
                    const dday = getDDay(lead.deadline2 || lead.deadline);
                    const pCount = hostPitches.filter(p => p.lead_id === lead.id).length;
                    return (
                      <div key={lead.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${expired ? 'opacity-40' : ''} ${D ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/10' : 'bg-black/[0.02] border-black/[0.06] hover:border-black/10'}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-[13px] truncate ${D ? 'text-white' : 'text-[#111]'}`}>{lead.artist}</p>
                          <p className={`text-[11px] truncate ${dimText}`}>{lead.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pCount > 0 && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${D ? 'bg-white/10 text-zinc-400' : 'bg-black/[0.06] text-zinc-500'}`}>
                              🎵 {pCount}
                            </span>
                          )}
                          {dday && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${expired ? 'text-red-400/60 border-red-500/20' : dday === 'D-DAY' ? 'text-yellow-400 border-yellow-500/30' : D ? 'text-zinc-400 border-zinc-700' : 'text-zinc-500 border-zinc-300'}`}>
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
            <div className={`border rounded-2xl overflow-hidden ${card}`}>
              <div className={`flex border-b ${divider}`}>
                {(['pitches', 'members'] as const).map(tab => (
                  <button key={tab} onClick={() => setHostTab(tab)}
                    className={`flex-1 py-3.5 text-[12px] font-black transition-all ${hostTab === tab
                      ? D ? 'text-white border-b-2 border-[#5B8CFF]' : 'text-[#111] border-b-2 border-[#5B8CFF]'
                      : dimText}`}>
                    {tab === 'pitches' ? `📨 수신 피칭 (${hostPitches.length})` : `👥 멤버 (${hostMembers.length})`}
                  </button>
                ))}
              </div>

              {/* 피칭 탭 */}
              {hostTab === 'pitches' && (
                <div className="p-4 flex flex-col gap-3 max-h-96 overflow-y-auto">
                  {hostPitches.length === 0
                    ? <p className={`text-[12px] text-center py-8 ${dimText}`}>아직 피칭이 없어요</p>
                    : hostPitches.map(p => {
                      const lead = hostLeads.find(l => l.id === p.lead_id);
                      const files = hostPitchFiles.filter(f => f.pitch_id === p.id);
                      return (
                        <div key={p.id} className={`p-4 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-[13px] ${D ? 'text-white' : 'text-[#111]'}`}>
                                {p.artist_name}
                                {lead && <span className={`font-normal ml-2 text-[12px] ${dimText}`}>→ {lead.artist}</span>}
                              </p>
                              <p className={`text-[11px] mt-0.5 ${dimText}`}>
                                {p.contact} · {new Date(p.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {files.length > 0 && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ml-2 ${D ? 'bg-white/10 text-zinc-400' : 'bg-black/[0.06] text-zinc-500'}`}>
                                🎵 {files.length}
                              </span>
                            )}
                          </div>
                          {p.message && (
                            <p className={`text-[12px] leading-relaxed whitespace-pre-line ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.message}</p>
                          )}
                          {files.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              {files.map((f: any) => (
                                <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${D ? 'bg-black/20' : 'bg-black/[0.04]'}`}>
                                  <span className="text-[12px]">🎵</span>
                                  <span className={`flex-1 text-[11px] truncate ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{f.file_name || 'audio.mp3'}</span>
                                  {f.bpm > 0 && <span className={`text-[10px] font-black ${dimText}`}>{f.bpm}BPM</span>}
                                  {f.genre && <span className="text-[10px] font-black text-[#5B8CFF]">{f.genre}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* 멤버 탭 */}
              {hostTab === 'members' && (
                <div className="p-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {hostMembers.length === 0
                    ? <p className={`text-[12px] text-center py-8 ${dimText}`}>승인된 멤버가 없어요</p>
                    : hostMembers.map((a: any) => {
                      const m = a.members;
                      const statusCls = a.status === 'approved'
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : a.status === 'pending'
                          ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                          : 'text-red-400 border-red-500/30 bg-red-500/10';
                      const statusLabel = a.status === 'approved' ? '승인' : a.status === 'pending' ? '대기' : '거절';
                      return (
                        <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center shrink-0">
                            {m?.photo_url
                              ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                              : <span className="text-[13px] font-black text-[#5B8CFF]">{(m?.artist_name || '?')[0].toUpperCase()}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-[13px] ${D ? 'text-white' : 'text-[#111]'}`}>{m?.artist_name || '—'}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {m?.roles?.slice(0, 2).map((r: string) => (
                                <span key={r} className={`text-[9px] font-black px-1.5 py-0.5 rounded ${D ? 'bg-white/5 text-zinc-500' : 'bg-black/[0.05] text-zinc-400'}`}>
                                  {roleLabels[r] || r}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${statusCls}`}>{statusLabel}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {toast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-white/10 backdrop-blur-md border border-white/20 text-white text-[12px] font-bold px-5 py-3 rounded-2xl shadow-2xl font-pretendard">{toast}</div>
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
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}` }} />
      <main className={`min-h-screen ${bg} font-pretendard p-5 lg:p-8 relative overflow-hidden`}>
        <div className={`absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[180px] ${D ? 'opacity-[0.06]' : 'opacity-[0.03]'} pointer-events-none`} />

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
              <span className={`text-[11px] font-bold tracking-[0.2em] ${dimText}`}>MY PAGE</span>
            </div>
            <div className="flex items-center gap-2">
              {hostId && (
                <button onClick={() => router.push(`/view/${hostId}`)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
                  ← 돌아가기
                </button>
              )}
              <button onClick={() => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); localStorage.setItem('lead_theme', n); }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[15px] ${D ? 'bg-white/5 border-white/10' : 'bg-black/[0.04] border-black/[0.08]'}`}>
                {D ? '☀️' : '🌙'}
              </button>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                className={`text-[11px] font-bold transition-colors ${D ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}>
                로그아웃
              </button>
            </div>
          </div>

          {/* 프로필 카드 */}
          <div className={`border rounded-2xl overflow-hidden mb-5 ${card}`}>
            <div className={`p-6 border-b ${divider}`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center shrink-0">
                  {member?.photo_url
                    ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-black text-[#5B8CFF]">{(member?.artist_name || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className={`font-black text-[20px] ${D ? 'text-white' : 'text-[#111]'}`}>{member?.artist_name}</h2>
                    {member?.roles?.map((r: string) => (
                      <span key={r} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 text-[#5B8CFF]">
                        {roleLabels[r] || r}
                      </span>
                    ))}
                  </div>
                  <p className={`text-[12px] ${dimText}`}>{member?.name}{member?.company && ` · ${member.company}`}</p>
                  {member?.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {member.genres.map((g: string) => (
                        <span key={g} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${D ? 'bg-white/5 text-zinc-500' : 'bg-black/[0.05] text-zinc-400'}`}>
                          {g.startsWith('ETC:') ? g.slice(4) : g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={openEdit}
                  className="shrink-0 px-3 py-2 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 text-[#5B8CFF] text-[11px] font-bold hover:bg-[#5B8CFF]/20 transition-all">
                  ✏️ 수정
                </button>
              </div>
            </div>

            <div className={`px-6 py-4 border-b ${divider} flex flex-wrap gap-4`}>
              {member?.email && (
                <div><p className={labelCls}>이메일</p><p className={`text-[13px] ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{member.email}</p></div>
              )}
              {member?.instagram && (
                <div>
                  <p className={labelCls}>인스타그램</p>
                  <a href={`https://instagram.com/${member.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#5B8CFF] hover:underline">@{member.instagram}</a>
                </div>
              )}
            </div>

            <div className={`px-6 py-4 border-b ${divider}`}>
              <p className={labelCls}>데모곡</p>
              {demos.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {demos.map(d => (
                    <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <span className="text-[14px]">🎵</span>
                      <span className={`flex-1 text-[12px] font-bold truncate ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{d.file_name}</span>
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
                        } catch { showToast('다운로드 실패'); }
                      }} className="text-[#5B8CFF] text-[11px] font-bold hover:underline">⬇ 다운</button>
                    </div>
                  ))}
                </div>
              ) : <p className={`text-[12px] ${dimText}`}>등록된 데모곡이 없어요</p>}
              {member?.demo_link && (
                <a href={member.demo_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] text-[#5B8CFF] hover:underline">🔗 추가 데모 링크</a>
              )}
            </div>

            <div className="px-6 py-4">
              <p className={labelCls}>최근 컷난 작업물</p>
              {works.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {works.map((w, i) => (
                    <a key={i} href={w.link} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-[#5B8CFF]/30 ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <div className="w-8 h-8 rounded-lg bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center shrink-0">
                        <span className="text-[12px]">🎶</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-bold truncate ${D ? 'text-zinc-200' : 'text-zinc-700'}`}>{w.song_title}</p>
                        <p className={`text-[11px] ${dimText}`}>{w.artist_name}</p>
                      </div>
                      <span className="text-[#5B8CFF] text-[11px]">→</span>
                    </a>
                  ))}
                </div>
              ) : <p className={`text-[12px] ${dimText}`}>등록된 작업물이 없어요</p>}
            </div>
          </div>

          {/* 내가 피칭한 곡 */}
          {myPitches.length > 0 && (
            <div className={`border rounded-2xl overflow-hidden mt-5 ${card}`}>
              <div className={`p-5 border-b ${divider}`}>
                <p className={`font-black text-[14px] ${D ? 'text-white' : 'text-[#111]'}`}>📨 내가 피칭한 곡</p>
                <p className={`text-[11px] mt-0.5 ${dimText}`}>총 {myPitches.length}건</p>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {myPitches.map(p => {
                  const lead = myLeads.find(l => l.id === p.lead_id);
                  const files = myPitchFiles.filter(f => f.pitch_id === p.id);
                  return (
                    <div key={p.id} className={`p-4 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-[13px] ${D ? 'text-white' : 'text-[#111]'}`}>
                            {lead?.artist || '—'} <span className={`font-normal ${dimText}`}>— {lead?.title || ''}</span>
                          </p>
                          <p className={`text-[11px] mt-0.5 ${dimText}`}>
                            {new Date(p.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {files.length > 0 && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${D ? 'bg-white/10 text-zinc-400' : 'bg-black/[0.06] text-zinc-500'}`}>🎵 {files.length}</span>
                        )}
                      </div>
                      {p.message && <p className={`text-[12px] leading-relaxed whitespace-pre-line mb-2 ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.message}</p>}
                      {files.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-2">
                          {files.map((f: any) => (
                            <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${D ? 'bg-black/20' : 'bg-black/[0.03]'}`}>
                              <span className="text-[12px]">🎵</span>
                              <span className={`flex-1 text-[11px] truncate ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{f.file_name || 'audio.mp3'}</span>
                              {f.bpm > 0 && <span className={`text-[10px] font-black ${dimText}`}>{f.bpm}BPM</span>}
                              {f.genre && <span className="text-[10px] font-black text-[#5B8CFF]">{f.genre}</span>}
                            </div>
                          ))}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4 overflow-y-auto" onClick={() => setEditing(false)}>
            <div className={`w-full max-w-lg border rounded-2xl shadow-2xl my-4 ${D ? 'bg-[#0E0E0E] border-white/[0.07]' : 'bg-white border-black/[0.08]'}`} onClick={e => e.stopPropagation()}>
              <div className="p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h2 className={`font-black text-[18px] ${D ? 'text-white' : 'text-[#111]'}`}>프로필 수정</h2>
                  <button onClick={() => setEditing(false)} className={`text-[13px] ${dimText}`}>✕</button>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => photoRef.current?.click()} className="relative group">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-[#5B8CFF]/10 border-2 border-dashed border-[#5B8CFF]/30 flex items-center justify-center">
                        {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">📷</span>}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-[9px] font-bold">변경</span>
                      </div>
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoChange(e.target.files[0])} />
                    <p className={`text-[11px] ${dimText}`}>사진 클릭해서 변경</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>실명</label><input value={name} onChange={e => setName(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                    <div><label className={labelCls}>활동명</label><input value={artistName} onChange={e => setArtistName(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                  </div>

                  <div>
                    <label className={labelCls}>성별</label>
                    <div className="flex gap-2">
                      {[['male', '남성'], ['female', '여성'], ['other', '기타']].map(([v, l]) => (
                        <button key={v} onClick={() => setGender(v)}
                          className={`flex-1 py-2 rounded-xl border text-[12px] font-bold transition-all ${gender === v ? 'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div><label className={labelCls}>소속 회사</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder="회사명 또는 프리랜서" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                  <div><label className={labelCls}>이메일</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                  <div>
                    <label className={labelCls}>인스타그램</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold ${dimText}`}>@</span>
                      <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="username" className={`w-full border rounded-xl pl-7 pr-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>역할</label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map(r => (
                        <button key={r.id} onClick={() => toggleArr(roles, r.id, setRoles)}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${roles.includes(r.id) ? 'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>선호 장르</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => (
                        <button key={g.id} onClick={() => toggleArr(genres, g.id, setGenres)}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${genres.includes(g.id) ? 'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                    {genres.includes('ETC') && (
                      <input value={genreEtc} onChange={e => setGenreEtc(e.target.value)} placeholder="장르 직접 입력" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all mt-2 ${inputCls}`} />
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>데모곡</label>
                    {demos.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-2">
                        {demos.map(d => (
                          <div key={d.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                            <span className="text-[13px]">🎵</span>
                            <span className={`flex-1 text-[11px] truncate ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{d.file_name}</span>
                            <button onClick={() => deleteDemo(d)} className="text-red-400/60 hover:text-red-400 text-[11px] font-bold">삭제</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {demos.length + newDemoFiles.length < 3 && (
                      <>
                        <input ref={demoRef} type="file" accept=".mp3,audio/mpeg" multiple className="hidden"
                          onChange={e => { const files = Array.from(e.target.files || []).slice(0, 3 - demos.length - newDemoFiles.length); setNewDemoFiles(p => [...p, ...files]); e.target.value = ''; }} />
                        <button onClick={() => demoRef.current?.click()}
                          className={`w-full py-2.5 rounded-xl border-2 border-dashed text-[11px] font-bold transition-all ${D ? 'border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:border-black/20'}`}>
                          + 데모곡 추가 ({3 - demos.length - newDemoFiles.length}개 남음)
                        </button>
                      </>
                    )}
                    {newDemoFiles.length > 0 && (
                      <div className="flex flex-col gap-1 mt-2">
                        {newDemoFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#5B8CFF]/5 border border-[#5B8CFF]/20">
                            <span className="text-[12px]">🎵</span>
                            <span className="flex-1 text-[11px] text-[#5B8CFF] truncate">{f.name}</span>
                            <button onClick={() => setNewDemoFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-400/60 text-[10px]">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <label className={labelCls}>추가 데모 링크</label>
                      <input value={demoLink} onChange={e => setDemoLink(e.target.value)} placeholder="https://..." className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>최근 컷난 작업물</label>
                    <div className="flex flex-col gap-2">
                      {editWorks.map((w, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="flex justify-between mb-2">
                            <span className={`text-[10px] font-black ${dimText}`}>#{i + 1}</span>
                            <button onClick={() => setEditWorks(p => p.filter((_, idx) => idx !== i))} className="text-red-400/60 hover:text-red-400 text-[11px]">삭제</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input value={w.song_title} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, song_title: e.target.value } : x))} placeholder="곡명" className={`w-full border rounded-lg px-2.5 py-1.5 text-[12px] outline-none ${inputCls}`} />
                            <input value={w.artist_name} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, artist_name: e.target.value } : x))} placeholder="아티스트명" className={`w-full border rounded-lg px-2.5 py-1.5 text-[12px] outline-none ${inputCls}`} />
                          </div>
                          <input value={w.link} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, link: e.target.value } : x))} placeholder="링크" className={`w-full border rounded-lg px-2.5 py-1.5 text-[12px] outline-none ${inputCls}`} />
                        </div>
                      ))}
                      {editWorks.length < 5 && (
                        <button onClick={() => setEditWorks(p => [...p, { song_title: '', artist_name: '', link: '' }])}
                          className={`py-2 rounded-xl border border-dashed text-[11px] font-bold ${D ? 'border-white/10 text-zinc-600 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:text-zinc-600'}`}>
                          + 추가
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditing(false)}
                    className={`flex-1 py-3 rounded-xl border font-bold text-[13px] ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500'}`}>
                    취소
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50">
                    {saving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-white/10 backdrop-blur-md border border-white/20 text-white text-[12px] font-bold px-5 py-3 rounded-2xl shadow-2xl font-pretendard">{toast}</div>
        )}
      </main>
    </>
  );
}
