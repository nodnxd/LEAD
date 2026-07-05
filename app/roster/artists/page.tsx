'use client';

// 📁 app/artists/page.tsx

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ROLES = ['Producer', 'Topliner', 'Engineer', 'A&R', 'Artist', 'Other'];
const ROSTER_ROLES = ['Producer', 'Topliner', 'Engineer', 'A&R']; // 로스터에서 쓰는 role
const ROLE_COLORS: Record<string, string> = {
  'Producer': '#3E78DB', 'Topliner': '#E97582', 'Engineer': '#7C7F65',
  'A&R': '#7C7F65', 'Artist': '#3B82F6', 'Other': '#6B7280'
};

const QUICK_LINKS = [
  { label: '📸 Instagram', prefix: 'https://instagram.com/' },
  { label: '🎵 SoundCloud', prefix: 'https://soundcloud.com/' },
  { label: '🎧 Spotify', prefix: 'https://open.spotify.com/artist/' },
  { label: '▶️ YouTube', prefix: 'https://youtube.com/@' },
];

const getLinkIcon = (url: string) => {
  if (url.includes('instagram')) return '📸';
  if (url.includes('soundcloud')) return '🎵';
  if (url.includes('spotify')) return '🎧';
  if (url.includes('youtube')) return '▶️';
  return '🔗';
};

