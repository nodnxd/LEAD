'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  user: any;
  hostId: string;
  dark: boolean;
}

export default function ChatPanel({ user, hostId, dark: D }: Props) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [tab, setTab] = useState<'members' | 'chats'>('members');
  const [opacity, setOpacity] = useState(95);
  const [members, setMembers] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentIds = useRef<Set<string>>(new Set()); // 중복 방지용

  const fetchMembers = useCallback(async () => {
    if (!hostId) return;
    const { data } = await supabase
      .from('member_approvals')
      .select('member_id,status,members(id,artist_name,photo_url,roles,name)')
      .eq('host_id', hostId)
      .in('status', ['approved', 'admin']);
    if (data) setMembers(data.map((a: any) => a.members).filter(Boolean).filter((m: any) => m.id !== user?.id));
  }, [hostId, user?.id]);

  const fetchConvs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    if (data) {
      // 각 대화의 미읽음 메시지 수 계산
      const convIds = data.map((c: any) => c.id);
      let unreadTotal = 0;
      if (convIds.length > 0) {
        const { data: unreadMsgs } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('read', false)
          .neq('sender_id', user.id);
        unreadTotal = unreadMsgs?.length || 0;
      }
      setConvs(data);
      setUnread(unreadTotal);
    }
  }, [user]);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
    if (data) setFriendships(data);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchMembers();
    fetchConvs();
    fetchFriendships();
  }, [fetchMembers, fetchConvs, fetchFriendships]);

  // 실시간 메시지 수신 — 본인이 보낸 건 sentIds로 중복 차단
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat_${user.id}_${hostId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (sentIds.current.has(msg.id)) return; // 본인이 보낸 메시지 중복 차단
        if (activeConv && msg.conversation_id === activeConv.id) {
          setMsgs((p) => [...p, msg]);
          markRead(activeConv.id);
        } else {
          fetchConvs();
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMsgs((p) => p.filter((m) => m.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, activeConv, hostId, fetchConvs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const markRead = async (convId: string) => {
    if (!user) return;
    await supabase.from('messages').update({ read: true }).eq('conversation_id', convId).neq('sender_id', user.id);
  };

  const openConv = async (otherId: string) => {
    if (!user) return;
    const [p1, p2] = [user.id, otherId].sort();
    let { data: conv } = await supabase.from('conversations').select('*').eq('participant_1', p1).eq('participant_2', p2).single();
    if (!conv) {
      const { data: created } = await supabase.from('conversations').insert({ participant_1: p1, participant_2: p2 }).select().single();
      conv = created;
    }
    if (!conv) return;
    setActiveConv(conv);
    const { data: m } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
    if (m) setMsgs(m);
    markRead(conv.id);
    fetchConvs();
  };

  const sendMsg = async () => {
    if (!input.trim() || !activeConv || !user || sending) return;
    const content = input.trim();
    setSending(true);
    setInput('');
    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConv.id, sender_id: user.id, content })
      .select()
      .single();
    if (msg) {
      sentIds.current.add(msg.id); // 실시간 중복 방지 등록
      setMsgs((p) => [...p, msg]);
      await supabase.from('conversations').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', activeConv.id);
      fetchConvs();
    }
    setSending(false);
  };

  const deleteMsg = async (msgId: string) => {
    await supabase.from('messages').delete().eq('id', msgId).eq('sender_id', user.id);
    setMsgs((p) => p.filter((m) => m.id !== msgId));
  };

  const deleteConv = async (convId: string) => {
    await supabase.from('messages').delete().eq('conversation_id', convId);
    await supabase.from('conversations').delete().eq('id', convId);
    setConvs((p) => p.filter((c) => c.id !== convId));
    if (activeConv?.id === convId) { setActiveConv(null); setMsgs([]); }
    fetchConvs();
  };

  const sendFriendReq = async (recipientId: string) => {
    await supabase.from('friendships').insert({ requester_id: user.id, recipient_id: recipientId });
    fetchFriendships();
  };

  const respondFriend = async (id: string, status: 'accepted' | 'rejected') => {
    await supabase.from('friendships').update({ status }).eq('id', id);
    fetchFriendships();
  };

  const getFriendState = (memberId: string) => friendships.find((f) => f.requester_id === memberId || f.recipient_id === memberId);
  const getOther = (conv: any) => {
    const oid = conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1;
    return members.find((m) => m.id === oid);
  };
  const incomingReqs = friendships.filter((f) => f.recipient_id === user?.id && f.status === 'pending');

  // 스타일
  const panelBg = D ? `rgba(13,13,13,${opacity / 100})` : `rgba(255,255,255,${opacity / 100})`;
  const bd = D ? 'border-white/[0.08]' : 'border-black/[0.08]';
  const tx = D ? 'text-white' : 'text-[#111]';
  const dm = D ? 'text-zinc-500' : 'text-zinc-500';
  const ib = D ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600' : 'bg-black/[0.04] border-black/[0.08] text-[#111] placeholder:text-zinc-400';
  const rowHover = D ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]';

  const Avatar = ({ p }: { p: any }) => (
    <div className="w-8 h-8 rounded-full bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center overflow-hidden shrink-0">
      {p?.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-[11px] font-black text-[#5B8CFF]">{(p?.artist_name || p?.display_name || '?')[0].toUpperCase()}</span>}
    </div>
  );

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => { setOpen(o => !o); setMinimized(false); }}
        className={`fixed bottom-6 right-6 z-40 w-13 h-13 rounded-2xl flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 ${D ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-black/[0.08]'}`}
        style={{ width: 52, height: 52 }}
      >
        <span className="text-[20px]">💬</span>
        {unread > 0 && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
            <span className="text-white text-[10px] font-black">{unread > 9 ? '9+' : unread}</span>
          </div>
        )}
      </button>

      {/* 메신저 패널 — 플로팅, 우하단, 백드롭 없음 */}
      {open && (
        <div
          className={`fixed bottom-20 right-6 z-50 w-[340px] rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${bd}`}
          style={{
            background: panelBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            height: minimized ? 'auto' : 480,
            fontFamily: 'Pretendard,sans-serif',
          }}
        >
          {/* 헤더 */}
          <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${bd} shrink-0`}>
            {activeConv ? (
              <>
                <button onClick={() => { setActiveConv(null); setMsgs([]); fetchConvs(); }} className={`text-[16px] leading-none ${dm} hover:${tx} mr-1`}>←</button>
                {(() => {
                  const oid = activeConv.participant_1 === user?.id ? activeConv.participant_2 : activeConv.participant_1;
                  const other = members.find((m) => m.id === oid);
                  return <Avatar p={other} />;
                })()}
                <span className={`flex-1 text-[13px] font-black truncate ${tx} ml-1`}>
                  {(() => {
                    const oid = activeConv.participant_1 === user?.id ? activeConv.participant_2 : activeConv.participant_1;
                    return members.find((m) => m.id === oid)?.artist_name || '알 수 없음';
                  })()}
                </span>
                <button onClick={() => { if (confirm('대화를 삭제할까요?')) deleteConv(activeConv.id); }} className="text-[12px] text-red-400/60 hover:text-red-400 transition-colors px-1">🗑</button>
              </>
            ) : (
              <>
                <span className={`font-black text-[14px] flex-1 ${tx}`}>
                  채팅
                  {incomingReqs.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{incomingReqs.length}</span>}
                </span>
              </>
            )}
            {/* 투명도 슬라이더 */}
            <input
              type="range" min={30} max={100} value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-14 h-1 accent-[#5B8CFF] cursor-pointer"
              title="투명도"
            />
            <button onClick={() => setMinimized(m => !m)} className={`w-6 h-6 flex items-center justify-center rounded-lg ${dm} hover:${tx} text-[12px]`}>{minimized ? '▲' : '▼'}</button>
            <button onClick={() => { setOpen(false); setActiveConv(null); setMsgs([]); }} className={`w-6 h-6 flex items-center justify-center rounded-lg ${dm} hover:text-red-400 text-[14px]`}>✕</button>
          </div>

          {!minimized && (
            <>
              {/* 친구 요청 알림 */}
              {!activeConv && incomingReqs.length > 0 && (
                <div className={`px-3 py-2 border-b ${bd} shrink-0`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${dm}`}>친구 요청</p>
                  {incomingReqs.map((req) => {
                    const m = members.find((x) => x.id === req.requester_id);
                    return (
                      <div key={req.id} className="flex items-center gap-2 mb-1">
                        <Avatar p={m} />
                        <span className={`flex-1 text-[11px] font-bold truncate ${tx}`}>{m?.artist_name || '알 수 없음'}</span>
                        <button onClick={() => respondFriend(req.id, 'accepted')} className="px-2 py-0.5 rounded-lg bg-[#5B8CFF]/20 text-[#5B8CFF] text-[10px] font-black">✓</button>
                        <button onClick={() => respondFriend(req.id, 'rejected')} className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-black">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 탭 */}
              {!activeConv && (
                <div className={`flex border-b ${bd} shrink-0`}>
                  {(['members', 'chats'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-2.5 text-[11px] font-black transition-all ${tab === t ? `${tx} border-b-2 border-[#5B8CFF]` : dm}`}>
                      {t === 'members' ? `멤버 (${members.length})` : `대화 (${convs.length})`}
                    </button>
                  ))}
                </div>
              )}

              {/* 멤버 목록 */}
              {!activeConv && tab === 'members' && (
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  {members.length === 0
                    ? <p className={`text-[11px] text-center py-8 ${dm}`}>승인된 멤버가 없어요</p>
                    : members.map((m) => {
                      const fs = getFriendState(m.id);
                      const isFriend = fs?.status === 'accepted';
                      const isPending = !!fs && fs.status === 'pending';
                      const iSent = fs?.requester_id === user?.id;
                      return (
                        <div key={m.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-default transition-all ${rowHover}`}>
                          <Avatar p={m} />
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-[12px] truncate ${tx}`}>{m.artist_name}</p>
                            <p className={`text-[10px] truncate ${dm}`}>{(m.roles || []).slice(0, 2).join(' · ')}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {isFriend && <span className="text-[9px] text-emerald-400 font-black">친구</span>}
                            {isPending && iSent && <span className={`text-[9px] ${dm}`}>요청중</span>}
                            {!fs && (
                              <button onClick={() => sendFriendReq(m.id)} className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black transition-all ${D ? 'bg-white/5 text-zinc-500 hover:text-white' : 'bg-black/[0.05] text-zinc-500 hover:text-[#111]'}`}>+친구</button>
                            )}
                            <button onClick={() => { openConv(m.id); }} className="px-1.5 py-0.5 rounded-lg bg-[#5B8CFF]/15 text-[#5B8CFF] text-[9px] font-black hover:bg-[#5B8CFF]/25 transition-all">💬</button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* 대화 목록 */}
              {!activeConv && tab === 'chats' && (
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  {convs.length === 0
                    ? <p className={`text-[11px] text-center py-8 ${dm}`}>대화가 없어요</p>
                    : convs.map((conv) => {
                      const other = getOther(conv);
                      return (
                        <div key={conv.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all ${rowHover} group`}>
                          <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => openConv(other?.id || (conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1))}>
                            <Avatar p={other} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-[12px] truncate ${tx}`}>{other?.artist_name || '알 수 없음'}</p>
                              <p className={`text-[10px] truncate ${dm}`}>{conv.last_message || '새 대화'}</p>
                            </div>
                          </button>
                          <button onClick={() => { if (confirm('대화를 삭제할까요?')) deleteConv(conv.id); }} className="opacity-0 group-hover:opacity-100 text-[11px] text-red-400/60 hover:text-red-400 transition-all px-1">🗑</button>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* 메시지 화면 */}
              {activeConv && (
                <>
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
                    {msgs.length === 0 && <p className={`text-[11px] text-center py-8 ${dm}`}>대화를 시작해보세요</p>}
                    {msgs.map((msg) => {
                      const mine = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
                          <div className="flex items-end gap-1">
                            {mine && (
                              <button onClick={() => deleteMsg(msg.id)} className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/50 hover:text-red-400 transition-all mb-0.5">🗑</button>
                            )}
                            <div className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-[13px] leading-relaxed break-words ${mine
                              ? 'bg-[#5B8CFF] text-white rounded-br-sm'
                              : D ? 'bg-white/[0.1] text-white rounded-bl-sm' : 'bg-black/[0.07] text-[#111] rounded-bl-sm'}`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  {/* 입력 */}
                  <div className={`flex gap-2 p-2.5 border-t ${bd} shrink-0`}>
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                      placeholder="메시지..."
                      className={`flex-1 border rounded-xl px-3 py-2 text-[12px] outline-none transition-all ${ib}`}
                    />
                    <button onClick={sendMsg} disabled={!input.trim() || sending}
                      className="px-3 py-2 rounded-xl bg-[#5B8CFF] text-white text-[13px] font-black disabled:opacity-40 hover:bg-[#4070ee] transition-all">
                      →
                    </button>
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
