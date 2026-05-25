'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZWJvYmhzdXd6a25ib3lxc3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE0ODMsImV4cCI6MjA5NDM2NzQ4M30.jBmNwvrJJn45gG1nMKMfHnGQV83GPlHd0ohPBf-mA5k';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GENRES = ['팝','R&B/소울','발라드','댄스/일렉','힙합/랩','록/밴드','EDM','재즈','인디','OST','포크/어쿠스틱','트로트','기타'];

// ── Section 타입 및 헬퍼 ──
type Section = {id:string;title:string;body:string};
let _sc = 0;
const newSec = (title=''): Section => ({id:`s${++_sc}`,title,body:''});
const parseSections = (content:string): Section[]|null => {
  try {
    const p = JSON.parse(content);
    if(Array.isArray(p)&&p.length>0&&'body' in p[0])
      return p.map((x:any,i:number)=>({id:`s${i}`,title:x.title||'',body:x.body||''}));
  } catch{}
  return null;
};
const serializeSections = (ss:Section[]) => JSON.stringify(ss.map(({title,body})=>({title,body})));

// ── SectionEditor 컴포넌트 ──
const SectionEditor=({sections,onChange,isDark}:{sections:Section[];onChange:(s:Section[])=>void;isDark:boolean})=>{
  const handleKeyDown=(e:React.KeyboardEvent<HTMLTextAreaElement>,id:string)=>{
    const ta=e.currentTarget,val=ta.value,pos=ta.selectionStart;
    if(e.key===' '){
      const ls=val.lastIndexOf('\n',pos-1)+1;
      if(val.slice(ls,pos)==='-'){
        e.preventDefault();
        const nv=val.slice(0,ls)+'• '+val.slice(pos);
        onChange(sections.map(s=>s.id===id?{...s,body:nv}:s));
        requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=ls+2;});
        return;
      }
    }
    if(e.key==='Enter'){
      const ls=val.lastIndexOf('\n',pos-1)+1,line=val.slice(ls,pos);
      if(line==='• '){
        e.preventDefault();
        const nv=val.slice(0,ls)+val.slice(pos);
        onChange(sections.map(s=>s.id===id?{...s,body:nv}:s));
        requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=ls;});
        return;
      }
      if(line.startsWith('• ')&&line.length>2){
        e.preventDefault();
        const nv=val.slice(0,pos)+'\n• '+val.slice(pos);
        onChange(sections.map(s=>s.id===id?{...s,body:nv}:s));
        requestAnimationFrame(()=>{ta.selectionStart=ta.selectionEnd=pos+3;});
        return;
      }
    }
  };
  const ic=isDark?'text-white placeholder:text-zinc-700':'text-[#111] placeholder:text-zinc-400';
  const sc=isDark?'border-white/10 bg-white/[0.02]':'border-black/[0.08] bg-white';
  const hc=isDark?'border-white/[0.06]':'border-black/[0.05]';
  return(
    <div className="flex flex-col gap-3">
      {sections.map((s,idx)=>(
        <div key={s.id} className={`rounded-xl border overflow-hidden ${sc}`}>
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${hc}`}>
            <span className={`text-[11px] font-black shrink-0 ${isDark?'text-zinc-600':'text-zinc-400'}`}>{idx+1}.</span>
            <input value={s.title} onChange={e=>onChange(sections.map(x=>x.id===s.id?{...x,title:e.target.value}:x))}
              placeholder="섹션 제목" className={`flex-1 bg-transparent text-[13px] font-bold outline-none ${ic}`}/>
            {sections.length>1&&<button onClick={()=>onChange(sections.filter(x=>x.id!==s.id))}
              className={`text-[11px] shrink-0 transition-colors ${isDark?'text-zinc-700 hover:text-red-400':'text-zinc-400 hover:text-red-500'}`}>✕</button>}
          </div>
          <textarea value={s.body} onChange={e=>onChange(sections.map(x=>x.id===s.id?{...x,body:e.target.value}:x))}
            onKeyDown={e=>handleKeyDown(e,s.id)} rows={4}
            placeholder={`내용 입력 (\`- + 스페이스\` → • 자동변환)\nhttps://... 링크는 자동으로 클릭 가능`}
            className={`w-full px-4 py-3 text-[13px] outline-none resize-none leading-relaxed bg-transparent ${ic}`}/>
        </div>
      ))}
      <button onClick={()=>onChange([...sections,newSec()])}
        className={`py-2.5 rounded-xl border border-dashed text-[11px] font-bold transition-all ${isDark?'border-white/10 text-zinc-600 hover:text-zinc-400 hover:border-white/20':'border-black/10 text-zinc-400 hover:text-zinc-600 hover:border-black/20'}`}>
        + 섹션 추가
      </button>
    </div>
  );
};

