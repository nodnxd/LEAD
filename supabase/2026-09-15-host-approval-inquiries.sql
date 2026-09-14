-- ============================================================
-- 호스트 가입 승인제 복귀 + 문의 수신함 (2026-09-15)
-- ⚠ 코드 배포 전에 실행할 것.
--   새 코드는 submit_inquiry RPC를 부르고, 새 호스트를 host_approvals에 'pending'으로 넣는다.
--   먼저 돌려도 옛 코드는 안전: 옛 코드의 'active' 자가 등록은 거부되지만,
--   옛 코드는 등록 결과와 상관없이 호스트를 들여보내므로 지금과 똑같이 동작한다.
-- 운영자 이메일 hseu2000@gmail.com — 코드의 SUPER_ADMIN_EMAIL과 같게 유지.
-- Supabase SQL Editor에 통째로 붙여 실행. 다시 돌려도 안전.
-- ============================================================

begin;

-- 1) host_approvals: 본인은 'pending' 첫 등록만. 승인·거절·정지는 운영자만
--    (ha_sel / ha_upd / ha_del 은 2026-09-15-operator-email.sql 그대로 둔다)
drop policy if exists ha_ins on public.host_approvals;
create policy ha_ins on public.host_approvals for insert to authenticated
  with check ((host_id = (select auth.uid()) and status = 'pending')
              or ((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');

-- 2) inquiries: 문의 수신함. 쓰기는 submit_inquiry RPC로만 (insert 정책 없음)
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  topic       text not null default '일반' check (char_length(topic) <= 40),
  name        text check (char_length(name) <= 80),
  reply_email text not null check (char_length(reply_email) <= 254),
  message     text not null check (char_length(message) between 10 and 2000),
  source      text check (char_length(source) <= 300),
  user_id     uuid references auth.users(id) on delete set null,
  status      text not null default 'new' check (status in ('new', 'done'))
);
create index if not exists inquiries_created_at_idx on public.inquiries (created_at desc);
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon;

-- 읽기·확인 처리(status)는 운영자만
drop policy if exists inq_sel on public.inquiries;
drop policy if exists inq_upd on public.inquiries;
create policy inq_sel on public.inquiries for select to authenticated
  using (((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');
create policy inq_upd on public.inquiries for update to authenticated
  using (((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com')
  with check (((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');

-- 3) submit_inquiry: 비로그인 포함 누구나 문의 전송. 검증 + 간단한 도배 방지 후 저장
--    주제 목록은 components/InquiryModal.tsx 의 INQUIRY_TOPICS 와 같게 유지
create or replace function public.submit_inquiry(
  p_topic text, p_name text, p_reply_email text, p_message text, p_source text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topic   text := coalesce(nullif(trim(p_topic), ''), '일반');
  v_name    text := nullif(trim(coalesce(p_name, '')), '');
  v_email   text := lower(trim(coalesce(p_reply_email, '')));
  v_message text := trim(coalesce(p_message, ''));
  v_source  text := left(nullif(trim(coalesce(p_source, '')), ''), 300);
begin
  if v_topic not in ('일반', 'LEAD 호스트 신청', 'CAST 호스트 신청') then
    raise exception 'invalid_topic';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'invalid_email';
  end if;
  if char_length(v_message) not between 10 and 2000 then
    raise exception 'invalid_message';
  end if;
  if char_length(coalesce(v_name, '')) > 80 then
    raise exception 'invalid_name';
  end if;

  -- 같은 답장 이메일 10분 3건, 전체 10분 30건
  -- ponytail: 전체 상한 10분 30건 — 도배가 오면 정상 문의도 같이 막힌다. 필요해지면 IP/캡차 기반으로 바꾼다.
  if (select count(*) from inquiries
       where reply_email = v_email and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from inquiries
       where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'rate_limited';
  end if;

  insert into inquiries (topic, name, reply_email, message, source, user_id)
  values (v_topic, v_name, v_email, v_message, v_source, auth.uid());
end;
$$;

revoke all on function public.submit_inquiry(text, text, text, text, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text) to anon, authenticated;

commit;
