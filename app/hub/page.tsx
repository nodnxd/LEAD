'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLang, LangToggle } from '@/lib/lang';

const SUPER_ADMIN_EMAIL = 'everplayground@gmail.com';
const BOTH_PRODUCT_EMAILS = ['hseu2000@gmail.com', 'everplayground@gmail.com'];

// Uniform hub card / icon styling. Dynamic product colors go through inline style
// (Tailwind can't JIT runtime-built color classes).
function hubCard(color: string, filled = false) {
  return {
    className: 'flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:brightness-125',
    style: {
      borderColor: filled ? color + '4d' : 'rgba(255,255,255,0.08)',
      backgroundColor: filled ? color + '14' : 'rgba(255,255,255,0.02)',
    },
  };
}
function hubIcon(color: string) {
  return {
    className: 'w-11 h-11 rounded-xl flex items-center justify-center text-[18px] shrink-0',
    style: { backgroundColor: color + '26', color },
  };
}

export default function HubPage() {
  const router = useRouter();
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [canHost, setCanHost] = useState(false);
  const [operate, setOperate] = useState<{ id: string; name: string; owner: boolean }[]>([]);
  const [member, setMember] = useState<{ id: string; name: string }[]>([]);
  const [castProjects, setCastProjects] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) { router.push('/'); return; }
      setUser(u);
      const email = (u.email || '').toLowerCase();

      // 호스트 권한: 슈퍼관리자 / 허용명단 / host_grants / 기존 호스트 데이터(grandfather)
      let host = email === SUPER_ADMIN_EMAIL || BOTH_PRODUCT_EMAILS.includes(email);
      if (!host) {
        const { data: g } = await supabase.from('host_grants').select('id').eq('email', email).eq('status', 'approved').maybeSingle();
        if (g) host = true;
      }
      if (!host) {
        const { data: hp } = await supabase.from('host_profiles').select('id').eq('id', u.id).maybeSingle();
        if (hp) host = true;
      }
      if (!host) {
        const { data: ld } = await supabase.from('leads').select('id').eq('host_id', u.id).limit(1);
        if (ld && ld.length) host = true;
      }
      setCanHost(host);

      // 참여 중인 회사 (게스트)
      const { data: ma } = await supabase.from('member_approvals')
        .select('host_id').eq('member_id', u.id).in('status', ['approved', 'admin']).neq('host_id', u.id);
      const memberIds = [...new Set((ma || []).map((a: any) => a.host_id))];

      // 운영 중인 회사 (호스트)
      let operateIds: { id: string; owner: boolean }[] = [];
      if (host) {
        operateIds.push({ id: u.id, owner: true });
        const { data: wa } = await supabase.from('workspace_admins').select('workspace_id').eq('admin_id', u.id);
        (wa || []).forEach((w: any) => { if (w.workspace_id !== u.id) operateIds.push({ id: w.workspace_id, owner: false }); });
      }

      // 회사 이름 조회
      const allIds = [...new Set([...memberIds, ...operateIds.map(o => o.id)])];
      const nameMap: Record<string, string> = {};
      if (allIds.length) {
        const { data: hp } = await supabase.from('host_profiles').select('id,company,display_name').in('id', allIds);
        (hp || []).forEach((h: any) => { nameMap[h.id] = h.company || h.display_name || ''; });
      }
      setMember(memberIds.map(id => ({ id, name: nameMap[id] || '이름 없는 회사' })));
      setOperate(operateIds.map(o => ({ id: o.id, name: nameMap[o.id] || (o.owner ? '내 회사' : '회사'), owner: o.owner })));

      // CAST projects (rosters) — same selectable treatment as LEAD companies
      const ls = JSON.parse(localStorage.getItem(`epg_projects_${u.id}`) || 'null');
      let castList: string[] = Array.isArray(ls) ? ls.filter(Boolean) : [];
      if (castList.length === 0) {
        const { data: profs } = await supabase.from('profiles').select('project').eq('user_id', u.id);
        castList = [...new Set((profs || []).map((p: any) => p.project).filter(Boolean))] as string[];
      }
      setCastProjects(castList);
      setLoading(false);
    })();
  }, []);

  const enterOperate = (id: string) => { localStorage.setItem('selected_ws', id); router.push('/dashboard'); };
  const enterMember = (id: string) => { router.push(`/view/${id}?guest=1`); };
  const enterCast = (project?: string) => { if (project) localStorage.setItem('cast_current_project', project); router.push('/roster/dashboard'); };

  if (loading) return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#3E78DB] border-t-transparent rounded-full animate-spin" /></div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}` }} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}` }} />
      <main className="min-h-screen bg-[#141414] text-white font-pretendard p-5 lg:p-8 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{background:'#3E78DB', filter:'blur(200px)', animation:'orb-pulse 4s ease-in-out infinite'}} />
        <div className="relative z-10 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-4xl font-semibold text-[#3E78DB] uppercase tracking-tighter">LEAD</h1>
              <span className="text-zinc-600 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
            </div>
            <div className="flex items-center gap-2">
              <LangToggle />
              <a href="/mypage" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-[11px] font-normal hover:text-white transition-all">MY</a>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-[11px] font-bold text-zinc-600 hover:text-red-400 transition-colors">{t('로그아웃', 'Log out')}</button>
            </div>
          </div>

          {/* ── LEAD ── company workspaces (선택형) */}
          <section className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3E78DB]" />
              <span className="text-[13px] font-black tracking-tight text-white">LEAD</span>
              <span className="text-[11px] text-zinc-600">{t('회사 워크스페이스', 'Company workspace')}</span>
            </div>
            <div className="grid gap-2.5">
              {member.map(c => (
                <button key={c.id} onClick={() => enterMember(c.id)} {...hubCard('#3E78DB')}>
                  <div {...hubIcon('#3E78DB')}>🎤</div>
                  <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{c.name}</p><p className="text-[12px] text-zinc-500">{t('게스트로 입장', 'Enter as guest')}</p></div>
                  <span className="text-[#3E78DB] text-[16px] font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {canHost && operate.map(c => (
                <button key={c.id} onClick={() => enterOperate(c.id)} {...hubCard('#3E78DB', true)}>
                  <div {...hubIcon('#3E78DB')}>🏢</div>
                  <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{c.name}</p><p className="text-[12px] text-zinc-500">{c.owner ? t('대시보드 운영', 'Owner') : t('공동 관리', 'Co-manager')}</p></div>
                  <span className="text-[#3E78DB] text-[16px] font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {member.length === 0 && (!canHost || operate.length === 0) && (
                <div className="p-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center">
                  <p className="text-[13px] text-zinc-500">{t('아직 참여 중인 회사가 없어요.', 'You haven’t joined any company yet.')}</p>
                  <p className="text-[12px] text-zinc-600 mt-1">{t('받은 초대 링크로 입장하세요.', 'Enter with an invite link.')}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── CAST ── roster projects (LEAD와 동일하게 선택형) */}
          <section className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E3B24A]" />
              <span className="text-[13px] font-black tracking-tight text-white">CAST</span>
              <span className="text-[11px] text-zinc-600">{t('로스터', 'Rosters')}</span>
            </div>
            <div className="grid gap-2.5">
              {castProjects.map(p => (
                <button key={p} onClick={() => enterCast(p)} {...hubCard('#E3B24A', true)}>
                  <div {...hubIcon('#E3B24A')}>🎬</div>
                  <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{p}</p><p className="text-[12px] text-zinc-500">{t('로스터 열기', 'Open roster')}</p></div>
                  <span className="text-[#E3B24A] text-[16px] font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              <button onClick={() => enterCast()} className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-[#E3B24A]/25 bg-[#E3B24A]/[0.03] hover:bg-[#E3B24A]/[0.07] text-left transition-all">
                <div {...hubIcon('#E3B24A')}>＋</div>
                <div className="flex-1 min-w-0"><p className="font-bold text-[14px] text-zinc-300">{castProjects.length ? t('새 로스터 · CAST 열기', 'New roster · Open CAST') : t('CAST 시작하기', 'Get started with CAST')}</p><p className="text-[12px] text-zinc-500">{t('아티스트 로스터 짜기', 'Build your artist roster')}</p></div>
              </button>
            </div>
          </section>

          {/* ── Tools ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FB6A3]" />
              <span className="text-[11px] font-normal uppercase tracking-widest text-zinc-500">{t('도구', 'Tools')}</span>
            </div>
            <a href="/split" {...hubCard('#2FB6A3', true)}>
              <div {...hubIcon('#2FB6A3')}>📝</div>
              <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate text-white">Split Sheet <span className="text-[11px] text-zinc-500 font-bold">{t('저작권 지분', 'Songwriter splits')}</span></p><p className="text-[12px] text-zinc-500">{t('전세계 표준 저작권 지분 문서', 'Global-standard split sheet')}</p></div>
              <span className="text-[#2FB6A3] text-[16px] font-black shrink-0 opacity-60">→</span>
            </a>
          </section>

          {!canHost && member.length === 0 && (
            <p className="text-center text-[12px] text-zinc-700 mt-8">{t('호스트 권한이 필요하면 담당자에게 문의하세요.', 'Contact your admin if you need host access.')}</p>
          )}
        </div>
      </main>
    </>
  );
}
