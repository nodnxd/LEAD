'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 색상: 솔로=bright, 그룹=dim(같은 색 계열), 혼성=purple, OST=amber
const getCardColor = (gender: string, group_type: string) => {
  if (group_type === 'ost') return {
    bg: 'bg-amber-500/15', border: 'border-amber-500/25',
    text: 'text-amber-300', dot: 'bg-amber-400', accent: '#f59e0b', label: 'OST',
  };
  if (group_type === 'mixed') return {
    bg: 'bg-purple-500/15', border: 'border-purple-500/30',
    text: 'text-purple-300', dot: 'bg-purple-400', accent: '#a855f7', label: '혼성',
  };
  const isGroup = group_type === 'group';
  if (gender === 'female') return {
    bg: isGroup ? 'bg-pink-500/10' : 'bg-pink-500/20',
    border: isGroup ? 'border-pink-500/20' : 'border-pink-500/40',
    text: isGroup ? 'text-pink-400/50' : 'text-pink-300',
    dot: isGroup ? 'bg-pink-400/35' : 'bg-pink-400',
    accent: '#ec4899', label: isGroup ? 'FEMALE GROUP' : 'FEMALE',
  };
  return {
    bg: isGroup ? 'bg-blue-500/10' : 'bg-blue-500/20',
    border: isGroup ? 'border-blue-500/20' : 'border-blue-500/40',
    text: isGroup ? 'text-blue-400/50' : 'text-blue-300',
    dot: isGroup ? 'bg-blue-400/35' : 'bg-blue-400',
    accent: '#3b82f6', label: isGroup ? 'MALE GROUP' : 'MALE',
  };
};

