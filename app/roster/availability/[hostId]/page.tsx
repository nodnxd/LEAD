'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useSearchParams } from 'next/navigation';
import { getLang, LANG_EVENT } from '@/lib/lang';

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
    available: '가능', maybe: '미정', submit: '확정하기', submitted: '✓ 제출 완료', reopen: '수정하기',
    bestDays: '가장 많이 되는 날', people: (n: number) => `${n}명`, onDay: (d: number) => `${d}일`,
    noneYet: '아직 응답이 없어요', confirmed: '확정', done: '제출',
    weekdays: ['일', '월', '화', '수', '목', '금', '토'], total: '전체',
  },
  en: {
    availability: 'Availability', notFound: 'Roster not found', noPoll: 'No open availability poll', closed: 'Closed',
    pickName: 'Pick your name to enter', back: '← Change name',
    guide: 'Tap once = available, twice = maybe, three times = clear',
    available: 'Available', maybe: 'Maybe', submit: 'Submit', submitted: '✓ Submitted', reopen: 'Edit',
    bestDays: 'Best days', people: (n: number) => `${n}`, onDay: (d: number) => `Day ${d}`,
    noneYet: 'No responses yet', confirmed: 'Confirmed', done: 'Submitted',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], total: 'Total',
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

  const cycleDay = async (day: number) => {
    if (!meId || !poll || !poll.is_open) return;
    if ((poll.blocked_days || []).includes(day)) return;
    const cur = myStatus(day);
    const next: Status | null = cur === null ? 'available' : cur === 'available' ? 'maybe' : null;
    // optimistic
    setPicks((prev) => {
      const rest = prev.filter((p) => !(p.member_id === meId && p.day === day));
      return next ? [...rest, { poll_id: poll.id, member_id: meId, day, status: next }] : rest;
    });
    if (next) await supabase.from('availability_picks').upsert({ poll_id: poll.id, member_id: meId, day, status: next }, { onConflict: 'poll_id,member_id,day' });
    else await supabase.from('availability_picks').delete().eq('poll_id', poll.id).eq('member_id', meId).eq('day', day);
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

  // ── 이름 선택 화면 ──
  if (!meId) {
    const byRole = ROLE_ORDER.map((role) => ({ role, items: members.filter((mm) => mm.role === role) })).filter((g) => g.items.length > 0);
    const other = members.filter((mm) => !ROLE_ORDER.includes(mm.role));
    if (other.length) byRole.push({ role: 'Other', items: other });
    return (
      <div className="min-h-screen font-pretendard bg-[#141414] text-white">
        <div className="max-w-2xl mx-auto px-5 py-10">
          <Header t={t} poll={poll} y={y} m={m} lang={lang} />
          <p className={`text-[13px] font-bold mb-5 ${textSub}`}>{t.pickName}</p>
          <div className="flex flex-col gap-5">
            {byRole.map(({ role, items }) => {
              const col = ROLE_COLORS[role] || '#9aa';
              return (
                <div key={role}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2.5" style={{ color: col + 'cc' }}>{role}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {items.map((mm) => {
                      const done = subs.some((s) => s.member_id === mm.id);
                      return (
                        <button key={mm.id} onClick={() => setMeId(mm.id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-full border font-black text-[13px] transition-all hover:scale-105"
                          style={{ color: col, borderColor: col + '55', backgroundColor: col + '18' }}>
                          {mm.name}{done && <span className="text-[10px] font-bold" style={{ color: col }}>✓</span>}
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

        <div className="flex items-center justify-between mb-3">
          <p className="text-[15px] font-black" style={{ color: ROLE_COLORS[me?.role] || '#fff' }}>{me?.name} <span className={`text-[11px] font-normal ${textSub}`}>{me?.role}</span></p>
          {poll.is_open && (
            <button onClick={toggleSubmit}
              className={`text-[12px] font-black px-4 py-2 rounded-full border transition-all ${iSubmitted ? 'bg-[#5FA39A]/25 border-[#5FA39A]/50 text-[#8FD4C8]' : 'bg-[#E3B24A]/20 border-[#E3B24A]/40 text-[#EFCF8E] hover:bg-[#E3B24A]/30'}`}>
              {iSubmitted ? t.submitted : t.submit}
            </button>
          )}
        </div>
        <p className={`text-[11px] mb-4 ${textSub}`}>{t.guide}</p>

        {/* legend */}
        <div className="flex items-center gap-4 mb-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(227,178,74,0.6)' }} /> {t.available}</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-[#B3A88C]/70" /> {t.maybe}</span>
        </div>

        {/* calendar */}
        <div className={`rounded-2xl border p-4 sm:p-6 mb-8 ${cardBg}`}>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {t.weekdays.map((w, i) => <div key={i} className={`text-center text-[10px] font-black ${i === 0 ? 'text-[#C98BA0]' : i === 6 ? 'text-[#5FA39A]' : textSub}`}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const c = availOn(d); const st = myStatus(d); const isFinal = finals.includes(d); const isBlocked = blocked.includes(d);
              return (
                <button key={d} onClick={() => isBlocked ? undefined : cycleDay(d)} onContextMenu={(e) => { e.preventDefault(); setSelectedDay(selectedDay === d ? null : d); }}
                  disabled={!poll.is_open || isBlocked}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center transition-all
                    ${isFinal ? 'ring-2 ring-[#E3B24A]' : ''}
                    ${isBlocked ? 'border-[#C98BA0]/40 cursor-not-allowed' : st === 'available' ? 'border-[#E3B24A]/80' : st === 'maybe' ? 'border-[#B3A88C]/70 border-dashed' : 'border-white/8'}
                    ${!isBlocked && poll.is_open ? 'hover:scale-[1.04] cursor-pointer' : 'cursor-default'}`}
                  style={{ backgroundColor: isBlocked ? 'rgba(201,139,160,0.14)' : st === 'available' ? 'rgba(227,178,74,0.28)' : c > 0 ? `rgba(227,178,74,${(0.08 + (c / maxCount) * 0.4).toFixed(3)})` : 'transparent' }}>
                  <span className={`text-[12px] font-bold ${isBlocked ? 'text-[#C98BA0]/70 line-through' : st === 'available' ? 'text-[#EFCF8E]' : textMain}`}>{d}</span>
                  {isBlocked ? <span className="text-[8px]">🚫</span> : c > 0 && <span className={`text-[9px] font-black ${textSub}`}>{c}</span>}
                  {!isBlocked && st === 'maybe' && <span className="absolute top-1 right-1 text-[8px] font-black text-[#B3A88C]">?</span>}
                  {isFinal && <span className="absolute top-0.5 right-0.5 text-[8px] text-[#E3B24A]">★</span>}
                </button>
              );
            })}
          </div>
          <p className={`text-[10px] mt-3 ${textSub}`}>{t.total} {members.length}{lang === 'ko' ? '명' : ''} · {t.done} {subs.length}{finals.length ? ` · ★ ${finals.join(', ')}${lang === 'ko' ? '일' : ''} ${t.confirmed}` : ''}</p>
        </div>

        {selectedDay !== null && (
          <DayMembers t={t} lang={lang} day={selectedDay} avail={membersOnDay(selectedDay, 'available')} maybe={membersOnDay(selectedDay, 'maybe')} onClose={() => setSelectedDay(null)} />
        )}
        <BestDays t={t} lang={lang} bestDays={bestDays} maxCount={maxCount} finals={finals} onPick={setSelectedDay} />
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

function DayMembers({ t, lang, day, avail, maybe, onClose }: any) {
  const chip = (mm: any, dim: boolean) => (
    <span key={mm.id} className="px-3 py-1 rounded-full text-[11px] font-bold border" style={{ color: ROLE_COLORS[mm.role] || '#aaa', borderColor: (ROLE_COLORS[mm.role] || '#aaa') + (dim ? '35' : '55'), backgroundColor: (ROLE_COLORS[mm.role] || '#aaa') + (dim ? '10' : '18'), opacity: dim ? 0.7 : 1 }}>{mm.name}</span>
  );
  return (
    <div className="rounded-2xl border p-5 mb-8 bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-black text-white">{t.onDay(day)} · {t.available} {avail.length} · {t.maybe} {maybe.length}</p>
        <button onClick={onClose} className="text-[11px] text-zinc-400 hover:opacity-70">✕</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {avail.map((mm: any) => chip(mm, false))}
        {maybe.map((mm: any) => chip(mm, true))}
        {avail.length + maybe.length === 0 && <span className="text-[12px] text-zinc-400">{t.noneYet}</span>}
      </div>
    </div>
  );
}

function BestDays({ t, lang, bestDays, maxCount, finals, onPick }: any) {
  const isFinal = (d: number) => (finals || []).includes(d);
  return (
    <div className="rounded-2xl border p-5 mt-8 bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]">
      <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-zinc-400">{t.bestDays}</p>
      {bestDays.length === 0 ? <p className="text-[12px] text-zinc-400">{t.noneYet}</p> : (
        <div className="space-y-2">
          {bestDays.map(({ d, c, mb }: any) => (
            <button key={d} onClick={() => onPick(d)} className="w-full flex items-center gap-3">
              <span className={`text-[13px] font-black w-10 text-left ${isFinal(d) ? 'text-[#EFCF8E]' : 'text-white'}`}>{d}{lang === 'ko' ? '일' : ''}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-white/10 flex">
                <div className="h-full bg-[#E3B24A]" style={{ width: `${(c / maxCount) * 100}%` }} />
                <div className="h-full bg-[#B3A88C]/50" style={{ width: `${(mb / maxCount) * 100}%` }} />
              </div>
              <span className="text-[11px] font-black w-14 text-right text-zinc-400">{t.people(c)}{mb ? `+${mb}` : ''}</span>
              {isFinal(d) && <span className="text-[9px] font-black text-[#E3B24A]">★</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
