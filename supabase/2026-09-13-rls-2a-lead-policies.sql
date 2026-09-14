-- ============================================================
-- LEAD 보안 정리 (2026-09-13) · 2a — 정책 교체
-- ② 새 코드 배포 후에 실행 (순서: 2a → 2b). 1c(split-storage)를 먼저 실행했는지 확인
--    (대시보드 멤버 카드의 저작권 칸이 ws_member_copyright 함수를 쓴다)
-- Supabase SQL Editor에 파일 전체를 붙여 실행. 다시 돌려도 안전.
-- begin/commit으로 묶음: 중간에 한 줄이라도 실패하면 전부 되돌려
--   '옛 정책은 지워졌는데 새 정책은 없는' 반쯤 바뀐 상태가 남지 않게 한다.
-- ============================================================

begin;

-- 1) leads: 읽기는 회사 관리자·승인 멤버, 쓰기는 관리자만 (비로그인 공개 읽기 제거)
drop policy if exists "Public read leads" on public.leads;
drop policy if exists "approved guests view leads" on public.leads;
drop policy if exists host_manage on public.leads;
drop policy if exists host_write_leads on public.leads;
drop policy if exists leads_read on public.leads;
drop policy if exists member_read on public.leads;
drop policy if exists "users can manage own leads" on public.leads;
drop policy if exists ws_admin_all on public.leads;
drop policy if exists leads_select on public.leads;
drop policy if exists leads_insert on public.leads;
drop policy if exists leads_update on public.leads;
drop policy if exists leads_delete on public.leads;
create policy leads_select on public.leads for select to authenticated
  using (is_ws_admin(host_id, (select auth.uid())) or is_approved_member(host_id, (select auth.uid())));
create policy leads_insert on public.leads for insert to authenticated
  with check (is_ws_admin(host_id, (select auth.uid())));
create policy leads_update on public.leads for update to authenticated
  using (is_ws_admin(host_id, (select auth.uid())))
  with check (is_ws_admin(host_id, (select auth.uid())));
create policy leads_delete on public.leads for delete to authenticated
  using (is_ws_admin(host_id, (select auth.uid())));

-- 2) pitches: 본인 피칭 또는 관리자만 읽기. 넣기는 승인 멤버(본인 명의)나 관리자,
--    그리고 그 회사의 리드에만. 수정·삭제는 관리자
drop policy if exists "auth insert pitches" on public.pitches;
drop policy if exists "host delete own pitches" on public.pitches;
drop policy if exists "host read pitches" on public.pitches;
drop policy if exists "host update pitches" on public.pitches;
drop policy if exists pitches_access on public.pitches;
drop policy if exists pitches_delete on public.pitches;
drop policy if exists pitches_insert on public.pitches;
drop policy if exists pitches_select on public.pitches;
drop policy if exists pitches_update on public.pitches;
drop policy if exists "public insert pitches" on public.pitches;
drop policy if exists ws_admin_all on public.pitches;
drop policy if exists pitches_sel on public.pitches;
drop policy if exists pitches_ins on public.pitches;
drop policy if exists pitches_upd on public.pitches;
drop policy if exists pitches_del on public.pitches;
create policy pitches_sel on public.pitches for select to authenticated
  using (member_id = (select auth.uid()) or is_ws_admin(host_id, (select auth.uid())));
create policy pitches_ins on public.pitches for insert to authenticated
  with check (
    ((member_id = (select auth.uid()) and is_approved_member(host_id, (select auth.uid())))
     or (is_ws_admin(host_id, (select auth.uid())) and (member_id is null or member_id = (select auth.uid()))))
    and exists (select 1 from public.leads l where l.id = pitches.lead_id and l.host_id = pitches.host_id)
  );
create policy pitches_upd on public.pitches for update to authenticated
  using (is_ws_admin(host_id, (select auth.uid())))
  with check (is_ws_admin(host_id, (select auth.uid())));
create policy pitches_del on public.pitches for delete to authenticated
  using (is_ws_admin(host_id, (select auth.uid())));

-- 3) pitch_files: 관리자 또는 그 피칭 주인만 읽기. 넣기는 같은 회사 피칭에만
drop policy if exists "anon insert pf" on public.pitch_files;
drop policy if exists "auth insert pf" on public.pitch_files;
drop policy if exists "host delete pf" on public.pitch_files;
drop policy if exists "host read pf" on public.pitch_files;
drop policy if exists pitch_files_access on public.pitch_files;
drop policy if exists pitch_files_delete on public.pitch_files;
drop policy if exists pitch_files_insert on public.pitch_files;
drop policy if exists pitch_files_select on public.pitch_files;
drop policy if exists pitch_files_update on public.pitch_files;
drop policy if exists ws_admin_all on public.pitch_files;
drop policy if exists pf_sel on public.pitch_files;
drop policy if exists pf_ins on public.pitch_files;
drop policy if exists pf_upd on public.pitch_files;
drop policy if exists pf_del on public.pitch_files;
create policy pf_sel on public.pitch_files for select to authenticated
  using (is_ws_admin(host_id, (select auth.uid()))
         or exists (select 1 from public.pitches p where p.id = pitch_files.pitch_id and p.member_id = (select auth.uid())));
