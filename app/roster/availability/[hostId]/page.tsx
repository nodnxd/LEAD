'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useSearchParams } from 'next/navigation';
import { getLang, setLangValue, LANG_EVENT } from '@/lib/lang';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ROLE_ORDER = ['Producer', 'Topliner', 'Engineer', 'A&R'];
const ROLE_COLORS: Record<string, string> = { 'Producer': '#E3B24A', 'Topliner': '#5FA39A', 'Engineer': '#C98BA0', 'A&R': '#C98BA0' };

type Lang = 'ko' | 'en';
type Theme = 'dark' | 'light';

const TX = {
  ko: {
    availability: '가능일 투표', month: '월', notFound: '존재하지 않는 로스터예요',
    noPoll: '열린 가능일 투표가 없어요', closed: '이 투표는 마감됐어요',
    identify: '본인 확인', pickName: '이름을 골라주세요', codePlaceholder: '접근 코드',
    unlock: '확인', wrongCode: '코드가 틀렸어요', unlocked: (n: string) => `${n} — 가능한 날을 눌러 선택하세요`,
    tapToPick: '되는 날짜를 눌러 표시 (여러 개 가능)', mine: '내 선택',
    stats: '통계', bestDays: '가장 많이 되는 날', people: (n: number) => `${n}명`,
    onDay: (d: number) => `${d}일 가능`, noneYet: '아직 응답이 없어요', confirmed: '확정',
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    lock: '잠금', total: '전체', selected: '선택됨',
  },
  en: {
    availability: 'Availability', month: '', notFound: 'Roster not found',
    noPoll: 'No open availability poll', closed: 'This poll is closed',
    identify: 'Verify', pickName: 'Choose your name', codePlaceholder: 'Access code',
    unlock: 'Unlock', wrongCode: 'Wrong code', unlocked: (n: string) => `${n} — tap the days you're available`,
    tapToPick: 'Tap the days you are available (multiple)', mine: 'Mine',
    stats: 'Stats', bestDays: 'Best days', people: (n: number) => `${n}`,
    onDay: (d: number) => `Day ${d}`, noneYet: 'No responses yet', confirmed: 'Confirmed',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    lock: 'Lock', total: 'Total', selected: 'Selected',
  },
};

function monthMeta(month: string) {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstWeekday = new Date(y, m - 1, 1).getDay();
  return { y, m, daysInMonth, firstWeekday };
}

