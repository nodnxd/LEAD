-- 월별 가능일 투표 (availability poll) — 최종 스키마
-- 링크 하나 + 이름 클릭으로 참여 (코드 없음). 하루당 상태: available(가능)/unavailable(불가능).
-- 읽기·쓰기 모두 공개(기존 참석투표와 동일한 신뢰모델). '확정하기'=제출 현황.

-- 1) 월별 가능일 투표
create table if not exists availability_polls (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  project text,
  month text not null,                 -- 'YYYY-MM'
  title text,
  is_open boolean not null default true,
  final_days int[] not null default '{}',   -- 확정 세션일들(여러 날 가능)
  blocked_days int[] not null default '{}',  -- 호스트가 막아둔 날(멤버 선택 불가)
  created_at timestamptz default now()
);
create index if not exists availability_polls_host_idx on availability_polls (host_id, project);

-- 2) 멤버별 가능일 (하루당 1행, 상태 포함; 멤버 간 같은 날 중복 자연 허용)
create table if not exists availability_picks (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references availability_polls (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  day int not null check (day between 1 and 31),
  status text not null default 'available',   -- 'available' | 'unavailable'
  created_at timestamptz default now(),
  unique (poll_id, member_id, day)
);
create index if not exists availability_picks_poll_idx on availability_picks (poll_id);

-- 3) 제출(확정하기) 현황
create table if not exists availability_submissions (
  poll_id uuid not null references availability_polls (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  submitted_at timestamptz default now(),
  primary key (poll_id, member_id)
);

-- 4) RLS: 공개 읽기/쓰기 (링크+이름 모델)
alter table availability_polls enable row level security;
alter table availability_picks enable row level security;
alter table availability_submissions enable row level security;

drop policy if exists availability_polls_read on availability_polls;
create policy availability_polls_read on availability_polls for select using (true);
drop policy if exists availability_polls_write on availability_polls;
create policy availability_polls_write on availability_polls for all using (true) with check (true);

drop policy if exists availability_picks_read on availability_picks;
create policy availability_picks_read on availability_picks for select using (true);
drop policy if exists availability_picks_write on availability_picks;
create policy availability_picks_write on availability_picks for all using (true) with check (true);

drop policy if exists availability_subs_rw on availability_submissions;
create policy availability_subs_rw on availability_submissions for all using (true) with check (true);
