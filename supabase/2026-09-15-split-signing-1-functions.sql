-- 2026-09-15 · SPLIT 서명 1 · 서버가 계산하는 합의 해시 + 확정/해제 RPC
-- ① 코드 배포 전에 실행. 지금 배포된 클라이언트와도 그대로 돈다:
--    서명 RPC 두 개는 시그니처가 같고, 클라가 보낸 p_hash는 저장하지 않고 일치 여부만 기록한다.
-- Supabase SQL 편집기에 통째로 붙여 한 번에 실행. 다시 돌려도 안전하다.
-- 이 뒤에 새 코드 배포 → 2026-09-15-split-signing-2-guards.sql(②) 실행.
--
-- 왜: 해시를 클라가 만들어 넘겼다. 아무 값이나 넣으면 그게 '서명한 문서'가 됐고,
--     스냅샷에 가중치·IPI·협회·퍼블리셔·버전이 빠져 있어 그걸 바꿔도 서명이 멀쩡했다.
--     기여자는 RLS상 남의 행이 안 보여 오너와 같은 해시를 만들 수조차 없었다.

-- ─────────────────────────────────────────────────────────────
-- 0) 감사 기록 테이블 보강
-- ─────────────────────────────────────────────────────────────
alter table public.split_signature_events add column if not exists version int;
alter table public.split_signature_events add column if not exists ip text;                    -- x-forwarded-for 원문(프록시 체인 전체)
alter table public.split_signature_events add column if not exists client_hash_matched boolean; -- 서명자 화면의 해시 = 서버 해시였나
-- 확정/해제 이벤트는 특정 기여자 행이 없다
alter table public.split_signature_events alter column contributor_id drop not null;
-- 기여자 행을 지우면 그 사람의 서명 기록까지 CASCADE로 사라졌다 — 증거는 남아야 한다
alter table public.split_signature_events drop constraint if exists split_signature_events_contributor_id_fkey;
alter table public.split_signature_events add constraint split_signature_events_contributor_id_fkey
  foreign key (contributor_id) references public.split_contributors(id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- 1) 정본 스냅샷 · 해시 (내부용 — 권한 확인 없음, 정의자 함수끼리만 부른다)
--    jsonb::text는 키 순서가 고정이라 같은 내용이면 같은 문자열이 나온다.
--    share는 trim_scale — 50과 50.00이 다른 해시가 되지 않게.
-- ─────────────────────────────────────────────────────────────
create or replace function public.split_snapshot_raw(p_sheet uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'sheet_id', s.id, 'version', s.version,
    'song_title', s.song_title, 'aka', s.aka, 'artist_name', s.artist_name, 'album', s.album,
    'iswc', s.iswc, 'isrc', s.isrc, 'duration', s.duration,
    'contains_sample', s.contains_sample, 'sample_note', s.sample_note, 'work_date', s.work_date,
    'audio_name', s.audio_name, 'audio_path', s.audio_path,
    'weight_lyrics', s.weight_lyrics, 'weight_composition', s.weight_composition, 'weight_arrangement', s.weight_arrangement,
    'contributors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'category', c.category, 'share', trim_scale(c.share),
        'legal_name', c.legal_name, 'stage_name', c.stage_name, 'ipi', c.ipi, 'pro', c.pro,
        'publisher_name', c.publisher_name, 'publisher_pro', c.publisher_pro, 'publisher_ipi', c.publisher_ipi
      ) order by c.id)
      from split_contributors c where c.sheet_id = s.id), '[]'::jsonb))
  from split_sheets s
  where s.id = p_sheet;
$$;

create or replace function public.split_hash_raw(p_sheet uuid)
returns text
language sql stable security definer
set search_path = public, pg_temp
as $$
  select encode(sha256(convert_to(public.split_snapshot_raw(p_sheet)::text, 'UTF8')), 'hex');
$$;

-- ─────────────────────────────────────────────────────────────
-- 2) 공개용 — 오너·기여자만
-- ─────────────────────────────────────────────────────────────
create or replace function public.split_agreement_snapshot(p_sheet uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_split_owner(p_sheet) or public.is_split_contributor(p_sheet)) then
    raise exception '이 시트에 접근 권한이 없습니다' using errcode = '42501';
  end if;
  return public.split_snapshot_raw(p_sheet);
end $$;

