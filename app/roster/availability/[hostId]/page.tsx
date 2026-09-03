'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useSearchParams } from 'next/navigation';
import { getLang, setLangValue, LANG_EVENT } from '@/lib/lang';
import { onDbError } from '@/lib/dbErrors';
import { buildDaysIcs, downloadIcs } from '@/lib/ics';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import { AVAIL_COLORS, OAT, GENDER_NOTCH } from '@/lib/brand';

const ROLE_ORDER = ['Producer', 'Topliner', 'Engineer', 'A&R'];

// 가능 = 파랑, 불가능 = 빨강, 확정 = 골드. 미정 없음.
// 파랑·빨강은 오트밀 팔레트 채도대로 내려 lib/brand의 AVAIL_COLORS에 둔다.
const YES = AVAIL_COLORS.yes.bg;   // #528ED9
const NO = AVAIL_COLORS.no.bg;     // #A7463C
const GOLD = '#E3B24A';

type Lang = 'ko' | 'en';
type Theme = 'dark' | 'light';
type Status = 'available' | 'unavailable';

// 다크/라이트 공용 토큰. 파랑·빨강·골드는 양쪽 다 통과하므로 그대로 쓴다.
const tokens = (dark: boolean) => ({
  bg: dark ? '#141414' : '#f4f4f5',
  card: dark ? '#1a1a1a' : '#ffffff',
  line: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)',
  text: dark ? '#ffffff' : '#111111',
  sub: dark ? '#a1a1aa' : '#6b7280',
  faint: dark ? '#71717a' : '#9ca3af',
  track: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  hatch: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
  hover: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
  noBg: dark ? 'rgba(167,70,60,0.26)' : 'rgba(167,70,60,0.15)',
  noText: dark ? '#E09386' : '#8E3A31',
  yesText: AVAIL_COLORS.yes.fg,
  goldText: dark ? '#EFCF8E' : '#9A7420',
  barBg: dark ? 'rgba(20,20,20,0.95)' : 'rgba(244,244,245,0.95)',
});
type Tok = ReturnType<typeof tokens>;

const FONT = ``;

const TX = {
  ko: {
    availability: '가능일 투표', notFound: '존재하지 않는 로스터예요', noPoll: '열린 가능일 투표가 없어요', closed: '마감됨',
    pickName: '이름을 골라 들어가세요', back: '이름 다시 고르기',
    available: '가능', unavailable: '불가능', noAnswer: '미응답',
    submit: '제출하기', submitted: '제출 완료', reopen: '수정하기',
    bestDays: '날짜별 결과', people: (n: number) => `${n}명`, onDay: (d: number) => `${d}일`,
    noneYet: '아직 응답이 없어요', blocked: '차단된 날',
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    confirmedTitle: '확정된 날', saveIcs: '캘린더 저장 (.ics)',
    guide: '날짜를 누르면 파랑(가능) ↔ 빨강(불가능). 쭉 드래그하면 여러 날 한 번에. 우클릭하면 그 날 누가 되는지 보여요.',
    quickPick: '빠른 선택', quickWeekend: '주말 가능', quickWeekday: '평일 가능', quickAll: '전부 가능', quickNone: '전부 불가능', quickClear: '전부 지우기',
    reviewTitle: '이대로 제출할까요?', reviewSubmit: '제출하기', reviewMore: '더 고를래요', reviewNone: '아직 고른 날이 없어요',
    progress: (a: number, b: number) => `${a}/${b} 제출`,
    left: (n: number) => `${n}일 안 골랐어요`, allPicked: '전부 골랐어요',
    day: (n: number) => `${n}일`,
    saveFailed: '저장이 안 됐어요. 인터넷 확인하고 다시 눌러주세요.',
  },
  en: {
    availability: 'Availability', notFound: 'Roster not found', noPoll: 'No open availability poll', closed: 'Closed',
    pickName: 'Pick your name to enter', back: 'Change name',
    available: 'Available', unavailable: 'Unavailable', noAnswer: 'No answer',
    submit: 'Submit', submitted: 'Submitted', reopen: 'Edit',
    bestDays: 'Results by day', people: (n: number) => `${n}`, onDay: (d: number) => `Day ${d}`,
    noneYet: 'No responses yet', blocked: 'Blocked',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    confirmedTitle: 'Confirmed days', saveIcs: 'Save calendar (.ics)',
    guide: 'Tap a day to flip blue (available) ↔ red (unavailable). Drag across days to set many. Right-click a day to see who’s in.',
    quickPick: 'Quick pick', quickWeekend: 'Weekends ok', quickWeekday: 'Weekdays ok', quickAll: 'All ok', quickNone: 'None ok', quickClear: 'Clear all',
    reviewTitle: 'Submit these?', reviewSubmit: 'Submit', reviewMore: 'Keep editing', reviewNone: 'No days picked yet',
    progress: (a: number, b: number) => `${a}/${b} submitted`,
    left: (n: number) => `${n} days left`, allPicked: 'All days answered',
    day: (n: number) => `${n}`,
    saveFailed: 'Could not save. Check your connection and tap again.',
  },
};

