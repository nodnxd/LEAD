'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CheckIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const XIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const DotIcon = () => <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="2.5" fill="currentColor" opacity="0.6"/></svg>;

const ROLE_ORDER = ['Producer', 'Topliner', 'Engineer', 'A&R'];

const TV = {
  ko: {
    attending: '참석', absent: '불참', pending: '미정', noResponse: '미응답',
    vote: 'Vote', history: '히스토리', guest: 'Guest',
    notFound: '존재하지 않는 로스터예요',
    noSession: '저장된 세션이 없어요',
    notice: '공지',
    members: (n: number) => `${n}명`,
  },
  en: {
    attending: 'Attending', absent: 'Absent', pending: 'Undecided', noResponse: 'No Response',
    vote: 'Vote', history: 'History', guest: 'Guest',
    notFound: 'Roster not found',
    noSession: 'No sessions saved',
    notice: 'Notice',
    members: (n: number) => `${n}`,
  }
};

type Lang = 'ko' | 'en';
type Theme = 'dark' | 'light';

export default function GuestView() {
  const params = useParams();
  const hostId = params.hostId as string;

  const [members, setMembers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
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

  const [votingOpen, setVotingOpen] = useState(false);
  const [votingTitle, setVotingTitle] = useState('');
  const [votingMemo, setVotingMemo] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<any>(null);
  const [linkPopover, setLinkPopover] = useState<{ member: any; x: number; y: number } | null>(null);

  const [lang, setLang] = useState<Lang>('ko');
  const [theme, setTheme] = useState<Theme>('dark');
  const tv = TV[lang];

  const [zoom, setZoom] = useState(1);
  const isDraggingZoom = useRef(false);
  const dragStartY = useRef(0);
  const dragStartZoom = useRef(1);

  // 테마/언어 로드 (호스트 설정과 공유)
  useEffect(() => {
    const savedLang = localStorage.getItem('cast_lang') as Lang | null;
    const savedTheme = localStorage.getItem('cast_theme') as Theme | null;
    if (savedLang) setLang(savedLang);
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === 'ko' ? 'en' : 'ko';
    setLang(next); localStorage.setItem('cast_lang', next);
  };
  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next); localStorage.setItem('cast_theme', next);
  };

  // 테마 변수
  const bg = theme === 'light' ? 'bg-[#f5f5f5]' : 'bg-[#141414]';
  const cardBg = theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]';
  const textMain = theme === 'light' ? 'text-black' : 'text-white';
  const textSub = theme === 'light' ? 'text-zinc-500' : 'text-zinc-400';
  const btnBg = theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-600' : 'bg-white/5 border-white/10 text-zinc-500';

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
    const dbProjects = Array.from(new Set(data.map((m: any) => m.project).filter(Boolean))) as string[];
    setProjects(dbProjects);
    if (dbProjects.length > 0 && !currentProject) setCurrentProject(dbProjects[0]);

    // roster_assignments 가져오기
    const { data: asgn } = await supabase.from('roster_assignments').select('*').eq('user_id', hostId).order('order_index', { ascending: true });
    if (asgn) {
      setAssignments(asgn);
      // 팀 목록 복원
      setCurrentProject(prev => {
        const p = prev || dbProjects[0];
        if (p) {
          setCurrentDay(d => {
            const teamsFromDB = Array.from(new Set(
              asgn.filter((a: any) => a.project === p && a.day_number === d && a.team !== 'Unassigned').map((a: any) => a.team)
            )) as string[];
            if (teamsFromDB.length > 0) setTeams(teamsFromDB);
            return d;
          });
        }
        return p;
      });
    }
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

  const fetchSessions = async () => {
    const { data } = await supabase.from('sessions').select('*').eq('host_id', hostId).order('created_at', { ascending: false });
    if (data) setSessions(data);
  };

  const fetchTeamOrder = async (project: string, day: number) => {
    const { data } = await supabase.from('host_settings').select('team_order').eq('host_id', hostId).single();
    const daysKey = `${project}_days`;
    const namesKey = `${project}_daynames`;
    if ((data as any)?.team_order?.[daysKey]) setDays((data as any).team_order[daysKey]);
    if ((data as any)?.team_order?.[namesKey]) setDayNames((data as any).team_order[namesKey]);
    // 팀 목록은 assignments에서 추출
    const teamsFromDB = Array.from(new Set(
      assignments.filter((a: any) => a.project === project && a.day_number === day && a.team !== 'Unassigned').map((a: any) => a.team)
    )) as string[];
    if (teamsFromDB.length > 0) setTeams(teamsFromDB);
  };

  useEffect(() => {
    if (!hostId) return;
    fetchData(); fetchVotingStatus(); fetchNotices(); fetchSessions();
    const channel = supabase.channel('guest-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${hostId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_sessions', filter: `host_id=eq.${hostId}` }, () => fetchVotingStatus())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices', filter: `host_id=eq.${hostId}` }, () => fetchNotices())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'host_settings', filter: `host_id=eq.${hostId}` }, () => fetchTeamOrder(currentProject, currentDay))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hostId]);

  useEffect(() => {
    if (currentProject && members.length > 0) fetchTeamOrder(currentProject, currentDay);
  }, [currentProject, currentDay, members]);

  const vote = async (memberId: any, attendance: 'attending' | 'absent' | 'pending') => {
    await supabase.from('profiles').update({ attendance }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, attendance } : m));
    setSelectedMemberId(null);
  };

  const getRoleColor = (r: string) => {
    switch(r) {
      case 'Producer': return { bg: 'bg-[#DE6B35]/15', border: 'border-[#DE6B35]/30', text: 'text-[#DE6B35]', activeBg: 'bg-[#DE6B35]/25', activeBorder: 'border-[#DE6B35]/50', dim: 'text-[#DE6B35]/50' };
      case 'Topliner': return { bg: 'bg-[#C49740]/15', border: 'border-[#C49740]/30', text: 'text-[#C49740]', activeBg: 'bg-[#C49740]/25', activeBorder: 'border-[#C49740]/50', dim: 'text-[#C49740]/50' };
      case 'Engineer': return { bg: 'bg-[#3FA857]/15', border: 'border-[#3FA857]/30', text: 'text-[#3FA857]', activeBg: 'bg-[#3FA857]/25', activeBorder: 'border-[#3FA857]/50', dim: 'text-[#3FA857]/50' };
      case 'A&R': return { bg: 'bg-[#9C32C6]/15', border: 'border-[#9C32C6]/30', text: 'text-[#9C32C6]', activeBg: 'bg-[#9C32C6]/25', activeBorder: 'border-[#9C32C6]/50', dim: 'text-[#9C32C6]/50' };
      default: return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-zinc-400', activeBg: 'bg-white/10', activeBorder: 'border-white/20', dim: 'text-zinc-600' };
    }
  };

  const getRoleCardStyle = (r: string) => {
    const base = "border-l-[4px] backdrop-blur-md ";
    switch(r) {
      case 'Producer': return base + (theme === 'light' ? "border-l-[#DE6B35] bg-gradient-to-r from-[#DE6B35]/10 to-black/[0.01]" : "border-l-[#DE6B35] bg-gradient-to-r from-[#DE6B35]/10 to-white/[0.02]");
      case 'Topliner': return base + (theme === 'light' ? "border-l-[#C49740] bg-gradient-to-r from-[#C49740]/10 to-black/[0.01]" : "border-l-[#C49740] bg-gradient-to-r from-[#C49740]/10 to-white/[0.02]");
      case 'Engineer': return base + (theme === 'light' ? "border-l-[#3FA857] bg-gradient-to-r from-[#3FA857]/10 to-black/[0.01]" : "border-l-[#3FA857] bg-gradient-to-r from-[#3FA857]/10 to-white/[0.02]");
      case 'A&R': return base + (theme === 'light' ? "border-l-[#9C32C6] bg-gradient-to-r from-[#9C32C6]/10 to-black/[0.01]" : "border-l-[#9C32C6] bg-gradient-to-r from-[#9C32C6]/10 to-white/[0.02]");
      default: return theme === 'light' ? "border border-black/10 bg-black/[0.02]" : "border border-white/10 bg-white/[0.02]";
    }
  };

  const getLinkIcon = (url: string) => {
    if (url.includes('instagram')) return '📸';
    if (url.includes('soundcloud')) return '🎵';
    if (url.includes('spotify')) return '🎧';
    if (url.includes('youtube')) return '▶️';
    return '🔗';
  };

  const getVoteIcon = (attendance: string | null) => {
    if (attendance === 'attending') return <span className="text-emerald-400 shrink-0"><CheckIcon /></span>;
    if (attendance === 'absent') return <span className="text-red-400 shrink-0"><XIcon /></span>;
    if (attendance === 'pending') return <span className="text-yellow-400 shrink-0"><DotIcon /></span>;
    return <span className="text-zinc-600 shrink-0"><DotIcon /></span>;
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
  const membersByRole = ROLE_ORDER.map(r => ({ role: r, items: allMembers.filter(m => m.role === r) })).filter(g => g.items.length > 0);
  const attending = allMembers.filter(m => m.attendance === 'attending');
  const absent = allMembers.filter(m => m.attendance === 'absent');
  const pending = allMembers.filter(m => m.attendance === 'pending');
  const noResponse = allMembers.filter(m => !m.attendance);
  const sessionsByCamp = sessions.reduce((acc: any, s: any) => { if (!acc[s.camp_name]) acc[s.camp_name] = []; acc[s.camp_name].push(s); return acc; }, {});
  const getDayLabel = (d: number) => dayNames[d] || `Day ${d}`;

  const MemberCard = ({ m }: { m: any }) => (
    <div
      className={`relative flex justify-between items-center p-4 rounded-2xl ${getRoleCardStyle(m.role)} ${m.links?.length > 0 ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        if (!m.links?.length) return;
        setLinkPopover(prev => prev?.member.id === m.id ? null : { member: m, x: e.clientX + 12, y: e.clientY - 20 });
        e.stopPropagation();
      }}
    >
      <div className="flex flex-col overflow-hidden pl-1">
        <span className={`text-[15px] font-bold flex items-center gap-1.5 ${textMain}`}>
          {m.name}
          <span className={`px-1.5 py-[1px] rounded text-[8px] font-black border shrink-0 ${m.gender === 'female' ? 'bg-[#FF1493]/10 text-[#FF1493] border-[#FF1493]/30' : 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'}`}>{m.gender === 'female' ? 'F' : 'M'}</span>
          {m.links?.length > 0 && <span className="text-[11px]">🔗</span>}
        </span>
        <span className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${textSub}`}>{m.role}</span>
      </div>
    </div>
  );

  if (notFound) return (
    <div className={`min-h-screen ${bg} flex flex-col items-center justify-center font-pretendard`}>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; } @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}`}} />
      <p className="text-zinc-600 text-[12px] font-bold tracking-widest uppercase">{tv.notFound}</p>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; } @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}`}} />

      {/* 링크 팝오버 */}
      {linkPopover && (
        <div className="fixed inset-0 z-40" onClick={() => setLinkPopover(null)}>
          <div
            className={`absolute z-50 border rounded-2xl p-3 shadow-2xl font-pretendard ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1a1a1a] border-white/15'}`}
            style={{ top: Math.min(linkPopover.y, window.innerHeight - 180), left: Math.min(linkPopover.x, window.innerWidth - 210), minWidth: '180px' }}
            onClick={e => e.stopPropagation()}
          >
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${textSub}`}>{linkPopover.member.name}</p>
            <div className="flex flex-col gap-1.5">
              {(linkPopover.member.links || []).map((link: string, i: number) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${theme === 'light' ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'}`}>
                  <span className="text-[14px]">{getLinkIcon(link)}</span>
                  <span className={`text-[11px] truncate ${textSub}`}>{link.replace('https://', '').replace('http://', '').split('/').slice(0, 2).join('/')}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, minHeight: `${100 / zoom}vh` }}>
        <main className={`min-h-screen ${bg} ${textMain} p-5 lg:p-8 font-pretendard relative overflow-hidden transition-colors duration-300`}>
          {theme === 'dark' && <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{background:'#DE6B35',filter:'blur(200px)',animation:'orb-pulse 4s ease-in-out infinite'}} />}

          {/* 헤더 */}
          <div className="relative z-10 flex items-baseline justify-center gap-2.5 mb-6">
            <h1 className="text-4xl font-semibold text-[#DE6B35] uppercase tracking-tighter">CAST</h1>
            <span className={`text-[11px] font-bold tracking-[0.2em] ${textSub}`}>by NEN</span>
          </div>

          {/* 서브 헤더 */}
          <header className={`relative z-10 mb-4 border-b pb-3 flex justify-between items-center ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
            <p className={`text-[16px] font-bold ${textSub}`}>{currentProject}</p>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className={`px-3 py-1.5 rounded-full border font-normal text-[11px] transition-all ${btnBg}`}>{theme === 'dark' ? '☀' : '◑'}</button>
              <button onClick={toggleLang} className={`px-3 py-1.5 rounded-full border font-normal text-[10px] uppercase tracking-widest transition-all ${btnBg}`}>{lang === 'ko' ? 'EN' : 'KO'}</button>
              {sessions.length > 0 && (
                <button onClick={() => setShowHistory(!showHistory)}
                  className={`px-3 py-1.5 rounded-full border font-normal text-[10px] uppercase tracking-widest transition-all ${showHistory ? 'border-[#DE6B35]/50 text-[#DE6B35] bg-[#DE6B35]/10' : btnBg}`}>{tv.history}</button>
              )}
              <span className={`px-3 py-1.5 rounded-full border text-[10px] font-normal uppercase tracking-widest ${btnBg}`}>{tv.guest}</span>
            </div>
          </header>

          {/* 프로젝트 탭 */}
          <div className="relative z-10 flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
            {projects.map(p => (
              <button key={p} onClick={() => setCurrentProject(p)}
                className={`px-4 py-1.5 rounded-full font-normal text-[11px] tracking-widest uppercase border transition-all ${currentProject === p ? 'border-[#DE6B35]/50 bg-[#DE6B35]/20 text-[#DE6B35]' : theme === 'light' ? 'border-black/10 bg-black/5 text-zinc-500' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{p}</button>
            ))}
          </div>

          {/* Day 탭 */}
          {days.length > 1 && (
            <div className="relative z-10 flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
              {days.map(d => (
                <button key={d} onClick={() => setCurrentDay(d)}
                  className={`px-4 py-1.5 rounded-full font-normal text-[11px] transition-all border ${currentDay === d ? 'border-[#DE6B35]/40 bg-[#DE6B35]/10 text-[#DE6B35]' : theme === 'light' ? 'border-black/10 bg-black/5 text-zinc-500' : 'border-white/10 bg-white/5 text-zinc-500'}`}>{getDayLabel(d)}</button>
              ))}
            </div>
          )}

          {/* 공지사항 */}
          {notices.length > 0 && (
            <div className="relative z-10 mb-6 flex flex-col gap-3">
              {notices.map(n => (
                <div key={n.id} className="rounded-2xl border border-[#DE6B35]/20 bg-[#DE6B35]/5 p-4">
                  <p className="text-[10px] font-normal uppercase tracking-widest text-[#DE6B35]/60 mb-1">{tv.notice}</p>
                  <p className={`font-bold text-[14px] mb-1 ${textMain}`}>{n.title}</p>
                  {n.content && <p className={`text-[12px] leading-relaxed whitespace-pre-line ${textSub}`}>{n.content}</p>}
                </div>
              ))}
            </div>
          )}

          {/* 투표 배너 */}
          {votingOpen && (
            <div className={`relative z-10 mb-8 rounded-2xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${textSub}`}>{tv.vote}</p>
              <p className={`font-black text-[18px] mb-1 ${textMain}`}>{votingTitle || (lang === 'ko' ? '참여 여부 투표' : 'Attendance Vote')}</p>
              {votingMemo && <p className={`text-[12px] mb-6 leading-relaxed whitespace-pre-line ${textSub}`}>{votingMemo}</p>}
              {!votingMemo && <div className="mb-5" />}
              <div className="flex flex-col gap-5 mb-8">
                {membersByRole.map(({ role, items }) => {
                  const c = getRoleColor(role);
                  return (
                    <div key={role}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-2.5 ${c.dim}`}>{role}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-3">
                        {items.map(m => {
                          const isSelected = selectedMemberId === m.id;
                          return (
                            <div key={m.id} className="flex flex-col items-start gap-1.5">
                              <button onClick={() => setSelectedMemberId(isSelected ? null : m.id)} style={{ minWidth: '110px' }}
                                className={`flex items-center justify-between gap-2 px-4 py-2 rounded-full border transition-all w-full ${isSelected ? `${c.activeBg} ${c.activeBorder} scale-105` : `${c.bg} ${c.border} hover:scale-105`}`}>
                                <span className={`font-black text-[13px] ${c.text} truncate`}>{m.name}</span>
                                {getVoteIcon(m.attendance)}
                              </button>
                              {isSelected && (
                                <div className="flex gap-1.5 pl-1">
                                  <button onClick={() => vote(m.id, 'attending')} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 transition-all whitespace-nowrap"><CheckIcon /> {tv.attending}</button>
                                  <button onClick={() => vote(m.id, 'absent')} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-all whitespace-nowrap"><XIcon /> {tv.absent}</button>
                                  <button onClick={() => vote(m.id, 'pending')} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/25 transition-all whitespace-nowrap"><DotIcon /> {tv.pending}</button>
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
                <p className={`text-[10px] font-black uppercase tracking-widest mb-4 text-zinc-600`}>Status</p>
                <div className="flex flex-wrap gap-6">
                  {[
                    { label: tv.attending, items: attending, headerColor: 'text-emerald-400', borderColor: 'border-emerald-500' },
                    { label: tv.absent, items: absent, headerColor: 'text-red-400', borderColor: 'border-red-500' },
                    { label: tv.pending, items: pending, headerColor: 'text-yellow-400', borderColor: 'border-yellow-500' },
                    { label: tv.noResponse, items: noResponse, headerColor: 'text-zinc-500', borderColor: 'border-zinc-600' },
                  ].map(({ label, items, headerColor, borderColor }) => (
                    <div key={label} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]">
                      <div className={`backdrop-blur-2xl border rounded-[2rem] p-6 min-h-[80px] shadow-2xl flex flex-col ${cardBg}`}>
                        <div className={`flex justify-between items-center mb-4 px-1 border-l-4 ${borderColor} pl-4`}>
                          <h2 className={`text-[14px] font-black uppercase ${headerColor}`}>{label}</h2>
                          <span className={`text-[20px] font-black ${headerColor}`}>{items.length}</span>
                        </div>
                        <div className="space-y-3 flex-1">
                          {items.map(m => <MemberCard key={m.id} m={m} />)}
                          {items.length === 0 && <p className="text-zinc-700 text-[12px] pl-1">—</p>}
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
            <div className={`relative z-10 mb-8 rounded-2xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]'}`}>
              <p className={`font-semibold text-[16px] mb-5 ${textMain}`}>{tv.history}</p>
              <div className="flex flex-col gap-4">
                {Object.keys(sessionsByCamp).length === 0 ? <p className={`text-[12px] ${textSub}`}>{tv.noSession}</p> :
                  Object.entries(sessionsByCamp).map(([campName, campSessions]: any) => (
                    <div key={campName}>
                      <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${textSub}`}>{campName}</p>
                      <div className="flex flex-col gap-2">
                        {campSessions.sort((a: any, b: any) => a.day_number - b.day_number).map((s: any) => (
                          <div key={s.id} className={`rounded-2xl border overflow-hidden ${theme === 'light' ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'}`}>
                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}>
                              <div className="flex items-center gap-3"><span className="text-[#DE6B35] font-black text-[13px]">Day {s.day_number}</span>{s.memo && <span className={`text-[12px] truncate max-w-[200px] ${textSub}`}>{s.memo}</span>}</div>
                              <div className="flex items-center gap-3">
                                <span className="text-zinc-600 text-[10px]">{new Date(s.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}</span>
                                {s.links?.length > 0 && <div className="flex gap-1">{s.links.map((link: string, i: number) => (<a key={i} href={link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[12px]">{getLinkIcon(link)}</a>))}</div>}
                                <span className="text-zinc-600 text-[10px]">{expandedSession === s.id ? '▲' : '▼'}</span>
                              </div>
                            </div>
                            {expandedSession === s.id && s.roster && (
                              <div className={`px-4 pb-4 flex flex-wrap gap-4 border-t pt-4 ${theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                                {s.roster.map((t: any) => (<div key={t.team} className="flex-1 min-w-[150px]"><p className={`text-[10px] font-black uppercase tracking-widest mb-2 border-l-2 border-[#DE6B35] pl-2 ${textSub}`}>{t.team}</p>{t.members.map((m: any, i: number) => (<div key={i} className="flex items-center gap-1.5 mb-1"><span className={`text-[12px] font-bold ${textMain}`}>{m.name}</span><span className="text-zinc-600 text-[9px] uppercase">{m.role.slice(0, 3)}</span></div>))}</div>))}
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
                  <div className={`backdrop-blur-2xl border rounded-[2rem] p-6 min-h-[200px] shadow-2xl flex flex-col ${cardBg}`}>
                    <div className={`flex items-center mb-6 px-1 border-l-4 border-[#DE6B35] pl-4`}>
                      <h2 className={`text-[14px] font-black uppercase ${textMain}`}>{tName}</h2>
                      <span className="ml-auto text-[10px] font-bold text-zinc-600">{tv.members(getSortedMembers(tName).length)}</span>
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
            <p className={`text-[11px] font-medium ${textSub}`}>Contact : everplayground@gmail.com</p>
          </div>
        </main>
      </div>

      {/* 줌 컨트롤 */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 select-none">
        <button onClick={() => setZoom(1)} className={`w-9 h-9 rounded-xl border backdrop-blur-md transition-all text-[9px] font-black tracking-widest flex items-center justify-center shadow-xl hover:text-[#DE6B35] hover:border-[#DE6B35]/30 ${btnBg}`}>1:1</button>
        <div onMouseDown={onZoomMouseDown} className={`w-9 h-14 rounded-xl border backdrop-blur-md shadow-xl cursor-ns-resize flex flex-col items-center justify-center gap-[5px] transition-all group hover:border-[#DE6B35]/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10' : 'bg-white/[0.04] border-white/10'}`}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-zinc-500 group-hover:text-[#DE6B35] transition-colors"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="flex flex-col gap-[3px]">{[0,1,2].map(i => <div key={i} className="w-3.5 h-[1.5px] rounded-full bg-zinc-500 group-hover:bg-[#DE6B35]/50 transition-colors" />)}</div>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-zinc-500 group-hover:text-[#DE6B35] transition-colors"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span className="text-[9px] font-black text-zinc-500 tracking-widest">{Math.round(zoom * 100)}%</span>
      </div>
    </>
  );
}