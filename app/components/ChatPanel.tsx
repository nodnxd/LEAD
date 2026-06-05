'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Props { user: any; hostId: string; dark: boolean; }

export default function ChatPanel({ user, hostId, dark: D }: Props) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [tab, setTab] = useState<'members' | 'chats'>('members');
  const [opacity, setOpacity] = useState(97);
  const [members, setMembers] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const [inputVal, setInputVal] = useState(''); // send 버튼 disabled용, 실제 값은 ref
  const [viewingMember, setViewingMember] = useState<any>(null);
  const [memberWorks, setMemberWorks] = useState<any[]>([]);
  const [emailSearch, setEmailSearch] = useState('');
  const [emailSearching, setEmailSearching] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);
  const [toast, setToast] = useState<{ senderName: string; content: string; senderId: string; convId: string; avatar: any } | null>(null);
  const [extraProfiles, setExtraProfiles] = useState<Record<string, any>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentIds = useRef<Set<string>>(new Set());
  const activeConvRef = useRef<any>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const membersRef = useRef<any[]>([]);

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { membersRef.current = members; }, [members]);

  // members에 없는 유저 프로필 fetch (호스트 포함)
  const fetchExtraProfile = useCallback(async (uid: string) => {
    if (!uid || membersRef.current.find(m => m.id === uid)) return;
    setExtraProfiles(prev => {
      if (prev[uid] !== undefined) return prev; // 이미 있으면 스킵
      return { ...prev, [uid]: null }; // placeholder 설정 후 fetch
    });
    const { data: m } = await supabase.from('members').select('id,artist_name,photo_url,roles').eq('id', uid).single();
    if (m) { setExtraProfiles(prev => ({ ...prev, [uid]: m })); return; }
    const { data: h } = await supabase.from('host_profiles').select('id,display_name,photo_url').eq('id', uid).single();
    if (h) { setExtraProfiles(prev => ({ ...prev, [uid]: { ...h, artist_name: h.display_name } })); return; }
    // members도 host_profiles도 없으면 auth.users에서 이메일 기반으로 표시
    setExtraProfiles(prev => ({ ...prev, [uid]: { id: uid, artist_name: uid.slice(0,8) } }));
  }, []);

  const lookupProfile = (uid: string) => membersRef.current.find(m => m.id === uid) || extraProfiles[uid] || null;

  // convs가 바뀔 때마다 파트너 프로필 미리 로드
  useEffect(() => {
    if (!user || !convs.length) return;
    convs.forEach(conv => {
      const oid = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
      fetchExtraProfile(oid);
    });
  }, [convs, user, fetchExtraProfile]);

  const fetchMembers = useCallback(async () => {
    if (!hostId) return;
    const { data } = await supabase
      .from('member_approvals')
      .select('member_id,status,members(id,artist_name,photo_url,roles,name,company,instagram,genres,email)')
      .eq('host_id', hostId).in('status', ['approved', 'admin']);
    let list = (data || []).map((a: any) => a.members).filter(Boolean);
    // 게스트라면 호스트를 멤버 목록에 자동 포함
    if (user?.id && user.id !== hostId) {
      if (!list.find((m: any) => m.id === hostId)) {
        const { data: hm } = await supabase.from('members').select('id,artist_name,photo_url,roles,name,company,instagram,genres,email').eq('id', hostId).single();
        if (hm) list = [hm, ...list];
        else {
          const { data: hp } = await supabase.from('host_profiles').select('id,display_name,photo_url').eq('id', hostId).single();
          if (hp) list = [{ id: hp.id, artist_name: hp.display_name, name: hp.display_name, photo_url: hp.photo_url, roles: ['HOST'] }, ...list];
        }
      }
    }
    setMembers(list.filter((m: any) => m.id !== user?.id));
  }, [hostId, user?.id]);

  const fetchConvs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('conversations').select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    if (data) {
      setConvs(data);
      const ids = data.map((c: any) => c.id);
      if (ids.length > 0) {
        const { data: u } = await supabase.from('messages').select('id').in('conversation_id', ids).eq('read', false).neq('sender_id', user.id);
        setUnread(u?.length || 0);
      } else {
        setUnread(0);
      }
    }
  }, [user]);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('friendships').select('*').or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
    if (data) setFriendships(data);
  }, [user]);

  const autoFriendDone = useRef(false);

  useEffect(() => {
    if (!user) return;
    fetchMembers(); fetchConvs(); fetchFriendships();
  }, [fetchMembers, fetchConvs, fetchFriendships]);

  // 같은 팀(같은 호스트)에 속한 모든 사람끼리 자동 친구
  useEffect(() => {
    if (!user || autoFriendDone.current) return;
    if (members.length === 0) return; // 멤버 로딩 기다림 (게스트는 호스트 포함)
    autoFriendDone.current = true;
    const doAutoFriend = async () => {
      // 팀 전원: 멤버 목록(호스트 포함) + 호스트 id, 본인 제외
      const targets = [...new Set([...members.map(m => m.id), hostId])].filter(id => id && id !== user.id);
      for (const tid of targets) {
        const { data: exists } = await supabase.from('friendships').select('id')
          .or(`and(requester_id.eq.${user.id},recipient_id.eq.${tid}),and(requester_id.eq.${tid},recipient_id.eq.${user.id})`);
        if (!exists || exists.length === 0) {
          await supabase.from('friendships').insert({ requester_id: user.id, recipient_id: tid, status: 'accepted' });
        } else if (exists[0] && exists[0].id) {
          // 이미 있으면 accepted로 업데이트
          await supabase.from('friendships').update({ status: 'accepted' }).eq('id', exists[0].id);
        }
      }
      fetchFriendships();
    };
    doAutoFriend();
  }, [members.length, user?.id, hostId, fetchFriendships]);

  const showToast = useCallback((senderName: string, content: string, senderId: string, convId: string, avatar: any) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ senderName, content, senderId, convId, avatar });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`chat_${user.id}_${hostId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (sentIds.current.has(msg.id)) return;
        const curConv = activeConvRef.current;
        if (curConv && msg.conversation_id === curConv.id) {
          setMsgs(p => [...p, msg]);
          markRead(curConv.id);
        } else {
          // 새 메시지 토스트 알림
          fetchConvs();
          const sender = membersRef.current.find(m => m.id === msg.sender_id);
          showToast(
            sender?.artist_name || '누군가',
            msg.content,
            msg.sender_id,
            msg.conversation_id,
            sender
          );
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMsgs(p => p.filter(m => m.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, hostId, fetchConvs, showToast]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const markRead = async (convId: string) => {
    if (!user) return;
    await supabase.from('messages').update({ read: true }).eq('conversation_id', convId).neq('sender_id', user.id);
    fetchConvs();
  };

  const openConv = async (otherId: string) => {
    if (!user) return;
    const [p1, p2] = [user.id, otherId].sort();
    let { data: conv } = await supabase.from('conversations').select('*').eq('participant_1', p1).eq('participant_2', p2).single();
    if (!conv) {
      const { data: c } = await supabase.from('conversations').insert({ participant_1: p1, participant_2: p2 }).select().single();
      conv = c;
    }
    if (!conv) return;
    setViewingMember(null);
    setActiveConv(conv);
    const { data: m } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
    if (m) setMsgs(m);
    markRead(conv.id);
    fetchConvs();
    setOpen(true);
    setMinimized(false);
  };

  const sendMsg = async () => {
    const content = inputRef.current?.value.trim() || '';
    if (!content || !activeConv || !user || sending) return;
    setSending(true);
    setInputVal('');
    if (inputRef.current) inputRef.current.value = '';
    const { data: msg } = await supabase.from('messages')
      .insert({ conversation_id: activeConv.id, sender_id: user.id, content })
      .select().single();
    if (msg) {
      sentIds.current.add(msg.id);
      setMsgs(p => [...p, msg]);
      await supabase.from('conversations').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', activeConv.id);
      fetchConvs();
    }
    setSending(false);
  };

  const deleteMsg = async (msgId: string) => {
    await supabase.from('messages').delete().eq('id', msgId).eq('sender_id', user.id);
    setMsgs(p => p.filter(m => m.id !== msgId));
  };

  const deleteConv = async (convId: string) => {
    await supabase.from('messages').delete().eq('conversation_id', convId);
    await supabase.from('conversations').delete().eq('id', convId);
    setConvs(p => p.filter(c => c.id !== convId));
    if (activeConv?.id === convId) { setActiveConv(null); setMsgs([]); }
    fetchConvs();
  };

  const openMemberProfile = async (m: any) => {
    setViewingMember(m);
    setActiveConv(null); setMsgs([]);
    const { data: w } = await supabase.from('released_works').select('*').eq('member_id', m.id).order('order_index');
    setMemberWorks(w || []);
  };

  const sendFriendReq = async (recipientId: string) => {
    await supabase.from('friendships').insert({ requester_id: user.id, recipient_id: recipientId });
    fetchFriendships();
  };
  const respondFriend = async (id: string, status: 'accepted' | 'rejected') => {
    await supabase.from('friendships').update({ status }).eq('id', id);
    fetchFriendships();
  };
  const getFriendState = (memberId: string) => friendships.find(f => f.requester_id === memberId || f.recipient_id === memberId);
  const getOther = (conv: any) => {
    const oid = conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1;
    const found = lookupProfile(oid);
    if (!found) fetchExtraProfile(oid);
    return found;
  };
  const incomingReqs = friendships.filter(f => f.recipient_id === user?.id && f.status === 'pending');

  const searchByEmail = async () => {
    if (!emailSearch.trim()) return;
    setEmailSearching(true); setEmailResult(null);
    const { data } = await supabase.from('members').select('id,artist_name,photo_url,roles,genres,email').eq('email', emailSearch.trim().toLowerCase()).single();
    setEmailResult(data || 'notfound');
    setEmailSearching(false);
  };

  const ROLE: Record<string, string> = { producer: 'Producer', topliner: 'Top-liner', lyricist: 'Lyricist', engineer: 'Engineer', ar: 'A&R' };
  const bd = D ? 'border-white/[0.08]' : 'border-black/[0.08]';
  const tx = D ? 'text-white' : 'text-[#111]';
  const dm = D ? 'text-zinc-500' : 'text-zinc-500';
  const ib = D ? 'bg-white/[0.06] border-white/10 text-white placeholder:text-zinc-600' : 'bg-black/[0.04] border-black/[0.08] text-[#111] placeholder:text-zinc-400';

  const Avatar = ({ p, size = 32 }: { p: any; size?: number }) => (
    <div className="rounded-full bg-[#5B8CFF]/15 border border-[#5B8CFF]/25 flex items-center justify-center overflow-hidden shrink-0" style={{ width: size, height: size }}>
      {p?.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="font-black text-[#5B8CFF]" style={{ fontSize: size * 0.38 }}>{(p?.artist_name || p?.display_name || '?')[0].toUpperCase()}</span>}
    </div>
  );

  return (
    <>
      {/* 새 메시지 토스트 */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[60] max-w-[280px] rounded-2xl shadow-2xl border cursor-pointer overflow-hidden"
          style={{ backgroundColor: D ? '#1a1a1a' : '#fff', borderColor: D ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', fontFamily: 'Pretendard,sans-serif' }}
          onClick={() => { openConv(toast.senderId); setToast(null); }}
        >
          <div className="flex items-start gap-2.5 px-4 py-3">
            <Avatar p={toast.avatar} size={36} />
            <div className="flex-1 min-w-0">
              <p className={`font-black text-[12px] ${tx}`}>{toast.senderName}</p>
              <p className={`text-[11px] truncate mt-0.5 ${dm}`}>{toast.content}</p>
            </div>
            <button onClick={e => { e.stopPropagation(); setToast(null); }} className={`text-[12px] ${dm} hover:text-red-400 mt-0.5 shrink-0`}>✕</button>
          </div>
          <div className="flex gap-2 px-4 pb-3">
            <button
              onClick={e => { e.stopPropagation(); const s = toast.senderId; const fs = friendships.find(f => f.requester_id === s || f.recipient_id === s); if (!fs) sendFriendReq(s); }}
              className={`flex-1 py-1.5 rounded-xl border text-[10px] font-black transition-all ${D ? 'border-white/10 text-zinc-400 hover:text-white' : 'border-black/[0.08] text-zinc-500'}`}
            >
              {(() => { const fs = friendships.find(f => f.requester_id === toast.senderId || f.recipient_id === toast.senderId); return fs?.status === 'accepted' ? '✓ 친구' : fs ? '요청중' : '+친구'; })()}
            </button>
            <button
              onClick={e => { e.stopPropagation(); openConv(toast.senderId); setToast(null); }}
              className="flex-1 py-1.5 rounded-xl bg-[#5B8CFF] text-white text-[10px] font-black"
            >💬 답장</button>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => { setOpen(o => !o); setMinimized(false); }}
        className={`fixed bottom-6 right-6 z-40 rounded-2xl flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 ${D ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-black/[0.08]'}`}
        style={{ width: 52, height: 52 }}
      >
        <span className="text-[20px]">💬</span>
        {(unread > 0 || incomingReqs.length > 0) && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
            <span className="text-white text-[10px] font-black">{unread + incomingReqs.length > 9 ? '9+' : unread + incomingReqs.length}</span>
          </div>
        )}
      </button>

      {/* 메신저 패널 */}
      {open && (
        <div
          className={`fixed bottom-[76px] right-6 z-50 w-[360px] rounded-2xl border shadow-2xl flex flex-col transition-all duration-200 ${bd}`}
          style={{
            height: minimized ? 'auto' : 500,
            fontFamily: 'Pretendard,sans-serif',
            opacity: opacity / 100,
            backgroundColor: D ? '#0d0d0d' : '#ffffff',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* 헤더 */}
          <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${bd} shrink-0`}>
            {(activeConv || viewingMember) ? (
              <button onClick={() => { setActiveConv(null); setMsgs([]); setViewingMember(null); fetchConvs(); }}
                className={`${dm} text-[18px] leading-none mr-0.5 hover:${tx}`}>←</button>
            ) : null}

            {activeConv && (() => {
              const oid = activeConv.participant_1 === user?.id ? activeConv.participant_2 : activeConv.participant_1;
              const other = getOther(activeConv);
              return (
                <button className="flex items-center gap-1.5 flex-1 min-w-0 text-left" onClick={() => other && openMemberProfile(other)}>
                  <Avatar p={other} />
                  <span className={`flex-1 text-[13px] font-black truncate ${tx} ml-1`}>{other?.artist_name || '...'}</span>
                </button>
              );
            })()}

            {viewingMember && (
              <><Avatar p={viewingMember} /><span className={`flex-1 text-[13px] font-black truncate ${tx} ml-1.5`}>{viewingMember.artist_name}</span></>
            )}

            {!activeConv && !viewingMember && (
              <span className={`font-black text-[14px] flex-1 ${tx}`}>
                채팅 {(incomingReqs.length > 0) && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{incomingReqs.length}</span>}
              </span>
            )}

            {activeConv && (
              <button onClick={() => { if (confirm('대화를 삭제할까요?')) deleteConv(activeConv.id); }}
                className={`text-[12px] font-black px-1.5 py-0.5 rounded-lg ${dm} hover:text-red-400 hover:bg-red-500/10 transition-all`}>✕</button>
            )}

            <input type="range" min={20} max={100} value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-16 cursor-pointer accent-[#5B8CFF]" title="투명도" />
            <button onClick={() => setMinimized(m => !m)}
              className={`w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-black ${dm} hover:${tx} transition-all`}>
              {minimized ? '▲' : '▼'}
            </button>
            <button onClick={() => { setOpen(false); setActiveConv(null); setMsgs([]); setViewingMember(null); }}
              className={`w-6 h-6 flex items-center justify-center rounded-lg text-[13px] font-black ${dm} hover:text-red-400 transition-all`}>✕</button>
          </div>

          {!minimized && (
            <>
              {/* 친구 요청 */}
              {!activeConv && !viewingMember && incomingReqs.length > 0 && (
                <div className={`px-3 py-2 border-b ${bd} shrink-0`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${dm}`}>친구 요청</p>
                  {incomingReqs.map(req => {
                    const m = members.find(x => x.id === req.requester_id);
                    return (
                      <div key={req.id} className="flex items-center gap-2 mb-1">
                        <button onClick={() => m && openMemberProfile(m)}><Avatar p={m} /></button>
                        <span className={`flex-1 text-[11px] font-bold truncate ${tx}`}>{m?.artist_name || '알 수 없음'}</span>
                        <button onClick={() => respondFriend(req.id, 'accepted')} className="px-2 py-0.5 rounded-lg bg-[#5B8CFF]/20 text-[#5B8CFF] text-[10px] font-black">✓</button>
                        <button onClick={() => respondFriend(req.id, 'rejected')} className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-black">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 탭 */}
              {!activeConv && !viewingMember && (
                <div className={`flex border-b ${bd} shrink-0`}>
                  {(['members', 'chats'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-2.5 text-[11px] font-black transition-all ${tab === t ? `${tx} border-b-2 border-[#5B8CFF]` : dm}`}>
                      {t === 'members' ? `멤버 (${members.length})` : `대화 (${convs.length})`}
                    </button>
                  ))}
                </div>
              )}

              {/* 멤버 목록 */}
              {!activeConv && !viewingMember && tab === 'members' && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {/* 이메일로 친구 추가 */}
                  <div className={`px-3 pt-3 pb-2 border-b ${bd}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${dm}`}>이메일로 친구 추가</p>
                    <div className="flex gap-1.5">
                      <input
                        value={emailSearch}
                        onChange={e => { setEmailSearch(e.target.value); setEmailResult(null); }}
                        onKeyDown={e => e.key === 'Enter' && searchByEmail()}
                        placeholder="이메일 입력"
                        className={`flex-1 border rounded-xl px-2.5 py-1.5 text-[11px] outline-none transition-all ${ib}`}
                      />
                      <button onClick={searchByEmail} disabled={emailSearching}
                        className="px-2.5 py-1.5 rounded-xl bg-[#5B8CFF]/20 text-[#5B8CFF] text-[10px] font-black disabled:opacity-40">
                        {emailSearching ? '...' : '검색'}
                      </button>
                    </div>
                    {emailResult && emailResult !== 'notfound' && (
                      <div className="flex items-center gap-2 mt-2 px-1 py-1.5 rounded-xl">
                        <Avatar p={emailResult} size={28} />
                        <span className={`flex-1 text-[11px] font-bold truncate ${tx}`}>{emailResult.artist_name}</span>
                        {(() => {
                          const fs = getFriendState(emailResult.id);
                          if (emailResult.id === user?.id) return <span className={`text-[9px] ${dm}`}>나</span>;
                          if (fs?.status === 'accepted') return <span className="text-[9px] text-emerald-400 font-black">친구</span>;
                          if (fs) return <span className={`text-[9px] ${dm}`}>요청중</span>;
                          return <button onClick={() => sendFriendReq(emailResult.id)} className="px-2 py-0.5 rounded-lg bg-[#5B8CFF]/20 text-[#5B8CFF] text-[10px] font-black">+추가</button>;
                        })()}
                      </div>
                    )}
                    {emailResult === 'notfound' && <p className={`text-[10px] mt-1.5 ${dm}`}>해당 이메일의 멤버를 찾을 수 없어요</p>}
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
                    {members.length === 0
                      ? <p className={`text-[11px] text-center py-8 ${dm}`}>승인된 멤버가 없어요</p>
                      : members.map(m => {
                        const fs = getFriendState(m.id);
                        const isFriend = fs?.status === 'accepted';
                        const isPending = !!fs && fs.status === 'pending';
                        const iSent = fs?.requester_id === user?.id;
                        return (
                          <div key={m.id} className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all cursor-pointer ${D ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'}`}
                            onClick={() => openMemberProfile(m)}>
                            <Avatar p={m} size={36} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-[12px] truncate ${tx}`}>{m.artist_name}</p>
                              <p className={`text-[10px] truncate ${dm}`}>{(m.roles || []).slice(0, 2).map((r: string) => ROLE[r] || r).join(' · ')}</p>
                            </div>
                            <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              {isFriend && <span className="text-[9px] text-emerald-400 font-black px-1">친구</span>}
                              {isPending && iSent && <span className={`text-[9px] ${dm}`}>요청중</span>}
                              {!fs && <button onClick={() => sendFriendReq(m.id)} className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black ${D ? 'bg-white/5 text-zinc-500 hover:text-white' : 'bg-black/[0.05] text-zinc-500'}`}>+친구</button>}
                              <button onClick={() => openConv(m.id)} className="px-1.5 py-0.5 rounded-lg bg-[#5B8CFF]/15 text-[#5B8CFF] text-[9px] font-black hover:bg-[#5B8CFF]/25">💬</button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 대화 목록 */}
              {!activeConv && !viewingMember && tab === 'chats' && (
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
                  {convs.length === 0
                    ? <p className={`text-[11px] text-center py-8 ${dm}`}>대화가 없어요</p>
                    : convs.map(conv => {
                      const other = getOther(conv);
                      return (
                        <div key={conv.id} className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all group ${D ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'}`}>
                          <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left" onClick={() => openConv(other?.id || (conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1))}>
                            <Avatar p={other} size={36} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-[12px] truncate ${tx}`}>{other?.artist_name || '알 수 없음'}</p>
                              <p className={`text-[10px] truncate ${dm}`}>{conv.last_message || '새 대화'}</p>
                            </div>
                          </button>
                          <button onClick={() => { if (confirm('삭제할까요?')) deleteConv(conv.id); }}
                            className={`opacity-0 group-hover:opacity-100 text-[11px] font-black px-1.5 py-0.5 rounded-lg ${dm} hover:text-red-400 hover:bg-red-500/10 transition-all`}>✕</button>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* 멤버 프로필 뷰 */}
              {viewingMember && !activeConv && (
                <div className="flex-1 overflow-y-auto">
                  <div className={`h-16 bg-gradient-to-br from-[#5B8CFF]/30 to-purple-500/20 relative`}>
                    <div className="absolute bottom-[-24px] left-4">
                      <Avatar p={viewingMember} size={48} />
                    </div>
                  </div>
                  <div className="px-4 pt-9 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className={`font-black text-[18px] ${tx}`}>{viewingMember.artist_name}</p>
                        {viewingMember.name && <p className={`text-[12px] ${dm}`}>{viewingMember.name}</p>}
                        {viewingMember.company && <p className={`text-[11px] ${dm}`}>{viewingMember.company}</p>}
                      </div>
                    </div>
                    {(viewingMember.roles || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {viewingMember.roles.map((r: string) => (
                          <span key={r} className="text-[10px] font-black px-2 py-0.5 rounded-full border border-[#5B8CFF]/30 bg-[#5B8CFF]/10 text-[#5B8CFF]">{ROLE[r] || r}</span>
                        ))}
                      </div>
                    )}
                    {(viewingMember.genres || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {viewingMember.genres.slice(0, 4).map((g: string) => (
                          <span key={g} className={`text-[10px] px-1.5 py-0.5 rounded ${D ? 'bg-white/5 text-zinc-400' : 'bg-black/[0.05] text-zinc-500'}`}>{g.startsWith('ETC:') ? g.slice(4) : g}</span>
                        ))}
                      </div>
                    )}
                    {viewingMember.instagram && (
                      <a href={`https://instagram.com/${viewingMember.instagram}`} target="_blank" rel="noopener noreferrer"
                        className="block text-[11px] text-[#5B8CFF] hover:underline mb-3">📸 @{viewingMember.instagram}</a>
                    )}
                    {memberWorks.length > 0 && (
                      <div className={`border-t ${bd} pt-3 mt-1`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${dm}`}>Released Works</p>
                        {memberWorks.slice(0, 3).map((w, i) => (
                          <a key={i} href={w.link} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-2 py-1.5 rounded-lg px-1 ${D ? 'hover:bg-white/5' : 'hover:bg-black/[0.04]'} transition-all`}>
                            <span className="text-[11px]">🎶</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-bold truncate ${tx}`}>{w.song_title}</p>
                              <p className={`text-[10px] ${dm}`}>{w.artist_name}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                    <div className={`flex gap-2 mt-4 pt-3 border-t ${bd}`}>
                      {(() => {
                        const fs = getFriendState(viewingMember.id);
                        return !fs ? (
                          <button onClick={() => sendFriendReq(viewingMember.id)}
                            className={`flex-1 py-2 rounded-xl border text-[11px] font-black transition-all ${D ? 'border-white/10 text-zinc-400 hover:text-white' : 'border-black/[0.08] text-zinc-500'}`}>
                            +친구 추가
                          </button>
                        ) : fs.status === 'accepted' ? (
                          <span className="flex-1 py-2 text-center text-[11px] text-emerald-400 font-black">✓ 친구</span>
                        ) : (
                          <span className={`flex-1 py-2 text-center text-[11px] ${dm}`}>요청 중</span>
                        );
                      })()}
                      <button onClick={() => openConv(viewingMember.id)}
                        className="flex-1 py-2 rounded-xl bg-[#5B8CFF] text-white text-[11px] font-black hover:bg-[#4070ee] transition-all">
                        💬 채팅하기
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 메시지 화면 */}
              {activeConv && (
                <>
                  <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
                    {msgs.length === 0 && <p className={`text-[11px] text-center py-8 ${dm}`}>대화를 시작해보세요</p>}
                    {msgs.map(msg => {
                      const mine = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group items-end gap-1`}>
                          {mine && (
                            <button onClick={() => deleteMsg(msg.id)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-red-400/50 hover:text-red-400 transition-all mb-0.5 shrink-0">✕</button>
                          )}
                          <div className={`px-3 py-2 rounded-2xl text-[14px] leading-snug break-keep whitespace-pre-wrap ${mine
                            ? 'bg-[#5B8CFF] text-white rounded-br-sm'
                            : D ? 'bg-white/[0.1] text-white rounded-bl-sm' : 'bg-black/[0.08] text-[#111] rounded-bl-sm'}`}
                            style={{ maxWidth: '82%', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                  <div className={`flex gap-2 p-2.5 border-t ${bd} shrink-0`}>
                    <input
                      ref={inputRef}
                      onChange={e => setInputVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as any).isComposing) {
                          e.preventDefault();
                          sendMsg();
                        }
                      }}
                      placeholder="메시지..."
                      className={`flex-1 border rounded-xl px-3 py-2 text-[13px] outline-none transition-all ${ib}`}
                    />
                    <button onClick={sendMsg} disabled={!inputVal.trim() || sending}
                      className="px-3 py-2 rounded-xl bg-[#5B8CFF] text-white text-[14px] font-black disabled:opacity-40 hover:bg-[#4070ee] transition-all">→</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
