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
  const [tab, setTab] = useState<'members' | 'chats'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [convs, setConvs] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMembers = useCallback(async () => {
    if (!hostId) return;
    const { data } = await supabase
      .from('member_approvals')
      .select('member_id, status, members(id,artist_name,photo_url,roles,name)')
      .eq('host_id', hostId)
      .in('status', ['approved', 'admin']);
    if (data) {
      setMembers(
        data
          .map((a: any) => a.members)
          .filter(Boolean)
          .filter((m: any) => m.id !== user?.id)
      );
    }
  }, [hostId, user?.id]);

  const fetchConvs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select('*, messages(id,content,read,sender_id,created_at)')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    if (data) {
      setConvs(data);
      const u = data.reduce((sum: number, c: any) => {
        return sum + (c.messages || []).filter((m: any) => !m.read && m.sender_id !== user.id).length;
      }, 0);
      setUnread(u);
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
  }, [fetchMembers, fetchConvs, fetchFriendships, user]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (activeConv && msg.conversation_id === activeConv.id) {
          setMsgs((p) => [...p, msg]);
          markRead(activeConv.id);
        } else {
          fetchConvs();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, activeConv, fetchConvs]);

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
  };

  const sendMsg = async () => {
    if (!input.trim() || !activeConv || !user || sending) return;
    const content = input.trim();
    setSending(true);
    setInput('');
    const { data: msg } = await supabase.from('messages').insert({ conversation_id: activeConv.id, sender_id: user.id, content }).select().single();
    if (msg) setMsgs((p) => [...p, msg]);
    await supabase.from('conversations').update({ last_message: content, last_message_at: new Date().toISOString() }).eq('id', activeConv.id);
    fetchConvs();
    setSending(false);
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

  const bg = D ? 'bg-[#0D0D0D]' : 'bg-white';
  const bd = D ? 'border-white/[0.07]' : 'border-black/[0.08]';
  const tx = D ? 'text-white' : 'text-[#111]';
  const dm = D ? 'text-zinc-500' : 'text-zinc-500';
  const ib = D ? 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600' : 'bg-black/[0.04] border-black/[0.08] text-[#111] placeholder:text-zinc-400';
  const row = D ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/10' : 'bg-black/[0.01] border-black/[0.05] hover:border-black/10';

  const Avatar = ({ p, size = 9 }: { p: any; size?: number }) => (
    <div className={`w-${size} h-${size} rounded-full bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 flex items-center justify-center overflow-hidden shrink-0`}>
      {p?.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" /> : <span className="text-[12px] font-black text-[#5B8CFF]">{(p?.artist_name || p?.display_name || '?')[0].toUpperCase()}</span>}
    </div>
  );

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => { setOpen(true); }}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 ${D ? 'bg-[#1a1a1a] border border-white/10' : 'bg-white border border-black/10'}`}
      >
        <span className="text-[22px]">💬</span>
        {unread > 0 && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow">
            <span className="text-white text-[10px] font-black">{unread > 9 ? '9+' : unread}</span>
          </div>
        )}
      </button>

      {/* 패널 */}
      {open && (
        <div className="fixed inset-0 z-50 flex" style={{ fontFamily: 'Pretendard,sans-serif' }}>
          {/* 딤 배경 */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); setActiveConv(null); setMsgs([]); }} />

          {/* 패널 본체 */}
          <div className={`w-80 h-full flex flex-col border-l shadow-2xl ${bg} ${bd}`}>

            {/* ── 대화 목록 / 멤버 목록 ── */}
            {!activeConv && (
              <>
                {/* 헤더 */}
                <div className={`flex items-center justify-between px-4 py-4 border-b ${bd}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-[16px] ${tx}`}>채팅</span>
                    {incomingReqs.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">{incomingReqs.length}</span>
                    )}
                  </div>
                  <button onClick={() => setOpen(false)} className={`text-[18px] leading-none ${dm}`}>✕</button>
                </div>

                {/* 친구 요청 */}
                {incomingReqs.length > 0 && (
                  <div className={`px-4 py-3 border-b ${bd}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${dm}`}>친구 요청</p>
                    {incomingReqs.map((req) => {
                      const m = members.find((x) => x.id === req.requester_id);
                      return (
                        <div key={req.id} className="flex items-center gap-2 mb-1.5">
                          <Avatar p={m} size={7} />
                          <span className={`flex-1 text-[12px] font-bold truncate ${tx}`}>{m?.artist_name || '알 수 없음'}</span>
                          <button onClick={() => respondFriend(req.id, 'accepted')} className="px-2 py-1 rounded-lg bg-[#5B8CFF]/20 text-[#5B8CFF] text-[10px] font-black">✓</button>
                          <button onClick={() => respondFriend(req.id, 'rejected')} className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-black">✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 탭 */}
                <div className={`flex border-b ${bd}`}>
                  {(['members', 'chats'] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`flex-1 py-3 text-[12px] font-black transition-all ${tab === t ? `${tx} border-b-2 border-[#5B8CFF]` : dm}`}>
                      {t === 'members' ? `멤버 (${members.length})` : `대화 (${convs.length})`}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* 멤버 탭 */}
                  {tab === 'members' && (
                    <div className="p-3 flex flex-col gap-2">
                      {members.length === 0 ? (
                        <p className={`text-[12px] text-center py-10 ${dm}`}>승인된 멤버가 없어요</p>
                      ) : members.map((m) => {
                        const fs = getFriendState(m.id);
                        const isFriend = fs?.status === 'accepted';
                        const isPending = !!fs && fs.status === 'pending';
                        const iSent = fs?.requester_id === user?.id;
                        return (
                          <div key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${row}`}>
                            <Avatar p={m} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-[12px] truncate ${tx}`}>{m.artist_name}</p>
                              <p className={`text-[10px] truncate ${dm}`}>{(m.roles || []).slice(0, 2).join(' · ')}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {isFriend && <span className="text-[10px] text-emerald-400 font-black px-1">친구</span>}
                              {isPending && iSent && <span className={`text-[10px] ${dm} px-1`}>요청중</span>}
                              {!fs && (
                                <button onClick={() => sendFriendReq(m.id)}
                                  className={`px-1.5 py-1 rounded-lg text-[10px] font-black transition-all ${D ? 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10' : 'bg-black/[0.05] text-zinc-500 hover:text-[#111]'}`}>
                                  +친구
                                </button>
                              )}
                              <button onClick={() => openConv(m.id)}
                                className="px-1.5 py-1 rounded-lg bg-[#5B8CFF]/15 text-[#5B8CFF] text-[10px] font-black hover:bg-[#5B8CFF]/25 transition-all">
                                💬
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 대화 탭 */}
                  {tab === 'chats' && (
                    <div className="p-3 flex flex-col gap-2">
                      {convs.length === 0 ? (
                        <p className={`text-[12px] text-center py-10 ${dm}`}>대화가 없어요<br /><span className="text-[11px]">멤버 탭에서 채팅을 시작하세요</span></p>
                      ) : convs.map((conv) => {
                        const other = getOther(conv);
                        const unreadCnt = (conv.messages || []).filter((m: any) => !m.read && m.sender_id !== user?.id).length;
                        return (
                          <button key={conv.id} onClick={() => openConv(other?.id || (conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1))}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left w-full transition-all ${row}`}>
                            <Avatar p={other} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-[12px] truncate ${tx}`}>{other?.artist_name || '알 수 없음'}</p>
                              <p className={`text-[11px] truncate ${dm}`}>{conv.last_message || '새 대화'}</p>
                            </div>
                            {unreadCnt > 0 && (
                              <div className="w-5 h-5 rounded-full bg-[#5B8CFF] flex items-center justify-center shrink-0">
                                <span className="text-white text-[10px] font-black">{unreadCnt}</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── 대화 화면 ── */}
            {activeConv && (
              <>
                {/* 헤더 */}
                {(() => {
                  const oid = activeConv.participant_1 === user?.id ? activeConv.participant_2 : activeConv.participant_1;
                  const other = members.find((m) => m.id === oid);
                  return (
                    <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${bd}`}>
                      <button onClick={() => { setActiveConv(null); setMsgs([]); fetchConvs(); }} className={`text-[18px] leading-none ${dm} hover:${tx} transition-colors`}>←</button>
                      <Avatar p={other} size={8} />
                      <span className={`font-black text-[14px] flex-1 truncate ${tx}`}>{other?.artist_name || '알 수 없음'}</span>
                      <button onClick={() => { setOpen(false); setActiveConv(null); setMsgs([]); }} className={`text-[18px] leading-none ${dm}`}>✕</button>
                    </div>
                  );
                })()}

                {/* 메시지 */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {msgs.length === 0 && <p className={`text-[12px] text-center py-8 ${dm}`}>대화를 시작해보세요</p>}
                  {msgs.map((msg) => {
                    const mine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[72%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${mine
                          ? 'bg-[#5B8CFF] text-white rounded-br-sm'
                          : D ? 'bg-white/[0.08] text-white rounded-bl-sm' : 'bg-black/[0.07] text-[#111] rounded-bl-sm'}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* 입력 */}
                <div className={`flex gap-2 p-3 border-t ${bd}`}>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder="메시지 입력..."
                    className={`flex-1 border rounded-xl px-3 py-2.5 text-[13px] outline-none transition-all ${ib}`}
                  />
                  <button onClick={sendMsg} disabled={!input.trim() || sending}
                    className="px-3 py-2.5 rounded-xl bg-[#5B8CFF] text-white text-[14px] font-black disabled:opacity-40 hover:bg-[#4070ee] transition-all">
                    →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