export default function ArtistsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [viewingArtist, setViewingArtist] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // 로스터 추가 모달
  const [addToRosterArtist, setAddToRosterArtist] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [rosterRole, setRosterRole] = useState('Producer');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'recent' | 'gender'>('role');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', role: 'Producer', gender: 'male', nationality: '',
    bio: '', email: '', links: [] as string[], photo_url: ''
  });
  const [newLink, setNewLink] = useState('');

  const toast = (msg: string) => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2500); };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/roster');
      else setUser(data.user);
    });
  }, []);

  const fetchArtists = async (u = user) => {
    if (!u) return;
    const { data } = await supabase.from('artists').select('*').eq('host_id', u.id).order('created_at', { ascending: false });
    if (data) setArtists(data);
  };

  const fetchProjects = async (u = user) => {
    if (!u) return;
    // host_settings에서 프로젝트 순서 가져오기
    const { data: settings } = await supabase.from('host_settings').select('project_order').eq('host_id', u.id).single();
    if ((settings as any)?.project_order?.length > 0) {
      setProjects((settings as any).project_order);
      setSelectedProject((settings as any).project_order[0]);
    } else {
      // profiles에서 프로젝트 목록 추출
      const { data: profiles } = await supabase.from('profiles').select('project').eq('user_id', u.id);
      if (profiles) {
        const ps = Array.from(new Set(profiles.map((p: any) => p.project).filter(Boolean))) as string[];
        setProjects(ps);
        if (ps.length > 0) setSelectedProject(ps[0]);
      }
    }
  };

  useEffect(() => {
    if (user) { fetchArtists(user); fetchProjects(user); }
  }, [user]);

  const openCreate = () => {
    setForm({ name: '', role: 'Producer', gender: 'male', nationality: '', bio: '', email: '', links: [], photo_url: '' });
    setEditingArtist(null);
    setShowModal(true);
  };

  const openEdit = (artist: any) => {
    setForm({ name: artist.name, role: artist.role || 'Producer', gender: artist.gender || 'male', nationality: artist.nationality || '', bio: artist.bio || '', email: artist.email || '', links: artist.links || [], photo_url: artist.photo_url || '' });
    setEditingArtist(artist);
    setShowModal(true);
  };

  const saveArtist = async () => {
    if (!form.name.trim()) return;
    const payload = { ...form, host_id: user.id };
    if (editingArtist) {
      await supabase.from('artists').update(payload).eq('id', editingArtist.id);
    } else {
      await supabase.from('artists').insert(payload);
    }
    setShowModal(false);
    fetchArtists();
    toast(editingArtist ? '✅ 수정됐어요!' : '✅ 추가됐어요!');
  };

  const deleteArtist = async (id: string) => {
    await supabase.from('artists').delete().eq('id', id);
    fetchArtists();
    setViewingArtist(null);
    toast('🗑 삭제됐어요');
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    // 이미지 리사이즈 (최대 800px)
    const resized = await new Promise<Blob>((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 800;
        let w = img.width; let h = img.height;
        if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
    const ext = 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    console.log('업로드 시도:', path, file.type, file.size);
    const { error } = await supabase.storage.from('artist - photo').upload(path, resized, { upsert: true, contentType: 'image/jpeg' });
    if (error) {
      console.error('업로드 에러:', error.message, error);
      toast(`❌ 업로드 실패: ${error.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('artist - photo').getPublicUrl(path);
    console.log('업로드 성공, URL:', data.publicUrl);
    setForm(prev => ({ ...prev, photo_url: data.publicUrl }));
    setUploading(false);
    toast('📸 사진 업로드됐어요!');
  };

  // 아티스트 → 로스터 추가
  const addToRoster = async () => {
    if (!addToRosterArtist || !selectedProject) return;
    // 이미 해당 프로젝트에 같은 이름으로 있는지 체크
    const { data: existing } = await supabase.from('profiles')
      .select('id').eq('user_id', user.id).eq('project', selectedProject).eq('name', addToRosterArtist.name);
    if (existing && existing.length > 0) {
      toast('⚠️ 이미 해당 로스터에 있어요!');
      setAddToRosterArtist(null);
      return;
    }
    // profiles에 insert (로스터 풀에 추가)
    const roleToUse = ROSTER_ROLES.includes(addToRosterArtist.role) ? addToRosterArtist.role : rosterRole;
    await supabase.from('profiles').insert({
      name: addToRosterArtist.name,
      role: roleToUse,
      gender: addToRosterArtist.gender || 'male',
      team: 'Unassigned',
      project: selectedProject,
      order_index: 999,
      day_number: null,
      user_id: user.id,
      links: addToRosterArtist.links || [],
    });
    toast(`✅ ${addToRosterArtist.name} → ${selectedProject} 로스터에 추가됐어요!`);
    setAddToRosterArtist(null);
  };

  const baseFiltered = artists.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || (a.bio || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || a.role === filterRole;
    return matchSearch && matchRole;
  });

  const sortedFiltered = [...baseFiltered].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'role') return ROLES.indexOf(a.role) - ROLES.indexOf(b.role);
    if (sortBy === 'gender') return a.gender.localeCompare(b.gender);
    if (sortBy === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  // role별 그룹핑 (role 정렬일 때)
  const grouped = sortBy === 'role'
    ? ROLES.map(r => ({ role: r, artists: sortedFiltered.filter(a => a.role === r) })).filter(g => g.artists.length > 0)
    : [{ role: '', artists: sortedFiltered }];

  const filtered = sortedFiltered;

  if (!user) return <div className="min-h-screen bg-[#141414] flex items-center justify-center"><div className="text-zinc-600 text-[11px] font-black tracking-widest">Loading...</div></div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; } @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}`}} />
      <main className="min-h-screen bg-[#141414] text-white p-5 lg:p-8 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{background:'#E0A63C',filter:'blur(200px)',animation:'orb-pulse 4s ease-in-out infinite'}} />

        {/* 헤더 */}
        <div className="relative z-10 flex items-baseline justify-center gap-2.5 mb-8">
          <h1 className="text-4xl font-semibold text-[#E0A63C] uppercase tracking-tighter">CAST</h1>
          <span className="text-zinc-500 text-[11px] font-normal tracking-[0.2em]">by NEN</span>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* 탑 바 */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/roster/dashboard')} className="text-zinc-500 hover:text-white text-[11px] font-bold transition-colors">← 대시보드</button>
              <span className="text-zinc-700">|</span>
              <h2 className="text-white font-black text-[20px]">Artists</h2>
              <span className="text-zinc-600 text-[12px]">{artists.length}명</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 검색..." className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-white/30 transition-all placeholder:text-zinc-600 text-white w-36" />
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] outline-none text-zinc-300">
                <option value="" className="bg-zinc-900">전체 역할</option>
                {ROLES.map(r => <option key={r} value={r} className="bg-zinc-900">{r}</option>)}
              </select>
              {/* 정렬 */}
              <div className="flex gap-1">
                {([['role', 'Role'], ['name', 'Name'], ['recent', 'Recent'], ['gender', 'Gender']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${sortBy === val ? 'border-[#E0A63C]/50 bg-[#E0A63C]/20 text-[#E0A63C]' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={openCreate} className="bg-[#E0A63C] text-white px-5 py-2 rounded-xl font-semibold text-[11px] hover:opacity-90 transition-all">+ 추가</button>
            </div>
          </div>

          {/* Role별 그룹 */}
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-700 text-[13px]">아티스트가 없어요</p>
              <button onClick={openCreate} className="mt-4 text-[#E0A63C] text-[12px] font-bold hover:underline">+ 첫 아티스트 추가</button>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {grouped.map(({ role, artists: roleArtists }) => (
                <div key={role}>
                  {/* Role 헤더 */}
                  {role && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-[1px] w-4" style={{ backgroundColor: ROLE_COLORS[role] + '60' }} />
                      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: ROLE_COLORS[role] }}>{role}</span>
                      <span className="text-zinc-700 text-[11px]">{roleArtists.length}</span>
                      <div className="h-[1px] flex-1" style={{ backgroundColor: ROLE_COLORS[role] + '20' }} />
                    </div>
                  )}

                  {/* 카드 그리드 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {roleArtists.map(artist => (
                      <div
                        key={artist.id}
                        id={`card-${artist.id}`}
                        className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden shadow-xl cursor-pointer hover:border-white/15 transition-all group"
                        onClick={() => setViewingArtist(artist)}
                      >
                        {/* 사진 */}
                        <div className="relative h-24 bg-white/5 overflow-hidden">
                          {artist.photo_url ? (
                            <img src={artist.photo_url} alt={artist.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-3xl opacity-20">👤</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: (ROLE_COLORS[artist.role] || '#6B7280') + '30', color: ROLE_COLORS[artist.role] || '#6B7280', border: `1px solid ${(ROLE_COLORS[artist.role] || '#6B7280')}50` }}>
                              {artist.role}
                            </span>
                          </div>
                          {/* 로스터 추가 버튼 */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setAddToRosterArtist(artist); setRosterRole(ROSTER_ROLES.includes(artist.role) ? artist.role : 'Producer'); }}
                            className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white text-[9px] font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-[#E0A63C]/60 hover:border-[#E0A63C]/50"
                          >
                            + 로스터
                          </button>
                        </div>

                        {/* 정보 */}
                        <div className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-white font-black text-[13px] truncate">{artist.name}</h3>
                              <div className="flex items-center gap-1 mt-0.5">
                                {artist.nationality && <span className="text-zinc-500 text-[9px]">{artist.nationality}</span>}
                                <span className={`text-[9px] font-black px-1 py-0 rounded border ${artist.gender === 'female' ? 'bg-[#E97582]/10 text-[#E97582] border-[#E97582]/30' : 'bg-[#3E78DB]/10 text-[#3E78DB] border-[#3E78DB]/30'}`}>{artist.gender === 'female' ? 'F' : 'M'}</span>
                              </div>
                            </div>
                          </div>
                          {artist.bio && <p className="text-zinc-600 text-[9px] leading-relaxed line-clamp-1 mb-1">{artist.bio}</p>}
                          {artist.links?.length > 0 && (
                            <div className="flex gap-1.5">
                              {artist.links.slice(0, 4).map((link: string, i: number) => (
                                <a key={i} href={link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] hover:scale-110 transition-transform">{getLinkIcon(link)}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 아티스트 상세 모달 */}
      {viewingArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md font-pretendard p-4" onClick={() => setViewingArtist(null)}>
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative h-56 bg-white/5">
              {viewingArtist.photo_url ? (
                <img src={viewingArtist.photo_url} alt={viewingArtist.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><span className="text-6xl opacity-20">👤</span></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-5">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: (ROLE_COLORS[viewingArtist.role] || '#6B7280') + '30', color: ROLE_COLORS[viewingArtist.role] || '#6B7280', border: `1px solid ${(ROLE_COLORS[viewingArtist.role] || '#6B7280')}50` }}>{viewingArtist.role}</span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-white font-black text-[22px]">{viewingArtist.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingArtist.nationality && <span className="text-zinc-500 text-[12px]">🌏 {viewingArtist.nationality}</span>}
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${viewingArtist.gender === 'female' ? 'bg-[#E97582]/10 text-[#E97582] border-[#E97582]/30' : 'bg-[#3E78DB]/10 text-[#3E78DB] border-[#3E78DB]/30'}`}>{viewingArtist.gender === 'female' ? 'F' : 'M'}</span>
                  </div>
                </div>
              </div>

              {viewingArtist.bio && (
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Bio</p>
                  <p className="text-zinc-300 text-[13px] leading-relaxed">{viewingArtist.bio}</p>
                </div>
              )}

              {viewingArtist.email && (
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Contact</p>
                  <a href={`mailto:${viewingArtist.email}`} className="text-zinc-300 text-[13px] hover:text-white transition-colors">{viewingArtist.email}</a>
                </div>
              )}

              {viewingArtist.links?.length > 0 && (
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">Links</p>
                  <div className="flex flex-col gap-1.5">
                    {viewingArtist.links.map((link: string, i: number) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <span className="text-[13px]">{getLinkIcon(link)}</span>
                        <span className="text-zinc-300 text-[11px] truncate">{link.replace('https://', '').split('/').slice(0, 2).join('/')}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setViewingArtist(null); openEdit(viewingArtist); }} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-bold text-[12px] hover:bg-white/10 transition-all">수정</button>
                <button
                  onClick={() => { setViewingArtist(null); setAddToRosterArtist(viewingArtist); setRosterRole(ROSTER_ROLES.includes(viewingArtist.role) ? viewingArtist.role : 'Producer'); }}
                  className="flex-1 py-2.5 rounded-xl bg-[#E0A63C]/20 border border-[#E0A63C]/30 text-[#E0A63C] font-bold text-[12px] hover:bg-[#E0A63C]/30 transition-all">+ 로스터</button>
                <button onClick={() => { if (confirm(`"${viewingArtist.name}"을 삭제할까요?`)) deleteArtist(viewingArtist.id); }} className="py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[12px] hover:bg-red-500/20 transition-all">삭제</button>
                <button onClick={() => setViewingArtist(null)} className="py-2.5 px-4 rounded-xl border border-white/10 text-zinc-500 font-bold text-[12px] hover:text-white transition-all">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 로스터 추가 모달 */}
      {addToRosterArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md font-pretendard p-4" onClick={() => setAddToRosterArtist(null)}>
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-black text-[16px] mb-1">{addToRosterArtist.name}</h2>
            <p className="text-zinc-500 text-[12px] mb-5">로스터에 추가할 프로젝트를 선택하세요</p>

            <div className="flex flex-col gap-3 mb-5">
              {/* 프로젝트 선택 */}
              <div>
                <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 block">프로젝트</label>
                {projects.length === 0 ? (
                  <p className="text-zinc-600 text-[12px]">로스터가 없어요. 대시보드에서 먼저 만들어주세요.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {projects.map(p => (
                      <button key={p} onClick={() => setSelectedProject(p)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${selectedProject === p ? 'border-[#E0A63C]/50 bg-[#E0A63C]/20 text-[#E0A63C]' : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Role 선택 (아티스트 role이 로스터 role이 아닌 경우) */}
              {!ROSTER_ROLES.includes(addToRosterArtist.role) && (
                <div>
                  <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 block">로스터 역할</label>
                  <select value={rosterRole} onChange={e => setRosterRole(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[13px] outline-none text-zinc-300">
                    {ROSTER_ROLES.map(r => <option key={r} value={r} className="bg-zinc-900">{r}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setAddToRosterArtist(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[12px] hover:text-white transition-all">취소</button>
              <button onClick={addToRoster} disabled={!selectedProject} className="flex-1 py-3 rounded-xl bg-[#E0A63C] text-white font-semibold text-[12px] hover:opacity-90 transition-all disabled:opacity-40">추가</button>
            </div>
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md font-pretendard p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl my-4">
            <div className="p-6">
              <h2 className="text-white font-black text-[16px] mb-5">{editingArtist ? '아티스트 수정' : '아티스트 추가'}</h2>

              <div className="mb-5 flex flex-col items-center">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-3 flex items-center justify-center cursor-pointer hover:border-white/30 transition-all" onClick={() => fileInputRef.current?.click()}>
                  {form.photo_url ? <img src={form.photo_url} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="text-3xl opacity-30">📷</span>}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="text-zinc-500 text-[11px] font-bold hover:text-white transition-colors">{uploading ? '업로드 중...' : '사진 선택'}</button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
              </div>

              <div className="flex flex-col gap-3">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="이름 *" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/30 transition-all placeholder:text-zinc-600 text-white" />

                <div className="grid grid-cols-2 gap-3">
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none text-zinc-300">
                    {ROLES.map(r => <option key={r} value={r} className="bg-zinc-900">{r}</option>)}
                  </select>
                  <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none text-zinc-300">
                    <option value="male" className="bg-zinc-900">Male</option>
                    <option value="female" className="bg-zinc-900">Female</option>
                  </select>
                </div>

                <input value={form.nationality} onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))} placeholder="국적 (예: Korean, Japanese)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/30 transition-all placeholder:text-zinc-600 text-white" />
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="이력/소개" rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/30 transition-all placeholder:text-zinc-600 text-white resize-none" />
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="이메일 연락처" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/30 transition-all placeholder:text-zinc-600 text-white" />

                <div>
                  <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2 block">링크</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {QUICK_LINKS.map(({ label, prefix }) => (
                      <button key={prefix} onClick={() => setNewLink(prefix)} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-bold hover:text-white hover:bg-white/10 transition-all">{label}</button>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input value={newLink} onChange={e => setNewLink(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newLink.trim()) { setForm(p => ({ ...p, links: [...p.links, newLink.trim()] })); setNewLink(''); }}} placeholder="https://..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-white/30 transition-all placeholder:text-zinc-600 text-white" />
                    <button onClick={() => { if (newLink.trim()) { setForm(p => ({ ...p, links: [...p.links, newLink.trim()] })); setNewLink(''); }}} className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-black text-[11px] hover:bg-white/20 transition-all">추가</button>
                  </div>
                  {form.links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 mb-1">
                      <span className="text-[11px]">{getLinkIcon(link)}</span>
                      <span className="text-zinc-400 text-[11px] truncate flex-1">{link}</span>
                      <button onClick={() => setForm(p => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }))} className="text-zinc-600 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[12px] hover:text-white transition-all">취소</button>
                <button onClick={saveArtist} className="flex-1 py-3 rounded-xl bg-[#E0A63C] text-white font-semibold text-[12px] hover:opacity-90 transition-all">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[12px] font-bold px-5 py-3 rounded-2xl shadow-2xl font-pretendard">{toastMsg}</div>
      )}
    </>
  );
}