const getCardColor=(gender:string,group_type:string)=>{const g=group_type==='group';if(gender==='mixed')return{bg:g?'bg-purple-500/10':'bg-purple-500/20',border:g?'border-purple-500/20':'border-purple-500/40',text:g?'text-purple-400/50':'text-purple-300',dot:g?'bg-purple-400/35':'bg-purple-400',label:g?'혼성 그룹':'혼성'};if(gender==='female')return{bg:g?'bg-pink-500/10':'bg-pink-500/20',border:g?'border-pink-500/20':'border-pink-500/40',text:g?'text-pink-400/50':'text-pink-300',dot:g?'bg-pink-400/35':'bg-pink-400',label:g?'여자 그룹':'여자'};return{bg:g?'bg-blue-500/10':'bg-blue-500/20',border:g?'border-blue-500/20':'border-blue-500/40',text:g?'text-blue-400/50':'text-blue-300',dot:g?'bg-blue-400/35':'bg-blue-400',label:g?'남자 그룹':'남자'};};
const ALBUM_MAP:Record<string,{label:string;cls:string}>={single:{label:'Single',cls:'text-zinc-500 border-zinc-700/50 bg-zinc-800/30'},ep:{label:'EP',cls:'text-emerald-400/80 border-emerald-700/30 bg-emerald-900/20'},lp:{label:'LP',cls:'text-blue-400/80 border-blue-700/30 bg-blue-900/20'},ost:{label:'OST',cls:'text-amber-400/80 border-amber-700/30 bg-amber-900/20'}};
const AlbumBadge=({type}:{type:string})=>{const t=ALBUM_MAP[type]||ALBUM_MAP.single;return<span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${t.cls}`}>{t.label}</span>;};
const PITCH_STATUS:Record<string,{label:string;cls:string}>={new:{label:'새 피칭',cls:'text-[#5B8CFF] border-[#5B8CFF]/30 bg-[#5B8CFF]/10'},reviewed:{label:'검토중',cls:'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'},pass:{label:'패스',cls:'text-zinc-500 border-zinc-700/50 bg-zinc-800/30'},accepted:{label:'합격',cls:'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}};
const getLinkIcon=(url:string)=>{if(!url)return'🔗';if(url.includes('youtube')||url.includes('youtu.be'))return'▶️';if(url.includes('soundcloud'))return'🎵';if(url.includes('spotify'))return'🎧';if(url.includes('instagram'))return'📸';return'🔗';};
const isExpired=(d:string|null)=>!!d&&new Date(d)<new Date(new Date().toDateString());
const getDDay=(d:string|null)=>{if(!d)return null;const diff=Math.ceil((new Date(d).getTime()-new Date(new Date().toDateString()).getTime())/86400000);if(diff===0)return'D-DAY';return diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;};
const toDateStr=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const parseDeadline=(val:string)=>{const c=val.replace(/[.\-\/\s]/g,'');if(c.length===8)return`${c.slice(0,4)}-${c.slice(4,6)}-${c.slice(6,8)}`;if(c.length===4)return`${new Date().getFullYear()}-${c.slice(0,2)}-${c.slice(2,4)}`;return val;};
const extractUrls=(t:string)=>t.match(/https?:\/\/[^\s]+/g)||[];
const startOfWeek=(d:Date)=>{const r=new Date(d);r.setDate(r.getDate()-r.getDay());r.setHours(0,0,0,0);return r;};
const fmtDur=(s:number)=>s?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:'—';
const vocalLabel=(v:string)=>v==='male'?'남성':v==='female'?'여성':'—';
const vocalDot=(v:string)=>v==='male'?'bg-blue-400':v==='female'?'bg-pink-400':'bg-zinc-700';

const DeadlineDisplay=({lead,size='normal'}:{lead:any;size?:'compact'|'normal'|'large'})=>{
  const d1=lead.deadline,d2=lead.deadline2;if(!d1&&!d2)return null;
  if(d1&&d2){const dd1=getDDay(d1),dd2=getDDay(d2),e1=isExpired(d1),e2=isExpired(d2);
    if(size==='compact')return<div className="flex flex-col gap-0.5 ml-auto shrink-0"><span className={`text-[8px] font-black ${e1?'text-red-400/60':'text-zinc-700'}`}>1st {dd1}</span><span className={`text-[9px] font-black ${e2?'text-red-400':'text-zinc-400'}`}>2nd {dd2}</span></div>;
    if(size==='large')return<div className="flex flex-col items-end gap-2"><div className="flex items-center gap-2"><span className="text-zinc-600 text-[10px] font-black tracking-widest">1ST</span><span className={`text-[12px] font-black px-2.5 py-0.5 rounded-full border ${e1?'text-red-400/60 border-red-500/20 bg-red-500/5':'text-zinc-500 border-zinc-700/60 bg-zinc-800/40'}`}>{dd1}</span></div><div className="flex items-center gap-2"><span className="text-zinc-300 text-[10px] font-black tracking-widest">2ND</span><span className={`text-[15px] font-black px-3 py-0.5 rounded-full border ${e2?'text-red-400 border-red-500/30 bg-red-500/10':dd2==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-100 border-zinc-500 bg-zinc-800/60'}`}>{dd2}</span></div><span className="text-zinc-700 text-[10px]">{d1} → {d2}</span></div>;
    return<div className="flex flex-col items-end gap-1"><div className="flex items-center gap-1.5"><span className="text-zinc-700 text-[9px] font-black">1st</span><span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${e1?'text-red-400/60 border-red-500/20 bg-red-500/5':'text-zinc-600 border-zinc-700/50 bg-zinc-800/30'}`}>{dd1}</span></div><div className="flex items-center gap-1.5"><span className="text-zinc-400 text-[9px] font-black">2nd</span><span className={`text-[12px] font-black px-2 py-0.5 rounded-full border ${e2?'text-red-400 border-red-500/30 bg-red-500/10':dd2==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-300 border-zinc-600 bg-zinc-800/50'}`}>{dd2}</span></div></div>;
  }
  const deadline=d1||d2,dday=getDDay(deadline),exp=isExpired(deadline);
  const cls=exp?'text-red-400 border-red-500/30 bg-red-500/10':dday==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-400 border-zinc-700 bg-zinc-800/50';
  if(size==='compact')return<span className={`text-[9px] font-black shrink-0 ml-auto ${exp?'text-red-400':'text-zinc-400'}`}>{dday}</span>;
  if(size==='large')return<span className={`text-[15px] font-black px-4 py-1.5 rounded-full border ${cls}`}>{dday}</span>;
  return<span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${cls}`}>{dday}</span>;
};

const FilterPill=({label,active,onClick,isDark}:{label:string;active:boolean;onClick:()=>void;isDark:boolean})=>(
  <button onClick={onClick} className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${active?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':isDark?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{label}</button>
);
const ConfirmModal=({msg,onOk,onCancel}:{msg:string;onOk:()=>void;onCancel:()=>void})=>(
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm font-pretendard p-4">
    <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-6">
      <p className="text-white text-[14px] leading-relaxed mb-6">{msg}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">취소</button>
        <button onClick={onOk} className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-[13px] hover:bg-red-500/30 transition-all">확인</button>
      </div>
    </div>
  </div>
);

const emptyForm=()=>({title:'',artist:'',gender:'male',group_type:'solo',album_type:'single',deadline:'',deadline2:''});

export default function Dashboard(){
  const router=useRouter();
  const [user,setUser]=useState<any>(null);
  const [leads,setLeads]=useState<any[]>([]);
  const [view,setView]=useState<'calendar'|'list'>('calendar');
  const [calView,setCalView]=useState<'month'|'week'>('month');
  const [currentMonth,setCurrentMonth]=useState(new Date());
  const [weekStart,setWeekStart]=useState(startOfWeek(new Date()));
  const [showModal,setShowModal]=useState(false);
  const [editingLead,setEditingLead]=useState<any>(null);
  const [viewingLead,setViewingLead]=useState<any>(null);
  const [toastMsg,setToastMsg]=useState('');
  const [form,setForm]=useState(emptyForm());
  const [sectionsKo,setSectionsKo]=useState<Section[]>([newSec()]);
  const [sectionsEn,setSectionsEn]=useState<Section[]>([newSec()]);
  const [contentLang,setContentLang]=useState<'ko'|'en'>('ko');
  const [theme,setTheme]=useState<'dark'|'light'>('dark');
  const [filterGender,setFilterGender]=useState<string[]>([]);
  const [filterGroup,setFilterGroup]=useState<string[]>([]);
  const [filterAlbum,setFilterAlbum]=useState<string[]>([]);
  const [sortBy,setSortBy]=useState<'dday'|'gender'|'group'|'album'>('dday');
  const [announcements,setAnnouncements]=useState<any[]>([]);
  const [showAnnModal,setShowAnnModal]=useState(false);
  const [annForm,setAnnForm]=useState<{id?:string;title:string;content:string}|null>(null);
  const [pitches,setPitches]=useState<any[]>([]);
  const [pitchFiles,setPitchFiles]=useState<any[]>([]);
  const [showPitchModal,setShowPitchModal]=useState(false);
  const [pitchLead,setPitchLead]=useState<any>(null);
  const [expandedPitch,setExpandedPitch]=useState<string|null>(null);
  const [pitchTab,setPitchTab]=useState<'active'|'history'>('active');
  const [showFilesPanel,setShowFilesPanel]=useState(false);
  const [showGuestsModal,setShowGuestsModal]=useState(false);
  const [guestApprovals,setGuestApprovals]=useState<any[]>([]);
  const [guestTab,setGuestTab]=useState<'pending'|'history'>('pending');
  const [fileLead,setFileLead]=useState<any>(null);
  const [fileFilterVocal,setFileFilterVocal]=useState('');
  const [fileFilterGenre,setFileFilterGenre]=useState('');
  const [fileSort,setFileSort]=useState<'date'|'bpm'|'name'|'genre'>('date');
  const [selectedFiles,setSelectedFiles]=useState<string[]>([]);
  const [fileSearch,setFileSearch]=useState('');
  const [confirm,setConfirm]=useState<{msg:string;onOk:()=>void}|null>(null);

  // 테마 초기화
  useEffect(()=>{const s=localStorage.getItem('lead_theme');if(s==='light')setTheme('light');},[]);
  const toggleTheme=()=>{const n=theme==='dark'?'light':'dark';setTheme(n);localStorage.setItem('lead_theme',n);};
  const D=theme==='dark';

  const toast=(msg:string)=>{setToastMsg(msg);setTimeout(()=>setToastMsg(''),2500);};
  const ask=(msg:string,onOk:()=>void)=>setConfirm({msg,onOk});

  useEffect(()=>{supabase.auth.getUser().then(({data})=>{if(!data.user)router.push('/');else setUser(data.user);});},[]);

  const fetchLeads=async(u=user)=>{if(!u)return;const{data}=await supabase.from('leads').select('*').eq('host_id',u.id).order('deadline',{ascending:true});if(data)setLeads(data);};
  const fetchAnn=async(u=user)=>{if(!u)return;const{data}=await supabase.from('lead_announcements').select('*').eq('host_id',u.id).order('created_at',{ascending:true});if(data)setAnnouncements(data);};
  const fetchPitches=async(u=user)=>{if(!u)return;const{data}=await supabase.from('pitches').select('*').eq('host_id',u.id).order('created_at',{ascending:false});if(data)setPitches(data);};
  const fetchPitchFiles=async(u=user)=>{if(!u)return;const{data}=await supabase.from('pitch_files').select('*').eq('host_id',u.id).order('created_at',{ascending:false});if(data)setPitchFiles(data);};
  const fetchGuestApprovals=async(u=user)=>{
    if(!u)return;
    const{data:approvals,error:aErr}=await supabase.from('guest_approvals').select('*').eq('host_id',u.id).order('created_at',{ascending:false});
    if(aErr||!approvals){return;}
    if(approvals.length===0){setGuestApprovals([]);return;}
    const guestIds=approvals.map((a:any)=>a.guest_id);
    const{data:guests}=await supabase.from('guests').select('id,name,artist_name,email,phone').in('id',guestIds);
    const merged=approvals.map((a:any)=>({...a,guests:guests?.find((g:any)=>g.id===a.guest_id)||null}));
    setGuestApprovals(merged);
  };

  useEffect(()=>{if(user){fetchLeads(user);fetchAnn(user);fetchPitches(user);fetchPitchFiles(user);fetchGuestApprovals(user);}},[user]);

  const openCreate=(prefillDate?:string)=>{
    setForm({...emptyForm(),deadline:prefillDate||''});
    setSectionsKo([newSec()]);setSectionsEn([newSec()]);setContentLang('ko');
    setEditingLead(null);setShowModal(true);
  };
  const openEdit=(lead:any)=>{
    setForm({title:lead.title,artist:lead.artist,gender:lead.gender||'male',group_type:lead.group_type||'solo',album_type:lead.album_type||'single',deadline:lead.deadline||'',deadline2:lead.deadline2||''});
    setSectionsKo(parseSections(lead.content||'')||[newSec('',)].map(s=>({...s,body:lead.content||''})));
    setSectionsEn(parseSections(lead.content_en||'')||[newSec()]);
    setContentLang('ko');setEditingLead(lead);setShowModal(true);
  };
  const saveLead=async()=>{
    if(!form.title.trim()||!form.artist.trim())return;
    const koJson=serializeSections(sectionsKo);
    const hasEn=sectionsEn.some(s=>s.title.trim()||s.body.trim());
    const enJson=hasEn?serializeSections(sectionsEn):null;
    const allText=sectionsKo.map(s=>s.body).join('\n');
    const urls=extractUrls(allText);
    const payload={title:form.title,artist:form.artist,gender:form.gender,group_type:form.group_type,album_type:form.album_type,deadline:form.deadline||null,deadline2:form.deadline2||null,content:koJson,content_en:enJson,reference_url:urls[0]||null,host_id:user.id};
    if(editingLead)await supabase.from('leads').update(payload).eq('id',editingLead.id);
    else await supabase.from('leads').insert(payload);
    setShowModal(false);fetchLeads();toast(editingLead?'✅ 수정됐어요!':'✅ 추가됐어요!');
  };
  const deleteLead=async(id:string)=>{await supabase.from('leads').delete().eq('id',id);fetchLeads();setViewingLead(null);toast('🗑 삭제됐어요');};
  const copyShareLink=()=>{navigator.clipboard.writeText(`${window.location.origin}/view/${user.id}`);toast('🔗 링크 복사됐어요!');};
  const saveAnn=async()=>{if(!annForm)return;if(annForm.id)await supabase.from('lead_announcements').update({title:annForm.title,content:annForm.content,updated_at:new Date().toISOString()}).eq('id',annForm.id);else await supabase.from('lead_announcements').insert({host_id:user.id,title:annForm.title,content:annForm.content});setAnnForm(null);fetchAnn();toast('📢 공지 저장됐어요!');};
  const deleteAnn=async(id:string)=>{await supabase.from('lead_announcements').delete().eq('id',id);fetchAnn();toast('공지 삭제됐어요');};
  const updatePitchStatus=async(pitchId:string,status:string)=>{await supabase.from('pitches').update({status}).eq('id',pitchId);fetchPitches();toast(`상태: ${PITCH_STATUS[status]?.label}`);};
  const archivePitch=async(pitch:any)=>{await supabase.from('pitches').update({archived:true}).eq('id',pitch.id);fetchPitches();setExpandedPitch(null);toast('📁 히스토리로 이동됐어요');};
  const updateApproval=async(id:string,status:string)=>{
    await supabase.from('guest_approvals').update({status}).eq('id',id);
    fetchGuestApprovals();
    toast(status==='approved'?'✅ 승인됐어요':status==='rejected'?'🚫 거절됐어요':'변경됐어요');
    if(status==='approved'||status==='rejected')setGuestTab('history');
  };
  const deletePitchFile=async(pf:any)=>{
    if(pf.file_url){try{const url=new URL(pf.file_url);const p=url.pathname.split('/pitch-files/')[1];if(p)await supabase.storage.from('pitch-files').remove([decodeURIComponent(p)]);}catch{}}
    await supabase.from('pitch_files').delete().eq('id',pf.id);fetchPitchFiles();toast('🗑 파일 삭제됐어요');
  };
  const deletePitch=async(pitch:any)=>{
    const files=pitchFiles.filter(f=>f.pitch_id===pitch.id);
    for(const f of files){if(f.file_url){try{const url=new URL(f.file_url);const p=url.pathname.split('/pitch-files/')[1];if(p)await supabase.storage.from('pitch-files').remove([decodeURIComponent(p)]);}catch{}}}
    await supabase.from('pitches').delete().eq('id',pitch.id);
    fetchPitches();fetchPitchFiles();toast('🗑 피칭 삭제됐어요');
  };
  const blobDownload=async(fileUrl:string,fileName:string)=>{
    try{const res=await fetch(fileUrl);const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName||'audio.mp3';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}catch{toast('다운로드 실패했어요');}
  };
  const downloadSelected=async()=>{const toDownload=filteredPitchFiles.filter(f=>selectedFiles.includes(f.id));toast(`⬇️ ${toDownload.length}개 다운로드 시작`);for(let i=0;i<toDownload.length;i++){await blobDownload(toDownload[i].file_url,toDownload[i].file_name||'audio.mp3');if(i<toDownload.length-1)await new Promise(r=>setTimeout(r,500));}};
  const deleteSelected=async()=>{const toDelete=filteredPitchFiles.filter(f=>selectedFiles.includes(f.id));for(const f of toDelete){if(f.file_url){try{const url=new URL(f.file_url);const p=url.pathname.split('/pitch-files/')[1];if(p)await supabase.storage.from('pitch-files').remove([decodeURIComponent(p)]);}catch{}}await supabase.from('pitch_files').delete().eq('id',f.id);}setSelectedFiles([]);fetchPitchFiles();toast(`🗑 ${toDelete.length}개 삭제됐어요`);};

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
    return l.sort((a,b)=>{if(sortBy==='gender')return a.gender.localeCompare(b.gender);if(sortBy==='group')return a.group_type.localeCompare(b.group_type);if(sortBy==='album')return(a.album_type||'single').localeCompare(b.album_type||'single');const aD=a.deadline||a.deadline2,bD=b.deadline||b.deadline2;if(!aD)return 1;if(!bD)return-1;return new Date(aD).getTime()-new Date(bD).getTime();});
  },[leads,filterGender,filterGroup,filterAlbum,sortBy]);

  const filteredPitchFiles=useMemo(()=>{
    let f=[...pitchFiles];
    if(fileLead){const ids=pitches.filter(p=>p.lead_id===fileLead.id).map(p=>p.id);f=f.filter(x=>ids.includes(x.pitch_id));}
    if(fileFilterVocal)f=f.filter(x=>x.vocal_gender===fileFilterVocal);
    if(fileFilterGenre)f=f.filter(x=>x.genre===fileFilterGenre);
    if(fileSearch){const q=fileSearch.toLowerCase();f=f.filter(x=>(x.file_name||'').toLowerCase().includes(q)||(x.genre||'').toLowerCase().includes(q)||pitches.find(p=>p.id===x.pitch_id&&(p.artist_name||'').toLowerCase().includes(q)));}
    return f.sort((a,b)=>{if(fileSort==='bpm')return(b.bpm||0)-(a.bpm||0);if(fileSort==='genre')return(a.genre||'').localeCompare(b.genre||'');if(fileSort==='name')return(a.file_name||'').localeCompare(b.file_name||'');return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();});
  },[pitchFiles,fileLead,fileFilterVocal,fileFilterGenre,fileSort,fileSearch,pitches]);

  const newPitchCount=pitches.filter(p=>p.status==='new'&&!p.archived).length;
  const pitchesForLead=pitchLead?pitches.filter(p=>p.lead_id===pitchLead.id):pitches;
  const activePitches=pitchesForLead.filter(p=>!p.archived);
  const historyPitches=pitchesForLead.filter(p=>p.archived);
  const displayedPitches=pitchTab==='active'?activePitches:historyPitches;
  const pendingGuests=guestApprovals.filter(g=>g.status==='pending');
  const historyGuests=guestApprovals.filter(g=>g.status!=='pending');
  const displayedGuests=guestTab==='pending'?pendingGuests:historyGuests;
  const getPitchFiles=(pitchId:string)=>pitchFiles.filter(f=>f.pitch_id===pitchId);
  const getPitchLeadName=(pitch:any)=>{const l=leads.find(x=>x.id===pitch.lead_id);return l?`${l.artist} — ${l.title}`:'';}

  const renderContent=(content:string,plain=false)=>{
    if(!content)return null;
    const sections=parseSections(content);
    if(sections&&!plain){
      return(
        <div className="flex flex-col gap-4">
          {sections.map((s,i)=>(
            <div key={i}>
              {s.title&&<p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>{i+1}. {s.title}</p>}
              <div className={`text-[13px] leading-relaxed ${D?'text-zinc-300':'text-zinc-700'}`}>
                {s.body.split(/(https?:\/\/[^\s]+)/g).map((part,j)=>{
                  if(part.match(/^https?:\/\//))return<a key={j} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#5B8CFF] hover:underline break-all"><span>{getLinkIcon(part)}</span><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
                  return<span key={j} className="whitespace-pre-wrap">{part}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return content.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>{
      if(part.match(/^https?:\/\//))return<a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#5B8CFF] hover:underline break-all"><span>{getLinkIcon(part)}</span><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
      return<span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const DateShortcuts=({field}:{field:'deadline'|'deadline2'})=>(<div className="flex gap-1.5 mt-2">{[1,3,7,14,30].map(d=>{const dt=new Date();dt.setDate(dt.getDate()+d);const str=toDateStr(dt.getFullYear(),dt.getMonth()+1,dt.getDate());return<button key={d} onClick={()=>setForm(p=>({...p,[field]:str}))} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold hover:text-[#5B8CFF] hover:border-[#5B8CFF]/30 transition-all border ${D?'bg-white/5 border-white/10 text-zinc-500':'bg-black/[0.04] border-black/[0.08] text-zinc-500'}`}>+{d}일</button>;})}</div>);

  const getLeadPreview=(lead:any)=>{
    const sections=parseSections(lead.content||'');
    if(sections)return sections.map(s=>s.body).join(' ').replace(/https?:\/\/[^\s]+/g,'🔗').slice(0,80);
    return(lead.content||'').replace(/https?:\/\/[^\s]+/g,'🔗').slice(0,80);
  };

  const LeadCard=({lead,compact=false}:{lead:any;compact?:boolean})=>{
    const c=getCardColor(lead.gender,lead.group_type);
    const expired=isExpired(lead.deadline2||lead.deadline);
    const allText=lead.content?parseSections(lead.content)?.map((s:any)=>s.body).join('\n')||lead.content:'' ;
    const urls=extractUrls(allText);
    const pCount=pitches.filter(p=>p.lead_id===lead.id&&!p.archived).length;
    const fCount=pitchFiles.filter(f=>pitches.find(p=>p.id===f.pitch_id&&p.lead_id===lead.id)).length;
    const newP=pitches.filter(p=>p.lead_id===lead.id&&p.status==='new'&&!p.archived).length;
    return(
      <div onClick={()=>setViewingLead(lead)} className={`border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${c.bg} ${c.border} ${expired?'opacity-35 grayscale':''} ${compact?'p-2':'p-4'}`}>
        {compact?(<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}/><span className="text-white text-[11px] font-bold truncate">{lead.artist}</span>{newP>0&&<span className="text-[8px] font-black bg-[#5B8CFF] text-white rounded-full px-1 shrink-0">{newP}</span>}<DeadlineDisplay lead={lead} size="compact"/></div>):(
          <>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}/><span className={`text-[10px] font-black ${c.text}`}>{c.label}</span><AlbumBadge type={lead.album_type||'single'}/>{pCount>0&&<span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${newP>0?'bg-[#5B8CFF] text-white':'bg-white/10 text-zinc-400'}`}>📨{pCount} 🎵{fCount}</span>}</div><h3 className="text-white font-black text-[15px] truncate">{lead.artist}</h3><p className="text-zinc-400 text-[12px] truncate">{lead.title}</p></div>
              <div className="ml-2 shrink-0"><DeadlineDisplay lead={lead} size="normal"/></div>
            </div>
            {lead.content&&<p className="text-zinc-500 text-[11px] line-clamp-2 mt-1">{getLeadPreview(lead)}</p>}
            {urls.length>0&&<div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">{urls.slice(0,3).map((url,i)=><a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-[13px] hover:scale-110 transition-transform">{getLinkIcon(url)}</a>)}{urls.length>3&&<span className="text-zinc-700 text-[10px] self-center">+{urls.length-3}</span>}</div>}
          </>
        )}
      </div>
    );
  };

  // 테마 변수
  const mainBg=D?'bg-[#050505] text-white':'bg-[#F2F2F7] text-[#111]';
  const modalBg=D?'bg-[#111] border-white/10':'bg-white border-black/[0.08]';
  const inputCls=D?'bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-[#5B8CFF]/50':'bg-black/[0.04] border-black/[0.08] text-[#111] placeholder:text-zinc-400 focus:border-[#5B8CFF]/50';
  const dividerCls=D?'border-white/10':'border-black/[0.08]';
  const dimText=D?'text-zinc-500':'text-zinc-500';
  const panelBg=D?'bg-[#080808]':'bg-[#F2F2F7]';

  if(!user)return<div className={`min-h-screen ${mainBg} flex items-center justify-center`}><div className="text-zinc-600 text-[11px] font-black tracking-widest">Loading...</div></div>;

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;} input[type="date"]::-webkit-calendar-picker-indicator{filter:${D?'invert(0.5)':'none'};cursor:pointer;}`}}/>
      <main className={`min-h-screen ${mainBg} p-5 lg:p-8 font-pretendard relative overflow-hidden`}>
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] ${D?'opacity-[0.06]':'opacity-[0.04]'} pointer-events-none`}/>
        <div className="relative z-10 flex items-baseline justify-center gap-2.5 mb-8"><h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1><span className={`${dimText} text-[11px] font-bold tracking-[0.2em]`}>by NEN</span></div>

        {announcements.length>0&&<div className="relative z-10 mb-5 flex flex-col gap-2">{announcements.map(ann=><div key={ann.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20`}><span className="text-[#5B8CFF] text-[11px] font-black mt-0.5 shrink-0">📢</span><div className="flex-1 min-w-0">{ann.title&&<p className={`font-bold text-[13px] mb-0.5 ${D?'text-white':'text-[#111]'}`}>{ann.title}</p>}<p className={`text-[12px] leading-relaxed whitespace-pre-line ${D?'text-zinc-300':'text-zinc-600'}`}>{ann.content}</p></div><button onClick={()=>{setAnnForm({id:ann.id,title:ann.title||'',content:ann.content||''});setShowAnnModal(true);}} className={`text-[10px] shrink-0 font-bold ${D?'text-zinc-600 hover:text-zinc-400':'text-zinc-400 hover:text-zinc-600'}`}>수정</button></div>)}</div>}

        <div className={`relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 border-b ${dividerCls} pb-4`}>
          <div className="flex items-center gap-2"><span className={`${dimText} text-[13px] font-bold`}>{leads.filter(l=>!isExpired(l.deadline2||l.deadline)).length} 활성</span><span className={D?'text-zinc-700':'text-zinc-400'}>·</span><span className={`${D?'text-zinc-700':'text-zinc-400'} text-[13px]`}>{leads.filter(l=>isExpired(l.deadline2||l.deadline)).length} 마감</span></div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* 다크/라이트 토글 */}
            <button onClick={toggleTheme} className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[15px] transition-all ${D?'bg-white/5 border-white/10 hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] hover:bg-black/[0.08]'}`} title={D?'라이트 모드':'다크 모드'}>{D?'☀️':'🌙'}</button>
            <div className={`flex border rounded-xl p-1 gap-1 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}>
              <button onClick={()=>setView('calendar')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='calendar'?'bg-[#5B8CFF] text-white':dimText+' hover:text-white'}`}>📅 달력</button>
              <button onClick={()=>setView('list')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='list'?'bg-[#5B8CFF] text-white':dimText+' hover:text-white'}`}>📋 목록</button>
            </div>
            <button onClick={()=>{setPitchLead(null);setExpandedPitch(null);setPitchTab('active');setShowPitchModal(true);}} className={`relative border px-3 py-2 rounded-xl font-bold text-[11px] transition-all ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>📨 피칭{newPitchCount>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-[#5B8CFF] rounded-full text-white text-[9px] font-black flex items-center justify-center">{newPitchCount}</span>}</button>
            <button onClick={()=>{setGuestTab('pending');setShowGuestsModal(true);}} className={`relative border px-3 py-2 rounded-xl font-bold text-[11px] transition-all ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>👥 게스트{pendingGuests.length>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full text-black text-[9px] font-black flex items-center justify-center">{pendingGuests.length}</span>}</button>
            <button onClick={()=>{setFileLead(null);setSelectedFiles([]);setFileFilterVocal('');setFileFilterGenre('');setFileSearch('');setShowFilesPanel(true);}} className={`relative border px-3 py-2 rounded-xl font-bold text-[11px] transition-all ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>🎵 파일{pitchFiles.length>0&&<span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-zinc-700 rounded-full text-zinc-300 text-[9px] font-black flex items-center justify-center px-1">{pitchFiles.length}</span>}</button>
            <button onClick={()=>{setAnnForm({title:'',content:''});setShowAnnModal(true);}} className={`border px-3 py-2 rounded-xl font-bold text-[11px] transition-all ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>📢 공지</button>
            <button onClick={copyShareLink} className={`border px-3 py-2 rounded-xl font-bold text-[11px] transition-all ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>🔗 공유</button>
            <button onClick={()=>openCreate()} className="bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white px-5 py-2 rounded-xl font-black text-[11px] hover:scale-105 transition-all">+ 리드 추가</button>
            <button onClick={()=>{supabase.auth.signOut();router.push('/');}} className={`text-[11px] font-bold transition-colors ${D?'text-zinc-600 hover:text-red-400':'text-zinc-400 hover:text-red-500'}`}>로그아웃</button>
          </div>
        </div>

        {/* 달력 */}
        {view==='calendar'&&(
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex border rounded-xl p-1 gap-1 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}><button onClick={()=>setCalView('month')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${calView==='month'?'bg-white/10 text-white':dimText}`}>월</button><button onClick={()=>setCalView('week')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${calView==='week'?'bg-white/10 text-white':dimText}`}>주</button></div>
              {calView==='month'&&<div className="flex items-center gap-3"><button onClick={()=>setCurrentMonth(new Date(year,month-1))} className={`w-8 h-8 rounded-full border flex items-center justify-center ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>‹</button><span className={`font-black text-[16px] ${D?'text-white':'text-[#111]'}`}>{year}년 {month+1}월</span><button onClick={()=>setCurrentMonth(new Date(year,month+1))} className={`w-8 h-8 rounded-full border flex items-center justify-center ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>›</button></div>}
              {calView==='week'&&<div className="flex items-center gap-3"><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d);}} className={`w-8 h-8 rounded-full border flex items-center justify-center ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>‹</button><span className={`font-black text-[14px] ${D?'text-white':'text-[#111]'}`}>{weekDays[0].getMonth()+1}/{weekDays[0].getDate()} – {weekDays[6].getMonth()+1}/{weekDays[6].getDate()}</span><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d);}} className={`w-8 h-8 rounded-full border flex items-center justify-center ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>›</button></div>}
              <button onClick={()=>{setCurrentMonth(new Date());setWeekStart(startOfWeek(new Date()));}} className={`text-[11px] font-bold transition-colors ${D?'text-zinc-600 hover:text-white':'text-zinc-400 hover:text-[#111]'}`}>오늘</button>
            </div>
            <div className="grid grid-cols-7 mb-2">{DAYS.map((d,i)=><div key={d} className={`text-center text-[11px] font-black py-2 ${i===0?'text-red-400':i===6?'text-blue-400':D?'text-zinc-600':'text-zinc-400'}`}>{d}</div>)}</div>
            {calView==='month'&&<div className="grid grid-cols-7 gap-1">{Array.from({length:firstDay}).map((_,i)=><div key={`e-${i}`}/>)}{Array.from({length:daysInMonth}).map((_,i)=>{const day=i+1,ds=toDateStr(year,month+1,day),isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day,isPast=new Date(year,month,day)<new Date(new Date().toDateString());return<div key={day} onDoubleClick={()=>openCreate(ds)} className={`min-h-[80px] rounded-xl p-1.5 border select-none ${isToday?'border-[#5B8CFF]/50 bg-[#5B8CFF]/10':D?'border-white/5 bg-white/[0.02]':'border-black/[0.06] bg-white/60'} ${isPast&&!isToday?'opacity-50':''}`}><div className={`text-[11px] font-black mb-1 ${isToday?'text-[#5B8CFF]':isPast?D?'text-zinc-700':'text-zinc-400':D?'text-zinc-400':'text-zinc-500'}`}>{day}</div><div className="flex flex-col gap-0.5">{getLeadsForDate(ds).map(l=><LeadCard key={l.id} lead={l} compact/>)}</div></div>;})}</div>}
            {calView==='week'&&<div className="grid grid-cols-7 gap-1">{weekDays.map((d,i)=>{const ds=toDateStr(d.getFullYear(),d.getMonth()+1,d.getDate()),isToday=d.toDateString()===today.toDateString(),isPast=d<new Date(new Date().toDateString()),dl=getLeadsForDate(ds);return<div key={ds} onDoubleClick={()=>openCreate(ds)} className={`min-h-[200px] rounded-xl p-2 border select-none ${isToday?'border-[#5B8CFF]/50 bg-[#5B8CFF]/10':D?'border-white/5 bg-white/[0.02]':'border-black/[0.06] bg-white/60'} ${isPast&&!isToday?'opacity-50':''}`}><div className={`text-[11px] font-black mb-2 ${isToday?'text-[#5B8CFF]':isPast?D?'text-zinc-700':'text-zinc-400':i===0?'text-red-400':i===6?'text-blue-400':D?'text-zinc-400':'text-zinc-500'}`}>{DAYS[i]} {d.getDate()}</div><div className="flex flex-col gap-1">{dl.map(l=><LeadCard key={l.id} lead={l} compact/>)}{dl.length===0&&<div className={`text-[10px] text-center mt-4 ${D?'text-zinc-800':'text-zinc-300'}`}>—</div>}</div></div>;})}</div>}
            <div className={`flex items-center justify-between mt-4 pt-4 border-t ${dividerCls} flex-wrap gap-2`}><p className={`text-[11px] ${D?'text-zinc-700':'text-zinc-400'}`}>날짜 더블클릭 → 빠른 추가</p><div className="flex items-center gap-3 flex-wrap">{[['bg-blue-400','남자'],['bg-blue-400/30','남자 그룹'],['bg-pink-400','여자'],['bg-pink-400/30','여자 그룹'],['bg-purple-400','혼성']].map(([dot,label])=><div key={label} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${dot}`}/><span className={`text-[11px] ${D?'text-zinc-600':'text-zinc-400'}`}>{label}</span></div>)}</div></div>
          </div>
        )}

        {/* 목록 */}
        {view==='list'&&(
          <div className="relative z-10">
            <div className={`flex flex-col gap-3 mb-5 p-4 rounded-xl border ${D?'bg-white/[0.02] border-white/5':'bg-black/[0.02] border-black/[0.06]'}`}>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>정렬</span>{([['dday','D-Day'],['gender','성별'],['group','솔로/그룹'],['album','앨범']] as const).map(([v,l])=><FilterPill key={v} label={l} active={sortBy===v} onClick={()=>setSortBy(v)} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>성별</span>{[['male','남자'],['female','여자'],['mixed','혼성']].map(([v,l])=><FilterPill key={v} label={l} active={filterGender.includes(v)} onClick={()=>setFilterGender(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>타입</span>{[['solo','솔로'],['group','그룹']].map(([v,l])=><FilterPill key={v} label={l} active={filterGroup.includes(v)} onClick={()=>setFilterGroup(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>앨범</span>{[['single','Single'],['ep','EP'],['lp','LP'],['ost','OST']].map(([v,l])=><FilterPill key={v} label={l} active={filterAlbum.includes(v)} onClick={()=>setFilterAlbum(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])} isDark={D}/>)}</div>
            </div>
            {filteredLeads.length===0?<div className="text-center py-20"><p className={`text-[13px] ${D?'text-zinc-700':'text-zinc-400'}`}>해당하는 리드가 없어요</p></div>:<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{filteredLeads.map(lead=><LeadCard key={lead.id} lead={lead}/>)}</div>}
          </div>
        )}
      </main>

      {/* 상세 모달 */}
      {viewingLead&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>setViewingLead(null)}>
          <div className={`w-full max-w-2xl border rounded-[2rem] shadow-2xl ${getCardColor(viewingLead.gender,viewingLead.group_type).bg} ${getCardColor(viewingLead.gender,viewingLead.group_type).border}`} onClick={e=>e.stopPropagation()}>
            <div className="p-8 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-6"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className={`text-[11px] font-black ${getCardColor(viewingLead.gender,viewingLead.group_type).text}`}>{getCardColor(viewingLead.gender,viewingLead.group_type).label}</span><AlbumBadge type={viewingLead.album_type||'single'}/></div><h2 className="text-white font-black text-[28px] leading-tight">{viewingLead.artist}</h2><p className="text-zinc-400 text-[16px] mt-1">{viewingLead.title}</p></div><div className="ml-4 shrink-0"><DeadlineDisplay lead={viewingLead} size="large"/></div></div>
              {(viewingLead.content||viewingLead.content_en)&&(
                <div className="mb-6">
                  {viewingLead.content_en&&(
                    <div className="flex gap-1 mb-3">
                      {(['ko','en'] as const).map(lang=>(
                        <button key={lang} onClick={()=>setContentLang(lang)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${contentLang===lang?'bg-[#5B8CFF]/20 border border-[#5B8CFF]/50 text-[#5B8CFF]':'border border-white/10 text-zinc-500 hover:text-white'}`}>
                          {lang==='ko'?'한국어':'English'}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    {renderContent(contentLang==='en'&&viewingLead.content_en?viewingLead.content_en:viewingLead.content||'')}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={()=>{setViewingLead(null);openEdit(viewingLead);}} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-bold text-[13px] hover:bg-white/10 transition-all">수정</button>
                <button onClick={()=>ask(`"${viewingLead.title}" 리드를 삭제할까요?`,()=>deleteLead(viewingLead.id))} className="py-3 px-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[13px] hover:bg-red-500/20 transition-all">삭제</button>
                <button onClick={()=>setViewingLead(null)} className="py-3 px-5 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 피칭 모달 */}
      {showPitchModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>setShowPitchModal(false)}>
          <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl ${modalBg}`} onClick={e=>e.stopPropagation()}>
            <div className="max-h-[88vh] flex flex-col">
              <div className={`flex items-center gap-3 p-5 border-b ${dividerCls}`}>
                <h2 className={`font-black text-[18px] ${D?'text-white':'text-[#111]'}`}>📨 피칭</h2>
                <span className={`text-[12px] ${dimText}`}>{activePitches.length}건</span>
                {newPitchCount>0&&<span className="text-[#5B8CFF] text-[12px] font-bold">새 {newPitchCount}건</span>}
                <div className="flex-1"/>
                <div className={`flex border rounded-xl p-1 gap-1 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}>
                  <button onClick={()=>setPitchTab('active')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${pitchTab==='active'?'bg-[#5B8CFF] text-white':dimText}`}>받은 피칭</button>
                  <button onClick={()=>setPitchTab('history')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${pitchTab==='history'?'bg-zinc-600 text-white':dimText}`}>📁 히스토리</button>
                </div>
                <button onClick={()=>setShowPitchModal(false)} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[13px] transition-all ${D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>✕</button>
              </div>
              <div className={`flex gap-2 px-5 py-3 border-b ${D?'border-white/5':'border-black/[0.05]'} overflow-x-auto`}>
                <button onClick={()=>setPitchLead(null)} className={`px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap transition-all ${!pitchLead?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500'}`}>전체</button>
                {leads.filter(l=>pitches.some(p=>p.lead_id===l.id)).map(l=>{const cnt=pitches.filter(p=>p.lead_id===l.id&&!p.archived).length;const nw=pitches.filter(p=>p.lead_id===l.id&&p.status==='new'&&!p.archived).length;return<button key={l.id} onClick={()=>setPitchLead(pitchLead?.id===l.id?null:l)} className={`px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap flex items-center gap-1 transition-all ${pitchLead?.id===l.id?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500'}`}>{l.artist} <span className={D?'text-zinc-700':'text-zinc-400'}>{cnt}{nw>0&&<span className="text-[#5B8CFF]">+{nw}</span>}</span></button>;})}
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                {displayedPitches.length===0?<div className="text-center py-12"><p className={`text-[13px] ${D?'text-zinc-700':'text-zinc-400'}`}>{pitchTab==='active'?'받은 피칭이 없어요':'히스토리가 없어요'}</p></div>:(
                  <div className="flex flex-col gap-3">
                    {displayedPitches.map(p=>{
                      const files=getPitchFiles(p.id);const isExp=expandedPitch===p.id;
                      return(
                        <div key={p.id} className={`border rounded-xl overflow-hidden ${pitchTab==='history'?(D?'border-white/5 opacity-70':'border-black/[0.05] opacity-70'):D?'border-white/10 bg-white/[0.02]':'border-black/[0.08] bg-black/[0.02]'}`}>
                          <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={()=>setExpandedPitch(isExp?null:p.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5"><p className={`font-bold text-[14px] ${D?'text-white':'text-[#111]'}`}>{p.artist_name}</p>{files.length>0&&<span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${D?'bg-white/10 text-zinc-400':'bg-black/[0.06] text-zinc-500'}`}>🎵 {files.length}</span>}<span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${PITCH_STATUS[p.status]?.cls||''}`}>{PITCH_STATUS[p.status]?.label}</span></div>
                              <p className={`text-[12px] ${dimText}`}>{p.contact}</p>
                              <p className={`text-[10px] ${D?'text-zinc-700':'text-zinc-400'}`}>{getPitchLeadName(p)} · {new Date(p.created_at).toLocaleDateString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {pitchTab==='active'&&(
                                <>
                                  <select value={p.status} onChange={e=>{e.stopPropagation();updatePitchStatus(p.id,e.target.value);}} onClick={e=>e.stopPropagation()} className={`border rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none ${D?'bg-zinc-900':'bg-white'} ${PITCH_STATUS[p.status]?.cls||''}`}>
                                    {Object.entries(PITCH_STATUS).map(([v,{label}])=><option key={v} value={v} className={D?'bg-zinc-900 text-white':'bg-white text-[#111]'}>{label}</option>)}
                                  </select>
                                  <button onClick={e=>{e.stopPropagation();archivePitch(p);}} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${D?'bg-zinc-700/30 border-zinc-600/30 text-zinc-300 hover:bg-zinc-600/40':'bg-black/[0.06] border-black/[0.1] text-zinc-600 hover:bg-black/10'}`}>확인</button>
                                </>
                              )}
                              <button onClick={e=>{e.stopPropagation();setExpandedPitch(isExp?null:p.id);}} className={`text-[12px] transition-colors ${D?'text-zinc-600 hover:text-white':'text-zinc-400 hover:text-[#111]'}`}>{isExp?'▲':'▼'}</button>
                              <button onClick={e=>{e.stopPropagation();ask(`"${p.artist_name}"의 피칭을 삭제할까요?`,()=>deletePitch(p));}} className={`text-[11px] font-bold transition-colors ${D?'text-zinc-700 hover:text-red-400':'text-zinc-400 hover:text-red-500'}`}>삭제</button>
                            </div>
                          </div>
                          {isExp&&(
                            <div className={`border-t px-4 pb-4 pt-3 ${D?'border-white/5':'border-black/[0.05]'}`}>
                              {p.message&&<p className={`text-[13px] leading-relaxed whitespace-pre-line mb-3 pb-3 border-b ${D?'text-zinc-400 border-white/5':'text-zinc-600 border-black/[0.05]'}`}>{p.message}</p>}
                              {files.length===0?<p className={`text-[12px] ${D?'text-zinc-700':'text-zinc-400'}`}>첨부 파일 없음</p>:(
                                <div className="flex flex-col gap-2">
                                  {files.map(f=>(
                                    <div key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border ${D?'bg-black/20 border-white/5':'bg-black/[0.03] border-black/[0.06]'}`}>
                                      <div className="w-8 h-8 rounded-lg bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center shrink-0"><span className="text-[14px]">🎵</span></div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[12px] font-bold truncate ${D?'text-zinc-300':'text-zinc-700'}`}>{f.file_name||'audio.mp3'}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                                          {f.bpm>0&&<span className={`text-[10px] font-black ${D?'text-zinc-400':'text-zinc-500'}`}>🥁 {f.bpm} BPM</span>}
                                          {f.vocal_gender&&f.vocal_gender!=='unknown'&&<span className={`text-[10px] font-black ${f.vocal_gender==='male'?'text-blue-400':'text-pink-400'}`}>🎤 {vocalLabel(f.vocal_gender)}</span>}
                                          {f.genre&&<span className="text-[10px] font-black text-[#5B8CFF]">{f.genre}</span>}
                                          {f.duration>0&&<span className={`text-[10px] ${D?'text-zinc-600':'text-zinc-400'}`}>⏱ {fmtDur(f.duration)}</span>}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 shrink-0">
                                        <a href={f.file_url} download={f.file_name} onClick={e=>{e.preventDefault();blobDownload(f.file_url,f.file_name||'audio.mp3');}} className="px-3 py-1.5 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 text-[#5B8CFF] hover:bg-[#5B8CFF]/20 text-[11px] font-bold transition-all cursor-pointer">⬇️ 다운</a>
                                        <button onClick={()=>ask(`"${f.file_name||'파일'}"을 삭제할까요?`,()=>deletePitchFile(f))} className="px-3 py-1.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/70 hover:text-red-400 text-[11px] font-bold transition-all">삭제</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 파일 관리 */}
      {showFilesPanel&&(
        <div className={`fixed inset-0 z-50 ${panelBg} font-pretendard flex flex-col`}>
          <div className={`flex items-center gap-4 px-6 py-4 border-b ${dividerCls} shrink-0`}>
            <h2 className={`font-black text-[20px] ${D?'text-white':'text-[#111]'}`}>🎵 파일 관리</h2>
            <span className={`text-[13px] ${dimText}`}>{filteredPitchFiles.length}개</span>
            <div className="flex-1"/>
            <button onClick={()=>setShowFilesPanel(false)} className={`px-4 py-2 rounded-xl border font-bold text-[12px] transition-all ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>✕ 닫기</button>
          </div>
          <div className={`flex flex-wrap items-center gap-3 px-6 py-3 border-b ${D?'border-white/5':'border-black/[0.05]'} shrink-0`}>
            <div className="relative"><input value={fileSearch} onChange={e=>setFileSearch(e.target.value)} placeholder="검색..." className={`pl-8 pr-4 py-1.5 border rounded-xl text-[12px] outline-none w-48 ${inputCls}`}/>{fileSearch&&<button onClick={()=>setFileSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] ${D?'text-zinc-600':'text-zinc-400'}`}>✕</button>}</div>
            <div className="flex gap-2 ml-auto flex-wrap">
              <select value={fileFilterVocal} onChange={e=>setFileFilterVocal(e.target.value)} className={`border rounded-xl px-3 py-1.5 text-[11px] outline-none ${inputCls}`}><option value="">보컬 전체</option><option value="male">남성</option><option value="female">여성</option></select>
              <select value={fileFilterGenre} onChange={e=>setFileFilterGenre(e.target.value)} className={`border rounded-xl px-3 py-1.5 text-[11px] outline-none ${inputCls}`}><option value="">장르 전체</option>{GENRES.map(g=><option key={g} value={g}>{g}</option>)}</select>
              <div className={`flex border rounded-xl p-1 gap-0.5 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}>{([['date','최신'],['name','파일명'],['bpm','BPM'],['genre','장르']] as const).map(([v,l])=><button key={v} onClick={()=>setFileSort(v)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${fileSort===v?'bg-white/10 text-white':dimText}`}>{l}</button>)}</div>
            </div>
          </div>
          {selectedFiles.length>0&&(<div className="flex items-center gap-3 px-6 py-2.5 bg-[#5B8CFF]/10 border-b border-[#5B8CFF]/20 shrink-0"><span className="text-[#5B8CFF] text-[13px] font-bold flex-1">{selectedFiles.length}개 선택</span><button onClick={downloadSelected} className="px-4 py-1.5 rounded-xl bg-[#5B8CFF]/20 border border-[#5B8CFF]/30 text-[#5B8CFF] text-[12px] font-bold">⬇️ 다운</button><button onClick={()=>ask(`${selectedFiles.length}개 삭제할까요?`,deleteSelected)} className="px-4 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold">🗑 삭제</button><button onClick={()=>setSelectedFiles([])} className={`text-[12px] font-bold ${dimText}`}>취소</button></div>)}
          <div className="flex-1 overflow-auto px-6 py-4">
            {filteredPitchFiles.length===0?(<div className="flex flex-col items-center justify-center h-full gap-3"><p className={D?'text-zinc-700':'text-zinc-400'}>파일이 없어요</p></div>):(
              <table className="w-full border-collapse">
                <thead><tr className={`border-b ${dividerCls}`}><th className="pb-3 pr-4 w-8"><input type="checkbox" checked={selectedFiles.length===filteredPitchFiles.length&&filteredPitchFiles.length>0} onChange={e=>setSelectedFiles(e.target.checked?filteredPitchFiles.map(f=>f.id):[])} className="w-4 h-4 rounded cursor-pointer"/></th><th className={`pb-3 pr-4 text-left text-[11px] font-black uppercase tracking-widest ${dimText}`}>파일명</th><th className={`pb-3 pr-4 text-left text-[11px] font-black uppercase tracking-widest w-28 ${dimText}`}>아티스트</th><th className={`pb-3 pr-4 text-left text-[11px] font-black uppercase tracking-widest w-24 ${dimText}`}>리드</th><th className={`pb-3 pr-4 text-center text-[11px] font-black uppercase tracking-widest w-20 ${dimText}`}>보컬</th><th className={`pb-3 pr-4 text-center text-[11px] font-black uppercase tracking-widest w-20 ${dimText}`}>BPM</th><th className={`pb-3 pr-4 text-left text-[11px] font-black uppercase tracking-widest w-28 ${dimText}`}>장르</th><th className={`pb-3 pr-4 text-center text-[11px] font-black uppercase tracking-widest w-16 ${dimText}`}>길이</th><th className={`pb-3 pr-4 text-left text-[11px] font-black uppercase tracking-widest w-24 ${dimText}`}>날짜</th><th className={`pb-3 text-center text-[11px] font-black uppercase tracking-widest w-24 ${dimText}`}>액션</th></tr></thead>
                <tbody>{filteredPitchFiles.map((f,idx)=>{const pitch=pitches.find(p=>p.id===f.pitch_id);const lead=leads.find(l=>l.id===pitch?.lead_id);const isSel=selectedFiles.includes(f.id);return(<tr key={f.id} className={`border-b ${D?'border-white/5':'border-black/[0.05]'} ${isSel?'bg-[#5B8CFF]/5':idx%2===0?D?'bg-white/[0.01]':'bg-black/[0.01]':'bg-transparent'}`}><td className="py-3 pr-4"><input type="checkbox" checked={isSel} onChange={e=>setSelectedFiles(p=>e.target.checked?[...p,f.id]:p.filter(x=>x!==f.id))} className="w-4 h-4 rounded cursor-pointer"/></td><td className="py-3 pr-4"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#5B8CFF]/10 border border-[#5B8CFF]/15 flex items-center justify-center shrink-0"><span className="text-[11px]">🎵</span></div><span className={`text-[12px] font-medium truncate max-w-[180px] ${D?'text-zinc-200':'text-zinc-700'}`}>{f.file_name||'audio.mp3'}</span></div></td><td className="py-3 pr-4"><span className={`text-[12px] ${dimText}`}>{pitch?.artist_name||'—'}</span></td><td className="py-3 pr-4"><span className={`text-[11px] ${D?'text-zinc-500':'text-zinc-400'}`}>{lead?.artist||'—'}</span></td><td className="py-3 pr-4 text-center">{f.vocal_gender&&f.vocal_gender!=='unknown'?<div className="flex items-center justify-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${vocalDot(f.vocal_gender)}`}/><span className={`text-[11px] font-bold ${f.vocal_gender==='male'?'text-blue-400':'text-pink-400'}`}>{vocalLabel(f.vocal_gender)}</span></div>:<span className={`text-[11px] ${D?'text-zinc-700':'text-zinc-400'}`}>—</span>}</td><td className="py-3 pr-4 text-center"><span className={`text-[12px] font-bold ${f.bpm>0?D?'text-zinc-300':'text-zinc-700':D?'text-zinc-700':'text-zinc-400'}`}>{f.bpm>0?f.bpm:'—'}</span></td><td className="py-3 pr-4">{f.genre?<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 text-[#5B8CFF]">{f.genre}</span>:<span className={`text-[11px] ${D?'text-zinc-700':'text-zinc-400'}`}>—</span>}</td><td className="py-3 pr-4 text-center"><span className={`text-[11px] font-mono ${dimText}`}>{fmtDur(f.duration)}</span></td><td className="py-3 pr-4"><span className={`text-[11px] ${D?'text-zinc-600':'text-zinc-400'}`}>{new Date(f.created_at).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'})}</span></td><td className="py-3 text-center"><div className="flex items-center justify-center gap-1.5"><a href={f.file_url} download={f.file_name} onClick={e=>{e.preventDefault();blobDownload(f.file_url,f.file_name||'audio.mp3');}} className="px-2.5 py-1 rounded-lg bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 text-[#5B8CFF] hover:bg-[#5B8CFF]/20 text-[10px] font-bold transition-all cursor-pointer">⬇️</a><button onClick={()=>ask(`"${f.file_name||'파일'}"을 삭제할까요?`,()=>deletePitchFile(f))} className="px-2.5 py-1 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400/60 hover:text-red-400 text-[10px] font-bold transition-all">✕</button></div></td></tr>);})}</tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 공지 모달 */}
      {showAnnModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>{setShowAnnModal(false);setAnnForm(null);}}>
          <div className={`w-full max-w-lg border rounded-2xl shadow-2xl ${modalBg}`} onClick={e=>e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4"><h2 className={`font-black text-[18px] ${D?'text-white':'text-[#111]'}`}>📢 {annForm?.id?'공지 수정':'새 공지'}</h2>{announcements.length>0&&!annForm?.id&&<span className={`text-[11px] ${dimText}`}>현재 {announcements.length}개</span>}</div>
              {!annForm?.id&&announcements.length>0&&<div className={`flex flex-col gap-2 mb-4 max-h-[200px] overflow-y-auto`}>{announcements.map(ann=><div key={ann.id} className={`flex items-start gap-3 p-3 rounded-xl border ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}><div className="flex-1 min-w-0">{ann.title&&<p className={`text-[12px] font-bold truncate ${D?'text-white':'text-[#111]'}`}>{ann.title}</p>}<p className={`text-[11px] truncate ${dimText}`}>{ann.content}</p></div><div className="flex gap-2 shrink-0"><button onClick={()=>setAnnForm({id:ann.id,title:ann.title||'',content:ann.content||''})} className={`text-[11px] font-bold ${dimText}`}>수정</button><button onClick={()=>ask('공지를 삭제할까요?',()=>deleteAnn(ann.id))} className="text-red-500/60 hover:text-red-400 text-[11px] font-bold">삭제</button></div></div>)}</div>}
              <div className={`border-t ${dividerCls} pt-4 flex flex-col gap-3`}>
                <input value={annForm?.title||''} onChange={e=>setAnnForm(p=>p?({...p,title:e.target.value}):p)} placeholder="제목" className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputCls}`}/>
                <textarea value={annForm?.content||''} onChange={e=>setAnnForm(p=>p?({...p,content:e.target.value}):p)} placeholder="내용을 입력하세요..." rows={4} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all resize-none leading-relaxed ${inputCls}`}/>
                <div className="flex gap-3"><button onClick={()=>{setAnnForm(null);setShowAnnModal(false);}} className={`flex-1 py-3 rounded-xl border font-bold text-[13px] transition-all ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>취소</button><button onClick={saveAnn} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">저장</button></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 리드 추가/수정 모달 */}
      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl my-4 ${modalBg}`}>
            <div className="p-6">
              <h2 className={`font-black text-[18px] mb-5 ${D?'text-white':'text-[#111]'}`}>{editingLead?'리드 수정':'리드 추가'}</h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.artist} onChange={e=>setForm(p=>({...p,artist:e.target.value}))} placeholder="아티스트명 *" className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputCls}`}/>
                  <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="리드 제목 *" className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputCls}`}/>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-600':'text-zinc-400'}`}>성별</label><select value={form.gender} onChange={e=>setForm(p=>({...p,gender:e.target.value}))} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none ${inputCls}`}><option value="male">남자</option><option value="female">여자</option><option value="mixed">혼성</option></select></div>
                  <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-600':'text-zinc-400'}`}>타입</label><select value={form.group_type} onChange={e=>setForm(p=>({...p,group_type:e.target.value}))} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none ${inputCls}`}><option value="solo">솔로</option><option value="group">그룹</option></select></div>
                  <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-600':'text-zinc-400'}`}>앨범</label><select value={form.album_type} onChange={e=>setForm(p=>({...p,album_type:e.target.value}))} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none ${inputCls}`}><option value="single">Single</option><option value="ep">EP</option><option value="lp">LP</option><option value="ost">OST</option></select></div>
                </div>
                <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>1st Deadline</label><div className="flex gap-2"><input value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} onBlur={e=>setForm(p=>({...p,deadline:parseDeadline(e.target.value)}))} placeholder="YYYY-MM-DD 또는 MMDD" className={`flex-1 border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputCls}`}/><input type="date" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))} className={`border rounded-xl px-3 py-3 text-[13px] outline-none w-14 cursor-pointer ${inputCls}`}/></div><DateShortcuts field="deadline"/></div>
                <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-400':'text-zinc-400'}`}>2nd Deadline <span className={`font-normal normal-case ${D?'text-zinc-700':'text-zinc-400'}`}>(선택)</span></label><div className="flex gap-2"><input value={form.deadline2} onChange={e=>setForm(p=>({...p,deadline2:e.target.value}))} onBlur={e=>setForm(p=>({...p,deadline2:parseDeadline(e.target.value)}))} placeholder="YYYY-MM-DD 또는 MMDD" className={`flex-1 border rounded-xl px-4 py-3 text-[13px] outline-none transition-all ${inputCls}`}/><input type="date" value={form.deadline2} onChange={e=>setForm(p=>({...p,deadline2:e.target.value}))} className={`border rounded-xl px-3 py-3 text-[13px] outline-none w-14 cursor-pointer ${inputCls}`}/></div><DateShortcuts field="deadline2"/></div>

                {/* 한/영 섹션 에디터 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className={`text-[10px] font-black uppercase tracking-widest ${D?'text-zinc-500':'text-zinc-400'}`}>내용</label>
                    <div className={`flex border rounded-xl p-1 gap-1 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}>
                      <button onClick={()=>setContentLang('ko')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${contentLang==='ko'?'bg-[#5B8CFF] text-white':dimText}`}>한국어</button>
                      <button onClick={()=>setContentLang('en')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${contentLang==='en'?'bg-[#5B8CFF] text-white':dimText}`}>English</button>
                    </div>
                  </div>
                  {contentLang==='ko'
                    ?<SectionEditor sections={sectionsKo} onChange={setSectionsKo} isDark={D}/>
                    :<SectionEditor sections={sectionsEn} onChange={setSectionsEn} isDark={D}/>
                  }
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={()=>setShowModal(false)} className={`flex-1 py-3 rounded-xl border font-bold text-[13px] transition-all ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>취소</button>
                <button onClick={saveLead} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirm&&<ConfirmModal msg={confirm.msg} onOk={()=>{confirm.onOk();setConfirm(null);}} onCancel={()=>setConfirm(null)}/>}

      {/* 게스트 모달 */}
      {showGuestsModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>setShowGuestsModal(false)}>
          <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl ${modalBg}`} onClick={e=>e.stopPropagation()}>
            <div className="max-h-[88vh] flex flex-col">
              <div className={`flex items-center gap-3 p-5 border-b ${dividerCls}`}>
                <h2 className={`font-black text-[18px] ${D?'text-white':'text-[#111]'}`}>👥 게스트</h2>
                <div className="flex-1"/>
                <div className={`flex border rounded-xl p-1 gap-1 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}>
                  <button onClick={()=>setGuestTab('pending')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${guestTab==='pending'?'bg-yellow-500/80 text-black':dimText}`}>신청 대기 {pendingGuests.length>0&&pendingGuests.length}</button>
                  <button onClick={()=>setGuestTab('history')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${guestTab==='history'?'bg-zinc-600 text-white':dimText}`}>📁 히스토리 {historyGuests.length>0&&historyGuests.length}</button>
                </div>
                <button onClick={()=>setShowGuestsModal(false)} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[13px] ml-2 transition-all ${D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                {displayedGuests.length===0?(
                  <div className="text-center py-12">
                    <p className={`text-[13px] ${D?'text-zinc-700':'text-zinc-400'}`}>{guestTab==='pending'?'대기 중인 게스트가 없어요':'히스토리가 없어요'}</p>
                    {guestTab==='pending'&&historyGuests.length>0&&<button onClick={()=>setGuestTab('history')} className={`mt-3 text-[12px] transition-colors ${D?'text-zinc-600 hover:text-zinc-400':'text-zinc-400 hover:text-zinc-600'}`}>히스토리 보기 →</button>}
                  </div>
                ):(
                  <div className="flex flex-col gap-2">
                    {displayedGuests.map(g=>{
                      const guest=g.guests;const isPending=g.status==='pending';const isApproved=g.status==='approved';
                      return(
                        <div key={g.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isPending?'border-yellow-500/20 bg-yellow-500/5':isApproved?'border-emerald-500/20 bg-emerald-500/5':D?'border-white/5 bg-white/[0.02]':'border-black/[0.06] bg-black/[0.02]'}`}>
                          <div className="w-10 h-10 rounded-full bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center shrink-0"><span className="text-[#5B8CFF] font-black text-[13px]">{(guest?.artist_name||'?')[0].toUpperCase()}</span></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className={`font-bold text-[14px] ${D?'text-white':'text-[#111]'}`}>{guest?.artist_name||'—'}</p>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${isPending?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':isApproved?'text-emerald-400 border-emerald-500/30 bg-emerald-500/10':'text-zinc-500 border-zinc-700/50 bg-zinc-800/30'}`}>{isPending?'대기':isApproved?'승인':'거절'}</span>
                            </div>
                            <p className={`text-[12px] ${dimText}`}>{guest?.name} · {guest?.email}</p>
                            {guest?.phone&&<p className={`text-[11px] ${D?'text-zinc-600':'text-zinc-400'}`}>{guest.phone}</p>}
                            <p className={`text-[10px] mt-0.5 ${D?'text-zinc-700':'text-zinc-400'}`}>{new Date(g.created_at).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {isPending&&<button onClick={()=>updateApproval(g.id,'approved')} className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold transition-all">승인</button>}
                            {isPending&&<button onClick={()=>ask(`"${guest?.artist_name}"의 접근을 거절할까요?`,()=>updateApproval(g.id,'rejected'))} className="px-3 py-1.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/70 hover:text-red-400 text-[11px] font-bold transition-all">거절</button>}
                            {!isPending&&isApproved&&<button onClick={()=>ask(`"${guest?.artist_name}"의 접근을 거절할까요?`,()=>updateApproval(g.id,'rejected'))} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${D?'bg-white/5 border-white/10 text-zinc-500 hover:text-red-400':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-red-500'}`}>거절로 변경</button>}
                            {!isPending&&!isApproved&&<button onClick={()=>updateApproval(g.id,'approved')} className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-emerald-400':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-emerald-500'}`}>재승인</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMsg&&<div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-white/10 backdrop-blur-md border border-white/20 text-white text-[12px] font-bold px-5 py-3 rounded-2xl shadow-2xl font-pretendard">{toastMsg}</div>}
    </>
  );
}