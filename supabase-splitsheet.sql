-- ════════════════════════════════════════════════════════════════
-- Split Sheet (전세계 표준 저작권 지분 문서)
--   · copyright_profiles : 유저별 저장 저작권 프로필(PRO/IPI/퍼블리셔/연락처) — 자동채움용
--   · split_sheets       : 곡 단위 스플릿시트 헤더 (ISWC 등)
--   · split_contributors : 기여자 행 (작사/작곡/편곡 지분 각각 + PRO 스냅샷 + 서명)
-- SECURITY DEFINER 헬퍼로 RLS 상호재귀 방지. Idempotent — 재실행 안전.
-- Supabase → SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════

-- 1) 유저별 저작권 프로필 (계정에 1회 저장 → 스플릿시트에서 자동채움)
create table if not exists copyright_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legal_name     text,
  stage_name     text,
  pro            text,   -- 저작권협회 코드 (KOMCA, ASCAP, ...)
  ipi            text,   -- IPI/CAE 번호 (CISAC 전세계 작가 식별번호)
  publisher_name text,
  publisher_pro  text,
  publisher_ipi  text,
  email          text,
  phone          text,
  address        text,
  updated_at     timestamptz default now()
);
alter table copyright_profiles enable row level security;

drop policy if exists "copyright_profiles_own" on copyright_profiles;
create policy "copyright_profiles_own" on copyright_profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- 스플릿시트 작성 시 기여자 정보 자동채움을 위해 로그인 유저는 읽기 가능
-- (전문 저작권 크레딧 정보 — 스플릿시트 공유 목적)
drop policy if exists "copyright_profiles_read" on copyright_profiles;
create policy "copyright_profiles_read" on copyright_profiles for select
  using (auth.uid() is not null);

-- 2) 스플릿시트 헤더 (곡 단위)
create table if not exists split_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id        uuid references auth.users(id) on delete cascade not null,
  song_title      text,
  aka             text,
  artist_name     text,
  album           text,
  duration        text,
  iswc            text,   -- International Standard Musical Work Code
  isrc            text,
  contains_sample boolean default false,
  sample_note     text,
  work_date       date,
  notes           text,
  audio_path      text,   -- 첨부 음원 storage 경로 (member-demos 버킷) — 합의된 지분을 실제 곡에 결속
  audio_name      text,   -- 원본 파일명 (시트/PDF 표기)
  locked          boolean default false,     -- 전원 서명 후 확정(잠금)
  locked_at       timestamptz,
  version         int default 1,             -- 잠금 해제(수정) 시 증가
  signature_requested_at timestamptz,        -- 오너가 기여자에게 서명 요청한 시각
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table split_sheets enable row level security;
-- 기존 테이블이 있으면 컬럼만 추가 (재실행 안전)
alter table split_sheets add column if not exists audio_path text;
alter table split_sheets add column if not exists audio_name text;
alter table split_sheets add column if not exists locked boolean default false;
alter table split_sheets add column if not exists locked_at timestamptz;
alter table split_sheets add column if not exists version int default 1;
alter table split_sheets add column if not exists signature_requested_at timestamptz;

-- 3) 기여자 행
create table if not exists split_contributors (
  id uuid primary key default gen_random_uuid(),
  sheet_id           uuid references split_sheets(id) on delete cascade not null,
  user_id            uuid references auth.users(id) on delete set null, -- 연동 계정(선택)
  category           text,               -- 'lyrics' | 'composition' | 'arrangement'
  share              numeric default 0,  -- 해당 카테고리 내 % (카테고리별 합계 100)
  legal_name         text,
  stage_name         text,
  pro                text,
  ipi                text,
  publisher_name     text,
  publisher_pro      text,
  publisher_ipi      text,
  email              text,
  phone              text,
  address            text,
  signed             boolean default false,
  signed_at          timestamptz,
  signature_name     text,               -- 서명 시 입력한 법적 이름
  signature_data     text,               -- 그린 서명 PNG (data URL)
  signed_hash        text,               -- 서명 시점 문서 스냅샷의 SHA-256
  order_index        int default 0,
  created_at         timestamptz default now()
);
alter table split_contributors enable row level security;
-- 기존 테이블 컬럼 추가 (재실행 안전)
alter table split_contributors add column if not exists category text;
alter table split_contributors add column if not exists share numeric default 0;
alter table split_contributors add column if not exists signature_name text;
alter table split_contributors add column if not exists signature_data text;
alter table split_contributors add column if not exists signed_hash text;

