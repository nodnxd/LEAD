import { NextRequest, NextResponse } from 'next/server';

// 새 호스트가 가입하면 관리자에게 승인 요청 메일을 보냄
export async function POST(req: NextRequest) {
  try {
    const { email, host_id } = await req.json();
    const key = process.env.RESEND_API_KEY;
    const admin = process.env.ADMIN_EMAIL || 'everplayground@gmail.com';
    const secret = process.env.ADMIN_APPROVE_SECRET || '';
    const from = process.env.RESEND_FROM || 'LEAD by NEN <onboarding@resend.dev>';
    if (!key) return NextResponse.json({ ok: false, error: 'RESEND_API_KEY missing' }, { status: 200 });

    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host');
    const base = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
    const approveUrl = `${base}/api/approve-host?host_id=${encodeURIComponent(host_id)}&secret=${encodeURIComponent(secret)}&action=approve`;
    const rejectUrl = `${base}/api/approve-host?host_id=${encodeURIComponent(host_id)}&secret=${encodeURIComponent(secret)}&action=reject`;

    const html = `
      <div style="font-family:Pretendard,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0a0a0a;color:#fff;border-radius:16px">
        <h2 style="margin:0 0 4px;font-size:20px">🏢 새 호스트 가입 요청</h2>
        <p style="color:#9ca3af;font-size:13px;margin:0 0 16px">아래 호스트가 LEAD 대시보드 가입을 요청했어요.</p>
        <div style="background:#161616;border:1px solid #262626;border-radius:12px;padding:14px;margin-bottom:18px">
          <p style="margin:0;font-size:15px;font-weight:800">${email || host_id}</p>
        </div>
        <div style="display:flex;gap:10px">
          <a href="${approveUrl}" style="flex:1;display:inline-block;text-align:center;padding:12px 16px;background:#3358E8;color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px">✅ 승인하기</a>
          <a href="${rejectUrl}" style="display:inline-block;text-align:center;padding:12px 16px;background:#2a1212;color:#f87171;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px">거절</a>
        </div>
        <p style="color:#6b7280;font-size:11px;margin:16px 0 0">대시보드 🛡️ 호스트 승인 버튼에서도 처리할 수 있어요.</p>
      </div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [admin], subject: `🏢 새 호스트 가입 요청: ${email || host_id}`, html }),
    });
    const data = await r.json();
    return NextResponse.json({ ok: r.ok, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 200 });
  }
}