export default function AvailabilityView() {
  const params = useParams();
  const search = useSearchParams();
  const hostId = params.hostId as string;

  const [lang, setLang] = useState<Lang>('ko');
  const [theme] = useState<Theme>('dark');
  const [notFound, setNotFound] = useState(false);
  const [poll, setPoll] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [picks, setPicks] = useState<any[]>([]);

  const [meId, setMeId] = useState<string | null>(search.get('m'));
  const [code, setCode] = useState(search.get('code') || '');
  const [unlocked, setUnlocked] = useState(false);
  const [codeErr, setCodeErr] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const t = TX[lang];
  const dk = theme === 'dark';
  const textMain = dk ? 'text-white' : 'text-black';
  const textSub = dk ? 'text-zinc-400' : 'text-zinc-500';
  const cardBg = dk ? 'bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]' : 'bg-white border-black/10';

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
    if (data && data.length > 0) setPoll(data[0]);
    else setPoll(null);
  }, [hostId, search]);

  const fetchPicks = useCallback(async (pollId: string) => {
    const { data } = await supabase.from('availability_picks').select('*').eq('poll_id', pollId);
    if (data) setPicks(data);
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
    fetchPicks(poll.id);
    const ch = supabase.channel(`avail-${poll.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_picks', filter: `poll_id=eq.${poll.id}` }, () => fetchPicks(poll.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_polls', filter: `host_id=eq.${hostId}` }, () => fetchPoll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [poll?.id]); // eslint-disable-line

  // auto-unlock from personal link (?m=&code=)
  useEffect(() => {
    (async () => {
      if (meId && code && !unlocked) {
        const { data } = await supabase.rpc('availability_verify', { p_member: meId, p_code: code });
        if (data === true) setUnlocked(true);
      }
    })();
  }, [meId, code, unlocked]);

  const tryUnlock = async () => {
    if (!meId || !code.trim()) return;
    const { data } = await supabase.rpc('availability_verify', { p_member: meId, p_code: code.trim() });
    if (data === true) { setUnlocked(true); setCodeErr(false); }
    else setCodeErr(true);
  };

  const toggleDay = async (day: number) => {
    if (!unlocked || !meId || !poll) return;
    const on = !picks.some((p) => p.member_id === meId && p.day === day);
    // optimistic
    setPicks((prev) => on ? [...prev, { poll_id: poll.id, member_id: meId, day }]
      : prev.filter((p) => !(p.member_id === meId && p.day === day)));
    const { error } = await supabase.rpc('availability_toggle', { p_poll: poll.id, p_member: meId, p_code: code, p_day: day, p_on: on });
    if (error) fetchPicks(poll.id); // rollback via refetch
  };

  if (notFound) return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-zinc-500 text-sm">{t.notFound}</div>;
  if (!poll) return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-zinc-500 text-sm">{t.noPoll}</div>;

  const { daysInMonth, firstWeekday, y, m } = monthMeta(poll.month);
  const countOn = (d: number) => picks.filter((p) => p.day === d).length;
  const maxCount = Math.max(1, members.length);
  const mineOn = (d: number) => !!meId && picks.some((p) => p.member_id === meId && p.day === d);
  const membersOnDay = (d: number) => members.filter((mm) => picks.some((p) => p.member_id === mm.id && p.day === d));

  const bestDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .map((d) => ({ d, c: countOn(d) })).filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c).slice(0, 5);

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const me = members.find((mm) => mm.id === meId);

  return (
    <div className={`min-h-screen font-pretendard ${dk ? 'bg-[#141414] text-white' : 'bg-[#f5f5f5] text-black'}`}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* header */}
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#E3B24A] mb-1">{t.availability}</p>
          <h1 className={`font-black text-[26px] ${textMain}`}>{poll.title || `${y}. ${m}`}</h1>
          <p className={`text-[12px] mt-1 ${textSub}`}>{y}. {String(m).padStart(2, '0')}{lang === 'ko' ? ` ${t.month}` : ''}{poll.is_open ? '' : ` · ${t.closed}`}</p>
        </div>

        {/* identify / unlock */}
        {!unlocked && poll.is_open && (
          <div className={`mb-8 rounded-2xl border p-5 ${cardBg}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${textSub}`}>{t.identify}</p>
            <select value={meId || ''} onChange={(e) => { setMeId(e.target.value || null); setCodeErr(false); }}
              className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none mb-2 ${dk ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`}>
              <option value="" className={dk ? 'bg-zinc-900' : 'bg-white'}>{t.pickName}</option>
              {members.map((mm) => <option key={mm.id} value={mm.id} className={dk ? 'bg-zinc-900' : 'bg-white'}>{mm.name} · {mm.role}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') tryUnlock(); }}
                placeholder={t.codePlaceholder}
                className={`flex-1 border rounded-xl px-4 py-3 text-[13px] outline-none tracking-widest uppercase ${dk ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-500' : 'bg-black/5 border-black/10 text-black placeholder:text-zinc-400'}`} />
              <button onClick={tryUnlock} disabled={!meId || !code.trim()}
                className="px-5 rounded-xl bg-[#E3B24A]/20 border border-[#E3B24A]/40 text-[#EFCF8E] font-black text-[12px] hover:bg-[#E3B24A]/30 transition-all disabled:opacity-40">{t.unlock}</button>
            </div>
            {codeErr && <p className="text-[11px] text-red-400 mt-2">{t.wrongCode}</p>}
          </div>
        )}

        {unlocked && me && (
          <p className={`mb-4 text-[12px] font-bold ${textSub}`}>✏️ {t.unlocked(me.name)}</p>
        )}

        {/* calendar */}
        <div className={`rounded-2xl border p-4 sm:p-6 mb-8 ${cardBg}`}>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {t.weekdays.map((w, i) => (
              <div key={i} className={`text-center text-[10px] font-black ${i === 0 ? 'text-[#C98BA0]' : i === 6 ? 'text-[#5FA39A]' : textSub}`}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const c = countOn(d);
              const mine = mineOn(d);
              const isFinal = poll.final_day === d;
              const intensity = c / maxCount; // 0..1
              const sel = selectedDay === d;
              return (
                <button key={d}
                  onClick={() => { if (unlocked) toggleDay(d); else setSelectedDay(sel ? null : d); }}
                  onDoubleClick={() => setSelectedDay(sel ? null : d)}
                  className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center transition-all
                    ${isFinal ? 'ring-2 ring-[#E3B24A]' : ''}
                    ${mine ? 'border-[#E3B24A]/70' : dk ? 'border-white/8' : 'border-black/8'}
                    ${sel ? (dk ? 'outline outline-1 outline-white/40' : 'outline outline-1 outline-black/40') : ''}
                    ${unlocked ? 'hover:scale-[1.04] cursor-pointer' : 'cursor-pointer'}`}
                  style={{ backgroundColor: c > 0 ? `rgba(227,178,74,${(0.10 + intensity * 0.55).toFixed(3)})` : 'transparent' }}>
                  <span className={`text-[12px] font-bold ${mine ? 'text-[#EFCF8E]' : textMain}`}>{d}</span>
                  {c > 0 && <span className={`text-[9px] font-black ${dk ? 'text-white/70' : 'text-black/60'}`}>{c}</span>}
                  {mine && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E3B24A]" />}
                </button>
              );
            })}
          </div>
          <p className={`text-[10px] mt-3 ${textSub}`}>
            {unlocked ? t.tapToPick : t.pickName} · {t.total} {members.length}{lang === 'ko' ? '명' : ''}
            {poll.final_day ? <> · <span className="text-[#E3B24A]">★ {poll.final_day}{lang === 'ko' ? '일' : ''} {t.confirmed}</span></> : null}
          </p>
        </div>

        {/* selected day members */}
        {selectedDay !== null && (
          <div className={`rounded-2xl border p-5 mb-8 ${cardBg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-[13px] font-black ${textMain}`}>{t.onDay(selectedDay)} · {t.people(countOn(selectedDay))}</p>
              <button onClick={() => setSelectedDay(null)} className={`text-[11px] ${textSub} hover:opacity-70`}>✕</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {membersOnDay(selectedDay).map((mm) => (
                <span key={mm.id} className="px-3 py-1 rounded-full text-[11px] font-bold border"
                  style={{ color: ROLE_COLORS[mm.role] || '#aaa', borderColor: (ROLE_COLORS[mm.role] || '#aaa') + '55', backgroundColor: (ROLE_COLORS[mm.role] || '#aaa') + '18' }}>{mm.name}</span>
              ))}
              {countOn(selectedDay) === 0 && <span className={`text-[12px] ${textSub}`}>{t.noneYet}</span>}
            </div>
          </div>
        )}

        {/* best days */}
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${textSub}`}>{t.bestDays}</p>
          {bestDays.length === 0 ? (
            <p className={`text-[12px] ${textSub}`}>{t.noneYet}</p>
          ) : (
            <div className="space-y-2">
              {bestDays.map(({ d, c }) => (
                <button key={d} onClick={() => setSelectedDay(d)} className="w-full flex items-center gap-3">
                  <span className={`text-[13px] font-black w-10 text-left ${poll.final_day === d ? 'text-[#EFCF8E]' : textMain}`}>{d}{lang === 'ko' ? '일' : ''}</span>
                  <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${dk ? 'bg-white/10' : 'bg-black/10'}`}>
                    <div className="h-full rounded-full bg-[#E3B24A]" style={{ width: `${(c / maxCount) * 100}%` }} />
                  </div>
                  <span className={`text-[11px] font-black w-10 text-right ${textSub}`}>{t.people(c)}</span>
                  {poll.final_day === d && <span className="text-[9px] font-black text-[#E3B24A]">★{t.confirmed}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