-- 4) 상호재귀 방지 헬퍼 (security definer = RLS 우회)
create or replace function is_split_owner(p_sheet_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from split_sheets where id = p_sheet_id and owner_id = auth.uid());
$$;

create or replace function is_split_contributor(p_sheet_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from split_contributors where sheet_id = p_sheet_id and user_id = auth.uid());
$$;

-- 5) split_sheets 정책: 오너 전권 + 기여자 읽기
drop policy if exists "split_sheets_owner" on split_sheets;
create policy "split_sheets_owner" on split_sheets for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "split_sheets_contributor_read" on split_sheets;
create policy "split_sheets_contributor_read" on split_sheets for select
  using (is_split_contributor(id));

-- 6) split_contributors 정책: 시트 오너 전권 + 본인 행 읽기/수정(서명)
drop policy if exists "split_contrib_owner" on split_contributors;
create policy "split_contrib_owner" on split_contributors for all
  using (is_split_owner(sheet_id)) with check (is_split_owner(sheet_id));

drop policy if exists "split_contrib_self_read" on split_contributors;
create policy "split_contrib_self_read" on split_contributors for select
  using (auth.uid() = user_id);

drop policy if exists "split_contrib_self_update" on split_contributors;
create policy "split_contrib_self_update" on split_contributors for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 7) 외부(계정 없는) 협업자 서명 링크
--    각 기여자 행에 비밀 토큰. /split/sign/<token> 공개 페이지에서
--    로그인 없이 자기 지분 확인·서명. RLS 대신 SECURITY DEFINER RPC로 안전 처리.
-- ────────────────────────────────────────────────────────────────
alter table split_contributors add column if not exists sign_token uuid default gen_random_uuid();
update split_contributors set sign_token = gen_random_uuid() where sign_token is null;
create unique index if not exists split_contrib_sign_token_idx on split_contributors(sign_token);

-- 토큰으로 시트+기여자 조회 (익명 허용)
create or replace function split_get_by_token(p_token uuid)
returns jsonb language plpgsql security definer stable as $$
declare v_sheet_id uuid; v_result jsonb;
begin
  select sheet_id into v_sheet_id from split_contributors where sign_token = p_token;
  if v_sheet_id is null then return null; end if;
  select jsonb_build_object(
    'sheet', to_jsonb(s.*),
    'me', to_jsonb(c.*),
    'contributors', (select jsonb_agg(to_jsonb(x.*) order by x.order_index) from split_contributors x where x.sheet_id = v_sheet_id)
  ) into v_result
  from split_sheets s
  join split_contributors c on c.sign_token = p_token
  where s.id = v_sheet_id;
  return v_result;
end; $$;

-- 토큰으로 서명 제출 (잠금 안 된 경우만)
create or replace function split_sign_by_token(p_token uuid, p_name text, p_data text, p_hash text)
returns boolean language plpgsql security definer as $$
declare v_locked boolean;
begin
  select s.locked into v_locked from split_contributors c join split_sheets s on s.id = c.sheet_id where c.sign_token = p_token;
  if v_locked is null or v_locked then return false; end if;
  update split_contributors
    set signed = true, signed_at = now(), signature_name = coalesce(nullif(p_name,''), legal_name), signature_data = nullif(p_data,''), signed_hash = p_hash
    where sign_token = p_token;
  return true;
end; $$;

grant execute on function split_get_by_token(uuid) to anon, authenticated;
grant execute on function split_sign_by_token(uuid, text, text, text) to anon, authenticated;
