-- ============================================================
-- 운영자 이메일 통일 (2026-09-15) — 전부 hseu2000@gmail.com 하나로
-- 호스트 승인(host_approvals)·호스트 권한 부여(host_grants)·전체 공지(notices)
-- 코드의 SUPER_ADMIN_EMAIL / BOTH_PRODUCT_EMAILS / DEVELOPER_EMAILS 와 똑같이 유지할 것.
-- Supabase SQL Editor에 통째로 붙여 실행. 다시 돌려도 안전.
-- ============================================================

begin;

-- 1) host_approvals: 본인은 읽기·'active' 첫 등록만, 상태 변경은 운영자만
drop policy if exists ha_sel on public.host_approvals;
drop policy if exists ha_ins on public.host_approvals;
drop policy if exists ha_upd on public.host_approvals;
drop policy if exists ha_del on public.host_approvals;
create policy ha_sel on public.host_approvals for select to authenticated
  using (host_id = (select auth.uid())
         or ((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');
create policy ha_ins on public.host_approvals for insert to authenticated
  with check ((host_id = (select auth.uid()) and status = 'active')
              or ((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');
create policy ha_upd on public.host_approvals for update to authenticated
  using (((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com')
  with check (((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');
create policy ha_del on public.host_approvals for delete to authenticated
  using (((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');

-- 2) host_grants: 본인 이메일 행은 읽기, 부여·회수는 운영자만
drop policy if exists hg_policy on public.host_grants;
create policy hg_policy on public.host_grants for all to authenticated
  using (lower(email) = lower((select auth.jwt()) ->> 'email')
         or ((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com')
  with check (((select auth.jwt()) ->> 'email') = 'hseu2000@gmail.com');

-- 3) notices: 전체 공지(is_global)는 운영자만
drop policy if exists "본인만 작성" on public.notices;
create policy "본인만 작성" on public.notices
  for insert
  with check (
    (select auth.uid()) = host_id
    and (not coalesce(is_global, false) or (select auth.jwt() ->> 'email') = 'hseu2000@gmail.com')
  );
drop policy if exists "본인만 수정" on public.notices;
create policy "본인만 수정" on public.notices
  for update
  using ((select auth.uid()) = host_id)
  with check (
    (select auth.uid()) = host_id
    and (not coalesce(is_global, false) or (select auth.jwt() ->> 'email') = 'hseu2000@gmail.com')
  );

commit;
