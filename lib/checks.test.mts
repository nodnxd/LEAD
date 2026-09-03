// 순수 로직 최소 검증. 프레임워크 없이 node 내장 러너로 돈다.
//   npm test
//
// 여기 있는 둘은 틀리면 조용히 틀리는 것들이다 —
// 지분 합계는 돈이 걸려 있고, .ics는 캘린더 앱이 삼켜버려서 화면에 에러가 안 뜬다.

import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryTotal, type Contributor } from './splitsheet.ts';
import { buildDaysIcs } from './ics.ts';

const row = (over: Partial<Contributor>): Contributor =>
  ({ id: 'x', sheet_id: 's', user_id: null, category: 'lyrics', share: 0,
     legal_name: null, stage_name: null, pro: null, ipi: null,
     publisher_name: null, publisher_pro: null, publisher_ipi: null,
     email: null, phone: null, address: null, signed: null, ...over } as Contributor);

test('categoryTotal: 해당 카테고리만 더한다', () => {
  const rows = [
    row({ category: 'lyrics', share: 50 }),
    row({ category: 'lyrics', share: 50 }),
    row({ category: 'composition', share: 100 }),
  ];
  assert.equal(categoryTotal(rows, 'lyrics'), 100);
  assert.equal(categoryTotal(rows, 'composition'), 100);
});

test('categoryTotal: null·빈 값은 0으로 센다 (NaN 오염 방지)', () => {
  const rows = [
    row({ category: 'lyrics', share: null }),
    row({ category: 'lyrics', share: 33.3 }),
    row({ category: 'lyrics', share: undefined as unknown as number }),
  ];
  assert.equal(categoryTotal(rows, 'lyrics'), 33.3);
  assert.equal(categoryTotal([], 'lyrics'), 0);
});

test('categoryTotal: 합이 100을 넘는 건 막지 않는다 — 판정은 호출부 몫', () => {
  const rows = [row({ category: 'lyrics', share: 60 }), row({ category: 'lyrics', share: 60 })];
  assert.equal(categoryTotal(rows, 'lyrics'), 120);
});

test('buildDaysIcs: 날짜를 정렬하고 종일 일정의 DTEND는 다음 날이다', () => {
  const ics = buildDaysIcs('세션', '2026-08', [5, 1], 'seed');
  const starts = [...ics.matchAll(/DTSTART;VALUE=DATE:(\d{8})/g)].map((m) => m[1]);
  assert.deepEqual(starts, ['20260801', '20260805'], '오름차순 정렬');
  assert.match(ics, /DTSTART;VALUE=DATE:20260801\r\nDTEND;VALUE=DATE:20260802/);
});

test('buildDaysIcs: 월말 다음 날은 다음 달로 넘어간다', () => {
  const ics = buildDaysIcs('세션', '2026-08', [31], 'seed');
  assert.match(ics, /DTEND;VALUE=DATE:20260901/);
});

test('buildDaysIcs: 제목의 쉼표·세미콜론을 이스케이프한다 (RFC 5545)', () => {
  const ics = buildDaysIcs('a,b;c', '2026-08', [1], 'seed');
  assert.match(ics, /SUMMARY:a\\,b\\;c/);
});

test('buildDaysIcs: 줄바꿈은 CRLF다', () => {
  const ics = buildDaysIcs('세션', '2026-08', [1], 'seed');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('\r\nEND:VCALENDAR'));
  assert.ok(!/[^\r]\n/.test(ics), 'LF 단독 줄바꿈이 있으면 안 된다');
});

// ── 헤더 가로 휠 전환 ──
// 임계값·쿨다운이 틀리면 스크롤 중에 제품이 멋대로 바뀐다. 화면엔 에러가 안 뜬다.
import { stepWheel, initialArm, ARM_PX, COOLDOWN_MS, IDLE_RESET_MS, RELEASE_MS } from './wheelNav.ts';
const armAt = (accum: number, lockUntil = 0, last = 1000) => ({ accum, lockUntil, last, armed: true });

