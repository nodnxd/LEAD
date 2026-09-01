import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';

// 승인/거절은 POST에서만 일어난다.
//
// 예전엔 GET 한 번으로 상태가 바뀌었다. 이 URL은 관리자 메일에 담겨 나가는데,
// Gmail·Outlook·회사 메일 게이트웨이는 악성링크 검사를 하느라 링크를 실제로 fetch한다.
// 관리자가 누르지도 않았는데 승인/거절이 처리될 수 있었다.
// 이제 GET은 확인 화면만 그리고, 실제 변경은 그 화면의 버튼이 쏘는 POST가 한다.

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function html(body: string) {
  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <meta name="robots" content="noindex,nofollow"><title>호스트 승인</title></head>
     <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;font-family:system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif">
       <div style="text-align:center;padding:32px;max-width:400px">${body}</div>
     </body></html>`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // 시크릿이 URL에 있으므로 다음 요청의 Referer로 새어나가지 않게 막는다
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
      },
    },
  );
}

function page(icon: string, title: string, body: string) {
  return html(
    `<div style="font-size:48px;margin-bottom:12px">${icon}</div>
     <h1 style="color:#fff;font-size:22px;margin:0 0 8px">${esc(title)}</h1>
     <p style="color:#9ca3af;font-size:14px;line-height:1.6">${esc(body)}</p>`,
  );
}

/** 길이를 흘리지 않는 상수시간 비교 */
function secretOk(given: string | null, expected: string) {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parse(params: URLSearchParams) {
  return {
    host_id: params.get('host_id'),
    secret: params.get('secret'),
    action: params.get('action') === 'reject' ? ('rejected' as const) : ('approved' as const),
  };
}

// 확인 화면만. 상태를 바꾸지 않으므로 메일 스캐너가 미리 열어도 안전하다.
export async function GET(req: NextRequest) {
  const { host_id, secret, action } = parse(new URL(req.url).searchParams);
  const expected = process.env.ADMIN_APPROVE_SECRET || '';

  if (!host_id || !secretOk(secret, expected)) {
    return page('⚠️', '잘못된 요청', '링크가 올바르지 않거나 만료됐어요.');
  }

  const isApprove = action === 'approved';
  return html(
    `<div style="font-size:48px;margin-bottom:12px">${isApprove ? '🏢' : '🚫'}</div>
     <h1 style="color:#fff;font-size:22px;margin:0 0 8px">${isApprove ? '이 호스트를 승인할까요?' : '이 가입 요청을 거절할까요?'}</h1>
     <p style="color:#9ca3af;font-size:13px;line-height:1.6;word-break:break-all;margin:0 0 20px">${esc(host_id)}</p>
     <form method="POST">
       <input type="hidden" name="host_id" value="${esc(host_id)}">
       <input type="hidden" name="secret" value="${esc(secret!)}">
       <input type="hidden" name="action" value="${isApprove ? 'approve' : 'reject'}">
       <button type="submit" style="width:100%;padding:14px 16px;border:0;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;background:${isApprove ? '#C14425' : '#2a1212'};color:${isApprove ? '#fff' : '#f87171'}">
         ${isApprove ? '승인하기' : '거절하기'}
       </button>
     </form>
     <p style="color:#6b7280;font-size:11px;margin:16px 0 0">이 버튼을 눌러야 실제로 처리돼요.</p>`,
  );
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params = new URLSearchParams();
  for (const [k, v] of form.entries()) if (typeof v === 'string') params.set(k, v);
  const { host_id, secret, action } = parse(params);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expected = process.env.ADMIN_APPROVE_SECRET || '';

  if (!host_id || !secretOk(secret, expected)) {
    return page('⚠️', '잘못된 요청', '링크가 올바르지 않거나 만료됐어요.');
  }
  if (!serviceKey) {
    return page('⚙️', '설정 필요', '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았어요.');
  }

  const sb = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
  const { error } = await sb.from('host_approvals').update({ status: action }).eq('host_id', host_id);
  if (error) return page('❌', '처리 실패', error.message);

  return action === 'approved'
    ? page('✅', '승인 완료', '호스트 가입을 승인했어요. 해당 호스트가 새로고침하면 대시보드를 이용할 수 있어요.')
    : page('🚫', '거절 처리됨', '해당 가입 요청을 거절했어요.');
}
