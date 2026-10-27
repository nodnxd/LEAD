'use client';
import { warnFail } from '@/lib/log';
import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLang, LangToggle } from '@/lib/lang';
import InquiryModal from '@/components/InquiryModal';

const SUPER_ADMIN_EMAIL = 'hseu2000@gmail.com';
const BOTH_PRODUCT_EMAILS = ['hseu2000@gmail.com'];

// Uniform hub card / icon styling. Dynamic product colors go through inline style
// (Tailwind can't JIT runtime-built color classes).
// DESIGN.md: "Chrome stays flat and quiet - no gradients on controls, no drop shadows
// on chrome, surfaces separated by 1px hairlines". 이전 버전은 아이콘에 135° 그라디언트,
// 카드에 제품색 글로우 섀도를 걸어 둘 다 어겼다. 면은 헤어라인과 아주 옅은 틴트로만 가른다.
// 호버도 떠오르는 대신 테두리가 또렷해지는 쪽으로 — 들어올림은 모달에나 쓸 말이다.
function hubCard(color: string, filled = false) {
  return {
    className: 'hub-card group flex items-center gap-4 p-4 rounded-xl border text-left transition-colors duration-200',
    style: {
      borderColor: filled ? color + '40' : 'var(--hairline)',
      backgroundColor: filled ? color + '0f' : 'transparent',
      ['--gc']: color + '80',
    } as CSSProperties,
  };
}
function hubIcon(color: string) {
  return {
    className: 'w-11 h-11 rounded-xl flex items-center justify-center text-sub shrink-0 border',
    style: { backgroundColor: color + '14', borderColor: color + '2e', color } as CSSProperties,
  };
}

