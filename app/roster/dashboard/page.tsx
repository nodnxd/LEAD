'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BOTH_PRODUCT_EMAILS = ['hseu2000@gmail.com', 'everplayground@gmail.com'];

const ROLES = ['Producer', 'Topliner', 'Engineer', 'A&R'];
const DEVELOPER_EMAILS = ['nodnxd@gmail.com', 'hseu2000@gmail.com'];
const ROLE_COLORS: Record<string, string> = {
  'Producer': '#3E78DB', 'Topliner': '#E97582', 'Engineer': '#7C7F65', 'A&R': '#7C7F65'
};

const T = {
  ko: {
    notice: '공지', history: '히스토리', voteClose: '투표 닫기', voteOpen: '투표 열기',
    share: '공유', export: '내보내기', random: '랜덤', studio: '+ 스튜디오',
    logout: '로그아웃', artists: '아티스트', addFromArtists: '풀에서 추가',
    namePlaceholder: '이름 (쉼표 구분)', join: 'JOIN',
    rosterPool: 'ROSTER POOL', rosterDelete: '로스터 삭제', rosterDeleteMsg: (p: string) => `"${p}" 로스터를 삭제할까요?`,
    newRoster: 'New Roster', rosterNamePlaceholder: '로스터 이름',
    studioDelete: '스튜디오 삭제', studioDeleteMsg: (t: string) => `"${t}"을 삭제할까요?`,
    memberDelete: '멤버 삭제', memberDeleteMsg: (n: string) => `"${n}"을 삭제할까요?`,
    dayDelete: (l: string) => `${l} 삭제`, dayDeleteMsg: (l: string) => `${l}를 삭제할까요?`,
    addDay: '+ Day', cancel: '취소', confirm: '확인',
    randomMatch: 'Random Match', teamCount: '팀 수 입력',
    firstRosterTitle: '첫 로스터 이름을 입력해주세요',
    firstRosterPlaceholder: '예: EPG, 봄 세션, 2025...',
    start: '시작하기',
    linkAdd: '링크 추가/삭제', linkPlaceholder: 'https://...', add: '추가', close: '닫기', noLink: '링크가 없어요',
    sessionSave: '세션 저장', campName: '캠프 이름', campPlaceholder: '예: 2025 봄 캠프',
    day: 'Day', memo: '메모 (선택)', memoPlaceholder: '예: 첫날 세션',
    link: '링크 (선택)', save: '저장', saveSession: '+ 현재 로스터 저장',
    noSession: '저장된 세션이 없어요',
    noticeTitle: '공지사항', noticeAdd: '+ 추가', noNotice: '공지사항이 없어요',
    noticeAddTitle: '공지 추가', noticeEdit: '공지 수정', noticeDelete: '공지 삭제',
    noticeDeleteMsg: (t: string) => `"${t}"을 삭제할까요?`,
    noticeTitleLabel: '제목', noticeContentLabel: '내용 (선택)',
    noticeTitlePlaceholder: '공지 제목', noticeContentPlaceholder: '공지 내용',
    edit: '수정', delete: '삭제',
    voteOpenTitle: '투표 열기', voteTitleLabel: '투표 제목', voteTitlePlaceholder: '예: 5월 세션 참여 여부',
    voteMemoPlaceholder: '예: 5월 20일 오후 2시', voteStart: '투표 시작',
    attending: '참석', absent: '불참', pending: '미정', noResponse: '미응답',
    exclude: '✕ 제외하기', include: '✓ 포함시키기',
    sessionDeleteMsg: (d: number) => `Day ${d} 삭제할까요?`, sessionDelete: '세션 삭제',
    contact: 'Contact : everplayground@gmail.com', loading: 'Loading...',
    alreadyInRoster: (n: string) => `${n} 이미 있어요!`,
    addedToRoster: (n: string, p: string) => `✅ ${n} → ${p}`,
    linkCopied: '🔗 링크가 복사됐어요!', closeVoteConfirm: '투표를 닫을까요?',
  },
  en: {
    notice: 'Notice', history: 'History', voteClose: 'Close Vote', voteOpen: 'Open Vote',
    share: 'Share', export: 'Export', random: 'Random', studio: '+ Studio',
    logout: 'Logout', artists: 'Artists', addFromArtists: 'Add from Pool',
    namePlaceholder: 'Name (comma separated)', join: 'JOIN',
    rosterPool: 'ROSTER POOL', rosterDelete: 'Delete Roster', rosterDeleteMsg: (p: string) => `Delete "${p}"?`,
    newRoster: 'New Roster', rosterNamePlaceholder: 'Roster name',
    studioDelete: 'Delete Studio', studioDeleteMsg: (t: string) => `Delete "${t}"?`,
    memberDelete: 'Delete Member', memberDeleteMsg: (n: string) => `Delete "${n}"?`,
    dayDelete: (l: string) => `Delete ${l}`, dayDeleteMsg: (l: string) => `Delete ${l}?`,
    addDay: '+ Day', cancel: 'Cancel', confirm: 'OK',
    randomMatch: 'Random Match', teamCount: 'Number of teams',
    firstRosterTitle: 'Enter your first roster name',
    firstRosterPlaceholder: 'e.g. EPG, Spring Session, 2025...',
    start: 'Start',
    linkAdd: 'Add / Remove Links', linkPlaceholder: 'https://...', add: 'Add', close: 'Close', noLink: 'No links yet',
    sessionSave: 'Save Session', campName: 'Camp Name', campPlaceholder: 'e.g. 2025 Spring Camp',
    day: 'Day', memo: 'Memo (optional)', memoPlaceholder: 'e.g. Day 1 Session',
    link: 'Links (optional)', save: 'Save', saveSession: '+ Save Current Roster',
    noSession: 'No sessions saved',
    noticeTitle: 'Notices', noticeAdd: '+ Add', noNotice: 'No notices',
    noticeAddTitle: 'Add Notice', noticeEdit: 'Edit Notice', noticeDelete: 'Delete Notice',
    noticeDeleteMsg: (t: string) => `Delete "${t}"?`,
    noticeTitleLabel: 'Title', noticeContentLabel: 'Content (optional)',
    noticeTitlePlaceholder: 'Notice title', noticeContentPlaceholder: 'Notice content',
    edit: 'Edit', delete: 'Delete',
    voteOpenTitle: 'Open Vote', voteTitleLabel: 'Vote Title', voteTitlePlaceholder: 'e.g. May Session Attendance',
    voteMemoPlaceholder: 'e.g. May 20, 2pm', voteStart: 'Start Vote',
    attending: 'Attending', absent: 'Absent', pending: 'Undecided', noResponse: 'No Response',
    exclude: '✕ Exclude', include: '✓ Include',
    sessionDeleteMsg: (d: number) => `Delete Day ${d}?`, sessionDelete: 'Delete Session',
    contact: 'Contact : everplayground@gmail.com', loading: 'Loading...',
    alreadyInRoster: (n: string) => `${n} already in roster!`,
    addedToRoster: (n: string, p: string) => `✅ ${n} → ${p}`,
    linkCopied: '🔗 Link copied!', closeVoteConfirm: 'Close the vote?',
  }
};

type Lang = 'ko' | 'en';
type Theme = 'dark' | 'light';

const Modal = ({ title, message, children, theme }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-pretendard">
    <div className={`w-full max-w-sm mx-4 border rounded-2xl p-6 shadow-2xl ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#111] border-white/10'}`}>
      {title && <h2 className={`font-black text-[16px] mb-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}>{title}</h2>}
      {message && <p className={`text-[13px] mb-5 leading-relaxed whitespace-pre-line ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>{message}</p>}
      {children}
    </div>
  </div>
);

const PortalDraggable = ({ children, draggableId, index }: any) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);
  if (!mounted) return null;
  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => {
        const child = (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
            style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.8 : 1 }}>
            {children}
          </div>
        );
        if (snapshot.isDragging) return createPortal(child, document.body);
        return child;
      }}
    </Draggable>
  );
};

