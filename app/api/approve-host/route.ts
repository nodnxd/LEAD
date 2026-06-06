import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://laebobhsuwzknboyqsyo.supabase.co';

function page(title: string, body: string, color: string) {
  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
     <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#050505;font-family:Pretendard,Arial,sans-serif">
       <div style="text-align:center;padding:32px;max-width:380px">
         <div style="font-size:48px;margin-bottom:12px">${color}</div>
         <h1 style="color:#fff;font-size:22px;margin:0 0 8px">${title}</h1>
         <p style="color:#9ca3af;font-size:14px;line-height:1.6">${body}</p>
       </div>
     </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const host_id = searchParams.get('host_id');
  const secret = searchParams.get('secret');
  const action = searchParams.get('action') === 'reject' ? 'rejected' : 'approved';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const expected = process.env.ADMIN_APPROVE_SECRET || '';

  if (!host_id || !secret || secret !== expected) return page('잘못된 요청', '링크가 올바르지 않거나 만료됐어요.', '⚠️');
  if (!serviceKey) return page('설정 필요', '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았어요.', '⚙️');

  const sb = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
  const { error } = await sb.from('host_approvals').update({ status: action }).eq('host_id', host_id);
  if (error) return page('처리 실패', error.message, '❌');

  return action === 'approved'
    ? page('승인 완료', '호스트 가입을 승인했어요. 해당 호스트가 새로고침하면 대시보드를 이용할 수 있어요.', '✅')
    : page('거절 처리됨', '해당 가입 요청을 거절했어요.', '🚫');
}