create policy pf_ins on public.pitch_files for insert to authenticated
  with check (exists (select 1 from public.pitches p
                      where p.id = pitch_files.pitch_id and p.host_id = pitch_files.host_id
                        and (p.member_id = (select auth.uid()) or is_ws_admin(p.host_id, (select auth.uid())))));
create policy pf_upd on public.pitch_files for update to authenticated
  using (is_ws_admin(host_id, (select auth.uid())))
  with check (is_ws_admin(host_id, (select auth.uid())));
create policy pf_del on public.pitch_files for delete to authenticated
  using (is_ws_admin(host_id, (select auth.uid())));

-- 4) member_approvals: 본인·관리자·같은 팀 읽기. 본인은 'pending'으로만 요청, 결정은 관리자
drop policy if exists ma_insert on public.member_approvals;
drop policy if exists ma_read on public.member_approvals;
drop policy if exists ma_update on public.member_approvals;
drop policy if exists members_read_team on public.member_approvals;
drop policy if exists ws_admin_all on public.member_approvals;
drop policy if exists ma_sel on public.member_approvals;
drop policy if exists ma_ins on public.member_approvals;
drop policy if exists ma_upd on public.member_approvals;
drop policy if exists ma_del on public.member_approvals;
create policy ma_sel on public.member_approvals for select to authenticated
  using (member_id = (select auth.uid())
         or is_ws_admin(host_id, (select auth.uid()))
         or is_approved_member(host_id, (select auth.uid())));
create policy ma_ins on public.member_approvals for insert to authenticated
  with check ((member_id = (select auth.uid()) and status = 'pending')
              or is_ws_admin(host_id, (select auth.uid())));
create policy ma_upd on public.member_approvals for update to authenticated
  using (is_ws_admin(host_id, (select auth.uid())))
  with check (is_ws_admin(host_id, (select auth.uid())));
create policy ma_del on public.member_approvals for delete to authenticated
  using (is_ws_admin(host_id, (select auth.uid())));

-- 5) workspace_admins: 읽기는 회사 주인·본인·공동 관리자. 초대·삭제는 주인만 (admin_id 비운 채로),
--    admin_id 채우기는 claim_workspace_admin()으로만 (UPDATE 정책 없음)
drop policy if exists wa_owner on public.workspace_admins;
drop policy if exists wa_sel on public.workspace_admins;
drop policy if exists wa_ins on public.workspace_admins;
drop policy if exists wa_del on public.workspace_admins;
create policy wa_sel on public.workspace_admins for select to authenticated
  using (workspace_id = (select auth.uid()) or admin_id = (select auth.uid())
         or is_ws_admin(workspace_id, (select auth.uid())));
create policy wa_ins on public.workspace_admins for insert to authenticated
  with check (workspace_id = (select auth.uid()) and admin_id is null);
create policy wa_del on public.workspace_admins for delete to authenticated
  using (workspace_id = (select auth.uid()));

-- 6) host_approvals: 본인은 읽기와 'active' 첫 등록만, 상태 변경은 운영자 이메일만
drop policy if exists ha_self on public.host_approvals;
drop policy if exists ha_sel on public.host_approvals;
drop policy if exists ha_ins on public.host_approvals;
drop policy if exists ha_upd on public.host_approvals;
drop policy if exists ha_del on public.host_approvals;
create policy ha_sel on public.host_approvals for select to authenticated
  using (host_id = (select auth.uid())
         or ((select auth.jwt()) ->> 'email') = 'everplayground@gmail.com');
create policy ha_ins on public.host_approvals for insert to authenticated
  with check ((host_id = (select auth.uid()) and status = 'active')
              or ((select auth.jwt()) ->> 'email') = 'everplayground@gmail.com');
create policy ha_upd on public.host_approvals for update to authenticated
  using (((select auth.jwt()) ->> 'email') = 'everplayground@gmail.com')
  with check (((select auth.jwt()) ->> 'email') = 'everplayground@gmail.com');
create policy ha_del on public.host_approvals for delete to authenticated
  using (((select auth.jwt()) ->> 'email') = 'everplayground@gmail.com');

