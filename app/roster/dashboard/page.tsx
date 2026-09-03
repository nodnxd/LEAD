'use client';
import { fmtDate } from '@/lib/format';
import Link from 'next/link';
import { pressable } from '@/lib/a11y';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getLang, setLangValue, LANG_EVENT } from '@/lib/lang';
import { onDbError } from '@/lib/dbErrors';
import { buildDaysIcs, downloadIcs } from '@/lib/ics';
import ProductHeader from '@/components/ProductHeader';
import { QUICK_LINKS, getLinkIcon } from '@/lib/links';
import Toast from '@/components/Toast';
import { genderColor, ROLE_BANNER, OAT, GENDER_NOTCH, AVAIL_COLORS } from '@/lib/brand';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BOTH_PRODUCT_EMAILS = ['hseu2000@gmail.com', 'everplayground@gmail.com'];

const ROLES = ['Producer', 'Topliner', 'Engineer', 'A&R'];
const DEVELOPER_EMAILS = ['nodnxd@gmail.com', 'hseu2000@gmail.com'];
const ROLE_COLORS: Record<string, string> = {
  'Producer': '#E3B24A', 'Topliner': '#5FA39A', 'Engineer': '#C98BA0', 'A&R': '#C98BA0'
};

const T = {
  ko: {
    notice: '공지', history: '히스토리', voteClose: '투표 닫기', voteOpen: '투표 열기',
    stats: '통계', statsTitle: '로스터 통계', statsMembers: '멤버', statsRoles: '역할 분포', statsGender: '성비', statsAttend: '이번 세션 참석', statsAvail: '가능일 참여', statsAvailNone: '열린 가능일 투표 없음', statsMale: '남', statsFemale: '여', statsMost: '가장 잘 나오는 멤버',
    share: '공유', export: '내보내기', random: '랜덤', studio: '+ 스튜디오',
    logout: '로그아웃', artists: '아티스트', addFromArtists: '풀에서 추가',
    namePlaceholder: '이름 (쉼표 구분)', join: 'JOIN',
    rosterPool: 'ROSTER POOL', rosterDelete: '로스터 삭제', rosterDeleteMsg: (p: string) => `"${p}" 로스터를 삭제할까요?`,
    newRoster: 'New Roster', rosterNamePlaceholder: '로스터 이름',
    studioDelete: '스튜디오 삭제', studioDeleteMsg: (t: string) => `"${t}"을 삭제할까요?`,
    studioHint: '빈 곳 우클릭으로도 스튜디오를 추가할 수 있어요', studioAdded: (n: string) => `${n} 추가됨`,
    dayRenameHint: '우클릭(또는 더블클릭)으로 이름 바꾸기',
    rosterRenameHint: '우클릭(또는 더블클릭)으로 이름 바꾸기',
    rosterRename: '로스터 이름 바꾸기', projMemoPlaceholder: '메모',
    studioAddMember: '풀에서 넣기', poolEmpty: '풀이 비었어요',
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
    attending: '참석', absent: '불참', noResponse: '미응답',
    exclude: '✕ 제외하기', include: '✓ 포함시키기',
    sessionDeleteMsg: (d: number) => `Day ${d} 삭제할까요?`, sessionDelete: '세션 삭제',
    contact: 'Contact : everplayground@gmail.com', loading: 'Loading…',
    alreadyInRoster: (n: string) => `${n} 이미 있어요!`,
    addedToRoster: (n: string, p: string) => `${n} → ${p}`,
    linkCopied: '링크 복사됨', closeVoteConfirm: '투표를 닫을까요?',
    availOpen: '가능일', availOpenTitle: '가능일 투표 열기', availMonth: '대상 월',
    availMonthChange: '대상 월 바꾸기',
    availMonthMsg: (m: string, n: number) => `${m}로 바꿀까요? 새 달에 없는 ${n}일치 응답은 지워져요.`,
    availTitleLabel: '제목 (선택)', availTitlePlaceholder: '예: 8월 세션 가능일', availStart: '투표 열기',
    availClose: '가능일 닫기', availCloseConfirm: '가능일 투표를 닫을까요?',
    availStats: '날짜별 가능 인원', availBest: '가장 많이 되는 날', availConfirm: '이 날로 확정',
    availConfirmed: '확정됨', availUnset: '확정 해제', availCodes: '멤버 접근 코드',
    availCopyLink: '개인 링크', availCopyAll: '공유 링크 복사', availNoResp: '아직 응답이 없어요',
    codeCopied: '복사됨', availPeople: (n: number) => `${n}명`,
    availSubmitStatus: '제출 현황', availSubmitted: '제출', availWaiting: '미제출',
    availPossible: '가능', availNo: '불가능',
    availConfirmAdd: '확정에 추가', availConfirmRemove: '확정에서 빼기',
    availBlockMode: '차단일 설정', availBlockDone: '설정 완료', availBlocked: '차단됨',
    availBlockHint: '막을 날짜를 눌러 차단 (멤버는 못 고름)',
    availFinalTitle: '확정일', availIcs: '캘린더 저장 (.ics)', availAnnounce: '확정 공지 복사', availMakeSessions: '이 날들로 세션 만들기', availSessionsMade: (n: number) => `세션 ${n}개 만들었어요`,
    availRemindAll: '미제출 문구 복사',
    adSlot: '스폰서 슬롯', adOn: '공유 페이지에 노출', adCaption: '한 줄 제목',
    adBody: '설명 (선택)', adLink: '링크 (선택)', adImage: '이미지 URL (선택)', adSaved: '스폰서 슬롯 저장됨',
    availAnnounceMsg: (title: string, days: string, link: string) => `[${title}] 확정 안내\n${days}\n${link}`,
    availRemindMsg: (who: string, title: string, link: string) => `${who}\n"${title}" 가능일 아직 제출 전이에요. 링크에서 이름 누르고 제출해주세요!\n${link}`,
    inviteAccount: '계정 초대 (이메일)', inviteTitle: '이 멤버를 이메일로 초대', inviteSent: '초대 등록! 그 이메일로 로그인하면 자동 연결돼요',
    availMemberPick: '클릭하면 이 멤버가 고른 날이 달력에 표시돼요',
    availKick: '빼기', availKicked: '제외됨 (불참 처리)', availRestoreM: '복구',
    more: '더보기', availLive: '진행 중',
    daySetDate: '이 Day의 날짜 지정',
    stepPoll: '가능일', stepConfirm: '확정', stepAssign: '배치', stepShare: '공유',
    randomDone: (n: number, t: number) => `${t}팀에 ${n}명 배치했어요`,
    randomTitle: '랜덤 배치', randomAvoid: '지난번이랑 안 겹치게', randomAvoidSub: '히스토리에서 같이 한 조합에 페널티',
    randomMix: '성비 섞기', randomMixSub: '한 팀에 같은 성별 몰리지 않게',
    randomSkipBusy: '그날 불가인 사람 빼기', randomSkipBusySub: '가능일 투표에서 불가라고 낸 사람 제외',
    randomNoDate: '이 Day에 날짜가 없어서 가능일과 못 맞춰요',
    randomRun: '배치하기',
    availToDays: '확정일을 Day 날짜로 반영',
    availToDaysMsg: (n: number) => `확정일 ${n}개를 Day 1~${n}의 날짜로 넣을게요. 기존 배치는 그대로예요.`,
    availToDaysDone: (n: number) => `Day ${n}개에 날짜를 넣었어요`,
    busy: '불가',
    availDayKick: '클릭하면 이 날에서 빠져요',
    availDayAdd: '이 날에 넣기', availDayAddTip: '클릭하면 이 날 가능으로 추가돼요',
    availRoleCover: '이 날 되는 역할 (프로듀서·탑라이너·엔지니어·A&R)',
  },
  en: {
    notice: 'Notice', history: 'History', voteClose: 'Close Vote', voteOpen: 'Open Vote',
    stats: 'Stats', statsTitle: 'Roster Stats', statsMembers: 'Members', statsRoles: 'Roles', statsGender: 'Gender', statsAttend: 'Attendance', statsAvail: 'Availability', statsAvailNone: 'No open availability poll', statsMale: 'M', statsFemale: 'F', statsMost: 'Most available',
    share: 'Share', export: 'Export', random: 'Random', studio: '+ Studio',
    logout: 'Logout', artists: 'Artists', addFromArtists: 'Add from Pool',
    namePlaceholder: 'Name (comma separated)', join: 'JOIN',
    rosterPool: 'ROSTER POOL', rosterDelete: 'Delete Roster', rosterDeleteMsg: (p: string) => `Delete "${p}"?`,
    newRoster: 'New Roster', rosterNamePlaceholder: 'Roster name',
    studioDelete: 'Delete Studio', studioDeleteMsg: (t: string) => `Delete "${t}"?`,
    studioHint: 'Right-click empty space to add a studio', studioAdded: (n: string) => `${n} added`,
    dayRenameHint: 'Right-click (or double-click) to rename',
    rosterRenameHint: 'Right-click (or double-click) to rename',
    rosterRename: 'Rename roster', projMemoPlaceholder: 'Memo',
    studioAddMember: 'Add from pool', poolEmpty: 'Pool is empty',
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
    attending: 'Attending', absent: 'Absent', noResponse: 'No Response',
    exclude: '✕ Exclude', include: '✓ Include',
    sessionDeleteMsg: (d: number) => `Delete Day ${d}?`, sessionDelete: 'Delete Session',
    contact: 'Contact : everplayground@gmail.com', loading: 'Loading…',
    alreadyInRoster: (n: string) => `${n} already in roster!`,
    addedToRoster: (n: string, p: string) => `${n} → ${p}`,
    linkCopied: 'Link copied', closeVoteConfirm: 'Close the vote?',
    availOpen: 'Dates', availOpenTitle: 'Open Availability Poll', availMonth: 'Target month',
    availMonthChange: 'Change target month',
    availMonthMsg: (m: string, n: number) => `Switch to ${m}? ${n} answer(s) on days that don't exist there will be deleted.`,
    availTitleLabel: 'Title (optional)', availTitlePlaceholder: 'e.g. August session dates', availStart: 'Open Poll',
    availClose: 'Close Dates', availCloseConfirm: 'Close the availability poll?',
    availStats: 'Available by day', availBest: 'Best days', availConfirm: 'Confirm this day',
    availConfirmed: 'Confirmed', availUnset: 'Unset', availCodes: 'Member access codes',
    availCopyLink: 'Personal link', availCopyAll: 'Copy share link', availNoResp: 'No responses yet',
    codeCopied: 'Copied', availPeople: (n: number) => `${n}`,
    availSubmitStatus: 'Submissions', availSubmitted: 'Submitted', availWaiting: 'Waiting',
    availPossible: 'Available', availNo: 'Unavailable',
    availConfirmAdd: 'Add to confirmed', availConfirmRemove: 'Remove from confirmed',
    availBlockMode: 'Block days', availBlockDone: 'Done', availBlocked: 'Blocked',
    availBlockHint: 'Tap days to block (members cannot pick)',
    availFinalTitle: 'Confirmed days', availIcs: 'Save calendar (.ics)', availAnnounce: 'Copy announcement', availMakeSessions: 'Make sessions from these days', availSessionsMade: (n: number) => `Created ${n} sessions`,
    availRemindAll: 'Copy reminder (all)',
    adSlot: 'Sponsor slot', adOn: 'Show on share page', adCaption: 'Headline',
    adBody: 'Body (optional)', adLink: 'Link (optional)', adImage: 'Image URL (optional)', adSaved: 'Sponsor slot saved',
    availAnnounceMsg: (title: string, days: string, link: string) => `[${title}] Confirmed\n${days}\n${link}`,
    availRemindMsg: (who: string, title: string, link: string) => `${who}\nPlease submit your availability for "${title}":\n${link}`,
    inviteAccount: 'Invite account (email)', inviteTitle: 'Invite this member by email', inviteSent: 'Invite saved! They auto-link when they log in with that email',
    availMemberPick: 'Click to highlight this member’s picked days on the calendar',
    availKick: 'Remove', availKicked: 'Removed (marked absent)', availRestoreM: 'Restore',
    availDayKick: 'Click to remove from this day',
    availDayAdd: 'Add to this day', availDayAddTip: 'Click to add as available on this day',
    availRoleCover: 'Roles available this day (Producer·Topliner·Engineer·A&R)',
    more: 'More', availLive: 'live',
    daySetDate: 'Set date for this day',
    stepPoll: 'Poll', stepConfirm: 'Confirm', stepAssign: 'Assign', stepShare: 'Share',
    randomDone: (n: number, t: number) => `${n} placed across ${t} studios`,
    randomTitle: 'Random match', randomAvoid: 'Avoid repeat pairings', randomAvoidSub: 'Penalize pairs that already worked together',
    randomMix: 'Mix gender', randomMixSub: 'Avoid stacking one gender per studio',
    randomSkipBusy: 'Skip people marked unavailable', randomSkipBusySub: 'Uses the availability poll for this date',
    randomNoDate: 'No date on this Day, so availability can’t be matched',
    randomRun: 'Match',
    availToDays: 'Apply confirmed dates to Days',
    availToDaysMsg: (n: number) => `Set ${n} confirmed dates as Day 1–${n}. Assignments stay as they are.`,
    availToDaysDone: (n: number) => `Dates set on ${n} days`,
    busy: 'Busy',
  }
};

type Lang = 'ko' | 'en';
type Theme = 'dark' | 'light';

