'use client';
import { fmtDate } from '@/lib/format';
import { pressable } from '@/lib/a11y';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import { getLang, setLangValue, LANG_EVENT } from '@/lib/lang';
import { onDbError } from '@/lib/dbErrors';
import { buildDaysIcs, downloadIcs } from '@/lib/ics';
import { getLinkIcon, linkName } from '@/lib/links';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CheckIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const XIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const DotIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="2.5" fill="currentColor" opacity="0.6"/></svg>;

const ROLE_ORDER = ['Producer', 'Topliner', 'Engineer', 'A&R'];

const TV = {
  ko: {
    attending: '참석', absent: '불참', noResponse: '미응답',
    vote: 'Vote', history: '히스토리', guest: 'Guest',
    notFound: '존재하지 않는 로스터예요',
    noSession: '저장된 세션이 없어요',
    notice: '공지',
    members: (n: number) => `${n}명`,
    portalHi: (n: string) => `${n}님, 반가워요`, portalDesc: '내 일정과 가능일 투표를 여기서 챙겨요',
    portalConfirmed: '확정 일정', portalIcs: '캘린더 저장 (.ics)', portalVote: '가능일 투표하기', portalNoConfirm: '아직 확정된 일정이 없어요',
    myStudio: '내 스튜디오', myMates: '함께', myStudioNone: '이 날은 아직 배치 전이에요',
    saveFailed: '저장이 안 됐어요. 다시 눌러주세요.',
  },
  en: {
    attending: 'Attending', absent: 'Absent', noResponse: 'No Response',
    vote: 'Vote', history: 'History', guest: 'Guest',
    notFound: 'Roster not found',
    noSession: 'No sessions saved',
    notice: 'Notice',
    members: (n: number) => `${n}`,
    portalHi: (n: string) => `Welcome, ${n}`, portalDesc: 'Your schedule and availability poll, all here',
    portalConfirmed: 'Confirmed dates', portalIcs: 'Save calendar (.ics)', portalVote: 'Vote availability', portalNoConfirm: 'No confirmed dates yet',
    myStudio: 'My studio', myMates: 'With', myStudioNone: 'Not assigned for this day yet',
    saveFailed: 'Could not save. Please tap again.',
  }
};

type Lang = 'ko' | 'en';
type Theme = 'dark' | 'light';

