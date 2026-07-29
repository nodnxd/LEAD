'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useSearchParams } from 'next/navigation';
import { getLang, LANG_EVENT } from '@/lib/lang';
import { buildDaysIcs, downloadIcs } from '@/lib/ics';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ROLE_ORDER = ['Producer', 'Topliner', 'Engineer', 'A&R'];
const ROLE_COLORS: Record<string, string> = { 'Producer': '#E3B24A', 'Topliner': '#5FA39A', 'Engineer': '#C98BA0', 'A&R': '#C98BA0' };

type Lang = 'ko' | 'en';
type Status = 'available' | 'maybe';

const TX = {
  ko: {
    availability: '가능일 투표', notFound: '존재하지 않는 로스터예요', noPoll: '열린 가능일 투표가 없어요', closed: '마감됨',
    pickName: '이름을 골라 들어가세요', back: '← 이름 다시 고르기',
    guide: '한 번 누르면 가능, 두 번 누르면 미정, 세 번 누르면 해제',
    available: '가능', maybe: '미정', submit: '확정하기', submitted: '제출 완료', reopen: '수정하기',
    bestDays: '가장 많이 되는 날', people: (n: number) => `${n}명`, onDay: (d: number) => `${d}일`,
    noneYet: '아직 응답이 없어요', confirmed: '확정', done: '제출',
    weekdays: ['일', '월', '화', '수', '목', '금', '토'], total: '전체',
    confirmedTitle: '확정된 날', saveIcs: '캘린더 저장 (.ics)',
    brushAvail: '가능', brushMaybe: '미정', brushErase: '지우기',
    brushGuide: '색을 고른 뒤 날짜를 누르거나 쭉 드래그하세요',
    quickPick: '빠른 선택', quickWeekend: '주말', quickWeekday: '평일', quickAll: '전체 가능', quickClear: '전체 해제',
    reviewTitle: '이대로 제출할까요?', reviewSubmit: '제출하기', reviewMore: '더 고를래요', reviewNone: '아직 고른 날이 없어요',
    myAvail: '내 가능일', myMaybe: '내 미정',
  },
  en: {
    availability: 'Availability', notFound: 'Roster not found', noPoll: 'No open availability poll', closed: 'Closed',
    pickName: 'Pick your name to enter', back: '← Change name',
    guide: 'Tap once = available, twice = maybe, three times = clear',
    available: 'Available', maybe: 'Maybe', submit: 'Submit', submitted: 'Submitted', reopen: 'Edit',
    bestDays: 'Best days', people: (n: number) => `${n}`, onDay: (d: number) => `Day ${d}`,
    noneYet: 'No responses yet', confirmed: 'Confirmed', done: 'Submitted',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], total: 'Total',
    confirmedTitle: 'Confirmed days', saveIcs: 'Save calendar (.ics)',
    brushAvail: 'Available', brushMaybe: 'Maybe', brushErase: 'Erase',
    brushGuide: 'Pick a color, then tap or drag across days',
    quickPick: 'Quick pick', quickWeekend: 'Weekends', quickWeekday: 'Weekdays', quickAll: 'All available', quickClear: 'Clear all',
    reviewTitle: 'Submit these?', reviewSubmit: 'Submit', reviewMore: 'Keep editing', reviewNone: 'No days picked yet',
    myAvail: 'My available', myMaybe: 'My maybe',
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
  const dk = true; // 공개 페이지는 다크 고정
  const [notFound, setNotFound] = useState(false);
  const [poll, setPoll] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [picks, setPicks] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [brush, setBrush] = useState<Status | 'erase'>('available');
  const [reviewing, setReviewing] = useState(false);
  const paintedRef = useRef<Set<number>>(new Set());
  const paintingRef = useRef(false);

  useEffect(() => {
    const end = () => { paintingRef.current = false; };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => { window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
  }, []);

  const t = TX[lang];
  const textMain = 'text-white', textSub = 'text-zinc-400';
  const cardBg = 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]';

  useEffect(() => {
    setLang(getLang());
    const sync = () => setLang(getLang());
    window.addEventListener(LANG_EVENT, sync);
    return () => window.removeEventListener(LANG_EVENT, sync);
  }, []);

  const fetchPoll = useCallback(async () => {
    const pollId = search.get('poll');
    let q = supabase.from('availability_polls').select('*').eq('host_id', hostId);
    q = pollId ? q.eq('id', pollId) : q.eq('is_open', true).order('created_at', { ascending: false });
    const { data } = await q.limit(1);
    setPoll(data && data.length > 0 ? data[0] : null);
  }, [hostId, search]);

  const fetchPicks = useCallback(async (pollId: string) => {
    const { data } = await supabase.from('availability_picks').select('*').eq('poll_id', pollId);
    if (data) setPicks(data);
  }, []);
  const fetchSubs = useCallback(async (pollId: string) => {
    const { data } = await supabase.from('availability_submissions').select('*').eq('poll_id', pollId);
    if (data) setSubs(data);
  }, []);
  const fetchMembers = useCallback(async (project: string | null) => {
    let q = supabase.from('profiles').select('*').eq('user_id', hostId);
    if (project) q = q.eq('project', project);
    const { data } = await q.order('name', { ascending: true });
    if (data) setMembers(data.filter((m: any) => !m.excluded));
    else setNotFound(true);
  }, [hostId]);

  useEffect(() => { if (hostId) fetchPoll(); }, [hostId, fetchPoll]);

  useEffect(() => {
    if (!poll) return;
    fetchMembers(poll.project ?? null);
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

  // 한 날짜를 정확한 상태로 설정 (붓칠)
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
  // 여러 날짜 한번에 (빠른 선택)
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
  // 드래그 붓칠 (마우스+터치 공용)
  const paintAt = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const wrap = el?.closest('[data-day]') as HTMLElement | null;
    if (!wrap) return;
    const day = Number(wrap.getAttribute('data-day'));
    if (!day || paintedRef.current.has(day)) return;
    paintedRef.current.add(day);
    setDay(day, brush === 'erase' ? null : brush);
  };

  const toggleSubmit = async () => {
    if (!meId || !poll) return;
    if (iSubmitted) { await supabase.from('availability_submissions').delete().eq('poll_id', poll.id).eq('member_id', meId); }
    else { await supabase.from('availability_submissions').upsert({ poll_id: poll.id, member_id: meId }, { onConflict: 'poll_id,member_id' }); }
    fetchSubs(poll.id);
  };

  if (notFound) return <Screen>{t.notFound}</Screen>;
  if (!poll) return <Screen>{t.noPoll}</Screen>;

  const { daysInMonth, firstWeekday, y, m } = monthMeta(poll.month);
  const finals: number[] = poll.final_days || [];
  const blocked: number[] = poll.blocked_days || [];
  const availOn = (d: number) => picks.filter((p) => p.day === d && p.status === 'available').length;
  const maybeOn = (d: number) => picks.filter((p) => p.day === d && p.status === 'maybe').length;
  const maxCount = Math.max(1, members.length);
  const membersOnDay = (d: number, st: Status) => members.filter((mm) => picks.some((p) => p.member_id === mm.id && p.day === d && p.status === st));
  const bestDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter((d) => !blocked.includes(d)).map((d) => ({ d, c: availOn(d), mb: maybeOn(d) })).filter((x) => x.c + x.mb > 0).sort((a, b) => (b.c - a.c) || (b.mb - a.mb)).slice(0, 6);
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const me = members.find((mm) => mm.id === meId);
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weekendDays = allDays.filter((d) => { const w = new Date(y, m - 1, d).getDay(); return w === 0 || w === 6; });
  const weekdayDays = allDays.filter((d) => { const w = new Date(y, m - 1, d).getDay(); return w !== 0 && w !== 6; });
  const myAvailDays = picks.filter((p) => p.member_id === meId && p.status === 'available').map((p) => p.day).sort((a, b) => a - b);
  const myMaybeDays = picks.filter((p) => p.member_id === meId && p.status === 'maybe').map((p) => p.day).sort((a, b) => a - b);

  // ── 이름 선택 화면 ──
  if (!meId) {
    const byRole = ROLE_ORDER.map((role) => ({ role, items: members.filter((mm) => mm.role === role) })).filter((g) => g.items.length > 0);
    const other = members.filter((mm) => !ROLE_ORDER.includes(mm.role));
    if (other.length) byRole.push({ role: 'Other', items: other });
    return (
      <div className="min-h-screen font-pretendard bg-[#141414] text-white">
        <div className="max-w-2xl mx-auto px-5 py-10">
          <Header t={t} poll={poll} y={y} m={m} lang={lang} />
          <FinalDaysCard t={t} lang={lang} poll={poll} m={m} />
          <p className={`text-[13px] font-bold mb-5 ${textSub}`}>{t.pickName}</p>
          <div className="flex flex-col gap-5">
            {byRole.map(({ role, items }) => {
              const col = ROLE_COLORS[role] || '#9aa';
              return (
                <div key={role}>
                  <p className="text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: col + 'cc' }}>{role}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {items.map((mm) => {
                      const done = subs.some((s) => s.member_id === mm.id);
                      return (
                        <button key={mm.id} onClick={() => setMeId(mm.id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-full border font-black text-[14px] transition-all hover:scale-105"
                          style={{ color: col, borderColor: col + '55', backgroundColor: col + '18' }}>
                          {mm.name}{done && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {members.length === 0 && <p className={`text-[13px] ${textSub}`}>{t.noneYet}</p>}
          </div>
          <BestDays t={t} lang={lang} bestDays={bestDays} maxCount={maxCount} finals={finals} onPick={setSelectedDay} />
        </div>
      </div>
    );
  }

  // ── 개인 편집 화면 ──
  return (
    <div className="min-h-screen font-pretendard bg-[#141414] text-white">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <button onClick={() => { setMeId(null); setSelectedDay(null); }} className={`text-[12px] mb-4 ${textSub} hover:opacity-70`}>{t.back}</button>
        <Header t={t} poll={poll} y={y} m={m} lang={lang} />
        <FinalDaysCard t={t} lang={lang} poll={poll} m={m} />

        <div className="mb-4">
          <p className="text-[15px] font-black" style={{ color: ROLE_COLORS[me?.role] || '#fff' }}>{me?.name} <span className={`text-[11px] font-normal ${textSub}`}>{me?.role}</span></p>
        </div>

        {poll.is_open ? (
          <>
            {/* 붓 모드 선택 */}
            <div className="flex items-center gap-2 mb-2.5">
              {([['available', t.brushAvail, '#E3B24A'], ['maybe', t.brushMaybe, '#B3A88C'], ['erase', t.brushErase, '#8a8a8a']] as const).map(([mode, label, col]) => {
                const on = brush === mode;
                return (
                  <button key={mode} onClick={() => setBrush(mode as Status | 'erase')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-black text-[13px] transition-all"
                    style={on ? { color: '#111', backgroundColor: col, borderColor: col } : { color: col, borderColor: col + '55', backgroundColor: col + '14' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: on ? '#111' : col, border: mode === 'maybe' ? `1.5px dashed ${on ? '#111' : col}` : 'none' }} />{label}
                  </button>
                );
              })}
            </div>
            <p className={`text-[12px] mb-3 ${textSub}`}>{t.brushGuide}</p>

            {/* 빠른 선택 */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>{t.quickPick}</span>
              <button onClick={() => bulkSet(weekendDays, 'available')} className="text-[11px] font-black px-3 py-1 rounded-full border border-[#E3B24A]/40 text-[#EFCF8E] hover:bg-[#E3B24A]/15 transition-all">{t.quickWeekend}</button>
              <button onClick={() => bulkSet(weekdayDays, 'available')} className="text-[11px] font-black px-3 py-1 rounded-full border border-[#E3B24A]/40 text-[#EFCF8E] hover:bg-[#E3B24A]/15 transition-all">{t.quickWeekday}</button>
              <button onClick={() => bulkSet(allDays, 'available')} className="text-[11px] font-black px-3 py-1 rounded-full border border-[#E3B24A]/40 text-[#EFCF8E] hover:bg-[#E3B24A]/15 transition-all">{t.quickAll}</button>
              <button onClick={() => bulkSet(allDays, null)} className={`text-[11px] font-black px-3 py-1 rounded-full border ${textSub} border-white/15 hover:bg-white/5 transition-all`}>{t.quickClear}</button>
            </div>
          </>
        ) : (
          <p className={`text-[12px] mb-3 ${textSub}`}>{t.closed}</p>
        )}

        {/* calendar */}
        <div className={`rounded-2xl border p-4 sm:p-6 mb-6 ${cardBg}`}>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {t.weekdays.map((w, i) => <div key={i} className={`text-center text-[11px] font-black ${i === 0 ? 'text-[#C98BA0]' : i === 6 ? 'text-[#5FA39A]' : textSub}`}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5" style={{ touchAction: poll.is_open ? 'none' : 'auto' }}
            onPointerDown={(e) => { if (!poll.is_open) return; paintingRef.current = true; paintedRef.current = new Set(); paintAt(e.clientX, e.clientY); }}
            onPointerMove={(e) => { if (paintingRef.current) paintAt(e.clientX, e.clientY); }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const c = availOn(d); const st = myStatus(d); const isFinal = finals.includes(d); const isBlocked = blocked.includes(d);
              return (
                <div key={d} data-day={d} onContextMenu={(e) => { e.preventDefault(); setSelectedDay(selectedDay === d ? null : d); }}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center transition-transform select-none
                    ${isFinal ? 'ring-2 ring-[#E3B24A]' : ''}
                    ${isBlocked ? 'border-[#C98BA0]/40 cursor-not-allowed' : st === 'available' ? 'border-[#E3B24A]/80' : st === 'maybe' ? 'border-[#B3A88C]/70 border-dashed' : 'border-white/8'}
                    ${!isBlocked && poll.is_open ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                  style={{ backgroundColor: isBlocked ? 'rgba(201,139,160,0.14)' : st === 'available' ? 'rgba(227,178,74,0.28)' : st === 'maybe' ? 'rgba(179,168,140,0.18)' : c > 0 ? `rgba(227,178,74,${(0.08 + (c / maxCount) * 0.4).toFixed(3)})` : 'transparent' }}>
                  <span className={`text-[14px] sm:text-[13px] font-bold pointer-events-none ${isBlocked ? 'text-[#C98BA0]/70 line-through' : st === 'available' ? 'text-[#EFCF8E]' : textMain}`}>{d}</span>
                  {!isBlocked && c > 0 && !st && <span className={`text-[10px] font-black pointer-events-none ${textSub}`}>{c}</span>}
                  {!isBlocked && st === 'maybe' && <span className="absolute top-1 right-1 text-[8px] font-black text-[#B3A88C] pointer-events-none">?</span>}
                  {isFinal && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#E3B24A] pointer-events-none" />}
                </div>
              );
            })}
          </div>
          <p className={`text-[11px] mt-3 ${textSub}`}>{t.myAvail} {myAvailDays.length}{lang === 'ko' ? '일' : ''}{myMaybeDays.length ? ` · ${t.myMaybe} ${myMaybeDays.length}${lang === 'ko' ? '일' : ''}` : ''}</p>
        </div>

        {/* 제출 바 */}
        {poll.is_open && (
          <div className="flex items-center gap-2 mb-8">
            {iSubmitted ? (
              <>
                <span className="flex-1 text-[12px] font-black text-[#8FD4C8] flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#5FA39A]" />{t.submitted}</span>
                <button onClick={toggleSubmit} className={`text-[12px] font-black px-4 py-2.5 rounded-full border transition-all ${textSub} border-white/15 hover:bg-white/5`}>{t.reopen}</button>
              </>
            ) : (
              <button onClick={() => setReviewing(true)}
                className="flex-1 py-3 rounded-full bg-[#E3B24A]/20 border border-[#E3B24A]/40 text-[#EFCF8E] font-black text-[14px] hover:bg-[#E3B24A]/30 transition-all">
                {t.submit}
              </button>
            )}
          </div>
        )}

        {selectedDay !== null && (
          <DayMembers t={t} lang={lang} day={selectedDay} avail={membersOnDay(selectedDay, 'available')} maybe={membersOnDay(selectedDay, 'maybe')} onClose={() => setSelectedDay(null)} />
        )}
        <BestDays t={t} lang={lang} bestDays={bestDays} maxCount={maxCount} finals={finals} onPick={setSelectedDay} />

        {/* 제출 전 확인 시트 */}
        {reviewing && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => setReviewing(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-[#1a1a1a] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
              <h3 className="font-black text-[18px] text-white mb-1">{t.reviewTitle}</h3>
              <p className="text-[12px] text-zinc-400 mb-5">{me?.name} · {poll.title || `${y}.${String(m).padStart(2, '0')}`}</p>
              {myAvailDays.length + myMaybeDays.length === 0 ? (
                <p className="text-[13px] text-zinc-500 mb-5">{t.reviewNone}</p>
              ) : (
                <div className="flex flex-col gap-3 mb-5">
                  {myAvailDays.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-[#EFCF8E] mb-1.5">{t.available} {myAvailDays.length}</p>
                      <div className="flex flex-wrap gap-1.5">{myAvailDays.map((d) => <span key={d} className="px-2.5 py-1 rounded-full text-[12px] font-black bg-[#E3B24A]/15 border border-[#E3B24A]/40 text-[#EFCF8E]">{d}{lang === 'ko' ? '일' : ''}</span>)}</div>
                    </div>
                  )}
                  {myMaybeDays.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-[#B3A88C] mb-1.5">{t.maybe} {myMaybeDays.length}</p>
                      <div className="flex flex-wrap gap-1.5">{myMaybeDays.map((d) => <span key={d} className="px-2.5 py-1 rounded-full text-[12px] font-black bg-[#B3A88C]/15 border border-dashed border-[#B3A88C]/50 text-[#D6CDB4]">{d}{lang === 'ko' ? '일' : ''}</span>)}</div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2.5">
                <button onClick={() => setReviewing(false)} className="flex-1 py-3 rounded-xl border border-white/15 text-zinc-400 font-bold text-[13px] hover:bg-white/5 transition-all">{t.reviewMore}</button>
                <button onClick={async () => { await toggleSubmit(); setReviewing(false); }} disabled={myAvailDays.length + myMaybeDays.length === 0}
                  className="flex-1 py-3 rounded-xl bg-[#5FA39A]/25 border border-[#5FA39A]/50 text-[#8FD4C8] font-black text-[13px] hover:bg-[#5FA39A]/35 transition-all disabled:opacity-40">{t.reviewSubmit}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-zinc-500 text-sm">{children}</div>;
}

function Header({ t, poll, y, m, lang }: any) {
  return (
    <div className="mb-8">
      <p className="text-[10px] font-black uppercase tracking-widest text-[#E3B24A] mb-1">{t.availability}</p>
      <h1 className="font-black text-[26px] text-white">{poll.title || `${y}. ${String(m).padStart(2, '0')}`}</h1>
      <p className="text-[12px] mt-1 text-zinc-400">{y}. {String(m).padStart(2, '0')}{poll.is_open ? '' : ` · ${t.closed}`}</p>
    </div>
  );
}

function FinalDaysCard({ t, lang, poll, m }: any) {
  const finals: number[] = (poll.final_days || []).slice().sort((a: number, b: number) => a - b);
  if (!finals.length) return null;
  const [yy, mm] = poll.month.split('-').map(Number);
  const fmt = (d: number) => {
    const w = new Date(yy, mm - 1, d).getDay();
    return lang === 'ko' ? `${m}월 ${d}일(${['일', '월', '화', '수', '목', '금', '토'][w]})` : `${m}/${d} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][w]})`;
  };
  const title = poll.title || `${yy}. ${String(mm).padStart(2, '0')}`;
  return (
    <div className="rounded-2xl border p-5 mb-8 border-[#E3B24A]/40 bg-[#E3B24A]/10">
      <p className="text-[11px] font-black uppercase tracking-widest mb-3 text-[#EFCF8E]">{t.confirmedTitle}</p>
      <div className="flex flex-wrap gap-2 mb-3.5">
        {finals.map((d: number) => (
          <span key={d} className="px-3.5 py-1.5 rounded-full text-[13px] font-black border border-[#E3B24A]/50 bg-[#E3B24A]/15 text-[#EFCF8E]">{fmt(d)}</span>
        ))}
      </div>
      <button onClick={() => downloadIcs(title, buildDaysIcs(title, poll.month, finals, poll.id))}
        className="text-[12px] font-black px-4 py-2 rounded-full border border-[#E3B24A]/40 text-[#EFCF8E] hover:bg-[#E3B24A]/15 transition-all">{t.saveIcs}</button>
    </div>
  );
}

function DayMembers({ t, lang, day, avail, maybe, onClose }: any) {
  const chip = (mm: any, dim: boolean) => (
    <span key={mm.id} className="px-3 py-1 rounded-full text-[12px] font-bold border" style={{ color: ROLE_COLORS[mm.role] || '#aaa', borderColor: (ROLE_COLORS[mm.role] || '#aaa') + (dim ? '35' : '55'), backgroundColor: (ROLE_COLORS[mm.role] || '#aaa') + (dim ? '10' : '18'), opacity: dim ? 0.7 : 1 }}>{mm.name}{dim ? ' ?' : ''}</span>
  );
  const roleGroups = [...ROLE_ORDER, '__etc'].map(role => {
    const a = avail.filter((m: any) => role === '__etc' ? !ROLE_ORDER.includes(m.role) : m.role === role);
    const mb = maybe.filter((m: any) => role === '__etc' ? !ROLE_ORDER.includes(m.role) : m.role === role);
    return { role, a, mb };
  }).filter(g => g.a.length + g.mb.length > 0);
  return (
    <div className="rounded-2xl border p-5 mb-8 bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-black text-white">{t.onDay(day)} · {t.available} {avail.length} · {t.maybe} {maybe.length}</p>
        <button onClick={onClose} className="text-[11px] text-zinc-400 hover:opacity-70">✕</button>
      </div>
      {avail.length + maybe.length === 0 ? <span className="text-[12px] text-zinc-400">{t.noneYet}</span> : (
        <div className="flex flex-col gap-3">
          {roleGroups.map(({ role, a, mb }) => {
            const col = ROLE_COLORS[role] || '#9aa';
            return (
              <div key={role} className="flex flex-col gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: col + 'cc' }}>{role === '__etc' ? (lang === 'ko' ? '기타' : 'Other') : role} <span className="text-zinc-500">{a.length + mb.length}</span></p>
                <div className="flex flex-wrap gap-2">
                  {a.map((mm: any) => chip(mm, false))}
                  {mb.map((mm: any) => chip(mm, true))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BestDays({ t, lang, bestDays, maxCount, finals, onPick }: any) {
  const isFinal = (d: number) => (finals || []).includes(d);
  return (
    <div className="rounded-2xl border p-5 mt-8 bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]">
      <p className="text-[11px] font-black uppercase tracking-widest mb-4 text-zinc-400">{t.bestDays}</p>
      {bestDays.length === 0 ? <p className="text-[12px] text-zinc-400">{t.noneYet}</p> : (
        <div className="space-y-2">
          {bestDays.map(({ d, c, mb }: any) => (
            <button key={d} onClick={() => onPick(d)} className="w-full flex items-center gap-3">
              <span className={`text-[13px] font-black w-10 text-left ${isFinal(d) ? 'text-[#EFCF8E]' : 'text-white'}`}>{d}{lang === 'ko' ? '일' : ''}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-white/10 flex">
                <div className="h-full bg-[#E3B24A]" style={{ width: `${(c / maxCount) * 100}%` }} />
                <div className="h-full bg-[#B3A88C]/50" style={{ width: `${(mb / maxCount) * 100}%` }} />
              </div>
              <span className="text-[12px] font-black w-14 text-right text-zinc-400">{t.people(c)}{mb ? `+${mb}` : ''}</span>
              {isFinal(d) && <span className="w-1.5 h-1.5 rounded-full bg-[#E3B24A] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
