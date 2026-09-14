-- 2026-09-13 · 1c · SPLIT + 스토리지 + 함수 권한 정리
-- ① 코드 배포 전에 실행 (순서: 1a → 1b → 1c). 새 코드가 ws_member_copyright를 부르므로 배포 전에 필요.
-- storage 정책 DDL이 권한 오류로 거부되면 이 파일 전체가 적용되지 않으니 오류 메시지를 확인할 것.
-- Supabase SQL 편집기에 통째로 붙여 한 번에 실행. 다시 돌려도 안전하다.
-- 순서: 0) 이미 적용분 사본 → 1) SPLIT 정책·함수·트리거 → 2) 스토리지 → 3) 함수 권한
-- (정책을 authenticated로 옮긴 뒤에야 헬퍼 함수를 anon에서 뺄 수 있다)

-- ─────────────────────────────────────────────────────────────
-- 0) 이미 운영에 적용된 것 — 재실행해도 아무 일 없음
-- ─────────────────────────────────────────────────────────────
alter table public.split_signature_events add column if not exists signer_uid uuid;
drop function if exists public.split_sign_self(uuid, text, text, text);
drop function if exists public.split_sign_by_token(text, text, text, text);
drop policy if exists sig_events_append on public.split_signature_events;

-- ─────────────────────────────────────────────────────────────
-- 1-1) SPLIT 정책을 로그인 사용자 전용으로 (정책이 없으면 건너뜀)
-- ─────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select * from (values
    ('split_sheets', 'split_sheets_owner'),
    ('split_sheets', 'split_sheets_contributor_read'),
    ('split_contributors', 'split_contrib_owner'),
    ('split_contributors', 'split_contrib_self_read'),
    ('split_signature_events', 'sig_events_read'),
    ('copyright_profiles', 'copyright_profiles_own')
  ) v(tbl, pol)
  loop
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = r.tbl and policyname = r.pol) then
      execute format('alter policy %I on public.%I to authenticated', r.pol, r.tbl);
    end if;
  end loop;
end $$;

-- 1-2) 이메일로 저작권 프로필 조회 — 전화·주소·서명 이미지는 빼고 돌려준다
--      (반환형 jsonb는 기존과 같아서 create or replace 가능)
create or replace function public.copyright_profile_by_email(p_email text)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id, 'legal_name', p.legal_name, 'stage_name', p.stage_name,
    'pro', p.pro, 'ipi', p.ipi,
    'publisher_name', p.publisher_name, 'publisher_pro', p.publisher_pro, 'publisher_ipi', p.publisher_ipi,
    'email', p.email)
  from copyright_profiles p
  where auth.uid() is not null
    and lower(p.email) = lower(trim(p_email))
  limit 1;
$$;

-- 1-3) 서명 링크 페이지용 — 예전엔 시트·내 행 전체(to_jsonb *)를 넘겨 메모·연락처·토큰까지 샜다.
--      페이지가 그리고 해시하는 필드만. 반환형 json·정렬 순서는 기존 그대로(해시가 순서에 의존).
create or replace function public.split_get_by_token(p_token text)
returns json
language sql stable security definer
set search_path = public, pg_temp
as $$
  select json_build_object(
    'sheet', json_build_object(
      'song_title', s.song_title, 'artist_name', s.artist_name, 'iswc', s.iswc,
      'audio_name', s.audio_name, 'version', s.version, 'locked', s.locked),
    'me', json_build_object(
      'id', c.id, 'legal_name', c.legal_name, 'category', c.category,
      'share', c.share, 'signed', c.signed),
    'contributors', coalesce((
      select json_agg(json_build_object(
        'id', x.id, 'category', x.category, 'share', x.share,
        'legal_name', x.legal_name, 'stage_name', x.stage_name,
        'pro', x.pro, 'signed', x.signed
      ) order by x.order_index nulls last, x.created_at)
      from split_contributors x where x.sheet_id = s.id), '[]'::json)
  )
  from split_contributors c
  join split_sheets s on s.id = c.sheet_id
  where p_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and c.sign_token = p_token::uuid;
$$;

-- 1-4) 서명 컬럼은 서명 RPC로만 — 오너가 테이블에 직접 signed=true를 써 넣던 구멍을 막는다.
--      값이 "새로 생기거나 바뀔 때"만 막는다: 지우기(잠금 해제·서명 취소)와 서명된 행의 다른 칸 수정은 통과.
--      SECURITY DEFINER RPC는 소유자 권한(current_user=postgres)으로 돌아 통과한다.
--      이 함수는 절대 security definer로 만들지 말 것 — current_user 판별이 깨진다.
create or replace function public.split_guard_signature_cols()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare bad boolean;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    bad := coalesce(new.signed, false) or coalesce(new.consent_agreed, false)
        or new.signed_at is not null or new.signature_name is not null or new.signature_data is not null
        or new.signed_hash is not null or new.signed_ip is not null or new.signed_ua is not null
        or new.sign_method is not null or new.signed_email is not null;
  else
    bad := (coalesce(new.signed, false) and not coalesce(old.signed, false))
        or (coalesce(new.consent_agreed, false) and not coalesce(old.consent_agreed, false))
        or (new.signed_at is not null and new.signed_at is distinct from old.signed_at)
        or (new.signature_name is not null and new.signature_name is distinct from old.signature_name)
        or (new.signature_data is not null and new.signature_data is distinct from old.signature_data)
        or (new.signed_hash is not null and new.signed_hash is distinct from old.signed_hash)
        or (new.signed_ip is not null and new.signed_ip is distinct from old.signed_ip)
        or (new.signed_ua is not null and new.signed_ua is distinct from old.signed_ua)
        or (new.sign_method is not null and new.sign_method is distinct from old.sign_method)
        or (new.signed_email is not null and new.signed_email is distinct from old.signed_email);
  end if;
  if bad then raise exception '서명 컬럼은 서명 RPC로만 기록됩니다'; end if;
  return new;
