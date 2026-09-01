'use client';
import { warnFail } from '@/lib/log';
import Link from 'next/link';
import { pressable } from '@/lib/a11y';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { analyzeAudio } from '@/lib/audioAnalysis';
import ChatPanel from '@/app/components/ChatPanel';

const GENRES = ['팝','R&B/소울','발라드','댄스/일렉','힙합/랩','록/밴드','EDM','재즈','인디','OST','포크/어쿠스틱','트로트','기타'];

type Section = {id:string;title:string;body:string};
const parseSections = (content:string): Section[]|null => {
  try {
    const p = JSON.parse(content);
    if(Array.isArray(p)&&p.length>0&&'body' in p[0])
      return p.map((x:any,i:number)=>({id:`s${i}`,title:x.title||'',body:x.body||''}));
  } catch { /* 섹션 JSON이 아니면 평문 본문 — null 반환이 정상 경로다 */ }
  return null;
};

const getFileHash = async (file: File): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
};

type PitchFileItem = {id:string;file:File;hash:string;vocal:'male'|'female'|'unknown';duration:number;analyzing:boolean;isDuplicate:boolean;bpm:string;genre:string;key:string;vocalOverride:'male'|'female'|'both'|'';};

const getCardColor=(gender:string,group_type:string)=>{const g=group_type==='group';if(gender==='mixed')return{bg:g?'bg-[#7C7F65]/10':'bg-[#7C7F65]/20',border:g?'border-[#7C7F65]/20':'border-[#7C7F65]/40',text:g?'text-[#7C7F65]/60':'text-[#A6A985]',dot:g?'bg-[#7C7F65]/40':'bg-[#7C7F65]',label:g?'혼성 그룹':'혼성'};if(gender==='female')return{bg:g?'bg-[#DE3C4B]/10':'bg-[#DE3C4B]/20',border:g?'border-[#DE3C4B]/20':'border-[#DE3C4B]/40',text:g?'text-[#DE3C4B]/55':'text-[#E97582]',dot:g?'bg-[#DE3C4B]/40':'bg-[#DE3C4B]',label:g?'여자 그룹':'여자'};return{bg:g?'bg-brand-lead/10':'bg-brand-lead/20',border:g?'border-brand-lead/20':'border-brand-lead/40',text:g?'text-brand-lead-text/55':'text-[#94B6EE]',dot:g?'bg-brand-lead/40':'bg-brand-lead',label:g?'남자 그룹':'남자'};};
const ALBUM_MAP:Record<string,{label:string;cls:string}>={single:{label:'Single',cls:'text-zinc-500 border-zinc-700/50 bg-zinc-800/30'},ep:{label:'EP',cls:'text-emerald-400/80 border-emerald-700/30 bg-emerald-900/20'},lp:{label:'LP',cls:'text-blue-400/80 border-blue-700/30 bg-blue-900/20'},ost:{label:'OST',cls:'text-amber-400/80 border-amber-700/30 bg-amber-900/20'}};
const AlbumBadge=({type}:{type:string})=>{const t=ALBUM_MAP[type]||ALBUM_MAP.single;return<span className={`text-micro font-black px-1.5 py-0.5 rounded-full border ${t.cls}`}>{t.label}</span>;};
const getLinkIcon=(url:string)=>{if(!url)return'ti ti-link';if(url.includes('youtube')||url.includes('youtu.be'))return'ti ti-brand-youtube';if(url.includes('soundcloud'))return'ti ti-brand-soundcloud';if(url.includes('spotify'))return'ti ti-brand-spotify';if(url.includes('instagram'))return'ti ti-brand-instagram';return'ti ti-link';};
const isExpired=(d:string|null)=>{if(!d)return false;return d.includes('T')?new Date(d)<new Date():new Date(d)<new Date(new Date().toDateString());};
const getDDay=(d:string|null)=>{if(!d)return null;const dp=d.includes('T')?d.split('T')[0]:d;const diff=Math.ceil((new Date(dp).getTime()-new Date(new Date().toDateString()).getTime())/86400000);if(diff===0)return'D-DAY';return diff>0?`D-${diff}`:`D+${Math.abs(diff)}`;};
const toDateStr=(y:number,m:number,d:number)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const extractUrls=(t:string)=>t.match(/https?:\/\/[^\s]+/g)||[];
const startOfWeek=(d:Date)=>{const r=new Date(d);r.setDate(r.getDate()-r.getDay());r.setHours(0,0,0,0);return r;};
const fmtDur=(s:number)=>s?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:'';
const vocalLabel=(v:string)=>v==='male'?'남성 보컬':v==='female'?'여성 보컬':'미감지';
const vocalCls=(v:string)=>v==='male'?'text-blue-400 border-blue-500/30 bg-blue-500/10':v==='female'?'text-pink-400 border-pink-500/30 bg-pink-500/10':'text-zinc-600 border-zinc-700/50 bg-zinc-800/30';

