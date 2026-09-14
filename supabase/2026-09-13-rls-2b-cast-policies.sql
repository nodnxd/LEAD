-- ============================================================
-- CAST 보안 정리 (2026-09-13) — ② 새 코드 배포 후에 실행 (순서: 2a → 2b)
-- 배포 전에 실행하면 게스트 투표·가능일 입력이 조용히 저장 안 됨.
-- 함수(1b)가 먼저 있어야 한다. 다시 돌려도 안전.
-- 공개 읽기(SELECT) 정책은 그대로 둔다 — 게스트 페이지·실시간 구독이 쓴다.
-- ============================================================

-- 1) 참석 투표: profiles 전체 공개 수정 구멍 막기 → 이제 cast_vote로만
drop policy if exists "게스트 투표 가능" on public.profiles;

-- 2) 가능일 투표판: 호스트 본인만 쓰기
drop policy if exists availability_polls_write on public.availability_polls;
drop policy if exists availability_polls_host_write on public.availability_polls;
create policy availability_polls_host_write on public.availability_polls
  for all to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id);

-- 3) 가능일 선택: 호스트는 자기 투표판만 직접(대시보드 수정), 게스트는 함수로
drop policy if exists availability_picks_write on public.availability_picks;
drop policy if exists availability_picks_host_write on public.availability_picks;
create policy availability_picks_host_write on public.availability_picks
  for all to authenticated
  using (exists (select 1 from public.availability_polls p
                 where p.id = poll_id and p.host_id = (select auth.uid())))
  with check (exists (select 1 from public.availability_polls p
                      where p.id = poll_id and p.host_id = (select auth.uid())));

-- 4) 제출 현황: 읽기만 공개, 쓰기는 함수로만 (대시보드는 읽기만 함)
drop policy if exists availability_subs_rw on public.availability_submissions;
drop policy if exists availability_subs_read on public.availability_submissions;
create policy availability_subs_read on public.availability_submissions
  for select using (true);

-- 6) 공지: 전체 공지(is_global)는 개발자만. 지금은 화면에서만 막고 있었음.
-- ⚠ 이메일 목록은 app/roster/dashboard/page.tsx 의 DEVELOPER_EMAILS 와 똑같이 유지할 것
drop policy if exists "본인만 작성" on public.notices;
create policy "본인만 작성" on public.notices
  for insert
  with check (
    (select auth.uid()) = host_id
    and (not coalesce(is_global, false)
         or (select auth.jwt() ->> 'email') = 'hseu2000@gmail.com')
  );
drop policy if exists "본인만 수정" on public.notices;
create policy "본인만 수정" on public.notices
  for update
  using ((select auth.uid()) = host_id)
  with check (
    (select auth.uid()) = host_id
    and (not coalesce(is_global, false)
         or (select auth.jwt() ->> 'email') = 'hseu2000@gmail.com')
  );
-- (삭제 "본인만 삭제"는 이미 호스트 본인만이라 그대로)

-- 7) 중복 읽기 정책 정리 — 같은 내용의 "누구나 읽기"가 각 테이블에 남아 있음. 동작 변화 없음.
drop policy if exists "anyone can read profiles" on public.profiles;
drop policy if exists "anyone can read notices" on public.notices;
drop policy if exists "anyone can read sessions" on public.sessions;
drop policy if exists "anyone can read host_settings" on public.host_settings;
drop policy if exists "anyone can read voting_sessions" on public.voting_sessions;