function monthMeta(month: string) {
  const [y, m] = (month || '2025-01').split('-').map(Number);
  return { y, m, daysInMonth: new Date(y, m, 0).getDate(), firstWeekday: new Date(y, m - 1, 1).getDay() };
}

export default function AvailabilityView() {
  const params = useParams();
  const search = useSearchParams();
  const hostId = params.hostId as string;

  const [lang, setLang] = useState<Lang>('ko');
  const [theme, setTheme] = useState<Theme>('dark');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [picks, setPicks] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [ad, setAd] = useState<any>(null);
  const paintedRef = useRef<Set<number>>(new Set());
  const paintingRef = useRef<Status | null>(null);

  // 쓰기 실패를 배너로 — 제출됐다고 믿고 나가면 안 되니까
  useEffect(() => onDbError(e => { if (e.write) setDbError(e.message); }), []);

  useEffect(() => {
    const end = () => { paintingRef.current = null; };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => { window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
  }, []);

  const t = TX[lang];
  const dark = theme === 'dark';
  const c = tokens(dark);

  useEffect(() => {
    setLang(getLang());
    const saved = localStorage.getItem('cast_theme') as Theme | null;
    if (saved) setTheme(saved);
    const sync = () => setLang(getLang());
    const syncTheme = () => setTheme((localStorage.getItem('cast_theme') as Theme) || 'dark');
    window.addEventListener(LANG_EVENT, sync);
    window.addEventListener('storage', syncTheme);
    return () => { window.removeEventListener(LANG_EVENT, sync); window.removeEventListener('storage', syncTheme); };
  }, []);

  const toggleTheme = () => {
    const next: Theme = dark ? 'light' : 'dark';
    setTheme(next); localStorage.setItem('cast_theme', next);
  };
  const toggleLang = () => setLangValue(lang === 'ko' ? 'en' : 'ko');

  const fetchPoll = useCallback(async () => {
    const pollId = search.get('poll');
    let q = supabase.from('availability_polls').select('*').eq('host_id', hostId);
    q = pollId ? q.eq('id', pollId) : q.eq('is_open', true).order('created_at', { ascending: false });
    const { data } = await q.limit(1);
    setPoll(data && data.length > 0 ? data[0] : null);
    setLoading(false);
  }, [hostId, search]);

  // 스폰서 슬롯 — 호스트당 한 칸. 없거나 꺼져 있으면 아무것도 안 그린다.
  const fetchAd = useCallback(async () => {
    const { data } = await supabase.from('roster_ads').select('*').eq('host_id', hostId).eq('active', true).limit(1);
    setAd(data && data.length ? data[0] : null);
  }, [hostId]);

  const fetchPicks = useCallback(async (pollId: string) => {
    const { data } = await supabase.from('availability_picks').select('*').eq('poll_id', pollId);
    // 예전 '미정(maybe)' 데이터는 무시 — 이제 가능/불가능만 있음
    if (data) setPicks(data.filter((p: any) => p.status === 'available' || p.status === 'unavailable'));
  }, []);
  const fetchSubs = useCallback(async (pollId: string) => {
    const { data } = await supabase.from('availability_submissions').select('*').eq('poll_id', pollId);
    if (data) setSubs(data);
  }, []);
  const fetchMembers = useCallback(async (project: string | null, kicked: string[] = []) => {
    let q = supabase.from('profiles').select('*').eq('user_id', hostId);
    if (project) q = q.eq('project', project);
    const { data } = await q.order('name', { ascending: true });
    if (data) setMembers(data.filter((m: any) => !m.excluded && !kicked.includes(m.id)));
    else setNotFound(true);
  }, [hostId]);

  useEffect(() => { if (hostId) { fetchPoll(); fetchAd(); } }, [hostId, fetchPoll, fetchAd]);

  useEffect(() => {
    if (!poll) return;
    fetchMembers(poll.project ?? null, poll.excluded_members || []);
    fetchPicks(poll.id); fetchSubs(poll.id);
    const ch = supabase.channel(`avail-${poll.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_picks', filter: `poll_id=eq.${poll.id}` }, () => fetchPicks(poll.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_submissions', filter: `poll_id=eq.${poll.id}` }, () => fetchSubs(poll.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_polls', filter: `host_id=eq.${hostId}` }, () => fetchPoll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [poll?.id]); // eslint-disable-line

  const myStatus = (day: number): Status | null => {
    const p = picks.find((x) => x.member_id === meId && x.day === day);
    return p ? (p.status as Status) : null;
  };
  const iSubmitted = !!meId && subs.some((s) => s.member_id === meId);

  const setDay = (day: number, status: Status | null) => {
    if (!meId || !poll || !poll.is_open) return;
    if ((poll.blocked_days || []).includes(day)) return;
    setPicks((prev) => {
      const rest = prev.filter((p) => !(p.member_id === meId && p.day === day));
      return status ? [...rest, { poll_id: poll.id, member_id: meId, day, status }] : rest;
    });
    if (status) supabase.from('availability_picks').upsert({ poll_id: poll.id, member_id: meId, day, status }, { onConflict: 'poll_id,member_id,day' });
    else supabase.from('availability_picks').delete().eq('poll_id', poll.id).eq('member_id', meId).eq('day', day);
  };

  const bulkSet = async (days: number[], status: Status | null) => {
    if (!meId || !poll || !poll.is_open) return;
    const valid = days.filter((d) => !(poll.blocked_days || []).includes(d));
    if (valid.length === 0) return;
    setPicks((prev) => {
      const rest = prev.filter((p) => !(p.member_id === meId && valid.includes(p.day)));
      return status ? [...rest, ...valid.map((d) => ({ poll_id: poll.id, member_id: meId, day: d, status }))] : rest;
    });
    if (status) await supabase.from('availability_picks').upsert(valid.map((d) => ({ poll_id: poll.id, member_id: meId, day: d, status })), { onConflict: 'poll_id,member_id,day' });
    else await supabase.from('availability_picks').delete().eq('poll_id', poll.id).eq('member_id', meId).in('day', valid);
  };

  // 누르면 파랑↔빨강. 드래그하면 처음 정해진 색으로 쭉 칠함.
  const dayAt = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const wrap = el?.closest('[data-day]') as HTMLElement | null;
    return wrap ? Number(wrap.getAttribute('data-day')) : 0;
  };
  const startPaint = (clientX: number, clientY: number) => {
    const day = dayAt(clientX, clientY);
    if (!day) return;
    const next: Status = myStatus(day) === 'available' ? 'unavailable' : 'available';
    paintingRef.current = next;
    paintedRef.current = new Set([day]);
    setDay(day, next);
  };
  const movePaint = (clientX: number, clientY: number) => {
    const target = paintingRef.current;
    if (!target) return;
    const day = dayAt(clientX, clientY);
    if (!day || paintedRef.current.has(day)) return;
    paintedRef.current.add(day);
    setDay(day, target);
  };

  const toggleSubmit = async () => {
    if (!meId || !poll) return;
    if (iSubmitted) await supabase.from('availability_submissions').delete().eq('poll_id', poll.id).eq('member_id', meId);
    else await supabase.from('availability_submissions').upsert({ poll_id: poll.id, member_id: meId }, { onConflict: 'poll_id,member_id' });
    fetchSubs(poll.id);
  };

  if (loading) return <Screen c={c}>{''}</Screen>;
  if (notFound) return <Screen c={c}>{TX[lang].notFound}</Screen>;
  if (!poll) return <Screen c={c}>{TX[lang].noPoll}</Screen>;

  const { daysInMonth, firstWeekday, y, m } = monthMeta(poll.month);
  const finals: number[] = poll.final_days || [];
  const blocked: number[] = poll.blocked_days || [];
  const yesOn = (d: number) => picks.filter((p) => p.day === d && p.status === 'available').length;
  const noOn = (d: number) => picks.filter((p) => p.day === d && p.status === 'unavailable').length;
  const maxCount = Math.max(1, members.length);
  const membersOnDay = (d: number, st: Status) => members.filter((mm) => picks.some((p) => p.member_id === mm.id && p.day === d && p.status === st));
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const openDays = allDays.filter((d) => !blocked.includes(d));
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...allDays];
  const me = members.find((mm) => mm.id === meId);
  const weekendDays = openDays.filter((d) => { const w = new Date(y, m - 1, d).getDay(); return w === 0 || w === 6; });
  const weekdayDays = openDays.filter((d) => { const w = new Date(y, m - 1, d).getDay(); return w !== 0 && w !== 6; });
  const myYes = picks.filter((p) => p.member_id === meId && p.status === 'available').map((p) => p.day).sort((a, b) => a - b);
  const myNo = picks.filter((p) => p.member_id === meId && p.status === 'unavailable').map((p) => p.day).sort((a, b) => a - b);
  const unanswered = openDays.length - myYes.length - myNo.length;
  const submittedCount = members.filter((mm) => subs.some((s) => s.member_id === mm.id)).length;

  // ── 이름 선택 화면 ──
  if (!meId) {
    const byRole = ROLE_ORDER.map((role) => ({ role, items: members.filter((mm) => mm.role === role) })).filter((g) => g.items.length > 0);
    const other = members.filter((mm) => !ROLE_ORDER.includes(mm.role));
    if (other.length) byRole.push({ role: 'Other', items: other });
    return (
      <div className="min-h-screen font-ui" style={{ backgroundColor: c.bg, color: c.text }}>
        <div className="max-w-2xl mx-auto px-5 py-10 anim-fade">
          <TopBar c={c} lang={lang} dark={dark} onTheme={toggleTheme} onLang={toggleLang} />
          <Header t={t} c={c} poll={poll} y={y} m={m} done={submittedCount} total={members.length} />
          <FinalDaysCard t={t} c={c} lang={lang} poll={poll} m={m} />
          <SponsorCard ad={ad} lang={lang} />
          <p className="text-body font-bold mb-5" style={{ color: c.sub }}>{t.pickName}</p>
          <div className="flex flex-col gap-5">
            {byRole.map(({ role, items }) => (
                <div key={role}>
                  <p className="text-mini font-black uppercase tracking-widest mb-2.5" style={{ color: c.sub }}>{role}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {items.map((mm) => {
                      const done = subs.some((s) => s.member_id === mm.id);
                      return (
                        <button key={mm.id} onClick={() => setMeId(mm.id)}
                          className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl overflow-hidden font-black text-body transition hover:scale-105 active:scale-95"
                          style={{
                            borderTopLeftRadius: 0,
                            backgroundColor: done ? OAT.banner : OAT.box, color: OAT.ink,
                          }}>
                          {/* 좌상단 노치 = 성별. 스튜디오 카드와 같은 신호. */}
                          <i aria-hidden="true" className="absolute left-0 top-0 w-4 h-4"
                            style={{
                              backgroundColor: mm.gender === 'female' || mm.gender === 'F' || mm.gender === '여' ? GENDER_NOTCH.female : GENDER_NOTCH.male,
                              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            }} />
                          <span className="pl-1.5">{mm.name}</span>
                          {done && <span className="text-micro font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
            ))}
            {members.length === 0 && <p className="text-body" style={{ color: c.sub }}>{t.noneYet}</p>}
          </div>
          <ResultCalendar t={t} c={c} lang={lang} cells={cells} yesOn={yesOn} noOn={noOn} maxCount={maxCount} finals={finals} blocked={blocked} onPick={setSelectedDay} />
          {selectedDay !== null && (
            <DayMembers t={t} c={c} dark={dark} lang={lang} day={selectedDay} yes={membersOnDay(selectedDay, 'available')} no={membersOnDay(selectedDay, 'unavailable')} onClose={() => setSelectedDay(null)} />
          )}
        </div>
      </div>
    );
  }


  // ── 개인 편집 화면 ──
  return (
    <div className="min-h-screen font-ui" style={{ backgroundColor: c.bg, color: c.text }}>
      <div className="max-w-2xl mx-auto px-5 py-10 pb-28 anim-fade">
        <TopBar c={c} lang={lang} dark={dark} onTheme={toggleTheme} onLang={toggleLang}
          left={<button onClick={() => { setMeId(null); setSelectedDay(null); }} className="text-mini hover:opacity-70 transition-opacity" style={{ color: c.sub }}>← {t.back}</button>} />
        {dbError && (
          <div role="alert" className="mb-5 rounded-xl border px-4 py-3 flex items-start gap-3" style={{ borderColor: NO + '66', backgroundColor: NO + '14' }}>
            <span className="text-body leading-none mt-0.5" style={{ color: c.noText }}><i className="ti ti-alert-triangle" aria-hidden="true"></i></span>
            <div className="flex-1">
              <p className="text-mini font-black" style={{ color: c.noText }}>{t.saveFailed}</p>
              <p className="text-micro mt-0.5" style={{ color: c.sub }}>{dbError}</p>
            </div>
            <button onClick={() => setDbError(null)} aria-label={lang === 'ko' ? '닫기' : 'Close'} className="text-mini hover:opacity-70" style={{ color: c.sub }}>✕</button>
          </div>
        )}
        <Header t={t} c={c} poll={poll} y={y} m={m} done={submittedCount} total={members.length} />
        <FinalDaysCard t={t} c={c} lang={lang} poll={poll} m={m} />
        <SponsorCard ad={ad} lang={lang} />

        <div className="flex items-center gap-2 mb-4">
          <p className="text-lead font-black" style={{ color: c.text }}>{me?.name}</p>
          <span className="text-mini" style={{ color: c.sub }}>{me?.role}</span>
        </div>

        {poll.is_open ? (
          <>
            {/* 범례 */}
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Legend c={c} color={YES} label={t.available} />
              <Legend c={c} color={NO} label={t.unavailable} />
              <Legend c={c} color={null} label={t.noAnswer} />
            </div>
            <p className="text-mini mb-3.5" style={{ color: c.sub }}>{t.guide}</p>

            {/* 빠른 선택 */}
            <div className="flex items-center gap-1.5 mb-3.5 flex-wrap">
              <span className="text-micro font-black uppercase tracking-widest mr-0.5" style={{ color: c.sub }}>{t.quickPick}</span>
              <Quick color={YES} onClick={() => bulkSet(weekendDays, 'available')}>{t.quickWeekend}</Quick>
              <Quick color={YES} onClick={() => bulkSet(weekdayDays, 'available')}>{t.quickWeekday}</Quick>
              <Quick color={YES} onClick={() => bulkSet(openDays, 'available')}>{t.quickAll}</Quick>
              <Quick color={NO} onClick={() => bulkSet(openDays, 'unavailable')}>{t.quickNone}</Quick>
              <Quick color={c.faint} onClick={() => bulkSet(allDays, null)}>{t.quickClear}</Quick>
            </div>
          </>
        ) : (
          <p className="text-mini mb-3" style={{ color: c.sub }}>{t.closed}</p>
        )}

        {/* 달력 */}
        <div className="rounded-xl border p-4 sm:p-5 mb-5" style={{ backgroundColor: c.card, borderColor: c.line }}>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {t.weekdays.map((w, i) => <div key={i} className="text-center text-mini font-black" style={{ color: i === 0 || i === 6 ? c.sub : c.faint }}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5" style={{ touchAction: poll.is_open ? 'none' : 'auto' }}
            onPointerDown={(e) => { if (poll.is_open) startPaint(e.clientX, e.clientY); }}
            onPointerMove={(e) => movePaint(e.clientX, e.clientY)}>
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const n = yesOn(d); const st = myStatus(d); const isFinal = finals.includes(d); const isBlocked = blocked.includes(d);
              const bg = isBlocked ? 'transparent'
                : st === 'available' ? YES
                : st === 'unavailable' ? c.noBg
                : n > 0 ? `rgba(76,141,246,${(0.07 + (n / maxCount) * 0.30).toFixed(3)})` : 'transparent';
              const border = isBlocked ? c.line
                : st === 'available' ? YES
                : st === 'unavailable' ? 'rgba(224,87,95,0.8)'
                : c.line;
              return (
                <button key={d} type="button" data-day={d}
                  disabled={isBlocked || !poll.is_open}
                  aria-pressed={st === 'available'}
                  aria-label={`${d}${lang === 'ko' ? '일' : ''} — ${isBlocked ? t.blocked : st === 'available' ? t.available : st === 'unavailable' ? t.unavailable : t.noAnswer}`}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    setDay(d, myStatus(d) === 'available' ? 'unavailable' : 'available');
                  }}
                  onContextMenu={(e) => { e.preventDefault(); setSelectedDay(selectedDay === d ? null : d); }}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center select-none transition-[transform,background-color] duration-150
 ${isFinal ? 'ring-2 ring-brand-cast' : ''}
                    ${!isBlocked && poll.is_open ? 'cursor-pointer active:scale-90' : 'cursor-default'}`}
                  style={{
                    backgroundColor: bg, borderColor: border,
                    backgroundImage: isBlocked ? `repeating-linear-gradient(45deg, ${c.hatch} 0 4px, transparent 4px 8px)` : undefined,
                  }}
                  title={isBlocked ? t.blocked : undefined}>
                  <span className={`text-body font-black pointer-events-none ${isBlocked ? 'line-through' : ''}`}
                    style={{ color: isBlocked ? c.faint : st === 'available' ? c.yesText : st === 'unavailable' ? c.noText : c.text }}>{d}</span>
                  {!isBlocked && !st && n > 0 && <span className="text-micro font-black pointer-events-none" style={{ color: c.sub }}>{n}</span>}
                  {isFinal && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-cast pointer-events-none" />}
                </button>
              );
            })}
          </div>
          <div aria-live="polite" className="flex items-center gap-3 mt-3.5 text-mini font-bold flex-wrap">
            <span style={{ color: YES }}>{t.available} {myYes.length}</span>
            <span style={{ color: NO }}>{t.unavailable} {myNo.length}</span>
            <span style={{ color: unanswered > 0 ? c.faint : '#3F9B8B' }}>{unanswered > 0 ? t.left(unanswered) : t.allPicked}</span>
          </div>
          {/* 진행 막대 */}
          <div className="mt-2 h-1.5 rounded-full overflow-hidden flex" style={{ backgroundColor: c.track }}>
            <div className="h-full transition duration-300" style={{ width: `${(myYes.length / Math.max(1, openDays.length)) * 100}%`, backgroundColor: YES }} />
            <div className="h-full transition duration-300" style={{ width: `${(myNo.length / Math.max(1, openDays.length)) * 100}%`, backgroundColor: NO }} />
          </div>
        </div>

        {selectedDay !== null && (
          <DayMembers t={t} c={c} dark={dark} lang={lang} day={selectedDay} yes={membersOnDay(selectedDay, 'available')} no={membersOnDay(selectedDay, 'unavailable')} onClose={() => setSelectedDay(null)} />
        )}
        <ResultCalendar t={t} c={c} lang={lang} cells={cells} yesOn={yesOn} noOn={noOn} maxCount={maxCount} finals={finals} blocked={blocked} onPick={setSelectedDay} />
      </div>

      {/* 하단 고정 제출 바 */}
      {poll.is_open && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md" style={{ borderColor: c.line, backgroundColor: c.barBg }}>
          <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center gap-3">
            {iSubmitted ? (
              <>
                <span className="flex-1 text-body font-black text-[#8FD4C8] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#5FA39A]" />{t.submitted}</span>
                <button onClick={toggleSubmit} className="text-mini font-black px-5 py-2.5 rounded-full border transition" style={{ borderColor: c.line, color: c.sub }}>{t.reopen}</button>
              </>
            ) : (
              <>
                <span className="text-mini font-bold shrink-0 hidden sm:block" style={{ color: c.faint }}>{myYes.length + myNo.length}/{openDays.length}</span>
                <button onClick={() => setReviewing(true)} disabled={myYes.length + myNo.length === 0}
                  className="flex-1 py-3 rounded-full font-black text-body transition disabled:opacity-30 active:scale-[0.98]"
                  style={{ backgroundColor: YES, color: c.yesText }}>
                  {t.submit}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 제출 전 확인 */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 anim-fade" onClick={() => setReviewing(false)}>
          <div role="dialog" aria-modal="true" tabIndex={-1} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md border rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-lg anim-rise" style={{ backgroundColor: c.card, borderColor: c.line }}>
            <h3 className="font-black text-sub mb-1" style={{ color: c.text }}>{t.reviewTitle}</h3>
            <p className="text-mini mb-5" style={{ color: c.sub }}>{me?.name} · {poll.title || `${y}.${String(m).padStart(2, '0')}`}</p>
            {myYes.length + myNo.length === 0 ? (
              <p className="text-body mb-5" style={{ color: c.faint }}>{t.reviewNone}</p>
            ) : (
              <div className="flex flex-col gap-3.5 mb-5 max-h-[45vh] overflow-y-auto">
                <DayChips label={t.available} days={myYes} color={YES} lang={lang} />
                <DayChips label={t.unavailable} days={myNo} color={NO} lang={lang} />
              </div>
            )}
            <div className="flex gap-2.5">
              <button onClick={() => setReviewing(false)} className="flex-1 py-3 rounded-full border font-bold text-body transition" style={{ borderColor: c.line, color: c.sub }}>{t.reviewMore}</button>
              <button onClick={async () => { await toggleSubmit(); setReviewing(false); }} disabled={myYes.length + myNo.length === 0}
                className="flex-1 py-3 rounded-full font-black text-body transition disabled:opacity-30" style={{ backgroundColor: YES, color: c.yesText }}>{t.reviewSubmit}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function Screen({ children, c }: { children: React.ReactNode; c: Tok }) {
  return <div className="min-h-screen flex items-center justify-center text-body font-ui" style={{ backgroundColor: c.bg, color: c.faint }}>{children}</div>;
}

function TopBar({ c, lang, dark, onTheme, onLang, left }: any) {
  const btn = { borderColor: c.line, color: c.sub };
  return (
    <div className="flex items-center justify-between mb-5">
      <div>{left}</div>
      <div className="flex items-center gap-1.5">
        <button onClick={onTheme} title={dark ? 'Light' : 'Dark'} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className="px-3 py-1.5 rounded-full border text-mini transition hover:opacity-70" style={btn}>{dark ? '☀' : '◑'}</button>
        <button onClick={onLang} aria-label={lang === 'ko' ? 'Switch to English' : '한국어로 전환'} className="px-3 py-1.5 rounded-full border text-micro font-bold uppercase tracking-widest transition hover:opacity-70" style={btn}>{lang === 'ko' ? 'EN' : 'KO'}</button>
      </div>
    </div>
  );
}

function Legend({ color, label, c }: { color: string | null; label: string; c: Tok }) {
  return (
    <span className="flex items-center gap-1.5 text-mini font-bold" style={{ color: c.sub }}>
      <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: color ?? 'transparent', borderColor: color ?? c.line }} />{label}
    </span>
  );
}

function Quick({ color, onClick, children }: any) {
  return (
    <button onClick={onClick} className="text-mini font-black px-3 py-1.5 rounded-full border transition hover:brightness-110 active:scale-95"
      style={{ color, borderColor: color + '55', backgroundColor: color + '14' }}>{children}</button>
  );
}

function DayChips({ label, days, color, lang }: any) {
  if (!days.length) return null;
  return (
    <div>
      <p className="text-mini font-black uppercase tracking-widest mb-1.5" style={{ color }}>{label} {days.length}</p>
      <div className="flex flex-wrap gap-1.5">
        {days.map((d: number) => <span key={d} className="px-2.5 py-1 rounded-full text-mini font-black border" style={{ color, borderColor: color + '55', backgroundColor: color + '18' }}>{d}{lang === 'ko' ? '일' : ''}</span>)}
      </div>
    </div>
  );
}

function Header({ t, c, poll, y, m, done, total }: any) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mb-7">
      <p className="font-mono-num text-micro font-semibold uppercase tracking-widest mb-1.5" style={{ color: c.goldText }}>{t.availability}</p>
      <h1 className="font-display text-title leading-tight" style={{ color: c.text }}>{poll.title || `${y}. ${String(m).padStart(2, '0')}`}</h1>
      <div className="flex items-center gap-2.5 mt-2">
        <p className="text-mini" style={{ color: c.sub }}>{y}. {String(m).padStart(2, '0')}{poll.is_open ? '' : ` · ${t.closed}`}</p>
        <div className="flex-1 h-1 rounded-full overflow-hidden max-w-[120px]" style={{ backgroundColor: c.track }}>
          <div className="h-full rounded-full transition duration-500" style={{ width: `${pct}%`, backgroundColor: GOLD }} />
        </div>
        <p className="text-mini font-black" style={{ color: c.faint }}>{t.progress(done, total)}</p>
      </div>
    </div>
  );
}