end $$;

drop trigger if exists split_contrib_sig_guard on public.split_contributors;
create trigger split_contrib_sig_guard
  before insert or update on public.split_contributors
  for each row execute function public.split_guard_signature_cols();

-- 1-5) 워크스페이스 관리자용 멤버 저작권 정보 — 테이블 통째 SELECT 대신 필요한 칸만
create or replace function public.ws_member_copyright(p_ws uuid)
returns table(id uuid, legal_name text, pro text, ipi text, phone text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select cp.id, cp.legal_name, cp.pro, cp.ipi, cp.phone
  from copyright_profiles cp
  where is_ws_admin(p_ws, auth.uid())
    and exists (select 1 from member_approvals ma where ma.host_id = p_ws and ma.member_id = cp.id);
$$;

-- ─────────────────────────────────────────────────────────────
-- 2) 스토리지 (storage.objects 정책)
--    SQL 편집기가 권한 오류로 storage.objects 정책 DDL을 거부하면
--    Dashboard → Storage → Policies에서 같은 내용으로 만들 것.
-- ─────────────────────────────────────────────────────────────

-- 2-1) pitch-files — 공개 버킷 유지(<audio>가 공개 URL 사용). 업로드는 1시간 안에 만든 내 피칭 폴더에만.
--      경로: <hostId>/<pitchId>/<파일>
create or replace function public.pitch_upload_ok(p_name text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from pitches p
    where p.host_id::text = (storage.foldername(p_name))[1]
      and p.id::text = (storage.foldername(p_name))[2]
      -- member_id가 비어 있으면(관리자가 대신 올린 피칭) 그 워크스페이스 관리자만
      and (p.member_id = auth.uid() or (p.member_id is null and public.is_ws_admin(p.host_id, auth.uid())))
      and p.created_at > now() - interval '1 hour');
$$;

-- 업로드 코드는 항상 contentType 'audio/mpeg'이라 걸어도 되지만, 확장자 .mp3만 검사하고
-- 내용은 안 보므로 실익이 작고 버킷 설정은 다른 경로(대시보드 수동 업로드 등)도 막는다 — 보류.
-- update storage.buckets set allowed_mime_types = array['audio/mpeg'] where id = 'pitch-files';

drop policy if exists "allow all pitch-files uploads" on storage.objects;
drop policy if exists "auth delete pitch files" on storage.objects;
drop policy if exists "public read pitch files" on storage.objects;
drop policy if exists pitch_obj_insert on storage.objects;
drop policy if exists pitch_obj_select on storage.objects;
drop policy if exists pitch_obj_delete on storage.objects;

create policy pitch_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pitch-files' and public.pitch_upload_ok(name));

create policy pitch_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'pitch-files' and (
    owner = auth.uid()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.workspace_admins w
               where w.workspace_id::text = (storage.foldername(name))[1] and w.admin_id = auth.uid())));

create policy pitch_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'pitch-files' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.workspace_admins w
               where w.workspace_id::text = (storage.foldername(name))[1] and w.admin_id = auth.uid())));

-- 2-2) artist - photo — 공개 유지. 쓰기는 내 폴더(<uid>/...)만.
drop policy if exists "allow all 1kebova_0" on storage.objects;
drop policy if exists "allow all 1kebova_1" on storage.objects;
drop policy if exists "allow all 1kebova_2" on storage.objects;
drop policy if exists "allow all 1kebova_3" on storage.objects;
drop policy if exists artist_photo_own on storage.objects;

create policy artist_photo_own on storage.objects for all to authenticated
  using (bucket_id = 'artist - photo' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'artist - photo' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2-3) member-photos — getPublicUrl로 쓰는데 비공개라 아바타가 깨져 있었다 → 공개로.
--      쓰기는 members/<uid>/, hosts/<uid>/ 만.
update storage.buckets set public = true where id = 'member-photos';

drop policy if exists member_photos_read on storage.objects;
drop policy if exists member_photos_update on storage.objects;
drop policy if exists member_photos_upload on storage.objects;
drop policy if exists member_photos_own on storage.objects;

create policy member_photos_own on storage.objects for all to authenticated
  using (bucket_id = 'member-photos'
    and (storage.foldername(name))[1] in ('members', 'hosts')
    and (storage.foldername(name))[2] = auth.uid()::text)
  with check (bucket_id = 'member-photos'
    and (storage.foldername(name))[1] in ('members', 'hosts')
    and (storage.foldername(name))[2] = auth.uid()::text);

