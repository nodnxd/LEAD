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
