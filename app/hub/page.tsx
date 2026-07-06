'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SUPER_ADMIN_EMAIL = 'everplayground@gmail.com';
const BOTH_PRODUCT_EMAILS = ['hseu2000@gmail.com', 'everplayground@gmail.com'];

export default function HubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [canHost, setCanHost] = useState(false);
  const [operate, setOperate] = useState<{ id: string; name: string; owner: boolean }[]>([]);
  const [member, setMember] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) { router.push('/'); return; }
      setUser(u);
      const email = (u.email || '').toLowerCase();

      // 호스트 권한: 슈퍼관리자 / 허용명단 / host_grants / 기존 호스트 데이터(grandfather)
      let host = email === SUPER_ADMIN_EMAIL || BOTH_PRODUCT_EMAILS.includes(email);
      if (!host) {
        const { data: g } = await supabase.from('host_grants').select('id').eq('email', email).eq('status', 'approved').maybeSingle();
        if (g) host = true;
      }
      if (!host) {
        const { data: hp } = await supabase.from('host_profiles').select('id').eq('id', u.id).maybeSingle();
        if (hp) host = true;
      }
      if (!host) {
        const { data: ld } = await supabase.from('leads').select('id').eq('host_id', u.id).limit(1);
        if (ld && ld.length) host = true;
      }
      setCanHost(host);

      // 참여 중인 회사 (게스트)
      const { data: ma } = await supabase.from('member_approvals')
        .select('host_id').eq('member_id', u.id).in('status', ['approved', 'admin']).neq('host_id', u.id);
      const memberIds = [...new Set((ma || []).map((a: any) => a.host_id))];

      // 운영 중인 회사 (호스트)
      let operateIds: { id: string; owner: boolean }[] = [];
      if (host) {
        operateIds.push({ id: u.id, owner: true });
        const { data: wa } = await supabase.from('workspace_admins').select('workspace_id').eq('admin_id', u.id);
        (wa || []).forEach((w: any) => { if (w.workspace_id !== u.id) operateIds.push({ id: w.workspace_id, owner: false }); });
      }

      // 회사 이름 조회
      const allIds = [...new Set([...memberIds, ...operateIds.map(o => o.id)])];
      const nameMap: Record<string, string> = {};
      if (allIds.length) {
        const { data: hp } = await supabase.from('host_profiles').select('id,company,display_name').in('id', allIds);
        (hp || []).forEach((h: any) => { nameMap[h.id] = h.company || h.display_name || ''; });
      }
      setMember(memberIds.map(id => ({ id, name: nameMap[id] || '이름 없는 회사' })));
      setOperate(operateIds.map(o => ({ id: o.id, name: nameMap[o.id] || (o.owner ? '내 회사' : '회사'), owner: o.owner })));
      setLoading(false);
    })();
  }, []);

  const enterOperate = (id: string) => { localStorage.setItem('selected_ws', id); router.push('/dashboard'); };
  const enterMember = (id: string) => { router.push(`/view/${id}?guest=1`); };

  if (loading) return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#3E78DB] border-t-transparent rounded-full animate-spin" /></div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); .font-pretendard{font-family:'Pretendard',sans-serif;}` }} />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes orb-pulse{0%,100%{transform:scale(0.9);opacity:0.06;}50%{transform:scale(1.1);opacity:0.10;}}` }} />
      <main className="min-h-screen bg-[#141414] text-white font-pretendard p-5 lg:p-8 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none" style={{background:'#3E78DB', filter:'blur(200px)', animation:'orb-pulse 4s ease-in-out infinite'}} />
        <div className="relative z-10 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-4xl font-semibold text-[#3E78DB] uppercase tracking-tighter">LEAD</h1>
              <span className="text-zinc-600 text-[11px] font-bold tracking-[0.2em]">by NEN</span>
            </div>
            <div className="flex items-center gap-2">
              <a href="/mypage" className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-[11px] font-normal hover:text-white transition-all">MY</a>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-[11px] font-bold text-zinc-600 hover:text-red-400 transition-colors">로그아웃</button>
            </div>
          </div>

          {/* 참여 중인 회사 */}
          <section className="mb-8">
            <p className="text-[11px] font-normal uppercase tracking-widest text-zinc-500 mb-3">참여 중인 회사</p>
            {member.length === 0 ? (
              <div className="p-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] text-center">
                <p className="text-[13px] text-zinc-500">아직 참여 중인 회사가 없어요.</p>
                <p className="text-[12px] text-zinc-600 mt-1">받은 초대 링크로 입장하세요.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {member.map(c => (
                  <button key={c.id} onClick={() => enterMember(c.id)} className="flex items-center gap-3 p-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] text-left transition-all">
                    <div className="w-11 h-11 rounded-xl bg-[#3E78DB]/15 flex items-center justify-center text-[18px] shrink-0">🎤</div>
                    <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{c.name}</p><p className="text-[12px] text-zinc-500">게스트로 입장</p></div>
                    <span className="text-[#3E78DB] text-[18px] font-black shrink-0">→</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 운영 중인 회사 (호스트 권한자만) */}
          {canHost && (
            <section>
              <p className="text-[11px] font-normal uppercase tracking-widest text-zinc-500 mb-3">운영 중인 회사 (호스트)</p>
              <div className="flex flex-col gap-2.5">
                {operate.map(c => (
                  <button key={c.id} onClick={() => enterOperate(c.id)} className="flex items-center gap-3 p-4 rounded-2xl border border-[#3E78DB]/30 bg-[#3E78DB]/[0.07] hover:bg-[#3E78DB]/[0.12] text-left transition-all">
                    <div className="w-11 h-11 rounded-xl bg-[#3E78DB]/15 flex items-center justify-center text-[18px] shrink-0">🏢</div>
                    <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate">{c.name}</p><p className="text-[12px] text-zinc-500">{c.owner ? '대시보드 운영' : '공동 관리'}</p></div>
                    <span className="text-[#3E78DB] text-[18px] font-black shrink-0">→</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!canHost && member.length === 0 && (
            <p className="text-center text-[12px] text-zinc-700 mt-8">호스트 권한이 필요하면 담당자에게 문의하세요.</p>
          )}

          {/* 다른 서비스 — CAST */}
          <div className="mt-10 pt-6 border-t border-white/[0.07]">
            <a href="/roster/dashboard" className="flex items-center gap-3 p-4 rounded-2xl border border-[#E0A63C]/25 bg-[#E0A63C]/[0.06] hover:bg-[#E0A63C]/10 text-left transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#E0A63C]/15 flex items-center justify-center text-[18px] shrink-0">🎤</div>
              <div className="flex-1 min-w-0"><p className="font-black text-[15px] truncate text-white">CAST <span className="text-[11px] text-zinc-500 font-bold">로스터 관리</span></p><p className="text-[12px] text-zinc-500">아티스트 로스터 짜기</p></div>
              <span className="text-[#E0A63C] text-[18px] font-black shrink-0">→</span>
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
