'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getCardColor = (gender:string, group_type:string) => {
  const g=group_type==='group';
  if(gender==='mixed')return{bg:g?'bg-purple-500/10':'bg-purple-500/20',border:g?'border-purple-500/20':'border-purple-500/40',text:g?'text-purple-400/50':'text-purple-300',dot:g?'bg-purple-400/35':'bg-purple-400',label:g?'혼성 그룹':'혼성'};
  if(gender==='female')return{bg:g?'bg-pink-500/10':'bg-pink-500/20',border:g?'border-pink-500/20':'border-pink-500/40',text:g?'text-pink-400/50':'text-pink-300',dot:g?'bg-pink-400/35':'bg-pink-400',label:g?'여자 그룹':'여자'};
  return{bg:g?'bg-blue-500/10':'bg-blue-500/20',border:g?'border-blue-500/20':'border-blue-500/40',text:g?'text-blue-400/50':'text-blue-300',dot:g?'bg-blue-400/35':'bg-blue-400',label:g?'남자 그룹':'남자'};
};

const ALBUM_MAP:Record<string,{label:string;cls:string}>={
  single:{label:'Single',cls:'text-zinc-500 border-zinc-700/50 bg-zinc-800/30'},
  ep:{label:'EP',cls:'text-emerald-400/80 border-emerald-700/30 bg-emerald-900/20'},
  lp:{label:'LP',cls:'text-blue-400/80 border-blue-700/30 bg-blue-900/20'},
  ost:{label:'OST',cls:'text-amber-400/80 border-amber-700/30 bg-amber-900/20'},
};
const AlbumBadge=({type}:{type:string})=>{const t=ALBUM_MAP[type]||ALBUM_MAP.single;return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${t.cls}`}>{t.label}</span>;};

const getLinkIcon=(url:string)=>{
  if(!url)return '🔗';
  if(url.includes('youtube')||url.includes('youtu.be'))return '▶️';
  if(url.includes('soundcloud'))return '🎵';
  if(url.includes('spotify'))return '🎧';
  if(url.includes('instagram'))return '📸';
  return '🔗';
};

const isExpired=(d:string|null)=>!!d&&new Date(d)<new Date(new Date().toDateString());
const getDDay=(d:string|null)=>{
  if(!d)return null;
  const diff=Math.ceil((new Date(d).getTime()-new Date(new Date().toDateString()).getTime())/86400000);
  if(diff===0)return 'D-DAY';return diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;
};
const toDateStr=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const extractUrls=(t:string)=>t.match(/https?:\/\/[^\s]+/g)||[];
const startOfWeek=(d:Date)=>{const r=new Date(d);r.setDate(r.getDate()-r.getDay());r.setHours(0,0,0,0);return r;};

const DeadlineDisplay=({lead,size='normal'}:{lead:any;size?:'compact'|'normal'|'large'})=>{
  const d1=lead.deadline;const d2=lead.deadline2;
  if(!d1&&!d2)return null;
  if(d1&&d2){
    const dd1=getDDay(d1);const dd2=getDDay(d2);const e1=isExpired(d1);const e2=isExpired(d2);
    if(size==='compact')return <div className="flex flex-col gap-0.5 ml-auto shrink-0"><span className={`text-[8px] font-black ${e1?'text-red-400/60':'text-zinc-700'}`}>1st {dd1}</span><span className={`text-[9px] font-black ${e2?'text-red-400':'text-zinc-400'}`}>2nd {dd2}</span></div>;
    if(size==='large')return <div className="flex flex-col items-end gap-2"><div className="flex items-center gap-2"><span className="text-zinc-600 text-[10px] font-black tracking-widest">1ST</span><span className={`text-[12px] font-black px-2.5 py-0.5 rounded-full border ${e1?'text-red-400/60 border-red-500/20 bg-red-500/5':'text-zinc-500 border-zinc-700/60 bg-zinc-800/40'}`}>{dd1}</span></div><div className="flex items-center gap-2"><span className="text-zinc-300 text-[10px] font-black tracking-widest">2ND</span><span className={`text-[15px] font-black px-3 py-0.5 rounded-full border ${e2?'text-red-400 border-red-500/30 bg-red-500/10':dd2==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-100 border-zinc-500 bg-zinc-800/60'}`}>{dd2}</span></div><span className="text-zinc-700 text-[10px]">{d1} → {d2}</span></div>;
    return <div className="flex flex-col items-end gap-1"><div className="flex items-center gap-1.5"><span className="text-zinc-700 text-[9px] font-black">1st</span><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${e1?'text-red-400/60 border-red-500/20 bg-red-500/5':'text-zinc-600 border-zinc-700/50 bg-zinc-800/30'}`}>{dd1}</span></div><div className="flex items-center gap-1.5"><span className="text-zinc-400 text-[9px] font-black">2nd</span><span className={`text-[12px] font-black px-2 py-0.5 rounded-full border ${e2?'text-red-400 border-red-500/30 bg-red-500/10':dd2==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-300 border-zinc-600 bg-zinc-800/50'}`}>{dd2}</span></div></div>;
  }
  const deadline=d1||d2;const dday=getDDay(deadline);const exp=isExpired(deadline);
  const ddCls=exp?'text-red-400 border-red-500/30 bg-red-500/10':dday==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-400 border-zinc-700 bg-zinc-800/50';
  if(size==='compact')return <span className={`text-[9px] font-black shrink-0 ml-auto ${exp?'text-red-400':'text-zinc-400'}`}>{dday}</span>;
  if(size==='large')return <span className={`text-[15px] font-black px-4 py-1.5 rounded-full border ${ddCls}`}>{dday}</span>;
  return <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${ddCls}`}>{dday}</span>;
};

const FilterPill=({label,active,onClick}:{label:string;active:boolean;onClick:()=>void})=>(
  <button onClick={onClick} className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${active?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}>{label}</button>
);

const emptyPitch=()=>({artist_name:'',contact:'',message:''});

export default function GuestView() {
  const params=useParams();
  const hostId=params.hostId as string;
  const [leads,setLeads]=useState<any[]>([]);
  const [announcements,setAnnouncements]=useState<any[]>([]);
  const [view,setView]=useState<'calendar'|'list'>('calendar');
  const [calView,setCalView]=useState<'month'|'week'>('month');
  const [currentMonth,setCurrentMonth]=useState(new Date());
  const [weekStart,setWeekStart]=useState(startOfWeek(new Date()));
  const [viewingLead,setViewingLead]=useState<any>(null);
  const [pitchingLead,setPitchingLead]=useState<any>(null);
  const [pitchForm,setPitchForm]=useState(emptyPitch());
  const [pitchSent,setPitchSent]=useState(false);
  const [pitchLoading,setPitchLoading]=useState(false);
  // list filters
  const [filterGender,setFilterGender]=useState<string[]>([]);
  const [filterGroup,setFilterGroup]=useState<string[]>([]);
  const [filterAlbum,setFilterAlbum]=useState<string[]>([]);
  const [sortBy,setSortBy]=useState<'dday'|'gender'|'group'|'album'>('dday');

  const fetchAll=async()=>{
    const [lr,ar]=await Promise.all([
      supabase.from('leads').select('*').eq('host_id',hostId).order('deadline',{ascending:true}),
      supabase.from('lead_announcements').select('*').eq('host_id',hostId).order('created_at',{ascending:true}),
    ]);
    if(lr.data)setLeads(lr.data);
    if(ar.data)setAnnouncements(ar.data);
  };

  useEffect(()=>{
    if(!hostId)return;
    fetchAll();
    const ch=supabase.channel('guest-lead').on('postgres_changes',{event:'*',schema:'public',table:'leads',filter:`host_id=eq.${hostId}`},fetchAll).subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[hostId]);

  const submitPitch=async()=>{
    if(!pitchForm.artist_name.trim()||!pitchForm.contact.trim()||!pitchingLead)return;
    setPitchLoading(true);
    await supabase.from('pitches').insert({
      lead_id:pitchingLead.id,host_id:hostId,
      artist_name:pitchForm.artist_name,contact:pitchForm.contact,message:pitchForm.message,
    });
    setPitchLoading(false);setPitchSent(true);
  };

  const renderContent=(content:string)=>{
    if(!content)return null;
    return content.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>{
      if(part.match(/^https?:\/\//))return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#5B8CFF] hover:underline break-all"><span>{getLinkIcon(part)}</span><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const getDaysInMonth=(date:Date)=>{const y=date.getFullYear(),m=date.getMonth();return{firstDay:new Date(y,m,1).getDay(),daysInMonth:new Date(y,m+1,0).getDate(),year:y,month:m};};
  const getLeadsForDate=(ds:string)=>leads.filter(l=>l.deadline===ds||l.deadline2===ds);
  const weekDays=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;}),[weekStart]);

  const today=new Date();
  const {firstDay,daysInMonth,year,month}=getDaysInMonth(currentMonth);
  const DAYS=['일','월','화','수','목','금','토'];

  const filteredLeads=useMemo(()=>{
    let l=[...leads];
    if(filterGender.length)l=l.filter(x=>filterGender.includes(x.gender));
    if(filterGroup.length)l=l.filter(x=>filterGroup.includes(x.group_type));
    if(filterAlbum.length)l=l.filter(x=>filterAlbum.includes(x.album_type||'single'));
    return l.sort((a,b)=>{
      if(sortBy==='gender')return a.gender.localeCompare(b.gender);
      if(sortBy==='group')return a.group_type.localeCompare(b.group_type);
      if(sortBy==='album')return(a.album_type||'single').localeCompare(b.album_type||'single');
      const aD=a.deadline||a.deadline2;const bD=b.deadline||b.deadline2;
      if(!aD)return 1;if(!bD)return -1;
      return new Date(aD).getTime()-new Date(bD).getTime();
    });
  },[leads,filterGender,filterGroup,filterAlbum,sortBy]);

  const LeadCard=({lead,compact=false}:{lead:any;compact?:boolean})=>{
    const c=getCardColor(lead.gender,lead.group_type);
    const expired=isExpired(lead.deadline2||lead.deadline);
    const urls=extractUrls(lead.content||'');
    return (
      <div onClick={()=>setViewingLead(lead)} className={`border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${c.bg} ${c.border} ${expired?'opacity-40 grayscale':''} ${compact?'p-2':'p-4'}`}>
        {compact?(
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}/><span className="text-white text-[11px] font-bold truncate">{lead.artist}</span>
            <DeadlineDisplay lead={lead} size="compact"/>
          </div>
        ):(
          <>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}/><span className={`text-[10px] font-black ${c.text}`}>{c.label}</span><AlbumBadge type={lead.album_type||'single'}/></div>
                <h3 className="text-white font-black text-[15px] truncate">{lead.artist}</h3>
                <p className="text-zinc-400 text-[12px] truncate">{lead.title}</p>
              </div>
              <div className="ml-2 shrink-0"><DeadlineDisplay lead={lead} size="normal"/></div>
            </div>
            {lead.content&&<p className="text-zinc-500 text-[11px] line-clamp-2 mt-1">{lead.content.replace(/https?:\/\/[^\s]+/g,'🔗').slice(0,80)}</p>}
            {urls.length>0&&<div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">{urls.slice(0,3).map((url,i)=><a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-[13px] hover:scale-110 transition-transform">{getLinkIcon(url)}</a>)}{urls.length>3&&<span className="text-zinc-700 text-[10px] self-center">+{urls.length-3}</span>}</div>}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html:`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}`}}/>
      <main className="min-h-screen bg-[#050505] text-white p-5 lg:p-8 font-pretendard relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.06] pointer-events-none"/>

        <div className="relative z-10 flex items-baseline justify-center gap-2.5 mb-8">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1>
          <span className="text-zinc-500 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
        </div>

        {/* 공지 배너 */}
        {announcements.length>0&&<div className="relative z-10 mb-5 flex flex-col gap-2">{announcements.map(ann=><div key={ann.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20"><span className="text-[#5B8CFF] text-[11px] font-black mt-0.5 shrink-0">📢</span><div>{ann.title&&<p className="text-white font-bold text-[13px] mb-0.5">{ann.title}</p>}<p className="text-zinc-300 text-[12px] leading-relaxed whitespace-pre-line">{ann.content}</p></div></div>)}</div>}

        {/* 상단 바 */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[13px] font-bold">{leads.filter(l=>!isExpired(l.deadline2||l.deadline)).length} 활성</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-700 text-[13px]">{leads.filter(l=>isExpired(l.deadline2||l.deadline)).length} 마감</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
              <button onClick={()=>setView('calendar')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='calendar'?'bg-[#5B8CFF] text-white':'text-zinc-500 hover:text-white'}`}>📅 달력</button>
              <button onClick={()=>setView('list')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='list'?'bg-[#5B8CFF] text-white':'text-zinc-500 hover:text-white'}`}>📋 목록</button>
            </div>
            <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest">Guest</span>
          </div>
        </div>

        {/* ── 달력 뷰 ── */}
        {view==='calendar'&&(
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                <button onClick={()=>setCalView('month')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${calView==='month'?'bg-white/10 text-white':'text-zinc-500 hover:text-white'}`}>월</button>
                <button onClick={()=>setCalView('week')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${calView==='week'?'bg-white/10 text-white':'text-zinc-500 hover:text-white'}`}>주</button>
              </div>
              {calView==='month'&&<div className="flex items-center gap-3"><button onClick={()=>setCurrentMonth(new Date(year,month-1))} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[14px] flex items-center justify-center">‹</button><span className="text-white font-black text-[16px]">{year}년 {month+1}월</span><button onClick={()=>setCurrentMonth(new Date(year,month+1))} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[14px] flex items-center justify-center">›</button></div>}
              {calView==='week'&&<div className="flex items-center gap-3"><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d);}} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[14px] flex items-center justify-center">‹</button><span className="text-white font-black text-[14px]">{weekDays[0].getMonth()+1}/{weekDays[0].getDate()} – {weekDays[6].getMonth()+1}/{weekDays[6].getDate()}</span><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d);}} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-[14px] flex items-center justify-center">›</button></div>}
              <button onClick={()=>{setCurrentMonth(new Date());setWeekStart(startOfWeek(new Date()));}} className="text-zinc-600 hover:text-white text-[11px] font-bold transition-colors">오늘</button>
            </div>

            <div className="grid grid-cols-7 mb-2">{DAYS.map((d,i)=><div key={d} className={`text-center text-[11px] font-black py-2 ${i===0?'text-red-400':i===6?'text-blue-400':'text-zinc-600'}`}>{d}</div>)}</div>

            {calView==='month'&&(
              <div className="grid grid-cols-7 gap-1">
                {Array.from({length:firstDay}).map((_,i)=><div key={`e-${i}`}/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const day=i+1;const ds=toDateStr(year,month+1,day);
                  const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
                  const isPast=new Date(year,month,day)<new Date(new Date().toDateString());
                  return <div key={day} className={`min-h-[80px] rounded-xl p-1.5 border transition-all ${isToday?'border-[#5B8CFF]/50 bg-[#5B8CFF]/10':'border-white/5 bg-white/[0.02]'} ${isPast&&!isToday?'opacity-50':''}`}><div className={`text-[11px] font-black mb-1 ${isToday?'text-[#5B8CFF]':isPast?'text-zinc-700':'text-zinc-400'}`}>{day}</div><div className="flex flex-col gap-0.5">{getLeadsForDate(ds).map(l=><LeadCard key={l.id} lead={l} compact/>)}</div></div>;
                })}
              </div>
            )}

            {calView==='week'&&(
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((d,i)=>{
                  const ds=toDateStr(d.getFullYear(),d.getMonth()+1,d.getDate());
                  const isToday=d.toDateString()===today.toDateString();
                  const isPast=d<new Date(new Date().toDateString());
                  const dayLeads=getLeadsForDate(ds);
                  return <div key={ds} className={`min-h-[200px] rounded-xl p-2 border transition-all ${isToday?'border-[#5B8CFF]/50 bg-[#5B8CFF]/10':'border-white/5 bg-white/[0.02]'} ${isPast&&!isToday?'opacity-50':''}`}><div className={`text-[11px] font-black mb-2 ${isToday?'text-[#5B8CFF]':isPast?'text-zinc-700':i===0?'text-red-400':i===6?'text-blue-400':'text-zinc-400'}`}>{DAYS[i]} {d.getDate()}</div><div className="flex flex-col gap-1">{dayLeads.map(l=><LeadCard key={l.id} lead={l} compact/>)}{dayLeads.length===0&&<div className="text-zinc-800 text-[10px] text-center mt-4">—</div>}</div></div>;
                })}
              </div>
            )}

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
              {[['bg-blue-400','남자'],['bg-blue-400/30','남자 그룹'],['bg-pink-400','여자'],['bg-pink-400/30','여자 그룹'],['bg-purple-400','혼성']].map(([dot,label])=><div key={label} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${dot}`}/><span className="text-zinc-600 text-[11px]">{label}</span></div>)}
            </div>
          </div>
        )}

        {/* ── 목록 뷰 ── */}
        {view==='list'&&(
          <div className="relative z-10">
            <div className="flex flex-col gap-3 mb-5 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest w-12 shrink-0">정렬</span>
                {([['dday','D-Day'],['gender','성별'],['group','솔로/그룹'],['album','앨범']] as const).map(([v,l])=><FilterPill key={v} label={l} active={sortBy===v} onClick={()=>setSortBy(v)}/>)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest w-12 shrink-0">성별</span>
                {[['male','남자'],['female','여자'],['mixed','혼성']].map(([v,l])=><FilterPill key={v} label={l} active={filterGender.includes(v)} onClick={()=>setFilterGender(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}/>)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest w-12 shrink-0">타입</span>
                {[['solo','솔로'],['group','그룹']].map(([v,l])=><FilterPill key={v} label={l} active={filterGroup.includes(v)} onClick={()=>setFilterGroup(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}/>)}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest w-12 shrink-0">앨범</span>
                {[['single','Single'],['ep','EP'],['lp','LP'],['ost','OST']].map(([v,l])=><FilterPill key={v} label={l} active={filterAlbum.includes(v)} onClick={()=>setFilterAlbum(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])}/>)}
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-600 text-[12px]">{filteredLeads.length}개</span>
              {(filterGender.length||filterGroup.length||filterAlbum.length)>0&&<button onClick={()=>{setFilterGender([]);setFilterGroup([]);setFilterAlbum([]);}} className="text-zinc-600 hover:text-red-400 text-[11px] font-bold transition-colors">전체 초기화</button>}
            </div>
            {filteredLeads.length===0?<div className="text-center py-20"><p className="text-zinc-700 text-[13px]">해당하는 리드가 없어요</p></div>:(
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{filteredLeads.map(lead=><LeadCard key={lead.id} lead={lead}/>)}</div>
            )}
          </div>
        )}

        <div className="relative z-10 mt-8 pb-8 text-center"><p className="text-zinc-600 text-[11px]">Contact : everplayground@gmail.com</p></div>
      </main>

      {/* 상세 모달 */}
      {viewingLead&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>setViewingLead(null)}>
          <div className={`w-full max-w-lg border rounded-[2rem] shadow-2xl ${getCardColor(viewingLead.gender,viewingLead.group_type).bg} ${getCardColor(viewingLead.gender,viewingLead.group_type).border}`} onClick={e=>e.stopPropagation()}>
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-black ${getCardColor(viewingLead.gender,viewingLead.group_type).text}`}>{getCardColor(viewingLead.gender,viewingLead.group_type).label}</span><AlbumBadge type={viewingLead.album_type||'single'}/></div>
                  <h2 className="text-white font-black text-[22px] mt-0.5 leading-tight">{viewingLead.artist}</h2>
                  <p className="text-zinc-400 text-[14px] mt-0.5">{viewingLead.title}</p>
                </div>
                <div className="ml-3 shrink-0"><DeadlineDisplay lead={viewingLead} size="large"/></div>
              </div>
              {viewingLead.content&&(
                <div className="mb-5">
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">내용</p>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-zinc-300 text-[13px] leading-relaxed">{renderContent(viewingLead.content)}</div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={()=>{setPitchingLead(viewingLead);setPitchForm(emptyPitch());setPitchSent(false);setViewingLead(null);}}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">🎵 피칭하기</button>
                <button onClick={()=>setViewingLead(null)} className="py-3 px-5 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 피칭 모달 */}
      {pitchingLead&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>{setPitchingLead(null);setPitchSent(false);}}>
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-[2rem] shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="p-6">
              {pitchSent?(
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎉</div>
                  <h2 className="text-white font-black text-[22px] mb-2">피칭 완료!</h2>
                  <p className="text-zinc-400 text-[13px] mb-1"><span className="text-white font-bold">{pitchingLead.artist}</span> — {pitchingLead.title}</p>
                  <p className="text-zinc-600 text-[12px] mt-3">담당자가 확인 후 연락드릴게요.</p>
                  <button onClick={()=>{setPitchingLead(null);setPitchSent(false);}} className="mt-6 w-full py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">닫기</button>
                </div>
              ):(
                <>
                  <div className="mb-5">
                    <h2 className="text-white font-black text-[20px]">🎵 피칭하기</h2>
                    <p className="text-zinc-500 text-[12px] mt-0.5">{pitchingLead.artist} — {pitchingLead.title}</p>
                    {(pitchingLead.deadline||pitchingLead.deadline2)&&<div className="mt-2"><DeadlineDisplay lead={pitchingLead} size="normal"/></div>}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 block">아티스트명 *</label>
                      <input value={pitchForm.artist_name} onChange={e=>setPitchForm(p=>({...p,artist_name:e.target.value}))} placeholder="피칭하는 아티스트명을 입력하세요" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                    </div>
                    <div>
                      <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 block">연락처 * <span className="text-zinc-700 font-normal normal-case">(이메일 / 전화 / 카카오)</span></label>
                      <input value={pitchForm.contact} onChange={e=>setPitchForm(p=>({...p,contact:e.target.value}))} placeholder="연락받을 수 있는 방법을 입력하세요" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white"/>
                    </div>
                    <div>
                      <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 block">메시지 / 링크 <span className="text-zinc-700 font-normal normal-case">(선택)</span></label>
                      <textarea value={pitchForm.message} onChange={e=>setPitchForm(p=>({...p,message:e.target.value}))} placeholder={`데모 링크, 포트폴리오, 한마디 등\nhttps://soundcloud.com/...`} rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-[#5B8CFF]/50 transition-all placeholder:text-zinc-700 text-white resize-none leading-relaxed"/>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={()=>{setPitchingLead(null);setPitchSent(false);}} className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">취소</button>
                    <button onClick={submitPitch} disabled={pitchLoading||!pitchForm.artist_name.trim()||!pitchForm.contact.trim()}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-40 disabled:hover:scale-100">
                      {pitchLoading?'전송 중...':'피칭 제출'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}