-- 2-4) member-demos — 비공개 유지. demos/<uid>/ 는 본인만, split/<sheetId>/ 는 시트 오너(쓰기)·기여자(읽기).
--      (지금 코드상 남의 데모를 재생하는 곳은 없음 — 본인 마이페이지/게스트 페이지에서만 서명 URL 생성)
drop policy if exists member_demos_delete on storage.objects;
drop policy if exists member_demos_read on storage.objects;
drop policy if exists member_demos_upload on storage.objects;
drop policy if exists member_demos_read2 on storage.objects;
drop policy if exists member_demos_write on storage.objects;

create policy member_demos_read2 on storage.objects for select to authenticated
  using (bucket_id = 'member-demos' and (
    ((storage.foldername(name))[1] = 'demos' and (storage.foldername(name))[2] = auth.uid()::text)
    or ((storage.foldername(name))[1] = 'split' and exists (
      select 1 from public.split_sheets s
      where s.id::text = (storage.foldername(name))[2]
        and (s.owner_id = auth.uid() or public.is_split_contributor(s.id))))));

create policy member_demos_write on storage.objects for all to authenticated
  using (bucket_id = 'member-demos' and (
    ((storage.foldername(name))[1] = 'demos' and (storage.foldername(name))[2] = auth.uid()::text)
    or ((storage.foldername(name))[1] = 'split' and exists (
      select 1 from public.split_sheets s
      where s.id::text = (storage.foldername(name))[2] and s.owner_id = auth.uid()))))
  with check (bucket_id = 'member-demos' and (
    ((storage.foldername(name))[1] = 'demos' and (storage.foldername(name))[2] = auth.uid()::text)
    or ((storage.foldername(name))[1] = 'split' and exists (
      select 1 from public.split_sheets s
      where s.id::text = (storage.foldername(name))[2] and s.owner_id = auth.uid()))));

-- 2-5) guest-photos — 안 쓰는 버킷(객체 0개). 정책 제거·비공개.
drop policy if exists "guest upload photo" on storage.objects;
drop policy if exists "public read photos" on storage.objects;
update storage.buckets set public = false where id = 'guest-photos';

-- ─────────────────────────────────────────────────────────────
-- 3) 함수 실행 권한 + search_path
--    (availability_toggle/verify는 CAST SQL이 삭제하므로 여기서 건드리지 않는다)
-- ─────────────────────────────────────────────────────────────

-- 3-1) 로그인 사용자 전용
revoke execute on function public.is_ws_admin(uuid, uuid) from public, anon;
revoke execute on function public.shares_team(uuid) from public, anon;
revoke execute on function public.is_approved_member(uuid, uuid) from public, anon;
revoke execute on function public.is_split_owner(uuid) from public, anon;
revoke execute on function public.is_split_contributor(uuid) from public, anon;
revoke execute on function public.claim_invites() from public, anon;
revoke execute on function public.split_sign_self(uuid, text, text, text, text, text) from public, anon;
revoke execute on function public.copyright_profile_by_email(text) from public, anon;
revoke execute on function public.ws_member_copyright(uuid) from public, anon;
revoke execute on function public.pitch_upload_ok(text) from public, anon;

grant execute on function public.is_ws_admin(uuid, uuid) to authenticated;
grant execute on function public.shares_team(uuid) to authenticated;
grant execute on function public.is_approved_member(uuid, uuid) to authenticated;
grant execute on function public.is_split_owner(uuid) to authenticated;
grant execute on function public.is_split_contributor(uuid) to authenticated;
grant execute on function public.claim_invites() to authenticated;
grant execute on function public.split_sign_self(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.copyright_profile_by_email(text) to authenticated;
grant execute on function public.ws_member_copyright(uuid) to authenticated;
grant execute on function public.pitch_upload_ok(text) to authenticated;

-- 3-2) 서명 링크(계정 없이) — anon 허용, public 기본 권한만 제거
revoke execute on function public.split_get_by_token(text) from public;
revoke execute on function public.split_sign_by_token(text, text, text, text, text, text) from public;
grant execute on function public.split_get_by_token(text) to anon, authenticated;
grant execute on function public.split_sign_by_token(text, text, text, text, text, text) to anon, authenticated;

-- 3-3) 호출하는 곳 없음 — 전부 막는다
revoke execute on function public.find_guest_email(text, text) from public, anon, authenticated;

-- 3-4) search_path 고정 (위에서 새로 만든 함수들은 정의에 이미 포함)
alter function public.split_sign_self(uuid, text, text, text, text, text) set search_path = public, pg_temp;
alter function public.split_sign_by_token(text, text, text, text, text, text) set search_path = public, pg_temp;
alter function public.split_block_locked() set search_path = public, pg_temp;
alter function public.works_touch_updated_at() set search_path = public, pg_temp;
alter function public.works_default_top() set search_path = public, pg_temp;
alter function public.reorder_works(text, uuid[]) set search_path = public, pg_temp;