export default function GuestView() {
  const params = useParams();
  const hostId = params.hostId as string;

  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [currentProject, setCurrentProject] = useState('');
  const [teams, setTeams] = useState<string[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [notices, setNotices] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [days, setDays] = useState<number[]>([1]);
  const [dayNames, setDayNames] = useState<Record<number, string>>({});
  const [dayDates, setDayDates] = useState<Record<number, string>>({});

  const [votingOpen, setVotingOpen] = useState(false);
  const [votingTitle, setVotingTitle] = useState('');
  const [votingMemo, setVotingMemo] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<any>(null);
  const [linkPopover, setLinkPopover] = useState<{ member: any; x: number; y: number } | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [me, setMe] = useState<any>(null); // 로그인한 멤버 본인(초대 연결됨)
  const [portalPoll, setPortalPoll] = useState<any>(null); // 최신 열린/최근 가능일 투표

  const [lang, setLang] = useState<Lang>('ko');
  const [theme, setTheme] = useState<Theme>('dark');
  const tv = TV[lang];

  const [zoom, setZoom] = useState(1);
  const isDraggingZoom = useRef(false);
  const dragStartY = useRef(0);
  const dragStartZoom = useRef(1);

  // 테마/언어 로드 (앱 전역 언어와 공유)
  useEffect(() => {
    setLang(getLang());
    const savedTheme = localStorage.getItem('cast_theme') as Theme | null;
    if (savedTheme) setTheme(savedTheme);
    const sync = () => setLang(getLang());
    window.addEventListener(LANG_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(LANG_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);

  useEffect(() => onDbError(e => { if (e.write) setDbError(e.message); }), []);

  const toggleLang = () => { setLangValue(lang === 'ko' ? 'en' : 'ko'); };
  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next); localStorage.setItem('cast_theme', next);
  };

  // 테마 변수
  const bg = theme === 'light' ? 'bg-[#f5f5f5]' : 'bg-surface-1';
  const cardBg = theme === 'light' ? 'bg-white border-black/10' : 'bg-surface-2 border-[rgba(255,255,255,0.08)]';
  const textMain = theme === 'light' ? 'text-black' : 'text-white';
  const textSub = theme === 'light' ? 'text-zinc-500' : 'text-zinc-400';
  const btnBg = theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-400' : 'bg-white/5 border-white/10 text-zinc-500';

  const onZoomMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingZoom.current = true; dragStartY.current = e.clientY; dragStartZoom.current = zoom;
    document.body.style.cursor = 'ns-resize'; document.body.style.userSelect = 'none';
  }, [zoom]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingZoom.current) return;
      const delta = (dragStartY.current - e.clientY) / 300;
      setZoom(Math.round(Math.min(1.5, Math.max(0.4, dragStartZoom.current + delta)) * 100) / 100);
    };
    const onMouseUp = () => {
      if (!isDraggingZoom.current) return;
      isDraggingZoom.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', hostId).order('name', { ascending: true });
    if (!data || data.length === 0) { setNotFound(true); return; }
    setMembers(data);
    setRawProjects(Array.from(new Set(data.map((m: any) => m.project).filter(Boolean))) as string[]);

    // roster_assignments 가져오기
    const { data: asgn } = await supabase.from('roster_assignments').select('*').eq('user_id', hostId).order('order_index', { ascending: true });
    if (asgn) setAssignments(asgn);
  };

  // 호스트가 저장한 순서(host_settings) — 대시보드와 동일한 정렬을 쓰기 위해
  const fetchSettings = async () => {
    const { data } = await supabase.from('host_settings').select('*').eq('host_id', hostId).maybeSingle();
    setSettings(data || {});
  };

  const fetchVotingStatus = async () => {
    const { data } = await supabase.from('voting_sessions').select('*').eq('host_id', hostId).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) { setVotingOpen(data[0].is_open); setVotingTitle(data[0].title || ''); setVotingMemo(data[0].memo || ''); }
    else setVotingOpen(false);
  };

  const fetchNotices = async () => {
    const { data } = await supabase.from('notices').select('*').eq('host_id', hostId).order('created_at', { ascending: false });
    if (data) setNotices(data);
  };
  // 안 읽은 공지: 지난 방문 이후 올라온 것 (localStorage, DB 불필요)
  const [noticeSeen] = useState<number>(() => (typeof window !== 'undefined' ? Number(localStorage.getItem(`cast_notice_seen_${hostId}`) || 0) : 0));
  useEffect(() => {
    if (notices.length && typeof window !== 'undefined') {
      const latest = Math.max(...notices.map(n => new Date(n.created_at).getTime()));
      localStorage.setItem(`cast_notice_seen_${hostId}`, String(latest));
    }
  }, [notices, hostId]);

  const fetchSessions = async () => {
    const { data } = await supabase.from('sessions').select('*').eq('host_id', hostId).order('created_at', { ascending: false });
    if (data) setSessions(data);
  };

  const fetchPortal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMe(null); return; }
    const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', hostId).eq('member_user_id', user.id).limit(1);
    setMe(prof && prof.length ? prof[0] : null);
    if (prof && prof.length) {
      const { data: poll } = await supabase.from('availability_polls').select('*').eq('host_id', hostId).order('is_open', { ascending: false }).order('created_at', { ascending: false }).limit(1);
      setPortalPoll(poll && poll.length ? poll[0] : null);
    }
  };

  useEffect(() => {
    if (!hostId) return;
    fetchData(); fetchSettings(); fetchVotingStatus(); fetchNotices(); fetchSessions(); fetchPortal();
    const channel = supabase.channel('guest-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${hostId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roster_assignments', filter: `user_id=eq.${hostId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_sessions', filter: `host_id=eq.${hostId}` }, () => fetchVotingStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices', filter: `host_id=eq.${hostId}` }, () => fetchNotices())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_settings', filter: `host_id=eq.${hostId}` }, () => fetchSettings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hostId]);

  // 프로젝트 탭 순서: 호스트가 저장한 project_order 우선
  const projects = (() => {
    const order: string[] = settings?.project_order || [];
    return [...order.filter(p => rawProjects.includes(p)), ...rawProjects.filter(p => !order.includes(p))];
  })();

  useEffect(() => {
    if (settings === null) return;
    if (!currentProject && projects.length) setCurrentProject(projects[0]);
  }, [settings, projects.join('|')]); // eslint-disable-line

  // Day 목록/이름: 호스트 설정 우선, 없으면 assignments에서 복원
  useEffect(() => {
    if (!currentProject) return;
    const to = settings?.team_order || {};
    const saved: number[] = to[`${currentProject}_days`] || [];
    const fromDB = Array.from(new Set(
      assignments.filter((a: any) => a.project === currentProject).map((a: any) => a.day_number)
    )).sort((a: any, b: any) => a - b) as number[];
    const list = saved.length ? saved : (fromDB.length ? fromDB : [1]);
    setDays(list);
    setCurrentDay(prev => list.includes(prev) ? prev : list[0]);
    setDayNames(to[`${currentProject}_daynames`] || {});
    setDayDates(to[`${currentProject}_daydates`] || {});
  }, [currentProject, settings, assignments]);

  // 스튜디오 순서: 대시보드가 저장한 순서 그대로 (없는 건 뒤에 붙임)
  useEffect(() => {
    if (!currentProject) return;
    const saved: string[] = (settings?.team_order || {})[`${currentProject}_day${currentDay}`] || [];
    const fromDB = Array.from(new Set(
      assignments
        .filter((a: any) => a.project === currentProject && a.day_number === currentDay && a.team !== 'Unassigned')
        .map((a: any) => a.team)
    )) as string[];
    const ordered = saved.filter(t => t !== 'Unassigned');
    setTeams([...ordered, ...fromDB.filter(t => !ordered.includes(t))]);
  }, [currentProject, currentDay, settings, assignments]);

  const vote = async (memberId: any, attendance: 'attending' | 'absent') => {
    await supabase.from('profiles').update({ attendance }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, attendance } : m));
    setSelectedMemberId(null);
  };

  const getRoleColor = (r: string) => {
    switch(r) {
      case 'Producer': return { bg: 'bg-brand-cast/15', border: 'border-brand-cast/30', text: 'text-brand-cast-text', activeBg: 'bg-brand-cast/25', activeBorder: 'border-brand-cast/50', dim: 'text-brand-cast-text/50' };
      case 'Topliner': return { bg: 'bg-[#5FA39A]/15', border: 'border-[#5FA39A]/30', text: 'text-[#5FA39A]', activeBg: 'bg-[#5FA39A]/25', activeBorder: 'border-[#5FA39A]/50', dim: 'text-[#5FA39A]/50' };
      case 'Engineer': return { bg: 'bg-[#C98BA0]/15', border: 'border-[#C98BA0]/30', text: 'text-[#C98BA0]', activeBg: 'bg-[#C98BA0]/25', activeBorder: 'border-[#C98BA0]/50', dim: 'text-[#C98BA0]/50' };
      case 'A&R': return { bg: 'bg-[#C98BA0]/15', border: 'border-[#C98BA0]/30', text: 'text-[#C98BA0]', activeBg: 'bg-[#C98BA0]/25', activeBorder: 'border-[#C98BA0]/50', dim: 'text-[#C98BA0]/50' };
      default: return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-zinc-400', activeBg: 'bg-white/10', activeBorder: 'border-white/20', dim: 'text-zinc-400' };
    }
  };

  const getRoleCardStyle = (r: string) => {
    const base = "border-l-[3px] backdrop-blur-md ";
    switch(r) {
      case 'Producer': return base + "border-l-brand-cast bg-gradient-to-r from-brand-cast/[0.10] to-transparent";
      case 'Topliner': return base + "border-l-[#5FA39A] bg-gradient-to-r from-[#5FA39A]/[0.10] to-transparent";
      case 'Engineer': return base + "border-l-[#C98BA0] bg-gradient-to-r from-[#C98BA0]/[0.10] to-transparent";
      case 'A&R': return base + "border-l-[#C98BA0] bg-gradient-to-r from-[#C98BA0]/[0.10] to-transparent";
      default: return theme === 'light' ? "border-l-[3px] border-l-black/15 bg-black/[0.02]" : "border-l-[3px] border-l-white/15 bg-white/[0.02]";
    }
  };


  const getVoteIcon = (attendance: string | null) => {
    if (attendance === 'attending') return <span className="text-[#77B18E] shrink-0"><CheckIcon /></span>;
    if (attendance === 'absent') return <span className="text-[#9A8F8A] shrink-0"><XIcon /></span>;
    return <span className="text-zinc-400 shrink-0"><DotIcon /></span>;
  };

  const getSortedMembers = (t: string) => {
    const teamAssignments = assignments
      .filter((a: any) => a.project === currentProject && a.day_number === currentDay && a.team === t)
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
    return teamAssignments
      .map((a: any) => members.find((m: any) => String(m.id) === String(a.profile_id)))
      .filter((m: any) => m && !m.excluded);
  };

  const allMembers = members.filter(m => m.project === currentProject && !m.excluded);
  const ROLE_GROUPS: string[][] = [['Producer'], ['Topliner'], ['Engineer', 'A&R']];
  const membersByRole = ROLE_GROUPS.map(roles => ({ role: roles[0], label: roles.join(' / '), items: allMembers.filter(m => roles.includes(m.role)) })).filter(g => g.items.length > 0);
  const attending = allMembers.filter(m => m.attendance === 'attending');
  const absent = allMembers.filter(m => m.attendance === 'absent');
  const noResponse = allMembers.filter(m => m.attendance !== 'attending' && m.attendance !== 'absent');
  const sessionsByCamp = sessions.reduce((acc: any, s: any) => { if (!acc[s.camp_name]) acc[s.camp_name] = []; acc[s.camp_name].push(s); return acc; }, {});
  const WD = lang === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // 'YYYY-MM-DD' → '8월 29일(금)' 짧은 요일 라벨. 공용 fmtDate와 별개다 (위 주석 참고).
  const fmtDayLabel = (iso: string) => {
    const [yy, mo, dd] = iso.split('-').map(Number);
    const w = WD[new Date(yy, mo - 1, dd).getDay()];
    return lang === 'ko' ? `${mo}월 ${dd}일(${w})` : `${mo}/${dd} ${w}`;
  };
  const getDayLabel = (d: number) => (dayDates[d] ? fmtDayLabel(dayDates[d]) : (dayNames[d] || `Day ${d}`));

  // 초대로 연결된 본인의 이번 Day 배치 — 링크 열자마자 "나는 어디" 가 보이게
  const myTeam = (() => {
    if (!me) return null;
    const a = assignments.find((x: any) => x.project === currentProject && x.day_number === currentDay && x.team !== 'Unassigned' && String(x.profile_id) === String(me.id));
    if (!a) return null;
    return { team: a.team, mates: getSortedMembers(a.team).filter((x: any) => String(x.id) !== String(me.id)) };
  })();

  const MemberCard = ({ m }: { m: any }) => (
    <div
      className={`relative flex justify-between items-center p-4 rounded-xl ${getRoleCardStyle(m.role)} ${m.links?.length > 0 ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        if (!m.links?.length) return;
        setLinkPopover(prev => prev?.member.id === m.id ? null : { member: m, x: e.clientX + 12, y: e.clientY - 20 });
        e.stopPropagation();
      }}
    >
      <div className="flex flex-col overflow-hidden pl-1">
        <span className={`text-lead font-bold flex items-center gap-1.5 ${textMain}`}>
          <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: m.gender === 'female' ? '#DB8FA9' : '#7E97C9' }} title={m.gender === 'female' ? 'F' : 'M'} />
          {m.name}
          {m.links?.length > 0 && <span className="text-mini"><i className="ti ti-link" aria-hidden="true"></i></span>}
        </span>
        <span className={`text-micro font-bold uppercase tracking-widest mt-1 ${textSub}`}>{m.role}</span>
      </div>
    </div>
  );

  if (notFound) return (
    <div className={`min-h-screen ${bg} flex flex-col items-center justify-center font-ui`}>
      <p className="text-zinc-400 text-mini font-bold tracking-widest uppercase">{tv.notFound}</p>
    </div>
  );

  return (
    <>
      {/* 링크 팝오버 */}
      {linkPopover && (
        <div className="fixed inset-0 z-40" onClick={() => setLinkPopover(null)}>
          <div
            className={`absolute z-50 border rounded-xl p-3 shadow-lg font-ui ${theme === 'light' ? ' border-black/10' : 'bg-[#1a1a1a] border-white/15'}`}
            style={{ top: Math.min(linkPopover.y, window.innerHeight - 180), left: Math.min(linkPopover.x, window.innerWidth - 210), minWidth: '180px' }}
            onClick={e => e.stopPropagation()}
          >
            <p className={`text-micro font-black uppercase tracking-widest mb-2 ${textSub}`}>{linkPopover.member.name}</p>
            <div className="flex flex-col gap-1.5">
              {(linkPopover.member.links || []).map((link: string, i: number) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition ${theme === 'light' ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'}`}>
                  <span className="text-body">{getLinkIcon(link)}</span>
                  <span className={`text-mini truncate ${textSub}`}>{link.replace('https://', '').replace('http://', '').split('/').slice(0, 2).join('/')}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, minHeight: `${100 / zoom}vh` }}>
        <main className={`min-h-screen ${bg} ${textMain} p-5 lg:p-8 font-ui relative overflow-hidden transition-colors duration-150`}>
          {theme === 'dark' && <div className="absolute top-[-20%] left-[-10%] w-[520px] h-[520px] rounded-full pointer-events-none opacity-[0.07]" style={{background:'#E3B24A',filter:'blur(200px)'}} />}

          {/* room 홍보 — 공유된 로스터 페이지 상단 배너 */}
          <a href="https://room-nu-seven.vercel.app" target="_blank" rel="noopener noreferrer"
            className="relative z-10 mb-5 block group">
            <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 backdrop-blur-md transition duration-200 border-[#dd684b]/25 hover:border-[#dd684b]/45"
              style={{ backgroundImage: 'linear-gradient(90deg, rgba(167,139,250,0.14), rgba(167,139,250,0.03) 55%, transparent)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[#dd684b] bg-[#dd684b]/10 border border-[#dd684b]/25 shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </span>
                <span className="text-body font-bold tracking-tight text-[#dd684b] shrink-0">room</span>
                <span className={`text-mini truncate ${textSub}`}>{lang === 'ko' ? '가사와 데모를 한곳에서' : 'lyrics & demos in one place'}</span>
              </div>
              <span className="flex items-center gap-1 text-mini font-semibold text-[#dd684b] whitespace-nowrap opacity-85 group-hover:opacity-100 transition-opacity shrink-0">
                {lang === 'ko' ? '열어보기' : 'open'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </span>
            </div>
          </a>

          {/* 헤더 */}
          <div className="relative z-10 flex items-baseline justify-center gap-2.5 mb-6">
            <h1 className="font-display text-display text-brand-cast-text uppercase tracking-tighter">CAST</h1>
            <span className={`text-mini font-normal tracking-[0.2em] ${textSub}`}>by NEN</span>
          </div>

          {/* 서브 헤더 */}
          <header className={`relative z-10 mb-4 border-b pb-3 flex justify-between items-center ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
            <p className={`text-lead font-bold ${textSub}`}>{currentProject}</p>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className={`px-3 py-1.5 rounded-full border font-normal text-mini transition ${btnBg}`}>{theme === 'dark' ? '☀' : '◑'}</button>
              <button onClick={toggleLang} aria-label={lang === 'ko' ? 'Switch to English' : '한국어로 전환'} className={`px-3 py-1.5 rounded-full border font-normal text-micro uppercase tracking-widest transition ${btnBg}`}>{lang === 'ko' ? 'EN' : 'KO'}</button>
              {sessions.length > 0 && (
                <button onClick={() => setShowHistory(!showHistory)}
                  className={`px-3 py-1.5 rounded-full border font-normal text-micro uppercase tracking-widest transition ${showHistory ? 'border-brand-cast/50 text-brand-cast-text bg-brand-cast/10' : btnBg}`}>{tv.history}</button>
              )}
              <span className={`px-3 py-1.5 rounded-full border text-micro font-normal uppercase tracking-widest ${btnBg}`}>{tv.guest}</span>
            </div>
          </header>

          {dbError && (
            <div role="alert" className="relative z-10 mb-4 rounded-xl border border-[#E0575F]/50 bg-[#E0575F]/10 px-4 py-3 flex items-start gap-3">
              <span className="text-body leading-none mt-0.5 text-[#E0575F]"><i className="ti ti-alert-triangle" aria-hidden="true"></i></span>
              <div className="flex-1">
                <p className="text-mini font-black text-[#E0575F]">{tv.saveFailed}</p>
                <p className={`text-micro mt-0.5 ${textSub}`}>{dbError}</p>
              </div>
              <button onClick={() => setDbError(null)} aria-label={lang === 'ko' ? '닫기' : 'Close'} className={`text-mini hover:opacity-70 ${textSub}`}>✕</button>
            </div>
          )}

          {/* 프로젝트 탭 */}
          <div className="relative z-10 flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {projects.map(p => (
              <button key={p} onClick={() => setCurrentProject(p)}
                className={`px-4 py-1.5 rounded-full font-normal text-mini tracking-widest uppercase border transition ${currentProject === p ? 'border-brand-cast/50 bg-brand-cast/20 text-brand-cast-text' : theme === 'light' ? 'border-black/10 bg-black/5 text-zinc-500' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{p}</button>
            ))}
          </div>

          {/* Day 탭 */}
          {days.length > 1 && (
            <div className="relative z-10 flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
              {days.map(d => (
                <button key={d} onClick={() => setCurrentDay(d)}
                  className={`px-4 py-1.5 rounded-full font-normal text-mini transition border ${currentDay === d ? 'border-brand-cast/40 bg-brand-cast/10 text-brand-cast-text' : theme === 'light' ? 'border-black/10 bg-black/5 text-zinc-500' : 'border-white/10 bg-white/5 text-zinc-500'}`}>{getDayLabel(d)}</button>
              ))}
            </div>
          )}

          {/* 멤버 포털 — 초대로 연결된 본인에게만 */}
          {me && (
            <div className="relative z-10 mb-6 rounded-xl border border-brand-cast/30 bg-brand-cast/[0.07] p-5">
              <p className={`font-black text-lead ${textMain}`}>{tv.portalHi(me.name || '')}</p>
              <p className={`text-mini mb-4 ${textSub}`}>{tv.portalDesc}</p>
              <div className="flex flex-col gap-3">
                {/* 내 스튜디오 */}
                <div className={`rounded-xl border p-4 ${theme === 'light' ? 'border-black/10 ' : 'border-white/10 /[0.04]'}`}>
                  <p className="text-micro font-black uppercase tracking-widest mb-2 text-brand-cast-text">{tv.myStudio}</p>
                  {myTeam ? (
                    <>
                      <p className={`font-display text-sub leading-tight ${textMain}`}>{myTeam.team}</p>
                      <p className={`text-mini mt-1 ${textSub}`}>{getDayLabel(currentDay)}{currentProject ? ` · ${currentProject}` : ''}</p>
                      {myTeam.mates.length > 0 && (
                        <div className="mt-3">
                          <p className={`text-micro font-black uppercase tracking-widest mb-1.5 ${textSub}`}>{tv.myMates}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {myTeam.mates.map((mm: any) => (
                              <span key={mm.id} className={`px-2.5 py-1 rounded-full text-mini font-bold border ${theme === 'light' ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-white/5'} ${textMain}`}>
                                {mm.name}<span className={`ml-1.5 text-micro font-normal uppercase ${textSub}`}>{mm.role?.slice(0, 3)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : <p className={`text-body ${textSub}`}>{tv.myStudioNone}</p>}
                </div>
                {portalPoll && (portalPoll.final_days || []).length > 0 ? (
                  <div>
                    <p className="text-micro font-black uppercase tracking-widest mb-2 text-brand-cast-text">{tv.portalConfirmed}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {(portalPoll.final_days || []).slice().sort((a: number, b: number) => a - b).map((d: number) => {
                        const [yy, mm] = portalPoll.month.split('-').map(Number);
                        const w = new Date(yy, mm - 1, d).getDay();
                        const lbl = lang === 'ko' ? `${mm}월 ${d}일(${['일', '월', '화', '수', '목', '금', '토'][w]})` : `${mm}/${d} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][w]})`;
                        return <span key={d} className="px-3 py-1 rounded-full text-mini font-black border border-brand-cast/50 bg-brand-cast/15 text-[#EFCF8E]">{lbl}</span>;
                      })}
                    </div>
                    <button onClick={() => { const ti = portalPoll.title || portalPoll.month; downloadIcs(ti, buildDaysIcs(ti, portalPoll.month, portalPoll.final_days, portalPoll.id)); }}
                      className="text-mini font-black px-4 py-2 rounded-full border border-brand-cast/40 text-[#EFCF8E] hover:bg-brand-cast/15 transition">{tv.portalIcs}</button>
                  </div>
                ) : <p className={`text-mini ${textSub}`}>{tv.portalNoConfirm}</p>}
                {portalPoll && portalPoll.is_open && (
                  <a href={`/roster/availability/${hostId}?poll=${portalPoll.id}`} className="inline-flex w-fit items-center gap-1.5 text-mini font-black px-4 py-2 rounded-full bg-brand-cast/20 border border-brand-cast/40 text-[#EFCF8E] hover:bg-brand-cast/30 transition">{tv.portalVote} →</a>
                )}
              </div>
            </div>
          )}

          {/* 공지사항 */}
          {notices.length > 0 && (
            <div className="relative z-10 mb-6 flex flex-col gap-3">
              {notices.map(n => (
                <div key={n.id} className="cv-row rounded-xl border border-brand-cast/20 bg-brand-cast/5 p-4">
                  <p className="text-micro font-normal uppercase tracking-widest text-brand-cast-text/60 mb-1 flex items-center gap-1.5">{tv.notice}{new Date(n.created_at).getTime() > noticeSeen && <span className="text-micro font-black px-1.5 py-0.5 rounded-full bg-brand-cast text-black">NEW</span>}</p>
                  <p className={`font-bold text-body mb-1 ${textMain}`}>{n.title}</p>
                  {n.content && <p className={`text-mini leading-relaxed whitespace-pre-line ${textSub}`}>{n.content}</p>}
                </div>
              ))}
            </div>
          )}

          {/* 투표 배너 */}
          {votingOpen && (
            <div className={`relative z-10 mb-8 rounded-xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : ' border-[rgba(255,255,255,0.08)]'}`}>
              <p className={`text-micro font-black uppercase tracking-widest mb-1 ${textSub}`}>{tv.vote}</p>
              <p className={`font-black text-sub mb-1 ${textMain}`}>{votingTitle || (lang === 'ko' ? '참여 여부 투표' : 'Attendance Vote')}</p>
              {votingMemo && <p className={`text-mini mb-6 leading-relaxed whitespace-pre-line ${textSub}`}>{votingMemo}</p>}
              {!votingMemo && <div className="mb-5" />}
              <div className="flex flex-col gap-5 mb-8">
                {membersByRole.map(({ role, label, items }) => {
                  const c = getRoleColor(role);
                  return (
                    <div key={role}>
                      <p className={`text-micro font-black uppercase tracking-widest mb-2.5 ${c.dim}`}>{label}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-3">
                        {items.map(m => {
                          const isSelected = selectedMemberId === m.id;
                          return (
                            <div key={m.id} className="flex flex-col items-start gap-1.5">
                              <button onClick={() => setSelectedMemberId(isSelected ? null : m.id)} style={{ minWidth: '110px' }}
                                className={`flex items-center justify-between gap-2 px-4 py-2 rounded-full border transition w-full ${isSelected ? `${c.activeBg} ${c.activeBorder} scale-105` : `${c.bg} ${c.border} hover:scale-105`}`}>
                                <span className={`font-black text-body ${c.text} truncate`}>{m.name}</span>
                                {getVoteIcon(m.attendance)}
                              </button>
                              {isSelected && (
                                <div className="flex gap-1.5 pl-1">
                                  <button onClick={() => vote(m.id, 'attending')} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-black border border-[#77B18E]/50 bg-[#77B18E]/25 text-white hover:bg-[#77B18E]/40 transition whitespace-nowrap"><CheckIcon /> {tv.attending}</button>
                                  <button onClick={() => vote(m.id, 'absent')} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-micro font-black border border-[#9A8F8A]/50 bg-[#9A8F8A]/25 text-white hover:bg-[#9A8F8A]/40 transition whitespace-nowrap"><XIcon /> {tv.absent}</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={`border-t pt-5 ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
                <p className={`text-micro font-black uppercase tracking-widest mb-4 text-zinc-400`}>Status</p>
                <div className="flex flex-wrap gap-6">
                  {[
                    { label: tv.attending, items: attending, headerColor: 'text-[#77B18E]', borderColor: 'border-[#77B18E]' },
                    { label: tv.absent, items: absent, headerColor: 'text-[#9A8F8A]', borderColor: 'border-[#9A8F8A]' },
                    { label: tv.noResponse, items: noResponse, headerColor: 'text-zinc-500', borderColor: 'border-zinc-600' },
                  ].map(({ label, items, headerColor, borderColor }) => (
                    <div key={label} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                      <div className={`border rounded-xl p-6 min-h-[80px] shadow-lg flex flex-col ${cardBg}`}>
                        <div className={`flex justify-between items-center mb-4 px-1 border-l-4 ${borderColor} pl-4`}>
                          <h2 className={`text-body font-black uppercase ${headerColor}`}>{label}</h2>
                          <span className={`text-sub font-black ${headerColor}`}>{items.length}</span>
                        </div>
                        <div className="space-y-3 flex-1">
                          {items.map(m => <MemberCard key={m.id} m={m} />)}
                          {items.length === 0 && <p className="text-zinc-500 text-mini pl-1">—</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 세션 히스토리 */}
          {showHistory && (
            <div className={`relative z-10 mb-8 rounded-xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : ' border-[rgba(255,255,255,0.08)]'}`}>
              <p className={`font-semibold text-lead mb-5 ${textMain}`}>{tv.history}</p>
              <div className="flex flex-col gap-4">
                {Object.keys(sessionsByCamp).length === 0 ? <p className={`text-mini ${textSub}`}>{tv.noSession}</p> :
                  Object.entries(sessionsByCamp).map(([campName, campSessions]: any) => (
                    <div key={campName}>
                      <p className={`text-mini font-black uppercase tracking-widest mb-2 ${textSub}`}>{campName}</p>
                      <div className="flex flex-col gap-2">
                        {campSessions.sort((a: any, b: any) => a.day_number - b.day_number).map((s: any) => (
                          <div key={s.id} className={`rounded-xl border overflow-hidden ${theme === 'light' ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 /[0.02]'}`}>
                            <div className="flex items-center justify-between p-4 cursor-pointer" {...pressable(() => setExpandedSession(expandedSession === s.id ? null : s.id))}>
                              <div className="flex items-center gap-3"><span className="text-brand-cast-text font-black text-body">Day {s.day_number}</span>{s.memo && <span className={`text-mini truncate max-w-[200px] ${textSub}`}>{s.memo}</span>}</div>
                              <div className="flex items-center gap-3">
                                <span className="text-zinc-400 text-micro">{fmtDate(s.created_at)}</span>
                                {s.links?.length > 0 && <div className="flex gap-1">{s.links.map((link: string, i: number) => (<a key={i} href={link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} aria-label={linkName(link)} className="text-mini">{getLinkIcon(link)}</a>))}</div>}
                                <span className="text-zinc-400 text-micro">{expandedSession === s.id ? '▲' : '▼'}</span>
                              </div>
                            </div>
                            {expandedSession === s.id && s.roster && (
                              <div className={`px-4 pb-4 flex flex-wrap gap-4 border-t pt-4 ${theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                                {s.roster.map((t: any) => (<div key={t.team} className="flex-1 min-w-[150px]"><p className={`text-micro font-black uppercase tracking-widest mb-2 border-l-2 border-brand-cast pl-2 ${textSub}`}>{t.team}</p>{t.members.map((m: any, i: number) => (<div key={i} className="flex items-center gap-1.5 mb-1"><span className={`text-mini font-bold ${textMain}`}>{m.name}</span><span className="text-zinc-400 text-micro uppercase">{m.role.slice(0, 3)}</span></div>))}</div>))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 스튜디오 보드 */}
          {!votingOpen && (
            <div className="relative z-10 flex flex-wrap gap-6 items-start pb-8">
              {teams.map(tName => (
                <div key={tName} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]">
                  <div className={`border rounded-xl p-6 min-h-[200px] shadow-lg flex flex-col ${cardBg}`}>
                    <div className={`flex items-center mb-6 px-1 border-l-4 border-brand-cast pl-4`}>
                      <h2 className={`text-body font-black uppercase ${textMain}`}>{tName}</h2>
                      <span className="ml-auto text-micro font-bold text-zinc-400">{tv.members(getSortedMembers(tName).length)}</span>
                    </div>
                    <div className="space-y-3 flex-1">
                      {getSortedMembers(tName).map(m => <MemberCard key={m.id} m={m} />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="relative z-10 mt-8 pb-8 text-center">
            <p className={`text-mini font-medium ${textSub}`}>Contact : everplayground@gmail.com</p>
          </div>
        </main>
      </div>

      {/* 줌 컨트롤 */}
      <div className="flex fixed bottom-6 left-6 z-50 flex-col items-center gap-1.5 select-none font-ui">
        <button onClick={() => setZoom(z => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))} title="확대" aria-label={lang === 'ko' ? '확대' : 'Zoom in'} className={`w-9 h-9 rounded-full border backdrop-blur-md shadow-xl flex items-center justify-center transition hover:border-brand-cast/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10 text-zinc-400' : 'bg-white/[0.05] border-white/10 text-zinc-400'}`}>
          <svg width="12" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div onMouseDown={onZoomMouseDown} onDoubleClick={() => setZoom(1)} title="드래그로 확대/축소 · 더블클릭 리셋"
          className={`w-9 h-10 rounded-xl border backdrop-blur-md shadow-xl cursor-ns-resize flex flex-col items-center justify-center gap-[3px] transition hover:border-brand-cast/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10' : '/[0.05] border-white/10'}`}>
          {[0, 1, 2].map(i => <div key={i} className="w-3.5 h-[1.5px] rounded-full bg-zinc-500" />)}
        </div>
        <button onClick={() => setZoom(z => Math.max(0.4, Math.round((z - 0.1) * 100) / 100))} title="축소" aria-label={lang === 'ko' ? '축소' : 'Zoom out'} className={`w-9 h-9 rounded-full border backdrop-blur-md shadow-xl flex items-center justify-center transition hover:border-brand-cast/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10 text-zinc-400' : 'bg-white/[0.05] border-white/10 text-zinc-400'}`}>
          <svg width="12" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="text-micro font-black text-zinc-500 tracking-widest">{Math.round(zoom * 100)}%</span>
      </div>
    </>
  );
}