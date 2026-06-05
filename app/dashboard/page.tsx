'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import ChatPanel from '@/app/components/ChatPanel';

const GENRES = ['팝','R&B/소울','발라드','댄스/일렉','힙합/랩','록/밴드','EDM','재즈','인디','OST','포크/어쿠스틱','트로트','기타'];

type Section = {id:string;title:string;body:string};
const parseSections = (content:string): Section[]|null => {
  try {
    const p = JSON.parse(content);
    if(Array.isArray(p)&&p.length>0&&'body' in p[0])
      return p.map((x:any,i:number)=>({id:`s${i}`,title:x.title||'',body:x.body||''}));
  } catch{}
  return null;
};

const getFileHash = async (file: File): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
};
const analyzeVocal = async (file: File): Promise<{vocal:'male'|'female'|'unknown';duration:number}> => {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(await file.arrayBuffer());
    await ctx.close();
    const sr = audioBuffer.sampleRate;
    const duration = Math.round(audioBuffer.duration);
    const startSec = Math.min(audioBuffer.duration * 0.2, Math.max(0, audioBuffer.duration - 8));
    const durSec = Math.min(5, audioBuffer.duration - startSec);
    let vocal: 'male'|'female'|'unknown' = 'unknown';
    if (durSec >= 1) {
      const offline = new OfflineAudioContext(1, Math.floor(durSec * sr), sr);
      const src = offline.createBufferSource();
      src.buffer = audioBuffer; src.connect(offline.destination); src.start(0, startSec, durSec);
      const rendered = await offline.startRendering();
      const d = rendered.getChannelData(0);
      const fSize = Math.floor(sr * 0.04), pitches: number[] = [];
      for (let start = 0; start < d.length - fSize; start += fSize) {
        const minL = Math.floor(sr / 380), maxL = Math.floor(sr / 65);
        let maxC = -Infinity, bestL = 0;
        for (let lag = minL; lag <= maxL; lag++) {
          let c = 0, n = 0;
          for (let i = 0; i < fSize - lag; i++) { c += d[start+i]*d[start+i+lag]; n += d[start+i]*d[start+i]; }
          const nc = n > 0 ? c / n : 0; if (nc > maxC) { maxC = nc; bestL = lag; }
        }
        if (maxC > 0.15 && bestL > 0) pitches.push(sr / bestL);
      }
      if (pitches.length >= 3) {
        pitches.sort((a,b) => a - b);
        const med = pitches[Math.floor(pitches.length / 2)];
        if (med < 158) vocal = 'male'; else if (med > 195) vocal = 'female';
      }
    }
    return { vocal, duration };
  } catch { return { vocal: 'unknown', duration: 0 }; }
};

type PitchFileItem = {id:string;file:File;hash:string;vocal:'male'|'female'|'unknown';duration:number;analyzing:boolean;isDuplicate:boolean;bpm:string;genre:string;};