const DeadlineDisplay=({lead,size='normal'}:{lead:any;size?:'compact'|'normal'|'large'})=>{
  const d1=lead.deadline,d2=lead.deadline2;if(!d1&&!d2)return null;
  if(d1&&d2){const dd1=getDDay(d1),dd2=getDDay(d2),e1=isExpired(d1),e2=isExpired(d2);
    if(size==='compact')return<div className="flex flex-col gap-0.5 ml-auto shrink-0"><span className={`text-micro font-black ${e1?'text-red-400/60':'text-zinc-700'}`}>1st {dd1}</span><span className={`text-micro font-black ${e2?'text-red-400':'text-zinc-400'}`}>2nd {dd2}</span></div>;
    if(size==='large')return<div className="flex flex-col items-end gap-2"><div className="flex items-center gap-2"><span className="text-zinc-600 text-micro font-black tracking-widest">1ST</span><span className={`text-mini font-black px-2.5 py-0.5 rounded-full border ${e1?'text-red-400/60 border-red-500/20 bg-red-500/5':'text-zinc-500 border-zinc-700/60 bg-zinc-800/40'}`}>{dd1}</span></div><div className="flex items-center gap-2"><span className="text-zinc-300 text-micro font-black tracking-widest">2ND</span><span className={`text-body font-black px-3 py-0.5 rounded-full border ${e2?'text-red-400 border-red-500/30 bg-red-500/10':dd2==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-100 border-zinc-500 bg-zinc-800/60'}`}>{dd2}</span></div><span className="text-zinc-700 text-micro">{d1} → {d2}</span></div>;
    return<div className="flex flex-col items-end gap-1"><div className="flex items-center gap-1.5"><span className="text-zinc-700 text-micro font-black">1st</span><span className={`text-micro font-black px-2 py-0.5 rounded-full border ${e1?'text-red-400/60 border-red-500/20 bg-red-500/5':'text-zinc-600 border-zinc-700/50 bg-zinc-800/30'}`}>{dd1}</span></div><div className="flex items-center gap-1.5"><span className="text-zinc-400 text-micro font-black">2nd</span><span className={`text-mini font-black px-2 py-0.5 rounded-full border ${e2?'text-red-400 border-red-500/30 bg-red-500/10':dd2==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-300 border-zinc-600 bg-zinc-800/50'}`}>{dd2}</span></div></div>;
  }
  const deadline=d1||d2,dday=getDDay(deadline),exp=isExpired(deadline);
  const cls=exp?'text-red-400 border-red-500/30 bg-red-500/10':dday==='D-DAY'?'text-yellow-400 border-yellow-500/30 bg-yellow-500/10':'text-zinc-400 border-zinc-700 bg-zinc-800/50';
  if(size==='compact')return<span className={`text-micro font-black shrink-0 ml-auto ${exp?'text-red-400':'text-zinc-400'}`}>{dday}</span>;
  if(size==='large')return<span className={`text-body font-black px-4 py-1.5 rounded-full border ${cls}`}>{dday}</span>;
  return<span className={`text-mini font-black px-2 py-0.5 rounded-full border ${cls}`}>{dday}</span>;
};
const FilterPill=({label,active,onClick,isDark}:{label:string;active:boolean;onClick:()=>void;isDark:boolean})=>(
  <button onClick={onClick} className={`px-3 py-1 rounded-full text-mini font-bold border transition ${active?'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text':isDark?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{label}</button>
);

const emptyPitch=()=>({artist_name:'',contact:'',message:''});
let fileCounter=0;

export default function GuestView(){
  const params=useParams();
  const hostId=params.hostId as string;
  const [leads,setLeads]=useState<any[]>([]);
  const [announcements,setAnnouncements]=useState<any[]>([]);
  const [hostCompany,setHostCompany]=useState('');
  const [view,setView]=useState<'calendar'|'list'>('list');
  const [calView,setCalView]=useState<'month'|'week'>('week');
  const [hidePast,setHidePast]=useState(false);
  const [demoDrives,setDemoDrives]=useState<any[]>([]);
  const [myHosts,setMyHosts]=useState<{host_id:string;name:string}[]>([]);
  const [showHostSwitcher,setShowHostSwitcher]=useState(false);
  const switcherRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!showHostSwitcher)return;
    const h=(e:MouseEvent)=>{if(switcherRef.current&&!switcherRef.current.contains(e.target as Node))setShowHostSwitcher(false);};
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[showHostSwitcher]);
  const [swipeX,setSwipeX]=useState<number|null>(null);
  const [installPrompt,setInstallPrompt]=useState<any>(null);
  const [showInstall,setShowInstall]=useState(false);
  const [isStandalone,setIsStandalone]=useState(false);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    const handler=(e:any)=>{e.preventDefault();setInstallPrompt(e);};
    window.addEventListener('beforeinstallprompt',handler);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches||(navigator as any).standalone===true);
    return ()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);
  const handleInstall=async()=>{
    if(installPrompt){installPrompt.prompt();const{outcome}=await installPrompt.userChoice;if(outcome==='accepted')setInstallPrompt(null);}
    else setShowInstall(true);
  };
  const [currentMonth,setCurrentMonth]=useState(new Date());
  // 첫 마운트 시 디바이스에 맞춰 뷰 결정 (SSR 불일치 방지)
  useEffect(()=>{
    if(typeof window==='undefined')return;
    if(window.innerWidth>=768){setView('calendar');setCalView('month');}
  },[]);
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
  const [currentUser,setCurrentUser]=useState<any>(null);
  // 한 계정이 속한 모든 회사(호스트) 목록 — 회사 전환기
  useEffect(()=>{
    if(!currentUser?.id)return;
    (async()=>{
      const{data}=await supabase.from('member_approvals').select('host_id,status').eq('member_id',currentUser.id).in('status',['approved','admin']);
      const ids=[...new Set((data||[]).map((a:any)=>a.host_id))];
      if(ids.length===0){setMyHosts([]);return;}
      const{data:hp}=await supabase.from('host_profiles').select('id,company,display_name').in('id',ids);
      const map:Record<string,string>={};(hp||[]).forEach((h:any)=>{map[h.id]=h.company||h.display_name||'';});
      setMyHosts(ids.map(id=>({host_id:id,name:map[id]||'이름 없는 회사'})));
    })();
  },[currentUser?.id]);
  const [guestProfile,setGuestProfile]=useState<any>(null);
  const [authStatus,setAuthStatus]=useState<'loading'|'none'|'pending'|'rejected'|'approved'>('loading');
  const [isHost,setIsHost]=useState(false);
  const [previewMode,setPreviewMode]=useState(false);
  const [shareToast,setShareToast]=useState(false);
  // 실패를 사용자에게 보이게 하는 자리 — 예전엔 번역 실패가 조용히 사라졌다
  const [errToast,setErrToast]=useState<string|null>(null);
  const showErr=(m:string)=>{setErrToast(m);setTimeout(()=>setErrToast(null),4000);};
  const [theme,setTheme]=useState<'dark'|'light'>('dark');
  const [zoom,setZoom]=useState(1);
  const draggingZoom=useRef(false);const zoomStartY=useRef(0);const zoomStart=useRef(1);
  useEffect(()=>{const z=localStorage.getItem('lead_zoom');if(z)setZoom(parseFloat(z));},[]);
  const applyZoom=(z:number)=>{const v=Math.min(1.5,Math.max(0.5,Math.round(z*100)/100));setZoom(v);localStorage.setItem('lead_zoom',String(v));};
  const onZoomDown=(e:React.MouseEvent)=>{draggingZoom.current=true;zoomStartY.current=e.clientY;zoomStart.current=zoom;document.body.style.cursor='ns-resize';document.body.style.userSelect='none';};
  const onZoomTouch=(e:React.TouchEvent)=>{draggingZoom.current=true;zoomStartY.current=e.touches[0].clientY;zoomStart.current=zoom;};
  useEffect(()=>{
    const mv=(e:MouseEvent)=>{if(!draggingZoom.current)return;const d=(zoomStartY.current-e.clientY)/300;applyZoom(zoomStart.current+d);};
    const up=()=>{if(!draggingZoom.current)return;draggingZoom.current=false;document.body.style.cursor='';document.body.style.userSelect='';};
    const tmv=(e:TouchEvent)=>{if(!draggingZoom.current)return;e.preventDefault();const d=(zoomStartY.current-e.touches[0].clientY)/300;applyZoom(zoomStart.current+d);};
    window.addEventListener('mousemove',mv);window.addEventListener('mouseup',up);
    window.addEventListener('touchmove',tmv,{passive:false});window.addEventListener('touchend',up);
    return ()=>{window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);window.removeEventListener('touchmove',tmv);window.removeEventListener('touchend',up);};
  },[]);
  const [translating,setTranslating]=useState(false);
  const [translatedCache,setTranslatedCache]=useState<Record<string,Section[]>>({});
  const [globalEn,setGlobalEn]=useState(false);
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
  // 멤버 인라인 로그인 상태
  const [guestEmail,setGuestEmail]=useState('');
  const [guestPw,setGuestPw]=useState('');
  const [guestIsSignUp,setGuestIsSignUp]=useState(false);
  const [guestLoading,setGuestLoading]=useState(false);
  const [guestError,setGuestError]=useState('');
  const [noProfile,setNoProfile]=useState(false); // 로그인됐지만 멤버 프로필 없음

  useEffect(()=>{const s=localStorage.getItem('lead_theme');if(s==='light')setTheme('light');},[]);
  const toggleTheme=()=>{const n=theme==='dark'?'light':'dark';setTheme(n);localStorage.setItem('lead_theme',n);};
  const D=theme==='dark';
  const t=(ko:string,en:string)=>globalEn?en:ko;
  const mainBg=D?'bg-surface-1 text-white':'bg-[#E6E6EC] text-[#111]';
  const dividerCls=D?'border-white/10':'border-black/[0.08]';
  const dimText=D?'text-zinc-500':'text-zinc-500';
  const inputCls=D?'bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-brand-lead/50':'bg-black/[0.04] border-black/[0.08] text-[#111] placeholder:text-zinc-400 focus:border-brand-lead/50';

  useEffect(()=>{
    if(!hostId)return;
    const checkAuth=async(user:any)=>{
      if(!user){setAuthStatus('none');setIsHost(false);setCurrentUser(null);setNoProfile(false);return;}
      setCurrentUser(user);
      localStorage.setItem('last_host_id',hostId);
      // 게스트로 로그인해 들어온 경우(?guest=1): 본인 회사여도 게스트(미리보기) 화면으로
      const wantGuest=typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('guest')==='1';
      if(user.id===hostId){setIsHost(true);if(wantGuest)setPreviewMode(true);setAuthStatus('approved');fetchAll();return;}
      const[profileRes,approvalRes]=await Promise.all([
        supabase.from('members').select('*').eq('id',user.id).maybeSingle(),
        supabase.from('member_approvals').select('status').eq('member_id',user.id).eq('host_id',hostId).maybeSingle(),
      ]);
      if(profileRes.data){setGuestProfile(profileRes.data);setNoProfile(false);}
      else{setNoProfile(true);setAuthStatus('none');return;} // 프로필 없음 → 온보딩으로
      if(!approvalRes.data){
        // 프로필은 있는데 접근 요청 없음 → 자동으로 pending 생성
        await supabase.from('member_approvals').insert({member_id:user.id,host_id:hostId,status:'pending'});
        setAuthStatus('pending');
      }else{
        const s=approvalRes.data.status;
        if(s==='admin'){setIsHost(true);if(wantGuest)setPreviewMode(true);setAuthStatus('approved');fetchAll();}
        else if(s==='approved'){setAuthStatus('approved');fetchAll();}
        else setAuthStatus(s as any);
      }
    };
    // getSession 먼저 (빠름), 없으면 getUser (API 호출)
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(session?.user){checkAuth(session.user);}
      else{const{data:{user}}=await supabase.auth.getUser();checkAuth(user);}
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_ev,session)=>{
      if(_ev==='SIGNED_IN'||_ev==='TOKEN_REFRESHED'||_ev==='INITIAL_SESSION') checkAuth(session?.user||null);
      else if(_ev==='SIGNED_OUT'){setAuthStatus('none');setGuestProfile(null);setIsHost(false);}
    });
    return()=>subscription.unsubscribe();
  },[hostId]);
  const openLeadForm=(lead?:any,preset?:string)=>{if(lead){setEditingLead(lead);setLArtist(lead.artist||'');setLTitle(lead.title||'');setLGender(lead.gender||'');setLGroup(lead.group_type||'');setLAlbum(lead.album_type||'single');setLContent(lead.content||'');setLDeadline(lead.deadline||'');setLDeadline2(lead.deadline2||'');}else{setEditingLead(null);setLArtist('');setLTitle('');setLGender('');setLGroup('');setLAlbum('single');setLContent('');setLDeadline(preset||'');setLDeadline2('');}setShowLeadForm(true);};
  const [leadSaveError,setLeadSaveError]=useState('');
  const saveLead=async()=>{if(!lArtist.trim()||!lGender||!lGroup)return;setLeadSaving(true);setLeadSaveError('');const data={host_id:hostId,artist:lArtist.trim(),title:lTitle.trim()||'',gender:lGender,group_type:lGroup,album_type:lAlbum,content:lContent.trim()||null,deadline:lDeadline||null,deadline2:lDeadline2||null};let err:any=null;if(editingLead){const r=await supabase.from('leads').update(data).eq('id',editingLead.id);err=r.error;}else{const r=await supabase.from('leads').insert(data);err=r.error;}if(err){setLeadSaveError(err.message||'저장 실패');setLeadSaving(false);return;}await fetchAll();setShowLeadForm(false);setLeadSaveError('');setLeadSaving(false);};
  const deleteLead=async(id:string)=>{if(!confirm('이 리드를 삭제할까요?'))return;await supabase.from('leads').delete().eq('id',id);await fetchAll();};
    const fileInputRef=useRef<HTMLInputElement>(null);

  const fetchAll=async()=>{
    const [lr,ar]=await Promise.all([
      supabase.from('leads').select('*').eq('host_id',hostId).order('deadline',{ascending:true}),
      supabase.from('lead_announcements').select('*').eq('host_id',hostId).order('created_at',{ascending:true}),
    ]);
    if(lr.data){setLeads(lr.data.filter((l:any)=>l.kind!=='demo'));setDemoDrives(lr.data.filter((l:any)=>l.kind==='demo'));}
    if(ar.data)setAnnouncements(ar.data);
  };
  useEffect(()=>{if(!hostId)return;supabase.from('host_profiles').select('company,display_name').eq('id',hostId).maybeSingle().then(({data})=>{if(data)setHostCompany(data.company||data.display_name||'');});},[hostId]);
  useEffect(()=>{if(!hostId)return;const ch=supabase.channel('gl').on('postgres_changes',{event:'*',schema:'public',table:'leads',filter:`host_id=eq.${hostId}`},fetchAll).subscribe();return()=>{supabase.removeChannel(ch);};},[hostId]);

  const addFile=async(file:File)=>{
    if(!file.name.toLowerCase().endsWith('.mp3')){showErr('MP3 파일만 올릴 수 있어요. 파일을 MP3로 변환해 다시 시도해주세요.');return;}
    if(file.size>50*1024*1024){showErr('파일이 50MB를 넘어요. 비트레이트를 낮춰 다시 올려주세요.');return;}
    const id=`f${++fileCounter}`;
    setPitchFiles(prev=>[...prev,{id,file,hash:'',vocal:'unknown',duration:0,analyzing:true,isDuplicate:false,bpm:'',genre:'',key:'',vocalOverride:''}]);
    const [hash,analysis]=await Promise.all([getFileHash(file),analyzeAudio(file)]);
    const {data:dup}=await supabase.from('pitch_files').select('id').eq('file_hash',hash).eq('host_id',hostId);
    setPitchFiles(prev=>prev.map(f=>f.id===id?{...f,hash,vocal:analysis.vocal,duration:analysis.duration,bpm:analysis.bpm?String(analysis.bpm):f.bpm,key:analysis.key||f.key,isDuplicate:!!(dup&&dup.length>0),analyzing:false}:f));
  };
  const removeFile=(id:string)=>setPitchFiles(prev=>prev.filter(f=>f.id!==id));
  const updateFile=(id:string,patch:Partial<PitchFileItem>)=>setPitchFiles(prev=>prev.map(f=>f.id===id?{...f,...patch}:f));
  const tapsRef=useRef<Record<string,number[]>>({});
  const tapTempo=(id:string)=>{
    const now=performance.now();
    const arr=(tapsRef.current[id]||[]).filter(t=>now-t<2500); // 2.5s 이상 쉬면 리셋
    arr.push(now); tapsRef.current[id]=arr;
    if(arr.length>=2){
      const iv:number[]=[]; for(let i=1;i<arr.length;i++)iv.push(arr[i]-arr[i-1]);
      const avg=iv.reduce((a,b)=>a+b,0)/iv.length; const bpm=Math.round(60000/avg);
      if(bpm>=40&&bpm<=300)updateFile(id,{bpm:String(bpm)});
    }
  };
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
        const vocalFinal=pf.vocalOverride||pf.vocal||null;
        const {error:pfErr}=await supabase.from('pitch_files').insert({pitch_id:pitchData.id,host_id:hostId,file_url:fileUrl,file_name:pf.file.name,file_hash:pf.hash||null,bpm:pf.bpm?parseInt(pf.bpm)||null:null,vocal_gender:vocalFinal,genre:pf.genre||null,duration:pf.duration||null,key:pf.key||null});
        if(pfErr){setPitchLoading(false);setUploadError(`파일 정보 저장 실패: ${pfErr.message}`);return;}
        setUploadProgress(Math.round(((i+1)/total)*100));
      }
    }
    setPitchLoading(false);setPitchSent(true);
  };

  const gTranslateChunk=async(text:string):Promise<string>=>{
    if(!text.trim())return text;
    const res=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`);
    const data=await res.json();
    return (data[0]||[]).map((item:any)=>item[0]).join('');
  };
  // Google's GET endpoint truncates long input — split on line boundaries so nothing is dropped.
  const gTranslate=async(text:string):Promise<string>=>{
    if(!text.trim())return'';
    const LIMIT=1200;
    if(text.length<=LIMIT)return gTranslateChunk(text);
    const lines=text.split('\n');
    const chunks:string[]=[];let cur='';
    for(const ln of lines){
      if((cur+'\n'+ln).length>LIMIT&&cur){chunks.push(cur);cur=ln;}
      else cur=cur?cur+'\n'+ln:ln;
    }
    if(cur)chunks.push(cur);
    const out=await Promise.all(chunks.map(c=>gTranslateChunk(c)));
    return out.join('\n');
  };
  const ensureEn=async(lead:any)=>{
    if(!lead)return;
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
    }catch(e){
      warnFail('번역',e);
      showErr('번역에 실패했어요. 잠시 후 다시 시도해주세요.');
    }
    setTranslating(false);
  };
  const switchToEn=async(lead:any)=>{
    if(contentLang==='en'){setContentLang('ko');return;}
    await ensureEn(lead);
  };
  // 전역 EN 토글: 켜져 있으면 리드 열 때 자동 영어
  useEffect(()=>{
    const s=localStorage.getItem('lead_global_en');if(s==='1')setGlobalEn(true);
  },[]);
  useEffect(()=>{
    if(viewingLead&&globalEn)ensureEn(viewingLead);
    if(!globalEn&&viewingLead)setContentLang('ko');
  },[viewingLead,globalEn]);
  const getEnContent=(lead:any):Section[]|null=>{
    if(lead.content_en)return parseSections(lead.content_en)||[{id:'en0',title:'',body:lead.content_en}];
    return translatedCache[lead.id]||null;
  };
  const renderSections=(sections:Section[])=>(
    <div className="flex flex-col gap-4">
      {sections.map((s,i)=>(
        <div key={i}>
          {s.title&&<p className={`text-mini font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>{i+1}. {s.title}</p>}
          <div className={`text-body leading-relaxed ${D?'text-zinc-300':'text-zinc-700'}`}>
            {s.body.split(/(https?:\/\/[^\s]+)/g).map((part,j)=>{
              if(part.match(/^https?:\/\//))return<a key={j} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-lead-text hover:underline break-all"><i className={getLinkIcon(part)} aria-hidden="true"></i><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
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
              {s.title&&<p className={`text-mini font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>{i+1}. {s.title}</p>}
              <div className={`text-body leading-relaxed ${D?'text-zinc-300':'text-zinc-700'}`}>
                {s.body.split(/(https?:\/\/[^\s]+)/g).map((part,j)=>{
                  if(part.match(/^https?:\/\//))return<a key={j} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-lead-text hover:underline break-all"><i className={getLinkIcon(part)} aria-hidden="true"></i><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
                  return<span key={j} className="whitespace-pre-wrap">{part}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return content.split(/(https?:\/\/[^\s]+)/g).map((part,i)=>{
      if(part.match(/^https?:\/\//))return<a key={i} href={part} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-lead-text hover:underline break-all"><i className={getLinkIcon(part)} aria-hidden="true"></i><span>{part.replace(/^https?:\/\//,'').split('/').slice(0,2).join('/')}</span></a>;
      return<span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const getLeadPreview=(lead:any)=>{
    const sections=parseSections(lead.content||'');
    if(sections)return sections.map((s:any)=>s.body).join(' ').replace(/https?:\/\/[^\s]+/g,'↗').slice(0,80);
    return(lead.content||'').replace(/https?:\/\/[^\s]+/g,'↗').slice(0,80);
  };

  const getDaysInMonth=(date:Date)=>{const y=date.getFullYear(),m=date.getMonth();return{firstDay:new Date(y,m,1).getDay(),daysInMonth:new Date(y,m+1,0).getDate(),year:y,month:m};};
  const getLeadsForDate=(ds:string)=>leads.filter(l=>(l.deadline||'').split('T')[0]===ds||(l.deadline2||'').split('T')[0]===ds);
  const weekDays=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;}),[weekStart]);
  const today=new Date();
  const {firstDay,daysInMonth,year,month}=getDaysInMonth(currentMonth);
  const DAYS=['일','월','화','수','목','금','토'];

  const filteredLeads=useMemo(()=>{
    let l=[...leads];
    if(hidePast)l=l.filter(x=>!isExpired(x.deadline2||x.deadline));
    if(filterGender.length)l=l.filter(x=>filterGender.includes(x.gender));
    if(filterGroup.length)l=l.filter(x=>filterGroup.includes(x.group_type));
    if(filterAlbum.length)l=l.filter(x=>filterAlbum.includes(x.album_type||'single'));
    const nearestActive=(x:any)=>{const cs=[x.deadline,x.deadline2].filter((d:any)=>d&&!isExpired(d));return cs.length?Math.min(...cs.map((d:any)=>new Date(d).getTime())):null;};
    return l.sort((a,b)=>{
      if(sortBy==='gender')return a.gender.localeCompare(b.gender);
      if(sortBy==='group')return a.group_type.localeCompare(b.group_type);
      if(sortBy==='album')return(a.album_type||'single').localeCompare(b.album_type||'single');
      // D-Day: 임박(D-day 짧은)순 → 마감된 건 맨 뒤로
      const aA=nearestActive(a),bA=nearestActive(b);
      if(aA!==null&&bA!==null)return aA-bA;
      if(aA!==null)return -1;
      if(bA!==null)return 1;
      const aL=a.deadline2||a.deadline,bL=b.deadline2||b.deadline;
      if(!aL)return 1;if(!bL)return-1;
      return new Date(bL).getTime()-new Date(aL).getTime();
    });
  },[leads,filterGender,filterGroup,filterAlbum,sortBy,hidePast]);

  const LeadCard=({lead,compact=false}:{lead:any;compact?:boolean})=>{
    const c=getCardColor(lead.gender,lead.group_type);
    const expired=isExpired(lead.deadline2||lead.deadline);
    const allText=lead.content?parseSections(lead.content)?.map((s:any)=>s.body).join('\n')||lead.content:'';
    const urls=extractUrls(allText);
    return(
      <div onClick={(e)=>{e.stopPropagation();setViewingLead(lead);setContentLang('ko');}} className={`relative border rounded-xl cursor-pointer transition duration-300 active:scale-[0.99] sm:hover:scale-[1.02] sm:hover:-translate-y-0.5 ${D?'shadow-lg shadow-black/30 sm:hover:shadow-xl sm:hover:shadow-black/40':'shadow-sm sm:hover:shadow-md'} before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-xl before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent ${c.bg} ${c.border} ${expired?'opacity-40 grayscale':''} ${compact?'p-2 before:hidden':'p-4 sm:p-4'}`}>
        {compact?(<div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}/><span className={`text-mini font-bold truncate ${D?"text-white":"text-[#111]"}`}>{lead.artist}</span><DeadlineDisplay lead={lead} size="compact"/></div>):(
          <>
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1 flex-wrap"><div className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`}/><span className={`text-micro sm:text-micro font-black ${c.text}`}>{c.label}</span><AlbumBadge type={lead.album_type||'single'}/></div><h3 className={`font-black text-lead sm:text-body truncate ${D?"text-white":"text-[#111]"}`}>{lead.artist}</h3><p className={`text-body sm:text-mini truncate ${D?"text-zinc-400":"text-zinc-600"}`}>{lead.title}</p></div>
              <div className="ml-1 shrink-0"><DeadlineDisplay lead={lead} size="normal"/></div>
            </div>
            {lead.content&&<p className={`text-mini sm:text-mini line-clamp-2 mt-1 ${D?"text-zinc-500":"text-zinc-600"}`}>{getLeadPreview(lead)}</p>}
            {urls.length>0&&<div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">{urls.slice(0,3).map((url,i)=><a key={i} href={url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="text-body hover:scale-110 transition-transform"><i className={getLinkIcon(url)} aria-hidden="true"></i></a>)}{urls.length>3&&<span className="text-zinc-700 text-micro self-center">+{urls.length-3}</span>}</div>}
          </>
        )}
      </div>
    );
  };

  const FileItem=({item}:{item:PitchFileItem})=>(
    <div className={`border rounded-xl overflow-hidden ${D?'border-[rgba(255,255,255,0.08)] ':'border-black/[0.08] bg-black/[0.02]'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-lead"><i className="ti ti-music" aria-hidden="true"></i></span>
        <div className="flex-1 min-w-0">
          <p className={`text-mini font-bold truncate ${D?'text-white':'text-[#111]'}`}>{item.file.name}</p>
          <p className={`text-mini ${D?'text-zinc-600':'text-zinc-400'}`}>{(item.file.size/1024/1024).toFixed(1)}MB{item.duration>0&&` · ${fmtDur(item.duration)}`}</p>
        </div>
        {item.analyzing&&<div className="w-4 h-4 border-2 border-brand-lead border-t-transparent rounded-full animate-spin shrink-0"/>}
        {!item.analyzing&&<span className="text-green-400 text-body shrink-0">✓</span>}
        <button onClick={()=>removeFile(item.id)} className={`text-body transition-colors shrink-0 ${D?'text-zinc-700 hover:text-red-400':'text-zinc-400 hover:text-red-500'}`}>✕</button>
      </div>
      {!item.analyzing&&(
        <div className={`px-4 pb-4 border-t pt-3 flex flex-col gap-3 ${D?'border-white/5':'border-black/[0.05]'}`}>
          {item.isDuplicate&&<div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20"><p className="text-yellow-400 text-mini font-bold">이미 제출된 적 있는 파일이에요</p></div>}
          {/* 보컬 선택 */}
          <div>
            <p className={`text-micro font-black uppercase tracking-widest mb-2 ${D?'text-zinc-600':'text-zinc-400'}`}>보컬 {item.vocal!=='unknown'&&<span className={`ml-2 font-normal normal-case ${D?'text-zinc-700':'text-zinc-400'}`}>자동감지: {vocalLabel(item.vocal)}</span>}</p>
            <div className="flex gap-1.5">
              {([['male','남성'],['female','여성'],['both','혼성']] as const).map(([v,l])=>(
                <button key={v} onClick={()=>updateFile(item.id,{vocalOverride:item.vocalOverride===v?'':v})}
                  className={`flex-1 py-1.5 rounded-full text-micro font-bold border transition ${item.vocalOverride===v?v==='male'?'bg-blue-500/20 border-blue-500/50 text-blue-400':v==='female'?'bg-pink-500/20 border-pink-500/50 text-pink-400':'bg-purple-500/20 border-purple-500/50 text-purple-400':D?'bg-white/5 border-white/10 text-zinc-600 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {/* BPM + Key */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <label className={`text-micro font-black uppercase tracking-widest shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>BPM</label>
              <input type="number" min="40" max="300" value={item.bpm} onChange={e=>updateFile(item.id,{bpm:e.target.value})} placeholder="자동"
                className={`flex-1 min-w-0 border rounded-xl px-2.5 py-1.5 text-mini outline-none transition ${inputCls}`}/>
              <button onClick={()=>tapTempo(item.id)} title="박자에 맞춰 탭" className={`shrink-0 px-2.5 py-1.5 rounded-full text-mini font-black border transition ${D?'border-white/10 bg-white/5 text-zinc-400 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>탭</button>
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-micro font-black uppercase tracking-widest shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>KEY</label>
              <input type="text" value={item.key} onChange={e=>updateFile(item.id,{key:e.target.value})} placeholder="자동 (예: C, Am)"
                className={`flex-1 border rounded-xl px-2.5 py-1.5 text-mini outline-none transition ${inputCls}`}/>
            </div>
          </div>
          <div>
            <p className={`text-micro font-black uppercase tracking-widest mb-2 ${D?'text-zinc-600':'text-zinc-400'}`}>장르</p>
            <div className="flex flex-wrap gap-1">
              {GENRES.map(g=>(
                <button key={g} onClick={()=>updateFile(item.id,{genre:item.genre===g?'':g})}
                  className={`px-2.5 py-1 rounded-full text-micro font-bold border transition ${item.genre===g?'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text':D?'bg-white/5 border-white/10 text-zinc-600 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>
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
      <main className={`min-h-screen ${mainBg} flex items-center justify-center p-5 font-ui relative overflow-hidden`}>
        <div className="w-full max-w-sm text-center">
          <div className="flex flex-col items-center mb-10"><div className="flex items-baseline justify-center gap-2.5"><h1 className="font-display text-display text-brand-lead-text uppercase tracking-tighter">LEAD</h1><span className={`${dimText} text-mini font-bold tracking-[0.2em]`}>by NEN</span></div>{hostCompany&&<div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-lead/25 bg-brand-lead/10"><span className={`text-mini font-semibold ${D?'text-zinc-200':'text-zinc-700'}`}>{hostCompany}</span></div>}</div>
          <div className={`border rounded-xl p-8 ${D?' border-[rgba(255,255,255,0.08)]':' border-black/[0.08]'}`}>
            <div className="text-display mb-4"><i className={icon} aria-hidden="true"></i></div>
            <h2 className={`font-black text-sub mb-2 ${D?'text-white':'text-[#111]'}`}>{title}</h2>
            <p className={`text-body leading-relaxed ${dimText}`}>{sub}</p>
            {children}
          </div>
          <p className={`text-mini mt-6 ${D?'text-zinc-700':'text-zinc-400'}`}>Contact : everplayground@gmail.com</p>
        </div>
      </main>
    </>
  );

  const handleGuestAuth=async()=>{
    if(!guestEmail.trim()||!guestPw.trim())return;
    setGuestLoading(true);setGuestError('');
    if(guestIsSignUp){
      const{error}=await supabase.auth.signUp({email:guestEmail.trim(),password:guestPw});
      if(error){setGuestError(error.message);setGuestLoading(false);return;}
      // 온보딩으로 이동 (last_host_id 이미 localStorage에 있음)
      localStorage.setItem('last_host_id',hostId);
      window.location.href='/onboarding';
    }else{
      const{error}=await supabase.auth.signInWithPassword({email:guestEmail.trim(),password:guestPw});
      if(error){setGuestError(error.message);setGuestLoading(false);return;}
      // 로그인 직후 전체 새로고침 → 레이아웃/초기 상태 깔끔하게 적용
      window.location.reload();
      return;
    }
    setGuestLoading(false);
  };

  if(authStatus==='loading')return(<div className={`min-h-screen ${mainBg} flex items-center justify-center`}><div className="w-6 h-6 border-2 border-brand-lead border-t-transparent rounded-full animate-spin"/></div>);
  if(authStatus==='none')return(
    <>
      <main className={`min-h-screen ${mainBg} flex items-center justify-center p-5 font-ui relative overflow-hidden`}>
        <div className="w-full max-w-sm relative z-10">
          <div className="flex flex-col items-center mb-10"><div className="flex items-baseline justify-center gap-2.5"><h1 className="font-display text-display text-brand-lead-text uppercase tracking-tighter">LEAD</h1><span className={`${dimText} text-mini font-bold tracking-[0.2em]`}>by NEN</span></div>{hostCompany&&<div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-lead/25 bg-brand-lead/10"><span className={`text-mini font-semibold ${D?'text-zinc-200':'text-zinc-700'}`}>{hostCompany}</span></div>}</div>
          {noProfile?(
            <div className={`border rounded-xl p-8 text-center ${D?' border-[rgba(255,255,255,0.08)]':' border-black/[0.08]'}`}>
              <div className="text-display mb-4"><i className="ti ti-pencil" aria-hidden="true"></i></div>
              <h2 className={`font-black text-sub mb-2 ${D?'text-white':'text-[#111]'}`}>프로필을 완성해주세요</h2>
              <p className={`text-body ${dimText} mb-6`}>리드에 참여하려면 멤버 프로필 등록이 필요해요.</p>
              <Link href="/onboarding" className="block w-full py-3.5 rounded-xl bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition">프로필 등록하기</Link>
              <button onClick={()=>supabase.auth.signOut().then(()=>{setCurrentUser(null);setNoProfile(false);})} className={`block w-full mt-3 py-2.5 text-mini font-bold ${dimText} hover:text-white transition-colors`}>다른 계정으로 로그인</button>
            </div>
          ):(
            <div className={`border rounded-xl p-6 ${D?' border-[rgba(255,255,255,0.08)]':' border-black/[0.08]'}`}>
              <h2 className={`font-semibold text-lead mb-1 ${D?'text-white':'text-[#111]'}`}>{guestIsSignUp?'멤버 가입':'멤버 로그인'}</h2>
              <p className={`text-mini ${dimText} mb-4`}>호스트 초대를 받으셨나요? 로그인하면 접근 요청이 자동으로 전달돼요.</p>
              <div className="flex flex-col gap-3 mb-3">
                <input value={guestEmail} onChange={e=>setGuestEmail(e.target.value)} placeholder="이메일" type="email" autoComplete="email" spellCheck={false} name="email"
                  className={`w-full border rounded-xl px-4 py-3 text-body outline-none focus:border-brand-lead/50 transition ${inputCls}`}/>
                <input value={guestPw} onChange={e=>setGuestPw(e.target.value)} placeholder="비밀번호" type="password" autoComplete={guestIsSignUp?"new-password":"current-password"} name="password"
                  onKeyDown={e=>e.key==='Enter'&&handleGuestAuth()}
                  className={`w-full border rounded-xl px-4 py-3 text-body outline-none focus:border-brand-lead/50 transition ${inputCls}`}/>
              </div>
              {guestError&&<p className="text-red-400 text-mini mb-3">{guestError}</p>}
              <button onClick={handleGuestAuth} disabled={guestLoading||!guestEmail.trim()||!guestPw.trim()}
                className="w-full py-3 rounded-full bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition disabled:opacity-50 mb-3">
                {guestLoading?'…':guestIsSignUp?'가입하기':'로그인'}
              </button>
              <button onClick={()=>{setGuestIsSignUp(s=>!s);setGuestError('');}} className={`w-full text-mini ${dimText} hover:text-white transition-colors`}>
                {guestIsSignUp?'이미 계정이 있어요':'계정이 없어요 (가입하기)'}
              </button>
            </div>
          )}
          <p className={`text-mini mt-6 text-center ${D?'text-zinc-700':'text-zinc-400'}`}>Contact : everplayground@gmail.com</p>
        </div>
      </main>
    </>
  );
  if(authStatus==='pending')return(<GateScreen icon="ti ti-clock" title="승인 대기 중이에요" sub={`${guestProfile?.artist_name||''}님의 접근 요청을 담당자가 검토 중이에요.\n승인 완료 시 이용하실 수 있어요.`}><button onClick={()=>supabase.auth.signOut().then(()=>setAuthStatus('none'))} className={`block w-full mt-6 py-3 rounded-full border font-bold text-body transition ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>다른 계정으로 로그인</button></GateScreen>);
  if(authStatus==='rejected')return(<GateScreen icon="ti ti-ban" title="접근이 거절됐어요" sub="담당자에게 문의해주세요."><button onClick={()=>supabase.auth.signOut().then(()=>setAuthStatus('none'))} className={`block w-full mt-6 py-3 rounded-full border font-bold text-body transition ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>다른 계정으로 로그인</button></GateScreen>);

  return(
    <>
      <main className={`${mainBg} p-5 lg:p-8 pb-24 sm:pb-5 font-ui relative`} style={{zoom: zoom*1.1, minHeight:`calc(100dvh / ${zoom*1.1})`}}>
        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="flex items-baseline justify-center gap-2.5"><h1 className="font-display text-display text-brand-lead-text uppercase tracking-tighter">LEAD</h1><span className={`${dimText} text-mini font-bold tracking-[0.2em]`}>by NEN</span></div>
          {hostCompany&&<div className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full border border-brand-lead/25 bg-brand-lead/10"><span className={`text-mini font-semibold ${D?'text-zinc-200':'text-zinc-700'}`}>{hostCompany}</span></div>}
        </div>

        {announcements.length>0&&<div className="relative z-10 mb-5 flex flex-col gap-2">{announcements.map(ann=><div key={ann.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-brand-lead/10 border border-brand-lead/20"><span className="text-brand-lead-text text-mini font-black mt-0.5 shrink-0"><i className="ti ti-speakerphone" aria-hidden="true"></i></span><div>{ann.title&&<p className={`font-bold text-body mb-0.5 ${D?'text-white':'text-[#111]'}`}>{ann.title}</p>}<p className={`text-mini leading-relaxed whitespace-pre-line ${D?'text-zinc-300':'text-zinc-600'}`}>{ann.content}</p></div></div>)}</div>}

        <div className={`relative z-30 flex flex-wrap items-center justify-between gap-3 mb-6 border-b ${dividerCls} pb-4`}>
          <div className="flex items-center gap-2"><span className={`${dimText} text-body font-bold`}>{leads.filter(l=>!isExpired(l.deadline2||l.deadline)).length} 활성</span><span className={D?'text-zinc-700':'text-zinc-400'}>·</span><span className={`${D?'text-zinc-700':'text-zinc-400'} text-body`}>{leads.filter(l=>isExpired(l.deadline2||l.deadline)).length} 마감</span></div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className={`w-9 h-9 rounded-full border flex items-center justify-center text-body transition ${D?'bg-white/5 border-white/10 hover:bg-white/10':'bg-black/[0.04] border-black/[0.08] hover:bg-black/[0.08]'}`}>{D?'☀':'◑'}</button>
            <button onClick={()=>{const v=!globalEn;setGlobalEn(v);localStorage.setItem('lead_global_en',v?'1':'0');}} className={`h-9 px-3 rounded-full border flex items-center justify-center text-mini font-normal transition ${globalEn?'bg-brand-lead border-brand-lead text-white':D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{globalEn?'EN':'KO'}</button>
            {!isStandalone&&<button onClick={handleInstall} className={`sm:hidden h-9 px-3 rounded-full border flex items-center justify-center text-mini font-normal transition ${D?'bg-white/5 border-white/10 text-zinc-400':'bg-black/[0.04] border-black/[0.08] text-zinc-500'}`}>앱 설치</button>}
            <div className={`hidden sm:flex border rounded-xl p-1 gap-1 ${D?' border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}>
              <button onClick={()=>setView('calendar')} className={`px-3 py-1.5 rounded-full text-mini font-normal transition ${view==='calendar'?'bg-brand-lead text-white':dimText}`}>{t('달력','Calendar')}</button>
              <button onClick={()=>setView('list')} className={`px-3 py-1.5 rounded-full text-mini font-normal transition ${view==='list'?'bg-brand-lead text-white':dimText}`}>{t('목록','List')}</button>
            </div>
            <button onClick={()=>{navigator.clipboard.writeText(window.location.href);setShareToast(true);setTimeout(()=>setShareToast(false),2000);}} className={`px-3 py-1.5 rounded-full border text-micro font-normal transition ${D?'border-white/10 bg-white/5 text-zinc-500 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>공유</button>
            {/* MY 버튼 */}
            {isHost&&!previewMode?(
              <div className="flex items-center gap-2">
                <button onClick={()=>setPreviewMode(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
                  <span className="text-amber-400 text-mini font-bold">HOST</span>
                </button>
                <button onClick={()=>openLeadForm()} className="px-3 py-1.5 rounded-full bg-brand-lead text-white text-micro font-black hover:bg-[#C41C00] transition">+ 리드 추가</button>
                <Link href="/mypage" className={`px-3 py-1.5 rounded-full border text-micro font-black transition ${D?'border-white/10 bg-white/5 text-zinc-500 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>MY</Link>
              </div>
            ):isHost&&previewMode?(
              <button onClick={()=>setPreviewMode(false)} className="px-3 py-1.5 rounded-full border border-amber-500/50 bg-amber-500/20 text-amber-400 text-micro font-black hover:bg-amber-500/30 transition animate-pulse"><i className="ti ti-eye" aria-hidden="true"></i> 미리보기 중 — 탭하면 HOST로</button>
            ):guestProfile?(
              <div className="flex items-center gap-2">
                {myHosts.length>1&&(
                  <div className="relative" ref={switcherRef}>
                    <button onClick={()=>setShowHostSwitcher(s=>!s)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-mini font-normal transition ${D?'border-white/10 bg-white/5 text-zinc-300 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-600 hover:text-[#111]'}`}>{t('회사 전환','Switch')} <span className="opacity-60">▾</span></button>
                    {showHostSwitcher&&(
                      <div className={`anim-rise absolute right-0 mt-2 w-56 z-[80] rounded-xl border shadow-lg overflow-hidden ${D?' border-white/10':' border-black/[0.08]'}`}>
                        <p className={`text-micro font-black uppercase tracking-widest px-4 pt-3 pb-1 ${dimText}`}>{t('내 회사','My companies')}</p>
                        {myHosts.map(h=>(
                          <button key={h.host_id} onClick={()=>{setShowHostSwitcher(false);if(h.host_id!==hostId)window.location.href=`/view/${h.host_id}`;}} className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-body font-normal transition-colors ${h.host_id===hostId?'text-brand-lead-text':D?'text-zinc-300 hover:bg-white/5':'text-zinc-700 hover:bg-black/[0.04]'}`}>
                            <span className="flex-1 truncate">{h.name}</span>{h.host_id===hostId&&<span className="text-mini">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-lead/30 bg-brand-lead/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-lead"/>
                  <span className="text-brand-lead-text text-mini font-bold">{guestProfile.artist_name}</span>
                </div>
                <Link href="/mypage" className={`px-3 py-1.5 rounded-full border text-micro font-black transition ${D?'border-white/10 bg-white/5 text-zinc-500 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>MY</Link>
              </div>
            ):(
              <Link href="/guest" className={`px-3 py-1.5 rounded-full border text-micro font-black transition ${D?'border-white/10 bg-white/5 text-zinc-500 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>로그인</Link>
            )}
          </div>
        </div>

        {(()=>{
          const dayDiff=(d:string)=>Math.ceil((new Date(d).getTime()-new Date(new Date().toDateString()).getTime())/86400000);
          const urgent=leads.map((l:any)=>{const cs=[l.deadline,l.deadline2].filter((d:any)=>d&&!isExpired(d));if(!cs.length)return null;const up=cs.sort((a:any,b:any)=>new Date(a).getTime()-new Date(b).getTime())[0];const days=dayDiff(up);return days>=0&&days<=3?{lead:l,days}:null;}).filter(Boolean).sort((a:any,b:any)=>a.days-b.days) as {lead:any;days:number}[];
          if(urgent.length===0)return null;
          return(
            <div className="relative z-10 mb-6">
              <div className="flex items-center gap-2 mb-2.5"><span className={`text-body font-black ${D?'text-white':'text-[#111]'}`}>{t('마감 임박','Deadline Soon')}</span><span className="text-mini font-black px-2 py-0.5 rounded-full bg-brand-lead/15 text-brand-lead-text">{urgent.length}</span></div>
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1">
                {urgent.map(({lead,days})=>{
                  return(
                    <button key={lead.id} onClick={()=>{setViewingLead(lead);setContentLang('ko');}} className="shrink-0 flex items-center gap-3 pl-3 pr-4 py-3 rounded-full border text-left transition hover:scale-[1.02] border-brand-lead/40 bg-brand-lead/10">
                      <div className="flex flex-col items-center justify-center px-2.5 py-1 rounded-xl bg-brand-lead/20">
                        <span className="text-lead font-black leading-none text-brand-lead-text">{days===0?'D-DAY':`D-${days}`}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`font-black text-body leading-tight truncate ${D?'text-white':'text-[#111]'}`}>{lead.artist}</p>
                        {lead.title&&<p className={`text-mini truncate ${dimText}`}>{lead.title}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {(!isHost||previewMode)&&(()=>{
          const openDemo=(drive?:any)=>{
            setPitchingLead(drive?{...drive,general:false,demo:true}:{id:null,artist:'',title:'',general:true});
            setPitchForm(guestProfile?{artist_name:guestProfile.artist_name||'',contact:guestProfile.phone||guestProfile.email||'',message:''}:emptyPitch());
            setPitchFiles([]);setPitchSent(false);setUploadProgress(0);setUploadError('');
          };
          return(
            <div className="relative z-10 mb-6 flex flex-col gap-2.5">
              {demoDrives.map(d=>{
                const exp=isExpired(d.deadline);
                return(
                  <button key={d.id} onClick={()=>openDemo(d)} disabled={exp} className={`w-full flex items-center gap-3 p-4 rounded-full border text-left transition active:scale-[0.99] sm:hover:scale-[1.01] ${exp?'opacity-40 grayscale':''} ${D?'border-brand-lead/30 bg-brand-lead/10 hover:bg-brand-lead/15':'border-brand-lead/25 bg-brand-lead/5 hover:bg-brand-lead/10'}`}>
                    <div className="w-11 h-11 rounded-xl bg-brand-lead/20 flex items-center justify-center text-sub shrink-0"><i className="ti ti-microphone" aria-hidden="true"></i></div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-black text-body truncate ${D?'text-white':'text-[#111]'}`}>{d.artist}</p>
                      <p className={`text-mini ${dimText}`}>{d.content?d.content.slice(0,40):t('데모 수급','Demo collection')}{d.deadline&&` · ~${d.deadline}`}</p>
                    </div>
                    {d.deadline&&<DeadlineDisplay lead={d} size="normal"/>}
                    <span className="text-brand-lead-text text-sub font-black shrink-0">→</span>
                  </button>
                );
              })}
              <button onClick={()=>openDemo()} className={`w-full flex items-center gap-3 p-4 rounded-full border border-dashed text-left transition active:scale-[0.99] ${D?'border-white/15 bg-white/[0.02] hover:bg-white/[0.04]':'border-black/15 bg-black/[0.02] hover:bg-black/[0.04]'}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sub shrink-0 ${D?'bg-white/5':'bg-black/[0.05]'}`}><i className="ti ti-microphone" aria-hidden="true"></i></div>
                <div className="min-w-0">
                  <p className={`font-black text-body ${D?'text-white':'text-[#111]'}`}>{t('자유 데모 보내기','Send a Demo')}</p>
                  <p className={`text-mini ${dimText}`}>{t('특정 항목과 상관없이 데모를 직접 전달해요','Submit a demo directly — no slot required')}</p>
                </div>
                <span className={`ml-auto text-sub font-black shrink-0 ${dimText}`}>→</span>
              </button>
            </div>
          );
        })()}

        {view==='calendar'&&(
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`hidden sm:flex border rounded-xl p-1 gap-1 ${D?' border-white/10':'bg-black/[0.04] border-black/[0.08]'}`}><button onClick={()=>setCalView('month')} className={`px-3 py-1 rounded-full text-mini font-bold transition ${calView==='month'?'bg-brand-lead text-white':dimText}`}>{t('월','Month')}</button><button onClick={()=>setCalView('week')} className={`px-3 py-1 rounded-full text-mini font-bold transition ${calView==='week'?'bg-brand-lead text-white':dimText}`}>{t('주','Week')}</button></div>
              {calView==='month'&&<div className="hidden sm:flex items-center gap-3"><button onClick={()=>setCurrentMonth(new Date(year,month-1))} className={`w-8 h-8 rounded-full border flex items-center justify-center text-body ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>‹</button><span className={`font-black text-lead ${D?'text-white':'text-[#111]'}`}>{globalEn?`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]} ${year}`:`${year}년 ${month+1}월`}</span><button onClick={()=>setCurrentMonth(new Date(year,month+1))} className={`w-8 h-8 rounded-full border flex items-center justify-center text-body ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>›</button></div>}
              {calView==='week'&&<div className="flex items-center gap-3"><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d);}} className={`w-8 h-8 rounded-full border flex items-center justify-center text-body ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>‹</button><span className={`font-black text-body ${D?'text-white':'text-[#111]'}`}>{weekDays[0].getMonth()+1}/{weekDays[0].getDate()} – {weekDays[6].getMonth()+1}/{weekDays[6].getDate()}</span><button onClick={()=>{const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d);}} className={`w-8 h-8 rounded-full border flex items-center justify-center text-body ${D?'bg-white/5 border-white/10 text-zinc-400 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>›</button></div>}
              <button onClick={()=>{setCurrentMonth(new Date());setWeekStart(startOfWeek(new Date()));}} className={`text-mini font-bold transition-colors ${D?'text-zinc-600 hover:text-white':'text-zinc-400 hover:text-[#111]'}`}>{t('오늘','Today')}</button>
            </div>
            <div className="hidden sm:grid grid-cols-7 mb-2">{DAYS.map((d,i)=><div key={d} className={`text-center text-mini font-black py-2 ${i===0?'text-red-400':i===6?'text-blue-400':D?'text-zinc-600':'text-zinc-400'}`}>{d}</div>)}</div>
            {calView==='month'&&<div className="hidden sm:grid grid-cols-7 gap-1">{Array.from({length:firstDay}).map((_,i)=><div key={`e-${i}`}/>)}{Array.from({length:daysInMonth}).map((_,i)=>{const day=i+1,ds=toDateStr(year,month+1,day),isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day,isPast=new Date(year,month,day)<new Date(new Date().toDateString());return<div key={day} {...pressable(() => isHost&&!previewMode&&openLeadForm(undefined,ds))} className={`min-h-[80px] rounded-xl p-1.5 border ${isToday?'border-brand-lead/50 bg-brand-lead/10':D?'border-white/5 /[0.02]':'border-black/[0.06] '} ${isPast&&!isToday?'opacity-50':''} ${isHost&&!previewMode?'cursor-pointer':''}`}><div className={`text-mini font-black mb-1 ${isToday?'text-brand-lead-text':isPast?D?'text-zinc-700':'text-zinc-400':D?'text-zinc-400':'text-zinc-500'}`}>{day}</div><div className="flex flex-col gap-0.5">{getLeadsForDate(ds).map(l=><LeadCard key={l.id} lead={l} compact/>)}</div></div>;})}</div>}
            {calView==='week'&&<div className="hidden sm:grid grid-cols-7 gap-1.5" style={{zoom:1.18}}>{weekDays.map((d,i)=>{const ds=toDateStr(d.getFullYear(),d.getMonth()+1,d.getDate()),isToday=d.toDateString()===today.toDateString(),isPast=d<new Date(new Date().toDateString()),dl=getLeadsForDate(ds);return<div key={ds} className={`min-h-[240px] rounded-xl p-2.5 border ${isToday?'border-brand-lead/50 bg-brand-lead/10':D?'border-white/5 /[0.02]':'border-black/[0.06] '} ${isPast&&!isToday?'opacity-50':''}`}><div className={`text-mini font-black mb-2 ${isToday?'text-brand-lead-text':isPast?D?'text-zinc-700':'text-zinc-400':i===0?'text-red-400':i===6?'text-blue-400':D?'text-zinc-400':'text-zinc-500'}`}>{DAYS[i]} {d.getDate()}</div><div className="flex flex-col gap-1.5">{dl.map(l=><LeadCard key={l.id} lead={l}/>)}{dl.length===0&&<div className={`text-micro text-center mt-4 ${D?'text-zinc-800':'text-zinc-300'}`}>—</div>}</div></div>;})}</div>}

            {/* 모바일: 주간 세로 리스트 (좌우 스와이프로 주 이동) */}
            <div className="sm:hidden"
              onTouchStart={e=>setSwipeX(e.touches[0].clientX)}
              onTouchEnd={e=>{if(swipeX===null)return;const dx=e.changedTouches[0].clientX-swipeX;if(dx<-50){const d=new Date(weekStart);d.setDate(d.getDate()+7);setWeekStart(d);}else if(dx>50){const d=new Date(weekStart);d.setDate(d.getDate()-7);setWeekStart(d);}setSwipeX(null);}}>
              <p className={`text-center text-mini font-bold mb-3 ${dimText}`}>← {t('밀어서 주 이동','swipe to change week')} →</p>
              <div className="flex flex-col gap-2">
                {weekDays.map((d,i)=>{const ds=toDateStr(d.getFullYear(),d.getMonth()+1,d.getDate()),isToday=d.toDateString()===today.toDateString(),isPast=d<new Date(new Date().toDateString()),dl=getLeadsForDate(ds);return(
                  <div key={ds} className={`cv-row rounded-xl p-3 border ${isToday?'border-brand-lead/50 bg-brand-lead/10':D?'border-white/5 /[0.02]':'border-black/[0.06] '} ${isPast&&!isToday?'opacity-50':''}`}>
                    <div className={`flex items-center gap-2 mb-1.5 ${isToday?'text-brand-lead-text':i===0?'text-red-400':i===6?'text-blue-400':D?'text-zinc-300':'text-zinc-600'}`}>
                      <span className="text-body font-black">{DAYS[i]}</span>
                      <span className="text-body font-black">{d.getMonth()+1}/{d.getDate()}</span>
                      {isToday&&<span className="text-micro font-black px-1.5 py-0.5 rounded-full bg-brand-lead text-white">{t('오늘','Today')}</span>}
                    </div>
                    {dl.length>0?<div className="flex flex-col gap-1.5">{dl.map(l=><LeadCard key={l.id} lead={l}/>)}</div>:<p className={`text-mini ${D?'text-zinc-700':'text-zinc-400'}`}>—</p>}
                  </div>
                );})}
              </div>
            </div>
          </div>
        )}

        {view==='list'&&(
          <div className="relative z-10">
            <div className={`flex flex-col gap-3 mb-5 p-4 rounded-xl border ${D?'/[0.02] border-white/5':'bg-black/[0.02] border-black/[0.06]'}`}>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-micro font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>{t('정렬','Sort')}</span>{([['dday','D-Day'],['gender',t('성별','Gender')],['group',t('솔로/그룹','Solo/Group')],['album',t('앨범','Album')]] as const).map(([v,l])=><FilterPill key={v} label={l} active={sortBy===v} onClick={()=>setSortBy(v as any)} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-micro font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>{t('성별','Gender')}</span>{[['male',t('남자','Male')],['female',t('여자','Female')],['mixed',t('혼성','Mixed')]].map(([v,l])=><FilterPill key={v} label={l} active={filterGender.includes(v)} onClick={()=>setFilterGender(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-micro font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>{t('타입','Type')}</span>{[['solo',t('솔로','Solo')],['group',t('그룹','Group')]].map(([v,l])=><FilterPill key={v} label={l} active={filterGroup.includes(v)} onClick={()=>setFilterGroup(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])} isDark={D}/>)}</div>
              <div className="flex items-center gap-2 flex-wrap"><span className={`text-micro font-black uppercase tracking-widest w-12 shrink-0 ${D?'text-zinc-600':'text-zinc-400'}`}>{t('앨범','Album')}</span>{[['single','Single'],['ep','EP'],['lp','LP'],['ost','OST']].map(([v,l])=><FilterPill key={v} label={l} active={filterAlbum.includes(v)} onClick={()=>setFilterAlbum(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])} isDark={D}/>)}</div>
              <button onClick={()=>setHidePast(v=>!v)} className={`self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-mini font-black transition ${hidePast?'bg-brand-lead border-brand-lead text-white':D?'border-white/10 bg-white/5 text-zinc-400 hover:text-white':'border-black/[0.08] bg-black/[0.04] text-zinc-500 hover:text-[#111]'}`}>{hidePast?'✓ ':''}{t('지난 리드 숨기기','Hide past leads')}</button>
            </div>
            {filteredLeads.length===0?<div className="empty-box text-center py-16 px-6"><p className={`text-body ${D?'text-zinc-700':'text-zinc-400'}`}>{t('해당하는 리드가 없어요','No leads found')}</p></div>:<div className="anim-rise grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{filteredLeads.map(lead=><LeadCard key={lead.id} lead={lead}/>)}</div>}
          </div>
        )}
        <div className={`relative z-10 mt-8 pb-8 text-center`}><p className={`text-mini ${D?'text-zinc-600':'text-zinc-400'}`}>Contact : everplayground@gmail.com</p></div>
      </main>

      {/* 모바일 하단 고정 탭바 */}
      <nav className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t backdrop-blur-xl ${D?'bg-surface-0/95 border-white/10':'bg-white/95 border-black/[0.08]'}`} style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
        {([
          ['list',t('목록','List'),()=>setView('list')],
          ['calendar',t('달력','Calendar'),()=>setView('calendar')],
          ['mine',t('내 피칭','My Pitch'),()=>{window.location.href='/mypage';}],
        ] as const).map(([key,label,fn])=>{
          const active=(key==='list'&&view==='list')||(key==='calendar'&&view==='calendar');
          return(
            <button key={key} onClick={fn as any} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${active?'text-brand-lead-text':D?'text-zinc-500':'text-zinc-400'}`}>
              <span className="text-mini font-normal">{label}</span>
            </button>
          );
        })}
      </nav>

      {viewingLead&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md font-ui p-0 sm:p-4" onClick={()=>setViewingLead(null)}>
          <div role="dialog" aria-modal="true" tabIndex={-1} className={`anim-rise w-full max-w-lg border rounded-t-[2rem] sm:rounded-[2rem] shadow-lg ${getCardColor(viewingLead.gender,viewingLead.group_type).bg} ${getCardColor(viewingLead.gender,viewingLead.group_type).border}`} onClick={e=>e.stopPropagation()}>
            <div className="p-5 sm:p-6 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-5">
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className={`text-micro font-black ${getCardColor(viewingLead.gender,viewingLead.group_type).text}`}>{getCardColor(viewingLead.gender,viewingLead.group_type).label}</span><AlbumBadge type={viewingLead.album_type||'single'}/></div><h2 className="text-white font-black text-title leading-tight">{viewingLead.artist}</h2><p className="text-zinc-400 text-body mt-0.5">{viewingLead.title}</p></div>
                <div className="ml-3 shrink-0"><DeadlineDisplay lead={viewingLead} size="large"/></div>
              </div>
              {viewingLead.content&&(
                <div className="mb-5">
                  <div className="flex gap-1 mb-3">
                    <button onClick={()=>setContentLang('ko')} className={`px-3 py-1 rounded-full text-micro font-black transition border ${contentLang==='ko'?'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text':'border-white/10 text-zinc-500 hover:text-white'}`}>KO</button>
                    <button onClick={()=>switchToEn(viewingLead)} disabled={translating} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-micro font-black transition border disabled:opacity-50 ${contentLang==='en'?'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text':'border-white/10 text-zinc-500 hover:text-white'}`}>
                      {translating?<><div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin"/>번역 중</>:'EN'}
                    </button>
                  </div>
                  <div className=" border border-white/10 rounded-xl p-4">
                    {contentLang==='en'&&getEnContent(viewingLead)
                      ?renderSections(getEnContent(viewingLead)!)
                      :renderContent(viewingLead.content||'')}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {(!isHost||previewMode)&&(<button onClick={()=>{
                  setPitchingLead(viewingLead);
                  setPitchForm(guestProfile?{artist_name:guestProfile.artist_name||'',contact:guestProfile.phone||guestProfile.email||'',message:''}:emptyPitch());
                  setPitchFiles([]);setPitchSent(false);setUploadProgress(0);setUploadError('');setViewingLead(null);
                }} className="flex-1 py-3 rounded-full bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition inline-flex items-center justify-center gap-1.5"><i className="ti ti-music" aria-hidden="true"></i>{t('피칭하기','Pitch')}</button>)}
                {isHost&&!previewMode&&<button onClick={()=>{openLeadForm(viewingLead);setViewingLead(null);}} className="flex-1 py-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-body hover:bg-amber-500/20 transition"><i className="ti ti-pencil" aria-hidden="true"></i> 수정</button>}
                {isHost&&!previewMode&&<button onClick={()=>{if(confirm('삭제?')){deleteLead(viewingLead.id);setViewingLead(null);}}} className="py-3 px-4 rounded-full border border-red-500/20 text-red-400 text-body hover:bg-red-500/10 transition"><i className="ti ti-trash" aria-hidden="true"></i></button>}
                <button onClick={()=>setViewingLead(null)} className="py-3 px-5 rounded-full border border-white/10 text-zinc-500 font-bold text-body hover:text-white transition">{t('닫기','Close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {errToast&&<div role="alert" className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-red-500/15 backdrop-blur-md border border-red-400/40 text-red-200 text-mini font-bold px-5 py-3 rounded-xl shadow-lg max-w-[90vw] text-center">{errToast}</div>}
      {shareToast&&<div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] backdrop-blur-md border border-white/20 text-white text-mini font-bold px-5 py-3 rounded-xl shadow-lg"><i className="ti ti-link" aria-hidden="true"></i> 링크가 복사됐어요!</div>}

      {showLeadForm&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md font-ui p-0 sm:p-4 overflow-y-auto">
          <div role="dialog" aria-modal="true" tabIndex={-1} className={`anim-rise w-full max-w-lg border rounded-t-[2rem] sm:rounded-[2rem] shadow-lg sm:my-4 max-h-[92vh] overflow-y-auto ${D?'bg-surface-2 border-[rgba(255,255,255,0.08)]':'bg-white border-black/[0.08]'}`} onClick={e=>e.stopPropagation()}>
            <div className="p-5 sm:p-6">
              <h2 className={`font-black text-sub mb-5 ${D?'text-white':'text-[#111]'}`}>{editingLead?<><i className="ti ti-pencil" aria-hidden="true"></i> 리드 수정</>:<>+ 리드 추가</>}</h2>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>아티스트명 *</label><input value={lArtist} onChange={e=>setLArtist(e.target.value)} placeholder="아티스트명" className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`}/></div>
                  <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>레이블</label><input value={lTitle} onChange={e=>setLTitle(e.target.value)} placeholder="레이블" className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition ${inputCls}`}/></div>
                </div>
                <div>
                  <p className={`text-micro font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>성별 *</p>
                  <div className="flex gap-2">{[['male','남자'],['female','여자'],['mixed','혼성']].map(([v,l])=><button key={v} onClick={()=>setLGender(v)} className={`flex-1 py-2 rounded-full text-mini font-bold border transition ${lGender===v?'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text':D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{l}</button>)}</div>
                </div>
                <div>
                  <p className={`text-micro font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>솔로/그룹 *</p>
                  <div className="flex gap-2">{[['solo','솔로'],['group','그룹']].map(([v,l])=><button key={v} onClick={()=>setLGroup(v)} className={`flex-1 py-2 rounded-full text-mini font-bold border transition ${lGroup===v?'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text':D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{l}</button>)}</div>
                </div>
                <div>
                  <p className={`text-micro font-black uppercase tracking-widest mb-2 ${D?'text-zinc-500':'text-zinc-400'}`}>앨범 타입</p>
                  <div className="flex gap-2">{[['single','Single'],['ep','EP'],['lp','LP'],['ost','OST']].map(([v,l])=><button key={v} onClick={()=>setLAlbum(v)} className={`flex-1 py-2 rounded-full text-mini font-bold border transition ${lAlbum===v?'bg-brand-lead/20 border-brand-lead/50 text-brand-lead-text':D?'bg-white/5 border-white/10 text-zinc-500 hover:text-white':'bg-black/[0.04] border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{l}</button>)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>1차 마감</label><input type="date" value={lDeadline} onChange={e=>setLDeadline(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`}/></div>
                  <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>2차 마감</label><input type="date" value={lDeadline2} onChange={e=>setLDeadline2(e.target.value)} className={`w-full border rounded-xl px-3 py-2.5 text-body outline-none transition ${inputCls}`}/></div>
                </div>
                <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>리드 내용</label><textarea value={lContent} onChange={e=>setLContent(e.target.value)} placeholder="곡 설명, 레퍼런스 링크 등" rows={4} className={`w-full border rounded-xl px-4 py-3 text-body outline-none transition resize-none leading-relaxed ${inputCls}`}/></div>
              </div>
              {leadSaveError&&<p className="mt-3 text-red-400 text-mini bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{leadSaveError}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={()=>{setShowLeadForm(false);setLeadSaveError('');}} disabled={leadSaving} className={`flex-1 py-3 rounded-full border font-bold text-body transition disabled:opacity-40 ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>취소</button>
                <button onClick={saveLead} disabled={leadSaving||!lArtist.trim()||!lGender||!lGroup} className="flex-1 py-3 rounded-full bg-brand-lead text-white font-semibold text-body hover:opacity-90 transition disabled:opacity-40 disabled:hover:scale-100">{leadSaving?'저장 중...':(editingLead?'수정 완료':'추가')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pitchingLead&&(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md font-ui p-0 sm:p-4 overflow-y-auto" onClick={()=>{if(!pitchLoading){setPitchingLead(null);setPitchSent(false);}}}>
          <div role="dialog" aria-modal="true" tabIndex={-1} className={`anim-rise w-full max-w-lg border rounded-t-[2rem] sm:rounded-[2rem] shadow-lg sm:my-4 max-h-[92vh] overflow-y-auto ${D?'bg-surface-2 border-[rgba(255,255,255,0.08)]':'bg-white border-black/[0.08]'}`} onClick={e=>e.stopPropagation()}>
            <div className="p-5 sm:p-6">
              {pitchSent?(
                <div className="text-center py-10">
                  <div className="text-display mb-4 text-brand-lead-text"><i className="ti ti-circle-check" aria-hidden="true"></i></div>
                  <h2 className={`font-black text-title mb-2 ${D?'text-white':'text-[#111]'}`}>{t('피칭 완료!','Pitch sent!')}</h2>
                  <p className={`text-body ${dimText}`}>{pitchingLead.general?t('자유 데모','Free demo'):pitchingLead.demo?<span className={`font-bold ${D?'text-white':'text-[#111]'}`}>{pitchingLead.artist}</span>:<><span className={`font-bold ${D?'text-white':'text-[#111]'}`}>{pitchingLead.artist}</span> — {pitchingLead.title}</>}</p>
                  <p className={`text-mini mt-1 ${dimText}`}>{pitchForm.artist_name}{pitchFiles.length>0&&` · ${t('파일','files')} ${pitchFiles.length}`}</p>
                  <p className={`text-mini mt-3 ${D?'text-zinc-600':'text-zinc-400'}`}>{t('담당자가 확인 후 연락드릴게요.','We will reach out after review.')}</p>
                  <button onClick={()=>{setPitchingLead(null);setPitchSent(false);}} className={`mt-6 w-full py-3 rounded-full border font-bold text-body transition ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{t('닫기','Close')}</button>
                </div>
              ):(
                <>
                  <div className="mb-5"><h2 className={`font-black text-sub ${D?'text-white':'text-[#111]'}`}>{(pitchingLead.general||pitchingLead.demo)?`${t('데모 보내기','Send a Demo')}`:`${t('피칭하기','Pitch')}`}</h2><p className={`text-mini mt-0.5 ${dimText}`}>{pitchingLead.general?t('특정 항목과 상관없이 데모를 전달해요','Submit a demo — no slot required'):pitchingLead.demo?pitchingLead.artist:`${pitchingLead.artist} — ${pitchingLead.title}`}</p></div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>아티스트명 *</label><input value={pitchForm.artist_name} onChange={e=>setPitchForm(p=>({...p,artist_name:e.target.value}))} placeholder="아티스트명" className={`w-full border rounded-xl px-4 py-3 text-lead sm:text-body outline-none transition ${inputCls}`}/></div>
                      <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>연락처 *</label><input value={pitchForm.contact} onChange={e=>setPitchForm(p=>({...p,contact:e.target.value}))} placeholder="이메일/전화/카카오" className={`w-full border rounded-xl px-4 py-3 text-lead sm:text-body outline-none transition ${inputCls}`}/></div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2"><label className={`text-micro font-black uppercase tracking-widest ${D?'text-zinc-500':'text-zinc-400'}`}>데모 파일 <span className={`font-normal normal-case ${D?'text-zinc-700':'text-zinc-400'}`}>MP3 · 최대 50MB</span></label>{pitchFiles.length>0&&<span className={`text-mini ${D?'text-zinc-600':'text-zinc-400'}`}>{pitchFiles.length}개</span>}</div>
                      {pitchFiles.length>0&&<div className="flex flex-col gap-2 mb-3">{pitchFiles.map(item=><FileItem key={item.id} item={item}/>)}</div>}
                      <input ref={fileInputRef} type="file" accept=".mp3,audio/mpeg" multiple className="hidden" onChange={handleFileInput}/>
                      <div onDragOver={e=>e.preventDefault()} onDrop={handleFileDrop} {...pressable(() => fileInputRef.current?.click())} className={`border-2 border-dashed rounded-xl p-6 sm:p-4 text-center cursor-pointer transition active:scale-[0.99] ${D?'border-white/10 hover:border-white/20 hover:/[0.02]':'border-black/[0.08] hover:border-black/20 hover:bg-black/[0.02]'}`}>
                        <p className={`text-body sm:text-mini font-bold ${D?'text-zinc-400':'text-zinc-500'}`}>＋ 파일 추가</p>
                        <p className={`text-mini mt-1 ${D?'text-zinc-700':'text-zinc-400'}`}>클릭 또는 드래그 · 여러 개 동시 선택</p>
                      </div>
                    </div>
                    <div><label className={`text-micro font-black uppercase tracking-widest mb-1.5 block ${D?'text-zinc-500':'text-zinc-400'}`}>세부사항 <span className={`font-normal normal-case ${D?'text-zinc-700':'text-zinc-400'}`}>(선택)</span></label><textarea value={pitchForm.message} onChange={e=>setPitchForm(p=>({...p,message:e.target.value}))} placeholder="포트폴리오 링크, 제작 의도, 기타 전달사항 등" rows={3} className={`w-full border rounded-xl px-4 py-3 text-lead sm:text-body outline-none transition resize-none leading-relaxed ${inputCls}`}/></div>
                  </div>
                  {pitchLoading&&<div className="mt-4"><div className="flex items-center justify-between mb-1.5"><span className={`text-mini ${dimText}`}>업로드 중...</span><span className={`text-mini font-bold ${D?'text-zinc-400':'text-zinc-500'}`}>{uploadProgress}%</span></div><div className={`w-full h-1.5 rounded-full overflow-hidden ${D?'bg-white/10':'bg-black/[0.08]'}`}><div className="h-full bg-brand-lead rounded-full transition" style={{width:`${uploadProgress}%`}}/></div></div>}
                  {uploadError&&<p className="mt-3 text-red-400 text-mini bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{uploadError}</p>}
                  <div className="flex gap-3 mt-5">
                    <button onClick={()=>{setPitchingLead(null);setPitchSent(false);}} disabled={pitchLoading} className={`py-3.5 px-5 rounded-full border font-bold text-body transition disabled:opacity-40 ${D?'border-white/10 text-zinc-500 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>취소</button>
                    <button onClick={submitPitch} disabled={pitchLoading||!pitchForm.artist_name.trim()||!pitchForm.contact.trim()||pitchFiles.some(f=>f.analyzing)} className="flex-1 py-3.5 rounded-full bg-brand-lead text-white font-semibold text-body active:scale-[0.99] hover:opacity-90 transition disabled:opacity-40">
                      {pitchLoading?'전송 중...':pitchFiles.length>0?`${pitchFiles.length}개 파일과 함께 제출`:'피칭 제출'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 채팅 패널 */}
      {currentUser&&authStatus==='approved'&&(
        <ChatPanel user={currentUser} hostId={hostId} dark={D} liftMobile/>
      )}

      {/* 드래그 줌 (왼쪽 하단, 더블클릭 시 100%) */}
      {authStatus==='approved'&&(
        <div className="flex fixed bottom-6 left-6 z-50 flex-col items-center gap-1.5 select-none font-ui">
          <button onClick={()=>applyZoom(zoom+0.1)} title="확대" className={`w-9 h-9 rounded-full border backdrop-blur-md shadow-xl flex items-center justify-center transition hover:border-brand-lead/40 ${D?'bg-white/[0.05] border-white/10 text-zinc-400':'bg-black/[0.04] border-black/10 text-zinc-600'}`}>
            <svg width="12" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 5L5 1L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div onMouseDown={onZoomDown} onTouchStart={onZoomTouch} onDoubleClick={()=>applyZoom(1)} title="드래그로 확대/축소 · 더블클릭 리셋"
            className={`w-9 h-10 rounded-xl border backdrop-blur-md shadow-xl cursor-ns-resize touch-none flex flex-col items-center justify-center gap-[3px] transition ${D?'/[0.05] border-white/10':'bg-black/[0.04] border-black/10'}`}>
            {[0,1,2].map(i=><div key={i} className="w-3.5 h-[1.5px] rounded-full bg-zinc-500"/>)}
          </div>
          <button onClick={()=>applyZoom(zoom-0.1)} title="축소" className={`w-9 h-9 rounded-full border backdrop-blur-md shadow-xl flex items-center justify-center transition hover:border-brand-lead/40 ${D?'bg-white/[0.05] border-white/10 text-zinc-400':'bg-black/[0.04] border-black/10 text-zinc-600'}`}>
            <svg width="12" height="7" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className={`text-micro font-black tracking-widest ${dimText}`}>{Math.round(zoom*100)}%</span>
        </div>
      )}

      {showInstall&&(
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md font-ui p-0 sm:p-4" onClick={()=>setShowInstall(false)}>
          <div role="dialog" aria-modal="true" tabIndex={-1} className={`anim-rise w-full max-w-sm border rounded-t-[2rem] sm:rounded-[2rem] shadow-lg p-6 ${D?'bg-surface-2 border-[rgba(255,255,255,0.08)]':'bg-white border-black/[0.08]'}`} onClick={e=>e.stopPropagation()}>
            <div className="text-center">
              <div className="text-display mb-3 opacity-40"><i className="ti ti-device-mobile" aria-hidden="true"></i></div>
              <h2 className={`font-black text-sub mb-2 ${D?'text-white':'text-[#111]'}`}>{t('홈 화면에 추가','Add to Home Screen')}</h2>
              <p className={`text-body leading-relaxed ${dimText}`}>
                {t('Safari 하단의','Tap the')} <span className="font-black text-brand-lead-text">{t('공유 버튼','Share button')} ⎙</span> {t('을 누른 뒤','then choose')}<br/>
                <span className="font-black text-brand-lead-text">"{t('홈 화면에 추가','Add to Home Screen')}"</span> {t('를 선택하세요.','.')}
              </p>
            </div>
            <button onClick={()=>setShowInstall(false)} className={`mt-6 w-full py-3 rounded-full border font-bold text-body ${D?'border-white/10 text-zinc-400 hover:text-white':'border-black/[0.08] text-zinc-500 hover:text-[#111]'}`}>{t('확인','Got it')}</button>
          </div>
        </div>
      )}
    </>
  );
}