-- 7) host_profiles: 읽기는 공개 (로그인 전 회사 이름 표시), 쓰기는 그 회사 관리자
drop policy if exists host_profiles_read on public.host_profiles;
drop policy if exists host_profiles_write on public.host_profiles;
drop policy if exists ws_admin_hp on public.host_profiles;
drop policy if exists hp_sel on public.host_profiles;
drop policy if exists hp_ins on public.host_profiles;
drop policy if exists hp_upd on public.host_profiles;
drop policy if exists hp_del on public.host_profiles;
create policy hp_sel on public.host_profiles for select to anon, authenticated
  using (true);
create policy hp_ins on public.host_profiles for insert to authenticated
  with check (is_ws_admin(id, (select auth.uid())));
create policy hp_upd on public.host_profiles for update to authenticated
  using (is_ws_admin(id, (select auth.uid())))
  with check (is_ws_admin(id, (select auth.uid())));
create policy hp_del on public.host_profiles for delete to authenticated
  using (is_ws_admin(id, (select auth.uid())));

-- 8) members: 본인·같은 팀·(가입 요청을 받은) 회사 관리자만 전체 행 읽기.
--    팀 밖 사람은 member_search / member_cards 함수로 공개 칸만
drop policy if exists members_directory on public.members;
drop policy if exists members_insert on public.members;
drop policy if exists members_read on public.members;
drop policy if exists members_read_teammates on public.members;
drop policy if exists members_update on public.members;
drop policy if exists mem_sel on public.members;
drop policy if exists mem_ins on public.members;
drop policy if exists mem_upd on public.members;
create policy mem_sel on public.members for select to authenticated
  using (id = (select auth.uid())
         or shares_team(id)
         or exists (select 1 from public.member_approvals a
                    where a.member_id = members.id and is_ws_admin(a.host_id, (select auth.uid()))));
create policy mem_ins on public.members for insert to authenticated
  with check (id = (select auth.uid()));
create policy mem_upd on public.members for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- 9) released_works: 발매작은 로그인한 사람 누구나 읽기 (쓰기 정책은 그대로)
drop policy if exists works_select on public.released_works;
create policy works_select on public.released_works for select to authenticated
  using (true);

-- 10) demo_tracks: 데모는 본인만 읽기 (다른 화면에서 읽는 곳 없음)
drop policy if exists demo_select on public.demo_tracks;
create policy demo_select on public.demo_tracks for select to authenticated
  using (member_id = (select auth.uid()));

-- 11) guest_approvals: 누구나 승인 행을 넣던 구멍 제거 (코드에서 안 씀)
drop policy if exists "anyone insert approvals" on public.guest_approvals;

-- 12) lead_announcements: 읽기는 관리자·승인 멤버, 쓰기는 관리자 (ALL 하나 대신 셋으로)
drop policy if exists "hosts manage own announcements" on public.lead_announcements;
drop policy if exists "public read announcements" on public.lead_announcements;
drop policy if exists ws_admin_all on public.lead_announcements;
drop policy if exists la_sel on public.lead_announcements;
drop policy if exists la_ins on public.lead_announcements;
drop policy if exists la_upd on public.lead_announcements;
drop policy if exists la_del on public.lead_announcements;
create policy la_sel on public.lead_announcements for select to authenticated
  using (is_ws_admin(host_id, (select auth.uid())) or is_approved_member(host_id, (select auth.uid())));
create policy la_ins on public.lead_announcements for insert to authenticated
  with check (is_ws_admin(host_id, (select auth.uid())));
create policy la_upd on public.lead_announcements for update to authenticated
  using (is_ws_admin(host_id, (select auth.uid())))
  with check (is_ws_admin(host_id, (select auth.uid())));
create policy la_del on public.lead_announcements for delete to authenticated
  using (is_ws_admin(host_id, (select auth.uid())));

-- 13) friendships: 요청은 누구에게나 'pending'으로. 바로 'accepted'는 같은 팀일 때만,
--     받은 사람은 수락 가능
drop policy if exists friendships_insert on public.friendships;
drop policy if exists friendships_update on public.friendships;
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid())
              and (coalesce(status, 'pending') <> 'accepted' or shares_team(recipient_id)));
create policy friendships_update on public.friendships for update to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id))
  with check ((select auth.uid()) in (requester_id, recipient_id)
              and (recipient_id = (select auth.uid())
                   or coalesce(status, 'pending') <> 'accepted'
                   or shares_team(recipient_id)));

-- 14) guests: 앱 코드에서 전혀 안 쓰는 옛 테이블. 누구나 넣기·로그인한 누구나 읽기/수정하던
--     정책을 지우고 본인 행 읽기("guest read own")만 남긴다
drop policy if exists "anyone insert guests" on public.guests;
drop policy if exists "authenticated select guests" on public.guests;
drop policy if exists "host read all guests" on public.guests;
drop policy if exists "host update guests" on public.guests;

commit;
