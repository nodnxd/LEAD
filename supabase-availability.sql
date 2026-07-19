-- 월별 가능일 투표 (availability poll)
-- 멤버별 접근코드로 본인만 자기 가능일 편집, 읽기는 공개(통계용).

-- 1) 멤버별 접근 코드 (본인 확인용)
alter table profiles add column if not exists access_code text;

update profiles
set access_code = upper(substr(md5(random()::text || id::text), 1, 6))
where access_code is null;

-- 2) 월별 가능일 투표
create table if not exists availability_polls (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  project text,
  month text not null,                 -- 'YYYY-MM'
  title text,
  is_open boolean not null default true,
  final_day int,                       -- 확정 세션일(1..31), null=미정
  created_at timestamptz default now()
);
create index if not exists availability_polls_host_idx on availability_polls (host_id, project);

-- 3) 멤버별 가능일 (여러 행; 멤버 간 같은 날 중복은 자연 허용)
create table if not exists availability_picks (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references availability_polls (id) on delete cascade,
  member_id uuid not null references profiles (id) on delete cascade,
  day int not null check (day between 1 and 31),
  created_at timestamptz default now(),
  unique (poll_id, member_id, day)
);
create index if not exists availability_picks_poll_idx on availability_picks (poll_id);

-- 4) RLS: 읽기는 공개(통계), picks 쓰기는 아래 RPC(코드검증)로만
alter table availability_polls enable row level security;
alter table availability_picks enable row level security;

drop policy if exists availability_polls_read on availability_polls;
create policy availability_polls_read on availability_polls for select using (true);
drop policy if exists availability_polls_write on availability_polls;
create policy availability_polls_write on availability_polls for all using (true) with check (true);

drop policy if exists availability_picks_read on availability_picks;
create policy availability_picks_read on availability_picks for select using (true);
-- picks에는 쓰기 정책 없음 → security definer RPC로만 기록됨

-- 5) 코드 검증 (본인 확인)
create or replace function availability_verify(p_member uuid, p_code text)
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = p_member and access_code is not null and access_code = p_code
  );
$$;

-- 6) 코드 검증 후 가능일 토글 (anon 호출 가능, DB가 코드 확인)
create or replace function availability_toggle(
  p_poll uuid, p_member uuid, p_code text, p_day int, p_on boolean
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not availability_verify(p_member, p_code) then
    raise exception 'invalid code';
  end if;
  if not exists (select 1 from availability_polls where id = p_poll and is_open) then
    raise exception 'poll closed';
  end if;
  if p_on then
    insert into availability_picks (poll_id, member_id, day)
    values (p_poll, p_member, p_day)
    on conflict (poll_id, member_id, day) do nothing;
  else
    delete from availability_picks
    where poll_id = p_poll and member_id = p_member and day = p_day;
  end if;
end;
$$;

grant execute on function availability_verify(uuid, text) to anon, authenticated;
grant execute on function availability_toggle(uuid, uuid, text, int, boolean) to anon, authenticated;
