'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/lang';

const ROLE_LABELS: Record<string, string> = {
  producer: 'Producer', topliner: 'Top-liner', lyricist: 'Lyricist', engineer: 'Engineer', ar: 'A&R',
};

export default function CardPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [imgError, setImgError] = useState(false);
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) { router.back(); return; }
    window.close();
    setTimeout(() => { if (!window.closed) router.push('/mypage'); }, 200);
  };
  const [profile, setProfile] = useState<any>(null);
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const s = localStorage.getItem('lead_theme');
    if (s === 'light') setTheme('light');
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    // 멤버 테이블 먼저
    const { data: m } = await supabase.from('members').select('*').eq('id', userId).single();
    if (m) {
      setProfile({ ...m, userType: 'member' });
      const { data: w } = await supabase.from('released_works').select('*').eq('member_id', userId).order('order_index');
      if (w) setWorks(w);
    } else {
      // 호스트 프로필
      const { data: h } = await supabase.from('host_profiles').select('*').eq('id', userId).single();
      if (h) setProfile({ ...h, userType: 'host' });
    }
    setLoading(false);
  };

  const D = theme === 'dark';
  const bg = D ? 'bg-[#141414]' : 'bg-[#E6E6EC]';
  const card = D ? 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]' : 'bg-white border-black/[0.08]';
  const tx = D ? 'text-white' : 'text-[#111]';
  const dm = D ? 'text-zinc-500' : 'text-zinc-500';
  const dv = D ? 'border-white/[0.07]' : 'border-black/[0.07]';
  const isHost = profile?.userType === 'host';

  if (loading) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!profile) return (
    <div className={`min-h-screen ${bg} ${tx} flex items-center justify-center font-pretendard`}>
      <p>{t('프로필을 찾을 수 없어요', 'Profile not found')}</p>
    </div>
  );

  const displayName = profile.artist_name || profile.display_name || '—';
  const rawPhoto = profile.photo_url || '';
  const photoSrc = rawPhoto && !/^https?:\/\//.test(rawPhoto)
    ? supabase.storage.from('member-photos').getPublicUrl(rawPhoto).data.publicUrl
    : rawPhoto;
  const showPhoto = !!photoSrc && !imgError;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');.font-pretendard{font-family:'Pretendard',sans-serif;}@media print{.no-print{display:none!important;}body{background:#fff!important;}#comp-card{box-shadow:none!important;border-color:#eee!important;}}` }} />
      <main className={`min-h-screen ${bg} font-pretendard p-5 flex flex-col items-center justify-center`}>
        {/* 상단 고정 뒤로가기 */}
        <button onClick={goBack} className={`no-print fixed top-4 left-4 z-50 w-10 h-10 rounded-full border flex items-center justify-center text-[16px] shadow-lg ${D ? 'bg-[#1a1a1a] border-white/10 text-white' : 'bg-white border-black/[0.08] text-[#111]'}`}>←</button>
        {/* 컴카드 */}
        <div id="comp-card" className={`w-full max-w-sm border rounded-3xl overflow-hidden shadow-2xl ${card}`}>
          {/* 헤더 배너 */}
          <div className={`h-24 relative ${isHost ? 'bg-gradient-to-br from-amber-500/40 to-orange-400/20' : 'bg-gradient-to-br from-[#6366F1]/40 to-purple-500/20'}`}>
            <div className="absolute bottom-[-36px] left-6">
              <div className="rounded-2xl overflow-hidden border-2 border-white/20 bg-black/30 flex items-center justify-center shadow-xl" style={{ width: 72, height: 72 }}>
                {showPhoto
                  ? <img src={photoSrc} alt={displayName} referrerPolicy="no-referrer" onError={() => setImgError(true)} className="w-full h-full object-cover" />
                  : <span className={`text-3xl font-black ${isHost ? 'text-amber-400' : 'text-[#6366F1]'}`}>{displayName[0].toUpperCase()}</span>}
              </div>
            </div>
            {isHost && (
              <span className="absolute top-3 right-4 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-black">HOST</span>
            )}
          </div>

          <div className="px-6 pt-12 pb-6">
            <h1 className={`font-black text-[26px] leading-tight ${tx}`}>{displayName}</h1>
            {profile.name && profile.name !== profile.artist_name && (
              <p className={`text-[13px] mt-0.5 ${dm}`}>{profile.name}</p>
            )}

            {/* 역할 뱃지 */}
            {(profile.roles || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {profile.roles.map((r: string) => (
                  <span key={r} className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${isHost ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-[#6366F1]/30 bg-[#6366F1]/10 text-[#6366F1]'}`}>
                    {ROLE_LABELS[r] || r}
                  </span>
                ))}
              </div>
            )}

            {/* 정보 */}
            <div className={`mt-5 pt-4 border-t ${dv} flex flex-col gap-2.5`}>
              {profile.company && (
                <Row label={t('소속', 'Company')} value={profile.company} D={D} />
              )}
              {(profile.email) && (
                <Row label={t('이메일', 'Email')} value={profile.email} D={D} />
              )}
              {profile.instagram && (
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest w-14 ${dm}`}>{t('인스타', 'IG')}</span>
                  <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[#6366F1] hover:underline">@{profile.instagram}</a>
                </div>
              )}
              {(profile.genres || []).length > 0 && (
                <div className="flex items-start gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-widest w-14 shrink-0 mt-0.5 ${dm}`}>{t('장르', 'Genres')}</span>
                  <div className="flex flex-wrap gap-1">
                    {profile.genres.slice(0, 5).map((g: string) => (
                      <span key={g} className={`text-[11px] font-bold px-2 py-0.5 rounded ${D ? 'bg-white/5 text-zinc-300' : 'bg-black/[0.05] text-zinc-600'}`}>
                        {g.startsWith('ETC:') ? g.slice(4) : g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className={`mt-4 pt-4 border-t ${dv}`}>
                <p className={`text-[12px] leading-relaxed whitespace-pre-line ${dm}`}>{profile.bio}</p>
              </div>
            )}

            {/* SNS · Links */}
            {profile.links && Object.values(profile.links).some(Boolean) && (
              <div className={`mt-4 pt-4 border-t ${dv} flex flex-wrap gap-2`}>
                {Object.entries(profile.links as Record<string, string>).filter(([, v]) => v).map(([k, v]) => {
                  const label: Record<string, string> = { spotify: 'Spotify', youtube: 'YouTube', soundcloud: 'SoundCloud', x: 'X', tiktok: 'TikTok', website: 'Web' };
                  const href = v.startsWith('http') ? v : `https://${v}`;
                  return <a key={k} href={href} target="_blank" rel="noopener noreferrer" className={`text-[11px] font-black px-2.5 py-1 rounded-full border transition-all ${D ? 'border-white/10 bg-white/5 text-zinc-300 hover:text-white' : 'border-black/[0.08] bg-black/[0.04] text-zinc-600 hover:text-[#111]'}`}>{label[k] || k} →</a>;
                })}
              </div>
            )}

            {/* Released Works */}
            {works.length > 0 && (
              <div className={`mt-4 pt-4 border-t ${dv}`}>
                <p className={`text-[11px] font-black uppercase tracking-widest mb-2.5 ${dm}`}>💿 Released Works</p>
                <div className="flex flex-col gap-1.5">
                  {works.slice(0, 5).map((w, i) => (
                    <a key={i} href={w.link} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${D ? 'bg-white/[0.02] hover:bg-white/5' : 'bg-black/[0.02] hover:bg-black/[0.05]'}`}>
                      <span className="text-[13px]">🎶</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-bold truncate ${D ? 'text-zinc-200' : 'text-zinc-700'}`}>{w.song_title}</p>
                        <p className={`text-[11px] ${dm}`}>{w.artist_name}</p>
                      </div>
                      <span className="text-[#6366F1] text-[12px]">→</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 푸터 */}
            <div className={`mt-5 pt-3 border-t ${dv} flex items-center justify-between`}>
              <span className={`text-[9px] font-black tracking-[0.25em] ${D ? 'text-zinc-700' : 'text-zinc-300'}`}>LEAD by NEN</span>
              <span className={`text-[9px] ${dm}`}>lead-by-nen.vercel.app</span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="no-print flex gap-3 mt-4 w-full max-w-sm">
          <button onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl bg-[#6366F1] text-white font-semibold text-[13px] hover:opacity-90 transition-all">
            📄 {t('PDF 저장', 'Save PDF')}
          </button>
          <button onClick={goBack}
            className={`px-5 py-3 rounded-xl border font-bold text-[13px] transition-all ${D ? 'border-white/10 text-zinc-500 hover:text-white' : 'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
            ← {t('뒤로', 'Back')}
          </button>
        </div>
      </main>
    </>
  );
}

function Row({ label, value, D }: { label: string; value: string; D: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-[10px] font-black uppercase tracking-widest w-14 ${D ? 'text-zinc-600' : 'text-zinc-400'}`}>{label}</span>
      <span className={`text-[12px] ${D ? 'text-zinc-300' : 'text-zinc-700'}`}>{value}</span>
    </div>
  );
}
