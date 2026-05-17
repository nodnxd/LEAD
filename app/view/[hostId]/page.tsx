'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STATUS_LABEL: Record<string, string> = { pending: '대기', progress: '진행중', done: '완료', pass: '패스' };
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  done: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pass: 'bg-zinc-500/20 text-zinc-500 border-zinc-500/30',
};

const getCardColor = (gender: string, group_type: string) => {
  if (group_type === 'group') return { bg: 'bg-purple-500/20', border: 'border-purple-500/40', text: 'text-purple-300', dot: 'bg-purple-400' };
  if (gender === 'female') return { bg: 'bg-pink-500/20', border: 'border-pink-500/40', text: 'text-pink-300', dot: 'bg-pink-400' };
  return { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300', dot: 'bg-blue-400' };
};

const getLinkIcon = (url: string) => {
  if (url.includes('youtube') || url.includes('youtu.be')) return '▶️';
  if (url.includes('soundcloud')) return '🎵';
  if (url.includes('spotify')) return '🎧';
  if (url.includes('instagram')) return '📸';
  return '🔗';
};

const isExpired = (deadline: string | null) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
};

const getDDay = (deadline: string | null) => {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline).getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-DAY';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
};

export default function GuestView() {
  const params = useParams();
  const hostId = params.hostId as string;
  const [leads, setLeads] = useState<any[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingLead, setViewingLead] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [sortBy, setSortBy] = useState<'dday' | 'gender' | 'group'>('dday');

  const fetchLeads = async () => {
    const { data } = await supabase.from('leads').select('*').eq('host_id', hostId).order('deadline', { ascending: true });
    if (!data || data.length === 0) { setNotFound(false); setLeads([]); return; }
    setLeads(data);
  };

  useEffect(() => {
    if (!hostId) return;
    fetchLeads();
    const channel = supabase.channel('guest-lead')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `host_id=eq.${hostId}` }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hostId]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  const getLeadsForDay = (day: number) => {
    const { year, month } = getDaysInMonth(currentMonth);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return leads.filter(l => l.deadline === dateStr);
  };

  const today = new Date();
  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  const sortedLeads = [...leads].sort((a, b) => {
    if (sortBy === 'gender') return a.gender.localeCompare(b.gender);
    if (sortBy === 'group') return a.group_type.localeCompare(b.group_type);
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const LeadCard = ({ lead, compact = false }: { lead: any; compact?: boolean }) => {
    const c = getCardColor(lead.gender, lead.group_type);
    const expired = isExpired(lead.deadline);
    const dday = getDDay(lead.deadline);
    return (
      <div
        onClick={() => setViewingLead(lead)}
        className={`border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${c.bg} ${c.border} ${expired ? 'opacity-40 grayscale' : ''} ${compact ? 'p-2' : 'p-4'}`}
      >
        {compact ? (
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
            <span className="text-white text-[11px] font-bold truncate">{lead.artist}</span>
            {dday && <span className={`text-[9px] font-black shrink-0 ${expired ? 'text-red-400' : 'text-zinc-400'}`}>{dday}</span>}
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>
                    {lead.group_type === 'group' ? 'GROUP' : lead.gender === 'female' ? 'FEMALE' : 'MALE'}
                  </span>
                </div>
                <h3 className="text-white font-black text-[15px]">{lead.artist}</h3>
                <p className="text-zinc-400 text-[12px]">{lead.title}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {dday && (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${expired ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-zinc-400 border-zinc-700 bg-zinc-800/50'}`}>{dday}</span>
                )}
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
              </div>
            </div>
            {lead.reference_url && (
              <a href={lead.reference_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-500 hover:text-white transition-colors">
                <span>{getLinkIcon(lead.reference_url)}</span>
                <span className="truncate">{lead.reference_url.replace('https://', '').split('/').slice(0, 2).join('/')}</span>
              </a>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; }`}} />
      <main className="min-h-screen bg-[#050505] text-white p-5 lg:p-8 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.06] pointer-events-none" />

        {/* 헤더 */}
        <div className="relative z-10 flex items-baseline justify-center gap-2.5 mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
          <span className="text-zinc-500 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
        </div>

        {/* 상단 바 */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[13px] font-bold">{leads.filter(l => !isExpired(l.deadline)).length} 활성</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-700 text-[13px]">{leads.filter(l => isExpired(l.deadline)).length} 마감</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
              <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view === 'calendar' ? 'bg-[#5B8CFF] text-white' : 'text-zinc-500 hover:text-white'}`}>📅 달력</button>
              <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view === 'list' ? 'bg-[#5B8CFF] text-white' : 'text-zinc-500 hover:text-white'}`}>📋 목록</button>
            </div>
            <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Guest</span>
          </div>
        </div>

        {/* 달력 뷰 */}
        {view === 'calendar' && (
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[14px] flex items-center justify-center">‹</button>
              <h2 className="text-white font-black text-[16px]">{year}년 {month + 1}월</h2>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[14px] flex items-center justify-center">›</button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-black py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-600'}`}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const dayLeads = getLeadsForDay(day);
                const isPast = new Date(year, month, day) < new Date(new Date().toDateString());
                return (
                  <div key={day} className={`min-h-[80px] rounded-xl p-1.5 border transition-all ${isToday ? 'border-[#5B8CFF]/50 bg-[#5B8CFF]/10' : 'border-white/5 bg-white/[0.02]'} ${isPast && !isToday ? 'opacity-50' : ''}`}>
                    <div className={`text-[11px] font-black mb-1 ${isToday ? 'text-[#5B8CFF]' : isPast ? 'text-zinc-700' : 'text-zinc-400'}`}>{day}</div>
                    <div className="flex flex-col gap-0.5">
                      {dayLeads.map(lead => <LeadCard key={lead.id} lead={lead} compact />)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-zinc-600 text-[11px]">남자</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-400" /><span className="text-zinc-600 text-[11px]">여자</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-400" /><span className="text-zinc-600 text-[11px]">그룹</span></div>
            </div>
          </div>
        )}

        {/* 목록 뷰 */}
        {view === 'list' && (
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-zinc-600 text-[11px]">정렬:</span>
              {([['dday', 'D-Day'], ['gender', '성별'], ['group', '그룹']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setSortBy(val)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${sortBy === val ? 'border-[#5B8CFF]/50 bg-[#5B8CFF]/20 text-[#5B8CFF]' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
            {sortedLeads.length === 0 ? (
              <div className="text-center py-20"><p className="text-zinc-700 text-[13px]">리드가 없어요</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {sortedLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
              </div>
            )}
          </div>
        )}

        <div className="relative z-10 mt-8 pb-8 text-center">
          <p className="text-zinc-600 text-[11px]">Contact : everplayground@gmail.com</p>
        </div>
      </main>

      {/* 리드 상세 모달 */}
      {viewingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={() => setViewingLead(null)}>
          <div className={`w-full max-w-md border rounded-[2rem] overflow-hidden shadow-2xl ${getCardColor(viewingLead.gender, viewingLead.group_type).bg} ${getCardColor(viewingLead.gender, viewingLead.group_type).border}`} onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${getCardColor(viewingLead.gender, viewingLead.group_type).text}`}>
                    {viewingLead.group_type === 'group' ? 'GROUP' : viewingLead.gender === 'female' ? 'FEMALE' : 'MALE'}
                  </span>
                  <h2 className="text-white font-black text-[22px] mt-0.5">{viewingLead.artist}</h2>
                  <p className="text-zinc-400 text-[14px]">{viewingLead.title}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getDDay(viewingLead.deadline) && (
                    <span className={`text-[12px] font-black px-3 py-1 rounded-full border ${isExpired(viewingLead.deadline) ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-zinc-300 border-zinc-600 bg-zinc-800/50'}`}>
                      {getDDay(viewingLead.deadline)}
                    </span>
                  )}
                  {viewingLead.deadline && <span className="text-zinc-600 text-[11px]">{viewingLead.deadline}</span>}
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[viewingLead.status]}`}>{STATUS_LABEL[viewingLead.status]}</span>
                </div>
              </div>

              {viewingLead.reference_url && (
                <div className="mb-4">
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">레퍼런스</p>
                  <a href={viewingLead.reference_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                    <span className="text-[16px]">{getLinkIcon(viewingLead.reference_url)}</span>
                    <span className="text-zinc-300 text-[12px] truncate">{viewingLead.reference_url.replace('https://', '').split('/').slice(0, 3).join('/')}</span>
                    <span className="ml-auto text-[10px] text-[#5B8CFF] font-black">열기 →</span>
                  </a>
                </div>
              )}

              {viewingLead.links?.length > 0 && (
                <div className="mb-4">
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">링크</p>
                  <div className="flex flex-col gap-1.5">
                    {viewingLead.links.map((link: string, i: number) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <span>{getLinkIcon(link)}</span>
                        <span className="text-zinc-400 text-[11px] truncate">{link.replace('https://', '').split('/').slice(0, 2).join('/')}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {viewingLead.memo && (
                <div className="mb-5">
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">메모</p>
                  <p className="text-zinc-300 text-[13px] leading-relaxed whitespace-pre-line">{viewingLead.memo}</p>
                </div>
              )}

              <button onClick={() => setViewingLead(null)} className="w-full py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[12px] hover:text-white transition-all">닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}