function FinalDaysCard({ t, c, lang, poll, m }: any) {
  const finals: number[] = (poll.final_days || []).slice().sort((a: number, b: number) => a - b);
  if (!finals.length) return null;
  const [yy, mm] = poll.month.split('-').map(Number);
  const fmt = (d: number) => {
    const w = new Date(yy, mm - 1, d).getDay();
    return lang === 'ko' ? `${m}월 ${d}일(${['일', '월', '화', '수', '목', '금', '토'][w]})` : `${m}/${d} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][w]})`;
  };
  const title = poll.title || `${yy}. ${String(mm).padStart(2, '0')}`;
  return (
    <div className="rounded-xl border p-5 mb-7" style={{ borderColor: GOLD + '59', backgroundColor: GOLD + '14' }}>
      <p className="text-mini font-black uppercase tracking-widest mb-3" style={{ color: c.goldText }}>{t.confirmedTitle}</p>
      <div className="flex flex-wrap gap-2 mb-3.5">
        {finals.map((d: number) => (
          <span key={d} className="px-3.5 py-1.5 rounded-full text-body font-black border" style={{ color: c.goldText, borderColor: GOLD + '80', backgroundColor: GOLD + '26' }}>{fmt(d)}</span>
        ))}
      </div>
      <button onClick={() => downloadIcs(title, buildDaysIcs(title, poll.month, finals, poll.id))}
        className="text-mini font-black px-4 py-2 rounded-full border transition hover:brightness-110" style={{ color: c.goldText, borderColor: GOLD + '66' }}>{t.saveIcs}</button>
    </div>
  );
}