test('stepWheel: 한 번의 작은 휠로는 안 넘어간다', () => {
  const r = stepWheel(armAt(0), 40, 1000, 0, 3);
  assert.equal(r.move, 0);
  assert.ok(r.arm > 0 && r.arm < 1);
});

test('stepWheel: 누적이 임계값을 넘으면 넘어가고 잠긴다', () => {
  let r = stepWheel(armAt(0), ARM_PX - 1, 1000, 0, 3);
  assert.equal(r.move, 0);
  r = stepWheel(r.state, 2, 1000, 0, 3);
  assert.equal(r.move, 1);
  assert.equal(r.state.accum, 0);
  assert.equal(r.state.lockUntil, 1000 + COOLDOWN_MS);
});

test('stepWheel: 쿨다운 중에는 아무리 밀어도 안 넘어간다 (관성 스크롤 방지)', () => {
  const locked = armAt(0, 2000, 1999);
  assert.equal(stepWheel(locked, 999, 1999, 0, 3).move, 0);
  assert.equal(stepWheel(locked, 999, 2000, 0, 3).move, 1);
});

test('stepWheel: 방향을 바꾸면 누적이 리셋된다 (흔들어서 채우기 방지)', () => {
  let r = stepWheel(armAt(0), 100, 1000, 1, 3);
  assert.equal(r.state.accum, 100);
  r = stepWheel(r.state, -60, 1000, 1, 3);   // 방향 반전 → 100을 버리고 -60부터
  assert.equal(r.state.accum, -60);
  assert.equal(r.move, 0);
});

test('stepWheel: 양 끝에서는 넘어가지 않고 잠그지도 않는다', () => {
  const left = stepWheel(armAt(-ARM_PX), -10, 1000, 0, 3);
  assert.equal(left.move, 0);
  assert.equal(left.state.lockUntil, 0);
  const right = stepWheel(armAt(ARM_PX), 10, 1000, 2, 3);
  assert.equal(right.move, 0);
  assert.equal(right.state.lockUntil, 0);
});

test('stepWheel: 전환 뒤 관성이 계속 들어오면 두 칸째로 안 넘어간다', () => {
  // 340px를 채워 한 칸 넘긴다
  let r = stepWheel(armAt(0), ARM_PX, 1000, 0, 3);
  assert.equal(r.move, 1);
  assert.equal(r.state.armed, false);
  // 관성이 쿨다운이 끝난 뒤까지 끊기지 않고 이어진다 (매 50ms)
  let now = 1000;
  for (let i = 0; i < 60; i++) {
    now += 50;
    r = stepWheel(r.state, 200, now, 1, 3);
    assert.equal(r.move, 0, `${now}ms에 두 칸째로 넘어갔다`);
  }
});

test('stepWheel: 손을 떼면(입력이 끊기면) 다시 한 칸 넘길 수 있다', () => {
  let r = stepWheel(armAt(0), ARM_PX, 1000, 0, 3);
  assert.equal(r.move, 1);
  // 쿨다운과 릴리즈를 모두 넘긴 뒤 새 손짓
  const later = 1000 + COOLDOWN_MS + RELEASE_MS + 1;
  r = stepWheel(r.state, ARM_PX, later, 1, 3);
  assert.equal(r.move, 1);
});

test('stepWheel: 찔끔찔끔 밀면 누적이 유지되지 않는다', () => {
  let r = stepWheel(armAt(0), 200, 1000, 0, 3);
  assert.equal(r.state.accum, 200);
  // IDLE_RESET_MS 넘게 쉬었다가 다시 밀면 처음부터
  r = stepWheel(r.state, 200, 1000 + IDLE_RESET_MS + 1, 0, 3);
  assert.equal(r.state.accum, 200);
  assert.equal(r.move, 0);
});