const getCardColor=(gender:string,group_type:string)=>{const g=group_type==='group';if(gender==='mixed')return{bg:g?'bg-purple-500/10':'bg-purple-500/20',border:g?'border-purple-500/20':'border-purple-500/40',text:g?'text-purple-400/50':'text-purple-300',dot:g?'bg-purple-400/35':'bg-purple-400',label:g?'혼성 그룹':'혼성'};if(gender==='female')return{bg:g?'bg-pink-500/10':'bg-pink-500/20',border:g?'border-pink-500/20':'border-pink-500/40',text:g?'text-pink-400/50':'text-pink-300',dot:g?'bg-pink-400/35':'bg-pink-400',label:g?'여자 그룹':'여자'};return{bg:g?'bg-blue-500/10':'bg-blue-500/20',border:g?'border-blue-500/20':'border-blue-500/40',text:g?'text-blue-400/50':'text-blue-300',dot:g?'bg-blue-400/35':'bg-blue-400',label:g?'남자 그룹':'남자'};};
const ALBUM_MAP:Record<string,{label:string;cls:string}>={single:{label:'Single',cls:'text-zinc-500 border-zinc-700/50 bg-zinc-800/30'},ep:{label:'EP',cls:'text-emerald-400/80 border-emerald-700/30 bg-emerald-900/20'},lp:{label:'LP',cls:'text-blue-400/80 border-blue-700/30 bg-blue-900/20'},ost:{label:'OST',cls:'text-amber-400/80 border-amber-700/30 bg-amber-900/20'}};
const AlbumBadge=({type}:{type:string})=>{const t=ALBUM_MAP[type]||ALBUM_MAP.single;return<span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${t.cls}`}>{t.label}</span>;};
const getLinkIcon=(url:string)=>{if(!url)return'🔗';if(url.includes('youtube')||url.includes('youtu.be'))return'▶️';if(url.includes('soundcloud'))return'🎵';if(url.includes('spotify'))return'🎧';if(url.includes('instagram'))return'📸';return'🔗';};
const PitchFileRow=({f,D,dimText}:{f:any;D:boolean;dimText:string})=>{
  const vLabel=f.vocal_gender==='male'?'남성':f.vocal_gender==='female'?'여성':f.vocal_gender==='both'?'혼성':'';
  return(
    <div className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg ${D?'bg-black/20':'bg-black/[0.04]'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px]">🎵</span>
        <span className={`flex-1 min-w-0 text-[11px] truncate ${D?'text-zinc-300':'text-zinc-700'}`}>{f.file_name||'audio.mp3'}</span>
        {vLabel&&<span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#5B8CFF]/15 text-[#5B8CFF]">{vLabel}</span>}
        {f.bpm>0&&<span className={`text-[10px] font-black ${dimText}`}>{f.bpm}BPM</span>}
        {f.key&&<span className={`text-[10px] font-black ${dimText}`}>{f.key}</span>}
        {f.genre&&<span className="text-[10px] font-black text-emerald-400">{f.genre}</span>}
      </div>
      {f.file_url&&<audio controls preload="none" src={f.file_url} className="w-full" style={{height:'32px'}}/>}
    </div>
  );
};
const isExpired=(d:string|null)=>!!d&&new Date(d)<new Date(new Date().toDateString());
const getDDay=(d:string|null)=>{if(!d)return null;const diff=Math.ceil((new Date(d).getTime()-new Date(new Date().toDateString()).getTime())/86400000);if(diff===0)return'D-DAY';return diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;};
const toDateStr=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const extractUrls=(t:string)=>t.match(/https?:\/\/[^\s]+/g)||[];
const startOfWeek=(d:Date)=>{const r=new Date(d);r.setDate(r.getDate()-r.getDay());r.setHours(0,0,0,0);return r;};
const fmtDur=(s:number)=>s?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:'';
const vocalLabel=(v:string)=>v==='male'?'남성 보컬':v==='female'?'여성 보컬':'미감지';
const vocalCls=(v:string)=>v==='male'?'text-blue-400 border-blue-500/30 bg-blue-500/10':v==='female'?'text-pink-400 border-pink-500/30 bg-pink-500/10':'text-zinc-600 border-zinc-700/50 bg-zinc-800/30';

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

const emptyPitch=()=>({artist_name:'',contact:'',message:''});
let fileCounter=0;

export default function GuestView(){
  const params=useParams();
  const [hostId,setHostId]=useState('');
  const [showLeadForm,setShowLeadForm]=useState(false);
  const [editingLead,setEditingLead]=useState<any>(null);
  const [leadSaving,setLeadSaving]=useState(false);
  const [lArtist,setLArtist]=useState('');
  const [lTitle,setLTitle]=useState('');
  const [lGender,setLGender]=useState('');
  const [lGroup,setLGroup]=useState('');
  const [lAlbum,setLAlbum]=useState('single');
  const [lContent,setLContent]=useState('');
  const [lDeadline,setLDeadline]=useState('');
  const [lDeadline2,setLDeadline2]=useState('');
  const [leads,setLeads]=useState<any[]>([]);
  const [announcements,setAnnouncements]=useState<any[]>([]);
  const [view,setView]=useState<'calendar'|'list'|'pitches'|'files'|'stats'>('calendar');
  const [hostCompany,setHostCompany]=useState('');
  const [editingCompany,setEditingCompany]=useState(false);
  const [companyDraft,setCompanyDraft]=useState('');
  const [hostPitches,setHostPitches]=useState<any[]>([]);
  const [hostPitchFiles,setHostPitchFiles]=useState<any[]>([]);
  const [hostPitchLoading,setHostPitchLoading]=useState(false);
  const [pitchSort,setPitchSort]=useState<'recent'|'bpm'|'vocal'|'key'>('recent');
  const [pitchVocalFilter,setPitchVocalFilter]=useState<'all'|'male'|'female'|'both'>('all');
  const [expandedPitchLeads,setExpandedPitchLeads]=useState<Record<string,boolean>>({});
  const [pitchToast,setPitchToast]=useState<{artist:string;lead:string;pitchId:string}|null>(null);
  const pitchToastTimer=useRef<any>(null);
  const [fileSort,setFileSort]=useState<'recent'|'bpm'|'vocal'|'key'>('recent');
  const [fileVocalFilter,setFileVocalFilter]=useState<'all'|'male'|'female'|'both'>('all');
  const [fileSearch,setFileSearch]=useState('');
  const [calView,setCalView]=useState<'month'|'week'>('month');
  const [currentMonth,setCurrentMonth]=useState(new Date());
  const [weekStart,setWeekStart]=useState(startOfWeek(new Date()));
  const [viewingLead,setViewingLead]=useState<any>(null);
  const [contentLang,setContentLang]=useState<'ko'|'en'>('ko');
  const [pitchingLead,setPitchingLead]=useState<any>(null);
  const [pitchForm,setPitchForm]=useState(emptyPitch());
  const [pitchFiles,setPitchFiles]=useState<PitchFileItem[]>([]);
  const [pitchSent,setPitchSent]=useState(false);
  const [pitchLoading,setPitchLoading]=useState(false);
  const [uploadProgress,setUploadProgress]=useState(0);
  const [uploadError,setUploadError]=useState('');
  const [filterGender,setFilterGender]=useState<string[]>([]);
  const [filterGroup,setFilterGroup]=useState<string[]>([]);
  const [filterAlbum,setFilterAlbum]=useState<string[]>([]);
  const [sortBy,setSortBy]=useState<'dday'|'gender'|'group'|'album'>('dday');
  const [guestProfile,setGuestProfile]=useState<any>(null);
  const [authStatus,setAuthStatus]=useState<'loading'|'none'|'pending'|'rejected'|'approved'>('loading');
  const [theme,setTheme]=useState<'dark'|'light'>('dark');
  const [translating,setTranslating]=useState(false);
  const [showMyPitches,setShowMyPitches]=useState(false);
  const [myPitches,setMyPitches]=useState<any[]>([]);
  const [myPitchFiles,setMyPitchFiles]=useState<any[]>([]);
  const [myLeadMap,setMyLeadMap]=useState<Record<string,any>>({});
  const [myPitchLoading,setMyPitchLoading]=useState(false);
  const [translatedCache,setTranslatedCache]=useState<Record<string,Section[]>>({});
  const [showMembers,setShowMembers]=useState(false);
  const [memberList,setMemberList]=useState<any[]>([]);
  const [memberLoading,setMemberLoading]=useState(false);
  const [currentUser,setCurrentUser]=useState<any>(null);

  useEffect(()=>{
    const setApproved=(user:any)=>{
      setHostId(user.id);
      setCurrentUser(user);
      localStorage.setItem('last_host_id',user.id);
      setAuthStatus('approved');
    };
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){setApproved(session.user);return;}
      const{data:{user}}=await supabase.auth.getUser();
      if(user){setApproved(user);}else{setAuthStatus('none');}
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_ev,session)=>{
      if(_ev==='SIGNED_IN'||_ev==='INITIAL_SESSION'||_ev==='TOKEN_REFRESHED'){
        if(session?.user)setApproved(session.user);
        else setAuthStatus('none');
      }else if(_ev==='SIGNED_OUT'){setAuthStatus('none');}
    });
    return()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{const s=localStorage.getItem('lead_theme');if(s==='light')setTheme('light');},[]);
  const toggleTheme=()=>{const n=theme==='dark'?'light':'dark';setTheme(n);localStorage.setItem('lead_theme',n);};
  const D=theme==='dark';
  const mainBg=D?'bg-[#050505] text-white':'bg-[#F2F2F7] text-[#111]';
  const dividerCls=D?'border-white/10':'border-black/[0.08]';
  const dimText=D?'text-zinc-500':'text-zinc-500';
  const inputCls=D?'bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-[#5B8CFF]/50':'bg-black/[0.04] border-black/[0.08] text-[#111] placeholder:text-zinc-400 focus:border-[#5B8CFF]/50';
  const openLeadForm=(lead?:any, presetDeadline?:string)=>{
    if(lead){
      setEditingLead(lead);setLArtist(lead.artist||'');setLTitle(lead.title||'');
      setLGender(lead.gender||'');setLGroup(lead.group_type||'');setLAlbum(lead.album_type||'single');
      setLContent(lead.content||'');setLDeadline(lead.deadline||'');setLDeadline2(lead.deadline2||'');
    }else{
      setEditingLead(null);setLArtist('');setLTitle('');setLGender('');setLGroup('');
      setLAlbum('single');setLContent('');setLDeadline(presetDeadline||'');setLDeadline2('');
    }
    setShowLeadForm(true);
  };
  const [leadSaveError,setLeadSaveError]=useState('');
  const saveLead=async()=>{
    if(!lArtist.trim()||!lGender||!lGroup||!hostId)return;
    setLeadSaving(true);setLeadSaveError('');
    const data={host_id:hostId,artist:lArtist.trim(),title:lTitle.trim()||'',gender:lGender,group_type:lGroup,album_type:lAlbum,content:lContent.trim()||null,deadline:lDeadline||null,deadline2:lDeadline2||null};
    let err:any=null;
    if(editingLead){const r=await supabase.from('leads').update(data).eq('id',editingLead.id);err=r.error;}
    else{const r=await supabase.from('leads').insert(data);err=r.error;}
    if(err){setLeadSaveError(err.message||'저장 실패');setLeadSaving(false);return;}
    await fetchAll();setShowLeadForm(false);setLeadSaveError('');setLeadSaving(false);
  };
  const deleteLead=async(leadId:string)=>{
    if(!confirm('이 리드를 삭제할까요?'))return;
    await supabase.from('leads').delete().eq('id',leadId);
    await fetchAll();
  };
  const fileInputRef=useRef<HTMLInputElement>(null);

  const fetchMembers=async()=>{
    if(!hostId)return;
    setMemberLoading(true);
    const{data:approvals}=await supabase.from('member_approvals').select('*').eq('host_id',hostId).order('created_at',{ascending:false});
    if(!approvals){setMemberLoading(false);return;}
    const ids=approvals.map((a:any)=>a.member_id).filter(Boolean);
    if(ids.length===0){setMemberList(approvals);setMemberLoading(false);return;}
    const{data:profiles}=await supabase.from('members').select('*').in('id',ids);
    const profileMap:Record<string,any>={};
    if(profiles)profiles.forEach((p:any)=>{profileMap[p.id]=p;});
    setMemberList(approvals.map((a:any)=>({...a,profile:profileMap[a.member_id]||null})));
    setMemberLoading(false);
  };
  const setMemberRole=async(memberId:string,status:string)=>{
    await supabase.from('member_approvals').update({status}).eq('member_id',memberId).eq('host_id',hostId);
    fetchMembers();
  };

  const fetchMyPitches=async()=>{
    if(!guestProfile)return;
    setMyPitchLoading(true);
    const{data:pitches}=await supabase.from('pitches').select('*').eq('member_id',guestProfile.id).order('created_at',{ascending:false});
    if(pitches&&pitches.length>0){
      setMyPitches(pitches);
      const pIds=pitches.map((p:any)=>p.id);
      const lIds=[...new Set(pitches.map((p:any)=>p.lead_id))];
      const[{data:files},{data:leads}]=await Promise.all([
        supabase.from('pitch_files').select('*').in('pitch_id',pIds),
        supabase.from('leads').select('id,artist,title').in('id',lIds as string[]),
      ]);
      if(files)setMyPitchFiles(files);
      if(leads){const m:Record<string,any>={};leads.forEach((l:any)=>m[l.id]=l);setMyLeadMap(m);}
    }else{setMyPitches([]);}
    setMyPitchLoading(false);
  };

  const fetchAll=async()=>{
    const [lr,ar]=await Promise.all([
      supabase.from('leads').select('*').eq('host_id',hostId).order('deadline',{ascending:true}),
      supabase.from('lead_announcements').select('*').eq('host_id',hostId).order('created_at',{ascending:true}),
    ]);
    if(lr.data)setLeads(lr.data);if(ar.data)setAnnouncements(ar.data);
  };
  const fetchHostPitches=async()=>{
    if(!hostId)return;
    setHostPitchLoading(true);
    // 피칭과 파일을 독립적으로 조회 — 파일은 피칭 연결 여부와 무관하게 host 기준 전체
    const[pr,fr]=await Promise.all([
      supabase.from('pitches').select('*').eq('host_id',hostId).order('created_at',{ascending:false}),
      supabase.from('pitch_files').select('*').eq('host_id',hostId).order('created_at',{ascending:false}),
    ]);
    setHostPitches(pr.data||[]);
    setHostPitchFiles(fr.data||[]);
    setHostPitchLoading(false);
  };
  useEffect(()=>{if(!hostId)return;fetchAll();const ch=supabase.channel('gl').on('postgres_changes',{event:'*',schema:'public',table:'leads',filter:`host_id=eq.${hostId}`},fetchAll).subscribe();return()=>{supabase.removeChannel(ch);};},[hostId]);
  useEffect(()=>{if(!hostId)return;fetchHostPitches();const firstLoad={v:true};const ch=supabase.channel('hp').on('postgres_changes',{event:'*',schema:'public',table:'pitches',filter:`host_id=eq.${hostId}`},(payload)=>{fetchHostPitches();if(payload.eventType==='INSERT'&&payload.new){const np:any=payload.new;const lead=leads.find(l=>l.id===np.lead_id);setPitchToast({artist:np.artist_name||'익명',lead:lead?.artist||'',pitchId:np.id});if(pitchToastTimer.current)clearTimeout(pitchToastTimer.current);pitchToastTimer.current=setTimeout(()=>setPitchToast(null),6000);}}).subscribe();firstLoad.v=false;return()=>{supabase.removeChannel(ch);};},[hostId,leads]);
  useEffect(()=>{if(!hostId)return;supabase.from('host_profiles').select('company,display_name').eq('id',hostId).single().then(({data})=>{if(data)setHostCompany(data.company||data.display_name||'');});},[hostId]);
  const saveCompany=async()=>{const v=companyDraft.trim();setHostCompany(v);setEditingCompany(false);if(hostId)await supabase.from('host_profiles').upsert({id:hostId,company:v||null});};
  useEffect(()=>{if(!hostId)return;const ch=supabase.channel('members_rt').on('postgres_changes',{event:'*',schema:'public',table:'member_approvals',filter:`host_id=eq.${hostId}`},()=>fetchMembers()).subscribe();return()=>{supabase.removeChannel(ch);};},[hostId]);

  const addFile=async(file:File)=>{
    if(!file.name.toLowerCase().endsWith('.mp3')){alert('MP3 파일만 업로드 가능해요!');return;}
    if(file.size>50*1024*1024){alert('50MB 이하 파일만 가능해요!');return;}
    const id=`f${++fileCounter}`;
    setPitchFiles(prev=>[...prev,{id,file,hash:'',vocal:'unknown',duration:0,analyzing:true,isDuplicate:false,bpm:'',genre:''}]);
    const [hash,analysis]=await Promise.all([getFileHash(file),analyzeVocal(file)]);
    const {data:dup}=await supabase.from('pitch_files').select('id').eq('file_hash',hash).eq('host_id',hostId);
    setPitchFiles(prev=>prev.map(f=>f.id===id?{...f,hash,vocal:analysis.vocal,duration:analysis.duration,isDuplicate:!!(dup&&dup.length>0),analyzing:false}:f));
  };
  const removeFile=(id:string)=>setPitchFiles(prev=>prev.filter(f=>f.id!==id));
  const updateFile=(id:string,patch:Partial<PitchFileItem>)=>setPitchFiles(prev=>prev.map(f=>f.id===id?{...f,...patch}:f));
  const handleFileDrop=(e:React.DragEvent)=>{e.preventDefault();Array.from(e.dataTransfer.files).forEach(addFile);};
  const handleFileInput=(e:React.ChangeEvent<HTMLInputElement>)=>{Array.from(e.target.files||[]).forEach(addFile);e.target.value='';};

  const submitPitch=async()=>{
    if(!pitchForm.artist_name.trim()||!pitchForm.contact.trim()||!pitchingLead)return;
    setPitchLoading(true);setUploadProgress(0);setUploadError('');
    const {data:pitchData,error:pitchErr}=await supabase.from('pitches').insert({lead_id:pitchingLead.id,host_id:hostId,member_id:guestProfile?.id||null,artist_name:pitchForm.artist_name,contact:pitchForm.contact,message:pitchForm.message}).select().single();
    if(pitchErr||!pitchData){setPitchLoading(false);setUploadError(`피칭 등록 실패: ${pitchErr?.message||'알 수 없는 오류'}`);return;}
    if(pitchFiles.length>0){
      const total=pitchFiles.length;
      for(let i=0;i<total;i++){
        const pf=pitchFiles[i];
        const path=`${hostId}/${pitchData.id}/${Date.now()}_${i}.mp3`;
        setUploadProgress(Math.round((i/total)*100));
        const {error:upErr}=await supabase.storage.from('pitch-files').upload(path,pf.file,{contentType:'audio/mpeg',upsert:false});
        if(upErr){setPitchLoading(false);setUploadError(`파일 업로드 실패: ${upErr.message}`);return;}
        const fileUrl=supabase.storage.from('pitch-files').getPublicUrl(path).data.publicUrl;
        const {error:pfErr}=await supabase.from('pitch_files').insert({pitch_id:pitchData.id,host_id:hostId,file_url:fileUrl,file_name:pf.file.name,file_hash:pf.hash||null,bpm:pf.bpm?parseInt(pf.bpm)||null:null,vocal_gender:pf.vocal||null,genre:pf.genre||null,duration:pf.duration||null});
        if(pfErr){setPitchLoading(false);setUploadError(`파일 정보 저장 실패: ${pfErr.message}`);return;}
        setUploadProgress(Math.round(((i+1)/total)*100));
      }
    }
    setPitchLoading(false);setPitchSent(true);
  };

  const gTranslate=async(text:string):Promise<string>=>{
    if(!text.trim())return'';
    const res=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    const data=await res.json();
    return data[0].map((item:any)=>item[0]).join('');
  };
  const switchToEn=async(lead:any)=>{
    if(contentLang==='en'){setContentLang('ko');return;}
    if(lead.content_en){setContentLang('en');return;}
    if(translatedCache[lead.id]){setContentLang('en');return;}
    setTranslating(true);
    try{
      const sections=parseSections(lead.content||'');
      if(sections){
        const translated=await Promise.all(sections.map(async(s,i)=>({
          id:`en${i}`,
          title:s.title?await gTranslate(s.title):'',
          body:await gTranslate(s.body),
        })));
        setTranslatedCache(p=>({...p,[lead.id]:translated}));
      } else {
        const body=await gTranslate(lead.content||'');
        setTranslatedCache(p=>({...p,[lead.id]:[{id:'en0',title:'',body}]}));
      }
      setContentLang('en');
    }catch{}
    setTranslating(false);
  };
  const getEnContent=(lead:any):Section[]|null=>{
    if(lead.content_en)return parseSections(lead.content_en)||[{id:'en0',title:'',body:lead.content_en}];
    return translatedCache[lead.id]||null;
  };
  const renderSections=(sections:Section[])=>(
    <div className="flex flex-col gap-4">
      {sections.map((s,i)=>(
        <div key={i}>
          {s.title&&<p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>{i+1}. {s.title}</p>}
          <div className={`text-[13px] leading-relaxed ${D?'text-zinc-300':'text-zinc-700'}`}>
            {s.body.split(/(https?:\/\/[^\s]+)/g).map((part,j)=>{
              if(part.match(/^https?:\/\//))return<a key={j} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#5B8CFF] hover:underline break-all"><span>{getLinkIcon(part)}</span><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
              return<span key={j} className="whitespace-pre-wrap">{part}</span>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
  const renderContent=(content:string)=>{
    if(!content)return null;
    const sections=parseSections(content);
    if(sections){
      return(
        <div className="flex flex-col gap-4">
          {sections.map((s,i)=>(
            <div key={i}>
              {s.title&&<p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>{i+1}. {s.title}</p>}
              <div className={`text-[13px] leading-relaxed ${D?'text-zinc-300':'text-zinc-700'}`}>
                {s.body.split(/(https?:\/\/[^\s]+)/g).map((part,j)=>{
                  if(part.match(/^https?:\/\//))return<a key={j} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#5B8CFF] hover:underline break-all"><span>{getLinkIcon(part)}</span><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
                  return<span key={j} className="whitespace-pre-wrap">{part}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return content.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>{
      if(part.match(/^https?:\/\//))return<a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#5B8CFF] hover:underline break-all"><span>{getLinkIcon(part)}</span><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
      return<span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const getLeadPreview=(lead:any)=>{
    const sections=parseSections(lead.content||'');
    if(sections)return sections.map((s:any)=>s.body).join(' ').replace(/https?:\/\/[^\s]+/g,'🔗').slice(0,80);
    return(lead.content||'').replace(/https?:\/\/[^\s]+/g,'🔗').slice(0,80);
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
    return l.sort((a,b)=>{if(sortBy==='gender')return a.gender.localeCompare(b.gender);if(sortBy==='group')return a.group_type.localeCompare(b.group_type);if(sortBy==='album')return(a.album_type||'single').localeCompare(b.album_type||'single');const aD=a.deadline||a.deadline2,bD=b.deadline||b.deadline2;if(!aD)return 1;if(!bD)return-1;return new Date(aD).getTime()-new Date(bD).getTime();});
  },[leads,filterGender,filterGroup,filterAlbum,sortBy]);

  const LeadCard=({lead,compact=false}:{lead:any;compact?:boolean})=>{
    const c=getCardColor(lead.gender,lead.group_type);
    const expired=isExpired(lead.deadline2||lead.deadline);
    const allText=lead.content?parseSections(lead.content)?.map((s:any)=>s.body).join('\n')||lead.content:'';
    const urls=extractUrls(allText);
    return(
      <div onClick={()=>{setViewingLead(lead);setContentLang('ko');}} className={`border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] ${c.bg} ${c.border} ${expired?'opacity-40 grayscale':''} ${compact?'p-2':'p-4'}`}>
        {compact?(<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}/><span className="text-white text-[11px] font-bold truncate">{lead.artist}</span><DeadlineDisplay lead={lead} size="compact"/></div>):(
          <>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}/><span className={`text-[10px] font-black ${c.text}`}>{c.label}</span><AlbumBadge type={lead.album_type||'single'}/></div><h3 className={`font-black text-[15px] truncate ${D?"text-white":"text-[#111]"}`}>{lead.artist}</h3><p className={`text-[12px] truncate ${D?"text-zinc-400":"text-zinc-600"}`}>{lead.title}</p></div>
              <div className="ml-2 shrink-0"><DeadlineDisplay lead={lead} size="normal"/></div>
            </div>
            {lead.content&&<p className={`text-[11px] line-clamp-2 mt-1 ${D?"text-zinc-500":"text-zinc-600"}`}>{getLeadPreview(lead)}</p>}
            {urls.length>0&&<div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">{urls.slice(0,3).map((url,i)=><a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-[13px] hover:scale-110 transition-transform">{getLinkIcon(url)}</a>)}{urls.length>3&&<span className="text-zinc-700 text-[10px] self-center">+{urls.length-3}</span>}</div>}
          </>
        )}
      </div>
    );
  };

  const FileItem=({item}:{item:PitchFileItem})=>(
    <div className={`border rounded-2xl overflow-hidden ${D?'border-white/10 bg-white/[0.03]':'border-black/[0.08] bg-black/[0.02]'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-[16px]">🎵</span>
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-bold truncate ${D?'text-white':'text-[#111]'}`}>{item.file.name}</p>
          <p className={`text-[11px] ${D?'text-zinc-600':'text-zinc-400'}`}>{(item.file.size/1024/1024).toFixed(1)}MB{item.duration>0&&` · ${fmtDur(item.duration)}`}</p>
        </div>
        {item.analyzing&&<div className="w-4 h-4 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin shrink-0"/>}
        {!item.analyzing&&<span className="text-green-400 text-[13px] shrink-0">✓</span>}
        <button onClick={()=>removeFile(item.id)} className={`text-[13px] transition-colors shrink-0 ${D?'text-zinc-700 hover:text-red-400':'text-zinc-400 hover:text-red-500'}`}>✕</button>
      </div>
      {!item.analyzing&&(
        <div className={`px-4 pb-4 border-t pt-3 flex flex-col gap-3 ${D?'border-white/5':'border-black/[0.05]'}`}>
          {item.isDuplicate&&<div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20"><p className="text-yellow-400 text-[11px] font-bold">⚠️ 이미 제출된 적 있는 파일이에요</p></div>}
          {item.vocal!=='unknown'&&(
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${D?'text-zinc-600':'text-zinc-400'}`}>보컬</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${vocalCls(item.vocal)}`}>🎤 {vocalLabel(item.vocal)}</span>
              <span className={`text-[10px] ${D?'text-zinc-700':'text-zinc-400'}`}>자동 감지</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>BPM</label>
            <input type="number" min="40" max="300" value={item.bpm} onChange={e=>updateFile(item.id,{bpm:e.target.value})} placeholder="직접 입력 (예: 120)"
              className={`flex-1 border rounded-xl px-3 py-2 text-[12px] outline-none transition-all ${inputCls}`}/>
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${D?'text-zinc-600':'text-zinc-400'}`}>장르</p>
            <div className="flex flex-wrap gap-1">
              {GENRES.map(g=>(
                <button key={g} onClick={()=>updateFile(item.id,{genre:item.genre===g?'':g})}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${item.genre===g?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':D?'bg-white/5 border-white/10 text-zinc-600 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const GateScreen=({icon,title,sub,children}:{icon:string;title:string;sub:string;children?:React.ReactNode})=>(
    <>
      <style dangerouslySetInnerHTML={{__html:`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}`}}/>
      <main className={`min-h-screen ${mainBg} flex items-center justify-center p-5 font-pretendard relative overflow-hidden`}>
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] ${D?'opacity-[0.06]':'opacity-[0.04]'} pointer-events-none`}/>
        <div className="w-full max-w-sm text-center">
          <div className="flex items-baseline justify-center gap-2.5 mb-10"><h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1><span className={`${dimText} text-[11px] font-bold tracking-[0.2em]`}>by NEN</span></div>
          <div className={`border rounded-2xl p-8 ${D?'bg-white/[0.03] border-white/10':'bg-white border-black/[0.08]'}`}>
            <div className="text-4xl mb-4">{icon}</div>
            <h2 className={`font-black text-[18px] mb-2 ${D?'text-white':'text-[#111]'}`}>{title}</h2>
            <p className={`text-[13px] leading-relaxed ${dimText}`}>{sub}</p>
            {children}
          </div>
          <p className={`text-[11px] mt-6 ${D?'text-zinc-700':'text-zinc-400'}`}>Contact : everplayground@gmail.com</p>
        </div>
      </main>
    </>
  );

  if(authStatus==='loading')return(<div className={`min-h-screen ${mainBg} flex items-center justify-center`}><div className="w-6 h-6 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin"/></div>);
  if(authStatus==='none')return(<GateScreen icon="🔐" title="로그인이 필요해요" sub="리드를 보고 피칭하려면 로그인하세요."><a href={`/guest?hostId=${hostId}&redirect=/view/${hostId}`} className="block w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all">로그인 / 회원가입</a></GateScreen>);
  if(authStatus==='pending')return(<GateScreen icon="⏳" title="승인 대기 중이에요" sub={`${guestProfile?.artist_name||''}님의 접근 요청을 담당자가 검토 중이에요.\n승인 완료 시 이용하실 수 있어요.`}><button onClick={()=>supabase.auth.signOut().then(()=>setAuthStatus('none'))} className={`block w-full mt-6 py-3 rounded-xl border font-bold text-[13px] transition-all ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>다른 계정으로 로그인</button></GateScreen>);
  if(authStatus==='rejected')return(<GateScreen icon="🚫" title="접근이 거절됐어요" sub="담당자에게 문의해주세요."><button onClick={()=>supabase.auth.signOut().then(()=>setAuthStatus('none'))} className={`block w-full mt-6 py-3 rounded-xl border font-bold text-[13px] transition-all ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>다른 계정으로 로그인</button></GateScreen>);

  return(
    <>
      <style dangerouslySetInnerHTML={{__html:`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}`}}/>
      <main className={`min-h-screen ${mainBg} p-5 lg:p-8 font-pretendard relative`}>
        <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#5B8CFF] rounded-full mix-blend-screen filter blur-[200px] ${D?'opacity-[0.06]':'opacity-[0.04]'} pointer-events-none`}/>
        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="flex items-baseline justify-center gap-2.5"><h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#5B8CFF] to-[#a5c0ff] uppercase tracking-tighter">LEAD</h1><span className={`${dimText} text-[11px] font-bold tracking-[0.2em]`}>by NEN</span></div>
          {editingCompany?(
            <div className="mt-2 flex items-center gap-1.5">
              <input autoFocus value={companyDraft} onChange={e=>setCompanyDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveCompany();if(e.key==='Escape')setEditingCompany(false);}} placeholder="회사/팀 이름" className={`border rounded-full px-3 py-1 text-[12px] font-black text-center outline-none w-40 ${inputCls}`}/>
              <button onClick={saveCompany} className="px-2.5 py-1 rounded-full bg-[#5B8CFF] text-white text-[11px] font-black">저장</button>
              <button onClick={()=>setEditingCompany(false)} className={`px-2 py-1 rounded-full text-[11px] font-black ${dimText}`}>✕</button>
            </div>
          ):(
            <button onClick={()=>{setCompanyDraft(hostCompany);setEditingCompany(true);}} className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#5B8CFF]/25 bg-[#5B8CFF]/10 hover:bg-[#5B8CFF]/20 transition-all group">
              <span className="text-[10px]">🏢</span>
              <span className={`text-[12px] font-black ${hostCompany?(D?'text-zinc-200':'text-zinc-700'):dimText}`}>{hostCompany||'회사/팀 이름 추가'}</span>
              <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">✏️</span>
            </button>
          )}
        </div>

        {announcements.length>0&&<div className="relative z-10 mb-5 flex flex-col gap-2">{announcements.map(ann=><div key={ann.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#5B8CFF]/10 border border-[#5B8CFF]/20"><span className="text-[#5B8CFF] text-[11px] font-black mt-0.5 shrink-0">📢</span><div>{ann.title&&<p className={`font-bold text-[13px] mb-0.5 ${D?'text-white':'text-[#111]'}`}>{ann.title}</p>}<p className={`text-[12px] leading-relaxed whitespace-pre-line ${D?"text-zinc-300":"text-zinc-700"}`}>{ann.content}</p></div></div>)}</div>}

        <div className={`relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 border-b ${dividerCls} pb-4`}>
          <div className="flex items-center gap-2"><span className={`${dimText} text-[13px] font-bold`}>{leads.filter(l=>!isExpired(l.deadline2||l.deadline)).length} 활성</span><span className={D?'text-zinc-700':'text-zinc-400'}>·</span><span className={`${D?'text-zinc-700':'text-zinc-400'} text-[13px]`}>{leads.filter(l=>isExpired(l.deadline2||l.deadline)).length} 마감</span></div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[15px] transition-all ${D?'bg-white/5 border-white/10 hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] hover:bg-black/[0.08]'}`}>{D?'☀️':'🌙'}</button>
            <div className={`flex border rounded-xl p-1 gap-1 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}>
              <button onClick={()=>openLeadForm()} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#5B8CFF] text-white hover:bg-[#4070ee] transition-all">+ 리드 추가</button>
              <button onClick={()=>setView('calendar')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='calendar'?'bg-[#5B8CFF] text-white':dimText}`}>📅 달력</button>
              <button onClick={()=>setView('list')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='list'?'bg-[#5B8CFF] text-white':dimText}`}>📋 목록</button>
              <button onClick={()=>{setView('pitches');fetchHostPitches();}} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='pitches'?'bg-[#5B8CFF] text-white':dimText}`}>📨 수신 피칭{hostPitches.length>0&&<span className="ml-1 opacity-70">{hostPitches.length}</span>}</button>
              <button onClick={()=>{setView('files');fetchHostPitches();}} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='files'?'bg-[#5B8CFF] text-white':dimText}`}>🎵 파일 관리{hostPitchFiles.length>0&&<span className="ml-1 opacity-70">{hostPitchFiles.length}</span>}</button>
              <button onClick={()=>{setView('stats');fetchHostPitches();}} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view==='stats'?'bg-[#5B8CFF] text-white':dimText}`}>📊 통계</button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
              <span className="text-amber-400 text-[11px] font-bold">HOST</span>
            </div>
            <button onClick={()=>{setShowMembers(true);fetchMembers();}} className={`px-3 py-1.5 rounded-full border text-[10px] font-black transition-all ${D?'border-white/10 bg-white/5 text-zinc-500 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>👥 멤버</button>
            <button onClick={()=>{if(navigator.clipboard)navigator.clipboard.writeText(window.location.origin+'/view/'+hostId);}} className={`px-3 py-1.5 rounded-full border text-[10px] font-black transition-all ${D?'border-white/10 bg-white/5 text-zinc-500 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>🔗 공유</button>
            <a href="/mypage" className={`px-3 py-1.5 rounded-full border text-[10px] font-black transition-all ${D?'border-white/10 bg-white/5 text-zinc-500 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>MY</a>
          </div>
        </div>

        {(()=>{
          const dayDiff=(d:string)=>Math.ceil((new Date(d).getTime()-new Date(new Date().toDateString()).getTime())/86400000);
          const urgent=leads.map((l:any)=>{const cs=[l.deadline,l.deadline2].filter((d:any)=>d&&!isExpired(d));if(!cs.length)return null;const up=cs.sort((a:any,b:any)=>new Date(a).getTime()-new Date(b).getTime())[0];const days=dayDiff(up);return days>=0&&days<=3?{lead:l,days}:null;}).filter(Boolean).sort((a:any,b:any)=>a.days-b.days) as {lead:any;days:number}[];
          if(urgent.length===0)return null;
          return(
            <div className="relative z-10 mb-6">
              <div className="flex items-center gap-2 mb-2.5"><span className="text-[15px]">⏰</span><span className={`text-[14px] font-black ${D?'text-white':'text-[#111]'}`}>마감 임박</span><span className="text-[12px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">{urgent.length}</span></div>
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1">
                {urgent.map(({lead,days})=>{
                  const red=days<=1;
                  return(
                    <button key={lead.id} onClick={()=>{setViewingLead(lead);setContentLang('ko');}} className={`shrink-0 flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl border text-left transition-all hover:scale-[1.02] ${red?'border-red-500/40 bg-red-500/10':'border-amber-500/35 bg-amber-500/10'}`}>
                      <div className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-xl ${red?'bg-red-500/20':'bg-amber-500/20'}`}>
                        <span className={`text-[16px] font-black leading-none ${red?'text-red-400':'text-amber-400'}`}>{days===0?'D-DAY':`D-${days}`}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`font-black text-[14px] leading-tight truncate ${D?'text-white':'text-[#111]'}`}>{lead.artist}</p>
                        {lead.title&&<p className={`text-[12px] truncate ${dimText}`}>{lead.title}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {view==='calendar'&&(
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex border rounded-xl p-1 gap-1 ${D?'bg-white/5 border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}><button onClick={()=>setCalView('month')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${calView==='month'?'bg-white/10 text-white':dimText}`}>월</button><button onClick={()=>setCalView('week')} className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${calView==='week'?'bg-white/10 text-white':dimText}`}>주</button></div>
              {calView==='month'&&<div className="flex items-center gap-3"><button onClick={()=>setCurrentMonth(new Date(year,month-1))} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[14px] ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>‹</button><span className={`font-black text-[16px] ${D?'text-white':'text-[#111]'}`}>{year}년 {month+1}월</span><button onClick={()=>setCurrentMonth(new Date(year,month+1))} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[14px] ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>›</button></div>}
              {calView==='week'&&<div className="flex items-center gap-3"><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d);}} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[14px] ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>‹</button><span className={`font-black text-[14px] ${D?'text-white':'text-[#111]'}`}>{weekDays[0].getMonth()+1}/{weekDays[0].getDate()} – {weekDays[6].getMonth()+1}/{weekDays[6].getDate()}</span><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d);}} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[14px] ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>›</button></div>}
              <button onClick={()=>{setCurrentMonth(new Date());setWeekStart(startOfWeek(new Date()));}} className={`text-[11px] font-bold transition-colors ${D?'text-zinc-600 hover:text-white':'text-zinc-400 hover:text-[#111]'}`}>오늘</button>
            </div>
            <div className="grid grid-cols-7 mb-2">{DAYS.map((d,i)=><div key={d} className={`text-center text-[11px] font-black py-2 ${i===0?'text-red-400':i===6?'text-blue-400':D?'text-zinc-600':'text-zinc-400'}`}>{d}</div>)}</div>
            {calView==='month'&&<div className="grid grid-cols-7 gap-1">{Array.from({length:firstDay}).map((_,i)=><div key={`e-${i}`}/>)}{Array.from({length:daysInMonth}).map((_,i)=>{const day=i+1,ds=toDateStr(year,month+1,day),isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day,isPast=new Date(year,month,day)<new Date(new Date().toDateString());return<div key={day} className={`min-h-[80px] rounded-xl p-1.5 border ${isToday?'border-[#5B8CFF]/50 bg-[#5B8CFF]/10':D?'border-white/5 bg-white/[0.02]':'border-black/[0.06] bg-white/60'} ${isPast&&!isToday?'opacity-50':''}`}><div className={`text-[11px] font-black mb-1 ${isToday?'text-[#5B8CFF]':isPast?D?'text-zinc-700':'text-zinc-400':D?'text-zinc-400':'text-zinc-500'}`} onClick={()=>openLeadForm(undefined,ds)} style={{cursor:'pointer'}}>{day} +</div><div className="flex flex-col gap-0.5">{getLeadsForDate(ds).map(l=><LeadCard key={l.id} lead={l} compact/>)}</div></div>;})}</div>}
            {calView==='week'&&<div className="grid grid-cols-7 gap-1">{weekDays.map((d,i)=>{const ds=toDateStr(d.getFullYear(),d.getMonth()+1,d.getDate()),isToday=d.toDateString()===today.toDateString(),isPast=d<new Date(new Date().toDateString()),dl=getLeadsForDate(ds);return<div key={ds} className={`min-h-[200px] rounded-xl p-2 border ${isToday?'border-[#5B8CFF]/50 bg-[#5B8CFF]/10':D?'border-white/5 bg-white/[0.02]':'border-black/[0.06] bg-white/60'} ${isPast&&!isToday?'opacity-50':''}`}><div className={`text-[11px] font-black mb-2 ${isToday?'text-[#5B8CFF]':isPast?D?'text-zinc-700':'text-zinc-400':i===0?'text-red-400':i===6?'text-blue-400':D?'text-zinc-400':'text-zinc-500'}`}>{DAYS[i]} {d.getDate()}</div><div className="flex flex-col gap-1">{dl.map(l=><LeadCard key={l.id} lead={l} compact/>)}{dl.length===0&&<div className={`text-[10px] text-center mt-4 ${D?'text-zinc-800':'text-zinc-300'}`}>—</div>}</div></div>;})}</div>}
          </div>
        )}

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

        {view==='pitches'&&(
          <div className="relative z-10">
            <div className={`flex flex-col gap-3 mb-5 p-4 rounded-xl border ${D?'bg-white/[0.02] border-white/5':'bg-black/[0.02] border-black/[0.06]'}`}>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>정렬</span>{([['recent','최신순'],['bpm','BPM'],['vocal','보컬'],['key','Key']] as const).map(([v,l])=><FilterPill key={v} label={l} active={pitchSort===v} onClick={()=>setPitchSort(v)} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>보컬</span>{([['all','전체'],['male','남성'],['female','여성'],['both','혼성']] as const).map(([v,l])=><FilterPill key={v} label={l} active={pitchVocalFilter===v} onClick={()=>setPitchVocalFilter(v)} isDark={D}/>)}</div>
            </div>
            {hostPitchLoading?(
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin"/></div>
            ):(()=>{
              const minBpm=(p:any)=>{const fs=hostPitchFiles.filter(f=>f.pitch_id===p.id&&f.bpm>0);return fs.length?Math.min(...fs.map(f=>f.bpm)):99999;};
              const firstVocal=(p:any)=>{const f=hostPitchFiles.find(x=>x.pitch_id===p.id&&x.vocal_gender);return f?.vocal_gender||'zzz';};
              const firstKey=(p:any)=>{const f=hostPitchFiles.find(x=>x.pitch_id===p.id&&x.key);return f?.key||'zzz';};
              let pv=hostPitches;
              if(pitchVocalFilter!=='all')pv=pv.filter(p=>hostPitchFiles.some(f=>f.pitch_id===p.id&&f.vocal_gender===pitchVocalFilter));
              pv=[...pv].sort((a,b)=>{if(pitchSort==='bpm')return minBpm(a)-minBpm(b);if(pitchSort==='vocal')return firstVocal(a).localeCompare(firstVocal(b));if(pitchSort==='key')return firstKey(a).localeCompare(firstKey(b));return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();});
              // 리드별 그룹화 (pv 순서 유지)
              const order:string[]=[];const byLead:Record<string,any[]>={};
              pv.forEach(p=>{const k=p.lead_id||'none';if(!byLead[k]){byLead[k]=[];order.push(k);}byLead[k].push(p);});
              return pv.length===0?(
                <div className="text-center py-20"><p className={`text-[15px] ${D?'text-zinc-600':'text-zinc-400'}`}>{hostPitches.length===0?'아직 받은 피칭이 없어요':'조건에 맞는 피칭이 없어요'}</p></div>
              ):(
                <div className="flex flex-col gap-3">
                  {order.map(lid=>{
                    const lead=leads.find(l=>l.id===lid);
                    const groupPitches=byLead[lid];
                    const fileCount=groupPitches.reduce((n,p)=>n+hostPitchFiles.filter(f=>f.pitch_id===p.id).length,0);
                    const open=expandedPitchLeads[lid]??false;
                    return(
                      <div key={lid} className={`rounded-2xl border overflow-hidden ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                        <button onClick={()=>setExpandedPitchLeads(prev=>({...prev,[lid]:!open}))} className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all ${D?'hover:bg-white/[0.03]':'hover:bg-black/[0.03]'}`}>
                          <span className={`text-[16px] transition-transform shrink-0 ${open?'rotate-90':''} ${dimText}`}>›</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-black text-[17px] leading-tight truncate ${D?'text-white':'text-[#111]'}`}>{lead?lead.artist:'삭제된 리드'}</p>
                            {lead?.title&&<p className={`text-[13px] mt-0.5 truncate ${dimText}`}>{lead.title}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[13px] font-black px-3 py-1 rounded-full bg-[#5B8CFF]/15 text-[#5B8CFF]">피칭 {groupPitches.length}</span>
                            {fileCount>0&&<span className={`text-[13px] font-black px-3 py-1 rounded-full ${D?'bg-white/10 text-zinc-300':'bg-black/[0.06] text-zinc-600'}`}>🎵 {fileCount}</span>}
                          </div>
                        </button>
                        {open&&(
                          <div className={`px-4 pb-4 pt-1 border-t ${D?'border-white/[0.06]':'border-black/[0.06]'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
                              {groupPitches.map(p=>{
                                const files=hostPitchFiles.filter(f=>f.pitch_id===p.id);
                                return(
                                  <div key={p.id} className={`p-4 rounded-xl border ${D?'bg-black/20 border-white/[0.06]':'bg-white border-black/[0.06]'}`}>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <p className={`font-black text-[15px] leading-tight ${D?'text-white':'text-[#111]'}`}>{p.artist_name}</p>
                                      {files.length>0&&<span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${D?'bg-white/10 text-zinc-400':'bg-black/[0.06] text-zinc-500'}`}>🎵 {files.length}</span>}
                                    </div>
                                    <p className={`text-[12px] mb-2 ${dimText}`}>{p.contact}{p.contact&&' · '}{new Date(p.created_at).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})}</p>
                                    {p.message&&<p className={`text-[13px] leading-relaxed whitespace-pre-line mb-2 ${D?'text-zinc-300':'text-zinc-600'}`}>{p.message}</p>}
                                    {files.length>0&&<div className="flex flex-col gap-2">{files.map((f:any)=><PitchFileRow key={f.id} f={f} D={D} dimText={dimText}/>)}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {view==='files'&&(
          <div className="relative z-10">
            <div className={`flex flex-col gap-3 mb-5 p-4 rounded-xl border ${D?'bg-white/[0.02] border-white/5':'bg-black/[0.02] border-black/[0.06]'}`}>
              <input value={fileSearch} onChange={e=>setFileSearch(e.target.value)} placeholder="파일명 · 아티스트 · 장르 검색" className={`w-full border rounded-xl px-4 py-3 text-[15px] outline-none transition-all ${inputCls}`}/>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>정렬</span>{([['recent','최신순'],['bpm','BPM'],['vocal','보컬'],['key','Key']] as const).map(([v,l])=><FilterPill key={v} label={l} active={fileSort===v} onClick={()=>setFileSort(v)} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>보컬</span>{([['all','전체'],['male','남성'],['female','여성'],['both','혼성']] as const).map(([v,l])=><FilterPill key={v} label={l} active={fileVocalFilter===v} onClick={()=>setFileVocalFilter(v)} isDark={D}/>)}</div>
            </div>
            {hostPitchLoading?(
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin"/></div>
            ):(()=>{
              const pById:Record<string,any>={};hostPitches.forEach(p=>pById[p.id]=p);
              let fv=hostPitchFiles.map(f=>{const p=pById[f.pitch_id];const lead=p?leads.find(l=>l.id===p.lead_id):null;return{...f,_artist:p?.artist_name||'',_lead:lead?.artist||'',_created:p?.created_at||f.created_at};});
              if(fileVocalFilter!=='all')fv=fv.filter(f=>f.vocal_gender===fileVocalFilter);
              const q=fileSearch.trim().toLowerCase();
              if(q)fv=fv.filter(f=>[f.file_name,f._artist,f._lead,f.genre,f.key].some((x:any)=>(x||'').toLowerCase().includes(q)));
              fv=[...fv].sort((a,b)=>{if(fileSort==='bpm')return(a.bpm||99999)-(b.bpm||99999);if(fileSort==='vocal')return(a.vocal_gender||'zzz').localeCompare(b.vocal_gender||'zzz');if(fileSort==='key')return(a.key||'zzz').localeCompare(b.key||'zzz');return new Date(b._created).getTime()-new Date(a._created).getTime();});
              return fv.length===0?(
                <div className="text-center py-20"><p className={`text-[15px] ${D?'text-zinc-600':'text-zinc-400'}`}>{hostPitchFiles.length===0?'아직 받은 파일이 없어요':'조건에 맞는 파일이 없어요'}</p></div>
              ):(
                <div className="flex flex-col gap-2.5">
                  {fv.map((f:any)=>{
                    const vLabel=f.vocal_gender==='male'?'남성':f.vocal_gender==='female'?'여성':f.vocal_gender==='both'?'혼성':'';
                    return(
                    <div key={f.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border ${D?'bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04]':'bg-black/[0.02] border-black/[0.08] hover:bg-black/[0.03]'} transition-all`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className="text-[15px] shrink-0">🎵</span>
                          <span className={`font-black text-[16px] leading-tight truncate ${D?'text-white':'text-[#111]'}`}>{f.file_name||'audio.mp3'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {vLabel&&<span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-[#5B8CFF]/15 text-[#5B8CFF]">{vLabel}</span>}
                          {f.bpm>0&&<span className={`text-[12px] font-black px-2 py-0.5 rounded-md ${D?'bg-white/10 text-zinc-300':'bg-black/[0.06] text-zinc-600'}`}>{f.bpm} BPM</span>}
                          {f.key&&<span className={`text-[12px] font-black px-2 py-0.5 rounded-md ${D?'bg-white/10 text-zinc-300':'bg-black/[0.06] text-zinc-600'}`}>KEY {f.key}</span>}
                          {f.genre&&<span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">{f.genre}</span>}
                          {(f._artist||f._lead)&&<span className={`text-[12px] ${dimText}`}>{f._artist}{f._artist&&f._lead&&' → '}{f._lead}</span>}
                        </div>
                      </div>
                      {f.file_url&&<audio controls preload="none" src={f.file_url} className="w-full sm:w-72 shrink-0" style={{height:'40px'}}/>}
                    </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {view==='stats'&&(
          <div className="relative z-10">
            {hostPitchLoading?(
              <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin"/></div>
            ):(()=>{
              const activeLeads=leads.filter(l=>!isExpired(l.deadline2||l.deadline)).length;
              const pitchByLead:Record<string,number>={};hostPitches.forEach(p=>{pitchByLead[p.lead_id]=(pitchByLead[p.lead_id]||0)+1;});
              const leadRank=Object.entries(pitchByLead).map(([lid,n])=>({lead:leads.find(l=>l.id===lid),n})).filter(x=>x.lead).sort((a,b)=>b.n-a.n).slice(0,8);
              const maxLead=leadRank.length?leadRank[0].n:1;
              const pitchByMember:Record<string,number>={};hostPitches.forEach(p=>{const k=p.artist_name||'익명';pitchByMember[k]=(pitchByMember[k]||0)+1;});
              const memberRank=Object.entries(pitchByMember).map(([name,n])=>({name,n})).sort((a,b)=>b.n-a.n).slice(0,8);
              const maxMember=memberRank.length?memberRank[0].n:1;
              const genreCount:Record<string,number>={};hostPitchFiles.forEach(f=>{if(f.genre)genreCount[f.genre]=(genreCount[f.genre]||0)+1;});
              const genreRank=Object.entries(genreCount).map(([g,n])=>({g,n})).sort((a,b)=>b.n-a.n).slice(0,8);
              const totalGenre=genreRank.reduce((s,x)=>s+x.n,0)||1;
              const vocalCount={male:0,female:0,both:0,none:0};hostPitchFiles.forEach(f=>{const v=f.vocal_gender;if(v==='male')vocalCount.male++;else if(v==='female')vocalCount.female++;else if(v==='both')vocalCount.both++;else vocalCount.none++;});
              const totalVocal=hostPitchFiles.length||1;
              const stat=(label:string,val:number,color:string)=>(
                <div className={`flex-1 min-w-[140px] p-5 rounded-2xl border ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                  <p className={`text-[12px] font-bold mb-1 ${dimText}`}>{label}</p>
                  <p className={`text-[32px] font-black leading-none ${color}`}>{val}</p>
                </div>
              );
              const bar=(label:string,n:number,max:number,sub:string,color:string)=>(
                <div key={label} className="flex items-center gap-3">
                  <span className={`text-[13px] font-bold w-28 shrink-0 truncate ${D?'text-zinc-300':'text-zinc-700'}`}>{label}</span>
                  <div className={`flex-1 h-7 rounded-lg overflow-hidden ${D?'bg-white/[0.04]':'bg-black/[0.04]'}`}>
                    <div className={`h-full rounded-lg ${color} flex items-center justify-end px-2`} style={{width:`${Math.max(8,(n/max)*100)}%`}}><span className="text-[12px] font-black text-white">{sub}</span></div>
                  </div>
                </div>
              );
              return(
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap gap-3">
                    {stat('총 리드',leads.length,D?'text-white':'text-[#111]')}
                    {stat('활성 리드',activeLeads,'text-emerald-400')}
                    {stat('받은 피칭',hostPitches.length,'text-[#5B8CFF]')}
                    {stat('받은 파일',hostPitchFiles.length,'text-amber-400')}
                  </div>

                  <div className={`p-5 rounded-2xl border ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                    <p className={`text-[15px] font-black mb-4 ${D?'text-white':'text-[#111]'}`}>📨 리드별 피칭 수</p>
                    {leadRank.length===0?<p className={`text-[13px] ${dimText}`}>아직 데이터가 없어요</p>:<div className="flex flex-col gap-2.5">{leadRank.map(x=>bar(x.lead.artist,x.n,maxLead,`${x.n}`,'bg-[#5B8CFF]'))}</div>}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`p-5 rounded-2xl border ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                      <p className={`text-[15px] font-black mb-4 ${D?'text-white':'text-[#111]'}`}>👤 멤버별 피칭 수</p>
                      {memberRank.length===0?<p className={`text-[13px] ${dimText}`}>아직 데이터가 없어요</p>:<div className="flex flex-col gap-2.5">{memberRank.map(x=>bar(x.name,x.n,maxMember,`${x.n}`,'bg-emerald-500'))}</div>}
                    </div>
                    <div className={`p-5 rounded-2xl border ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                      <p className={`text-[15px] font-black mb-4 ${D?'text-white':'text-[#111]'}`}>🎼 장르 분포</p>
                      {genreRank.length===0?<p className={`text-[13px] ${dimText}`}>아직 데이터가 없어요</p>:<div className="flex flex-col gap-2.5">{genreRank.map(x=>bar(x.g,x.n,genreRank[0].n,`${Math.round((x.n/totalGenre)*100)}%`,'bg-amber-500'))}</div>}
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                    <p className={`text-[15px] font-black mb-4 ${D?'text-white':'text-[#111]'}`}>🎤 보컬 분포</p>
                    <div className="flex gap-3 flex-wrap">
                      {([['남성',vocalCount.male,'text-blue-400'],['여성',vocalCount.female,'text-pink-400'],['혼성',vocalCount.both,'text-purple-400'],['미지정',vocalCount.none,dimText]] as const).map(([l,n,c])=>(
                        <div key={l} className={`flex-1 min-w-[100px] text-center p-4 rounded-xl ${D?'bg-white/[0.03]':'bg-black/[0.03]'}`}>
                          <p className={`text-[26px] font-black ${c}`}>{n as number}</p>
                          <p className={`text-[12px] font-bold mt-0.5 ${dimText}`}>{l} · {Math.round(((n as number)/totalVocal)*100)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className={`relative z-10 mt-8 pb-8 text-center`}><p className={`text-[11px] ${D?'text-zinc-600':'text-zinc-400'}`}>Contact : everplayground@gmail.com</p></div>
      </main>

      {viewingLead&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>setViewingLead(null)}>
          <div className={`w-full max-w-lg border rounded-[2rem] shadow-2xl ${getCardColor(viewingLead.gender,viewingLead.group_type).bg} ${getCardColor(viewingLead.gender,viewingLead.group_type).border}`} onClick={e=>e.stopPropagation()}>
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-black ${getCardColor(viewingLead.gender,viewingLead.group_type).text}`}>{getCardColor(viewingLead.gender,viewingLead.group_type).label}</span><AlbumBadge type={viewingLead.album_type||'single'}/></div><h2 className="text-white font-black text-[22px] leading-tight">{viewingLead.artist}</h2><p className="text-zinc-400 text-[14px] mt-0.5">{viewingLead.title}</p></div>
                <div className="ml-3 shrink-0"><DeadlineDisplay lead={viewingLead} size="large"/></div>
              </div>
              {viewingLead.content&&(
                <div className="mb-5">
                  <div className="flex gap-1 mb-3">
                    <button onClick={()=>setContentLang('ko')} className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all border ${contentLang==='ko'?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':'border-white/10 text-zinc-500 hover:text-white'}`}>KO</button>
                    <button onClick={()=>switchToEn(viewingLead)} disabled={translating} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black transition-all border disabled:opacity-50 ${contentLang==='en'?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':'border-white/10 text-zinc-500 hover:text-white'}`}>
                      {translating?<><div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin"/>번역 중</>:'EN'}
                    </button>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    {contentLang==='en'&&getEnContent(viewingLead)
                      ?renderSections(getEnContent(viewingLead)!)
                      :renderContent(viewingLead.content||'')}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={()=>{openLeadForm(viewingLead);setViewingLead(null);}} className="flex-1 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-[13px] hover:bg-amber-500/20 transition-all">✏️ 수정</button>
                <button onClick={()=>{if(confirm('이 리드를 삭제할까요?')){deleteLead(viewingLead.id);setViewingLead(null);}}} className="py-3 px-4 rounded-xl border border-red-500/20 text-red-400 text-[13px] hover:bg-red-500/10 transition-all">🗑</button>
                <button onClick={()=>setViewingLead(null)} className="py-3 px-5 rounded-xl border border-white/10 text-zinc-500 font-bold text-[13px] hover:text-white transition-all">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pitchingLead&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4 overflow-y-auto" onClick={()=>{if(!pitchLoading){setPitchingLead(null);setPitchSent(false);}}}>
          <div className={`w-full max-w-lg border rounded-[2rem] shadow-2xl my-4 ${D?'bg-[#111] border-white/10':'bg-white border-black/[0.08]'}`} onClick={e=>e.stopPropagation()}>
            <div className="p-6">
              {pitchSent?(
                <div className="text-center py-10">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className={`font-black text-[22px] mb-2 ${D?'text-white':'text-[#111]'}`}>피칭 완료!</h2>
                  <p className={`text-[13px] ${dimText}`}><span className={`font-bold ${D?'text-white':'text-[#111]'}`}>{pitchingLead.artist}</span> — {pitchingLead.title}</p>
                  <p className={`text-[12px] mt-1 ${dimText}`}>{pitchForm.artist_name}{pitchFiles.length>0&&` · 파일 ${pitchFiles.length}개`}</p>
                  <p className={`text-[12px] mt-3 ${D?'text-zinc-600':'text-zinc-400'}`}>담당자가 확인 후 연락드릴게요.</p>
                  <button onClick={()=>{setPitchingLead(null);setPitchSent(false);}} className={`mt-6 w-full py-3 rounded-xl border font-bold text-[13px] transition-all ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>닫기</button>
                </div>
              ):(
                <>
                  <div className="mb-5"><h2 className={`font-black text-[20px] ${D?'text-white':'text-[#111]'}`}>🎵 피칭하기</h2><p className={`text-[12px] mt-0.5 ${dimText}`}>{pitchingLead.artist} — {pitchingLead.title}</p></div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>아티스트명 *</label><input value={pitchForm.artist_name} onChange={e=>setPitchForm(p=>({...p,artist_name:e.target.value}))} placeholder="아티스트명" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`}/></div>
                      <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>연락처 *</label><input value={pitchForm.contact} onChange={e=>setPitchForm(p=>({...p,contact:e.target.value}))} placeholder="이메일/전화/카카오" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`}/></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2"><label className={`text-[10px] font-black uppercase tracking-widest ${D?'text-zinc-500':'text-zinc-400'}`}>데모 파일 <span className={`font-normal normal-case ${D?'text-zinc-700':'text-zinc-400'}`}>MP3 · 최대 50MB</span></label>{pitchFiles.length>0&&<span className={`text-[11px] ${D?'text-zinc-600':'text-zinc-400'}`}>{pitchFiles.length}개</span>}</div>
                      {pitchFiles.length>0&&<div className="flex flex-col gap-2 mb-3">{pitchFiles.map(item=><FileItem key={item.id} item={item}/>)}</div>}
                      <input ref={fileInputRef} type="file" accept=".mp3,audio/mpeg" multiple className="hidden" onChange={handleFileInput}/>
                      <div onDragOver={e=>e.preventDefault()} onDrop={handleFileDrop} onClick={()=>fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${D?'border-white/10 hover:border-white/20 hover:bg-white/[0.02]':'border-black/[0.08] hover:border-black/20 hover:bg-black/[0.02]'}`}>
                        <p className={`text-[12px] font-bold ${D?'text-zinc-600':'text-zinc-400'}`}>+ 파일 추가</p>
                        <p className={`text-[11px] mt-0.5 ${D?'text-zinc-800':'text-zinc-300'}`}>클릭 또는 드래그 · 여러 개 동시 선택 가능</p>
                      </div>
                    </div>
                    <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>메시지 <span className={`font-normal normal-case ${D?'text-zinc-700':'text-zinc-400'}`}>(선택)</span></label><textarea value={pitchForm.message} onChange={e=>setPitchForm(p=>({...p,message:e.target.value}))} placeholder="한마디, 포트폴리오 링크 등" rows={2} className={`w-full border rounded-xl px-4 py-3 text-[13px] outline-none transition-all resize-none leading-relaxed ${inputCls}`}/></div>
                  </div>
                  {pitchLoading&&<div className="mt-4"><div className="flex items-center justify-between mb-1.5"><span className={`text-[11px] ${dimText}`}>업로드 중...</span><span className={`text-[11px] font-bold ${D?'text-zinc-400':'text-zinc-500'}`}>{uploadProgress}%</span></div><div className={`w-full h-1.5 rounded-full overflow-hidden ${D?'bg-white/10':'bg-black/[0.08]'}`}><div className="h-full bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] rounded-full transition-all" style={{width:`${uploadProgress}%`}}/></div></div>}
                  {uploadError&&<p className="mt-3 text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{uploadError}</p>}
                  <div className="flex gap-3 mt-5">
                    <button onClick={()=>{setPitchingLead(null);setPitchSent(false);}} disabled={pitchLoading} className={`flex-1 py-3 rounded-xl border font-bold text-[13px] transition-all disabled:opacity-40 ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>취소</button>
                    <button onClick={submitPitch} disabled={pitchLoading||!pitchForm.artist_name.trim()||!pitchForm.contact.trim()||pitchFiles.some(f=>f.analyzing)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-40 disabled:hover:scale-100">
                      {pitchLoading?'전송 중...':pitchFiles.length>0?`${pitchFiles.length}개 파일과 함께 제출`:'피칭 제출'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 내 피칭 모달 */}
      {showMyPitches&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>setShowMyPitches(false)}>
          <div className={`w-full max-w-lg border rounded-2xl shadow-2xl ${D?'bg-[#111] border-white/10':'bg-white border-black/[0.08]'}`} onClick={e=>e.stopPropagation()}>
            <div className="max-h-[85vh] flex flex-col">
              <div className={`flex items-center justify-between p-5 border-b ${D?'border-white/10':'border-black/[0.08]'}`}>
                <div>
                  <h2 className={`font-black text-[18px] ${D?'text-white':'text-[#111]'}`}>📨 내 피칭 목록</h2>
                  <p className={`text-[12px] mt-0.5 ${dimText}`}>총 {myPitches.length}건</p>
                </div>
                <button onClick={()=>setShowMyPitches(false)} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[13px] ${D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                {myPitchLoading?(
                  <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin"/></div>
                ):myPitches.length===0?(
                  <div className="text-center py-12"><p className={`text-[13px] ${dimText}`}>아직 피칭한 곡이 없어요</p></div>
                ):(
                  <div className="flex flex-col gap-3">
                    {myPitches.map(p=>{
                      const lead=myLeadMap[p.lead_id];
                      const files=myPitchFiles.filter(f=>f.pitch_id===p.id);
                      return(
                        <div key={p.id} className={`p-4 rounded-xl border ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-[13px] ${D?'text-white':'text-[#111]'}`}>{lead?.artist||'—'}<span className={`font-normal ml-1 ${dimText}`}>{lead?.title}</span></p>
                              <p className={`text-[11px] mt-0.5 ${dimText}`}>{new Date(p.created_at).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})}</p>
                            </div>
                            {files.length>0&&<span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ml-2 ${D?'bg-white/10 text-zinc-400':'bg-black/[0.06] text-zinc-500'}`}>🎵 {files.length}</span>}
                          </div>
                          {p.message&&<p className={`text-[12px] leading-relaxed whitespace-pre-line mt-1 ${D?'text-zinc-400':'text-zinc-600'}`}>{p.message}</p>}
                          {files.length>0&&(
                            <div className="flex flex-col gap-2 mt-2">
                              {files.map(f=>{
                                const vLabel=f.vocal_gender==='male'?'남성':f.vocal_gender==='female'?'여성':f.vocal_gender==='both'?'혼성':'';
                                return(
                                <div key={f.id} className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg ${D?'bg-black/20':'bg-black/[0.04]'}`}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[12px]">🎵</span>
                                    <span className={`flex-1 min-w-0 text-[11px] truncate ${D?'text-zinc-300':'text-zinc-700'}`}>{f.file_name||'audio.mp3'}</span>
                                    {vLabel&&<span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#5B8CFF]/15 text-[#5B8CFF]">{vLabel}</span>}
                                    {f.bpm>0&&<span className={`text-[10px] font-black ${dimText}`}>{f.bpm}BPM</span>}
                                    {f.key&&<span className={`text-[10px] font-black ${dimText}`}>{f.key}</span>}
                                    {f.genre&&<span className="text-[10px] font-black text-emerald-400">{f.genre}</span>}
                                  </div>
                                  {f.file_url&&<audio controls preload="none" src={f.file_url} className="w-full" style={{height:'32px'}}/>}
                                </div>
                                );
                              })}
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

      {showMembers&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm font-pretendard p-4" onClick={()=>setShowMembers(false)}>
          <div className={`w-full max-w-lg border rounded-2xl shadow-2xl ${D?'bg-[#111] border-white/10':'bg-white border-black/[0.08]'}`} onClick={e=>e.stopPropagation()}>
            <div className="max-h-[85vh] flex flex-col">
              <div className={`flex items-center justify-between p-5 border-b ${D?'border-white/10':'border-black/[0.08]'}`}>
                <div>
                  <h2 className={`font-black text-[18px] ${D?'text-white':'text-[#111]'}`}>👥 멤버 관리</h2>
                  <p className={`text-[12px] mt-0.5 ${dimText}`}>승인된 멤버 {memberList.filter(m=>m.status==='approved'||m.status==='admin').length}명 · 대기 {memberList.filter(m=>m.status==='pending').length}명</p>
                </div>
                <button onClick={()=>setShowMembers(false)} className={`w-8 h-8 rounded-full border flex items-center justify-center text-[13px] ${D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-5">
                {memberLoading?(
                  <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#5B8CFF] border-t-transparent rounded-full animate-spin"/></div>
                ):memberList.length===0?(
                  <div className="text-center py-12"><p className={`text-[13px] ${dimText}`}>아직 멤버가 없어요</p></div>
                ):(
                  <div className="flex flex-col gap-2">
                    {['pending','approved','admin','rejected'].map(statusGroup=>{
                      const group=memberList.filter(m=>m.status===statusGroup);
                      if(group.length===0)return null;
                      const groupLabel={pending:'⏳ 승인 대기',approved:'✅ 승인됨',admin:'⭐ 관리자',rejected:'🚫 거절됨'}[statusGroup];
                      return(
                        <div key={statusGroup} className="mb-2">
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${D?'text-zinc-600':'text-zinc-400'}`}>{groupLabel}</p>
                          <div className="flex flex-col gap-2">
                            {group.map(m=>(
                              <div key={m.member_id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${D?'bg-white/[0.02] border-white/[0.07]':'bg-black/[0.02] border-black/[0.08]'}`}>
                                <button className="flex-1 min-w-0 text-left" onClick={()=>m.member_id&&window.open(`/card/${m.member_id}`,'_blank')}>
                                  <p className={`font-bold text-[13px] truncate ${D?'text-white hover:text-[#5B8CFF]':'text-[#111] hover:text-[#5B8CFF]'} transition-colors`}>{m.profile?.artist_name||'(이름 없음)'} <span className={`text-[10px] font-normal ${dimText}`}>↗</span></p>
                                  <p className={`text-[11px] truncate ${dimText}`}>{m.profile?.email||m.member_id}</p>
                                </button>
                                <div className="flex gap-1.5 shrink-0" onClick={e=>e.stopPropagation()}>
                                  {statusGroup==='pending'&&<>
                                    <button onClick={()=>setMemberRole(m.member_id,'approved')} className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-black hover:bg-green-500/20 transition-all">승인</button>
                                    <button onClick={()=>setMemberRole(m.member_id,'rejected')} className="px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400 text-[10px] font-black hover:bg-red-500/10 transition-all">거절</button>
                                  </>}
                                  {statusGroup==='approved'&&<>
                                    <button onClick={()=>setMemberRole(m.member_id,'admin')} className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black hover:bg-amber-500/20 transition-all">관리자 지정</button>
                                    <button onClick={()=>setMemberRole(m.member_id,'rejected')} className="px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400 text-[10px] font-black hover:bg-red-500/10 transition-all">해제</button>
                                  </>}
                                  {statusGroup==='admin'&&<>
                                    <button onClick={()=>setMemberRole(m.member_id,'approved')} className="px-2.5 py-1 rounded-lg border border-white/10 text-zinc-500 text-[10px] font-black hover:text-white transition-all">관리자 해제</button>
                                  </>}
                                  {statusGroup==='rejected'&&<>
                                    <button onClick={()=>setMemberRole(m.member_id,'approved')} className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-black hover:bg-green-500/20 transition-all">재승인</button>
                                  </>}
                                </div>
                              </div>
                            ))}
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

      {showLeadForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto font-pretendard">
          <div className={`w-full max-w-lg border rounded-2xl shadow-2xl my-4 ${D?'bg-[#0E0E0E] border-white/[0.07]':'bg-white border-black/[0.08]'}`} onClick={e=>e.stopPropagation()}>
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className={`font-black text-[18px] ${D?'text-white':'text-[#111]'}`}>{editingLead?'리드 수정':'리드 추가'}</h2>
                <button onClick={()=>setShowLeadForm(false)} className={dimText}>✕</button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>아티스트명 *</label><input value={lArtist} onChange={e=>setLArtist(e.target.value)} placeholder="아티스트명" className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`}/></div>
                  <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>앨범/프로젝트명</label><input value={lTitle} onChange={e=>setLTitle(e.target.value)} placeholder="타이틀명" className={`w-full border rounded-xl px-4 py-3 text-[15px] outline-none transition-all ${inputCls}`}/></div>
                </div>
                <div><label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${D?'text-zinc-500':'text-zinc-400'}`}>성별 *</label>
                  <div className="flex gap-2">
                    {[['male','남자'],['female','여자'],['mixed','혼성']].map(([v,l])=><button key={v} onClick={()=>setLGender(v)} className={`flex-1 py-2 rounded-xl border text-[12px] font-bold transition-all ${lGender===v?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':D?'bg-white/[0.03] border-white/[0.08] text-zinc-500':'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>{l}</button>)}
                  </div>
                </div>
                <div><label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${D?'text-zinc-500':'text-zinc-400'}`}>솔로/그룹 *</label>
                  <div className="flex gap-2">
                    {[['solo','솔로'],['group','그룹']].map(([v,l])=><button key={v} onClick={()=>setLGroup(v)} className={`flex-1 py-2 rounded-xl border text-[12px] font-bold transition-all ${lGroup===v?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':D?'bg-white/[0.03] border-white/[0.08] text-zinc-500':'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>{l}</button>)}
                  </div>
                </div>
                <div><label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${D?'text-zinc-500':'text-zinc-400'}`}>앨범 타입</label>
                  <div className="flex gap-2">
                    {[['single','Single'],['ep','EP'],['lp','LP'],['ost','OST']].map(([v,l])=><button key={v} onClick={()=>setLAlbum(v)} className={`flex-1 py-2 rounded-xl border text-[11px] font-bold transition-all ${lAlbum===v?'bg-[#5B8CFF]/20 border-[#5B8CFF]/50 text-[#5B8CFF]':D?'bg-white/[0.03] border-white/[0.08] text-zinc-500':'bg-black/[0.03] border-black/[0.08] text-zinc-500'}`}>{l}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>1차 마감일</label><input type="date" value={lDeadline} onChange={e=>setLDeadline(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`}/></div>
                  <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>2차 마감일</label><input type="date" value={lDeadline2} onChange={e=>setLDeadline2(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${inputCls}`}/></div>
                </div>
                <div><label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>내용</label><textarea value={lContent} onChange={e=>setLContent(e.target.value)} rows={5} placeholder="리드 내용, 조건, 링크 등..." className={`w-full border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all resize-none leading-relaxed ${inputCls}`}/></div>
              </div>
              {leadSaveError&&<p className="text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mt-4">{leadSaveError}</p>}
              <div className="flex gap-3 mt-4">
                {editingLead&&<button onClick={()=>deleteLead(editingLead.id).then(()=>setShowLeadForm(false))} className="px-4 py-3 rounded-xl border border-red-500/30 text-red-400 text-[13px] font-bold hover:bg-red-500/10 transition-all">삭제</button>}
                <button onClick={()=>{setShowLeadForm(false);setLeadSaveError('');}} className={`flex-1 py-3 rounded-xl border font-bold text-[13px] ${D?'border-white/10 text-zinc-500':'border-black/[0.08] text-zinc-500'}`}>취소</button>
                <button onClick={saveLead} disabled={leadSaving||!lArtist.trim()||!lGender||!lGroup} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#3B6FFF] to-[#7BA4FF] text-white font-black text-[13px] hover:scale-[1.02] transition-all disabled:opacity-40">
                  {leadSaving?'저장 중...':editingLead?'수정':'추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pitchToast&&(
        <button onClick={()=>{setView('pitches');fetchHostPitches();setPitchToast(null);}} className="fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-4 rounded-2xl border border-[#5B8CFF]/40 bg-[#0E1530] shadow-2xl shadow-[#5B8CFF]/20 animate-[slideIn_0.3s_ease] text-left max-w-[340px] hover:scale-[1.02] transition-transform">
          <div className="w-10 h-10 rounded-full bg-[#5B8CFF]/20 flex items-center justify-center text-[18px] shrink-0">📨</div>
          <div className="min-w-0">
            <p className="text-white font-black text-[14px]">새 피칭 도착!</p>
            <p className="text-zinc-300 text-[12px] truncate"><span className="font-bold">{pitchToast.artist}</span>{pitchToast.lead&&<span className="text-zinc-500"> → {pitchToast.lead}</span>}</p>
            <p className="text-[#5B8CFF] text-[11px] font-black mt-0.5">탭해서 보기 ›</p>
          </div>
        </button>
      )}
      <style dangerouslySetInnerHTML={{__html:`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}}/>

      {currentUser&&hostId&&(
        <ChatPanel user={currentUser} hostId={hostId} dark={D}/>
      )}
    </>
  );
}