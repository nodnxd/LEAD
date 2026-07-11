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
  using (auth.role() = 'authenticated');

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
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table split_sheets enable row level security;

-- 3) 기여자 행
create table if not exists split_contributors (
  id uuid primary key default gen_random_uuid(),
  sheet_id           uuid references split_sheets(id) on delete cascade not null,
  user_id            uuid references auth.users(id) on delete set null, -- 연동 계정(선택)
  legal_name         text,
  stage_name         text,
  lyrics_share       numeric default 0,  -- 작사 % (열 합계 100)
  composition_share  numeric default 0,  -- 작곡 %
  arrangement_share  numeric default 0,  -- 편곡 %
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
  order_index        int default 0,
  created_at         timestamptz default now()
);
alter table split_contributors enable row level security;

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