const QUICK_LINKS = [
  { label: '📸 Instagram', prefix: 'https://instagram.com/' },
  { label: '🎵 SoundCloud', prefix: 'https://soundcloud.com/' },
  { label: '🎧 Spotify', prefix: 'https://open.spotify.com/artist/' },
  { label: '▶️ YouTube', prefix: 'https://youtube.com/@' },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [myProducts, setMyProducts] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      await supabase.from('user_products').upsert({ user_id: user.id, product: 'roster' }, { onConflict: 'user_id,product' });
      const { data } = await supabase.from('user_products').select('product').eq('user_id', user.id);
      setMyProducts((data || []).map((r: any) => r.product));
    })();
  }, [user?.id]);

  // members = profiles (이름, role, gender, attendance 등)
  const [members, setMembers] = useState<any[]>([]);
  // assignments = roster_assignments (day별 배치)
  const [assignments, setAssignments] = useState<any[]>([]);

  const [teams, setTeams] = useState<string[]>(['Unassigned']);
  const [projects, setProjects] = useState<string[]>([]);
  const [currentProject, setCurrentProject] = useState('');
  const [currentDay, setCurrentDay] = useState(1);
  const [days, setDays] = useState<number[]>([1]);
  const [dayNames, setDayNames] = useState<Record<number, string>>({});
  const [editingDayName, setEditingDayName] = useState<number | null>(null);
  const [dayNameInput, setDayNameInput] = useState('');

  const [name, setName] = useState('');
  const [role, setRole] = useState('Producer');
  const [gender, setGender] = useState('male');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [teamEditValue, setTeamEditValue] = useState('');

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [roleDropdown, setRoleDropdown] = useState<{ id: any; x: number; y: number; excluded: boolean } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStep, setExportStep] = useState<'type' | 'scope'>('type');
  const [exportType, setExportType] = useState<'text' | 'jpeg' | 'pdf'>('jpeg');

  const [lang, setLang] = useState<Lang>('ko');
  const [theme, setTheme] = useState<Theme>('dark');
  const t = T[lang];

  const [showFirstRosterModal, setShowFirstRosterModal] = useState(false);
  const [firstRosterName, setFirstRosterName] = useState('');
  const [linkModal, setLinkModal] = useState<any>(null);
  const [newLink, setNewLink] = useState('');

  const [notices, setNotices] = useState<any[]>([]);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeIsGlobal, setNoticeIsGlobal] = useState(false);
  const [showNoticeBoard, setShowNoticeBoard] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSessionBoard, setShowSessionBoard] = useState(false);
  const [sessionCampName, setSessionCampName] = useState('');
  const [sessionDayNumber, setSessionDayNumber] = useState('1');
  const [sessionMemo, setSessionMemo] = useState('');
  const [sessionLinks, setSessionLinks] = useState<string[]>([]);
  const [newSessionLink, setNewSessionLink] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const [votingOpen, setVotingOpen] = useState(false);
  const [votingSessionId, setVotingSessionId] = useState<string | null>(null);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [votingTitle, setVotingTitle] = useState('');
  const [votingMemo, setVotingMemo] = useState('');

  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onOk: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ title: string; placeholder: string; onOk: (v: string) => void } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const [showArtistPanel, setShowArtistPanel] = useState(false);
  const [artistList, setArtistList] = useState<any[]>([]);
  const [artistSearch, setArtistSearch] = useState('');

  const [zoom, setZoom] = useState(1);
  const isDraggingZoom = useRef(false);
  const dragStartY = useRef(0);
  const dragStartZoom = useRef(1);
  const isComposing = useRef(false);

  const showConfirm = (title: string, message: string, onOk: () => void) => setConfirmModal({ title, message, onOk });
  const showPrompt = (title: string, placeholder: string, defaultValue: string, onOk: (v: string) => void) => {
    setPromptValue(defaultValue); setPromptModal({ title, placeholder, onOk });
  };
  const showToastMsg = (msg: string) => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2500); };

  useEffect(() => {
    const savedLang = localStorage.getItem('cast_lang') as Lang | null;
    const savedTheme = localStorage.getItem('cast_theme') as Theme | null;
    if (savedLang) setLang(savedLang);
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const toggleLang = () => { const next: Lang = lang === 'ko' ? 'en' : 'ko'; setLang(next); localStorage.setItem('cast_lang', next); };
  const toggleTheme = () => { const next: Theme = theme === 'dark' ? 'light' : 'dark'; setTheme(next); localStorage.setItem('cast_theme', next); };

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

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (!data.user) router.push('/roster'); else setUser(data.user); }); }, []);

  // ── 데이터 fetch ──────────────────────────────────────────
  const fetchMembers = useCallback(async (u = user) => {
    if (!u) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', u.id).order('name', { ascending: true });
    if (data) {
      setMembers(data);
      const savedProjects = JSON.parse(localStorage.getItem(`epg_projects_${u.id}`) || 'null');
      if (savedProjects?.length > 0) {
        setProjects(savedProjects);
        setCurrentProject(prev => prev || savedProjects[0]);
      } else {
        const dbProjects = Array.from(new Set(data.map((m: any) => m.project).filter(Boolean))) as string[];
        if (dbProjects.length > 0) { setProjects(dbProjects); setCurrentProject(prev => prev || dbProjects[0]); }
        else setShowFirstRosterModal(true);
      }
    } else setShowFirstRosterModal(true);
  }, [user]);

  const fetchAssignments = useCallback(async (u = user) => {
    if (!u) return;
    const { data } = await supabase.from('roster_assignments').select('*').eq('user_id', u.id).order('order_index', { ascending: true });
    if (data) {
      setAssignments(data);
      // 모든 project+day 조합의 팀 목록을 localStorage에 저장 (없는 경우만)
      const combos = Array.from(new Set(data.map((a: any) => `${a.project}__${a.day_number}`)));
      combos.forEach(combo => {
        const [proj, dayStr] = (combo as string).split('__');
        const day = parseInt(dayStr);
        const key = `epg_teams_${u.id}_${proj}_day${day}`;
        const existing = JSON.parse(localStorage.getItem(key) || 'null');
        if (!existing || existing.length === 0) {
          const teamsFromDB = Array.from(new Set(
            data.filter((a: any) => a.project === proj && a.day_number === day && a.team !== 'Unassigned')
                .map((a: any) => a.team)
          )) as string[];
          if (teamsFromDB.length > 0) {
            localStorage.setItem(key, JSON.stringify(teamsFromDB));
          }
        }
      });
    }
  }, [user]);

  const fetchArtists = async (u = user) => {
    if (!u) return;
    const { data } = await supabase.from('artists').select('*').eq('host_id', u.id).order('name', { ascending: true });
    if (data) setArtistList(data);
  };

  const fetchVotingSession = async (u: any) => {
    const { data } = await supabase.from('voting_sessions').select('*').eq('host_id', u.id).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) { setVotingOpen(data[0].is_open); setVotingSessionId(data[0].id); setVotingTitle(data[0].title || ''); setVotingMemo(data[0].memo || ''); }
  };

  const fetchNotices = async (u: any) => {
    const { data: own } = await supabase.from('notices').select('*').eq('host_id', u.id).order('created_at', { ascending: false });
    const { data: global } = await supabase.from('notices').select('*').eq('is_global', true).order('created_at', { ascending: false });
    const ownList = own || [];
    const globalList = (global || []).filter((g: any) => g.host_id !== u.id);
    setNotices([...globalList, ...ownList]);
  };

  const fetchSessions = async (u: any) => {
    const { data } = await supabase.from('sessions').select('*').eq('host_id', u.id).order('created_at', { ascending: false });
    if (data) setSessions(data);
  };

  useEffect(() => {
    if (!user) return;
    fetchMembers(user); fetchAssignments(user);
    fetchVotingSession(user); fetchNotices(user); fetchSessions(user); fetchArtists(user);
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, () => { fetchMembers(user); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!currentProject || !user) return;
    const savedDays = JSON.parse(localStorage.getItem(`epg_days_${user.id}_${currentProject}`) || 'null');
    const savedNames = JSON.parse(localStorage.getItem(`epg_daynames_${user.id}_${currentProject}`) || '{}');
    if (savedDays && savedDays.length > 0) {
      setDays(savedDays); setCurrentDay(prev => savedDays.includes(prev) ? prev : savedDays[0]);
    } else {
      // localStorage 없으면 assignments에서 day 목록 복원
      const daysFromDB = Array.from(new Set(
        assignments.filter((a: any) => a.project === currentProject).map((a: any) => a.day_number)
      )).sort((a: any, b: any) => a - b) as number[];
      if (daysFromDB.length > 0) {
        setDays(daysFromDB); setCurrentDay(daysFromDB[0]);
        localStorage.setItem(`epg_days_${user.id}_${currentProject}`, JSON.stringify(daysFromDB));
      } else {
        setDays([1]); setCurrentDay(1);
      }
    }
    setDayNames(savedNames);
  }, [currentProject, assignments]);

  useEffect(() => {
    if (!currentProject || !user) return;
    // localStorage 우선 (드래그 순서 보존)
    const key = `epg_teams_${user.id}_${currentProject}_day${currentDay}`;
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.length > 0) {
      setTeams(['Unassigned', ...saved]);
    } else {
      // localStorage 없으면 DB에서 복원
      const teamsFromDB = Array.from(new Set(
        assignments
          .filter((a: any) => a.project === currentProject && a.day_number === currentDay && a.team !== 'Unassigned')
          .map((a: any) => a.team)
      )) as string[];
      if (teamsFromDB.length > 0) setTeams(['Unassigned', ...teamsFromDB]);
      else setTeams(['Unassigned']);
    }
  }, [currentProject, currentDay, assignments]);

  // ── 저장 헬퍼 ──────────────────────────────────────────
  const saveTeamOrder = async (uid: string, project: string, day: number, teamList: string[]) => {
    const filtered = teamList.filter(t => t !== 'Unassigned');
    localStorage.setItem(`epg_teams_${uid}_${project}_day${day}`, JSON.stringify(filtered));
    const { data: existing } = await supabase.from('host_settings').select('*').eq('host_id', uid).single();
    const prev = (existing as any)?.team_order || {};
    await supabase.from('host_settings').upsert({ host_id: uid, team_order: { ...prev, [`${project}_day${day}`]: filtered }, project_order: (existing as any)?.project_order || [] });
  };

  const saveProjectOrder = async (uid: string, projectList: string[]) => {
    localStorage.setItem(`epg_projects_${uid}`, JSON.stringify(projectList));
    const { data: existing } = await supabase.from('host_settings').select('*').eq('host_id', uid).single();
    await supabase.from('host_settings').upsert({ host_id: uid, project_order: projectList, team_order: (existing as any)?.team_order || {} });
  };

  const saveDays = async (uid: string, project: string, dayList: number[], names: Record<number, string>) => {
    localStorage.setItem(`epg_days_${uid}_${project}`, JSON.stringify(dayList));
    localStorage.setItem(`epg_daynames_${uid}_${project}`, JSON.stringify(names));
    const { data: existing } = await supabase.from('host_settings').select('*').eq('host_id', uid).single();
    const prev = (existing as any)?.team_order || {};
    await supabase.from('host_settings').upsert({ host_id: uid, team_order: { ...prev, [`${project}_days`]: dayList, [`${project}_daynames`]: names }, project_order: (existing as any)?.project_order || [] });
  };

  // ── Day 관리 ──────────────────────────────────────────
  const addDay = async () => {
    const next = Math.max(...days) + 1;
    const newDays = [...days, next]; setDays(newDays); setCurrentDay(next);
    await saveDays(user.id, currentProject, newDays, dayNames);
  };

  const removeDay = async (day: number) => {
    if (days.length <= 1) return;
    // 해당 Day의 assignments 삭제
    await supabase.from('roster_assignments').delete().eq('user_id', user.id).eq('project', currentProject).eq('day_number', day);
    const newDays = days.filter(d => d !== day);
    const newNames = { ...dayNames }; delete newNames[day];
    setDays(newDays); setCurrentDay(newDays[0]); setDayNames(newNames);
    await saveDays(user.id, currentProject, newDays, newNames);
    fetchAssignments(user);
  };

  const saveDayName = async (day: number, n: string) => {
    const newNames = { ...dayNames, [day]: n };
    setDayNames(newNames); setEditingDayName(null);
    await saveDays(user.id, currentProject, days, newNames);
  };

  // ── 멤버/배치 관련 ──────────────────────────────────────────
  // 현재 Day에서 assignment 가져오기
  const getAssignment = (profileId: any) =>
    assignments.find(a => a.profile_id === String(profileId) && a.project === currentProject && a.day_number === currentDay);

  // 풀: 현재 Day에 배치 안 된 멤버 (프로젝트 멤버 중)
  const getPoolMembers = (r: string) =>
    members.filter(m => m.project === currentProject && m.role === r && !getAssignment(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));

  // 스튜디오: 현재 Day에 배치된 멤버
  const getDayMembers = (teamName: string) => {
    const teamAssignments = assignments
      .filter(a => a.project === currentProject && a.day_number === currentDay && a.team === teamName)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    return teamAssignments.map(a => {
      const member = members.find(m => String(m.id) === String(a.profile_id));
      return member ? { ...member, assignment_id: a.id, order_index: a.order_index } : null;
    }).filter(Boolean);
  };

  const handleJoin = async () => {
    if (!name.trim()) return;
    const names = name.split(',').map(n => n.trim()).filter(n => n);
    await supabase.from('profiles').insert(names.map(n => ({
      name: n, role, gender, project: currentProject, user_id: user.id
    })));
    // artists 동기화
    for (const n of names) {
      const { data: ex } = await supabase.from('artists').select('id').eq('host_id', user.id).eq('name', n);
      if (!ex || ex.length === 0) await supabase.from('artists').insert({ name: n, role, gender, host_id: user.id });
    }
    setName(''); fetchMembers(user);
  };

  const deleteMember = async (profileId: any) => {
    await supabase.from('roster_assignments').delete().eq('profile_id', profileId).eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', profileId).eq('user_id', user.id);
    fetchMembers(user); fetchAssignments(user);
  };

  const updateMemberName = async (id: any) => {
    if (!editValue) return setEditingId(null);
    await supabase.from('profiles').update({ name: editValue }).eq('id', id).eq('user_id', user.id);
    setMembers(members.map(m => m.id === id ? { ...m, name: editValue } : m)); setEditingId(null);
  };

  const updateMemberRole = async (id: any, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', id).eq('user_id', user.id);
    setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m));
    setRoleDropdown(null);
  };

  const toggleExcludeMember = async (memberId: any, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    await supabase.from('profiles').update({ excluded: newStatus }).eq('id', memberId).eq('user_id', user.id);
    setMembers(members.map(m => m.id === memberId ? { ...m, excluded: newStatus } : m));
    setRoleDropdown(null);
  };

  const saveMemberLinks = async (memberId: any, links: string[]) => {
    await supabase.from('profiles').update({ links }).eq('id', memberId).eq('user_id', user.id);
    setMembers(members.map(m => m.id === memberId ? { ...m, links } : m));
  };

  // 멤버를 현재 Day 스튜디오에 배치
  const assignMember = async (profileId: any, teamName: string, orderIndex: number = 999) => {
    // 이미 이 Day에 배치된 경우 업데이트, 아니면 insert
    const existing = getAssignment(profileId);
    if (existing) {
      await supabase.from('roster_assignments').update({ team: teamName, order_index: orderIndex }).eq('id', existing.id);
    } else {
      await supabase.from('roster_assignments').insert({
        profile_id: String(profileId), user_id: user.id,
        project: currentProject, day_number: currentDay,
        team: teamName, order_index: orderIndex,
      });
    }
    fetchAssignments(user);
  };

  // 멤버를 현재 Day에서 제거 (풀로 돌려보내기)
  const unassignMember = async (profileId: any) => {
    const existing = getAssignment(profileId);
    if (existing) {
      await supabase.from('roster_assignments').delete().eq('id', existing.id);
      fetchAssignments(user);
    }
  };

  // 아티스트 → 로스터 추가
  const addArtistToRoster = async (artist: any) => {
    const already = members.find(m => m.project === currentProject && m.name === artist.name);
    if (already) { showToastMsg(t.alreadyInRoster(artist.name)); return; }
    const roleToUse = ROLES.includes(artist.role) ? artist.role : 'Producer';
    await supabase.from('profiles').insert({
      name: artist.name, role: roleToUse, gender: artist.gender || 'male',
      project: currentProject, user_id: user.id, links: artist.links || [],
    });
    fetchMembers(user);
    showToastMsg(t.addedToRoster(artist.name, currentProject));
  };

  // ── 랜덤 배치 ──────────────────────────────────────────
  const generateRandomRoster = (teamCount: number) => async () => {
    const day = currentDay; // 클로저로 현재 Day 고정
    const proj = currentProject;
    const pool = members.filter(m => m.project === proj && !m.excluded && m.attendance !== 'absent');
    const producers = pool.filter(m => m.role === 'Producer').sort(() => Math.random() - 0.5);
    const topliners = pool.filter(m => m.role === 'Topliner').sort(() => Math.random() - 0.5);
    const others = pool.filter(m => m.role !== 'Producer' && m.role !== 'Topliner').sort(() => Math.random() - 0.5);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newTeams = Array.from({ length: teamCount }, (_, i) => `Studio ${alphabet[i]}`);

    // 현재 Day + 현재 프로젝트 assignments만 삭제
    await supabase.from('roster_assignments')
      .delete()
      .eq('user_id', user.id)
      .eq('project', proj)
      .eq('day_number', day);

    const toInsert: any[] = [];
    const assignAll = (arr: any[], startIdx: number) => {
      arr.forEach((m, i) => toInsert.push({
        profile_id: String(m.id), user_id: user.id, project: proj,
        day_number: day, team: newTeams[i % teamCount], order_index: startIdx + i,
      }));
    };
    assignAll(producers, 0); assignAll(topliners, 10); assignAll(others, 50);
    if (toInsert.length > 0) await supabase.from('roster_assignments').insert(toInsert);

    const next = ['Unassigned', ...newTeams]; setTeams(next);
    await saveTeamOrder(user.id, proj, day, next);
    fetchAssignments(user);
  };

  // ── Drag & Drop ──────────────────────────────────────────
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (type === 'PROJECT') {
      const next = Array.from(projects); const [moved] = next.splice(source.index, 1); next.splice(destination.index, 0, moved);
      setProjects(next); await saveProjectOrder(user.id, next); return;
    }
    if (type === 'TEAM') {
      const other = teams.filter(t => t !== 'Unassigned'); const [moved] = other.splice(source.index, 1); other.splice(destination.index, 0, moved);
      const next = ['Unassigned', ...other]; setTeams(next); await saveTeamOrder(user.id, currentProject, currentDay, next); return;
    }

    const profileId = draggableId;

    if (destination.droppableId.startsWith('pool_')) {
      // 풀로 드롭 → 배치 해제
      await unassignMember(profileId);
      return;
    }

    const destTeam = destination.droppableId;
    // 팀에 배치
    const destMembers = getDayMembers(destTeam);
    const newIndex = destination.index;

    // 순서 재계산
    const existing = getAssignment(profileId);
    if (existing) {
      await supabase.from('roster_assignments').update({ team: destTeam, order_index: newIndex * 10 }).eq('id', existing.id);
    } else {
      await supabase.from('roster_assignments').insert({
        profile_id: String(profileId), user_id: user.id,
        project: currentProject, day_number: currentDay,
        team: destTeam, order_index: newIndex * 10,
      });
    }
    fetchAssignments(user);
  };

  // ── 기타 ──────────────────────────────────────────
  const copyShareLink = () => { navigator.clipboard.writeText(`${window.location.origin}/roster/view/${user.id}`); showToastMsg(t.linkCopied); };

  const saveSession = async () => {
    if (!sessionCampName.trim()) return;
    const roster = teams.filter(t => t !== 'Unassigned').map(t => ({ team: t, members: getDayMembers(t).map((m: any) => ({ name: m.name, role: m.role, gender: m.gender })) }));
    await supabase.from('sessions').insert({ host_id: user.id, project: currentProject, camp_name: sessionCampName, day_number: parseInt(sessionDayNumber) || 1, memo: sessionMemo || null, links: sessionLinks, roster });
    setShowSessionModal(false); setSessionCampName(''); setSessionDayNumber('1'); setSessionMemo(''); setSessionLinks([]); fetchSessions(user);
  };

  const saveNotice = async () => {
    if (!noticeTitle.trim()) return;
    const isDev = DEVELOPER_EMAILS.includes(user?.email || '');
    if (editingNoticeId) await supabase.from('notices').update({ title: noticeTitle, content: noticeContent, is_global: isDev ? noticeIsGlobal : false }).eq('id', editingNoticeId);
    else await supabase.from('notices').insert({ host_id: user.id, title: noticeTitle, content: noticeContent, is_global: isDev ? noticeIsGlobal : false });
    setNoticeTitle(''); setNoticeContent(''); setNoticeIsGlobal(false); setEditingNoticeId(null); setShowNoticeModal(false); fetchNotices(user);
  };

  const openVoting = async () => {
    await supabase.from('profiles').update({ attendance: null }).eq('user_id', user.id);
    const payload = { host_id: user.id, is_open: true, title: votingTitle || (lang === 'ko' ? '참여 여부 투표' : 'Attendance Vote'), memo: votingMemo || null };
    const { data } = await supabase.from('voting_sessions').insert(payload).select(); if (data) setVotingSessionId(data[0].id);
    setVotingOpen(true); setShowVotingModal(false); fetchMembers(user);
  };

  const closeVoting = async () => {
    if (!votingSessionId) return;
    const { data: votes } = await supabase.from('votes').select('*').eq('session_id', votingSessionId);
    const result = { yes: 0, no: 0, maybe: 0, details: votes || [] };
    (votes || []).forEach((v: any) => { if (v.answer === 'yes') result.yes++; else if (v.answer === 'no') result.no++; else result.maybe++; });
    await supabase.from('voting_sessions').update({ is_open: false, result }).eq('id', votingSessionId);
    setVotingOpen(false);
  };

  const createFirstRoster = async () => {
    if (!firstRosterName.trim()) return;
    const next = [firstRosterName.trim()]; setProjects(next); setCurrentProject(firstRosterName.trim());
    await saveProjectOrder(user.id, next); setShowFirstRosterModal(false);
  };

  // ── 내보내기 ──────────────────────────────────────────
  const getRosterText = () => {
    const dayLabel = dayNames[currentDay] || `Day ${currentDay}`;
    let text = `${currentProject} — ${dayLabel}\n${'─'.repeat(30)}\n\n`;
    const activeTeams = teams.filter(t => t !== 'Unassigned');
    if (activeTeams.length === 0) { text += lang === 'ko' ? '배치된 팀이 없어요' : 'No teams assigned'; }
    else {
      for (const tName of activeTeams) {
        const ms = getDayMembers(tName);
        text += `【${tName}】\n`;
        if (ms.length === 0) text += lang === 'ko' ? '  (비어있음)\n' : '  (empty)\n';
        else for (const m of ms as any[]) text += `  ${m.name} (${m.role}, ${m.gender === 'female' ? 'F' : 'M'})\n`;
        text += '\n';
      }
    }
    return text;
  };

  const exportRoster = () => { setExportStep('type'); setShowExportModal(true); };

  const exportAsText = () => {
    navigator.clipboard.writeText(getRosterText());
    showToastMsg('📋 ' + (lang === 'ko' ? '텍스트 복사됐어요!' : 'Copied!'));
    setShowExportModal(false);
  };

  const exportAsImage = async (format: 'jpeg' | 'pdf') => {
    showToastMsg('📸 ' + (lang === 'ko' ? '생성 중...' : 'Generating...'));
    try {
      const dayLabel = dayNames[currentDay] || `Day ${currentDay}`;
      const activeTeams = teams.filter(t => t !== 'Unassigned');
      const teamData = activeTeams.map(tName => ({ name: tName, members: getDayMembers(tName) as any[] }));
      const canvas = buildRosterCanvas(teamData, dayLabel);
      if (format === 'jpeg') {
        const link = document.createElement('a');
        link.download = `${currentProject}_${dayLabel}_roster.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showToastMsg('📸 ' + (lang === 'ko' ? 'JPEG 저장됐어요!' : 'JPEG saved!'));
      } else {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
        // 카드 위에 투명 클릭 영역 추가
        const _PAD = 40; const _HEADER_H = 60; const _MEMBER_H = 60;
        const _BADGE_ROW_H = 30; const _CARD_TITLE_H = 44; const _TEAM_GAP = 16;
        const _COLS = Math.max(1, Math.min(teamData.length, 4));
        const _CARD_W = Math.floor((1400 - _PAD * 2 - _TEAM_GAP * (_COLS - 1)) / _COLS);
        const _maxCardH = teamData.length > 0 ? Math.max(...teamData.map((td: any) => {
          const rc = Object.keys((td.members||[]).reduce((a:any,m:any)=>{if(m)a[m.role]=(a[m.role]||0)+1;return a},{})).length;
          return _CARD_TITLE_H + Math.ceil(rc/4)*_BADGE_ROW_H + 8 + (td.members||[]).length*_MEMBER_H + 16;
        })) : 200;
        teamData.forEach((td: any, i: number) => {
          const _row = Math.floor(i/_COLS); const _col = i%_COLS;
          const _cx = _PAD + _col*(_CARD_W+_TEAM_GAP);
          const _cy = _PAD + _HEADER_H + _row*(_maxCardH+_TEAM_GAP);
          const _rc = Object.keys((td.members||[]).reduce((a:any,m:any)=>{if(m)a[m.role]=(a[m.role]||0)+1;return a},{})).length;
          const _membersY = _cy + _CARD_TITLE_H + Math.ceil(_rc/4)*_BADGE_ROW_H + 12;
          (td.members||[]).forEach((m: any, mi: number) => {
            if (!m || !m.links || m.links.length === 0) return;
            const _my = _membersY + mi*_MEMBER_H;
            pdf.link(_cx+12, _my, _CARD_W-24, _MEMBER_H-8, { url: m.links[0] });
          });
        });
        let y = canvas.height / 2 + 20;
        pdf.setFontSize(11); pdf.setTextColor(100);
        activeTeams.forEach(tName => {
          const ms = getDayMembers(tName) as any[];
          pdf.setFontSize(12); pdf.setTextColor(222, 107, 53);
          pdf.text(tName, 20, y); y += 16;
          pdf.setFontSize(10); pdf.setTextColor(200, 200, 200);
          ms.forEach((m: any) => {
            pdf.setFontSize(10); pdf.setTextColor(220, 220, 220);
            const nameText = `${m.name}  (${m.role}, ${m.gender === 'female' ? 'F' : 'M'})`;
            pdf.text(nameText, 30, y);
            if (m.links && m.links.length > 0) {
              let lx = 30 + pdf.getTextWidth(nameText) + 4;
              m.links.forEach((lk: string) => {
                const icon = lk.includes('instagram') ? '[IG]' : lk.includes('soundcloud') ? '[SC]' : lk.includes('spotify') ? '[SP]' : lk.includes('youtube') ? '[YT]' : '[Link]';
                pdf.setTextColor(100, 180, 255);
                pdf.textWithLink(` ${icon}`, lx, y, { url: lk });
                lx += pdf.getTextWidth(` ${icon}`) + 2;
                pdf.setTextColor(220, 220, 220);
              });
            }
            y += 13;
          });
          y += 8;
        });
        pdf.save(`${currentProject}_${dayLabel}_roster.pdf`);
        showToastMsg('📄 ' + (lang === 'ko' ? 'PDF 저장됐어요!' : 'PDF saved!'));
      }
    } catch (err) { console.error(err); showToastMsg('❌ ' + (lang === 'ko' ? '실패했어요' : 'Failed')); }
  };

;

  const exportAllDays = async (format: 'jpeg' | 'pdf' = 'jpeg') => {
    showToastMsg('📸 ' + (lang === 'ko' ? '생성 중...' : 'Generating...'));
    try {
      const ROLE_COLORS_MAP: Record<string, string> = { 'Producer': '#3E78DB', 'Topliner': '#E97582', 'Engineer': '#7C7F65', 'A&R': '#7C7F65' };
      const ROLE_SHORT: Record<string, string> = { 'Producer': 'Pro', 'Topliner': 'Top', 'Engineer': 'Eng', 'A&R': 'A&R' };
      const SCALE = 2;
      const PAD = 40;
      const HEADER_H = 60;
      const DAY_LABEL_H = 28;
      const TEAM_GAP = 16;
      const MEMBER_H = 52;
      const BADGE_H = 24;
      const BADGE_ROW_H = 30;
      const CARD_TITLE_H = 44;
      const CARD_RADIUS = 16;
      const COLS = 4;
      const CARD_W = Math.floor((1400 - PAD * 2 - TEAM_GAP * (COLS - 1)) / COLS);

      // 모든 Day 데이터 수집
      const allDayData = days.map(day => {
        const dayLabel = dayNames[day] || `Day ${day}`;
        const dayTeams = Array.from(new Set(
          assignments.filter((a: any) => a.project === currentProject && a.day_number === day && a.team !== 'Unassigned').map((a: any) => a.team)
        )) as string[];
        const teamData = dayTeams.map(tName => ({
          name: tName,
          members: assignments
            .filter((a: any) => a.project === currentProject && a.day_number === day && a.team === tName)
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            .map((a: any) => members.find((m: any) => String(m.id) === String(a.profile_id)))
            .filter(Boolean),
        }));
        return { dayLabel, teamData };
      });

      // 각 Day의 카드 높이 계산
      const getRoleCounts = (td: any) => {
        const counts: Record<string, number> = {};
        (td.members || []).forEach((m: any) => { if (m) counts[m.role] = (counts[m.role] || 0) + 1; });
        return Object.entries(counts);
      };
      const calcCardH = (td: any) => {
        const roleCounts = getRoleCounts(td);
        const badgeRows = Math.ceil(roleCounts.length / 4);
        return CARD_TITLE_H + badgeRows * BADGE_ROW_H + 8 + (td.members || []).length * MEMBER_H + 16;
      };

      const allMaxCardH = Math.max(...allDayData.flatMap(d => d.teamData.map(calcCardH)), 200);
      const dayRowH = DAY_LABEL_H + allMaxCardH + TEAM_GAP;
      const totalW = PAD * 2 + COLS * CARD_W + TEAM_GAP * (COLS - 1);
      const totalH = PAD + HEADER_H + allDayData.length * dayRowH + PAD;

      const canvas = document.createElement('canvas');
      canvas.width = totalW * SCALE; canvas.height = totalH * SCALE;
      const ctx = canvas.getContext('2d')!; ctx.scale(SCALE, SCALE);

      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, totalW, totalH);

      // 헤더
      ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = '#DE3C4B';
      ctx.fillText('CAST', PAD, PAD + 30);
      const castW = ctx.measureText('CAST').width;
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#555';
      ctx.fillText('by NEN', PAD + castW + 8, PAD + 30);

      // 각 Day 그리기
      allDayData.forEach(({ dayLabel, teamData }, di) => {
        const dayY = PAD + HEADER_H + di * dayRowH;

        // Day 라벨
        ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = '#DE3C4B';
        ctx.fillText(dayLabel.toUpperCase(), PAD, dayY + 18);

        // 팀 카드
        teamData.forEach((td, ti) => {
          const cx = PAD + ti * (CARD_W + TEAM_GAP);
          const cy = dayY + DAY_LABEL_H;
          const ch = allMaxCardH;

          ctx.fillStyle = '#111'; roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
          roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.stroke();
          // accent bar 제거됨

          ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#fff';
          ctx.fillText(td.name.toUpperCase(), cx + 20, cy + 28);

          // role 뱃지
          const roleCounts = getRoleCounts(td);
          let bx = cx + 20; let by = cy + CARD_TITLE_H;
          roleCounts.forEach(([role, count]) => {
            const rc = ROLE_COLORS_MAP[role] || '#888';
            const label = `${ROLE_SHORT[role] || role} ${count}`;
            ctx.font = 'bold 9px system-ui, sans-serif';
            const lw = ctx.measureText(label).width + 14;
            ctx.fillStyle = rc + '25'; roundRect(ctx, bx, by, lw, BADGE_H, 5); ctx.fill();
            ctx.strokeStyle = rc + '60'; ctx.lineWidth = 1; roundRect(ctx, bx, by, lw, BADGE_H, 5); ctx.stroke();
            ctx.fillStyle = rc; ctx.fillText(label, bx + 7, by + 16);
            bx += lw + 6;
            if (bx > cx + CARD_W - 60) { bx = cx + 20; by += BADGE_ROW_H; }
          });

          // 멤버
          const membersY = cy + CARD_TITLE_H + Math.ceil(roleCounts.length / 4) * BADGE_ROW_H + 12;
          (td.members as any[]).forEach((m, mi) => {
            if (!m) return;
            const mx = cx + 12; const my = membersY + mi * MEMBER_H;
            const mw = CARD_W - 24; const mh = MEMBER_H - 8;
            const rc = ROLE_COLORS_MAP[m.role] || '#333';
            ctx.fillStyle = rc + '15'; roundRect(ctx, mx, my, mw, mh, 10); ctx.fill();
            // role bar 제거됨
            ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#fff';
            ctx.fillText(m.name, mx + 14, my + mh * 0.46);
            const nameW = ctx.measureText(m.name).width;
            const gColor = m.gender === 'female' ? '#E97582' : '#3E78DB';
            const gLabel = m.gender === 'female' ? 'F' : 'M';
            const bx2 = mx + 14 + nameW + 6; const by2 = my + mh * 0.2;
            const bw = 20; const bh = 15;
            ctx.fillStyle = gColor + '28'; roundRect(ctx, bx2, by2, bw, bh, 4); ctx.fill();
            ctx.strokeStyle = gColor + '80'; ctx.lineWidth = 1; roundRect(ctx, bx2, by2, bw, bh, 4); ctx.stroke();
            ctx.font = 'bold 10px Arial, sans-serif'; ctx.fillStyle = gColor;
            ctx.textAlign = 'center';
            ctx.fillText(gLabel, bx2 + bw / 2, by2 + bh * 0.75);
            ctx.textAlign = 'left';
            ctx.font = '8px system-ui, sans-serif'; ctx.fillStyle = rc + 'aa';
            ctx.fillText(m.role.toUpperCase(), mx + 14, my + mh * 0.72);
          });
        });
      });

      ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = '#1e1e1e';
      ctx.fillText('CAST by NEN', PAD, totalH - 14);

      if (format === 'jpeg') {
        const link = document.createElement('a');
        link.download = `${currentProject}_ALL_roster.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showToastMsg('📸 ' + (lang === 'ko' ? '전체 Day JPEG 저장됐어요!' : 'All Days JPEG saved!'));
      } else {
        const { jsPDF } = await import('jspdf');
        const pw = canvas.width / 2; const ph = canvas.height / 2;
        const pdf = new jsPDF({ orientation: pw > ph ? 'landscape' : 'portrait', unit: 'px', format: [pw, ph] });
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pw, ph);
        // 전체 Day 카드 위에 투명 클릭 영역 추가
        const _aPAD = 40; const _aHEADER_H = 60; const _aDAY_LABEL_H = 28;
        const _aMEMBER_H = 52; const _aBROW_H = 30; const _aCARD_TITLE_H = 44;
        const _aTEAM_GAP = 16; const _aCOLS = 4;
        const _aCARD_W = Math.floor((1400 - _aPAD*2 - _aTEAM_GAP*(_aCOLS-1))/_aCOLS);
        const _aAllMaxCardH = Math.max(...allDayData.flatMap((d: any) => d.teamData.map((td: any) => {
          const rc = Object.keys((td.members||[]).reduce((a:any,m:any)=>{if(m)a[m.role]=(a[m.role]||0)+1;return a},{})).length;
          return _aCARD_TITLE_H + Math.ceil(rc/4)*_aBROW_H + 8 + (td.members||[]).length*_aMEMBER_H + 16;
        })), 200);
        const _aDayRowH = _aDAY_LABEL_H + _aAllMaxCardH + _aTEAM_GAP;
        allDayData.forEach((dayD: any, di: number) => {
          const _dayY = _aPAD + _aHEADER_H + di*_aDayRowH;
          dayD.teamData.forEach((td: any, ti: number) => {
            if (ti >= _aCOLS) return;
            const _cx = _aPAD + ti*(_aCARD_W+_aTEAM_GAP);
            const _cy = _dayY + _aDAY_LABEL_H;
            const _rc = Object.keys((td.members||[]).reduce((a:any,m:any)=>{if(m)a[m.role]=(a[m.role]||0)+1;return a},{})).length;
            const _membersY = _cy + _aCARD_TITLE_H + Math.ceil(_rc/4)*_aBROW_H + 12;
            (td.members||[]).forEach((m: any, mi: number) => {
              if (!m || !m.links || m.links.length === 0) return;
              const _my = _membersY + mi*_aMEMBER_H;
              pdf.link(_cx+12, _my, _aCARD_W-24, _aMEMBER_H-8, { url: m.links[0] });
            });
          });
        });
        pdf.save(`${currentProject}_ALL_roster.pdf`);
        showToastMsg('📄 ' + (lang === 'ko' ? '전체 Day PDF 저장됐어요!' : 'All Days PDF saved!'));
      }
    } catch (err) { console.error(err); showToastMsg('❌ ' + (lang === 'ko' ? '실패했어요' : 'Failed')); }
  };;

  const buildRosterCanvas = (teamData: any[], dayLabel: string) => {
    const ROLE_COLORS_MAP: Record<string, string> = { 'Producer': '#3E78DB', 'Topliner': '#E97582', 'Engineer': '#7C7F65', 'A&R': '#7C7F65' };
    const ROLE_SHORT: Record<string, string> = { 'Producer': 'Pro', 'Topliner': 'Top', 'Engineer': 'Eng', 'A&R': 'A&R' };
    const SCALE = 2; const PAD = 40; const HEADER_H = 60;
    const TEAM_GAP = 16; const MEMBER_H = 60; const BADGE_H = 24;
    const BADGE_ROW_H = 30; const CARD_TITLE_H = 44; const CARD_RADIUS = 16;
    const COLS = Math.max(1, Math.min(teamData.length, 4));
    const getRoleCounts = (td: any) => {
      const counts: Record<string, number> = {};
      (td.members || []).forEach((m: any) => { if (m) counts[m.role] = (counts[m.role] || 0) + 1; });
      return Object.entries(counts);
    };
    const calcCardH = (td: any) => {
      const roleCounts = getRoleCounts(td);
      const badgeRows = Math.ceil(roleCounts.length / 4);
      return CARD_TITLE_H + badgeRows * BADGE_ROW_H + 8 + (td.members || []).length * MEMBER_H + 16;
    };
    const CARD_W = Math.floor((1400 - PAD * 2 - TEAM_GAP * (COLS - 1)) / COLS);
    const maxCardH = teamData.length > 0 ? Math.max(...teamData.map(calcCardH)) : 200;
    const ROWS = Math.ceil(teamData.length / COLS);
    const totalW = PAD * 2 + COLS * CARD_W + TEAM_GAP * (COLS - 1);
    const totalH = PAD + HEADER_H + ROWS * (maxCardH + TEAM_GAP) + PAD;
    const canvas = document.createElement('canvas');
    canvas.width = totalW * SCALE; canvas.height = totalH * SCALE;
    const ctx = canvas.getContext('2d')!; ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, totalW, totalH);
    ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = '#DE3C4B';
    ctx.fillText('CAST', PAD, PAD + 30);
    const castW = ctx.measureText('CAST').width;
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#555';
    ctx.fillText('by NEN', PAD + castW + 8, PAD + 30);
    for (let i = 0; i < teamData.length; i++) {
      const td = teamData[i];
      const row = Math.floor(i / COLS); const col = i % COLS;
      const cx = PAD + col * (CARD_W + TEAM_GAP);
      const cy = PAD + HEADER_H + row * (maxCardH + TEAM_GAP);
      const ch = maxCardH;
      ctx.fillStyle = '#111'; roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.stroke();
      // accent bar 제거됨
      ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = '#fff';
      ctx.fillText(td.name.toUpperCase(), cx + 20, cy + 28);
      const roleCounts = getRoleCounts(td);
      let bx = cx + 20; let by = cy + CARD_TITLE_H;
      roleCounts.forEach(([role, count]) => {
        const rc = ROLE_COLORS_MAP[role] || '#888';
        const label = `${ROLE_SHORT[role] || role} ${count}`;
        ctx.font = 'bold 9px system-ui, sans-serif';
        const lw = ctx.measureText(label).width + 14;
        ctx.fillStyle = rc + '25'; roundRect(ctx, bx, by, lw, BADGE_H, 5); ctx.fill();
        ctx.strokeStyle = rc + '60'; ctx.lineWidth = 1; roundRect(ctx, bx, by, lw, BADGE_H, 5); ctx.stroke();
        ctx.fillStyle = rc; ctx.fillText(label, bx + 7, by + 16);
        bx += lw + 6;
        if (bx > cx + CARD_W - 60) { bx = cx + 20; by += BADGE_ROW_H; }
      });
      const membersY = cy + CARD_TITLE_H + Math.ceil(roleCounts.length / 4) * BADGE_ROW_H + 12;
      (td.members || []).forEach((m: any, mi: number) => {
        if (!m) return;
        const mx = cx + 12; const my = membersY + mi * MEMBER_H;
        const mw = CARD_W - 24; const mh = MEMBER_H - 8;
        const rc = ROLE_COLORS_MAP[m.role] || '#333';
        // 멤버 카드 배경
        ctx.fillStyle = rc + '18'; roundRect(ctx, mx, my, mw, mh, 12); ctx.fill();
        // 왼쪽 role 바
        ctx.fillStyle = rc; roundRect(ctx, mx, my + 6, 4, mh - 12, 2); ctx.fill();
        // 이름
        ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#fff';
        ctx.fillText(m.name, mx + 16, my + mh * 0.44);
        const nameW = ctx.measureText(m.name).width;
        // M/F 뱃지 (UI처럼 배경 있는 둥근 뱃지)
        const gColor = m.gender === 'female' ? '#E97582' : '#3E78DB';
        const gLabel = m.gender === 'female' ? 'F' : 'M';
        const bx2 = mx + 22 + nameW; const by2 = my + mh * 0.2;
        const bw = 20; const bh = 15;
        ctx.fillStyle = gColor + '28'; roundRect(ctx, bx2, by2, bw, bh, 4); ctx.fill();
        ctx.strokeStyle = gColor + '80'; ctx.lineWidth = 1; roundRect(ctx, bx2, by2, bw, bh, 4); ctx.stroke();
        ctx.font = 'bold 10px Arial, sans-serif'; ctx.fillStyle = gColor;
        ctx.textAlign = 'center';
        ctx.fillText(gLabel, bx2 + bw / 2, by2 + bh * 0.75);
        ctx.textAlign = 'left';
        // role 라벨
        ctx.font = '9px system-ui, sans-serif'; ctx.fillStyle = rc + 'cc';
        ctx.fillText(m.role.toUpperCase(), mx + 16, my + mh * 0.78);
      });
    }
    ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = '#1e1e1e';
    ctx.fillText('CAST by NEN', PAD, totalH - 14);
    return canvas;
  };;;

  // Canvas 유틸
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── 스타일 ──────────────────────────────────────────
  const bg = theme === 'light' ? 'bg-[#f5f5f5]' : 'bg-[#141414]';
  const cardBg = theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]';
  const textMain = theme === 'light' ? 'text-black' : 'text-white';
  const textSub = theme === 'light' ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = theme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10';
  const btnBg = theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-600 hover:bg-black/10' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10';

  const getRoleCardStyle = (r: string, excluded: boolean) => {
    if (excluded) return theme === 'light' ? "border border-black/5 bg-black/[0.02] grayscale opacity-50" : "border border-white/5 bg-white/[0.01] grayscale opacity-60 backdrop-blur-sm";
    const base = "border-l-[4px] backdrop-blur-md transition-all duration-150 ";
    switch(r) {
      case 'Producer': return base + (theme === 'light' ? "border-l-[#3E78DB] bg-gradient-to-r from-[#3E78DB]/10 to-black/[0.01]" : "border-l-[#3E78DB] bg-gradient-to-r from-[#3E78DB]/10 to-white/[0.02] hover:shadow-[0_0_20px_rgba(222,60,75,0.25)]");
      case 'Topliner': return base + (theme === 'light' ? "border-l-[#E97582] bg-gradient-to-r from-[#E97582]/10 to-black/[0.01]" : "border-l-[#E97582] bg-gradient-to-r from-[#E97582]/10 to-white/[0.02] hover:shadow-[0_0_20px_rgba(233,117,130,0.25)]");
      case 'Engineer': return base + (theme === 'light' ? "border-l-[#7C7F65] bg-gradient-to-r from-[#7C7F65]/10 to-black/[0.01]" : "border-l-[#7C7F65] bg-gradient-to-r from-[#7C7F65]/10 to-white/[0.02] hover:shadow-[0_0_20px_rgba(124,127,101,0.25)]");
      case 'A&R': return base + (theme === 'light' ? "border-l-[#7C7F65] bg-gradient-to-r from-[#7C7F65]/10 to-black/[0.01]" : "border-l-[#7C7F65] bg-gradient-to-r from-[#7C7F65]/10 to-white/[0.02] hover:shadow-[0_0_20px_rgba(62,120,219,0.25)]");
      default: return theme === 'light' ? "border border-black/10 bg-black/[0.02]" : "border border-white/10 bg-white/[0.02] backdrop-blur-md";
    }
  };

  const getAttendanceBadge = (attendance: string | null) => {
    if (attendance === 'attending') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#46B883]/20 text-[#46B883] border border-[#46B883]/30 shrink-0">{t.attending}</span>;
    if (attendance === 'absent') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#C0716B]/20 text-[#CB827C] border border-[#C0716B]/30 shrink-0">{t.absent}</span>;
    if (attendance === 'pending') return <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#B5A36A]/20 text-[#C7B27A] border border-[#B5A36A]/30 shrink-0">{t.pending}</span>;
    return votingOpen ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-600 border border-white/10 shrink-0">{t.noResponse}</span> : null;
  };

  const getLinkIcon = (url: string) => {
    if (url.includes('instagram')) return '📸';
    if (url.includes('soundcloud')) return '🎵';
    if (url.includes('spotify')) return '🎧';
    if (url.includes('youtube')) return '▶️';
    return '🔗';
  };

  const otherTeams = teams.filter(t => t !== 'Unassigned');
  const getDayLabel = (d: number) => dayNames[d] || `Day ${d}`;

  const getTeamCounts = (tName: string) => {
    const ms = getDayMembers(tName) as any[];
    const counts: Record<string, number> = {};
    for (const r of ROLES) { const c = ms.filter(m => m.role === r).length; if (c > 0) counts[r] = c; }
    return counts;
  };

  const attendingCount = members.filter(m => m.project === currentProject && m.attendance === 'attending').length;
  const absentCount = members.filter(m => m.project === currentProject && m.attendance === 'absent').length;
  const pendingCount = members.filter(m => m.project === currentProject && m.attendance === 'pending').length;
  const noResponseCount = members.filter(m => m.project === currentProject && !m.excluded && !m.attendance).length;

  const sessionsByCamp = sessions.reduce((acc: any, s: any) => { if (!acc[s.camp_name]) acc[s.camp_name] = []; acc[s.camp_name].push(s); return acc; }, {});

  if (!user) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="text-zinc-600 text-[11px] font-black tracking-widest uppercase">{t.loading}</div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; } @keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}`}} />
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%`, minHeight: `${100 / zoom}vh` }}>
        <main className={`min-h-screen ${bg} ${textMain} p-5 lg:p-8 font-pretendard relative overflow-hidden transition-colors duration-150`}>
          {theme === 'dark' && <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{background:'#DE3C4B',filter:'blur(200px)',animation:'orb-pulse 4s ease-in-out infinite'}} />}

          {/* 헤더 */}
          <div className="relative z-10 flex items-center justify-center gap-3 mb-8 flex-wrap">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-4xl font-semibold text-[#DE3C4B] uppercase tracking-tighter">CAST</h1>
              <span className={`text-[11px] font-normal tracking-[0.2em] ${textSub}`}>by NEN</span>
            </div>
            <div className={`flex gap-1 p-1 rounded-full border ${theme === 'light' ? 'border-black/[0.08] bg-black/[0.04]' : 'border-white/10 bg-white/5'}`}>
              <a href="/dashboard" className={`px-3 py-1 rounded-full text-[11px] font-normal transition-all ${theme === 'light' ? 'text-zinc-500 hover:text-black' : 'text-zinc-500 hover:text-white'}`}>LEAD</a>
              <span className="px-3 py-1 rounded-full bg-[#DE3C4B] text-white text-[11px] font-normal">CAST</span>
            </div>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            {/* 프로젝트 탭 */}
            <Droppable droppableId="projects-bar" direction="horizontal" type="PROJECT">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="relative z-10 flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                  {projects.map((p, index) => (
                    <Draggable key={p} draggableId={`proj-${p}`} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                          className={`flex items-center rounded-full border transition-all overflow-hidden ${currentProject === p ? 'border-[#DE3C4B]/50 bg-gradient-to-r from-[#DE3C4B]/30 to-[#E97582]/10 shadow-[0_0_20px_rgba(222,60,75,0.3)]' : theme === 'light' ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                          <button onClick={() => setCurrentProject(p)} className={`px-4 py-1.5 font-bold text-[11px] tracking-widest uppercase transition-all ${currentProject === p ? textMain : textSub}`}>{p}</button>
                          <button onClick={() => showConfirm(t.rosterDelete, t.rosterDeleteMsg(p), () => {
                            supabase.from('profiles').delete().eq('project', p).eq('user_id', user.id).then(async () => {
                              await supabase.from('roster_assignments').delete().eq('project', p).eq('user_id', user.id);
                              const next = projects.filter(proj => proj !== p); setProjects(next); await saveProjectOrder(user.id, next);
                              if (currentProject === p) setCurrentProject(next[0] || ''); setConfirmModal(null);
                            });
                          })} className="pr-3 text-zinc-600 hover:text-red-500 text-[14px]">×</button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <button onClick={() => showPrompt(t.newRoster, t.rosterNamePlaceholder, '', async (n) => { if (n) { const next = [...projects, n]; setProjects(next); await saveProjectOrder(user.id, next); setCurrentProject(n); } setPromptModal(null); })}
                    className={`px-3 py-1.5 rounded-full font-bold text-[12px] border border-dashed hover:text-[#DE3C4B] transition-all ${theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-500' : 'bg-white/5 border-white/10 text-zinc-400'}`}>+</button>
                </div>
              )}
            </Droppable>

            {/* 서브 헤더 */}
            <header className={`relative z-10 mb-6 border-b pb-4 ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
              {/* 1줄 */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <p className={`text-[16px] font-bold ${textSub}`}>{currentProject}</p>
                  {votingOpen && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-[10px] font-bold text-[#46B883]">{t.attending} {attendingCount}</span>
                      <span className="text-[10px] font-bold text-[#CB827C]">{t.absent} {absentCount}</span>
                      <span className="text-[10px] font-bold text-[#C7B27A]">{t.pending} {pendingCount}</span>
                      <span className={`text-[10px] font-bold ${textSub}`}>{t.noResponse} {noResponseCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={async () => {
                    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let n = '';
                    for (const c of alphabet) { if (!teams.includes(`Studio ${c}`)) { n = `Studio ${c}`; break; } }
                    if (n) { const next = [...teams, n]; setTeams(next); await saveTeamOrder(user.id, currentProject, currentDay, next); }
                  }} className={`border px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all text-[#DE3C4B] ${theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>{t.studio}</button>
                  <button onClick={() => setShowSessionBoard(!showSessionBoard)} className={`border px-3 py-1.5 rounded-lg font-normal text-[11px] transition-all ${btnBg}`}>{t.history}</button>
                  <button onClick={exportRoster} className={`border px-3 py-1.5 rounded-lg font-normal text-[11px] transition-all ${btnBg}`}>{t.export}</button>
                  <button onClick={() => router.push('/roster/artists')} className={`border px-3 py-1.5 rounded-lg font-normal text-[11px] transition-all ${btnBg}`}>{t.artists}</button>
                  <button onClick={() => { setShowArtistPanel(p => !p); if (!showArtistPanel) fetchArtists(user); }}
                    className={`border px-3 py-1.5 rounded-lg font-normal text-[11px] transition-all ${showArtistPanel ? 'border-[#DE3C4B]/50 text-[#DE3C4B] bg-[#DE3C4B]/10' : btnBg}`}>{t.addFromArtists}</button>
                  <div className={`flex p-1 rounded-lg border gap-1 shadow-lg backdrop-blur-md ${inputBg}`}>
                    <input value={name} onChange={e => setName(e.target.value)}
                      onCompositionStart={() => { isComposing.current = true; }}
                      onCompositionEnd={() => { isComposing.current = false; }}
                      onKeyDown={e => { if (e.key === 'Enter' && !isComposing.current) handleJoin(); }}
                      placeholder={t.namePlaceholder}
                      className={`bg-transparent px-3 text-[12px] outline-none w-28 ${textMain}`} />
                    <select value={role} onChange={e => setRole(e.target.value)} className={`bg-transparent text-[11px] font-bold outline-none px-1 ${textMain}`}>
                      {ROLES.map(r => <option key={r} className={theme === 'light' ? 'bg-white' : 'bg-zinc-900'}>{r}</option>)}
                    </select>
                    <select value={gender} onChange={e => setGender(e.target.value)} className={`bg-transparent text-[11px] font-bold outline-none px-1 ${textMain}`}>
                      <option value="male" className={theme === 'light' ? 'bg-white' : 'bg-zinc-900'}>M</option>
                      <option value="female" className={theme === 'light' ? 'bg-white' : 'bg-zinc-900'}>F</option>
                    </select>
                    <button type="button" onClick={handleJoin} className={`px-3 py-1 rounded-md font-bold text-[11px] ${theme === 'light' ? 'bg-black text-white' : 'bg-white text-black'}`}>{t.join}</button>
                  </div>
                  <button onClick={() => showConfirm(t.logout, lang === 'ko' ? '로그아웃 할까요?' : 'Sign out?', async () => { await supabase.auth.signOut(); router.push('/roster'); })}
                    className="text-zinc-600 hover:text-red-400 text-[11px] font-bold transition-colors px-1">{t.logout}</button>
                </div>
              </div>
              {/* 2줄 */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={() => votingOpen
                  ? showConfirm(t.voteClose, t.closeVoteConfirm, async () => { await closeVoting(); setConfirmModal(null); })
                  : setShowVotingModal(true)}
                  className={`px-4 py-1.5 rounded-xl font-normal text-[11px] transition-all border ${votingOpen ? 'bg-[#DE3C4B]/20 border-[#DE3C4B]/40 text-[#E97582] hover:bg-[#DE3C4B]/30' : btnBg}`}>
                  {votingOpen ? t.voteClose : t.voteOpen}
                </button>
                <button onClick={() => setShowNoticeBoard(!showNoticeBoard)} className={`border px-4 py-1.5 rounded-xl font-normal text-[11px] transition-all ${btnBg}`}>{t.notice}</button>
                <button onClick={copyShareLink} className={`border px-4 py-1.5 rounded-xl font-normal text-[11px] transition-all ${btnBg}`}>{t.share}</button>
                <button onClick={() => showPrompt(t.randomMatch, t.teamCount, '2', async (v) => { const n = parseInt(v); setPromptModal(null); if (n > 0) await generateRandomRoster(n)(); })}
                  className="bg-[#DE3C4B] text-white px-5 py-1.5 rounded-xl font-normal text-[11px] hover:opacity-90 transition-all uppercase tracking-tighter">{t.random}</button>
                <button onClick={toggleTheme} className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${btnBg}`}>{theme === 'dark' ? '☀️' : '🌙'}</button>
                <button onClick={toggleLang} className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] border transition-all ${btnBg}`}>{lang === 'ko' ? 'EN' : 'KO'}</button>
              </div>
            </header>

            {/* Day 탭 */}
            <div className="relative z-10 flex items-center gap-2 mb-6">
              {days.map(d => (
                <div key={d} className={`flex items-center rounded-full border overflow-hidden transition-all ${currentDay === d ? 'border-[#DE3C4B]/50 bg-gradient-to-r from-[#DE3C4B]/20 to-transparent' : theme === 'light' ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                  {editingDayName === d ? (
                    <input autoFocus value={dayNameInput} onChange={e => setDayNameInput(e.target.value)}
                      onBlur={() => saveDayName(d, dayNameInput || `Day ${d}`)}
                      onKeyDown={e => { if (e.key === 'Enter') saveDayName(d, dayNameInput || `Day ${d}`); if (e.key === 'Escape') setEditingDayName(null); }}
                      className="bg-transparent px-3 py-1.5 text-[11px] font-bold outline-none text-[#DE3C4B] w-24" />
                  ) : (
                    <button onClick={() => setCurrentDay(d)} onDoubleClick={() => { setEditingDayName(d); setDayNameInput(dayNames[d] || `Day ${d}`); }}
                      className={`px-4 py-1.5 font-bold text-[11px] transition-all ${currentDay === d ? 'text-[#DE3C4B]' : textSub}`}>{getDayLabel(d)}</button>
                  )}
                  {days.length > 1 && <button onClick={() => showConfirm(t.dayDelete(getDayLabel(d)), t.dayDeleteMsg(getDayLabel(d)), () => { removeDay(d); setConfirmModal(null); })} className="pr-3 text-zinc-700 hover:text-red-500 text-[12px]">×</button>}
                </div>
              ))}
              <button onClick={addDay} className={`px-3 py-1.5 rounded-full font-bold text-[12px] border border-dashed hover:text-[#DE3C4B] transition-all ${theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-500' : 'bg-white/5 border-white/10 text-zinc-400'}`}>{t.addDay}</button>
            </div>

            {/* 공지사항 */}
            {showNoticeBoard && (
              <div className={`relative z-10 mb-8 rounded-2xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.03] border-white/10'}`}>
                <div className="flex items-center justify-between mb-5">
                  <p className={`font-black text-[16px] ${textMain}`}>📋 {t.noticeTitle}</p>
                  <button onClick={() => { setNoticeTitle(''); setNoticeContent(''); setNoticeIsGlobal(false); setEditingNoticeId(null); setShowNoticeModal(true); }} className={`px-4 py-2 rounded-xl border font-bold text-[11px] transition-all ${btnBg}`}>{t.noticeAdd}</button>
                </div>
                {notices.length === 0 ? <p className={`text-[12px] ${textSub}`}>{t.noNotice}</p> : (
                  <div className="flex flex-col gap-3">
                    {notices.map(n => (
                      <div key={n.id} className={`flex items-start justify-between p-4 rounded-2xl border ${theme === 'light' ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'}`}>
                        <div className="flex-1">
                          <p className={`font-bold text-[14px] mb-1 ${textMain}`}>{n.title}</p>
                          {n.content && <p className={`text-[12px] leading-relaxed whitespace-pre-line ${textSub}`}>{n.content}</p>}
                          <p className="text-zinc-600 text-[10px] mt-2">{new Date(n.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}</p>
                        </div>
                        <div className="flex gap-2 ml-4 shrink-0">
                          <button onClick={() => { setNoticeTitle(n.title); setNoticeContent(n.content || ''); setNoticeIsGlobal(n.is_global || false); setEditingNoticeId(n.id); setShowNoticeModal(true); }} className={`text-[11px] font-bold ${textSub}`}>{t.edit}</button>
                          <button onClick={() => showConfirm(t.noticeDelete, t.noticeDeleteMsg(n.title), () => { supabase.from('notices').delete().eq('id', n.id).then(() => { fetchNotices(user); setConfirmModal(null); }); })} className="text-zinc-600 hover:text-red-500 text-[11px] font-bold">{t.delete}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 세션 히스토리 */}
            {showSessionBoard && (
              <div className={`relative z-10 mb-8 rounded-2xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.03] border-white/10'}`}>
                <div className="flex items-center justify-between mb-5">
                  <p className={`font-black text-[16px] ${textMain}`}>🗂 {t.history}</p>
                  <button onClick={() => setShowSessionModal(true)} className={`px-4 py-2 rounded-xl border font-bold text-[11px] transition-all ${btnBg}`}>{t.saveSession}</button>
                </div>
                {Object.keys(sessionsByCamp).length === 0 ? <p className={`text-[12px] ${textSub}`}>{t.noSession}</p> : (
                  <div className="flex flex-col gap-4">
                    {Object.entries(sessionsByCamp).map(([campName, campSessions]: any) => (
                      <div key={campName}>
                        <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${textSub}`}>{campName}</p>
                        <div className="flex flex-col gap-2">
                          {campSessions.sort((a: any, b: any) => a.day_number - b.day_number).map((s: any) => (
                            <div key={s.id} className={`rounded-2xl border overflow-hidden ${theme === 'light' ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 bg-white/[0.02]'}`}>
                              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}>
                                <div className="flex items-center gap-3"><span className="text-[#DE3C4B] font-black text-[13px]">Day {s.day_number}</span>{s.memo && <span className={`text-[12px] truncate max-w-[200px] ${textSub}`}>{s.memo}</span>}</div>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-600 text-[10px]">{new Date(s.created_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}</span>
                                  <button onClick={(e) => { e.stopPropagation(); showConfirm(t.sessionDelete, t.sessionDeleteMsg(s.day_number), () => { supabase.from('sessions').delete().eq('id', s.id).then(() => { fetchSessions(user); setConfirmModal(null); }); }); }} className="text-zinc-700 hover:text-red-500 text-[11px]">×</button>
                                  <span className="text-zinc-600 text-[10px]">{expandedSession === s.id ? '▲' : '▼'}</span>
                                </div>
                              </div>
                              {expandedSession === s.id && s.roster && (
                                <div className={`px-4 pb-4 border-t pt-4 ${theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                                  <button onClick={() => {
                                    showConfirm(lang === 'ko' ? '로스터 불러오기' : 'Load Roster', lang === 'ko' ? '현재 로스터가 교체됩니다. 계속할까요?' : 'This will replace your current roster. Continue?', async () => {
                                      await supabase.from('roster_assignments').delete().eq('user_id', user.id).eq('project', currentProject).eq('day_number', currentDay);
                                      const rows = s.roster.flatMap((teamData: any, ti: number) =>
                                        teamData.members.map((m: any, mi: number) => {
                                          const profile = members.find((p: any) => p.name === m.name && p.project === currentProject);
                                          if (!profile) return null;
                                          return { profile_id: String(profile.id), user_id: user.id, project: currentProject, day_number: currentDay, team: teamData.team, order_index: ti * 100 + mi };
                                        }).filter(Boolean)
                                      );
                                      if (rows.length > 0) await supabase.from('roster_assignments').insert(rows);
                                      const newTeams = ['Unassigned', ...s.roster.map((td: any) => td.team)];
                                      setTeams(newTeams);
                                      await saveTeamOrder(user.id, currentProject, currentDay, newTeams);
                                      await fetchAssignments(user);
                                      setConfirmModal(null);
                                      showToastMsg(lang === 'ko' ? '✅ 로스터를 불러왔어요!' : '✅ Roster loaded!');
                                    });
                                  }} className="mb-3 px-3 py-1.5 rounded-lg bg-[#DE3C4B]/20 text-[#DE3C4B] text-[11px] font-bold border border-[#DE3C4B]/30 hover:bg-[#DE3C4B]/30 transition-all">
                                    {lang === 'ko' ? '⬆ 현재 로스터로 불러오기' : '⬆ Load to Current Roster'}
                                  </button>
                                  <div className="flex flex-wrap gap-4">
                                    {s.roster.map((t: any) => (<div key={t.team} className="flex-1 min-w-[150px]"><p className={`text-[10px] font-black uppercase tracking-widest mb-2 border-l-2 border-[#DE3C4B] pl-2 ${textSub}`}>{t.team}</p>{t.members.map((m: any, i: number) => (<div key={i} className="flex items-center gap-1.5 mb-1"><span className={`text-[12px] font-bold ${textMain}`}>{m.name}</span><span className="text-zinc-600 text-[9px] uppercase">{m.role.slice(0, 3)}</span></div>))}</div>))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 아티스트 패널 */}
            {showArtistPanel && (
              <div className={`relative z-10 mb-6 rounded-2xl border backdrop-blur-md p-4 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : 'bg-white/[0.03] border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`font-black text-[13px] ${textMain}`}>🎤 Artists</p>
                  <div className="flex items-center gap-2">
                    <input value={artistSearch} onChange={e => setArtistSearch(e.target.value)}
                      placeholder={lang === 'ko' ? '검색...' : 'Search...'}
                      className={`px-3 py-1.5 rounded-lg text-[11px] outline-none border w-32 ${inputBg} ${textMain} placeholder:text-zinc-500`} />
                    <button onClick={() => setShowArtistPanel(false)} className="text-zinc-600 hover:text-red-400 text-[16px]">×</button>
                  </div>
                </div>
                {artistList.length === 0 ? (
                  <p className={`text-[12px] ${textSub}`}>{lang === 'ko' ? '아티스트가 없어요.' : 'No artists.'}</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {ROLES.map(r => {
                      const group = artistList.filter(a =>
                        a.role === r && (a.name.toLowerCase().includes(artistSearch.toLowerCase()))
                      );
                      if (group.length === 0) return null;
                      return (
                        <div key={r}>
                          <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: ROLE_COLORS[r] + '99' }}>{r}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.map(artist => {
                              const inRoster = members.some(m => m.project === currentProject && m.name === artist.name);
                              return (
                                <button key={artist.id} onClick={() => !inRoster && addArtistToRoster(artist)} disabled={inRoster}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${inRoster ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-[1.02] ' + (theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10')}`}>
                                  {artist.photo_url && <img src={artist.photo_url} className="w-6 h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />}
                                  <span className={`text-[12px] font-bold ${textMain}`}>{artist.name}</span>
                                  <span className={`text-[9px] ${textSub}`}>{artist.gender === 'female' ? 'F' : 'M'}</span>
                                  {inRoster ? <span className="text-[10px] text-zinc-600 font-black">✓</span> : <span className="text-[10px] text-[#DE3C4B] font-black">+</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 로스터 풀 */}
            <div className="relative z-10 mb-10">
              <h2 className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${textSub}`}>{t.rosterPool}</h2>
              <div className="flex flex-col gap-3">
                {[['Producer'], ['Topliner'], ['Engineer', 'A&R']].map(roles => {
                  const r = roles[0];
                  const poolMembers = members.filter(m => m.project === currentProject && roles.includes(m.role) && !getAssignment(m.id)).sort((a, b) => a.name.localeCompare(b.name));
                  return (
                    <div key={r} className="flex items-center gap-3">
                      <span className="text-[9px] font-black uppercase tracking-widest shrink-0 w-16" style={{ color: ROLE_COLORS[r] + '99' }}>{roles.length > 1 ? 'Eng/A&R' : r.slice(0, 3)}</span>
                      <Droppable droppableId={`pool_${r}`} direction="horizontal" type="MEMBER">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="flex gap-2 overflow-x-auto pb-1 no-scrollbar min-h-[52px] flex-1 items-center">
                            {poolMembers.map((m, i) => (
                              <PortalDraggable key={m.id} draggableId={String(m.id)} index={i}>
                                <div
                                  onContextMenu={(e) => { e.preventDefault(); setRoleDropdown({ id: m.id, x: e.clientX, y: e.clientY, excluded: m.excluded }); }}
                                  onDoubleClick={() => setLinkModal(m)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl w-[160px] h-[44px] shadow-xl cursor-pointer shrink-0 ${getRoleCardStyle(m.role, m.excluded)}`}
                                >
                                  <div className="flex items-center gap-1.5 overflow-hidden flex-1 pl-1">
                                    {editingId === String(m.id) ? (
                                      <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => updateMemberName(m.id)} onKeyDown={e => e.key === 'Enter' && updateMemberName(m.id)} className={`bg-transparent border-b outline-none text-[13px] font-bold w-full ${theme === 'light' ? 'border-black text-black' : 'border-white text-white'}`} />
                                    ) : (
                                      <span onClick={() => { setEditingId(String(m.id)); setEditValue(m.name); }} className={`text-[13px] font-semibold flex items-center gap-1 cursor-pointer truncate ${m.excluded ? 'line-through text-zinc-400 italic' : textMain}`}>
                                        {m.name}
                                        <span className={`px-1 py-[1px] rounded text-[8px] font-black border shrink-0 ${m.gender === 'female' ? 'bg-[#E97582]/10 text-[#E97582] border-[#E97582]/30' : 'bg-[#3E78DB]/10 text-[#3E78DB] border-[#3E78DB]/30'}`}>{m.gender === 'female' ? 'F' : 'M'}</span>
                                        {getAttendanceBadge(m.attendance)}
                                        {m.links?.length > 0 && <span className="text-[9px] text-zinc-500">🔗</span>}
                                      </span>
                                    )}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); showConfirm(t.memberDelete, t.memberDeleteMsg(m.name), () => { deleteMember(m.id); setConfirmModal(null); }); }} className="text-zinc-600 hover:text-red-500 text-lg px-1 shrink-0">×</button>
                                </div>
                              </PortalDraggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 스튜디오 보드 */}
            <Droppable droppableId="teams-board" direction="horizontal" type="TEAM">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} id="roster-board" className="relative z-10 flex flex-wrap gap-6 items-start pb-20">
                  {otherTeams.map((tName, idx) => {
                    const counts = getTeamCounts(tName);
                    const countEntries = ROLES.filter(r => counts[r]);
                    const dayMembersForTeam = getDayMembers(tName) as any[];
                    return (
                      <Draggable key={tName} draggableId={`team-${tName}`} index={idx}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]">
                            <div className={`backdrop-blur-2xl border rounded-[2rem] p-6 min-h-[400px] shadow-2xl flex flex-col ${cardBg}`}>
                              <div {...provided.dragHandleProps} className="flex justify-between items-start mb-4 px-1 border-l-4 border-[#DE3C4B] pl-4 cursor-grab">
                                <div className="flex flex-col gap-1.5 flex-1">
                                  {editingTeam === tName ? (
                                    <input autoFocus value={teamEditValue} onChange={e => setTeamEditValue(e.target.value)}
                                      onBlur={() => {
                                        if (teamEditValue && teamEditValue !== tName) {
                                          // team 이름 변경 — assignments 업데이트
                                          supabase.from('roster_assignments').update({ team: teamEditValue }).eq('team', tName).eq('project', currentProject).eq('user_id', user.id).then(() => {
                                            const next = teams.map(t => t === tName ? teamEditValue : t);
                                            setTeams(next); saveTeamOrder(user.id, currentProject, currentDay, next);
                                            fetchAssignments(user); setEditingTeam(null);
                                          });
                                        } else setEditingTeam(null);
                                      }}
                                      onKeyDown={e => e.key === 'Enter' && setEditingTeam(null)}
                                      className={`bg-transparent border-b outline-none text-[14px] font-black uppercase w-full ${theme === 'light' ? 'border-black text-black' : 'border-white text-white'}`} />
                                  ) : (
                                    <h2 onClick={() => { setEditingTeam(tName); setTeamEditValue(tName); }} className={`text-[14px] font-black uppercase cursor-pointer hover:opacity-80 ${textMain}`}>{tName}</h2>
                                  )}
                                  {countEntries.length > 0 && (
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                      {countEntries.map(r => (
                                        <span key={r} className="text-[8px] font-black px-1.5 py-0.5 rounded-full border text-center"
                                          style={{ color: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] + '40', backgroundColor: ROLE_COLORS[r] + '15' }}>
                                          {r.slice(0, 3)} {counts[r]}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <button onClick={() => showConfirm(t.studioDelete, t.studioDeleteMsg(tName), async () => {
                                  // 해당 팀 assignments 삭제
                                  await supabase.from('roster_assignments').delete().eq('team', tName).eq('project', currentProject).eq('day_number', currentDay).eq('user_id', user.id);
                                  const next = teams.filter(t => t !== tName); setTeams(next);
                                  await saveTeamOrder(user.id, currentProject, currentDay, next);
                                  fetchAssignments(user); setConfirmModal(null);
                                })} className="text-zinc-600 hover:text-red-500 text-xl shrink-0 ml-2">×</button>
                              </div>
                              <Droppable droppableId={tName} type="MEMBER">
                                {(provided) => (
                                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 flex-1 min-h-[100px]">
                                    {dayMembersForTeam.map((m, i) => (
                                      <PortalDraggable key={`${m.id}-${currentDay}`} draggableId={String(m.id)} index={i}>
                                        <div
                                          onContextMenu={(e) => { e.preventDefault(); setRoleDropdown({ id: m.id, x: e.clientX, y: e.clientY, excluded: m.excluded }); }}
                                          onDoubleClick={() => setLinkModal(m)}
                                          className={`flex justify-between items-center p-4 rounded-2xl shadow-xl transition-all cursor-pointer ${getRoleCardStyle(m.role, m.excluded)}`}
                                        >
                                          <div className="flex items-center gap-2 overflow-hidden flex-1 pl-1">
                                            {editingId === String(m.id) ? (
                                              <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => updateMemberName(m.id)} onKeyDown={e => e.key === 'Enter' && updateMemberName(m.id)} className={`bg-transparent border-b outline-none text-[14px] font-bold w-full ${theme === 'light' ? 'border-black text-black' : 'border-white text-white'}`} />
                                            ) : (
                                              <div className="flex flex-col overflow-hidden">
                                                <span onClick={(e) => { e.stopPropagation(); setEditingId(String(m.id)); setEditValue(m.name); }} className={`text-[15px] font-bold flex items-center gap-1.5 cursor-pointer truncate ${m.excluded ? 'line-through text-zinc-400 italic' : textMain}`}>
                                                  {m.name}
                                                  <span className={`px-1.5 py-[1px] rounded text-[8px] font-black border shrink-0 ${m.gender === 'female' ? 'bg-[#E97582]/10 text-[#E97582] border-[#E97582]/30' : 'bg-[#3E78DB]/10 text-[#3E78DB] border-[#3E78DB]/30'}`}>{m.gender === 'female' ? 'F' : 'M'}</span>
                                                  {getAttendanceBadge(m.attendance)}
                                                  {m.links?.length > 0 && <span className="text-[9px] text-zinc-500">🔗</span>}
                                                </span>
                                                <button onClick={(e) => { e.stopPropagation(); setRoleDropdown({ id: m.id, x: e.clientX, y: e.clientY, excluded: m.excluded }); }} className="text-[8px] font-bold uppercase tracking-widest mt-1 text-left text-zinc-500 hover:text-zinc-300 transition-colors">
                                                  {m.role}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          <button onClick={(e) => { e.stopPropagation(); unassignMember(m.id); }} className="text-zinc-600 hover:text-red-500 text-lg px-1 shrink-0">×</button>
                                        </div>
                                      </PortalDraggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="relative z-10 mt-8 pb-8 text-center">
            <p className={`text-[11px] font-medium ${textSub}`}>{t.contact}</p>
          </div>
        </main>
      </div>

      {/* 첫 로스터 모달 */}
      {showFirstRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-pretendard">
          <div className={`w-full max-w-sm mx-4 border rounded-2xl p-8 shadow-2xl ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#111] border-white/10'}`}>
            <div className="text-center mb-6">
              <h1 className="text-4xl font-semibold text-[#DE3C4B] uppercase tracking-tighter mb-2">CAST</h1>
              <p className={`text-[13px] ${textSub}`}>{t.firstRosterTitle}</p>
            </div>
            <input autoFocus value={firstRosterName} onChange={e => setFirstRosterName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFirstRoster()}
              placeholder={t.firstRosterPlaceholder}
              className={`w-full border rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#DE3C4B]/50 transition-all mb-4 ${inputBg} ${textMain} placeholder:text-zinc-500`} />
            <button onClick={createFirstRoster} disabled={!firstRosterName.trim()}
              className="w-full py-3 rounded-xl bg-[#DE3C4B] text-white font-semibold text-[13px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40">{t.start}</button>
          </div>
        </div>
      )}

      {/* 링크 모달 */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-pretendard">
          <div className={`w-full max-w-sm mx-4 border rounded-2xl p-6 shadow-2xl ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#111] border-white/10'}`}>
            <h2 className={`font-black text-[16px] mb-1 ${textMain}`}>{linkModal.name}</h2>
            <p className={`text-[11px] mb-4 ${textSub}`}>{t.linkAdd}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_LINKS.map(({ label, prefix }) => (<button key={prefix} onClick={() => setNewLink(prefix)} className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${btnBg}`}>{label}</button>))}
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newLink} onChange={e => setNewLink(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newLink.trim()) { const l = [...(linkModal.links || []), newLink.trim()]; setLinkModal({ ...linkModal, links: l }); saveMemberLinks(linkModal.id, l); setNewLink(''); }}}
                placeholder={t.linkPlaceholder} className={`flex-1 border rounded-xl px-4 py-2.5 text-[12px] outline-none transition-all ${inputBg} ${textMain} placeholder:text-zinc-500`} />
              <button onClick={() => { if (!newLink.trim()) return; const l = [...(linkModal.links || []), newLink.trim()]; setLinkModal({ ...linkModal, links: l }); saveMemberLinks(linkModal.id, l); setNewLink(''); }}
                className={`px-4 py-2.5 rounded-xl border font-black text-[12px] transition-all ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.add}</button>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {(linkModal.links || []).map((link: string, i: number) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                  <span className="text-[12px]">{getLinkIcon(link)}</span>
                  <a href={link} target="_blank" rel="noopener noreferrer" className={`text-[12px] truncate flex-1 ${textSub}`}>{link}</a>
                  <button onClick={() => { const l = (linkModal.links || []).filter((_: string, idx: number) => idx !== i); setLinkModal({ ...linkModal, links: l }); saveMemberLinks(linkModal.id, l); }} className="text-zinc-600 hover:text-red-500 shrink-0">×</button>
                </div>
              ))}
              {(linkModal.links || []).length === 0 && <p className="text-zinc-700 text-[12px]">{t.noLink}</p>}
            </div>
            <button onClick={() => { setLinkModal(null); setNewLink(''); }} className={`w-full py-3 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.close}</button>
          </div>
        </div>
      )}

      {/* 세션 저장 모달 */}
      {showSessionModal && (
        <Modal title={t.sessionSave} theme={theme}>
          <div className="flex flex-col gap-3 mb-5">
            <div><label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.campName}</label><input value={sessionCampName} onChange={e => setSessionCampName(e.target.value)} placeholder={t.campPlaceholder} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
            <div><label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.day}</label><input type="number" value={sessionDayNumber} onChange={e => setSessionDayNumber(e.target.value)} min="1" className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputBg} ${textMain}`} /></div>
            <div><label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.memo}</label><input value={sessionMemo} onChange={e => setSessionMemo(e.target.value)} placeholder={t.memoPlaceholder} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowSessionModal(false)} className={`flex-1 py-3 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.cancel}</button>
            <button onClick={saveSession} className={`flex-1 py-3 rounded-xl border font-black text-[12px] transition-all ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.save}</button>
          </div>
        </Modal>
      )}

      {/* 공지 모달 */}
      {showNoticeModal && (
        <Modal title={editingNoticeId ? t.noticeEdit : t.noticeAddTitle} theme={theme}>
          <div className="flex flex-col gap-3 mb-5">
            <div><label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.noticeTitleLabel}</label><input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder={t.noticeTitlePlaceholder} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
            <div><label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.noticeContentLabel}</label><textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} placeholder={t.noticeContentPlaceholder} rows={4} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all resize-none ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNoticeModal(false)} className={`flex-1 py-3 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.cancel}</button>
            <button onClick={saveNotice} className={`flex-1 py-3 rounded-xl border font-black text-[12px] transition-all ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.save}</button>
          </div>
        </Modal>
      )}

      {/* 투표 모달 */}
      {showVotingModal && (
        <Modal title={t.voteOpenTitle} theme={theme}>
          <div className="flex flex-col gap-3 mb-5">
            <div><label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.voteTitleLabel}</label><input value={votingTitle} onChange={e => setVotingTitle(e.target.value)} placeholder={t.voteTitlePlaceholder} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
            <div><label className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.memo}</label><textarea value={votingMemo} onChange={e => setVotingMemo(e.target.value)} placeholder={t.voteMemoPlaceholder} rows={3} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all resize-none ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowVotingModal(false)} className={`flex-1 py-3 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.cancel}</button>
            <button onClick={openVoting} className="flex-1 py-3 rounded-xl bg-[#DE3C4B]/20 border border-[#DE3C4B]/40 text-[#E97582] font-black text-[12px] hover:bg-[#DE3C4B]/30 transition-all">{t.voteStart}</button>
          </div>
        </Modal>
      )}

      {/* Confirm 모달 */}
      {confirmModal && (
        <Modal title={confirmModal.title} message={confirmModal.message} theme={theme}>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setConfirmModal(null)} className={`flex-1 py-3 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.cancel}</button>
            <button onClick={confirmModal.onOk} className={`flex-1 py-3 rounded-xl border font-black text-[12px] transition-all ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.confirm}</button>
          </div>
        </Modal>
      )}

      {/* Prompt 모달 */}
      {promptModal && (
        <Modal title={promptModal.title} theme={theme}>
          <input autoFocus value={promptValue} onChange={e => setPromptValue(e.target.value)} placeholder={promptModal.placeholder} onKeyDown={e => e.key === 'Enter' && promptModal.onOk(promptValue)} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all mb-4 ${inputBg} ${textMain} placeholder:text-zinc-500`} />
          <div className="flex gap-3">
            <button onClick={() => setPromptModal(null)} className={`flex-1 py-3 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.cancel}</button>
            <button onClick={() => promptModal.onOk(promptValue)} className={`flex-1 py-3 rounded-xl border font-black text-[12px] transition-all ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.confirm}</button>
          </div>
        </Modal>
      )}

      {/* Role 드롭다운 */}
      {roleDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setRoleDropdown(null)} />
          <div className={`fixed z-50 border rounded-xl shadow-2xl overflow-hidden font-pretendard ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1a1a1a] border-white/10'}`} style={{ top: roleDropdown.y, left: roleDropdown.x }}>
            {ROLES.map(r => (
              <button key={r} onClick={() => updateMemberRole(roleDropdown.id, r)} className={`flex items-center gap-2 w-full px-4 py-2.5 text-[12px] font-bold transition-all text-left ${theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/10'}`} style={{ color: ROLE_COLORS[r] }}>{r}</button>
            ))}
            <div className={`border-t ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`} />
            <button onClick={() => toggleExcludeMember(roleDropdown.id, roleDropdown.excluded)} className={`flex items-center gap-2 w-full px-4 py-2.5 text-[12px] font-bold transition-all text-left ${theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/10'} ${roleDropdown.excluded ? 'text-[#E97582]' : 'text-zinc-500'}`}>
              {roleDropdown.excluded ? t.include : t.exclude}
            </button>
          </div>
        </>
      )}

      {/* 내보내기 모달 — 2단계 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-pretendard" onClick={() => setShowExportModal(false)}>
          <div className={`w-full max-w-xs border rounded-2xl p-6 shadow-2xl ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1a1a1a] border-white/10'}`} onClick={e => e.stopPropagation()}>
            {exportStep === 'type' ? (
              <>
                <h2 className={`font-black text-[15px] mb-4 ${textMain}`}>📤 {lang === 'ko' ? '내보내기' : 'Export'}</h2>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { exportAsText(); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-[13px] transition-all hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-[18px]">📋</span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '텍스트 복사' : 'Copy Text'}</p><p className={`text-[11px] font-normal ${textSub}`}>{lang === 'ko' ? '현재 Day 클립보드 복사' : 'Copy current day'}</p></div>
                  </button>
                  <button onClick={() => { setExportType('jpeg'); setExportStep('scope'); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-[13px] transition-all hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-[18px]">📸</span>
                    <div className="text-left"><p className="font-black">JPEG</p><p className={`text-[11px] font-normal ${textSub}`}>{lang === 'ko' ? '이미지로 저장' : 'Save as image'}</p></div>
                  </button>
                  <button onClick={() => { setExportType('pdf'); setExportStep('scope'); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-[13px] transition-all hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-[18px]">📄</span>
                    <div className="text-left"><p className="font-black">PDF</p><p className={`text-[11px] font-normal ${textSub}`}>{lang === 'ko' ? '링크 포함' : 'With links'}</p></div>
                  </button>
                </div>
                <button onClick={() => setShowExportModal(false)} className={`w-full mt-3 py-2.5 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.cancel}</button>
              </>
            ) : (
              <>
                <button onClick={() => setExportStep('type')} className={`text-[11px] font-bold mb-4 flex items-center gap-1 ${textSub}`}>← {lang === 'ko' ? '뒤로' : 'Back'}</button>
                <h2 className={`font-black text-[15px] mb-4 ${textMain}`}>{exportType === 'pdf' ? '📄' : '📸'} {lang === 'ko' ? '범위 선택' : 'Select Scope'}</h2>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { exportType === 'pdf' ? exportAsImage('pdf') : exportAsImage('jpeg'); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-[13px] transition-all hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-[18px]">📅</span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '현재 Day' : 'Current Day'}</p><p className={`text-[11px] font-normal ${textSub}`}>{dayNames[currentDay] || `Day ${currentDay}`}</p></div>
                  </button>
                  <button onClick={() => { exportAllDays(exportType === 'pdf' ? 'pdf' : 'jpeg'); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-[13px] transition-all hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-[18px]">🗓</span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '전체 Day' : 'All Days'}</p><p className={`text-[11px] font-normal ${textSub}`}>{lang === 'ko' ? `${days.length}개 Day 한 이미지로` : `${days.length} days in one image`}</p></div>
                  </button>
                </div>
                <button onClick={() => setShowExportModal(false)} className={`w-full mt-3 py-2.5 rounded-xl border font-bold text-[12px] transition-all ${btnBg}`}>{t.cancel}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 토스트 */}
      {showToast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 backdrop-blur-md border text-[12px] font-bold px-5 py-3 rounded-2xl shadow-2xl font-pretendard ${theme === 'light' ? 'bg-black/80 border-black/20 text-white' : 'bg-white/10 border-white/20 text-white'}`}>{toastMsg}</div>
      )}

      {/* 줌 컨트롤 */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 select-none">
        <button onClick={() => setZoom(1)} className={`w-9 h-9 rounded-xl border backdrop-blur-md transition-all text-[9px] font-black tracking-widest flex items-center justify-center shadow-xl hover:text-[#DE3C4B] hover:border-[#DE3C4B]/30 ${btnBg}`}>1:1</button>
        <div onMouseDown={onZoomMouseDown} className={`w-9 h-14 rounded-xl border backdrop-blur-md shadow-xl cursor-ns-resize flex flex-col items-center justify-center gap-[5px] transition-all group hover:border-[#DE3C4B]/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10' : 'bg-white/[0.04] border-white/10'}`}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-zinc-500 group-hover:text-[#DE3C4B] transition-colors"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="flex flex-col gap-[3px]">{[0,1,2].map(i => <div key={i} className="w-3.5 h-[1.5px] rounded-full bg-zinc-500 group-hover:bg-[#DE3C4B]/50 transition-colors" />)}</div>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-zinc-500 group-hover:text-[#DE3C4B] transition-colors"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <span className="text-[9px] font-black text-zinc-500 tracking-widest">{Math.round(zoom * 100)}%</span>
      </div>
    </>
  );
}