const getLinkIcon = (url: string) => {
  if (!url) return '🔗';
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
  const diff = Math.ceil(
    (new Date(deadline).getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return 'D-DAY';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
};

const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const parseDeadline = (val: string) => {
  const clean = val.replace(/[.\-\/\s]/g, '');
  if (clean.length === 8) return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  if (clean.length === 4) return `${new Date().getFullYear()}-${clean.slice(0, 2)}-${clean.slice(2, 4)}`;
  return val;
};

const extractUrls = (text: string): string[] => (text.match(/https?:\/\/[^\s]+/g) || []);

const emptyForm = () => ({
  title: '', artist: '', gender: 'male', group_type: 'solo',
  deadline: '', deadline2: '', content: '',
});

// 1st / 2nd 데드라인 표시 컴포넌트
const DeadlineDisplay = ({ lead, size = 'normal' }: { lead: any; size?: 'compact' | 'normal' | 'large' }) => {
  const d1 = lead.deadline;
  const d2 = lead.deadline2;
  if (!d1 && !d2) return null;

  if (d1 && d2) {
    const dd1 = getDDay(d1); const dd2 = getDDay(d2);
    const exp1 = isExpired(d1); const exp2 = isExpired(d2);
    if (size === 'compact') return (
      <div className="flex flex-col gap-0.5 ml-auto shrink-0">
        <span className={`text-[8px] font-black ${exp1 ? 'text-red-400/60' : 'text-zinc-700'}`}>1st {dd1}</span>
        <span className={`text-[9px] font-black ${exp2 ? 'text-red-400' : 'text-zinc-400'}`}>2nd {dd2}</span>
      </div>
    );
    if (size === 'large') return (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 text-[10px] font-black tracking-widest">1ST</span>
          <span className={`text-[12px] font-black px-2.5 py-0.5 rounded-full border ${exp1 ? 'text-red-400/60 border-red-500/20 bg-red-500/5' : 'text-zinc-500 border-zinc-700/60 bg-zinc-800/40'}`}>{dd1}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-300 text-[10px] font-black tracking-widest">2ND</span>
          <span className={`text-[15px] font-black px-3 py-0.5 rounded-full border ${exp2 ? 'text-red-400 border-red-500/30 bg-red-500/10' : dd2 === 'D-DAY' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-zinc-100 border-zinc-500 bg-zinc-800/60'}`}>{dd2}</span>
        </div>
        <span className="text-zinc-700 text-[10px]">{d1} → {d2}</span>
      </div>
    );
    // normal
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-700 text-[9px] font-black">1st</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${exp1 ? 'text-red-400/60 border-red-500/20 bg-red-500/5' : 'text-zinc-600 border-zinc-700/50 bg-zinc-800/30'}`}>{dd1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 text-[9px] font-black">2nd</span>
          <span className={`text-[12px] font-black px-2 py-0.5 rounded-full border ${exp2 ? 'text-red-400 border-red-500/30 bg-red-500/10' : dd2 === 'D-DAY' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-zinc-300 border-zinc-600 bg-zinc-800/50'}`}>{dd2}</span>
        </div>
      </div>
    );
  }

  // 단일 데드라인
  const deadline = d1 || d2;
  const dday = getDDay(deadline);
  const expired = isExpired(deadline);
  const ddCls = expired
    ? 'text-red-400 border-red-500/30 bg-red-500/10'
    : dday === 'D-DAY' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
    : 'text-zinc-400 border-zinc-700 bg-zinc-800/50';
  if (size === 'compact') return <span className={`text-[9px] font-black shrink-0 ml-auto ${expired ? 'text-red-400' : 'text-zinc-400'}`}>{dday}</span>;
  if (size === 'large') return <span className={`text-[15px] font-black px-4 py-1.5 rounded-full border ${ddCls}`}>{dday}</span>;
  return <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${ddCls}`}>{dday}</span>;
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [viewingLead, setViewingLead] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [sortBy, setSortBy] = useState<'dday' | 'gender' | 'group'>('dday');
  const [form, setForm] = useState(emptyForm());
  const [announcement, setAnnouncement] = useState('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const toast = (msg: string) => {
    setToastMsg(msg); setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/');
      else setUser(data.user);
    });
  }, []);

  const fetchLeads = async (u = user) => {
    if (!u) return;
    const { data } = await supabase.from('leads').select('*').eq('host_id', u.id).order('deadline', { ascending: true });
    if (data) setLeads(data);
  };

  const fetchAnnouncement = async (u = user) => {
    if (!u) return;
    const { data } = await supabase.from('lead_announcements').select('content').eq('host_id', u.id).single();
    if (data) setAnnouncement(data.content || '');
  };

  useEffect(() => {
    if (user) { fetchLeads(user); fetchAnnouncement(user); }
  }, [user]);

  const openCreate = (prefillDate?: string) => {
    const f = emptyForm();
    if (prefillDate) f.deadline = prefillDate;
    setForm(f); setEditingLead(null); setShowModal(true);
  };

  const openEdit = (lead: any) => {
    setForm({
      title: lead.title, artist: lead.artist,
      gender: lead.gender || 'male', group_type: lead.group_type || 'solo',
      deadline: lead.deadline || '', deadline2: lead.deadline2 || '',
      content: lead.content || '',
    });
    setEditingLead(lead); setShowModal(true);
  };

  const saveLead = async () => {
    if (!form.title.trim() || !form.artist.trim()) return;
    const urls = extractUrls(form.content);
    const payload = {
      title: form.title, artist: form.artist, gender: form.gender,
      group_type: form.group_type,
      deadline: form.deadline || null, deadline2: form.deadline2 || null,
      content: form.content, reference_url: urls[0] || null, host_id: user.id,
    };
    if (editingLead) await supabase.from('leads').update(payload).eq('id', editingLead.id);
    else await supabase.from('leads').insert(payload);
    setShowModal(false); fetchLeads();
    toast(editingLead ? '✅ 수정됐어요!' : '✅ 추가됐어요!');
  };

  const deleteLead = async (id: string) => {
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads(); setViewingLead(null); toast('🗑 삭제됐어요');
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/view/${user.id}`);
    toast('🔗 링크 복사됐어요!');
  };

  const saveAnnouncement = async () => {
    const { data: existing } = await supabase.from('lead_announcements').select('id').eq('host_id', user.id).single();
    if (existing) {
      await supabase.from('lead_announcements').update({ content: announcementDraft, updated_at: new Date().toISOString() }).eq('host_id', user.id);
    } else {
      await supabase.from('lead_announcements').insert({ host_id: user.id, content: announcementDraft });
    }
    setAnnouncement(announcementDraft); setShowAnnouncementModal(false);
    toast('📢 공지 저장됐어요!');
  };

  const deleteAnnouncement = async () => {
    await supabase.from('lead_announcements').delete().eq('host_id', user.id);
    setAnnouncement(''); setShowAnnouncementModal(false); toast('공지 삭제됐어요');
  };

  const insertLink = () => {
    const url = prompt('링크를 입력해요:');
    if (!url?.trim()) return;
    const ta = contentRef.current; if (!ta) return;
    const start = ta.selectionStart; const end = ta.selectionEnd;
    const selectedText = form.content.slice(start, end);
    const insertion = selectedText ? `${selectedText} ${url}` : url;
    const newContent = form.content.slice(0, start) + insertion + '\n' + form.content.slice(end);
    setForm(p => ({ ...p, content: newContent }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insertion.length + 1, start + insertion.length + 1); }, 0);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear(); const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  const getLeadsForDay = (day: number) => {
    const { year, month } = getDaysInMonth(currentMonth);
    const dateStr = toDateStr(year, month + 1, day);
    return leads.filter(l => l.deadline === dateStr || l.deadline2 === dateStr);
  };

  const today = new Date();
  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  const sortedLeads = [...leads].sort((a, b) => {
    if (sortBy === 'gender') return a.gender.localeCompare(b.gender);
    if (sortBy === 'group') return a.group_type.localeCompare(b.group_type);
    const aDate = a.deadline || a.deadline2; const bDate = b.deadline || b.deadline2;
    if (!aDate) return 1; if (!bDate) return -1;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });

  const renderContent = (content: string) => {
    if (!content) return null;
    return content.split(/(https?:\/\/[^\s]+)/g).map((part, i) => {
      if (part.match(/^https?:\/\//)) return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#5B8CFF] hover:underline break-all">
          <span>{getLinkIcon(part)}</span>
          <span>{part.replace(/^https?:\/\//, '').split('/').slice(0, 2).join('/')}</span>
        </a>
      );
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const DateShortcuts = ({ field }: { field: 'deadline' | 'deadline2' }) => (
    <div className="flex gap-1.5 mt-2">
      {[1, 3, 7, 14, 30].map(d => {
        const dt = new Date(); dt.setDate(dt.getDate() + d);
        const str = toDateStr(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
        return (
          <button key={d} onClick={() => setForm(p => ({ ...p, [field]: str }))}
            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-500 text-[10px] font-bold hover:text-[#5B8CFF] hover:border-[#5B8CFF]/30 transition-all">
            +{d}일
          </button>
        );
      })}
    </div>
  );

  const LeadCard = ({ lead, compact = false }: { lead: any; compact?: boolean }) => {
    const c = getCardColor(lead.gender, lead.group_type);
    const expired = isExpired(lead.deadline2 || lead.deadline);
    const urls = extractUrls(lead.content || '');
    return (
      <div
        onClick={() => setViewingLead(lead)}
        className={`border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${c.bg} ${c.border} ${expired ? 'opacity-35 grayscale' : ''} ${compact ? 'p-2' : 'p-4'}`}
      >
        {compact ? (
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
            <span className="text-white text-[11px] font-bold truncate">{lead.artist}</span>
            <DeadlineDisplay lead={lead} size="compact" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>{c.label}</span>
                </div>
                <h3 className="text-white font-black text-[15px] truncate">{lead.artist}</h3>
                <p className="text-zinc-400 text-[12px] truncate">{lead.title}</p>
              </div>
              <div className="ml-2 shrink-0"><DeadlineDisplay lead={lead} size="normal" /></div>
            </div>
            {lead.content && (
              <p className="text-zinc-500 text-[11px] line-clamp-2 mt-1">
                {lead.content.replace(/https?:\/\/[^\s]+/g, '🔗').slice(0, 80)}
              </p>
            )}
            {urls.length > 0 && (
              <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">
                {urls.slice(0, 3).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className="text-[13px] hover:scale-110 transition-transform">{getLinkIcon(url)}</a>
                ))}
                {urls.length > 3 && <span className="text-zinc-700 text-[10px] self-center">+{urls.length - 3}</span>}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (!user) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-zinc-600 text-[11px] font-black tracking-widest">Loading...</div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard { font-family: 'Pretendard', sans-serif; } input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }`}} />
      <main className="min-h-screen bg-[#050505] text-white p-5 lg:p-8 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.06] pointer-events-none" />

        {/* 헤더 */}
        <div className="relative z-10 flex items-baseline justify-center gap-2.5 mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
          <span className="text-zinc-500 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
        </div>

        {/* 공지 배너 (호스트 전용 — 수정 버튼 포함) */}
        {announcement ? (
          <div className="relative z-10 mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20">
            <span className="text-[#5B8CFF] text-[11px] font-black mt-0.5 shrink-0">📢</span>
            <p className="text-zinc-300 text-[12px] leading-relaxed whitespace-pre-line flex-1">{announcement}</p>
            <button onClick={() => { setAnnouncementDraft(announcement); setShowAnnouncementModal(true); }}
              className="text-zinc-600 hover:text-zinc-400 text-[10px] shrink-0 font-bold">수정</button>
          </div>
        ) : null}

        {/* 상단 바 */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[13px] font-bold">{leads.filter(l => !isExpired(l.deadline2 || l.deadline)).length} 활성</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-700 text-[13px]">{leads.filter(l => isExpired(l.deadline2 || l.deadline)).length} 마감</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
              <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view === 'calendar' ? 'bg-[#5B8CFF] text-white' : 'text-zinc-500 hover:text-white'}`}>📅 달력</button>
              <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view === 'list' ? 'bg-[#5B8CFF] text-white' : 'text-zinc-500 hover:text-white'}`}>📋 목록</button>
            </div>
            <button onClick={() => { setAnnouncementDraft(announcement); setShowAnnouncementModal(true); }}
              className="bg-white/5 border border-white/10 text-zinc-400 px-3 py-2 rounded-xl font-bold text-[11px] hover:text-white hover:bg-white/10 transition-all">📢 공지</button>
            <button onClick={copyShareLink}
              className="bg-white/5 border border-white/10 text-zinc-400 px-3 py-2 rounded-xl font-bold text-[11px] hover:text-white hover:bg-white/10 transition-all">🔗 공유</button>
            <button onClick={() => openCreate()}
              className="bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white px-5 py-2 rounded-xl font-black text-[11px] hover:scale-105 transition-all shadow-lg shadow-blue-900/20">+ 리드 추가</button>
            <button onClick={() => { supabase.auth.signOut(); router.push('/'); }}
              className="text-zinc-600 hover:text-red-400 text-[11px] font-bold transition-colors">로그아웃</button>
          </div>
        </div>

        {/* 달력 뷰 */}
        {view === 'calendar' && (
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-[14px]">‹</button>
              <h2 className="text-white font-black text-[16px]">{year}년 {month + 1}월</h2>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-[14px]">›</button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-black py-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-600'}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const dayLeads = getLeadsForDay(day);
                const isPast = new Date(year, month, day) < new Date(new Date().toDateString());
                const dateStr = toDateStr(year, month + 1, day);
                return (
                  <div key={day} onDoubleClick={() => openCreate(dateStr)}
                    className={`min-h-[80px] rounded-xl p-1.5 border transition-all select-none hover:border-white/15 ${isToday ? 'border-[#5B8CFF]/50 bg-[#5B8CFF]/10' : 'border-white/5 bg-white/[0.02]'} ${isPast && !isToday ? 'opacity-50' : ''}`}
                  >
                    <div className={`text-[11px] font-black mb-1 ${isToday ? 'text-[#5B8CFF]' : isPast ? 'text-zinc-700' : 'text-zinc-400'}`}>{day}</div>
                    <div className="flex flex-col gap-0.5">
                      {dayLeads.map(lead => <LeadCard key={lead.id} lead={lead} compact />)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 flex-wrap gap-2">
              <p className="text-zinc-700 text-[11px]">날짜 더블클릭 → 빠른 추가</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-zinc-600 text-[11px]">남자</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400/30" /><span className="text-zinc-600 text-[11px]">남자그룹</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-400" /><span className="text-zinc-600 text-[11px]">여자</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-400/30" /><span className="text-zinc-600 text-[11px]">여자그룹</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-400" /><span className="text-zinc-600 text-[11px]">혼성</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-zinc-600 text-[11px]">OST</span></div>
              </div>
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
              <div className="text-center py-20">
                <p className="text-zinc-700 text-[13px]">리드가 없어요</p>
                <button onClick={() => openCreate()} className="mt-4 text-[#5B8CFF] text-[12px] font-bold hover:underline">+ 첫 리드 추가</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {sortedLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 상세 모달 */}
      {viewingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={() => setViewingLead(null)}>
          <div
            className={`w-full max-w-2xl border rounded-[2rem] shadow-2xl ${getCardColor(viewingLead.gender, viewingLead.group_type).bg} ${getCardColor(viewingLead.gender, viewingLead.group_type).border}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${getCardColor(viewingLead.gender, viewingLead.group_type).text}`}>
                    {getCardColor(viewingLead.gender, viewingLead.group_type).label}
                  </span>
                  <h2 className="text-white font-black text-[28px] mt-0.5 leading-tight">{viewingLead.artist}</h2>
                  <p className="text-zinc-400 text-[16px] mt-1">{viewingLead.title}</p>
                </div>
                <div className="ml-4 shrink-0">
                  <DeadlineDisplay lead={viewingLead} size="large" />
                </div>
              </div>

              {viewingLead.content && (
                <div className="mb-6">
                  <p className="text-zinc-500 text-[11px] font-black uppercase tracking-widest mb-3">내용</p>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-zinc-300 text-[14px] leading-relaxed">
                    {renderContent(viewingLead.content)}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setViewingLead(null); openEdit(viewingLead); }}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-bold text-[13px] hover:bg-white/10 transition-all">수정</button>
                <button onClick={() => { if (confirm(`"${viewingLead.title}" 삭제할까요?`)) deleteLead(viewingLead.id); }}
                  className="py-3 px-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[13px] hover:bg-red-500/20 transition-all">삭제</button>
                <button onClick={() => setViewingLead(null)}
                  className="py-3 px-5 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 공지 모달 */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={() => setShowAnnouncementModal(false)}>
          <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-white font-black text-[18px] mb-1">📢 공지 설정</h2>
              <p className="text-zinc-600 text-[12px] mb-4">게스트 뷰 상단에 표시돼요.</p>
              <textarea
                value={announcementDraft}
                onChange={e => setAnnouncementDraft(e.target.value)}
                placeholder="공지 내용을 입력하세요..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white resize-none leading-relaxed"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowAnnouncementModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">취소</button>
                {announcement && (
                  <button onClick={deleteAnnouncement}
                    className="py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[13px] hover:bg-red-500/20 transition-all">삭제</button>
                )}
                <button onClick={saveAnnouncement}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl my-4">
            <div className="p-6">
              <h2 className="text-white font-black text-[18px] mb-5">{editingLead ? '리드 수정' : '리드 추가'}</h2>
              <div className="flex flex-col gap-4">

                <div className="grid grid-cols-2 gap-3">
                  <input value={form.artist} onChange={e => setForm(p => ({ ...p, artist: e.target.value }))} placeholder="아티스트명 *" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white" />
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="리드 제목 *" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none text-zinc-300">
                    <option value="male" className="bg-zinc-900">남자</option>
                    <option value="female" className="bg-zinc-900">여자</option>
                  </select>
                  <select value={form.group_type} onChange={e => setForm(p => ({ ...p, group_type: e.target.value }))} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none text-zinc-300">
                    <option value="solo" className="bg-zinc-900">솔로</option>
                    <option value="group" className="bg-zinc-900">그룹</option>
                    <option value="mixed" className="bg-zinc-900">혼성</option>
                    <option value="ost" className="bg-zinc-900">OST</option>
                  </select>
                </div>

                {/* 1st Deadline */}
                <div>
                  <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 block">1st Deadline</label>
                  <div className="flex gap-2">
                    <input value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                      onBlur={e => setForm(p => ({ ...p, deadline: parseDeadline(e.target.value) }))}
                      placeholder="YYYY-MM-DD 또는 MMDD"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-600 text-white" />
                    <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all text-zinc-400 w-14 cursor-pointer" />
                  </div>
                  <DateShortcuts field="deadline" />
                </div>

                {/* 2nd Deadline */}
                <div>
                  <label className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5 block">
                    2nd Deadline <span className="text-zinc-700 font-normal normal-case">(선택)</span>
                  </label>
                  <div className="flex gap-2">
                    <input value={form.deadline2} onChange={e => setForm(p => ({ ...p, deadline2: e.target.value }))}
                      onBlur={e => setForm(p => ({ ...p, deadline2: parseDeadline(e.target.value) }))}
                      placeholder="YYYY-MM-DD 또는 MMDD"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-white/20 transition-all placeholder:text-zinc-700 text-zinc-300" />
                    <input type="date" value={form.deadline2} onChange={e => setForm(p => ({ ...p, deadline2: e.target.value }))}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-[13px] outline-none focus:border-white/20 transition-all text-zinc-400 w-14 cursor-pointer" />
                  </div>
                  <DateShortcuts field="deadline2" />
                </div>

                {/* 내용 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">내용 / 레퍼런스</label>
                    <button onClick={insertLink}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-400 text-[11px] font-bold hover:text-[#5B8CFF] hover:border-[#5B8CFF]/30 transition-all">
                      🔗 링크 삽입
                    </button>
                  </div>
                  <textarea ref={contentRef} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    placeholder={`자유롭게 내용을 작성하세요.\n\n멜로디 레퍼런스\nhttps://youtu.be/...\n\n사운드 방향\n팝 발라드, 어쿠스틱 느낌으로`}
                    rows={8}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white resize-none leading-relaxed" />
                  <p className="text-zinc-700 text-[11px] mt-1">링크를 어디에나 붙여넣으면 자동으로 클릭 가능해져요</p>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">취소</button>
                <button onClick={saveLead} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[12px] font-bold px-5 py-3 rounded-2xl shadow-2xl font-pretendard">{toastMsg}</div>
      )}
    </>
  );
}