const Modal = ({ title, message, children, theme }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-ui">
    <div className={`w-full max-w-sm mx-4 border rounded-xl p-6 shadow-lg ${theme === 'light' ? ' border-black/10' : 'bg-[#111] border-white/10'}`}>
      {title && <h2 className={`font-black text-lead mb-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}>{title}</h2>}
      {message && <p className={`text-body mb-5 leading-relaxed whitespace-pre-line ${theme === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>{message}</p>}
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
  const [poolOrder, setPoolOrder] = useState<string[][]>([['Producer'], ['Topliner'], ['Engineer', 'A&R']]);
  const [currentProject, setCurrentProject] = useState('');
  const [currentDay, setCurrentDay] = useState(1);
  const [days, setDays] = useState<number[]>([1]);
  const [dayNames, setDayNames] = useState<Record<number, string>>({});
  const [dayDates, setDayDates] = useState<Record<number, string>>({}); // Day → 'YYYY-MM-DD'
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

  // 월별 가능일 투표
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [availPoll, setAvailPoll] = useState<any>(null);
  const [availPicks, setAvailPicks] = useState<any[]>([]);
  const [availSubs, setAvailSubs] = useState<any[]>([]);
  const [availMonth, setAvailMonth] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [availTitle, setAvailTitle] = useState('');
  const [availSelDay, setAvailSelDay] = useState<number | null>(null);
  const [availSelMember, setAvailSelMember] = useState<string | null>(null);
  const [availBlockMode, setAvailBlockMode] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onOk: () => void } | null>(null);
  const [promptModal, setPromptModal] = useState<{ title: string; placeholder: string; onOk: (v: string) => void } | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const [showArtistPanel, setShowArtistPanel] = useState(false);
  const [projectMemo, setProjectMemo] = useState('');
  const [adForm, setAdForm] = useState({ caption: '', body: '', link_url: '', image_url: '', active: true });
  // 스튜디오 카드의 + — 풀에 남은 사람을 그 스튜디오로 바로 넣는다
  const [addToTeam, setAddToTeam] = useState<{ team: string; x: number; y: number } | null>(null);
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

  // 툴바 더보기 메뉴
  const [menuOpen, setMenuOpen] = useState(false);
  const [randomModal, setRandomModal] = useState(false);
  const [randTeams, setRandTeams] = useState('2');
  const [randAvoid, setRandAvoid] = useState(true);
  const [randMix, setRandMix] = useState(false);
  const [randSkipBusy, setRandSkipBusy] = useState(true);

  // 저장 실패를 눈에 보이게 (예전엔 전부 무음이라 안 저장돼도 성공처럼 보였음)
  useEffect(() => onDbError(e => {
    if (!e.write) return;
    showToastMsg((lang === 'ko' ? '저장 실패 — ' : 'Save failed — ') + e.message);
  }), [lang]);

  // Esc = 열려 있는 것 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false); setRoleDropdown(null); setRandomModal(false);
      setShowAvailModal(false); setShowStats(false); setShowVotingModal(false);
      setShowNoticeModal(false); setShowExportModal(false); setShowSessionModal(false);
      setPromptModal(null); setConfirmModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setLang(getLang());
    const savedTheme = localStorage.getItem('cast_theme') as Theme | null;
    if (savedTheme) setTheme(savedTheme);
    const savedPool = localStorage.getItem('cast_pool_order');
    if (savedPool) { try { const p = JSON.parse(savedPool); if (Array.isArray(p) && p.length === 3) setPoolOrder(p); } catch { /* ignore */ } }
    const sync = () => setLang(getLang());
    window.addEventListener(LANG_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(LANG_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);

  const toggleLang = () => { setLangValue(lang === 'ko' ? 'en' : 'ko'); };
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

  useEffect(() => { supabase.auth.getUser().then(async ({ data }) => {
    if (!data.user) { router.push('/roster'); return; }
    // CAST 허락제: 슈퍼관리자/host_grants/기존 로스터 보유자만 호스트 대시보드 진입
    const email = (data.user.email || '').toLowerCase();
    let ok = ['everplayground@gmail.com', 'hseu2000@gmail.com'].includes(email);
    if (!ok) { const { data: g } = await supabase.from('host_grants').select('id').eq('email', email).eq('status', 'approved').maybeSingle(); ok = !!g; }
    if (!ok) { const { data: p } = await supabase.from('profiles').select('id').eq('user_id', data.user.id).limit(1); ok = !!(p && p.length); }
    if (!ok) { router.push('/hub'); return; }
    setUser(data.user);
  }); }, []);

  // ── 데이터 fetch ──────────────────────────────────────────
  const fetchMembers = useCallback(async (u = user) => {
    if (!u) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', u.id).order('name', { ascending: true });
    if (data) {
      setMembers(data);
      const savedProjects = JSON.parse(localStorage.getItem(`epg_projects_${u.id}`) || 'null');
      // honor a project pre-selected from the hub, if it exists in the list
      const pref = localStorage.getItem('cast_current_project');
      const pick = (list: string[]) => (pref && list.includes(pref)) ? pref : list[0];
      if (savedProjects?.length > 0) {
        setProjects(savedProjects);
        setCurrentProject(prev => prev || pick(savedProjects));
      } else {
        const dbProjects = Array.from(new Set(data.map((m: any) => m.project).filter(Boolean))) as string[];
        if (dbProjects.length > 0) { setProjects(dbProjects); setCurrentProject(prev => prev || pick(dbProjects)); }
        else setShowFirstRosterModal(true);
      }
      if (pref) localStorage.removeItem('cast_current_project');
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
    fetchVotingSession(user); fetchNotices(user); fetchSessions(user); fetchArtists(user); fetchAd(user);
    const ch = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, () => { fetchMembers(user); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!currentProject || !user) return;
    const savedDays = JSON.parse(localStorage.getItem(`epg_days_${user.id}_${currentProject}`) || 'null');
    const savedNames = JSON.parse(localStorage.getItem(`epg_daynames_${user.id}_${currentProject}`) || '{}');
    setDayDates(JSON.parse(localStorage.getItem(`epg_daydates_${user.id}_${currentProject}`) || '{}'));
    setProjectMemo(localStorage.getItem(`epg_memo_${user.id}_${currentProject}`) || '');
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

  const saveDays = async (uid: string, project: string, dayList: number[], names: Record<number, string>, dates?: Record<number, string>) => {
    const d = dates ?? dayDates;
    localStorage.setItem(`epg_days_${uid}_${project}`, JSON.stringify(dayList));
    localStorage.setItem(`epg_daynames_${uid}_${project}`, JSON.stringify(names));
    localStorage.setItem(`epg_daydates_${uid}_${project}`, JSON.stringify(d));
    const { data: existing } = await supabase.from('host_settings').select('*').eq('host_id', uid).single();
    const prev = (existing as any)?.team_order || {};
    await supabase.from('host_settings').upsert({ host_id: uid, team_order: { ...prev, [`${project}_days`]: dayList, [`${project}_daynames`]: names, [`${project}_daydates`]: d }, project_order: (existing as any)?.project_order || [] });
  };

  // Day에 날짜 지정 (네이티브 date input)
  const saveDayDate = async (day: number, iso: string) => {
    const next = { ...dayDates }; if (iso) next[day] = iso; else delete next[day];
    setDayDates(next);
    await saveDays(user.id, currentProject, days, dayNames, next);
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
    const newDates = { ...dayDates }; delete newDates[day];
    setDays(newDays); setCurrentDay(newDays[0]); setDayNames(newNames); setDayDates(newDates);
    await saveDays(user.id, currentProject, newDays, newNames, newDates);
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

  // 스폰서 슬롯 — 호스트당 한 칸이라 host_id가 곧 키다
  const fetchAd = async (u: any) => {
    const { data } = await supabase.from('roster_ads').select('*').eq('host_id', u.id).limit(1);
    if (data && data.length) setAdForm({ caption: data[0].caption || '', body: data[0].body || '', link_url: data[0].link_url || '', image_url: data[0].image_url || '', active: !!data[0].active });
  };
  const saveAd = async () => {
    const { error } = await supabase.from('roster_ads').upsert({ host_id: user.id, ...adForm }, { onConflict: 'host_id' });
    if (error) { showToastMsg(error.message); return; }
    showToastMsg(t.adSaved);
  };

  const saveProjectMemo = () => {
    if (!user || !currentProject) return;
    localStorage.setItem(`epg_memo_${user.id}_${currentProject}`, projectMemo);
  };

  // 로스터 이름 변경 — 이름이 곧 외래키라 두 테이블을 같이 옮긴다
  const renameProject = (from: string) => showPrompt(t.rosterRename, t.rosterNamePlaceholder, from, async (to) => {
    const next = (to || '').trim();
    setPromptModal(null);
    if (!next || next === from || projects.includes(next)) return;
    await supabase.from('profiles').update({ project: next }).eq('project', from).eq('user_id', user.id);
    await supabase.from('roster_assignments').update({ project: next }).eq('project', from).eq('user_id', user.id);
    const order = projects.map(x => x === from ? next : x);
    setProjects(order); await saveProjectOrder(user.id, order);
    if (currentProject === from) setCurrentProject(next);
    fetchMembers(user); fetchAssignments(user);
  });

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
  // 지난 세션 스냅샷에서 "누가 누구랑 몇 번 붙었는지" 세기 — 랜덤이 같은 조합을 반복하지 않도록
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const buildPairHistory = () => {
    const h = new Map<string, number>();
    for (const ses of sessions) {
      for (const team of (ses.roster || [])) {
        const names = (team.members || []).map((m: any) => m.name).filter(Boolean);
        for (let i = 0; i < names.length; i++)
          for (let j = i + 1; j < names.length; j++) {
            const k = pairKey(names[i], names[j]);
            h.set(k, (h.get(k) || 0) + 1);
          }
      }
    }
    return h;
  };

  const generateRandomRoster = (teamCount: number, opts?: { avoidRepeats?: boolean; mixGender?: boolean; skipBusy?: boolean }) => async () => {
    const { avoidRepeats = true, mixGender = false, skipBusy = true } = opts || {};
    const day = currentDay; // 클로저로 현재 Day 고정
    const proj = currentProject;
    const pool = members.filter(m =>
      m.project === proj && !m.excluded && m.attendance !== 'absent' &&
      !(skipBusy && isBusyOn(m.id, day))
    );
    const shuffle = <T,>(a: T[]) => a.slice().sort(() => Math.random() - 0.5);
    const producers = shuffle(pool.filter(m => m.role === 'Producer'));
    const topliners = shuffle(pool.filter(m => m.role === 'Topliner'));
    const others = shuffle(pool.filter(m => m.role !== 'Producer' && m.role !== 'Topliner'));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newTeams = Array.from({ length: teamCount }, (_, i) => `Studio ${alphabet[i]}`);

    const history = avoidRepeats ? buildPairHistory() : new Map<string, number>();
    const buckets: any[][] = Array.from({ length: teamCount }, () => []);
    // 역할별로 팀에 균등 배분하되, 같은 조합이 반복되지 않는 팀을 우선 (그리디)
    const place = (arr: any[]) => {
      for (const m of arr) {
        let best = 0, bestScore = Infinity;
        for (let ti = 0; ti < teamCount; ti++) {
          const b = buckets[ti];
          const sameRole = b.filter(x => x.role === m.role).length;
          const repeat = b.reduce((sum, x) => sum + (history.get(pairKey(m.name, x.name)) || 0), 0);
          const genderClash = mixGender ? b.filter(x => x.gender === m.gender).length : 0;
          // 1순위 같은 역할 수, 2순위 과거 중복, 3순위 성비, 4순위 팀 크기
          const score = sameRole * 1000 + repeat * 50 + genderClash * 10 + b.length;
          if (score < bestScore) { bestScore = score; best = ti; }
        }
        buckets[best].push(m);
      }
    };
    place(producers); place(topliners); place(others);

    // 현재 Day + 현재 프로젝트 assignments만 삭제
    await supabase.from('roster_assignments')
      .delete()
      .eq('user_id', user.id)
      .eq('project', proj)
      .eq('day_number', day);

    const toInsert: any[] = [];
    buckets.forEach((b, ti) => {
      const ordered = [...b.filter(m => m.role === 'Producer'), ...b.filter(m => m.role === 'Topliner'), ...b.filter(m => m.role !== 'Producer' && m.role !== 'Topliner')];
      ordered.forEach((m, i) => toInsert.push({
        profile_id: String(m.id), user_id: user.id, project: proj,
        day_number: day, team: newTeams[ti], order_index: i,
      }));
    });
    if (toInsert.length > 0) await supabase.from('roster_assignments').insert(toInsert);

    const next = ['Unassigned', ...newTeams]; setTeams(next);
    await saveTeamOrder(user.id, proj, day, next);
    fetchAssignments(user);
    showToastMsg(t.randomDone(toInsert.length, teamCount));
  };

  // ── Drag & Drop ──────────────────────────────────────────
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;

    if (type === 'ROLEROW') {
      const next = Array.from(poolOrder);
      const [moved] = next.splice(source.index, 1); next.splice(destination.index, 0, moved);
      setPoolOrder(next); localStorage.setItem('cast_pool_order', JSON.stringify(next)); return;
    }
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

  const resetAttendance = async () => {
    await supabase.from('profiles').update({ attendance: null }).eq('user_id', user.id);
    fetchMembers(user);
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

  // ── 월별 가능일 투표 ─────────────────────────────────
  const fetchAvailPoll = useCallback(async (u: any, project: string) => {
    if (!u || !project) return;
    const { data } = await supabase.from('availability_polls').select('*')
      .eq('host_id', u.id).eq('project', project).eq('is_open', true)
      .order('created_at', { ascending: false }).limit(1);
    const p = data && data.length > 0 ? data[0] : null;
    setAvailPoll(p);
    if (p) {
      const { data: pk } = await supabase.from('availability_picks').select('*').eq('poll_id', p.id); setAvailPicks(pk || []);
      const { data: sb } = await supabase.from('availability_submissions').select('*').eq('poll_id', p.id); setAvailSubs(sb || []);
    } else { setAvailPicks([]); setAvailSubs([]); }
  }, []);

  const openAvailPoll = async () => {
    if (!availMonth) return;
    const { data } = await supabase.from('availability_polls').insert({
      host_id: user.id, project: currentProject, month: availMonth, title: availTitle || null, is_open: true,
    }).select();
    if (data) { setAvailPoll(data[0]); setAvailPicks([]); setAvailSubs([]); setAvailTitle(''); }
  };

  const closeAvailPoll = async () => {
    if (!availPoll) return;
    await supabase.from('availability_polls').update({ is_open: false }).eq('id', availPoll.id);
    setAvailPoll(null); setAvailPicks([]); setAvailSubs([]);
  };

  const changeAvailMonth = async (nextMonth: string) => {
    if (!availPoll || !nextMonth || nextMonth === availPoll.month) return;
    const [ny, nm] = nextMonth.split('-').map(Number);
    const lastDay = new Date(ny, nm, 0).getDate();
    const orphans = availPicks.filter(p => p.day > lastDay);
    const apply = async () => {
      if (orphans.length) await supabase.from('availability_picks').delete().eq('poll_id', availPoll.id).gt('day', lastDay);
      const finals = (availPoll.final_days || []).filter((d: number) => d <= lastDay);
      const blocked = (availPoll.blocked_days || []).filter((d: number) => d <= lastDay);
      await supabase.from('availability_polls').update({ month: nextMonth, final_days: finals, blocked_days: blocked }).eq('id', availPoll.id);
      setAvailSelDay(null); setAvailSelMember(null);
      fetchAvailPoll(user, currentProject);
      setConfirmModal(null);
    };
    if (orphans.length) showConfirm(t.availMonthChange, t.availMonthMsg(nextMonth, orphans.length), apply);
    else apply();
  };

  const toggleFinalDay = async (day: number) => {
    if (!availPoll) return;
    const cur: number[] = availPoll.final_days || [];
    const next = cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day].sort((a, b) => a - b);
    setAvailPoll({ ...availPoll, final_days: next });
    await supabase.from('availability_polls').update({ final_days: next }).eq('id', availPoll.id);
  };

  const toggleBlockedDay = async (day: number) => {
    if (!availPoll) return;
    const cur: number[] = availPoll.blocked_days || [];
    const next = cur.includes(day) ? cur.filter((x) => x !== day) : [...cur, day].sort((a, b) => a - b);
    setAvailPoll({ ...availPoll, blocked_days: next });
    await supabase.from('availability_polls').update({ blocked_days: next }).eq('id', availPoll.id);
  };

  const copyAvailShareLink = () => {
    if (!availPoll) return;
    navigator.clipboard.writeText(availLinkUrl());
    showToastMsg(t.linkCopied);
  };

  const availLinkUrl = () => `${window.location.origin}/roster/availability/${user.id}?poll=${availPoll.id}`;
  const availPollName = () => availPoll?.title || (availPoll?.month || '').replace('-', '. ');
  const fmtAvailDay = (d: number) => {
    const [yy, mm] = (availPoll?.month || '2025-01').split('-').map(Number);
    const w = new Date(yy, mm - 1, d).getDay();
    return lang === 'ko' ? `${mm}월 ${d}일(${['일', '월', '화', '수', '목', '금', '토'][w]})` : `${mm}/${d} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][w]})`;
  };
  const downloadAvailIcs = () => {
    if (!availPoll || !(availPoll.final_days || []).length) return;
    downloadIcs(availPollName(), buildDaysIcs(availPollName(), availPoll.month, availPoll.final_days, availPoll.id));
  };
  const copyAvailAnnounce = () => {
    if (!availPoll) return;
    const finals: number[] = (availPoll.final_days || []).slice().sort((a: number, b: number) => a - b);
    navigator.clipboard.writeText(t.availAnnounceMsg(availPollName(), finals.map(fmtAvailDay).join(' · '), availLinkUrl()));
    showToastMsg(t.codeCopied);
  };
  // 스튜디오 추가 (버튼 + 보드 빈 곳 우클릭)
  const addStudio = async () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let n = '';
    for (const c of alphabet) { if (!teams.includes(`Studio ${c}`)) { n = `Studio ${c}`; break; } }
    if (n) { const next = [...teams, n]; setTeams(next); await saveTeamOrder(user.id, currentProject, currentDay, next); showToastMsg(t.studioAdded(n)); }
  };

  // 특정 날짜에서 멤버 빼기 = 그 날의 pick 삭제
  const removeDayPick = async (memberId: string, day: number) => {
    if (!availPoll) return;
    setAvailPicks(prev => prev.filter(p => !(p.member_id === memberId && p.day === day)));
    await supabase.from('availability_picks').delete().eq('poll_id', availPoll.id).eq('member_id', memberId).eq('day', day);
  };
  // 특정 날짜에 멤버 넣기 = 그 날 pick을 '가능'으로 추가
  const addDayPick = async (memberId: string, day: number) => {
    if (!availPoll) return;
    setAvailPicks(prev => [...prev.filter(p => !(p.member_id === memberId && p.day === day)), { poll_id: availPoll.id, member_id: memberId, day, status: 'available' }]);
    await supabase.from('availability_picks').upsert({ poll_id: availPoll.id, member_id: memberId, day, status: 'available' }, { onConflict: 'poll_id,member_id,day' });
  };

  // 가능일에서 멤버 빼기 = poll.excluded_members 토글 + 참석상태 불참/복구
  const toggleAvailExclude = async (memberId: string) => {
    if (!availPoll) return;
    const cur: string[] = availPoll.excluded_members || [];
    const out = !cur.includes(memberId);
    const next = out ? [...cur, memberId] : cur.filter(x => x !== memberId);
    setAvailPoll({ ...availPoll, excluded_members: next });
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, attendance: out ? 'absent' : null } : m));
    await Promise.all([
      supabase.from('availability_polls').update({ excluded_members: next }).eq('id', availPoll.id),
      supabase.from('profiles').update({ attendance: out ? 'absent' : null }).eq('id', memberId),
    ]);
  };

  // 확정일 → 세션보드에 자동 등록 (각 확정일 = 그 날 가능한 멤버들이 로스터)
  const createSessionsFromFinals = async () => {
    if (!availPoll) return;
    const finals: number[] = (availPoll.final_days || []).slice().sort((a: number, b: number) => a - b);
    if (!finals.length) return;
    const proj = members.filter(m => m.project === currentProject && !m.excluded);
    const rows = finals.map((d, i) => {
      const avail = proj.filter(m => availPicks.some(p => p.member_id === m.id && p.day === d && p.status === 'available'));
      const roster = [{ team: fmtAvailDay(d), members: avail.map(m => ({ name: m.name, role: m.role, gender: m.gender })) }];
      return { host_id: user.id, project: currentProject, camp_name: fmtAvailDay(d), day_number: i + 1, memo: availPollName(), links: [], roster };
    });
    await supabase.from('sessions').insert(rows);
    fetchSessions(user);
    showToastMsg(t.availSessionsMade(finals.length));
  };
  // 확정일 → Day에 날짜로 반영 (Day 1 = 첫 확정일, ...). Day는 줄이지 않고 부족하면 늘림.
  const applyFinalsToDays = async () => {
    if (!availPoll) return;
    const finals: number[] = (availPoll.final_days || []).slice().sort((a: number, b: number) => a - b);
    if (!finals.length) return;
    const [yy, mm] = availPoll.month.split('-');
    showConfirm(t.availToDays, t.availToDaysMsg(finals.length), async () => {
      const newDays = Array.from(new Set([...days, ...finals.map((_, i) => i + 1)])).sort((a, b) => a - b);
      const newDates = { ...dayDates };
      finals.forEach((d, i) => { newDates[i + 1] = `${yy}-${mm}-${String(d).padStart(2, '0')}`; });
      setDays(newDays); setDayDates(newDates); setCurrentDay(1);
      await saveDays(user.id, currentProject, newDays, dayNames, newDates);
      setConfirmModal(null);
      showToastMsg(t.availToDaysDone(finals.length));
    });
  };

  const copyAvailReminder = (names: string[]) => {
    if (!availPoll || names.length === 0) return;
    const who = lang === 'ko' ? names.map((n) => `${n}님`).join(', ') : names.join(', ');
    navigator.clipboard.writeText(t.availRemindMsg(who, availPollName(), availLinkUrl()));
    showToastMsg(t.codeCopied);
  };

  useEffect(() => {
    if (!currentProject || !user) return;
    fetchAvailPoll(user, currentProject);
    const ch = supabase.channel(`avail-dash-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_picks' }, () => fetchAvailPoll(user, currentProject))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_submissions' }, () => fetchAvailPoll(user, currentProject))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_polls', filter: `host_id=eq.${user.id}` }, () => fetchAvailPoll(user, currentProject))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [currentProject, user, fetchAvailPoll]);

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
    showToastMsg((lang === 'ko' ? '텍스트 복사됨' : 'Copied'));
    setShowExportModal(false);
  };

  const exportAsImage = async (format: 'jpeg' | 'pdf') => {
    showToastMsg((lang === 'ko' ? '생성 중…' : 'Generating…'));
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
        showToastMsg((lang === 'ko' ? 'JPEG 저장됨' : 'JPEG saved'));
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
        showToastMsg((lang === 'ko' ? 'PDF 저장됨' : 'PDF saved'));
      }
    } catch (err) { console.error(err); showToastMsg((lang === 'ko' ? '실패' : 'Failed')); }
  };

;

  const exportAllDays = async (format: 'jpeg' | 'pdf' = 'jpeg') => {
    showToastMsg((lang === 'ko' ? '생성 중…' : 'Generating…'));
    try {
      const ROLE_COLORS_MAP: Record<string, string> = { 'Producer': '#E3B24A', 'Topliner': '#5FA39A', 'Engineer': '#C98BA0', 'A&R': '#C98BA0' };
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

      ctx.fillStyle = OAT.cream; ctx.fillRect(0, 0, totalW, totalH);

      // 헤더
      ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = OAT.ink;
      ctx.fillText('CAST', PAD, PAD + 30);
      const castW = ctx.measureText('CAST').width;
      ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = OAT.banner;
      ctx.fillText('by NEN', PAD + castW + 8, PAD + 30);

      // 각 Day 그리기
      allDayData.forEach(({ dayLabel, teamData }, di) => {
        const dayY = PAD + HEADER_H + di * dayRowH;

        // Day 라벨
        ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = OAT.banner;
        ctx.fillText(dayLabel.toUpperCase(), PAD, dayY + 18);

        // 팀 카드
        teamData.forEach((td, ti) => {
          const cx = PAD + ti * (CARD_W + TEAM_GAP);
          const cy = dayY + DAY_LABEL_H;
          const ch = allMaxCardH;

          ctx.fillStyle = '#ffffff'; roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.fill();
          ctx.strokeStyle = 'rgba(16,24,32,0.12)'; ctx.lineWidth = 1;
          roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.stroke();
          // accent bar 제거됨

          ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = OAT.ink;
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
            drawMemberBox(ctx, m, mx, my, mw, mh);
          });
        });
      });

      ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = OAT.banner;
      ctx.fillText('CAST by NEN', PAD, totalH - 14);

      if (format === 'jpeg') {
        const link = document.createElement('a');
        link.download = `${currentProject}_ALL_roster.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showToastMsg((lang === 'ko' ? '전체 Day JPEG 저장됨' : 'All Days JPEG saved'));
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
        showToastMsg((lang === 'ko' ? '전체 Day PDF 저장됨' : 'All Days PDF saved'));
      }
    } catch (err) { console.error(err); showToastMsg((lang === 'ko' ? '실패' : 'Failed')); }
  };;

  const buildRosterCanvas = (teamData: any[], dayLabel: string) => {
    const ROLE_COLORS_MAP: Record<string, string> = { 'Producer': '#E3B24A', 'Topliner': '#5FA39A', 'Engineer': '#C98BA0', 'A&R': '#C98BA0' };
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
    ctx.fillStyle = OAT.cream; ctx.fillRect(0, 0, totalW, totalH);
    ctx.font = 'bold 28px system-ui, sans-serif'; ctx.fillStyle = OAT.ink;
    ctx.fillText('CAST', PAD, PAD + 30);
    const castW = ctx.measureText('CAST').width;
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = OAT.banner;
    ctx.fillText('by NEN', PAD + castW + 8, PAD + 30);
    for (let i = 0; i < teamData.length; i++) {
      const td = teamData[i];
      const row = Math.floor(i / COLS); const col = i % COLS;
      const cx = PAD + col * (CARD_W + TEAM_GAP);
      const cy = PAD + HEADER_H + row * (maxCardH + TEAM_GAP);
      const ch = maxCardH;
      ctx.fillStyle = '#111'; roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.fill();
      ctx.strokeStyle = 'rgba(16,24,32,0.12)'; ctx.lineWidth = 1;
      roundRect(ctx, cx, cy, CARD_W, ch, CARD_RADIUS); ctx.stroke();
      // accent bar 제거됨
      ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillStyle = OAT.ink;
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
        drawMemberBox(ctx, m, mx, my, mw, mh);
      });
    }
    ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = OAT.banner;
    ctx.fillText('CAST by NEN', PAD, totalH - 14);
    return canvas;
  };

  // Canvas 유틸
  // ── 콜시트 이미지 (카톡/인스타용 세로 9:16 · 정사각 1:1) ───────────────
  // 화면 캡처가 아니라 공유 전용 레이아웃. 촬영 콜시트 타이포(대문자 라벨·괘선·고정폭 숫자).
  const buildCallSheetCanvas = (teamData: any[], ratio: '9:16' | '1:1') => {
    const RC: Record<string, string> = { Producer: '#E3B24A', Topliner: '#5FA39A', Engineer: '#C98BA0', 'A&R': '#C98BA0' };
    const SHORT: Record<string, string> = { Producer: 'PRO', Topliner: 'TOP', Engineer: 'ENG', 'A&R': 'A&R' };
    const W = 1080, H = ratio === '9:16' ? 1920 : 1080;
    const PAD = ratio === '9:16' ? 84 : 64;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d')!;
    const sans = (w: string, sz: number) => `${w} ${sz}px "Unbounded", "Gothic A1", -apple-system, "Apple SD Gothic Neo", sans-serif`;
    // 디스플레이는 굵기 400 하나뿐 — 라틴 Archivo Black, 한글 Black Han Sans
    const serif = (_w: string, sz: number) => `400 ${sz}px "Archivo Black", "Black Han Sans", sans-serif`;
    const mono = (w: string, sz: number) => `${w} ${sz}px "IBM Plex Mono", ui-monospace, monospace`;
    const track = (px: number) => { try { (x as any).letterSpacing = `${px}px`; } catch { /* 미지원 브라우저는 무시 */ } };
    const rule = (y: number, alpha = 0.14) => { x.strokeStyle = `rgba(255,255,255,${alpha})`; x.lineWidth = 1; x.beginPath(); x.moveTo(PAD, y + 0.5); x.lineTo(W - PAD, y + 0.5); x.stroke(); };

    x.fillStyle = '#0B0B0C'; x.fillRect(0, 0, W, H);

    // ── 헤더
    let y = PAD;
    track(6); x.font = mono('600', 26); x.fillStyle = '#E3B24A';
    x.fillText('CAST', PAD, y + 22);
    track(4); x.font = mono('400', 15); x.fillStyle = '#5A5A5E';
    x.textAlign = 'right'; x.fillText('BY NEN', W - PAD, y + 22); x.textAlign = 'left';
    track(0);
    y += 46; rule(y); y += 46;

    track(5); x.font = mono('500', 17); x.fillStyle = '#8A8A90';
    x.fillText(currentProject.toUpperCase(), PAD, y + 14);
    track(0);
    y += 44;

    const iso = dayDates[currentDay];
    const bigDate = iso
      ? (() => { const [yy, mo, dd] = iso.split('-').map(Number); return lang === 'ko' ? `${mo}월 ${dd}일 (${WD[new Date(yy, mo - 1, dd).getDay()]})` : `${mo}/${dd} ${WD[new Date(yy, mo - 1, dd).getDay()]}`; })()
      : (dayNames[currentDay] || `Day ${currentDay}`);
    x.font = serif('700', ratio === '9:16' ? 68 : 56); x.fillStyle = '#FFFFFF';
    x.fillText(bigDate, PAD, y + (ratio === '9:16' ? 54 : 45));
    y += ratio === '9:16' ? 86 : 72;

    const people = teamData.reduce((n, t) => n + (t.members || []).filter(Boolean).length, 0);
    track(3); x.font = sans('600', 16); x.fillStyle = '#6E6E74';
    const dayTag = dayNames[currentDay] && dayNames[currentDay] !== currentProject ? dayNames[currentDay] : (iso ? `DAY ${currentDay}` : '');
    const meta = lang === 'ko'
      ? `${dayTag ? dayTag + ' · ' : ''}스튜디오 ${teamData.length} · ${people}명`
      : `${dayTag ? dayTag + ' · ' : ''}${teamData.length} STUDIOS · ${people} PEOPLE`;
    x.fillText(meta, PAD, y + 14);
    track(0);
    y += 40; rule(y, 0.22); y += ratio === '9:16' ? 54 : 40;

    // ── 본문: 스튜디오 블록
    const footerH = 96;
    const bodyTop = y, bodyH = H - PAD - footerH - bodyTop;
    const TITLE_H = 44;
    let cols = ratio === '1:1' ? 2 : 1;
    // 한 열의 총 높이 (마지막 블록 뒤 간격은 빼고)
    const need = (c: number, rowH: number, gap: number) => {
      const perCol: number[] = Array(c).fill(0);
      const cnt: number[] = Array(c).fill(0);
      teamData.forEach((td, i) => { perCol[i % c] += TITLE_H + (td.members || []).length * rowH + gap; cnt[i % c]++; });
      return Math.max(...perCol.map((v, i) => v - (cnt[i] ? gap : 0)), 0);
    };
    let ROW_H = ratio === '9:16' ? 62 : 50;
    let GAP = ratio === '9:16' ? 44 : 30;
    // 스튜디오가 많으면 열을 늘리고, 그래도 넘치면 행 높이를 줄인다
    while (need(cols, ROW_H, GAP) > bodyH && cols < 3) cols++;
    while (need(cols, ROW_H, GAP) > bodyH && ROW_H > 28) ROW_H -= 2;
    // 아래가 휑하지 않게 남는 공간을 행 높이 → 블록 간격 순으로 되돌려준다
    const rowCap = ratio === '9:16' ? 96 : 74;
    while (ROW_H < rowCap && need(cols, ROW_H + 2, GAP) <= bodyH) ROW_H += 2;
    const blocksPerCol = Math.ceil(teamData.length / cols);
    if (blocksPerCol > 1) {
      const slack = bodyH - need(cols, ROW_H, GAP);
      GAP += Math.max(0, Math.min(slack / (blocksPerCol - 1), GAP * 2.2));
    }

    const colW = (W - PAD * 2 - (cols - 1) * 40) / cols;
    const colY: number[] = Array(cols).fill(bodyTop);

    teamData.forEach((td, i) => {
      const ci = i % cols;
      const cx = PAD + ci * (colW + 40);
      let cy = colY[ci];
      const ms = (td.members || []).filter(Boolean);

      // 스튜디오 이름 + 역할 카운트
      track(4); x.font = mono('600', ratio === '9:16' ? 24 : 20); x.fillStyle = '#FFFFFF';
      x.fillText(String(td.name).toUpperCase(), cx, cy + 20);
      const counts: Record<string, number> = {};
      ms.forEach((m: any) => { counts[m.role] = (counts[m.role] || 0) + 1; });
      x.textAlign = 'right'; x.font = mono('500', 13);
      let rx = cx + colW;
      Object.entries(counts).reverse().forEach(([r, n]) => {
        const label = `${SHORT[r] || r} ${n}`;
        x.fillStyle = RC[r] || '#777';
        x.fillText(label, rx, cy + 19);
        rx -= x.measureText(label).width + 16;
      });
      x.textAlign = 'left'; track(0);
      cy += 30;
      x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(cx, cy + 0.5); x.lineTo(cx + colW, cy + 0.5); x.stroke();
      cy += ratio === '9:16' ? 20 : 14;

      if (ms.length === 0) {
        x.font = sans('500', 15); x.fillStyle = '#4A4A50';
        x.fillText(lang === 'ko' ? '—' : '—', cx, cy + 16);
        cy += ROW_H;
      }
      ms.forEach((m: any) => {
        const rc = RC[m.role] || '#666';
        x.fillStyle = rc; x.fillRect(cx, cy + 4, 3, ROW_H - 18);
        x.font = sans('700', ratio === '9:16' ? 27 : 22); x.fillStyle = '#F2F2F4';
        x.fillText(m.name, cx + 18, cy + (ROW_H - 18) * 0.72);
        x.textAlign = 'right'; track(3);
        x.font = mono('500', 12); x.fillStyle = rc + 'CC';
        x.fillText((SHORT[m.role] || m.role).toUpperCase(), cx + colW, cy + (ROW_H - 18) * 0.66);
        x.textAlign = 'left'; track(0);
        cy += ROW_H;
      });
      colY[ci] = cy + GAP;
    });

    // ── 푸터
    rule(H - PAD - 46, 0.14);
    track(3); x.font = sans('600', 14); x.fillStyle = '#5A5A5E';
    x.fillText('everplayground@gmail.com', PAD, H - PAD - 12);
    x.textAlign = 'right'; x.fillStyle = '#E3B24A';
    x.fillText(fmtDate(Date.now()), W - PAD, H - PAD - 12);
    x.textAlign = 'left'; track(0);
    return cv;
  };

  const exportCallSheet = (ratio: '9:16' | '1:1') => {
    const activeTeams = teams.filter(tn => tn !== 'Unassigned');
    const teamData = activeTeams.map(tn => ({ name: tn, members: getDayMembers(tn) as any[] }));
    const cv = buildCallSheetCanvas(teamData, ratio);
    const link = document.createElement('a');
    link.download = `${currentProject}_${dayDates[currentDay] || getDayLabel(currentDay)}_callsheet_${ratio.replace(':', 'x')}.jpg`;
    link.href = cv.toDataURL('image/jpeg', 0.94);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToastMsg((lang === 'ko' ? '콜시트 저장됨' : 'Call sheet saved'));
  };

  function drawMemberBox(ctx: CanvasRenderingContext2D, m: any, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = OAT.box; roundRect(ctx, x, y, w, h, 10); ctx.fill();
    // 좌상단 노치 = 성별 (화면 카드와 같은 신호)
    const female = m.gender === 'female' || m.gender === 'F' || m.gender === '여';
    ctx.save();
    roundRect(ctx, x, y, w, h, 10); ctx.clip();
    ctx.fillStyle = female ? GENDER_NOTCH.female : GENDER_NOTCH.male;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.lineTo(x, y + 16); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = OAT.ink; ctx.textAlign = 'left';
    ctx.fillText(m.name, x + 20, y + h * 0.62);
  }

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
  const bg = theme === 'light' ? 'bg-[#f5f5f5]' : 'bg-surface-1';
  const cardBg = theme === 'light' ? 'bg-white border-black/10' : 'bg-surface-2 border-[rgba(255,255,255,0.08)]';
  const textMain = theme === 'light' ? 'text-black' : 'text-white';
  const textSub = theme === 'light' ? 'text-zinc-500' : 'text-zinc-400';
  const inputBg = theme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10';
  const btnBg = theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-400 hover:bg-black/10' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10';

  // 역할색은 왼쪽 레일 한 곳에서만 말한다.
  const ROLE_TAG: Record<string, string> = { Producer: 'P', Topliner: 'T', Engineer: 'E', 'A&R': 'A' };

  const getAttendanceBadge = (attendance: string | null) => {
    if (attendance === 'attending') return <span className="text-micro font-black px-1.5 py-0.5 rounded-full bg-[#77B18E]/20 text-[#77B18E] border border-[#77B18E]/30 shrink-0">{t.attending}</span>;
    if (attendance === 'absent') return <span className="text-micro font-black px-1.5 py-0.5 rounded-full bg-[#9A8F8A]/20 text-[#9A8F8A] border border-[#9A8F8A]/30 shrink-0">{t.absent}</span>;
    return votingOpen ? <span className="text-micro font-black px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 shrink-0">{t.noResponse}</span> : null;
  };


  const otherTeams = teams.filter(t => t !== 'Unassigned');
  const WD = lang === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // 'YYYY-MM-DD' → '8/29(금)' 짧은 요일 라벨. 공용 fmtDate(ISO 타임스탬프용)와는 다른 물건이라
  // 이름을 갈라둔다 — 예전엔 둘 다 fmtDate라 서로를 가렸다.
  const fmtDayLabel = (iso: string) => {
    const [y, mo, dd] = iso.split('-').map(Number);
    const w = WD[new Date(y, mo - 1, dd).getDay()];
    return lang === 'ko' ? `${mo}/${dd}(${w})` : `${mo}/${dd} ${w}`;
  };
  const getDayLabel = (d: number) => (dayDates[d] ? fmtDayLabel(dayDates[d]) : (dayNames[d] || `Day ${d}`));

  // ── 그 Day 날짜에 "불가능"이라 답한 멤버 판별 (가능일 투표 ↔ 배치 연결) ──
  const dayOfMonthFor = (day: number): number | null => {
    const iso = dayDates[day];
    if (!iso || !availPoll) return null;
    const [y, mo, dd] = iso.split('-').map(Number);
    return availPoll.month === `${y}-${String(mo).padStart(2, '0')}` ? dd : null;
  };
  const availStatusOf = (memberId: any, day = currentDay): 'available' | 'unavailable' | null => {
    const dom = dayOfMonthFor(day);
    if (dom === null) return null;
    const p = availPicks.find(x => x.member_id === memberId && x.day === dom);
    return p ? (p.status as any) : null;
  };
  const isBusyOn = (memberId: any, day = currentDay) => availStatusOf(memberId, day) === 'unavailable';

  const getTeamCounts = (tName: string) => {
    const ms = getDayMembers(tName) as any[];
    const counts: Record<string, number> = {};
    for (const r of ROLES) { const c = ms.filter(m => m.role === r).length; if (c > 0) counts[r] = c; }
    return counts;
  };

  const attendingMembers = members.filter(m => m.project === currentProject && m.attendance === 'attending');
  const absentMembers = members.filter(m => m.project === currentProject && m.attendance === 'absent');
  const attendingCount = attendingMembers.length;
  const absentCount = absentMembers.length;
  const noResponseCount = members.filter(m => m.project === currentProject && !m.excluded && m.attendance !== 'attending' && m.attendance !== 'absent').length;

  const sessionsByCamp = sessions.reduce((acc: any, s: any) => { if (!acc[s.camp_name]) acc[s.camp_name] = []; acc[s.camp_name].push(s); return acc; }, {});

  if (!user) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className="text-zinc-400 text-mini font-black tracking-widest uppercase">{t.loading}</div>
    </div>
  );

  return (
    <>
      <div style={{ transform: `scale(${zoom * 1.1})`, transformOrigin: 'top left', width: `${100 / (zoom * 1.1)}%`, minHeight: `${100 / (zoom * 1.1)}vh` }}>
        <main className={`min-h-screen ${bg} ${textMain} p-5 lg:p-8 font-ui relative overflow-hidden transition-colors duration-150`}>
          {theme === 'dark' && <div className="absolute top-[-20%] left-[-10%] w-[520px] h-[520px] rounded-full pointer-events-none opacity-[0.07]" style={{background:'#E3B24A',filter:'blur(200px)'}} />}

          {/* 헤더 */}
          <ProductHeader product="cast" dark={theme === 'dark'} className="mb-8" right={<>
            <button onClick={toggleLang} className={`h-8 px-2.5 rounded-full font-bold text-mini border transition ${btnBg}`}>{lang === 'ko' ? 'EN' : 'KO'}</button>
            <button onClick={toggleTheme} className={`w-8 h-8 rounded-full font-bold text-body border flex items-center justify-center transition ${btnBg}`} aria-label={lang === 'ko' ? '테마 전환' : 'Toggle theme'}>{theme === 'dark' ? <i className="ti ti-sun" aria-hidden="true"></i> : <i className="ti ti-moon" aria-hidden="true"></i>}</button>
            <Link href="/mypage" className={`px-3 py-1.5 rounded-lg border text-micro font-normal transition ${btnBg}`}>MY</Link>
            <button onClick={() => showConfirm(t.logout, lang === 'ko' ? '로그아웃 할까요?' : 'Sign out?', async () => { await supabase.auth.signOut(); router.push('/'); })} className={`px-3 py-1.5 rounded-full border text-micro font-normal transition ${btnBg}`}>{t.logout}</button>
          </>} />

          <DragDropContext onDragEnd={onDragEnd}>
            {/* 프로젝트 탭 */}
            <Droppable droppableId="projects-bar" direction="horizontal" type="PROJECT">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="relative z-10 flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                  {projects.map((p, index) => (
                    <Draggable key={p} draggableId={`proj-${p}`} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                          className={`flex items-center rounded-full border transition overflow-hidden ${currentProject === p ? 'border-brand-cast/50 bg-gradient-to-r from-brand-cast/30 to-[#EFCF8E]/10 shadow-[0_0_20px_rgba(224,167,60,0.3)]' : theme === 'light' ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                          <button onClick={() => setCurrentProject(p)} title={t.rosterRenameHint}
                            onDoubleClick={() => renameProject(p)}
                            onContextMenu={(e) => { e.preventDefault(); renameProject(p); }}
                            className={`px-4 py-1.5 font-bold text-mini tracking-widest uppercase transition ${currentProject === p ? textMain : textSub}`}>{p}</button>
                          <button onClick={() => showConfirm(t.rosterDelete, t.rosterDeleteMsg(p), () => {
                            supabase.from('profiles').delete().eq('project', p).eq('user_id', user.id).then(async () => {
                              await supabase.from('roster_assignments').delete().eq('project', p).eq('user_id', user.id);
                              const next = projects.filter(proj => proj !== p); setProjects(next); await saveProjectOrder(user.id, next);
                              if (currentProject === p) setCurrentProject(next[0] || ''); setConfirmModal(null);
                            });
                          })} className="pr-3 text-zinc-400 hover:text-red-500 text-body">×</button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  <button onClick={() => showPrompt(t.newRoster, t.rosterNamePlaceholder, '', async (n) => { if (n) { const next = [...projects, n]; setProjects(next); await saveProjectOrder(user.id, next); setCurrentProject(n); } setPromptModal(null); })}
                    className={`px-3 py-1.5 rounded-full font-bold text-mini border border-dashed hover:text-brand-cast-text transition ${theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-500' : 'bg-white/5 border-white/10 text-zinc-400'}`}>+</button>
                </div>
              )}
            </Droppable>

            {/* 서브 헤더 */}
            <header className={`relative z-30 mb-6 border-b pb-4 ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
              {/* 1줄 */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {/* 프로젝트 이름은 바로 위 탭이 이미 말한다. 이 자리는 메모로 쓴다. */}
                  <input value={projectMemo} onChange={e => setProjectMemo(e.target.value)} onBlur={saveProjectMemo}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder={t.projMemoPlaceholder} aria-label={t.projMemoPlaceholder}
                    className={`field-bare bg-transparent border-0 text-lead font-bold outline-none w-56 sm:w-72 ${textMain} placeholder:text-zinc-500 placeholder:font-normal`} />
                  {votingOpen && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-micro font-bold text-[#77B18E]">{t.attending} {attendingCount}</span>
                      <span className="text-micro font-bold text-[#9A8F8A]">{t.absent} {absentCount}</span>
                      <span className={`text-micro font-bold ${textSub}`}>{t.noResponse} {noResponseCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* 한 줄 안에 입력·셀렉트·버튼이 섞이는 자리. 정렬이 어긋나던 이유가 둘이었다 —
                      (1) 컨테이너에 items-center가 없어 높이가 제각각 늘어났고,
                      (2) 전역 입력 규칙(밑줄+padding 0)이 여기서도 걸려 글자가 벽에 붙고
                          바 테두리와 밑줄이 두 겹이 됐다. field-bare로 그 규칙만 빼고,
                          간격은 컨테이너의 gap과 각 필드의 px로 준다. */}
                  <div className={`flex items-center p-1 pl-1.5 rounded-full border gap-1.5 shadow-lg backdrop-blur-md ${inputBg}`}>
                    <input value={name} onChange={e => setName(e.target.value)}
                      onCompositionStart={() => { isComposing.current = true; }}
                      onCompositionEnd={() => { isComposing.current = false; }}
                      onKeyDown={e => { if (e.key === 'Enter' && !isComposing.current) handleJoin(); }}
                      placeholder={t.namePlaceholder}
                      aria-label={t.namePlaceholder}
                      className={`field-bare bg-transparent border-0 rounded-full px-3 py-1.5 text-mini outline-none w-32 ${textMain}`} />
                    <span aria-hidden="true" className={`w-px self-stretch my-1 ${theme === 'light' ? 'bg-black/10' : 'bg-white/12'}`} />
                    <select value={role} onChange={e => setRole(e.target.value)} aria-label={lang === 'ko' ? '역할' : 'Role'}
                      className={`field-bare bg-transparent border-0 rounded-full text-mini font-bold outline-none px-2 py-1.5 cursor-pointer ${textMain}`}>
                      {ROLES.map(r => <option key={r} className={theme === 'light' ? 'bg-white' : 'bg-zinc-900'}>{r}</option>)}
                    </select>
                    <select value={gender} onChange={e => setGender(e.target.value)} aria-label={lang === 'ko' ? '성별' : 'Gender'}
                      className={`field-bare bg-transparent border-0 rounded-full text-mini font-bold outline-none px-2 py-1.5 cursor-pointer ${textMain}`}>
                      <option value="male" className={theme === 'light' ? 'bg-white' : 'bg-zinc-900'}>M</option>
                      <option value="female" className={theme === 'light' ? 'bg-white' : 'bg-zinc-900'}>F</option>
                    </select>
                    <button type="button" onClick={handleJoin} className={`px-4 py-2 rounded-full font-bold text-mini tracking-[0.08em] transition ${theme === 'light' ? 'bg-black text-white hover:bg-black/85' : 'bg-white text-black hover:bg-white/85'}`}>{t.join}</button>
                  </div>
                </div>
              </div>
              {/* 2줄 — 자주 쓰는 것만 밖에, 나머지는 더보기 안에 */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button onClick={addStudio} title={t.studioHint}
                  className={`px-4 py-2 rounded-full border font-bold text-mini transition text-brand-cast-text ${theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>{t.studio}</button>
                {(votingOpen || availPoll) && (
                  <button onClick={() => votingOpen
                    ? showConfirm(t.voteClose, t.closeVoteConfirm, async () => { await closeVoting(); setConfirmModal(null); })
                    : (setAvailSelDay(null), setShowAvailModal(true))}
                    className="px-4 py-2 rounded-full font-bold text-mini transition border bg-brand-cast/20 border-brand-cast/40 text-[#EFCF8E] hover:bg-brand-cast/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-cast animate-pulse" />
                    {votingOpen ? t.voteClose : `${t.availOpen} ${t.availLive}`}
                  </button>
                )}
                <button onClick={copyShareLink} className={`px-4 py-2 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.share}</button>
                <button onClick={() => setRandomModal(true)}
                  className="bg-brand-cast text-white px-5 py-2 rounded-full font-bold text-mini hover:opacity-90 transition uppercase tracking-[0.06em]">{t.random}</button>

                {/* 더보기 */}
                <div className="relative">
                  <button onClick={() => setMenuOpen(v => !v)} title={t.more}
                    aria-label={t.more} aria-expanded={menuOpen} className={`px-4 py-2 rounded-full border font-black text-body leading-none transition ${menuOpen ? 'border-brand-cast/50 text-brand-cast-text bg-brand-cast/10' : btnBg}`}>⋯</button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className={`absolute right-0 top-full mt-2 z-50 w-52 max-h-[70vh] overflow-y-auto rounded-xl border shadow-lg anim-rise ${theme === 'light' ? ' border-black/10' : 'bg-[#171717] border-white/10'}`}>
                        {([
                          [t.availOpen, () => { setAvailSelDay(null); setShowAvailModal(true); }, !!availPoll],
                          [votingOpen ? t.voteClose : t.voteOpen, () => votingOpen
                            ? showConfirm(t.voteClose, t.closeVoteConfirm, async () => { await closeVoting(); setConfirmModal(null); })
                            : setShowVotingModal(true), votingOpen],
                          [t.stats, () => setShowStats(true), false],
                          [t.notice, () => setShowNoticeBoard(!showNoticeBoard), showNoticeBoard],
                          [t.history, () => setShowSessionBoard(!showSessionBoard), showSessionBoard],
                          ['—', null, false],
                          [t.addFromArtists, () => { setShowArtistPanel(p => !p); if (!showArtistPanel) fetchArtists(user); }, showArtistPanel],
                          [t.artists, () => router.push('/roster/artists'), false],
                          [t.export, () => exportRoster(), false],
                        ] as const).map(([label, fn, active], i) => fn === null
                          ? <div key={i} className={`h-px my-1 ${theme === 'light' ? 'bg-black/8' : 'bg-white/8'}`} />
                          : (
                            <button key={i} onClick={() => { setMenuOpen(false); (fn as () => void)(); }}
                              className={`w-full text-left px-4 py-2.5 text-mini font-bold transition flex items-center justify-between gap-2
 ${active ? 'text-brand-cast-text' : textMain} ${theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
                              {label}{active && <span className="w-1.5 h-1.5 rounded-full bg-brand-cast" />}
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Day 탭 */}
            <div className="relative z-10 flex items-center justify-center gap-2 mb-6">
              {days.map(d => (
                <div key={d} className={`flex items-center rounded-full border overflow-hidden transition ${currentDay === d ? 'border-brand-cast/50 bg-gradient-to-r from-brand-cast/20 to-transparent' : theme === 'light' ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                  {editingDayName === d ? (
                    <input autoFocus value={dayNameInput} onChange={e => setDayNameInput(e.target.value)}
                      onBlur={() => saveDayName(d, dayNameInput || `Day ${d}`)}
                      onKeyDown={e => { if (e.key === 'Enter') saveDayName(d, dayNameInput || `Day ${d}`); if (e.key === 'Escape') setEditingDayName(null); }}
                      className="bg-transparent px-3 py-1.5 text-mini font-bold outline-none text-brand-cast-text w-24" />
                  ) : (
                    <button onClick={() => setCurrentDay(d)} title={t.dayRenameHint}
                      onDoubleClick={() => { setEditingDayName(d); setDayNameInput(dayNames[d] || `Day ${d}`); }}
                      onContextMenu={(e) => { e.preventDefault(); setEditingDayName(d); setDayNameInput(dayNames[d] || `Day ${d}`); }}
                      className={`px-4 py-1.5 font-bold text-mini transition ${currentDay === d ? 'text-brand-cast-text' : textSub}`}>{getDayLabel(d)}</button>
                  )}
                  <label title={t.daySetDate} className={`relative px-1.5 cursor-pointer text-mini transition ${dayDates[d] ? 'text-brand-cast-text' : 'text-zinc-400 hover:text-brand-cast-text'}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
                    <input type="date" aria-label={t.daySetDate} value={dayDates[d] || ''} onChange={e => saveDayDate(d, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </label>
                  {days.length > 1 && <button onClick={() => showConfirm(t.dayDelete(getDayLabel(d)), t.dayDeleteMsg(getDayLabel(d)), () => { removeDay(d); setConfirmModal(null); })} aria-label={t.dayDelete(getDayLabel(d))} className="pr-3 text-zinc-500 hover:text-red-500 text-mini">×</button>}
                </div>
              ))}
              <button onClick={addDay} className={`px-3 py-1.5 rounded-full font-bold text-mini border border-dashed hover:text-brand-cast-text transition ${theme === 'light' ? 'bg-black/5 border-black/10 text-zinc-500' : 'bg-white/5 border-white/10 text-zinc-400'}`}>{t.addDay}</button>
            </div>

            {/* 공지사항 */}
            {showNoticeBoard && (
              <div className={`relative z-10 mb-8 rounded-xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : '/[0.03] border-white/10'}`}>
                <div className="flex items-center justify-between mb-5">
                  <p className={`font-black text-lead ${textMain}`}><i className="ti ti-speakerphone" aria-hidden="true"></i> {t.noticeTitle}</p>
                  <button onClick={() => { setNoticeTitle(''); setNoticeContent(''); setNoticeIsGlobal(false); setEditingNoticeId(null); setShowNoticeModal(true); }} className={`px-4 py-2 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.noticeAdd}</button>
                </div>
                {notices.length === 0 ? <p className={`text-mini ${textSub}`}>{t.noNotice}</p> : (
                  <div className="flex flex-col gap-3">
                    {notices.map(n => (
                      <div key={n.id} className={`cv-row flex items-start justify-between p-4 rounded-xl border ${theme === 'light' ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 /[0.02]'}`}>
                        <div className="flex-1">
                          <p className={`font-bold text-body mb-1 ${textMain}`}>{n.title}</p>
                          {n.content && <p className={`text-mini leading-relaxed whitespace-pre-line ${textSub}`}>{n.content}</p>}
                          <p className="text-zinc-400 text-micro mt-2">{fmtDate(n.created_at)}</p>
                        </div>
                        <div className="flex gap-2 ml-4 shrink-0">
                          <button onClick={() => { setNoticeTitle(n.title); setNoticeContent(n.content || ''); setNoticeIsGlobal(n.is_global || false); setEditingNoticeId(n.id); setShowNoticeModal(true); }} className={`text-mini font-bold ${textSub}`}>{t.edit}</button>
                          <button onClick={() => showConfirm(t.noticeDelete, t.noticeDeleteMsg(n.title), () => { supabase.from('notices').delete().eq('id', n.id).then(() => { fetchNotices(user); setConfirmModal(null); }); })} className="text-zinc-400 hover:text-red-500 text-mini font-bold">{t.delete}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 세션 히스토리 */}
            {showSessionBoard && (
              <div className={`relative z-10 mb-8 rounded-xl border backdrop-blur-md p-6 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : '/[0.03] border-white/10'}`}>
                <div className="flex items-center justify-between mb-5">
                  <p className={`font-black text-lead ${textMain}`}><i className="ti ti-history" aria-hidden="true"></i> {t.history}</p>
                  <button onClick={() => setShowSessionModal(true)} className={`px-4 py-2 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.saveSession}</button>
                </div>
                {Object.keys(sessionsByCamp).length === 0 ? <p className={`text-mini ${textSub}`}>{t.noSession}</p> : (
                  <div className="flex flex-col gap-4">
                    {Object.entries(sessionsByCamp).map(([campName, campSessions]: any) => (
                      <div key={campName}>
                        <p className={`text-mini font-black uppercase tracking-widest mb-2 ${textSub}`}>{campName}</p>
                        <div className="flex flex-col gap-2">
                          {campSessions.sort((a: any, b: any) => a.day_number - b.day_number).map((s: any) => (
                            <div key={s.id} className={`rounded-xl border overflow-hidden ${theme === 'light' ? 'border-black/10 bg-black/[0.02]' : 'border-white/10 /[0.02]'}`}>
                              <div className="flex items-center justify-between p-4 cursor-pointer" {...pressable(() => setExpandedSession(expandedSession === s.id ? null : s.id))}>
                                <div className="flex items-center gap-3"><span className="text-brand-cast-text font-black text-body">Day {s.day_number}</span>{s.memo && <span className={`text-mini truncate max-w-[200px] ${textSub}`}>{s.memo}</span>}</div>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-400 text-micro">{fmtDate(s.created_at)}</span>
                                  <button onClick={(e) => { e.stopPropagation(); showConfirm(t.sessionDelete, t.sessionDeleteMsg(s.day_number), () => { supabase.from('sessions').delete().eq('id', s.id).then(() => { fetchSessions(user); setConfirmModal(null); }); }); }} aria-label={t.sessionDelete} className="text-zinc-500 hover:text-red-500 text-mini">×</button>
                                  <span className="text-zinc-400 text-micro">{expandedSession === s.id ? '▲' : '▼'}</span>
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
                                      showToastMsg(lang === 'ko' ? '로스터 불러옴' : 'Roster loaded');
                                    });
                                  }} className="mb-3 px-3 py-1.5 rounded-full bg-brand-cast/20 text-brand-cast-text text-mini font-bold border border-brand-cast/30 hover:bg-brand-cast/30 transition">
                                    {lang === 'ko' ? '⬆ 현재 로스터로 불러오기' : '⬆ Load to Current Roster'}
                                  </button>
                                  <div className="flex flex-wrap gap-4">
                                    {s.roster.map((t: any) => (<div key={t.team} className="flex-1 min-w-[150px]"><p className={`text-micro font-black uppercase tracking-widest mb-2 border-l-2 border-brand-cast pl-2 ${textSub}`}>{t.team}</p>{t.members.map((m: any, i: number) => (<div key={i} className="flex items-center gap-1.5 mb-1"><span className={`text-mini font-bold ${textMain}`}>{m.name}</span><span className="text-zinc-400 text-micro uppercase">{m.role.slice(0, 3)}</span></div>))}</div>))}
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
              <div className={`relative z-10 mb-6 rounded-xl border backdrop-blur-md p-4 ${theme === 'light' ? 'bg-black/[0.02] border-black/10' : '/[0.03] border-white/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`font-black text-body ${textMain}`}><i className="ti ti-microphone" aria-hidden="true"></i> Artists</p>
                  <div className="flex items-center gap-2">
                    <input value={artistSearch} onChange={e => setArtistSearch(e.target.value)}
                      placeholder={lang === 'ko' ? '검색' : 'Search'}
                      className={`px-3 py-1.5 rounded-lg text-mini outline-none border w-32 ${inputBg} ${textMain} placeholder:text-zinc-500`} />
                    <button onClick={() => setShowArtistPanel(false)} aria-label={lang === 'ko' ? '닫기' : 'Close'} className="text-zinc-400 hover:text-red-400 text-lead">×</button>
                  </div>
                </div>
                {artistList.length === 0 ? (
                  <p className={`text-mini ${textSub}`}>{lang === 'ko' ? '아티스트가 없어요.' : 'No artists.'}</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {ROLES.map(r => {
                      const group = artistList.filter(a =>
                        a.role === r && (a.name.toLowerCase().includes(artistSearch.toLowerCase()))
                      );
                      if (group.length === 0) return null;
                      return (
                        <div key={r}>
                          <p className="text-micro font-black uppercase tracking-widest mb-2" style={{ color: ROLE_COLORS[r] + '99' }}>{r}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.map(artist => {
                              const inRoster = members.some(m => m.project === currentProject && m.name === artist.name);
                              return (
                                <button key={artist.id} onClick={() => !inRoster && addArtistToRoster(artist)} disabled={inRoster}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-full border text-left transition ${inRoster ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-[1.02] ' + (theme === 'light' ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10')}`}>
                                  {artist.photo_url && <img src={artist.photo_url} alt="" width={24} height={24} loading="lazy" className="w-6 h-6 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />}
                                  <span className={`text-mini font-bold ${textMain}`}>{artist.name}</span>
                                  <span className={`text-micro ${textSub}`}>{artist.gender === 'female' ? 'F' : 'M'}</span>
                                  {inRoster ? <span className="text-micro text-zinc-400 font-black">✓</span> : <span className="text-micro text-brand-cast-text font-black">+</span>}
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

            {/* 출석 현황 — 참석/불참 분리 + 초기화 */}
            {(attendingCount + absentCount) > 0 && (
              <div className={`relative z-10 mb-6 rounded-xl border p-4 ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-micro font-bold uppercase tracking-[0.2em] ${textSub}`}>{lang === 'ko' ? '출석 현황' : 'Attendance'}</p>
                  <button onClick={() => showConfirm(lang === 'ko' ? '출석 초기화' : 'Reset attendance', lang === 'ko' ? '모든 참석/불참 응답을 초기화할까요?' : 'Reset all attendance responses?', async () => { await resetAttendance(); setConfirmModal(null); })}
                    className={`text-micro font-bold px-2.5 py-1 rounded-full border transition ${btnBg}`}>{lang === 'ko' ? '초기화' : 'Reset'}</button>
                </div>
                <div className="flex flex-wrap gap-x-7 gap-y-3">
                  {([['attending', attendingMembers, '#77B18E', t.attending], ['absent', absentMembers, '#9A8F8A', t.absent]] as const)
                    .filter(([, list]) => list.length > 0)
                    .map(([key, list, color, label]) => (
                    <div key={key} className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-micro font-black uppercase tracking-widest shrink-0" style={{ color: color + '99' }}>{label} {list.length}</p>
                      {list.map((m: any) => (
                        <span key={m.id} className="flex items-center gap-1.5 text-mini font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: color + '14', color: color }}>
                          <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: genderColor(m.gender, theme === 'dark') }} />
                          {m.name}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 풀 ↔ 스튜디오 좌우 분할 ──────────────────────────────────────
                예전엔 풀이 위, 스튜디오가 아래였다. 풀이 길어지면 스튜디오가 화면 밖으로
                나가서 "끌고 갈 곳을 못 보면서" 끌게 됐다. 좌우로 나누면 출발지와 목적지가
                항상 같이 보이고, 드래그 방향도 좌→우로 일정해진다.
                경계는 선이 아니라 바탕 톤 차이로 만든다 — 풀 surface-1 / 스튜디오는 페이지 바탕.
                ⚠️ lg 미만에서는 위아래로 쌓인다. 그때는 원래 문제가 돌아오므로
                   좁은 화면에서 풀을 접는 건 따로 해야 한다. */}
            <div className="relative z-10 mb-10 grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 lg:gap-0">
            {/* ── 로스터 풀 (좌) ────────────────────────────────────────────────
                역할 3행 × 성별 2열 격자였는데, 여자 PRO·남자 ENG처럼 빈 칸이 생겨
                6칸 중 2칸이 자리만 먹었다. 성별을 열에서 빼서 칩의 점으로 내리고
                역할당 한 줄을 통으로 쓴다 — 빈 칸이 원리적으로 안 생기고 드롭 타깃도 넓어진다.
                성비는 위 한 줄로 남긴다(열로 세던 걸 숫자가 대신한다). */}
            <div className={`relative z-10 lg:pr-5 lg:-my-3 lg:py-3 lg:-ml-3 lg:pl-3 rounded-xl ${theme === 'light' ? 'lg:bg-black/[0.02]' : 'lg:bg-white/[0.02]'}`}>
              <div className="flex items-center justify-center gap-2 mb-2.5">
                <h2 className={`text-micro font-bold uppercase tracking-[0.2em] ${textSub}`}>{t.rosterPool}</h2>
                <button onClick={() => { setShowArtistPanel(p => !p); if (!showArtistPanel) fetchArtists(user); }}
                  aria-label={t.addFromArtists} title={t.addFromArtists}
                  className={`w-5 h-5 rounded-full border leading-none text-mini font-black transition ${showArtistPanel ? 'border-brand-cast/60 text-brand-cast-text' : theme === 'light' ? 'border-black/15 text-black/40 hover:text-black' : 'border-white/15 text-white/40 hover:text-white'}`}>+</button>
              </div>
              <div className="flex items-center justify-center gap-4 mb-3.5">
                {(['male', 'female'] as const).map(g => {
                  const n = members.filter(m => m.project === currentProject && poolOrder.flat().includes(m.role)
                    && !getAssignment(m.id) && (m.gender === 'female' ? 'female' : 'male') === g).length;
                  return (
                    <span key={g} className="flex items-center gap-2">
                      <i className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: genderColor(g, theme === 'dark') }} />
                      <span className={`font-mono-num text-micro uppercase tracking-[0.16em] ${textSub}`}>
                        {g === 'male' ? (lang === 'ko' ? '남' : 'M') : (lang === 'ko' ? '여' : 'F')}
                      </span>
                      <span className={`font-mono-num text-micro tabular ${theme === 'light' ? 'text-black/35' : 'text-white/35'}`}>{n}</span>
                    </span>
                  );
                })}
              </div>
              <Droppable droppableId="pool-roles" type="ROLEROW">
                {(dp) => (
                  <div ref={dp.innerRef} {...dp.droppableProps} className="flex flex-col gap-4">
                    {poolOrder.map((roles, ridx) => {
                      const r = roles[0];
                      const poolMembers = members.filter(m => m.project === currentProject && roles.includes(m.role) && !getAssignment(m.id)).sort((a, b) => a.name.localeCompare(b.name));
                      return (
                        <Draggable key={r} draggableId={`poolrole-${r}`} index={ridx}>
                        {(rp) => (
                        <div ref={rp.innerRef} {...rp.draggableProps}>
                          {/* 배너 = 역할 구획의 머리이자 행 재정렬 손잡이.
                              세 역할 모두 같은 색이라 구분은 글자가 한다 (ROLE_BANNER 주석 참고). */}
                          <div
                            {...rp.dragHandleProps}
                            className="flex items-center justify-center gap-2.5 px-3.5 py-2 mb-2.5 rounded-xl select-none cursor-grab active:cursor-grabbing text-lead font-bold tracking-[0.04em]"
                            style={{ backgroundColor: ROLE_BANNER.bg, color: ROLE_BANNER.fg }}
                          >
                            {roles.length > 1 ? 'ENG / A&R' : r.toUpperCase()}
                            <span className="font-mono-num text-micro tracking-[0.14em] opacity-60">{poolMembers.length}</span>
                          </div>
                          <Droppable droppableId={`pool_${r}`} direction="horizontal" type="MEMBER">
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={[
                                  // 2열 격자. 각 칸 안에서 가운데 정렬 — 가운데 축을 기점으로 좌우가 마주본다.
                                  'grid grid-cols-2 justify-items-center content-start gap-x-2 gap-y-1 rounded-xl transition-colors px-1 py-1.5',
                                  poolMembers.length === 0 ? 'min-h-[34px]' : 'min-h-[40px]',
                                  // 칩에 배경이 없어졌으므로 "여기 놓을 수 있다"는 신호를 드래그 중에 더 세게 켠다
                                  snapshot.isDraggingOver
                                    ? (theme === 'light' ? 'bg-black/[0.06] ring-1 ring-black/10' : 'bg-white/[0.08] ring-1 ring-white/15')
                                    : '',
                                ].join(' ')}
                              >
                                {poolMembers.map((m, i) => (
                                  <PortalDraggable key={m.id} draggableId={String(m.id)} index={i}>
                                    <div
                                      onContextMenu={(e) => { e.preventDefault(); setRoleDropdown({ id: m.id, x: e.clientX, y: e.clientY, excluded: m.excluded }); }}
                                      onDoubleClick={() => setLinkModal(m)}
                                      className={`group relative flex items-center justify-center gap-2 px-3 py-1 rounded-lg cursor-pointer min-w-0 max-w-full transition-colors ${theme === 'light' ? 'hover:bg-black/[0.05]' : 'hover:bg-white/[0.06]'} ${isBusyOn(m.id) ? 'opacity-45' : ''}`}
                                      title={isBusyOn(m.id) ? `${getDayLabel(currentDay)} ${t.busy}` : undefined}
                                    >
                                      {/* 점 = 성별. 풀에 남은 유일한 색이다 (역할은 배너가 말한다). */}
                                      <i className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: genderColor(m.gender, theme === 'dark') }} />
                                      {editingId === String(m.id) ? (
                                        <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => updateMemberName(m.id)} onKeyDown={e => e.key === 'Enter' && updateMemberName(m.id)} className={`bg-transparent border-b outline-none text-body font-bold w-full ${theme === 'light' ? 'border-black text-black' : 'border-white text-white'}`} />
                                      ) : (
                                        <span onClick={() => { setEditingId(String(m.id)); setEditValue(m.name); }} className={`text-body font-semibold flex items-center gap-1.5 cursor-pointer truncate ${m.excluded ? 'line-through text-zinc-400' : textMain}`}>
                                          {m.name}
                                          {getAttendanceBadge(m.attendance)}
                                          {isBusyOn(m.id) && <span className="text-micro font-black px-1 py-0.5 rounded-full shrink-0" style={{ color: '#E0575F', backgroundColor: '#E0575F22' }}>{t.busy}</span>}
                                          {m.links?.length > 0 && <i className="ti ti-link text-micro shrink-0 opacity-40" aria-hidden="true" />}
                                        </span>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); showConfirm(t.memberDelete, t.memberDeleteMsg(m.name), () => { deleteMember(m.id); setConfirmModal(null); }); }} aria-label={t.memberDelete} className="absolute -right-1 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-red-400 text-body leading-none px-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity">×</button>
                                    </div>
                                  </PortalDraggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        )}
                        </Draggable>
                      );
                    })}
                    {dp.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* 스튜디오 보드 (우) */}
            <div className="relative z-10 min-w-0 lg:pl-6">
            <Droppable droppableId="teams-board" direction="horizontal" type="TEAM">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} id="roster-board" title={t.studioHint}
                  onContextMenu={(e) => { if ((e.target as HTMLElement).closest('[data-studio-card]')) return; e.preventDefault(); addStudio(); }}
                  className="relative z-10 flex flex-wrap gap-6 items-start pb-20 min-h-[200px]">
                  {otherTeams.map((tName, idx) => {
                    const dayMembersForTeam = getDayMembers(tName) as any[];
                    return (
                      <Draggable key={tName} draggableId={`team-${tName}`} index={idx}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} data-studio-card className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] xl:w-[calc(25%-18px)]">
                            <div className={`group/studio border rounded-xl p-6 min-h-[320px] shadow-lg flex flex-col ${cardBg}`}>
                              {/* 제목 = 풀의 역할 배너와 같은 물건. 좌우 두 칸이 같은 방식으로 "여기는 구획이다"를 말한다. */}
                              <div {...provided.dragHandleProps} className="relative flex items-center justify-center -m-6 mb-5 px-4 py-2.5 rounded-t-xl cursor-grab active:cursor-grabbing"
                                style={{ backgroundColor: OAT.banner, color: OAT.ink }}>
                                <div className="flex flex-col items-center gap-1.5 flex-1">
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
                                      className={`bg-transparent border-b outline-none text-body font-black uppercase w-full ${theme === 'light' ? 'border-black text-black' : 'border-white text-white'}`} />
                                  ) : (
                                    <h2 onClick={() => { setEditingTeam(tName); setTeamEditValue(tName); }} className="text-lead font-bold uppercase tracking-[0.04em] text-center cursor-pointer hover:opacity-80 transition-opacity">{tName}</h2>
                                  )}
                                </div>
                                <button onClick={() => showConfirm(t.studioDelete, t.studioDeleteMsg(tName), async () => {
                                  // 해당 팀 assignments 삭제
                                  await supabase.from('roster_assignments').delete().eq('team', tName).eq('project', currentProject).eq('day_number', currentDay).eq('user_id', user.id);
                                  const next = teams.filter(t => t !== tName); setTeams(next);
                                  await saveTeamOrder(user.id, currentProject, currentDay, next);
                                  fetchAssignments(user); setConfirmModal(null);
                                })} aria-label={t.studioDelete} className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-red-600 text-lead leading-none opacity-0 group-hover/studio:opacity-60 transition-opacity">×</button>
                              </div>
                              <Droppable droppableId={tName} type="MEMBER">
                                {(provided) => (
                                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-1.5 flex-1 min-h-[100px]">
                                    {/* 역할은 글씨로 쓰지 않고 '칸'으로만 나눈다 — 역할 순 정렬 후
                                        역할이 바뀌는 자리에만 여백+헤어라인. index는 정렬 후 평면 인덱스라 DnD 그대로 동작. */}
                                    {[...dayMembersForTeam].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role)).map((m, i, arr) => (
                                      <PortalDraggable key={`${m.id}-${currentDay}`} draggableId={String(m.id)} index={i}>
                                        <div
                                          onContextMenu={(e) => { e.preventDefault(); setRoleDropdown({ id: m.id, x: e.clientX, y: e.clientY, excluded: m.excluded }); }}
                                          onDoubleClick={() => setLinkModal(m)}
                                          className={`group relative flex justify-center items-center px-3 py-3 rounded-xl overflow-hidden cursor-pointer ${isBusyOn(m.id) ? 'ring-1 ring-[#E0575F]/50' : ''} ${i > 0 && arr[i - 1].role !== m.role ? 'mt-2.5' : ''}`}
                                          style={{
                                            backgroundColor: OAT.box, color: OAT.ink,
                                            borderTopLeftRadius: 0,
                                            opacity: m.excluded ? 0.45 : 1,
                                            // 앞 사람과 역할이 다르면 위에 선을 그어 칸을 가른다
                                            boxShadow: i > 0 && arr[i - 1].role !== m.role
                                              ? `0 -10px 0 -9px ${theme === 'light' ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.14)'}` : undefined,
                                          }}
                                        >
                                          {/* 좌상단 노치 = 성별 */}
                                          <i aria-hidden="true" className="absolute left-0 top-0 w-4 h-4"
                                            style={{
                                              backgroundColor: m.gender === 'female' || m.gender === 'F' || m.gender === '여' ? GENDER_NOTCH.female : GENDER_NOTCH.male,
                                              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                                            }} />
                                          <div className="flex items-center justify-center gap-2 overflow-hidden flex-1 pl-1">
                                            {editingId === String(m.id) ? (
                                              <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => updateMemberName(m.id)} onKeyDown={e => e.key === 'Enter' && updateMemberName(m.id)} className={`bg-transparent border-b outline-none text-body font-bold w-full ${theme === 'light' ? 'border-black text-black' : 'border-white text-white'}`} />
                                            ) : (
                                              <div className="flex flex-col items-center text-center overflow-hidden">
                                                <span onClick={(e) => { e.stopPropagation(); setEditingId(String(m.id)); setEditValue(m.name); }} className={`text-lead font-bold flex items-center gap-1.5 cursor-pointer truncate ${m.excluded ? 'line-through' : ''}`}>
                                                  {m.name}
                                                  <span className="opacity-45 shrink-0">({ROLE_TAG[m.role] || m.role[0]})</span>
                                                  {getAttendanceBadge(m.attendance)}
                                                  {isBusyOn(m.id) && <span className="text-micro font-black px-1.5 py-0.5 rounded-full shrink-0" style={{ color: '#E0575F', backgroundColor: '#E0575F22', border: '1px solid #E0575F55' }}>{t.busy}</span>}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <button onClick={(e) => { e.stopPropagation(); unassignMember(m.id); }} aria-label={t.memberDelete} className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-red-600 text-lead px-1 opacity-0 group-hover:opacity-60 transition-opacity">×</button>
                                        </div>
                                      </PortalDraggable>
                                    ))}
                                    {provided.placeholder}
                                    <button
                                      onClick={(e) => setAddToTeam({ team: tName, x: e.clientX, y: e.clientY })}
                                      title={t.studioAddMember} aria-label={t.studioAddMember}
                                      className={`mt-1.5 w-full py-2 rounded-xl border border-dashed text-lead font-bold leading-none transition
 ${theme === 'light' ? 'border-black/12 text-black/25 hover:text-black/60 hover:border-black/25' : 'border-white/12 text-white/25 hover:text-white/60 hover:border-white/25'}`}>+</button>
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
            </div>
            </div>
          </DragDropContext>

          <div className="relative z-10 mt-8 pb-8 text-center">
            <p className={`text-mini font-medium ${textSub}`}>{t.contact}</p>
          </div>
        </main>
      </div>

      {/* 첫 로스터 모달 */}
      {showFirstRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-ui">
          <div className={`w-full max-w-sm mx-4 border rounded-xl p-8 shadow-lg ${theme === 'light' ? ' border-black/10' : 'bg-[#111] border-white/10'}`}>
            <div className="text-center mb-6">
              <h1 className="font-display text-display text-brand-cast-text uppercase tracking-tighter mb-2">CAST</h1>
              <p className={`text-body ${textSub}`}>{t.firstRosterTitle}</p>
            </div>
            <input autoFocus value={firstRosterName} onChange={e => setFirstRosterName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createFirstRoster()}
              placeholder={t.firstRosterPlaceholder}
              className={`w-full border rounded-xl px-4 py-3 text-body outline-none focus:border-brand-cast/50 transition mb-4 ${inputBg} ${textMain} placeholder:text-zinc-500`} />
            <button onClick={createFirstRoster} disabled={!firstRosterName.trim()}
              className="w-full py-3 rounded-full bg-brand-cast text-white font-semibold text-body uppercase tracking-widest hover:opacity-90 transition disabled:opacity-40">{t.start}</button>
          </div>
        </div>
      )}

      {/* 링크 모달 */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-ui">
          <div className={`w-full max-w-sm mx-4 border rounded-xl p-6 shadow-lg ${theme === 'light' ? ' border-black/10' : 'bg-[#111] border-white/10'}`}>
            <h2 className={`font-black text-lead mb-1 ${textMain}`}>{linkModal.name}</h2>
            <p className={`text-mini mb-4 ${textSub}`}>{t.linkAdd}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_LINKS.map(({ label, prefix }) => (<button key={prefix} onClick={() => setNewLink(prefix)} className={`px-3 py-1.5 rounded-full border text-mini font-bold transition ${btnBg}`}>{label}</button>))}
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newLink} onChange={e => setNewLink(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newLink.trim()) { const l = [...(linkModal.links || []), newLink.trim()]; setLinkModal({ ...linkModal, links: l }); saveMemberLinks(linkModal.id, l); setNewLink(''); }}}
                placeholder={t.linkPlaceholder} className={`flex-1 border rounded-xl px-4 py-2.5 text-mini outline-none transition ${inputBg} ${textMain} placeholder:text-zinc-500`} />
              <button onClick={() => { if (!newLink.trim()) return; const l = [...(linkModal.links || []), newLink.trim()]; setLinkModal({ ...linkModal, links: l }); saveMemberLinks(linkModal.id, l); setNewLink(''); }}
                className={`px-4 py-2.5 rounded-full border font-black text-mini transition ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.add}</button>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {(linkModal.links || []).map((link: string, i: number) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme === 'light' ? ' border-black/10' : ' border-white/10'}`}>
                  <span className="text-mini">{getLinkIcon(link)}</span>
                  <a href={link} target="_blank" rel="noopener noreferrer" className={`text-mini truncate flex-1 ${textSub}`}>{link}</a>
                  <button onClick={() => { const l = (linkModal.links || []).filter((_: string, idx: number) => idx !== i); setLinkModal({ ...linkModal, links: l }); saveMemberLinks(linkModal.id, l); }} aria-label={t.delete} className="text-zinc-400 hover:text-red-500 shrink-0">×</button>
                </div>
              ))}
              {(linkModal.links || []).length === 0 && <p className="text-zinc-500 text-mini">{t.noLink}</p>}
            </div>
            <button onClick={() => { setLinkModal(null); setNewLink(''); }} className={`w-full py-3 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.close}</button>
          </div>
        </div>
      )}

      {/* 세션 저장 모달 */}
      {showSessionModal && (
        <Modal title={t.sessionSave} theme={theme}>
          <div className="flex flex-col gap-3 mb-5">
            <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.campName}</label><input value={sessionCampName} onChange={e => setSessionCampName(e.target.value)} placeholder={t.campPlaceholder} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
            <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.day}</label><input type="number" value={sessionDayNumber} onChange={e => setSessionDayNumber(e.target.value)} min="1" className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition ${inputBg} ${textMain}`} /></div>
            <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.memo}</label><input value={sessionMemo} onChange={e => setSessionMemo(e.target.value)} placeholder={t.memoPlaceholder} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowSessionModal(false)} className={`flex-1 py-3 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
            <button onClick={saveSession} className={`flex-1 py-3 rounded-full border font-black text-mini transition ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.save}</button>
          </div>
        </Modal>
      )}

      {/* 공지 모달 */}
      {showNoticeModal && (
        <Modal title={editingNoticeId ? t.noticeEdit : t.noticeAddTitle} theme={theme}>
          <div className="flex flex-col gap-3 mb-5">
            <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.noticeTitleLabel}</label><input value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder={t.noticeTitlePlaceholder} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
            <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.noticeContentLabel}</label><textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} placeholder={t.noticeContentPlaceholder} rows={4} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition resize-none ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowNoticeModal(false)} className={`flex-1 py-3 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
            <button onClick={saveNotice} className={`flex-1 py-3 rounded-full border font-black text-mini transition ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.save}</button>
          </div>
        </Modal>
      )}

      {/* 투표 모달 */}
      {showVotingModal && (
        <Modal title={t.voteOpenTitle} theme={theme}>
          <div className="flex flex-col gap-3 mb-5">
            <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.voteTitleLabel}</label><input value={votingTitle} onChange={e => setVotingTitle(e.target.value)} placeholder={t.voteTitlePlaceholder} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
            <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.memo}</label><textarea value={votingMemo} onChange={e => setVotingMemo(e.target.value)} placeholder={t.voteMemoPlaceholder} rows={3} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition resize-none ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowVotingModal(false)} className={`flex-1 py-3 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
            <button onClick={openVoting} className="flex-1 py-3 rounded-full bg-brand-cast/20 border border-brand-cast/40 text-[#EFCF8E] font-black text-mini hover:bg-brand-cast/30 transition">{t.voteStart}</button>
          </div>
        </Modal>
      )}

      {/* 가능일 투표 모달 */}
      {showStats && (() => {
        const proj = members.filter(m => m.project === currentProject && !m.excluded);
        const total = proj.length;
        const byRole = ROLES.map(r => ({ r, n: proj.filter(m => m.role === r).length })).filter(x => x.n > 0);
        const male = proj.filter(m => m.gender === 'male' || m.gender === 'M' || m.gender === '남').length;
        const female = proj.filter(m => m.gender === 'female' || m.gender === 'F' || m.gender === '여').length;
        const att = { attending: 0, absent: 0, none: 0 };
        proj.forEach(m => { att[m.attendance === 'attending' ? 'attending' : m.attendance === 'absent' ? 'absent' : 'none']++; });
        const availTotal = availPoll ? proj.length : 0;
        const submitted = availPoll ? proj.filter(m => availSubs.some(s => s.member_id === m.id)).length : 0;
        const mostAvail = availPoll ? proj.map(m => ({ m, c: availPicks.filter(p => p.member_id === m.id && p.status === 'available').length })).filter(x => x.c > 0).sort((a, b) => b.c - a.c).slice(0, 5) : [];
        const bar = (label: string, n: number, tot: number, col: string) => (
          <div className="flex items-center gap-2.5">
            <span className={`text-mini font-bold w-16 shrink-0 ${textSub}`}>{label}</span>
            <div className={`flex-1 h-5 rounded-full overflow-hidden ${theme === 'light' ? 'bg-black/8' : 'bg-white/8'}`}><div className="h-full rounded-full" style={{ width: `${tot ? (n / tot) * 100 : 0}%`, backgroundColor: col }} /></div>
            <span className={`text-mini font-black w-8 text-right ${textMain}`}>{n}</span>
          </div>
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-ui p-4" onClick={() => setShowStats(false)}>
            <div role="dialog" aria-modal="true" tabIndex={-1} onClick={e => e.stopPropagation()} className={`w-full max-w-md max-h-[92vh] overflow-y-auto overscroll-contain-y border rounded-xl p-7 shadow-lg ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#111] border-white/10'}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className={`font-black text-lead ${textMain}`}>{t.statsTitle} <span className={`text-mini font-normal ${textSub}`}>{currentProject}</span></h2>
                <button onClick={() => setShowStats(false)} aria-label={lang === 'ko' ? '닫기' : 'Close'} className={`text-body ${textSub} hover:opacity-70`}>✕</button>
              </div>
              <div className="flex flex-col gap-5">
                <div className="flex gap-3">
                  <div className={`flex-1 rounded-xl border p-4 ${inputBg}`}><p className={`text-title font-black ${textMain}`}>{total}</p><p className={`text-mini ${textSub}`}>{t.statsMembers}</p></div>
                  <div className={`flex-1 rounded-xl border p-4 ${inputBg}`}><p className={`text-title font-black text-[#77B18E]`}>{att.attending}</p><p className={`text-mini ${textSub}`}>{t.attending}</p></div>
                  {(male > 0 || female > 0) && <div className={`flex-1 rounded-xl border p-4 ${inputBg}`}><p className={`text-lead font-black ${textMain}`}>{t.statsMale}{male} · {t.statsFemale}{female}</p><p className={`text-mini ${textSub}`}>{t.statsGender}</p></div>}
                </div>
                <div>
                  <p className={`text-mini font-black uppercase tracking-widest mb-2.5 ${textSub}`}>{t.statsRoles}</p>
                  <div className="flex flex-col gap-2">{byRole.map(({ r, n }) => bar(r, n, total, ROLE_COLORS[r] || '#888'))}</div>
                </div>
                <div>
                  <p className={`text-mini font-black uppercase tracking-widest mb-2.5 ${textSub}`}>{t.statsAttend}</p>
                  <div className="flex flex-col gap-2">
                    {bar(t.attending, att.attending, total, '#77B18E')}
                    {bar(t.absent, att.absent, total, '#9A8F8A')}
                    {bar(t.noResponse, att.none, total, theme === 'light' ? '#00000022' : '#ffffff22')}
                  </div>
                </div>
                <div>
                  <p className={`text-mini font-black uppercase tracking-widest mb-2.5 ${textSub}`}>{t.statsAvail}</p>
                  {!availPoll ? <p className={`text-body ${textSub}`}>{t.statsAvailNone}</p> : (
                    <>
                      {bar(t.availSubmitted, submitted, availTotal, '#E3B24A')}
                      {mostAvail.length > 0 && <>
                        <p className={`text-mini font-black mt-3 mb-2 ${textSub}`}>{t.statsMost}</p>
                        <div className="flex flex-col gap-2">{mostAvail.map(({ m, c }) => bar(m.name, c, mostAvail[0].c, ROLE_COLORS[m.role] || '#E3B24A'))}</div>
                      </>}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showAvailModal && (() => {
        const kicked: string[] = availPoll?.excluded_members || [];
        const projAll = members.filter(m => m.project === currentProject && !m.excluded);
        const proj = projAll.filter(m => !kicked.includes(m.id));
        const kickedMembers = projAll.filter(m => kicked.includes(m.id));
        const projIds = new Set(proj.map(m => m.id));
        const month = availPoll?.month || availMonth;
        const [yy, mm] = (month || '2025-01').split('-').map(Number);
        const daysInMonth = new Date(yy, mm, 0).getDate();
        const firstWeekday = new Date(yy, mm - 1, 1).getDay();
        const countOn = (d: number) => availPicks.filter(p => p.day === d && p.status === 'available' && projIds.has(p.member_id)).length;
        const noOn = (d: number) => availPicks.filter(p => p.day === d && p.status === 'unavailable' && projIds.has(p.member_id)).length;
        const maxCount = Math.max(1, proj.length);
        const membersOnDay = (d: number, st: string) => proj.filter(m => availPicks.some(p => p.member_id === m.id && p.day === d && p.status === st));
        const finals: number[] = availPoll?.final_days || [];
        const blocked: number[] = availPoll?.blocked_days || [];
        const best = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(d => !blocked.includes(d)).map(d => ({ d, c: countOn(d), mb: noOn(d) })).filter(x => x.c + x.mb > 0).sort((a, b) => (b.c - a.c) || (a.mb - b.mb)).slice(0, 6);
        const isSubmitted = (m: any) => availSubs.some(s => s.member_id === m.id);
        const selMember = availSelMember ? proj.find(m => m.id === availSelMember) : null;
        const memberStatusOn = (d: number): string | null => { if (!availSelMember) return null; const p = availPicks.find(x => x.member_id === availSelMember && x.day === d); return p ? p.status : null; };
        const selMemberDays = availSelMember ? availPicks.filter(p => p.member_id === availSelMember).sort((a, b) => a.day - b.day) : [];
        const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
        const wd = lang === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-ui p-4" onClick={() => { setShowAvailModal(false); setAvailSelMember(null); }}>
            <div role="dialog" aria-modal="true" tabIndex={-1} onClick={e => e.stopPropagation()} className={`w-full ${availPoll ? 'max-w-6xl' : 'max-w-md'} max-h-[92vh] overflow-y-auto overscroll-contain-y border rounded-xl p-7 sm:p-8 shadow-lg ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#111] border-white/10'}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className={`font-black text-lead ${textMain}`}>{t.availOpenTitle}</h2>
                <button onClick={() => setShowAvailModal(false)} aria-label={lang === 'ko' ? '닫기' : 'Close'} className={`text-body ${textSub} hover:opacity-70`}>✕</button>
              </div>

              {!availPoll ? (
                <div className="flex flex-col gap-3">
                  <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.availMonth}</label>
                    <input type="month" value={availMonth} onChange={e => setAvailMonth(e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-body outline-none ${inputBg} ${textMain}`} /></div>
                  <div><label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.availTitleLabel}</label>
                    <input value={availTitle} onChange={e => setAvailTitle(e.target.value)} placeholder={t.availTitlePlaceholder} className={`w-full border rounded-xl px-4 py-3 text-body outline-none ${inputBg} ${textMain} placeholder:text-zinc-500`} /></div>
                  <button onClick={openAvailPoll} className="mt-1 py-3 rounded-full bg-brand-cast/20 border border-brand-cast/40 text-[#EFCF8E] font-black text-mini hover:bg-brand-cast/30 transition">{t.availStart}</button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <p className={`text-lead font-bold truncate ${textMain}`}>{availPoll.title || `${yy}. ${String(mm).padStart(2, '0')}`} <span className={`text-mini font-normal ${textSub}`}>· {t.availSubmitted} {availSubs.filter(s => projIds.has(s.member_id)).length}/{proj.length}</span></p>
                      <input type="month" value={availPoll.month || ''} onChange={e => changeAvailMonth(e.target.value)}
                        title={t.availMonthChange} aria-label={t.availMonthChange}
                        className={`field-bare shrink-0 border rounded-full px-3 py-1 text-mini font-bold outline-none cursor-pointer transition ${btnBg}`} />
                    </div>
                    <button onClick={copyAvailShareLink} className={`shrink-0 text-mini font-bold px-3.5 py-1.5 rounded-full border transition ${btnBg}`}>{t.availCopyAll}</button>
                  </div>

                  <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 items-start">
                    {/* 좌: 달력 + 선택일 + 베스트 */}
                    <div className="flex flex-col gap-5">
                      {/* 히트맵 달력 */}
                      <div>
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <p className={`text-mini ${availBlockMode ? 'text-[#C98BA0]' : textSub}`}>{availBlockMode ? t.availBlockHint : ''}</p>
                          <button onClick={() => { setAvailBlockMode(v => !v); setAvailSelDay(null); }}
                            className={`shrink-0 text-mini font-black px-3.5 py-1 rounded-full border transition ${availBlockMode ? 'bg-[#C98BA0]/25 border-[#C98BA0]/50 text-[#E3B8C6]' : `${btnBg}`}`}>
                            {availBlockMode ? t.availBlockDone : t.availBlockMode}</button>
                        </div>
                        {selMember && (
                          <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-lg border border-[#5FA39A]/40 bg-[#5FA39A]/10">
                            <p className="text-mini font-black text-[#8FD4C8]">{selMember.name} · {t.availPossible} {selMemberDays.filter((p: any) => p.status === 'available').length} · {t.availNo} {selMemberDays.filter((p: any) => p.status === 'unavailable').length}{selMemberDays.length === 0 ? ` · ${t.availWaiting}` : ''}</p>
                            <button onClick={() => setAvailSelMember(null)} aria-label={lang === 'ko' ? '선택 해제' : 'Clear selection'} className="shrink-0 text-mini font-black text-[#8FD4C8] hover:opacity-70">✕</button>
                          </div>
                        )}
                        <div className="grid grid-cols-7 gap-1.5 mb-1.5">{wd.map((w, i) => <div key={i} className={`text-center text-micro font-black ${i === 0 ? 'text-[#C98BA0]' : i === 6 ? 'text-[#5FA39A]' : textSub}`}>{w}</div>)}</div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {cells.map((d, i) => {
                            if (d === null) return <div key={`e${i}`} />;
                            const c = countOn(d); const isFinal = finals.includes(d); const isBlocked = blocked.includes(d); const sel = availSelDay === d;
                            const mst = memberStatusOn(d); // 선택 멤버가 이 날 고른 상태
                            const dimByMember = !!availSelMember && !mst && !isBlocked;
                            return (
                              <button key={d} onClick={() => availBlockMode ? toggleBlockedDay(d) : setAvailSelDay(sel ? null : d)}
                                className={`relative aspect-square rounded-lg border flex flex-col items-center justify-center transition hover:scale-[1.05]
 ${isFinal ? 'ring-2 ring-brand-cast' : ''} ${sel ? (theme === 'light' ? 'outline outline-1 outline-black/40' : 'outline outline-1 outline-white/50') : ''}
                                  ${mst === 'available' ? 'ring-2 ring-[#4C8DF6]' : mst === 'unavailable' ? 'ring-2 ring-[#E0575F]' : ''}
                                  ${isBlocked ? 'border-[#C98BA0]/50' : theme === 'light' ? 'border-black/8' : 'border-white/8'} ${dimByMember ? 'opacity-35' : ''}`}
                                style={{ backgroundColor: isBlocked ? 'rgba(201,139,160,0.18)' : c > 0 ? `rgba(76,141,246,${(0.10 + (c / maxCount) * 0.55).toFixed(3)})` : 'transparent' }}>
                                <span className={`text-body font-bold ${isBlocked ? 'text-[#C98BA0] line-through' : textMain}`}>{d}</span>
                                {!isBlocked && c > 0 && <span className={`text-micro font-black ${textSub}`}>{c}</span>}
                                {isFinal && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-cast" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 선택한 날 멤버 */}
                      {availSelDay !== null && (
                        <div className={`rounded-xl border p-4 ${inputBg}`}>
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <p className={`text-body font-black ${textMain}`}>{availSelDay}{lang === 'ko' ? '일' : ''} · {t.availPossible} {countOn(availSelDay)} · {t.availNo} {noOn(availSelDay)}</p>
                            <button onClick={() => toggleFinalDay(availSelDay)}
                              className={`shrink-0 text-mini font-black px-3.5 py-1 rounded-full border transition ${finals.includes(availSelDay) ? 'bg-brand-cast/25 border-brand-cast/50 text-[#EFCF8E]' : 'border-brand-cast/40 text-brand-cast-text hover:bg-brand-cast/15'}`}>
                              {finals.includes(availSelDay) ? t.availConfirmRemove : t.availConfirmAdd}</button>
                          </div>
                          {(() => {
                            const avail = membersOnDay(availSelDay, 'available');
                            const maybe = membersOnDay(availSelDay, 'unavailable');
                            const inDay = new Set([...avail, ...maybe].map(m => m.id));
                            const rest = proj.filter(m => !inDay.has(m.id));
                            const addChips = rest.length > 0 && (
                              <div className={`mt-2.5 pt-2.5 border-t ${theme === 'light' ? 'border-black/8' : 'border-white/8'}`}>
                                <p className={`text-micro font-black uppercase tracking-widest mb-1.5 ${textSub}`}>{t.availDayAdd}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {rest.map(m => (
                                    <button key={m.id} onClick={() => addDayPick(m.id, availSelDay)} title={t.availDayAddTip} className="px-3 py-1 rounded-full text-mini font-bold border border-dashed transition opacity-50 hover:opacity-100" style={{ color: ROLE_COLORS[m.role] || '#aaa', borderColor: (ROLE_COLORS[m.role] || '#aaa') + '55' }}>+ {m.name}</button>
                                  ))}
                                </div>
                              </div>
                            );
                            if (avail.length + maybe.length === 0) return <><span className={`text-mini ${textSub}`}>{t.availNoResp}</span>{addChips}</>;
                            const roleGroups = [...ROLES, '__etc'].map(role => {
                              const a = avail.filter(m => role === '__etc' ? !ROLES.includes(m.role) : m.role === role);
                              const mb = maybe.filter(m => role === '__etc' ? !ROLES.includes(m.role) : m.role === role);
                              return { role, a, mb };
                            }).filter(g => g.a.length + g.mb.length > 0);
                            return (
                              <div className="flex flex-col gap-2.5">
                                {roleGroups.map(({ role, a, mb }) => {
                                  const col = ROLE_COLORS[role] || '#9aa';
                                  return (
                                    <div key={role} className="flex flex-col gap-1.5">
                                      <p className="text-micro font-black uppercase tracking-widest" style={{ color: col + 'cc' }}>{role === '__etc' ? (lang === 'ko' ? '기타' : 'Other') : role} <span className={textSub}>{a.length + mb.length}</span></p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {a.map(m => <button key={m.id} onClick={() => removeDayPick(m.id, availSelDay)} title={t.availDayKick} className="group px-3 py-1 rounded-full text-mini font-bold border transition hover:opacity-80" style={{ color: col, borderColor: col + '55', backgroundColor: col + '18' }}>{m.name} <span className="opacity-40 group-hover:opacity-100">✕</span></button>)}
                                        {mb.map(m => <button key={m.id} onClick={() => removeDayPick(m.id, availSelDay)} title={t.availDayKick} className="group px-3 py-1 rounded-full text-mini font-bold border transition hover:opacity-80 line-through" style={{ color: '#E0575F', borderColor: '#E0575F66', backgroundColor: '#E0575F14' }}>{m.name} <span className="opacity-40 group-hover:opacity-100 no-underline">✕</span></button>)}
                                      </div>
                                    </div>
                                  );
                                })}
                                {addChips}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* 베스트 데이 */}
                      <div>
                        <p className={`text-mini font-black uppercase tracking-widest mb-2.5 ${textSub}`}>{t.availBest}</p>
                        {best.length === 0 ? <p className={`text-body ${textSub}`}>{t.availNoResp}</p> : (
                          <div className="space-y-2">{best.map(({ d, c, mb }) => {
                            const availRoles = new Set(membersOnDay(d, 'available').map(mm => mm.role));
                            return (
                            <button key={d} onClick={() => setAvailSelDay(d)} className="w-full flex items-center gap-2.5">
                              <span className={`text-body font-black w-10 text-left ${finals.includes(d) ? 'text-[#EFCF8E]' : textMain}`}>{d}{lang === 'ko' ? '일' : ''}</span>
                              <div className={`flex-1 h-2.5 rounded-full overflow-hidden flex ${theme === 'light' ? 'bg-black/10' : 'bg-white/10'}`}>
                                <div className="h-full bg-[#4C8DF6]" style={{ width: `${(c / maxCount) * 100}%` }} />
                                <div className="h-full bg-[#E0575F]/60" style={{ width: `${(mb / maxCount) * 100}%` }} />
                              </div>
                              <span className="flex items-center gap-0.5 shrink-0" title={t.availRoleCover}>
                                {ROLES.map(r => { const on = availRoles.has(r); return <span key={r} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: on ? (ROLE_COLORS[r] || '#aaa') : (theme === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)') }} />; })}
                              </span>
                              <span className={`text-mini font-black w-11 text-right ${textSub}`}>{c}{mb ? <span className="text-[#E0575F]"> -{mb}</span> : ''}</span>
                            </button>
                            );
                          })}</div>
                        )}
                      </div>

                      {/* 확정일 → 일정 */}
                      {finals.length > 0 && (
                        <div className="rounded-xl border p-4 border-brand-cast/35 bg-brand-cast/8">
                          <p className="text-mini font-black uppercase tracking-widest mb-2.5 text-[#EFCF8E]">{t.availFinalTitle}</p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {finals.slice().sort((a, b) => a - b).map(d => (
                              <button key={d} onClick={() => setAvailSelDay(d)} className="px-3 py-1 rounded-full text-mini font-black border border-brand-cast/50 bg-brand-cast/15 text-[#EFCF8E] hover:bg-brand-cast/25 transition">{fmtAvailDay(d)}</button>
                            ))}
                          </div>
                          <div className="flex gap-2 mb-2">
                            <button onClick={downloadAvailIcs} className={`flex-1 py-2 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.availIcs}</button>
                            <button onClick={copyAvailAnnounce} className={`flex-1 py-2 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.availAnnounce}</button>
                          </div>
                          <button onClick={createSessionsFromFinals} className="w-full py-2 rounded-full border border-brand-cast/40 bg-brand-cast/15 text-[#EFCF8E] font-black text-mini hover:bg-brand-cast/25 transition">{t.availMakeSessions}</button>
                          <button onClick={applyFinalsToDays} className={`w-full mt-2 py-2 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.availToDays}</button>
                        </div>
                      )}

                      {/* 스폰서 슬롯 — 공유 페이지 확정일 카드 아래 한 칸.
                          멤버가 한 달에 여러 번 들어오고 오래 머무는 화면이라 자리값이 있다. */}
                      <div className={`rounded-xl border p-4 ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <p className={`text-mini font-black uppercase tracking-widest ${textSub}`}>{t.adSlot}</p>
                          <label className={`flex items-center gap-2 text-micro font-bold cursor-pointer ${textSub}`}>
                            <input type="checkbox" checked={adForm.active} onChange={e => setAdForm(f => ({ ...f, active: e.target.checked }))} />
                            {t.adOn}
                          </label>
                        </div>
                        <div className="flex flex-col gap-2">
                          <input value={adForm.caption} onChange={e => setAdForm(f => ({ ...f, caption: e.target.value }))} placeholder={t.adCaption}
                            className={`field-bare w-full border rounded-lg px-3 py-2 text-mini outline-none ${inputBg} ${textMain} placeholder:text-zinc-500`} />
                          <input value={adForm.body} onChange={e => setAdForm(f => ({ ...f, body: e.target.value }))} placeholder={t.adBody}
                            className={`field-bare w-full border rounded-lg px-3 py-2 text-mini outline-none ${inputBg} ${textMain} placeholder:text-zinc-500`} />
                          <input value={adForm.link_url} onChange={e => setAdForm(f => ({ ...f, link_url: e.target.value }))} placeholder={t.adLink} inputMode="url"
                            className={`field-bare w-full border rounded-lg px-3 py-2 text-mini outline-none ${inputBg} ${textMain} placeholder:text-zinc-500`} />
                          <input value={adForm.image_url} onChange={e => setAdForm(f => ({ ...f, image_url: e.target.value }))} placeholder={t.adImage} inputMode="url"
                            className={`field-bare w-full border rounded-lg px-3 py-2 text-mini outline-none ${inputBg} ${textMain} placeholder:text-zinc-500`} />
                          <button onClick={saveAd} className={`py-2 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.save}</button>
                        </div>
                      </div>
                    </div>

                    {/* 우: 제출 현황 (어드민) */}
                    <div className={`md:border-l md:pl-6 ${theme === 'light' ? 'md:border-black/10' : 'md:border-white/8'}`}>
                      <div className="flex items-center justify-between mb-2.5 gap-2">
                        <p className={`text-mini font-black uppercase tracking-widest ${textSub}`}>{t.availSubmitStatus} · {availSubs.filter(s => projIds.has(s.member_id)).length}/{proj.length}</p>
                        {proj.some(m => !isSubmitted(m)) && (
                          <button onClick={() => copyAvailReminder(proj.filter(m => !isSubmitted(m)).map(m => m.name))}
                            className={`shrink-0 text-micro font-black px-2.5 py-1 rounded-full border transition ${btnBg}`}>{t.availRemindAll}</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 items-start">
                        {proj.map(m => {
                          const done = isSubmitted(m);
                          const cnt = availPicks.filter(p => p.member_id === m.id && p.status === 'available').length;
                          const mcnt = availPicks.filter(p => p.member_id === m.id && p.status === 'unavailable').length;
                          const selected = availSelMember === m.id;
                          return (
                            /* 제출 여부는 알약이 아니라 박스 밝기가 말한다 — 알약이 줄바꿈되며
                               세로로 깨지던 자리다. 상태 글씨는 이름 위 작은 줄로 올린다. */
                            <div key={m.id} {...pressable(() => setAvailSelMember(selected ? null : m.id))}
                              title={t.availMemberPick}
                              className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg cursor-pointer transition border
 ${selected ? 'border-[#5FA39A]/50 bg-[#5FA39A]/12'
                                : done ? (theme === 'light' ? 'border-transparent bg-black/[0.09] hover:border-[#5FA39A]/30' : 'border-transparent bg-white/[0.10] hover:border-[#5FA39A]/30')
                                : (theme === 'light' ? 'border-transparent bg-black/[0.025] hover:border-[#5FA39A]/30' : 'border-transparent bg-white/[0.03] hover:border-[#5FA39A]/30')}`}>
                              <div className="min-w-0">
                                <p className={`text-micro font-bold uppercase tracking-[0.16em] leading-none mb-1 ${done ? 'text-[#8FD4C8]' : textSub}`}>{done ? t.availSubmitted : t.availWaiting}</p>
                                <p className={`text-body font-bold truncate ${selected ? 'text-[#8FD4C8]' : done ? textMain : textSub}`}>{m.name} <span className={`text-mini font-normal ${textSub}`}>{m.role}</span></p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-mini font-black ${textSub}`}><span className="text-[#7FB0FF]">{cnt}</span>{mcnt ? <> · <span className="text-[#E0575F]">{mcnt}</span></> : ''}</span>
                                <button onClick={(e) => { e.stopPropagation(); toggleAvailExclude(m.id); }} title={t.availKick} aria-label={t.availKick} className={`text-mini font-black px-1 transition ${textSub} hover:text-[#C98BA0]`}>✕</button>
                              </div>
                            </div>
                          );
                        })}
                        {proj.length === 0 && <p className={`text-body ${textSub}`}>{t.availNoResp}</p>}
                        {kickedMembers.length > 0 && (
                          <div className="pt-2 lg:col-span-2">
                            <p className={`text-micro font-black uppercase tracking-widest mb-1.5 text-[#C98BA0]/80`}>{t.availKicked}</p>
                            {kickedMembers.map(m => (
                              <div key={m.id} className={`flex items-center justify-between px-3.5 py-2 rounded-lg opacity-60 ${inputBg}`}>
                                <span className={`text-body font-bold line-through ${textSub}`}>{m.name} <span className="text-mini font-normal">{m.role}</span></span>
                                <button onClick={() => toggleAvailExclude(m.id)} className={`text-micro font-black px-2.5 py-0.5 rounded-full border transition ${btnBg}`}>{t.availRestoreM}</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => showConfirm(t.availClose, t.availCloseConfirm, async () => { await closeAvailPoll(); setConfirmModal(null); })}
                    className={`py-3 rounded-full border font-bold text-body transition ${theme === 'light' ? 'border-black/15 text-zinc-400 hover:bg-black/5' : 'border-white/15 text-zinc-400 hover:bg-white/5'}`}>{t.availClose}</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Confirm 모달 */}
      {confirmModal && (
        <Modal title={confirmModal.title} message={confirmModal.message} theme={theme}>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setConfirmModal(null)} className={`flex-1 py-3 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
            <button onClick={confirmModal.onOk} className={`flex-1 py-3 rounded-full border font-black text-mini transition ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.confirm}</button>
          </div>
        </Modal>
      )}

      {/* Prompt 모달 */}
      {promptModal && (
        <Modal title={promptModal.title} theme={theme}>
          <input autoFocus value={promptValue} onChange={e => setPromptValue(e.target.value)} placeholder={promptModal.placeholder} onKeyDown={e => e.key === 'Enter' && promptModal.onOk(promptValue)} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition mb-4 ${inputBg} ${textMain} placeholder:text-zinc-500`} />
          <div className="flex gap-3">
            <button onClick={() => setPromptModal(null)} className={`flex-1 py-3 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
            <button onClick={() => promptModal.onOk(promptValue)} className={`flex-1 py-3 rounded-full border font-black text-mini transition ${theme === 'light' ? 'bg-black/10 border-black/20 text-black' : 'bg-white/10 border-white/20 text-white'}`}>{t.confirm}</button>
          </div>
        </Modal>
      )}

      {/* Role 드롭다운 */}
      {roleDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setRoleDropdown(null)} />
          <div className={`fixed z-50 border rounded-xl shadow-lg overflow-hidden font-ui ${theme === 'light' ? ' border-black/10' : 'bg-[#1a1a1a] border-white/10'}`} style={{ top: roleDropdown.y, left: roleDropdown.x }}>
            {ROLES.map(r => (
              <button key={r} onClick={() => updateMemberRole(roleDropdown.id, r)} className={`flex items-center gap-2 w-full px-4 py-2.5 text-mini font-bold transition text-left ${theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/10'}`} style={{ color: ROLE_COLORS[r] }}>{r}</button>
            ))}
            <div className={`border-t ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`} />
            <button onClick={() => toggleExcludeMember(roleDropdown.id, roleDropdown.excluded)} className={`flex items-center gap-2 w-full px-4 py-2.5 text-mini font-bold transition text-left ${theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/10'} ${roleDropdown.excluded ? 'text-[#EFCF8E]' : 'text-zinc-500'}`}>
              {roleDropdown.excluded ? t.include : t.exclude}
            </button>
            <button onClick={() => { const pid = roleDropdown.id; setRoleDropdown(null); showPrompt(t.inviteTitle, 'email@example.com', '', async (v) => { const em = (v || '').trim().toLowerCase(); if (!em.includes('@')) return; await supabase.from('invites').insert({ host_id: user.id, product: 'cast', email: em, project: currentProject, profile_id: pid }); setPromptModal(null); showToastMsg(t.inviteSent); }); }}
              className={`flex items-center gap-2 w-full px-4 py-2.5 text-mini font-bold transition text-left text-brand-cast-text ${theme === 'light' ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}>
              {t.inviteAccount}
            </button>
          </div>
        </>
      )}

      {/* 스튜디오에 넣기 — fixed 드롭다운이었는데 페이지가 뒤에서 따로 스크롤돼
          목록이 자리를 벗어나고 끝까지 내려가지도 않았다. 모달로 바꿔 스크롤을
          안쪽 한 군데로 모으고, 역할별로 묶어서 길어져도 어디쯤인지 보이게 한다. */}
      {addToTeam && (() => {
        const pool = members.filter(m => m.project === currentProject && !m.excluded && !getAssignment(m.id));
        const groups = ROLES.map(r => ({ role: r, items: pool.filter(m => m.role === r).sort((a, b) => a.name.localeCompare(b.name)) })).filter(g => g.items.length);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-ui p-4" onClick={() => setAddToTeam(null)}>
            <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}
              className={`w-full max-w-2xl max-h-[80vh] flex flex-col border rounded-xl shadow-lg ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#111] border-white/10'}`}>
              <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'light' ? 'border-black/10' : 'border-white/10'}`}>
                <h2 className={`font-black text-lead ${textMain}`}>{addToTeam.team} <span className={`text-mini font-normal ${textSub}`}>· {t.studioAddMember}</span></h2>
                <button onClick={() => setAddToTeam(null)} aria-label={lang === 'ko' ? '닫기' : 'Close'} className={`text-body ${textSub} hover:opacity-70`}>✕</button>
              </div>
              <div className="overflow-y-auto overscroll-contain px-6 py-5 flex flex-col gap-5">
                {groups.length === 0 && <p className={`text-body ${textSub}`}>{t.poolEmpty}</p>}
                {groups.map(({ role, items }) => (
                  <div key={role}>
                    <p className={`text-micro font-black uppercase tracking-[0.2em] mb-2.5 ${textSub}`}>{role} <span className="opacity-50">{items.length}</span></p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {items.map(m => (
                        <button key={m.id} onClick={() => { assignMember(m.id, addToTeam.team); setAddToTeam(null); }}
                          className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl overflow-hidden text-body font-bold transition hover:brightness-105 active:scale-95"
                          style={{ backgroundColor: OAT.box, color: OAT.ink, borderTopLeftRadius: 0 }}>
                          <i aria-hidden="true" className="absolute left-0 top-0 w-4 h-4"
                            style={{
                              backgroundColor: m.gender === 'female' || m.gender === 'F' || m.gender === '여' ? GENDER_NOTCH.female : GENDER_NOTCH.male,
                              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            }} />
                          <span className="pl-1.5 truncate">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 내보내기 모달 — 2단계 */}
      {randomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-ui p-4" onClick={() => setRandomModal(false)}>
          <div role="dialog" aria-modal="true" tabIndex={-1} onClick={e => e.stopPropagation()} className={`w-full max-w-sm border rounded-xl p-6 shadow-lg anim-rise ${theme === 'light' ? 'bg-white border-black/10' : 'bg-surface-1 border-white/10'}`}>
            <h2 className={`font-black text-lead mb-1 ${textMain}`}>{t.randomTitle}</h2>
            <p className={`text-mini mb-5 ${textSub}`}>{getDayLabel(currentDay)}{!dayDates[currentDay] && ` · ${t.randomNoDate}`}</p>

            <label className={`text-micro font-bold uppercase tracking-widest mb-1.5 block ${textSub}`}>{t.teamCount}</label>
            <div className="flex items-center gap-1.5 mb-5">
              {['2', '3', '4', '5', '6'].map(n => (
                <button key={n} onClick={() => setRandTeams(n)}
                  className={`flex-1 py-2 rounded-full border font-black text-body transition ${randTeams === n ? 'bg-brand-cast/20 border-brand-cast/50 text-brand-cast-text' : btnBg}`}>{n}</button>
              ))}
            </div>

            <div className="flex flex-col gap-2 mb-5">
              {([
                [randAvoid, setRandAvoid, t.randomAvoid, t.randomAvoidSub, true],
                [randSkipBusy, setRandSkipBusy, t.randomSkipBusy, t.randomSkipBusySub, !!dayDates[currentDay] && !!availPoll],
                [randMix, setRandMix, t.randomMix, t.randomMixSub, true],
              ] as const).map(([on, set, label, sub, enabled], i) => (
                <button key={i} disabled={!enabled} onClick={() => (set as any)(!on)}
                  className={`flex items-start gap-3 px-3.5 py-3 rounded-full border text-left transition disabled:opacity-35 ${on && enabled ? 'border-brand-cast/40 bg-brand-cast/10' : theme === 'light' ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <span className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-micro font-black shrink-0 ${on && enabled ? 'bg-brand-cast border-brand-cast text-black' : theme === 'light' ? 'border-black/20' : 'border-white/20'}`}>{on && enabled ? '✓' : ''}</span>
                  <span>
                    <span className={`block text-mini font-bold ${textMain}`}>{label}</span>
                    <span className={`block text-micro ${textSub}`}>{sub}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setRandomModal(false)} className={`flex-1 py-3 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
              <button onClick={async () => {
                const n = parseInt(randTeams);
                setRandomModal(false);
                if (n > 0) await generateRandomRoster(n, { avoidRepeats: randAvoid, mixGender: randMix, skipBusy: randSkipBusy && !!dayDates[currentDay] })();
              }} className="flex-1 py-3 rounded-full bg-brand-cast text-black font-black text-mini hover:opacity-90 transition">{t.randomRun}</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-ui" onClick={() => setShowExportModal(false)}>
          <div role="dialog" aria-modal="true" tabIndex={-1} className={`w-full max-w-xs border rounded-xl p-6 shadow-lg ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1a1a1a] border-white/10'}`} onClick={e => e.stopPropagation()}>
            {exportStep === 'type' ? (
              <>
                <h2 className={`font-black text-lead mb-4 ${textMain}`}><i className="ti ti-upload" aria-hidden="true"></i> {lang === 'ko' ? '내보내기' : 'Export'}</h2>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { exportAsText(); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border font-bold text-body transition hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-sub"><i className="ti ti-clipboard" aria-hidden="true"></i></span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '텍스트 복사' : 'Copy Text'}</p><p className={`text-mini font-normal ${textSub}`}>{lang === 'ko' ? '현재 Day 클립보드 복사' : 'Copy current day'}</p></div>
                  </button>
                  <button onClick={() => { exportCallSheet('9:16'); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border font-bold text-body transition hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-sub"><i className="ti ti-device-mobile" aria-hidden="true"></i></span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '콜시트 · 세로' : 'Call sheet · Story'}</p><p className={`text-mini font-normal ${textSub}`}>1080×1920 · {lang === 'ko' ? '스토리/카톡용' : 'for stories'}</p></div>
                  </button>
                  <button onClick={() => { exportCallSheet('1:1'); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border font-bold text-body transition hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-sub">⬛</span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '콜시트 · 정사각' : 'Call sheet · Square'}</p><p className={`text-mini font-normal ${textSub}`}>1080×1080 · {lang === 'ko' ? '피드/DM용' : 'for feed'}</p></div>
                  </button>
                  <button onClick={() => { setExportType('jpeg'); setExportStep('scope'); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border font-bold text-body transition hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-sub"><i className="ti ti-photo" aria-hidden="true"></i></span>
                    <div className="text-left"><p className="font-black">JPEG</p><p className={`text-mini font-normal ${textSub}`}>{lang === 'ko' ? '이미지로 저장' : 'Save as image'}</p></div>
                  </button>
                  <button onClick={() => { setExportType('pdf'); setExportStep('scope'); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border font-bold text-body transition hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-sub"><i className="ti ti-file-type-pdf" aria-hidden="true"></i></span>
                    <div className="text-left"><p className="font-black">PDF</p><p className={`text-mini font-normal ${textSub}`}>{lang === 'ko' ? '링크 포함' : 'With links'}</p></div>
                  </button>
                </div>
                <button onClick={() => setShowExportModal(false)} className={`w-full mt-3 py-2.5 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
              </>
            ) : (
              <>
                <button onClick={() => setExportStep('type')} className={`text-mini font-bold mb-4 flex items-center gap-1 ${textSub}`}>← {lang === 'ko' ? '뒤로' : 'Back'}</button>
                <h2 className={`font-black text-lead mb-4 ${textMain}`}>{exportType === 'pdf' ? <i className="ti ti-file-type-pdf" aria-hidden="true"></i> : <i className="ti ti-photo" aria-hidden="true"></i>} {lang === 'ko' ? '범위 선택' : 'Select Scope'}</h2>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { exportType === 'pdf' ? exportAsImage('pdf') : exportAsImage('jpeg'); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border font-bold text-body transition hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-sub"><i className="ti ti-calendar" aria-hidden="true"></i></span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '현재 Day' : 'Current Day'}</p><p className={`text-mini font-normal ${textSub}`}>{dayNames[currentDay] || `Day ${currentDay}`}</p></div>
                  </button>
                  <button onClick={() => { exportAllDays(exportType === 'pdf' ? 'pdf' : 'jpeg'); setShowExportModal(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full border font-bold text-body transition hover:opacity-80 ${theme === 'light' ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}>
                    <span className="text-sub"><i className="ti ti-calendar-month" aria-hidden="true"></i></span>
                    <div className="text-left"><p className="font-black">{lang === 'ko' ? '전체 Day' : 'All Days'}</p><p className={`text-mini font-normal ${textSub}`}>{lang === 'ko' ? `${days.length}개 Day 한 이미지로` : `${days.length} days in one image`}</p></div>
                  </button>
                </div>
                <button onClick={() => setShowExportModal(false)} className={`w-full mt-3 py-2.5 rounded-full border font-bold text-mini transition ${btnBg}`}>{t.cancel}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 토스트 */}
      {showToast && (
        <Toast msg={toastMsg} z="z-50" />
      )}

      {/* 줌 컨트롤 */}
      <div className="flex fixed bottom-6 left-6 z-50 flex-col items-center gap-1.5 select-none">
        <button onClick={() => setZoom(z => Math.min(1.5, Math.round((z + 0.1) * 100) / 100))} title="확대" className={`w-9 h-9 rounded-full border backdrop-blur-md shadow-xl flex items-center justify-center transition hover:border-brand-cast/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10 text-zinc-400' : 'bg-white/[0.05] border-white/10 text-zinc-400'}`}>
          <svg width="12" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div onMouseDown={onZoomMouseDown} onDoubleClick={() => setZoom(1)} title="드래그로 확대/축소 · 더블클릭 리셋"
          className={`w-9 h-10 rounded-xl border backdrop-blur-md shadow-xl cursor-ns-resize flex flex-col items-center justify-center gap-[3px] transition hover:border-brand-cast/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10' : '/[0.05] border-white/10'}`}>
          {[0, 1, 2].map(i => <div key={i} className="w-3.5 h-[1.5px] rounded-full bg-zinc-500" />)}
        </div>
        <button onClick={() => setZoom(z => Math.max(0.4, Math.round((z - 0.1) * 100) / 100))} title="축소" className={`w-9 h-9 rounded-full border backdrop-blur-md shadow-xl flex items-center justify-center transition hover:border-brand-cast/40 ${theme === 'light' ? 'bg-black/[0.04] border-black/10 text-zinc-400' : 'bg-white/[0.05] border-white/10 text-zinc-400'}`}>
          <svg width="12" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="text-micro font-black text-zinc-500 tracking-widest">{Math.round(zoom * 100)}%</span>
      </div>
    </>
  );
}