export default function HubPage() {
  const router = useRouter();
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [canHost, setCanHost] = useState(false);
  const [inqTopic, setInqTopic] = useState<string | null>(null); // 문의하기 모달 (호스트 권한 요청)
  const [operate, setOperate] = useState<{ id: string; name: string; owner: boolean }[]>([]);
  const [member, setMember] = useState<{ id: string; name: string }[]>([]);
  const [castProjects, setCastProjects] = useState<string[]>([]);
  const [castMemberships, setCastMemberships] = useState<{ hostId: string; project: string; name: string }[]>([]);
  // SPLIT도 LEAD·CAST와 같은 '내 것들 + 추가' 구조로 맞춘다.
  // 전에는 /split으로 가는 카드가 두 장 있었는데 둘이 완전히 같은 곳이었다.
  const [sheets, setSheets] = useState<{ id: string; title: string; sub: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) { router.push('/'); return; }
      setUser(u);
      const email = (u.email || '').toLowerCase();

      // 이메일 지정 초대 자동 입장 (lead → member_approvals 승인, cast → 로스터 프로필 연결)
      try { await supabase.rpc('claim_invites'); } catch (e) { warnFail('claim_invites', e); }

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

      // 스플릿시트 — 내가 만든 것과 참여 중인 것 (/split 화면과 같은 기준)
      const { data: owned } = await supabase.from('split_sheets')
        .select('id, song_title, artist_name').eq('owner_id', u.id)
        .order('created_at', { ascending: false }).limit(5);
      const { data: contrib } = await supabase.from('split_contributors')
        .select('sheet_id').eq('user_id', u.id);
      const otherIds = [...new Set((contrib || []).map((c: any) => c.sheet_id))]
        .filter(id => !(owned || []).some((x: any) => x.id === id));
      let shared: any[] = [];
      if (otherIds.length) {
        const { data } = await supabase.from('split_sheets')
          .select('id, song_title, artist_name').in('id', otherIds).limit(5);
        shared = data || [];
      }
      setSheets([...(owned || []), ...shared].slice(0, 6).map((x: any) => ({
        id: x.id,
        title: x.song_title || t('(제목 없음)', '(Untitled)'),
        sub: x.artist_name || t('아티스트 미정', 'Artist TBD'),
      })));

      setLoading(false);
    })();
  }, []);

  const enterOperate = (id: string) => { localStorage.setItem('selected_ws', id); router.push('/dashboard'); };
  const enterMember = (id: string) => { router.push(`/view/${id}?guest=1`); };
  const enterCast = (project?: string) => { if (project) localStorage.setItem('cast_current_project', project); router.push('/roster/dashboard'); };

  if (loading) return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center"><div className="w-6 h-6 border-2 border-brand-lead border-t-transparent rounded-full animate-spin" /></div>
  );

  const who = (user?.email || '').split('@')[0];
  const hh = new Date().getHours();
  const greet = hh < 6 ? t('늦은 밤이에요', 'Late night') : hh < 12 ? t('좋은 아침이에요', 'Good morning') : hh < 18 ? t('좋은 오후예요', 'Good afternoon') : t('좋은 저녁이에요', 'Good evening');

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .hub-card:hover{ border-color: var(--gc); }
      ` }} />
      <main className="min-h-screen bg-surface-0 text-bone font-ui">
        {/* 상단바는 본문 폭(2xl)과 분리한다 — 리스트는 좁아야 읽히지만 크롬은 가장자리에 붙는 게 맞다 */}
        <div className="max-w-2xl mx-auto px-5 lg:px-8 pt-8 pb-20">
          {/* top bar */}
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-body uppercase tracking-tighter flex items-center gap-2.5" translate="no">
                <span style={{ color: '#C14425' }}>LEAD</span>
                <span style={{ color: '#E3B24A' }}>CAST</span>
                <span style={{ color: '#2FB6A3' }}>SPLIT</span>
              </span>
              <span className="label-mono text-bone-faint" translate="no">by NEN</span>
            </div>
            <div className="flex items-center gap-2">
              <LangToggle />
              <Link href="/mypage" className="px-3 py-1.5 rounded-full border border-hairline bg-transparent text-bone-dim text-mini font-normal hover:text-bone transition">MY</Link>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-mini font-bold text-bone-dim hover:text-red-400 transition-colors">{t('로그아웃', 'Log out')}</button>
            </div>
          </div>

          {/* hero */}
          <div className="mb-14">
            <p className="text-bone-dim text-body">{greet}{who ? `, ${who}` : ''}</p>
            <h1 className="mt-2 font-display text-display leading-[1.05]">{t('오늘은 어디서 작업할까요?', 'Where are we working today?')}</h1>
          </div>

          <div className="flex flex-col gap-12">
          {/* ── LEAD ── company workspaces (선택형) */}
          <section>
            <div className="flex items-baseline gap-3 mb-4 px-1">
              <span className="font-display text-sub tracking-tight" style={{ color: '#C14425' }} translate="no">LEAD</span>
              <span className="text-mini text-bone-dim">{t('회사 워크스페이스', 'Company workspaces')}</span>
            </div>
            <div className="grid gap-2">
              {member.map(c => (
                <button key={c.id} onClick={() => enterMember(c.id)} {...hubCard('#C14425')}>
                  <div {...hubIcon('#C14425')}><i className="ti ti-microphone" aria-hidden="true"></i></div>
                  <div className="flex-1 min-w-0"><p className="font-black text-body truncate">{c.name}</p><p className="text-mini text-bone-dim">{t('게스트로 입장', 'Enter as guest')}</p></div>
                  <span className="text-brand-lead-text text-lead font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {canHost && operate.map(c => (
                <button key={c.id} onClick={() => enterOperate(c.id)} {...hubCard('#C14425', true)}>
                  <div {...hubIcon('#C14425')}><i className="ti ti-building" aria-hidden="true"></i></div>
                  <div className="flex-1 min-w-0"><p className="font-black text-body truncate">{c.name}</p><p className="text-mini text-bone-dim">{c.owner ? t('대시보드 운영', 'Owner') : t('공동 관리', 'Co-manager')}</p></div>
                  <span className="text-brand-lead-text text-lead font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {!canHost && (
                <button type="button" onClick={() => setInqTopic('LEAD 호스트 신청')} className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-brand-lead/25 bg-brand-lead/[0.03] hover:bg-brand-lead/[0.07] text-left transition">
                  <div {...hubIcon('#C14425')}>＋</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-body text-bone">{t('LEAD 시작하기', 'Get started with LEAD')}</p><p className="text-mini text-bone-dim">{t('호스트 권한 요청', 'Request host access')}</p></div>
                </button>
              )}
              {member.length === 0 && (!canHost || operate.length === 0) && (
                <div className="p-5 rounded-xl border border-dashed border-hairline text-center">
                  <p className="text-body text-bone-dim">{t('아직 참여 중인 회사가 없어요.', 'You haven’t joined any company yet.')}</p>
                  <p className="text-mini text-bone-dim mt-1">{t('받은 초대 링크로 입장하세요.', 'Enter with an invite link.')}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── CAST ── roster projects (LEAD와 동일하게 선택형) */}
          <section>
            <div className="flex items-baseline gap-3 mb-4 px-1">
              <span className="font-display text-sub tracking-tight" style={{ color: '#E3B24A' }} translate="no">CAST</span>
              <span className="text-mini text-bone-dim">{t('로스터', 'Rosters')}</span>
            </div>
            <div className="grid gap-2">
              {castMemberships.map(m => (
                <button key={`${m.hostId}|${m.project}`} onClick={() => router.push(`/roster/view/${m.hostId}`)} {...hubCard('#E3B24A')}>
                  <div {...hubIcon('#E3B24A')}><i className="ti ti-microphone" aria-hidden="true"></i></div>
                  <div className="flex-1 min-w-0"><p className="font-black text-body truncate">{m.project || t('로스터', 'Roster')}</p><p className="text-mini text-bone-dim">{t(`${m.name}(으)로 참여 중`, `Joined as ${m.name}`)}</p></div>
                  <span className="text-brand-cast-text text-lead font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {castProjects.map(p => (
                <button key={p} onClick={() => enterCast(p)} {...hubCard('#E3B24A', true)}>
                  <div {...hubIcon('#E3B24A')}><i className="ti ti-movie" aria-hidden="true"></i></div>
                  <div className="flex-1 min-w-0"><p className="font-black text-body truncate">{p}</p><p className="text-mini text-bone-dim">{t('로스터 열기', 'Open roster')}</p></div>
                  <span className="text-brand-cast-text text-lead font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              {(castProjects.length > 0 || canHost) ? (
                <button onClick={() => enterCast()} className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-brand-cast/25 bg-brand-cast/[0.03] hover:bg-brand-cast/[0.07] text-left transition">
                  <div {...hubIcon('#E3B24A')}>＋</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-body text-bone">{castProjects.length ? t('새 로스터 · CAST 열기', 'New roster · Open CAST') : t('CAST 시작하기', 'Get started with CAST')}</p><p className="text-mini text-bone-dim">{t('아티스트 로스터 짜기', 'Build your artist roster')}</p></div>
                </button>
              ) : castMemberships.length === 0 ? (
                <button type="button" onClick={() => setInqTopic('CAST 호스트 신청')} className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-brand-cast/25 bg-brand-cast/[0.03] hover:bg-brand-cast/[0.07] text-left transition">
                  <div {...hubIcon('#E3B24A')}>＋</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-body text-bone">{t('CAST 시작하기', 'Get started with CAST')}</p><p className="text-mini text-bone-dim">{t('호스트 권한 요청 · 초대받으면 자동 입장', 'Request host access · invites auto-join')}</p></div>
                </button>
              ) : null}
            </div>
          </section>

          {/* ── SPLIT ── */}
          <section>
            <div className="flex items-baseline gap-3 mb-4 px-1">
              <span className="font-display text-sub tracking-tight" style={{ color: '#2FB6A3' }} translate="no">SPLIT</span>
              <span className="text-mini text-bone-dim">{t('저작권 지분', 'Songwriter splits')}</span>
            </div>
            <div className="grid gap-2">
              {sheets.map(sh => (
                <button key={sh.id} onClick={() => router.push(`/split/${sh.id}`)} {...hubCard('#2FB6A3', true)}>
                  <div {...hubIcon('#2FB6A3')}><i className="ti ti-file-text" aria-hidden="true"></i></div>
                  <div className="flex-1 min-w-0"><p className="font-black text-body truncate text-bone">{sh.title}</p><p className="text-mini text-bone-dim truncate">{sh.sub}</p></div>
                  <span className="text-brand-split-text text-lead font-black shrink-0 opacity-60">→</span>
                </button>
              ))}
              <Link href="/split" className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-brand-split/25 bg-brand-split/[0.03] hover:bg-brand-split/[0.07] text-left transition-colors">
                <div {...hubIcon('#2FB6A3')}>＋</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-body text-bone">{sheets.length ? t('스플릿시트 전체 보기', 'All split sheets') : t('SPLIT 시작하기', 'Get started with SPLIT')}</p>
                  <p className="text-mini text-bone-dim">{sheets.length ? t('만들기 · 서명 요청 · CWR 내보내기', 'Create, request signatures, export CWR') : t('전세계 표준 저작권 지분 문서', 'Global-standard split sheet')}</p>
                </div>
              </Link>
            </div>
          </section>
          </div>

          {!canHost && member.length === 0 && (
            <p className="text-center text-mini text-bone-dim mt-8">{t('호스트 권한이 필요하면 담당자에게 문의하세요.', 'Contact your admin if you need host access.')}</p>
          )}
        </div>
      </main>
      <InquiryModal topic={inqTopic} onClose={() => setInqTopic(null)} brand={inqTopic === 'CAST 호스트 신청' ? 'cast' : 'lead'} />
    </>
  );
}