function DayMembers({ t, c, dark, lang, day, yes, no, onClose }: any) {
  const chip = (mm: any, ok: boolean) => (
    <span key={mm.id} className={`px-3 py-1 rounded-full text-mini font-bold ${ok ? '' : 'line-through'}`}
      style={ok
        ? { backgroundColor: OAT.box, color: OAT.ink }
        : { backgroundColor: AVAIL_COLORS.no.bg, color: AVAIL_COLORS.no.fg }}>{mm.name}</span>
  );
  const roleGroups = [...ROLE_ORDER, '__etc'].map((role) => {
    const a = yes.filter((mm: any) => role === '__etc' ? !ROLE_ORDER.includes(mm.role) : mm.role === role);
    const b = no.filter((mm: any) => role === '__etc' ? !ROLE_ORDER.includes(mm.role) : mm.role === role);
    return { role, a, b };
  }).filter((g) => g.a.length + g.b.length > 0);
  return (
    <div className="rounded-xl border p-5 mb-2 anim-rise" style={{ backgroundColor: c.card, borderColor: c.line }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-body font-black" style={{ color: c.text }}>{t.onDay(day)} · <span style={{ color: YES }}>{t.available} {yes.length}</span> · <span style={{ color: c.noText }}>{t.unavailable} {no.length}</span></p>
        <button onClick={onClose} aria-label={lang === 'ko' ? '닫기' : 'Close'} className="text-mini hover:opacity-70" style={{ color: c.sub }}>✕</button>
      </div>
      {yes.length + no.length === 0 ? <span className="text-mini" style={{ color: c.sub }}>{t.noneYet}</span> : (
        <div className="flex flex-col gap-3">
          {roleGroups.map(({ role, a, b }) => (
            <div key={role} className="flex flex-col gap-1.5">
              <p className="font-mono-num text-micro font-semibold uppercase tracking-widest" style={{ color: c.sub }}>
                {role === '__etc' ? (lang === 'ko' ? '기타' : 'Other') : role} <span style={{ color: c.faint }}>{a.length + b.length}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {a.map((mm: any) => chip(mm, true))}
                {b.map((mm: any) => chip(mm, false))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 스폰서 한 칸. 크림/오트밀 그대로라 광고 배너가 아니라 카드 한 장으로 읽힌다.
function SponsorCard({ ad, lang }: any) {
  if (!ad || (!ad.caption && !ad.body && !ad.image_url)) return null;
  const Tag: any = ad.link_url ? 'a' : 'div';
  return (
    <Tag {...(ad.link_url ? { href: ad.link_url, target: '_blank', rel: 'noopener noreferrer sponsored' } : {})}
      className={`relative block rounded-xl overflow-hidden mb-7 transition ${ad.link_url ? 'hover:brightness-105 active:scale-[0.99]' : ''}`}
      style={{ backgroundColor: OAT.box, color: OAT.ink, borderTopLeftRadius: 0 }}>
      <span aria-hidden="true" className="absolute left-0 top-0 w-4 h-4 z-10"
        style={{ backgroundColor: OAT.banner, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
      {ad.image_url && <img src={ad.image_url} alt="" className="w-full max-h-44 object-cover" loading="lazy" referrerPolicy="no-referrer" />}
      <div className="px-5 py-4 pl-6">
        <p className="text-micro font-bold uppercase tracking-[0.18em] opacity-45 mb-1">{lang === 'ko' ? '스폰서' : 'Sponsored'}</p>
        {ad.caption && <p className="text-body font-black">{ad.caption}</p>}
        {ad.body && <p className="text-mini font-medium opacity-70 mt-1">{ad.body}</p>}
      </div>
    </Tag>
  );
}

// 결과 달력 — 막대 목록은 여섯 날만 보여주고 나머지 달을 통째로 감췄다.
// 한 달을 다 펼치고, 칸마다 파랑(가능)이 아래에서, 빨강(불가능)이 위에서
// 득표율만큼 차오른다. 표가 쌓일수록 칸이 채워지는 게 그대로 보인다.
function ResultCalendar({ t, c, lang, cells, yesOn, noOn, maxCount, finals, blocked, onPick }: any) {
  const isFinal = (d: number) => (finals || []).includes(d);
  return (
    <div className="rounded-xl border p-4 sm:p-5 mt-6" style={{ backgroundColor: c.card, borderColor: c.line }}>
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-mini font-black uppercase tracking-widest" style={{ color: c.sub }}>{t.bestDays}</p>
        <span className="flex items-center gap-3 text-micro font-bold" style={{ color: c.sub }}>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: AVAIL_COLORS.yes.bg }} />{t.available}</span>
          <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ backgroundColor: AVAIL_COLORS.no.bg }} />{t.unavailable}</span>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {t.weekdays.map((w: string, i: number) => (
          <div key={i} className="text-center text-mini font-black" style={{ color: i === 0 || i === 6 ? c.sub : c.faint }}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d: number | null, i: number) => {
          if (d === null) return <div key={`e${i}`} />;
          const isBlocked = (blocked || []).includes(d);
          const yes = yesOn(d); const no = noOn(d);
          const yesPct = Math.round((yes / maxCount) * 100);
          const noPct = Math.round((no / maxCount) * 100);
          return (
            <button key={d} type="button" onClick={() => onPick(d)} disabled={isBlocked}
              aria-label={`${d}${lang === 'ko' ? '일' : ''} — ${t.available} ${yes}, ${t.unavailable} ${no}`}
              className={`relative aspect-square rounded-xl border overflow-hidden flex items-center justify-center transition
                ${isFinal(d) ? 'ring-2 ring-brand-cast' : ''} ${isBlocked ? 'cursor-default' : 'cursor-pointer active:scale-90'}`}
              style={{
                borderColor: c.line,
                backgroundImage: isBlocked ? `repeating-linear-gradient(45deg, ${c.hatch} 0 4px, transparent 4px 8px)` : undefined,
              }}>
              {/* 아래에서 차오르는 파랑, 위에서 내려오는 빨강 */}
              {!isBlocked && yesPct > 0 && (
                <span className="absolute inset-x-0 bottom-0 transition-[height] duration-500"
                  style={{ height: `${yesPct}%`, backgroundColor: AVAIL_COLORS.yes.bg, opacity: 0.85 }} />
              )}
              {!isBlocked && noPct > 0 && (
                <span className="absolute inset-x-0 top-0 transition-[height] duration-500"
                  style={{ height: `${noPct}%`, backgroundColor: AVAIL_COLORS.no.bg, opacity: 0.85 }} />
              )}
              <span className={`relative text-body font-black ${isBlocked ? 'line-through' : ''}`}
                style={{ color: isBlocked ? c.faint : yesPct + noPct >= 55 ? OAT.cream : c.text,
                         textShadow: yesPct + noPct >= 55 ? '0 1px 2px rgba(0,0,0,.45)' : undefined }}>{d}</span>
              {isFinal(d) && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-cast" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