create or replace function public.split_agreement_hash(p_sheet uuid)
returns text
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_split_owner(p_sheet) or public.is_split_contributor(p_sheet)) then
    raise exception '이 시트에 접근 권한이 없습니다' using errcode = '42501';
  end if;
  return public.split_hash_raw(p_sheet);
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3) 서명 링크 조회 — 기존 필드·순서 그대로, 끝에 hash 하나 추가
-- ─────────────────────────────────────────────────────────────
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
      from split_contributors x where x.sheet_id = s.id), '[]'::json),
    'hash', public.split_hash_raw(s.id)
  )
  from split_contributors c
  join split_sheets s on s.id = c.sheet_id
  where p_token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and c.sign_token = p_token::uuid;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4) 서명 RPC — 시그니처는 그대로(배포된 클라 호환), 본문만 교체
--    해시·IP·UA는 서버가 정한다. p_ua는 헤더가 없을 때만 쓴다.
--    시트 행을 FOR UPDATE로 잡아 split_lock/split_unlock과 엇갈리지 않게 한다.
-- ─────────────────────────────────────────────────────────────
create or replace function public.split_sign_self(p_row_id uuid, p_name text, p_data text, p_hash text, p_consent text default '', p_ua text default '')
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_sheet uuid; v_locked boolean; v_ver int; v_hash text;
  v_h   json := nullif(current_setting('request.headers', true), '')::json;
  v_xff text := v_h ->> 'x-forwarded-for';
  v_ip  text := nullif(trim(split_part(coalesce(v_xff, v_h ->> 'x-real-ip', ''), ',', 1)), '');
  v_ua  text := coalesce(nullif(v_h ->> 'user-agent', ''), nullif(p_ua, ''));
begin
  select s.id, s.locked, s.version into v_sheet, v_locked, v_ver
    from split_contributors c join split_sheets s on s.id = c.sheet_id
   where c.id = p_row_id and c.user_id = auth.uid()
     for update of s;
  if v_sheet is null or coalesce(v_locked, false) then return false; end if;
  v_hash := public.split_hash_raw(v_sheet);
  update split_contributors
     set signed = true, signed_at = now(),
         signature_name = coalesce(nullif(p_name, ''), legal_name),
         signature_data = nullif(p_data, ''),
         signed_hash = v_hash, signed_ip = v_ip, signed_ua = v_ua,
         sign_method = 'account', signed_email = auth.jwt() ->> 'email',
         consent_agreed = coalesce(p_consent, '') <> ''
   where id = p_row_id and user_id = auth.uid();
  insert into split_signature_events
    (sheet_id, contributor_id, document_sha256, consent_text, method, signer_name, signer_uid, user_agent, version, ip, client_hash_matched)
  values (v_sheet, p_row_id, v_hash, coalesce(p_consent, ''), 'account', p_name, auth.uid(), v_ua, v_ver, v_xff, p_hash = v_hash);
  return true;
end $$;

create or replace function public.split_sign_by_token(p_token text, p_name text, p_data text, p_hash text, p_consent text default '', p_ua text default '')
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_sheet uuid; v_row uuid; v_locked boolean; v_ver int; v_hash text;
  v_h   json := nullif(current_setting('request.headers', true), '')::json;
  v_xff text := v_h ->> 'x-forwarded-for';
  v_ip  text := nullif(trim(split_part(coalesce(v_xff, v_h ->> 'x-real-ip', ''), ',', 1)), '');
  v_ua  text := coalesce(nullif(v_h ->> 'user-agent', ''), nullif(p_ua, ''));
begin
  if p_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  select s.id, c.id, s.locked, s.version into v_sheet, v_row, v_locked, v_ver
    from split_contributors c join split_sheets s on s.id = c.sheet_id
   where c.sign_token = p_token::uuid
     for update of s;
  if v_sheet is null or coalesce(v_locked, false) then return false; end if;
  v_hash := public.split_hash_raw(v_sheet);
  update split_contributors
     set signed = true, signed_at = now(),
         signature_name = coalesce(nullif(p_name, ''), legal_name),
         signature_data = nullif(p_data, ''),
         signed_hash = v_hash, signed_ip = v_ip, signed_ua = v_ua,
         sign_method = 'link', signed_email = null,
         consent_agreed = coalesce(p_consent, '') <> ''
   where id = v_row;
  insert into split_signature_events
    (sheet_id, contributor_id, document_sha256, consent_text, method, signer_name, signer_uid, user_agent, version, ip, client_hash_matched)
  values (v_sheet, v_row, v_hash, coalesce(p_consent, ''), 'link', p_name, auth.uid(), v_ua, v_ver, v_xff, p_hash = v_hash);
  return true;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 5) 확정 — 전원 서명 + 서명 해시 = 지금 해시 + 풀별 100%일 때만
