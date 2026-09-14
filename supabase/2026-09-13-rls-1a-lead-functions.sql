-- ============================================================
-- LEAD 보안 정리 (2026-09-13) · 1a — 새 서버 함수
-- ① 코드 배포 전에 실행 (순서: 1a → 1b → 1c)
-- Supabase SQL Editor에 파일 전체를 붙여 실행. 다시 돌려도 안전.
-- 함수만 만든다 — 기존 정책·화면에는 영향 없음.
-- ============================================================

-- 1) 같은 파일이 이 회사에 이미 올라왔는지 — 파일 목록 전체를 열지 않고 예/아니오만
create or replace function public.pitch_file_dup(p_host uuid, p_hash text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (is_ws_admin(p_host, auth.uid()) or is_approved_member(p_host, auth.uid()))
    and exists (select 1 from pitch_files where host_id = p_host and file_hash = p_hash),
    false);
$$;
revoke all on function public.pitch_file_dup(uuid, text) from public, anon;
grant execute on function public.pitch_file_dup(uuid, text) to authenticated;

-- 2) 이메일로 초대된 관리자: 본인 행에 admin_id 채우기
--    인증된(확인 완료) 이메일과 일치할 때만. 몇 행 채웠는지 돌려준다
create or replace function public.claim_workspace_admin()
returns int
language sql
security definer
set search_path = public
as $$
  with c as (
    update workspace_admins wa
       set admin_id = u.id
      from auth.users u
     where u.id = auth.uid()
       and u.email_confirmed_at is not null
       and wa.admin_id is null
       and lower(wa.admin_email) = lower(coalesce(u.email, ''))
    returning 1
  )
  select count(*)::int from c;
$$;
revoke all on function public.claim_workspace_admin() from public, anon;
grant execute on function public.claim_workspace_admin() to authenticated;

-- 3) 사람 찾기(채팅 디렉토리): 이메일은 입력 그대로 정확히 일치할 때만,
--    이름·활동명은 부분 일치 (%, _, \ 는 이름 검색어에서만 제거 — 이메일의 _ 는 살린다)
--    이메일·전화 같은 연락처는 돌려주지 않는다
create or replace function public.member_search(q text)
returns table(id uuid, name text, artist_name text, photo_url text, roles text[], genres text[], company text)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select trim(coalesce(q, '')) as raw,
           replace(replace(replace(trim(coalesce(q, '')), '%', ''), '_', ''), '\', '') as v
  )
  select m.id, m.name, m.artist_name, m.photo_url, m.roles, m.genres, m.company
    from members m, s
   where auth.uid() is not null
     and length(s.raw) >= 2
     and m.id <> auth.uid()
     and (lower(m.email) = lower(s.raw)
          or (length(s.v) >= 2
              and (m.artist_name ilike '%' || s.v || '%'
                   or m.name ilike '%' || s.v || '%')))
   limit 15;
$$;
revoke all on function public.member_search(text) from public, anon;
grant execute on function public.member_search(text) to authenticated;

-- 4) 프로필 카드(/card, 채팅 상대): 화면에 보이는 칸만. 이메일·전화는 절대 넣지 않는다
--    반환 칸이 바뀌면 create or replace가 안 되므로 지우고 다시 만든다
drop function if exists public.member_cards(uuid[]);
create function public.member_cards(p_ids uuid[])
returns table(id uuid, name text, artist_name text, photo_url text, roles text[], genres text[], company text,
              instagram text, bio text, links jsonb)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.name, m.artist_name, m.photo_url, m.roles, m.genres, m.company,
         m.instagram, m.bio, m.links
    from members m
   where auth.uid() is not null
     and m.id = any(p_ids)
   limit 50;
$$;
revoke all on function public.member_cards(uuid[]) from public, anon;
grant execute on function public.member_cards(uuid[]) to authenticated;

-- 5) 이메일 → 멤버 id (지분표 초대용). id만 돌려준다
create or replace function public.member_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
    from members m
   where auth.uid() is not null
     and lower(m.email) = lower(trim(p_email))
   limit 1;
$$;
revoke all on function public.member_id_by_email(text) from public, anon;
grant execute on function public.member_id_by_email(text) to authenticated;
