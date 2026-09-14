-- ============================================================
-- CAST 보안 정리 (2026-09-13) — ① 코드 배포 전에 실행 (순서: 1a → 1b → 1c)
-- 새 함수를 만들고, 쓰기 구멍인 옛 함수를 지운다. 지금 배포된 코드는 영향 없음.
-- 다시 돌려도 안전. 정책 교체는 2b 파일(배포 후).
-- ============================================================

-- 1) 참석 투표 함수: 투표가 열려 있을 때만, attendance 한 칸만 바꾼다
create or replace function public.cast_vote(p_member uuid, p_attendance text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
begin
  -- 게스트 화면이 보내는 값은 이 두 개뿐 (초기화 null은 호스트가 직접)
  if p_attendance is null or p_attendance not in ('attending', 'absent') then
    raise exception 'invalid attendance';
  end if;
  select user_id into v_host from profiles where id = p_member;
  if v_host is null then
    raise exception 'member not found';
  end if;
  -- 뷰 페이지와 같은 기준: 그 호스트의 가장 최근 투표 세션
  if not coalesce((select is_open from voting_sessions where host_id = v_host
                   order by created_at desc limit 1), false) then
    raise exception 'voting closed';
  end if;
  update profiles set attendance = p_attendance where id = p_member;
end;
$$;
revoke all on function public.cast_vote(uuid, text) from public;
grant execute on function public.cast_vote(uuid, text) to anon, authenticated;

-- 5) 게스트 가능일 함수들
-- 공통 검사: 열린 투표판 + 그 호스트의 멤버 + 프로젝트 일치 + 제외 안 됨. 직접 호출 불가.
create or replace function public._avail_guard(p_poll uuid, p_member uuid)
returns public.availability_polls
language plpgsql
set search_path = public
as $$
declare
  v_poll availability_polls;
begin
  select * into v_poll from availability_polls where id = p_poll;
  if not found or not v_poll.is_open then
    raise exception 'poll closed';
  end if;
  -- 프로젝트 없는 투표판은 호스트 멤버 전원 (게스트 페이지와 같은 기준)
  if not exists (select 1 from profiles m
                 where m.id = p_member and m.user_id = v_poll.host_id
                   and (coalesce(v_poll.project, '') = '' or m.project = v_poll.project)) then
    raise exception 'not a member';
  end if;
  if p_member = any(coalesce(v_poll.excluded_members, '{}')) then
    raise exception 'excluded';
  end if;
  return v_poll;
end;
$$;
revoke all on function public._avail_guard(uuid, uuid) from public, anon, authenticated;

-- 날짜 칠하기/지우기. status null = 지우기. 남은 답이 없으면 제출도 취소.
create or replace function public.avail_set_picks(p_poll uuid, p_member uuid, p_days int[], p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll availability_polls;
  v_last int;
  v_days int[];
begin
  if p_status is not null and p_status not in ('available', 'unavailable') then
    raise exception 'invalid status';
  end if;
  v_poll := _avail_guard(p_poll, p_member);
  -- month는 'YYYY-MM' — 그 달 마지막 날
  v_last := extract(day from (to_date(v_poll.month || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day'))::int;
  -- 달 범위 밖·막힌 날은 버린다
  select coalesce(array_agg(distinct d), '{}') into v_days
    from unnest(coalesce(p_days, '{}')) as d
   where d between 1 and v_last and not (d = any(coalesce(v_poll.blocked_days, '{}')));
  if cardinality(v_days) = 0 then
    return;
  end if;

  if p_status is null then
    delete from availability_picks
     where poll_id = p_poll and member_id = p_member and day = any(v_days);
    if not exists (select 1 from availability_picks where poll_id = p_poll and member_id = p_member) then
      delete from availability_submissions where poll_id = p_poll and member_id = p_member;
    end if;
  else
    insert into availability_picks (poll_id, member_id, day, status)
    select p_poll, p_member, d, p_status from unnest(v_days) as d
    on conflict (poll_id, member_id, day) do update set status = excluded.status;
  end if;
end;
$$;
revoke all on function public.avail_set_picks(uuid, uuid, int[], text) from public;
grant execute on function public.avail_set_picks(uuid, uuid, int[], text) to anon, authenticated;

-- 제출(확정). 답이 하나도 없으면 거절.
create or replace function public.avail_submit(p_poll uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _avail_guard(p_poll, p_member);
  if not exists (select 1 from availability_picks where poll_id = p_poll and member_id = p_member) then
    raise exception 'no picks';
  end if;
  insert into availability_submissions (poll_id, member_id, submitted_at)
  values (p_poll, p_member, now())
  on conflict (poll_id, member_id) do update set submitted_at = excluded.submitted_at;
end;
$$;
revoke all on function public.avail_submit(uuid, uuid) from public;
grant execute on function public.avail_submit(uuid, uuid) to anon, authenticated;

-- 옛 가능일 함수 제거 (필수) — 코드에서 호출하는 곳 없음.
-- anon이 실행 가능한 definer 함수인데 access_code가 공개 읽기라, 남의 가능일을 고칠 수 있는 통로다.
drop function if exists public.availability_toggle(uuid, uuid, text, integer, boolean);
drop function if exists public.availability_verify(uuid, text);
