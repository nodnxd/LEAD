'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLang, LangToggle } from '@/lib/lang';

const SUPER_ADMIN_EMAIL = 'everplayground@gmail.com';
const BOTH_PRODUCT_EMAILS = ['hseu2000@gmail.com', 'everplayground@gmail.com'];

// Uniform hub card / icon styling. Dynamic product colors go through inline style
// (Tailwind can't JIT runtime-built color classes).
function hubCard(color: string, filled = false) {
  return {
    className: 'hub-card group flex items-center gap-3.5 p-4 rounded-3xl border text-left transition-all duration-200 hover:-translate-y-0.5',
    style: {
      borderColor: filled ? color + '3d' : 'rgba(255,255,255,0.07)',
      backgroundColor: filled ? color + '12' : 'rgba(255,255,255,0.025)',
      ['--gc']: color + '55',
    } as CSSProperties,
  };
}
function hubIcon(color: string) {
  return {
    className: 'w-12 h-12 rounded-2xl flex items-center justify-center text-[20px] shrink-0',
    style: {
      background: `linear-gradient(135deg, ${color}33, ${color}12)`,
      color,
      boxShadow: `inset 0 0 0 1px ${color}22`,
    } as CSSProperties,
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
  const [castMemberships, setCastMemberships] = useState<{ hostId: string; project: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) { router.push('/'); return; }
      setUser(u);
      const email = (u.email || '').toLowerCase();

      // 이메일 지정 초대 자동 입장 (lead → member_approvals 승인, cast → 로스터 프로필 연결)
      try { await supabase.rpc('claim_invites'); } catch {}

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

      // 초대로 연결된 로스터 (멤버로 참여)
      const { data: cm } = await supabase.from('profiles').select('user_id, project, name').eq('member_user_id', u.id);
      const seen = new Set<string>();
      setCastMemberships((cm || []).filter((p: any) => {
        const k = `${p.user_id}|${p.project || ''}`;
        if (p.user_id === u.id || seen.has(k)) return false;
        seen.add(k); return true;
      }).map((p: any) => ({ hostId: p.user_id, project: p.project || '', name: p.name || '' })));

      setLoading(false);
    })();
  }, []);

  const enterOperate = (id: string) => { localStorage.setItem('selected_ws', id); router.push('/dashboard'); };
  const enterMember = (id: string) => { router.push(`/view/${id}?guest=1`); };
  const enterCast = (project?: string) => { if (project) localStorage.setItem('cast_current_project', project); router.push('/roster/dashboard'); };

  if (loading) return (
    <div className="min-h-screen bg-[#141416] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" /></div>
  );

  const who = (user?.email || '').split('@')[0];
  const hh = new Date().getHours();
  const greet = hh < 6 ? t('늦은 밤이에요', 'Late night') : hh < 12 ? t('좋은 아침이에요', 'Good morning') : hh < 18 ? t('좋은 오후예요', 'Good afternoon') : t('좋은 저녁이에요', 'Good evening');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}` }} />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes orb-float{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(0,-18px) scale(1.06);}}
        .hub-card:hover{ box-shadow: 0 12px 36px -12px var(--gc); }
      ` }} />
      <main className="min-h-screen bg-[#141416] text-white font-pretendard relative overflow-hidden">
        {/* soft product orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full" style={{ background:'#6366F1', filter:'blur(200px)', opacity:0.10, animation:'orb-float 9s ease-in-out infinite' }} />
          <div className="absolute top-10 -right-40 w-[480px] h-[480px] rounded-full" style={{ background:'#E3B24A', filter:'blur(210px)', opacity:0.07, animation:'orb-float 11s ease-in-out infinite 1s' }} />
          <div className="absolute -bottom-48 left-1/3 w-[500px] h-[500px] rounded-full" style={{ background:'#2FB6A3', filter:'blur(210px)', opacity:0.07, animation:'orb-float 13s ease-in-out infinite 2s' }} />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 lg:px-8 pt-7 pb-16">
          {/* top bar */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[15px] font-black uppercase tracking-tighter">
                <span style={{ color: '#6366F1' }}>LEAD</span><span className="text-white/15">·</span><span style={{ color: '#E3B24A' }}>CAST</span><span className="text-white/15">·</span><span style={{ color: '#2FB6A3' }}>SPLIT</span>
              </span>
              <span className="text-zinc-600 text-[10px] font-bold tracking-[0.2em]">by NEN</span>
            </div>
            <div className="flex items-center gap-2">
              <LangToggle />
              <a href="/mypage" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-[11px] font-normal hover:text-white transition-all">MY</a>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-[11px] font-bold text-zinc-600 hover:text-red-400 transition-colors">{t('로그아웃', 'Log out')}</button>
            </div>
          </div>

          {/* hero */}
          <div className="mb-11">
            <p className="text-zinc-500 text-[13px] font-medium">{greet}{who ? `, ${who}` : ''}</p>
            <h1 className="mt-1.5 text-[28px] md:text-[34px] font-bold tracking-tight leading-tight">{t('오늘은 어디서 작업할까요?', 'Where are we working today?')}</h1>
          </div>

          <div className="flex flex-col gap-9">
          {/* ── LEAD ── company workspaces (선택형) */}
          <section>
            <div className="flex items-center gap-2.5 mb-3.5 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background:'#6366F1', boxShadow:'0 0 12px #6366F1' }} />
              <span className="text-[15px] font-black tracking-tight text-white">LEAD</span>
              <span className="text-[11px] text-zinc-600 font-medium">{t('회사 워크스페이스', 'Company workspaces')}</span>
            </div>
            <div className="grid gap-2.5">
              {member.map(c => (
                <button key={c.id} onClick={() => enterMember(c.id)} {...hubCard('#6366F1')}>
                  <div {...hubIcon('#6366F1')}>🎤</div>
                  <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{c.name}</p><p className="text-[12px] text-zinc-500">{t('게스트로 입장', 'Enter as guest')}</p></div>
                  <span className="text-[#6366F1] text-[16px] font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {canHost && operate.map(c => (
                <button key={c.id} onClick={() => enterOperate(c.id)} {...hubCard('#6366F1', true)}>
                  <div {...hubIcon('#6366F1')}>🏢</div>
                  <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{c.name}</p><p className="text-[12px] text-zinc-500">{c.owner ? t('대시보드 운영', 'Owner') : t('공동 관리', 'Co-manager')}</p></div>
                  <span className="text-[#6366F1] text-[16px] font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {!canHost && (
                <a href="mailto:everplayground@gmail.com?subject=LEAD host access" className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-[#6366F1]/25 bg-[#6366F1]/[0.03] hover:bg-[#6366F1]/[0.07] text-left transition-all">
                  <div {...hubIcon('#6366F1')}>＋</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-[14px] text-zinc-300">{t('LEAD 시작하기', 'Get started with LEAD')}</p><p className="text-[12px] text-zinc-500">{t('호스트 권한 요청', 'Request host access')}</p></div>
                </a>
              )}
              {member.length === 0 && (!canHost || operate.length === 0) && (
                <div className="p-5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] text-center">
                  <p className="text-[13px] text-zinc-500">{t('아직 참여 중인 회사가 없어요.', 'You haven’t joined any company yet.')}</p>
                  <p className="text-[12px] text-zinc-600 mt-1">{t('받은 초대 링크로 입장하세요.', 'Enter with an invite link.')}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── CAST ── roster projects (LEAD와 동일하게 선택형) */}
          <section>
            <div className="flex items-center gap-2.5 mb-3.5 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background:'#E3B24A', boxShadow:'0 0 12px #E3B24A' }} />
              <span className="text-[15px] font-black tracking-tight text-white">CAST</span>
              <span className="text-[11px] text-zinc-600 font-medium">{t('로스터', 'Rosters')}</span>
            </div>
            <div className="grid gap-2.5">
              {castMemberships.map(m => (
                <button key={`${m.hostId}|${m.project}`} onClick={() => router.push(`/roster/view/${m.hostId}`)} {...hubCard('#E3B24A')}>
                  <div {...hubIcon('#E3B24A')}>🎤</div>
                  <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{m.project || t('로스터', 'Roster')}</p><p className="text-[12px] text-zinc-500">{t(`${m.name}(으)로 참여 중`, `Joined as ${m.name}`)}</p></div>
                  <span className="text-[#E3B24A] text-[16px] font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {castProjects.map(p => (
                <button key={p} onClick={() => enterCast(p)} {...hubCard('#E3B24A', true)}>
                  <div {...hubIcon('#E3B24A')}>🎬</div>
                  <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{p}</p><p className="text-[12px] text-zinc-500">{t('로스터 열기', 'Open roster')}</p></div>
                  <span className="text-[#E3B24A] text-[16px] font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {(castProjects.length > 0 || canHost) ? (
                <button onClick={() => enterCast()} className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-[#E3B24A]/25 bg-[#E3B24A]/[0.03] hover:bg-[#E3B24A]/[0.07] text-left transition-all">
                  <div {...hubIcon('#E3B24A')}>＋</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-[14px] text-zinc-300">{castProjects.length ? t('새 로스터 · CAST 열기', 'New roster · Open CAST') : t('CAST 시작하기', 'Get started with CAST')}</p><p className="text-[12px] text-zinc-500">{t('아티스트 로스터 짜기', 'Build your artist roster')}</p></div>
                </button>
              ) : castMemberships.length === 0 ? (
                <a href="mailto:everplayground@gmail.com?subject=CAST host access" className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-[#E3B24A]/25 bg-[#E3B24A]/[0.03] hover:bg-[#E3B24A]/[0.07] text-left transition-all">
                  <div {...hubIcon('#E3B24A')}>＋</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-[14px] text-zinc-300">{t('CAST 시작하기', 'Get started with CAST')}</p><p className="text-[12px] text-zinc-500">{t('호스트 권한 요청 · 초대받으면 자동 입장', 'Request host access · invites auto-join')}</p></div>
                </a>
              ) : null}
            </div>
          </section>

          {/* ── SPLIT ── */}
          <section>
            <div className="flex items-center gap-2.5 mb-3.5 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background:'#2FB6A3', boxShadow:'0 0 12px #2FB6A3' }} />
              <span className="text-[15px] font-black tracking-tight text-white">SPLIT</span>
              <span className="text-[11px] text-zinc-600 font-medium">{t('저작권 지분', 'Songwriter splits')}</span>
            </div>
            <div className="grid gap-2.5">
              <a href="/split" {...hubCard('#2FB6A3', true)}>
                <div {...hubIcon('#2FB6A3')}>📝</div>
                <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate text-white">{t('스플릿시트', 'Split Sheet')}</p><p className="text-[12px] text-zinc-500">{t('전세계 표준 저작권 지분 문서', 'Global-standard split sheet')}</p></div>
                <span className="text-[#2FB6A3] text-[16px] font-black shrink-0 opacity-60">→</span>
              </a>
              <a href="/split" className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-[#2FB6A3]/25 bg-[#2FB6A3]/[0.03] hover:bg-[#2FB6A3]/[0.07] text-left transition-all">
                <div {...hubIcon('#2FB6A3')}>＋</div>
                <div className="flex-1 min-w-0"><p className="font-bold text-[14px] text-zinc-300">{t('새 스플릿시트', 'New split sheet')}</p><p className="text-[12px] text-zinc-500">{t('저작권 지분 문서 만들기', 'Create a split sheet')}</p></div>
              </a>
            </div>
          </section>
          </div>

          {!canHost && member.length === 0 && (
            <p className="text-center text-[12px] text-zinc-700 mt-8">{t('호스트 권한이 필요하면 담당자에게 문의하세요.', 'Contact your admin if you need host access.')}</p>
          )}
        </div>
      </main>
    </>
  );
}
