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

type ReleasedWork = { song_title: string; artist_name: string; link: string };
type DemoFile = { id: string; file: File; uploading: boolean };

const DRAFT_KEY = 'onboarding_draft';
const emptyWork = (): ReleasedWork => ({ song_title: '', artist_name: '', link: '' });
let demoCounter = 0;

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [theme] = useState<'dark' | 'light'>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('lead_theme') as any || 'dark') : 'dark'
  );

  // Step 1
  const [name, setName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [gender, setGender] = useState('');
  const [company, setCompany] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [roles, setRoles] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [genreEtc, setGenreEtc] = useState('');

  // Step 3
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');

  // Step 4
  const [demoFiles, setDemoFiles] = useState<DemoFile[]>([]);
  const [demoLink, setDemoLink] = useState('');
  const [works, setWorks] = useState<ReleasedWork[]>([emptyWork()]);
  const demoRef = useRef<HTMLInputElement>(null);

  // ── 초기화: 유저 확인 + 드래프트 복원 ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return; }
      setUser(data.user);
      setEmail(data.user.email || '');

      // 이미 완성됐으면 스킵
      supabase.from('members').select('profile_completed').eq('id', data.user.id).single()
        .then(({ data: m }) => { if (m?.profile_completed) redirectAfterOnboarding(); });

      // 드래프트 복원
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
        if (draft.name) setName(draft.name);
        if (draft.artistName) setArtistName(draft.artistName);
        if (draft.gender) setGender(draft.gender);
        if (draft.company) setCompany(draft.company);
        if (draft.roles) setRoles(draft.roles);
        if (draft.genres) setGenres(draft.genres);
        if (draft.genreEtc) setGenreEtc(draft.genreEtc);
        if (draft.instagram) setInstagram(draft.instagram);
        if (draft.demoLink) setDemoLink(draft.demoLink);
        if (draft.works) setWorks(draft.works);
        if (draft.step) setStep(draft.step);
      } catch {}
    });
  }, []);

  // ── 드래프트 자동저장 ──
  useEffect(() => {
    const draft = { name, artistName, gender, company, roles, genres, genreEtc, instagram, demoLink, works, step };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, artistName, gender, company, roles, genres, genreEtc, instagram, demoLink, works, step]);

  const redirectAfterOnboarding = () => {
    // 온보딩 후 원래 있던 뷰 페이지로 (또는 멤버 홈)
    const hostId = localStorage.getItem('last_host_id');
    localStorage.removeItem(DRAFT_KEY);
    if (hostId) router.push(`/view/${hostId}`);
    else router.push('/mypage');
  };

  const D = theme === 'dark';
  const bg = D ? 'bg-[#141414]' : 'bg-[#F2F2F7]';
  const card = D ? 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]' : 'bg-white border-black/[0.08]';
  const inputCls = D
    ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-700 focus:border-[#5B8CFF]/60'
    : 'bg-black/[0.03] border-black/[0.08] text-[#111] placeholder:text-zinc-400 focus:border-[#5B8CFF]/60';
  const labelCls = D ? 'text-zinc-500' : 'text-zinc-400';
  const dimText = D ? 'text-zinc-500' : 'text-zinc-400';

  const handlePhoto = (file: File) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const addDemo = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.mp3')) { alert('MP3만 가능해요!'); return; }
    if (file.size > 20 * 1024 * 1024) { alert('20MB 이하만 가능해요!'); return; }
    if (demoFiles.length >= 3) { alert('최대 3개까지예요!'); return; }
    const id = `d${++demoCounter}`;
    setDemoFiles(p => [...p, { id, file, uploading: false }]);
  };

  const removeDemo = (id: string) => setDemoFiles(p => p.filter(d => d.id !== id));

  const updateWork = (i: number, patch: Partial<ReleasedWork>) =>
    setWorks(p => p.map((w, idx) => idx === i ? { ...w, ...patch } : w));

  const toggleArr = (arr: string[], val: string, setFn: (v: string[]) => void) =>
    setFn(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const canNext = () => {
    if (step === 1) return name.trim() && artistName.trim() && gender;
    if (step === 2) return roles.length > 0 && genres.length > 0;
    if (step === 3) return email.trim();
    return true;
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return null;
    const ext = photoFile.name.split('.').pop();
    const path = `members/${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('member-photos').upload(path, photoFile, { upsert: true });
    if (error) return null;
    return supabase.storage.from('member-photos').getPublicUrl(path).data.publicUrl;
  };

  const uploadDemos = async () => {
    if (!user) return [];
    const results: { url: string; name: string }[] = [];
    for (let i = 0; i < demoFiles.length; i++) {
      const df = demoFiles[i];
      const path = `demos/${user.id}/${Date.now()}_${i}.mp3`;
      const { error } = await supabase.storage.from('member-demos').upload(path, df.file);
      if (!error) {
        const url = supabase.storage.from('member-demos').getPublicUrl(path).data.publicUrl;
        results.push({ url, name: df.file.name });
      }
    }
    return results;
  };

  const handleFinish = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const [photoUrl, demoUploads] = await Promise.all([uploadPhoto(), uploadDemos()]);

      const finalGenres = genres.includes('ETC') && genreEtc.trim()
        ? [...genres.filter(g => g !== 'ETC'), `ETC:${genreEtc.trim()}`]
        : genres;

      await supabase.from('members').upsert({
        id: user.id,
        name, artist_name: artistName, email, gender,
        company: company || null,
        photo_url: photoUrl || null,
        roles, genres: finalGenres,
        genre_etc: genreEtc || null,
        instagram: instagram || null,
        demo_link: demoLink || null,
        profile_completed: true,
      });

      if (demoUploads.length > 0) {
        await supabase.from('demo_tracks').insert(
          demoUploads.map((d, i) => ({ member_id: user.id, file_url: d.url, file_name: d.name, order_index: i }))
        );
      }

      const validWorks = works.filter(w => w.song_title.trim() && w.artist_name.trim() && w.link.trim());
      if (validWorks.length > 0) {
        await supabase.from('released_works').insert(
          validWorks.map((w, i) => ({ member_id: user.id, ...w, order_index: i }))
        );
      }

      redirectAfterOnboarding();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const STEPS = ['기본 정보', '역할 & 장르', '연락처', '음악'];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;} @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}` }} />
      <main className={`min-h-screen ${bg} font-pretendard flex flex-col items-center justify-center p-5 relative overflow-hidden`}>

        {D && <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{background:'#5B8CFF',filter:'blur(180px)',animation:'orb-pulse 4s ease-in-out infinite'}} />}

        <div className="relative z-10 w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-[#5B8CFF] uppercase tracking-tighter mb-1">LEAD</h1>
            <p className={`text-[12px] font-bold ${dimText}`}>프로필을 완성해주세요</p>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => {
              const num = i + 1;
              const active = num === step;
              const done = num < step;
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-2 ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-25'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 transition-all ${active ? 'bg-[#5B8CFF] text-white' : done ? 'bg-[#5B8CFF]/30 text-[#5B8CFF]' : D ? 'bg-white/10 text-zinc-500' : 'bg-black/10 text-zinc-400'}`}>
                      {done ? '✓' : num}
                    </div>
                    <span className={`text-[11px] font-bold hidden sm:block ${active ? D ? 'text-white' : 'text-[#111]' : dimText}`}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`h-px flex-1 transition-all ${done ? 'bg-[#5B8CFF]/40' : D ? 'bg-white/10' : 'bg-black/10'}`} />}
                </div>
              );
            })}
          </div>

          <div className={`border rounded-2xl p-6 shadow-2xl ${card}`}>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className={`text-[18px] font-black mb-1 ${D ? 'text-white' : 'text-[#111]'}`}>기본 정보</p>
                  <p className={`text-[12px] ${dimText}`}>다른 멤버들에게 보여지는 정보예요</p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <button onClick={() => photoRef.current?.click()} className="relative group">
                    <div className={`w-24 h-24 rounded-full border-2 border-dashed overflow-hidden flex items-center justify-center transition-all ${D ? 'border-white/20 bg-white/[0.03] hover:border-[#5B8CFF]/50' : 'border-black/20 bg-black/[0.03] hover:border-[#5B8CFF]/50'}`}>
                      {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">📷</span>}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">변경</span>
                    </div>
                  </button>
                  <p className={`text-[11px] ${dimText}`}>프로필 사진 (선택)</p>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${labelCls}`}>실명 *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                  </div>
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${labelCls}`}>활동명 *</label>
                    <input value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Artist Name" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                  </div>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${labelCls}`}>성별 *</label>
                  <div className="flex gap-2">
                    {[['male', '남성'], ['female', '여성'], ['other', '기타']].map(([v, l]) => (
                      <button key={v} onClick={() => setGender(v)} className={`flex-1 py-2.5 rounded-xl border text-[12px] font-bold transition-all ${gender === v ? 'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500 hover:text-white' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${labelCls}`}>소속 회사 <span className="font-normal normal-case">(선택)</span></label>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="회사명 또는 프리랜서" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <p className={`text-[18px] font-black mb-1 ${D ? 'text-white' : 'text-[#111]'}`}>역할 & 장르</p>
                  <p className={`text-[12px] ${dimText}`}>복수 선택 가능해요</p>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${labelCls}`}>역할 *</label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map(r => (
                      <button key={r.id} onClick={() => toggleArr(roles, r.id, setRoles)} className={`px-4 py-2 rounded-xl border text-[12px] font-bold transition-all ${roles.includes(r.id) ? 'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500 hover:text-white' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{r.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${labelCls}`}>선호 장르 *</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map(g => (
                      <button key={g.id} onClick={() => toggleArr(genres, g.id, setGenres)} className={`px-4 py-2 rounded-xl border text-[12px] font-bold transition-all ${genres.includes(g.id) ? 'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]' : D ? 'bg-white/[0.03] border-white/[0.08] text-zinc-500 hover:text-white' : 'bg-black/[0.03] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{g.label}</button>
                    ))}
                  </div>
                  {genres.includes('ETC') && (
                    <input value={genreEtc} onChange={e => setGenreEtc(e.target.value)} placeholder="장르 직접 입력" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all mt-3 ${inputCls}`} />
                  )}
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className={`text-[18px] font-black mb-1 ${D ? 'text-white' : 'text-[#111]'}`}>연락처 & SNS</p>
                  <p className={`text-[12px] ${dimText}`}>친구가 된 멤버에게만 보여요</p>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${labelCls}`}>이메일 *</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                  <p className={`text-[11px] mt-1.5 ${dimText}`}>친구 추가 요청에도 사용돼요</p>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${labelCls}`}>인스타그램 <span className="font-normal normal-case">(선택)</span></label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold ${dimText}`}>@</span>
                    <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="username" className={`w-full border rounded-xl pl-7 pr-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className={`text-[18px] font-black mb-1 ${D ? 'text-white' : 'text-[#111]'}`}>음악</p>
                  <p className={`text-[12px] ${dimText}`}>나중에 마이페이지에서 수정할 수 있어요</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>데모곡 <span className="font-normal normal-case">MP3 · 최대 3개 · 20MB</span></label>
                    <span className={`text-[11px] ${dimText}`}>{demoFiles.length}/3</span>
                  </div>
                  {demoFiles.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                      {demoFiles.map(df => (
                        <div key={df.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${D ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-black/[0.02] border-black/[0.07]'}`}>
                          <span className="text-[16px]">🎵</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12px] font-bold truncate ${D ? 'text-white' : 'text-[#111]'}`}>{df.file.name}</p>
                            <p className={`text-[11px] ${dimText}`}>{(df.file.size / 1024 / 1024).toFixed(1)}MB</p>
                          </div>
                          <button onClick={() => removeDemo(df.id)} className={`text-[13px] ${D ? 'text-zinc-700 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {demoFiles.length < 3 && (
                    <>
                      <input ref={demoRef} type="file" accept=".mp3,audio/mpeg" multiple className="hidden" onChange={e => { Array.from(e.target.files || []).forEach(addDemo); e.target.value = ''; }} />
                      <button onClick={() => demoRef.current?.click()} className={`w-full py-3 rounded-xl border-2 border-dashed text-[12px] font-bold transition-all ${D ? 'border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:border-black/20'}`}>+ 파일 추가</button>
                    </>
                  )}
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-1.5 ${labelCls}`}>추가 데모 링크 <span className="font-normal normal-case">(Disco, SoundCloud 등)</span></label>
                  <input value={demoLink} onChange={e => setDemoLink(e.target.value)} placeholder="https://..." className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>최근 컷난 작업물 <span className="font-normal normal-case">최대 5개</span></label>
                    <span className={`text-[11px] ${dimText}`}>{works.filter(w => w.song_title.trim()).length}/5</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {works.map((w, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${D ? 'bg-white/[0.02] border-white/[0.07]' : 'bg-black/[0.02] border-black/[0.06]'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black ${dimText}`}>#{i + 1}</span>
                          {works.length > 1 && <button onClick={() => setWorks(p => p.filter((_, idx) => idx !== i))} className={`text-[11px] ${D ? 'text-zinc-700 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}>삭제</button>}
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input value={w.song_title} onChange={e => updateWork(i, { song_title: e.target.value })} placeholder="곡명" className={`w-full border rounded-lg px-3 py-2 text-[12px] outline-none transition-all ${inputCls}`} />
                            <input value={w.artist_name} onChange={e => updateWork(i, { artist_name: e.target.value })} placeholder="아티스트명" className={`w-full border rounded-lg px-3 py-2 text-[12px] outline-none transition-all ${inputCls}`} />
                          </div>
                          <input value={w.link} onChange={e => updateWork(i, { link: e.target.value })} placeholder="링크 (유튜브, 멜론, 스포티파이...)" className={`w-full border rounded-lg px-3 py-2 text-[12px] outline-none transition-all ${inputCls}`} />
                        </div>
                      </div>
                    ))}
                    {works.length < 5 && (
                      <button onClick={() => setWorks(p => [...p, emptyWork()])} className={`py-2.5 rounded-xl border border-dashed text-[11px] font-bold transition-all ${D ? 'border-white/10 text-zinc-600 hover:text-zinc-400' : 'border-black/10 text-zinc-400 hover:text-zinc-600'}`}>+ 작업물 추가</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 mt-4">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className={`flex-1 py-3.5 rounded-xl border font-bold text-[13px] transition-all ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>이전</button>
            )}
            {step < 4 ? (
              <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()} className={`flex-1 py-3.5 rounded-xl font-black text-[13px] transition-all ${canNext() ? 'bg-[#5B8CFF] text-white hover:opacity-90' : D ? 'bg-white/5 text-zinc-700 cursor-not-allowed' : 'bg-black/5 text-zinc-400 cursor-not-allowed'}`}>다음 →</button>
            ) : (
              <button onClick={handleFinish} disabled={saving} className="flex-1 py-3.5 rounded-xl bg-[#5B8CFF] text-white font-semibold text-[13px] transition-all hover:opacity-90 disabled:opacity-50">
                {saving ? '저장 중...' : '완료 🎉'}
              </button>
            )}
          </div>

          {step === 4 && (
            <button onClick={handleFinish} className={`w-full mt-3 text-[11px] font-bold transition-colors ${dimText} hover:text-[#5B8CFF]`}>나중에 입력할게요</button>
          )}
        </div>
      </main>
    </>
  );
}