-- ─────────────────────────────────────────────────────────────
create or replace function public.split_lock(p_sheet uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_locked boolean; v_ver int; v_hash text; v_bad int;
  v_h json := nullif(current_setting('request.headers', true), '')::json;
begin
  select locked, version into v_locked, v_ver
    from split_sheets where id = p_sheet and owner_id = auth.uid()
     for update;
  if not found then raise exception '시트 소유자만 확정할 수 있습니다' using errcode = '42501'; end if;
  if coalesce(v_locked, false) then raise exception '이미 확정(잠금)된 시트입니다'; end if;
  -- 확인하는 사이 행이 바뀌지 않게 잡아둔다
  perform 1 from split_contributors where sheet_id = p_sheet for update;
  if not found then raise exception '기여자가 없는 시트는 확정할 수 없습니다'; end if;
  if exists (select 1 from split_contributors where sheet_id = p_sheet and category is not null
             group by category having coalesce(sum(share), 0) <> 100) then
    raise exception '작사/작곡/편곡 지분이 각각 100%%가 아닙니다';
  end if;
  v_hash := public.split_hash_raw(p_sheet);
  select count(*) into v_bad from split_contributors
   where sheet_id = p_sheet and (not coalesce(signed, false) or signed_hash is distinct from v_hash);
  if v_bad > 0 then
    raise exception '서명이 없거나 지금 문서와 맞지 않는 서명이 %건 있습니다 — 다시 서명받은 뒤 확정하세요', v_bad;
  end if;
  update split_sheets set locked = true, locked_at = now() where id = p_sheet;
  insert into split_signature_events (sheet_id, contributor_id, document_sha256, consent_text, method, signer_uid, user_agent, version, ip)
  values (p_sheet, null, v_hash, '', 'lock', auth.uid(), v_h ->> 'user-agent', v_ver, v_h ->> 'x-forwarded-for');
end $$;

-- ─────────────────────────────────────────────────────────────
-- 6) 해제 — 버전 +1, 서명 전부 초기화, 서명 링크 전부 재발급(이전 링크 무효)
--    시트를 먼저 풀어야 split_block_locked 트리거가 기여자 UPDATE를 통과시킨다.
-- ─────────────────────────────────────────────────────────────
create or replace function public.split_unlock(p_sheet uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_locked boolean; v_ver int; v_hash text;
  v_h json := nullif(current_setting('request.headers', true), '')::json;
begin
  select locked, version into v_locked, v_ver
    from split_sheets where id = p_sheet and owner_id = auth.uid()
     for update;
  if not found then raise exception '시트 소유자만 잠금을 해제할 수 있습니다' using errcode = '42501'; end if;
  if not coalesce(v_locked, false) then raise exception '확정(잠금) 상태가 아닙니다'; end if;
  v_hash := public.split_hash_raw(p_sheet);   -- 풀리는 확정본의 해시를 기록에 남긴다
  update split_sheets set locked = false, locked_at = null, version = coalesce(version, 1) + 1 where id = p_sheet;
  update split_contributors
     set signed = false, signed_at = null, signature_name = null, signature_data = null,
         signed_hash = null, signed_ip = null, signed_ua = null, sign_method = null,
         signed_email = null, consent_agreed = false, sign_token = gen_random_uuid()
   where sheet_id = p_sheet;
  insert into split_signature_events (sheet_id, contributor_id, document_sha256, consent_text, method, signer_uid, user_agent, version, ip)
  values (p_sheet, null, v_hash, '', 'unlock', auth.uid(), v_h ->> 'user-agent', v_ver, v_h ->> 'x-forwarded-for');
end $$;

-- ─────────────────────────────────────────────────────────────
-- 7) 권한 (Supabase 기본 권한이 새 함수를 anon/authenticated에 열어두므로 명시적으로 뺀다)
-- ─────────────────────────────────────────────────────────────
revoke execute on function public.split_snapshot_raw(uuid) from public, anon, authenticated;
revoke execute on function public.split_hash_raw(uuid) from public, anon, authenticated;

revoke execute on function public.split_agreement_snapshot(uuid) from public, anon;
revoke execute on function public.split_agreement_hash(uuid) from public, anon;
revoke execute on function public.split_lock(uuid) from public, anon;
revoke execute on function public.split_unlock(uuid) from public, anon;
grant execute on function public.split_agreement_snapshot(uuid) to authenticated;
grant execute on function public.split_agreement_hash(uuid) to authenticated;
grant execute on function public.split_lock(uuid) to authenticated;
grant execute on function public.split_unlock(uuid) to authenticated;

revoke execute on function public.split_sign_self(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.split_sign_self(uuid, text, text, text, text, text) to authenticated;
revoke execute on function public.split_get_by_token(text) from public;
revoke execute on function public.split_sign_by_token(text, text, text, text, text, text) from public;
grant execute on function public.split_get_by_token(text) to anon, authenticated;
grant execute on function public.split_sign_by_token(text, text, text, text, text, text) to anon, authenticated;
