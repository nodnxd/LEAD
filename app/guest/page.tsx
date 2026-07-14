'use client';

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

type Work = { id?: string; song_title: string; artist_name: string; link: string; order_index?: number };
type Demo = { id?: string; file_url: string; file_name: string; order_index?: number };

export default function MyPage() {
  const router = useRouter();
  const { t } = useLang();
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [demos, setDemos] = useState<Demo[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [myPitches, setMyPitches] = useState<any[]>([]);
  const [myPitchFiles, setMyPitchFiles] = useState<any[]>([]);
  const [myLeads, setMyLeads] = useState<any[]>([]);

  // 편집 상태
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

  useEffect(() => {
    const s = localStorage.getItem("lead_theme");
    if (s === "light") setTheme("light");
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        const qp = new URLSearchParams(window.location.search);
        const qs = qp.toString();
        router.push(qs ? `/?${qs}` : '/');
        return;
      }
      // redirect 파라미터 있으면 바로 이동 (호스트/멤버 로그인 후 복귀)
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      if (redirectTo) { router.push(redirectTo); return; }
      setUser(session.user);
      fetchAll(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/");
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAll = async (uid: string) => {
    const [{ data: m }, { data: d }, { data: w }, { data: pitches }] = await Promise.all([
      supabase.from('members').select('*').eq('id', uid).single(),
      supabase.from('demo_tracks').select('*').eq('member_id', uid).order('order_index'),
      supabase.from('released_works').select('*').eq('member_id', uid).order('order_index'),
      supabase.from('pitches').select('*').eq('member_id', uid).order('created_at', { ascending: false }),
    ]);
    if (m) { setMember(m); fillForm(m); }
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
    setLoading(false);
  };

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
    fillForm(member);
    setEditWorks(works.map(w => ({ ...w })));
    setNewDemoFiles([]);
    setEditing(true);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const toggleArr = (arr: string[], val: string, setFn: (v: string[]) => void) =>
    setFn(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const handlePhotoChange = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const deleteDemo = async (demo: Demo) => {
    if (!demo.id) return;
    await supabase.from('demo_tracks').delete().eq('id', demo.id);
    setDemos(p => p.filter(d => d.id !== demo.id));
    showToast(t('삭제됐어요', 'Deleted'));
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
      ? [...genres.filter(g => g !== 'ETC'), `ETC:${genreEtc.trim()}`]
      : genres;

    await supabase.from('members').update({
      name, artist_name: artistName, gender,
      company: company || null, email,
      instagram: instagram || null,
      photo_url: photoUrl,
      roles, genres: finalGenres,
      genre_etc: genreEtc || null,
      demo_link: demoLink || null,
    }).eq('id', user.id);

    // 작업물 업데이트
    await supabase.from('released_works').delete().eq('member_id', user.id);
    const validWorks = editWorks.filter(w => w.song_title.trim() && w.artist_name.trim() && w.link.trim());
    if (validWorks.length > 0) {
      await supabase.from('released_works').insert(
        validWorks.map((w, i) => ({ member_id: user.id, song_title: w.song_title, artist_name: w.artist_name, link: w.link, order_index: i }))
      );
    }

    // 새 데모곡 업로드
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
    setEditing(false);
    setSaving(false);
    setPhotoFile(null);
    setNewDemoFiles([]);
    showToast(t('저장됐어요!', 'Saved!'));
  };

  const D = theme === 'dark';
  const bg = D ? 'bg-[#141414] text-white' : 'bg-[#E6E6EC] text-[#111]';
  const card = D ? 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]' : 'bg-white border-black/[0.1] shadow-sm';
  const inputCls = D
    ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-700 focus:border-[#6366F1]/60'
    : 'bg-black/[0.03] border-black/[0.08] text-[#111] placeholder:text-zinc-400 focus:border-[#6366F1]/60';
  const labelCls = `text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D ? 'text-zinc-500' : 'text-zinc-400'}`;
  const dimText = D ? 'text-zinc-500' : 'text-zinc-600';
  const divider = D ? 'border-white/[0.07]' : 'border-black/[0.1]';

  const roleLabels: Record<string, string> = { producer: 'Producer', topliner: 'Top-liner', lyricist: 'Lyricist', engineer: 'Engineer', ar: 'A&R' };

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hostId = typeof window !== 'undefined' ? localStorage.getItem('last_host_id') : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;} @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}` }} />
      <main className={`min-h-screen ${bg} font-pretendard p-5 lg:p-8 relative overflow-hidden`} style={{zoom:1.1}}>

        {D && <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{background:'#6366F1',filter:'blur(180px)',animation:'orb-pulse 4s ease-in-out infinite'}} />}

        <div className="relative z-10 max-w-2xl mx-auto">

          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-2xl font-semibold text-[#6366F1] uppercase tracking-tighter">LEAD</h1>
              <span className={`text-[11px] font-bold tracking-[0.2em] ${dimText}`}>MY PAGE</span>
            </div>
            <div className="flex items-center gap-2">
              {hostId && (
                <button onClick={() => router.push(`/view/${hostId}`)} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
                  ← {t('돌아가기', 'Back')}
                </button>
              )}
              <LangToggle className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-zinc-400 text-[11px] font-bold hover:text-white transition-all" />
              <button onClick={() => { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); localStorage.setItem('lead_theme', n); }}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[15px] ${D ? 'bg-white/5 border-white/10' : 'bg-black/[0.04] border-black/[0.08]'}`}>
                {D ? '☀' : '◑'}
              </button>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                className={`text-[11px] font-bold transition-colors ${D ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}>
                {t('로그아웃', 'Log out')}
              </button>
            </div>
          </div>

          {/* 프로필 카드 */}
          <div className={`border rounded-2xl overflow-hidden mb-5 ${card}`}>

            {/* 상단 프로필 */}
            <div className={`p-6 border-b ${divider}`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
                  {member?.photo_url
                    ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-black text-[#6366F1]">{(member?.artist_name || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className={`font-black text-[20px] ${D ? 'text-white' : 'text-[#111]'}`}>{member?.artist_name}</h2>
                    {member?.roles?.map((r: string) => (
                      <span key={r} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#6366F1]">{roleLabels[r] || r}</span>
                    ))}
                  </div>
                  <p className={`text-[12px] ${dimText}`}>{member?.name}{member?.company && ` · ${member.company}`}</p>
                  {member?.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {member.genres.map((g: string) => (
                        <span key={g} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${D ? 'bg-white/5 text-zinc-500' : 'bg-black/[0.05] text-zinc-400'}`}>{g.startsWith('ETC:') ? g.slice(4) : g}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={openEdit} className="shrink-0 px-3 py-2 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#6366F1] text-[11px] font-bold hover:bg-[#6366F1]/20 transition-all">
                  ✏️ {t('수정', 'Edit')}
                </button>
              </div>
            </div>

            {/* 연락처 */}
            <div className={`px-6 py-4 border-b ${divider} flex flex-wrap gap-4`}>
              {member?.email && (
                <div><p className={labelCls}>{t('이메일', 'Email')}</p><p className={`text-[13px] ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{member.email}</p></div>
              )}
              {member?.instagram && (
                <div><p className={labelCls}>{t('인스타그램', 'Instagram')}</p>
                  <a href={`https://instagram.com/${member.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#6366F1] hover:underline">@{member.instagram}</a>
                </div>
              )}
            </div>

            {/* 데모곡 */}
            <div className={`px-6 py-4 border-b ${divider}`}>
              <p className={labelCls}>{t('데모곡', 'Demos')}</p>
              {demos.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {demos.map(d => (
                    <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <span className="text-[14px]"><i className="ti ti-music" aria-hidden="true"></i></span>
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
                        } catch { showToast(t('다운로드 실패', 'Download failed')); }
                      }} className="text-[#6366F1] text-[11px] font-bold hover:underline inline-flex items-center gap-1"><i className="ti ti-download" aria-hidden="true"></i>{t('다운', 'Get')}</button>
                    </div>
                  ))}
                </div>
              ) : <p className={`text-[12px] ${dimText}`}>{t('등록된 데모곡이 없어요', 'No demos yet')}</p>}
              {member?.demo_link && (
                <a href={member.demo_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] text-[#6366F1] hover:underline"><i className="ti ti-link" aria-hidden="true"></i> {t('추가 데모 링크', 'More demos')}</a>
              )}
            </div>

            {/* 컷난 작업물 */}
            <div className="px-6 py-4">
              <p className={labelCls}>{t('최근 컷난 작업물', 'Recent released works')}</p>
              {works.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {works.map((w, i) => (
                    <a key={i} href={w.link} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-[#6366F1]/30 ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
                        <span className="text-[12px]"><i className="ti ti-music" aria-hidden="true"></i></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-bold truncate ${D ? 'text-zinc-200' : 'text-zinc-700'}`}>{w.song_title}</p>
                        <p className={`text-[11px] ${dimText}`}>{w.artist_name}</p>
                      </div>
                      <span className="text-[#6366F1] text-[11px]">→</span>
                    </a>
                  ))}
                </div>
              ) : <p className={`text-[12px] ${dimText}`}>{t('등록된 작업물이 없어요', 'No works yet')}</p>}
            </div>
          </div>

          {/* 내가 피칭한 곡 */}
          {myPitches.length > 0 && (
            <div className={`border rounded-2xl overflow-hidden mt-5 ${card}`}>
              <div className={`p-5 border-b ${divider}`}>
                <p className={`font-black text-[14px] ${D ? 'text-white' : 'text-[#111]'}`}><i className="ti ti-inbox" aria-hidden="true"></i> {t('내가 피칭한 곡', 'My pitches')}</p>
                <p className={`text-[11px] mt-0.5 ${dimText}`}>{t('총', 'Total')} {myPitches.length}</p>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {myPitches.map(p => {
                  const lead = myLeads.find(l => l.id === p.lead_id);
                  const files = myPitchFiles.filter(f => f.pitch_id === p.id);
                  return (
                    <div key={p.id} className={`p-4 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-[13px] ${D ? 'text-white' : 'text-[#111]'}`}>{lead?.artist || '—'} <span className={`font-normal ${dimText}`}>— {lead?.title || ''}</span></p>
                          <p className={`text-[11px] mt-0.5 ${dimText}`}>{new Date(p.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        {files.length > 0 && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${D ? 'bg-white/10 text-zinc-400' : 'bg-black/[0.06] text-zinc-500'}`}><i className="ti ti-music" aria-hidden="true"></i> {files.length}</span>
                        )}
                      </div>
                      {p.message && <p className={`text-[12px] leading-relaxed whitespace-pre-line mb-2 ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.message}</p>}
                      {files.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-2">
                          {files.map(f => (
                            <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${D ? 'bg-black/20' : 'bg-black/[0.03]'}`}>
                              <span className="text-[12px]"><i className="ti ti-music" aria-hidden="true"></i></span>
                              <span className={`flex-1 text-[11px] truncate ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{f.file_name || 'audio.mp3'}</span>
                              {f.bpm > 0 && <span className={`text-[10px] font-black ${dimText}`}>{f.bpm}BPM</span>}
                              {f.genre && <span className="text-[10px] font-black text-[#6366F1]">{f.genre}</span>}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md font-pretendard p-4 overflow-y-auto" onClick={() => setEditing(false)}>
            <div className={`w-full max-w-lg border rounded-2xl shadow-2xl my-4 ${D ? 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]' : 'bg-white border-black/[0.08]'}`} onClick={e => e.stopPropagation()}>
              <div className="p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h2 className={`font-black text-[18px] ${D ? 'text-white' : 'text-[#111]'}`}>{t('프로필 수정', 'Edit profile')}</h2>
                  <button onClick={() => setEditing(false)} className={`text-[13px] ${dimText}`}>✕</button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* 사진 */}
                  <div className="flex items-center gap-4">
                    <button onClick={() => photoRef.current?.click()} className="relative group">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-[#6366F1]/10 border-2 border-dashed border-[#6366F1]/30 flex items-center justify-center">
                        {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">📷</span>}
                      </div>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-[9px] font-bold">{t('변경', 'Change')}</span>
                      </div>
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoChange(e.target.files[0])} />
                    <p className={`text-[11px] ${dimText}`}>{t('사진 클릭해서 변경', 'Click the photo to change')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>{t('실명', 'Legal name')}</label><input value={name} onChange={e => setName(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                    <div><label className={labelCls}>{t('활동명', 'Stage name')}</label><input value={artistName} onChange={e => setArtistName(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('성별', 'Gender')}</label>
                    <div className="flex gap-2">
                      {[['male', t('남성','Male')], ['female', t('여성','Female')], ['other', t('기타','Other')]].map(([v, l]) => (
                        <button key={v} onClick={() => setGender(v)} className={`flex-1 py-2 rounded-xl border text-[12px] font-bold transition-all ${gender === v ? 'bg-[#6366F1]/20 border-[#6366F1]/50 text-[#6366F1]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>{l}</button>
                      ))}
                    </div>
                  </div>

                  <div><label className={labelCls}>{t('소속 회사', 'Company')}</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder={t('회사명 또는 프리랜서', 'Company or freelance')} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                  <div><label className={labelCls}>{t('이메일', 'Email')}</label><input value={email} onChange={e => setEmail(e.target.value)} type="email" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                  <div>
                    <label className={labelCls}>{t('인스타그램', 'Instagram')}</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold ${dimText}`}>@</span>
                      <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="username" className={`w-full border rounded-xl pl-7 pr-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('역할', 'Roles')}</label>
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map(r => (
                        <button key={r.id} onClick={() => toggleArr(roles, r.id, setRoles)} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${roles.includes(r.id) ? 'bg-[#6366F1]/20 border-[#6366F1]/50 text-[#6366F1]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>{r.label}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('선호 장르', 'Genres')}</label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map(g => (
                        <button key={g.id} onClick={() => toggleArr(genres, g.id, setGenres)} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${genres.includes(g.id) ? 'bg-[#6366F1]/20 border-[#6366F1]/50 text-[#6366F1]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>{g.label}</button>
                      ))}
                    </div>
                    {genres.includes('ETC') && (
                      <input value={genreEtc} onChange={e => setGenreEtc(e.target.value)} placeholder={t('장르 직접 입력', 'Custom genre')} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all mt-2 ${inputCls}`} />
                    )}
                  </div>

                  {/* 데모곡 */}
                  <div>
                    <label className={labelCls}>{t('데모곡', 'Demos')}</label>
                    {demos.length > 0 && (
                      <div className="flex flex-col gap-1.5 mb-2">
                        {demos.map(d => (
                          <div key={d.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                            <span className="text-[13px]"><i className="ti ti-music" aria-hidden="true"></i></span>
                            <span className={`flex-1 text-[11px] truncate ${D ? 'text-zinc-400' : 'text-zinc-600'}`}>{d.file_name}</span>
                            <button onClick={() => deleteDemo(d)} className="text-red-400/60 hover:text-red-400 text-[11px] font-bold">{t('삭제', 'Delete')}</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {demos.length + newDemoFiles.length < 3 && (
                      <>
                        <input ref={demoRef} type="file" accept=".mp3,audio/mpeg" multiple className="hidden"
                          onChange={e => { const files = Array.from(e.target.files || []).slice(0, 3 - demos.length - newDemoFiles.length); setNewDemoFiles(p => [...p, ...files]); e.target.value = ''; }} />
                        <button onClick={() => demoRef.current?.click()} className={`w-full py-2.5 rounded-xl border-2 border-dashed text-[11px] font-bold transition-all ${D ? 'border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:border-black/20'}`}>{t('+ 데모곡 추가', '+ Add demo')} ({3 - demos.length - newDemoFiles.length} {t('개 남음', 'left')})</button>
                      </>
                    )}
                    {newDemoFiles.length > 0 && (
                      <div className="flex flex-col gap-1 mt-2">
                        {newDemoFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#6366F1]/5 border border-[#6366F1]/20">
                            <span className="text-[12px]"><i className="ti ti-music" aria-hidden="true"></i></span>
                            <span className="flex-1 text-[11px] text-[#6366F1] truncate">{f.name}</span>
                            <button onClick={() => setNewDemoFiles(p => p.filter((_, idx) => idx !== i))} className="text-red-400/60 text-[10px]">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2"><label className={labelCls}>{t('추가 데모 링크', 'More demos link')}</label><input value={demoLink} onChange={e => setDemoLink(e.target.value)} placeholder="https://..." className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} /></div>
                  </div>

                  {/* 컷난 작업물 */}
                  <div>
                    <label className={labelCls}>{t('최근 컷난 작업물', 'Recent released works')}</label>
                    <div className="flex flex-col gap-2">
                      {editWorks.map((w, i) => (
                        <div key={i} className={`p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                          <div className="flex justify-between mb-2">
                            <span className={`text-[10px] font-black ${dimText}`}>#{i + 1}</span>
                            {editWorks.length > 0 && <button onClick={() => setEditWorks(p => p.filter((_, idx) => idx !== i))} className="text-red-400/60 hover:text-red-400 text-[11px]">{t('삭제', 'Delete')}</button>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input value={w.song_title} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, song_title: e.target.value } : x))} placeholder={t('곡명', 'Song title')} className={`w-full border rounded-lg px-2.5 py-1.5 text-[12px] outline-none ${inputCls}`} />
                            <input value={w.artist_name} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, artist_name: e.target.value } : x))} placeholder={t('아티스트명', 'Artist')} className={`w-full border rounded-lg px-2.5 py-1.5 text-[12px] outline-none ${inputCls}`} />
                          </div>
                          <input value={w.link} onChange={e => setEditWorks(p => p.map((x, idx) => idx === i ? { ...x, link: e.target.value } : x))} placeholder={t('링크', 'Link')} className={`w-full border rounded-lg px-2.5 py-1.5 text-[12px] outline-none ${inputCls}`} />
                        </div>
                      ))}
                      {editWorks.length < 5 && (
                        <button onClick={() => setEditWorks(p => [...p, { song_title: '', artist_name: '', link: '' }])} className={`py-2 rounded-xl border border-dashed text-[11px] font-bold ${D ? 'border-white/10 text-zinc-600 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:text-zinc-600'}`}>+ {t('추가', 'Add')}</button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditing(false)} className={`flex-1 py-3 rounded-xl border font-bold text-[13px] ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500'}`}>{t('취소', 'Cancel')}</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-[#6366F1] text-white font-semibold text-[13px] hover:opacity-90 transition-all disabled:opacity-50">
                    {saving ? t('저장 중...', 'Saving…') : t('저장', 'Save')}
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