-- 2026-09-15 · SPLIT 서명 2 · 잠금 우회 차단 트리거
-- ② 새 코드 배포 후에 실행. (예전 클라는 split_sheets.locked/version을 직접 UPDATE하므로 배포 전에 돌리면 확정·해제가 깨진다)
-- 선행: 2026-09-15-split-signing-1-functions.sql(①). 다시 돌려도 안전하다.
--
-- 규칙: current_user가 authenticated/anon이면 클라이언트의 직접 쓰기다.
--       split_lock/split_unlock 같은 정의자 RPC 안에서는 current_user가 함수 소유자라 통과한다.

-- ─────────────────────────────────────────────────────────────
-- 1) split_sheets — 확정/해제/버전은 RPC로만, 확정 중엔 내용 수정 금지
-- ─────────────────────────────────────────────────────────────
create or replace function public.split_sheet_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    -- 처음부터 locked=true로 만들면 서명 없이 확정본이 생긴다
    new.locked := false;
    new.locked_at := null;
    return new;
  end if;
  if new.locked is distinct from old.locked
     or new.locked_at is distinct from old.locked_at
     or new.version is distinct from old.version then
    raise exception '확정·해제·버전은 split_lock / split_unlock으로만 바꿀 수 있습니다' using errcode = '42501';
  end if;
  -- 확정 중엔 메모·서명요청 시각·수정시각 말고는 한 글자도 못 바꾼다
  if coalesce(old.locked, false)
     and (to_jsonb(new) - array['notes', 'updated_at', 'signature_requested_at'])
         is distinct from (to_jsonb(old) - array['notes', 'updated_at', 'signature_requested_at']) then
    raise exception '확정(잠금)된 시트는 수정할 수 없습니다';
  end if;
  return new;
end $$;

drop trigger if exists split_sheet_guard on public.split_sheets;
create trigger split_sheet_guard
  before insert or update on public.split_sheets
  for each row execute function public.split_sheet_guard();

-- ─────────────────────────────────────────────────────────────
-- 2) split_contributors — 확정된 시트의 기여자 삭제 금지
--    (INSERT/UPDATE는 기존 split_contrib_locked 트리거가 막는다)
--    시트 삭제에 따른 CASCADE는 테이블 소유자 권한으로 돌아 여기서 막히지 않는다.
-- ─────────────────────────────────────────────────────────────
create or replace function public.split_contrib_delete_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user in ('authenticated', 'anon')
     and exists (select 1 from split_sheets s where s.id = old.sheet_id and s.locked) then
    raise exception '확정(잠금)된 시트의 기여자는 삭제할 수 없습니다';
  end if;
  return old;
end $$;

drop trigger if exists split_contrib_delete_locked on public.split_contributors;
create trigger split_contrib_delete_locked
  before delete on public.split_contributors
  for each row execute function public.split_contrib_delete_guard();
