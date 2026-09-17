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

// ── 음원 분석 ─────────────────────────────────────────────────────────
import { yinF0, keyFromChroma } from './audioAnalysis.ts';

const tone = (hz: number, sr = 44100, sec = 0.06) => {
  const n = Math.floor(sr * sec), f = new Float32Array(n);
  // 배음을 섞는다 — 순수 사인은 자기상관도 맞히지만 실제 목소리는 배음이 있다
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    f[i] = Math.sin(2 * Math.PI * hz * t) + 0.5 * Math.sin(4 * Math.PI * hz * t) + 0.25 * Math.sin(6 * Math.PI * hz * t);
  }
  return f;
};

test('yinF0: 기본 주파수를 1% 안에서 맞힌다', () => {
  for (const hz of [98, 130.8, 196, 220, 261.6]) {
    const got = yinF0(tone(hz), 44100, 70, 400);
    assert.ok(Math.abs(got - hz) / hz < 0.01, `${hz}Hz → ${got.toFixed(1)}Hz`);
  }
});

test('yinF0: 배음이 강해도 옥타브 위로 안 뛴다 (자기상관의 고질병)', () => {
  const got = yinF0(tone(110), 44100, 70, 400);
  assert.ok(Math.abs(got - 110) < 3, `110Hz → ${got.toFixed(1)}Hz`);
});

test('keyFromChroma: C장조 3화음이 섞인 chroma를 C로 읽는다', () => {
  const c = new Array(12).fill(0.2);
  [0, 4, 7].forEach((i) => { c[i] += 3; });        // C E G
  [2, 5, 9, 11].forEach((i) => { c[i] += 1; });    // 나머지 음계음
  assert.equal(keyFromChroma(c), 'C');
});

test('keyFromChroma: A단조는 나란한 C장조와 구별된다', () => {
  const c = new Array(12).fill(0.2);
  [9, 0, 4].forEach((i) => { c[i] += 3; });        // A C E — 으뜸을 A로
  c[9] += 2; c[11] += 1; c[2] += 1; c[5] += 1; c[7] += 1;
  assert.equal(keyFromChroma(c), 'Am');
});

test('keyFromChroma: 빈 chroma는 빈 문자열', () => {
  assert.equal(keyFromChroma(new Array(12).fill(0)), '');
});

// ── 풀 가중치 → 사람당 단일 지분 ────────────────────────────────────────
import { writerShares, writerTotal, sheetWeights, DEFAULT_WEIGHTS } from './splitsheet.ts';

const wrow = (o: { n: string; c: string; s: number; e?: string; id?: string }): any => ({ id: o.id ?? Math.random().toString(), sheet_id: 's', user_id: null,
  legal_name: o.n, stage_name: null, email: o.e ?? null, category: o.c, share: o.s,
  pro: null, ipi: null, publisher_name: null, publisher_pro: null, publisher_ipi: null,
  phone: null, address: null, signed: false, signed_at: null, signature_name: null,
  signature_data: null, signed_hash: null, sign_token: null, order_index: 0 }) as any;

test('writerShares: 작사·작곡을 혼자 다 하면 100%', () => {
  const ws = writerShares([wrow({ n: 'NEN', c: 'lyrics', s: 100 }), wrow({ n: 'NEN', c: 'composition', s: 100 })], DEFAULT_WEIGHTS);
  assert.equal(ws.length, 1);
  assert.equal(ws[0].share, 100);
});

test('writerShares: 작사만 한 사람은 가중치만큼만 가져간다', () => {
  const ws = writerShares([
    wrow({ n: '작사가', c: 'lyrics', s: 100 }),
    wrow({ n: '작곡가', c: 'composition', s: 100 }),
  ], DEFAULT_WEIGHTS);
  assert.equal(ws.find((w) => w.name === '작사가')!.share, 50);
  assert.equal(ws.find((w) => w.name === '작곡가')!.share, 50);
  assert.equal(writerTotal(ws), 100);
});

test('writerShares: 풀별 100%가 지켜지면 최종 합계도 100%', () => {
  const ws = writerShares([
    wrow({ n: 'A', c: 'lyrics', s: 60 }), wrow({ n: 'B', c: 'lyrics', s: 40 }),
    wrow({ n: 'A', c: 'composition', s: 30 }), wrow({ n: 'C', c: 'composition', s: 70 }),
  ], DEFAULT_WEIGHTS);
  assert.equal(writerTotal(ws), 100);
  assert.equal(ws.find((w) => w.name === 'A')!.share, 45);  // 60*.5 + 30*.5
});

test('writerShares: 같은 사람은 이메일로 묶인다 (줄이 둘이어도 한 명)', () => {
  const ws = writerShares([
    wrow({ n: '김현식', e: 'a@b.com', c: 'lyrics', s: 100 }),
    wrow({ n: '김현식', e: 'A@B.com', c: 'composition', s: 100 }),
  ], DEFAULT_WEIGHTS);
  assert.equal(ws.length, 1);
  assert.equal(ws[0].share, 100);
});

test('writerShares: 편곡 가중치를 올리면 최종 지분이 따라 움직인다', () => {
  const rows = [wrow({ n: 'A', c: 'composition', s: 100 }), wrow({ n: 'B', c: 'arrangement', s: 100 })];
  const w1 = writerShares(rows, { lyrics: 0, composition: 100, arrangement: 0 });
  assert.equal(w1.find((w) => w.name === 'B')!.share, 0);
  const w2 = writerShares(rows, { lyrics: 0, composition: 70, arrangement: 30 });
  assert.equal(w2.find((w) => w.name === 'B')!.share, 30);
});

test('sheetWeights: 컬럼이 없으면 업계 관행 50/50/0으로 떨어진다', () => {
  assert.deepEqual(sheetWeights(null), { lyrics: 50, composition: 50, arrangement: 0 });
});

// ── CWR (협회 등록 파일) ─────────────────────────────────────────────────
import { buildCwr, cwrFile, cwrPreflight, cwrDuration, S, N, A, societyCode, writerDesignation, romanizeKo, cwrName, cwrTitle, cwrAllocate, cwrNotices, within100 } from './cwr.ts';

const sheet: any = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', owner_id: 'o', song_title: '고백',
  aka: null, artist_name: 'NEW NORMAL', album: null, duration: '2:16',
  iswc: 'T-123456789-0', isrc: null, contains_sample: false, sample_note: null,
  work_date: null, notes: null, audio_path: 'x', audio_name: 'a.mp3',
  locked: false, locked_at: null, version: 1, signature_requested_at: null,
  weight_lyrics: 50, weight_composition: 50, weight_arrangement: 0,
};
const c = (o: any): any => ({ id: o.id ?? o.n, sheet_id: 'a', user_id: null, legal_name: o.n,
  stage_name: null, email: o.e ?? null, category: o.c, share: o.s, pro: o.pro ?? 'KOMCA',
  ipi: o.ipi ?? '00123456789', publisher_name: o.pub ?? null, publisher_pro: null,
  publisher_ipi: null, phone: null, address: null, signed: true, signed_at: null,
  signature_name: null, signature_data: null, signed_hash: null, sign_token: null, order_index: 0 });

test('CWR: 고정폭 — 필드 하나 밀리면 파일 전체가 반려된다', () => {
  assert.equal(A('abc', 5), 'abc  ');
  assert.equal(A('abcdefg', 5), 'abcde');
  assert.equal(N(42, 5), '00042');
  assert.equal(S(50), '05000');       // 50.00%
  assert.equal(S(33.33), '03333');
  assert.equal(S(100), '10000');
});

test('CWR: 한글은 ASCII 밖이라 공백으로 바뀐다 (고정폭이 안 깨지게)', () => {
  assert.equal(A('고백', 4).length, 4);
});

test('cwrDuration: mm:ss → HHMMSS', () => {
  assert.equal(cwrDuration('2:16'), '000216');
  assert.equal(cwrDuration('1:02:03'), '010203');
  assert.equal(cwrDuration(null), '000000');
});

test('CWR: 레코드 순서와 트레일러 개수가 맞는다', () => {
  const rows = [c({ n: 'KIM', c: 'lyrics', s: 100 }), c({ n: 'LEE', c: 'composition', s: 100 })];
  const lines = buildCwr(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS), { senderId: '00123456789', senderName: 'NEN', now: new Date('2026-09-03T10:20:30') });
  assert.equal(lines[0].slice(0, 3), 'HDR');
  assert.equal(lines[1].slice(0, 3), 'GRH');
  assert.equal(lines[2].slice(0, 3), 'NWR');
  assert.equal(lines.at(-2)!.slice(0, 3), 'GRT');
  assert.equal(lines.at(-1)!.slice(0, 3), 'TRL');
  // 작가 둘 → SWR/SWT 두 쌍
  assert.equal(lines.filter((l) => l.startsWith('SWR')).length, 2);
  assert.equal(lines.filter((l) => l.startsWith('SWT')).length, 2);
  // 트랜잭션 레코드 순번은 0부터 빈틈없이 올라간다
  const seqs = lines.filter((l) => /^(NWR|SWR|SWT|PWR)/.test(l)).map((l) => Number(l.slice(11, 19)));
  assert.deepEqual(seqs, seqs.map((_, i) => i));
});

test('CWR: 지분이 최종 지분(가중치 적용)으로 들어간다', () => {
  const rows = [c({ n: 'KIM', c: 'lyrics', s: 100 }), c({ n: 'LEE', c: 'composition', s: 100 })];
  const lines = buildCwr(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS), { senderId: '1', senderName: 'N' });
  const swr = lines.filter((l) => l.startsWith('SWR'));
  // 작사 50 / 작곡 50 이므로 둘 다 50.00%
  assert.ok(swr.every((l) => l.includes('05000')), swr.join('\n'));
});

test('writerDesignation: 작사+작곡은 CA', () => {
  assert.equal(writerDesignation({ lyrics: 50, composition: 50 }), 'CA');
  assert.equal(writerDesignation({ lyrics: 100 }).trim(), 'A');
  assert.equal(writerDesignation({ composition: 100 }).trim(), 'C');
  assert.equal(writerDesignation({ arrangement: 100 }), 'AR');
});

test('societyCode: 아는 협회는 숫자로, 모르면 000 (틀린 숫자보다 낫다)', () => {
  assert.equal(societyCode('KOMCA'), '040');
  assert.equal(societyCode('ASCAP'), '010');
  assert.equal(societyCode('머시기'), '000');
  assert.equal(societyCode(null), '000');
});

test('cwrPreflight: 반려될 것들을 미리 잡는다', () => {
  const badRows = [c({ n: 'KIM', c: 'lyrics', s: 50, ipi: null, pro: null })];
  const bad = cwrPreflight({ ...sheet, song_title: '' } as any, badRows,
    writerShares(badRows, DEFAULT_WEIGHTS), { senderId: '' });
  assert.ok(bad.some((p) => p.includes('제출자 ID')));
  assert.ok(bad.some((p) => p.includes('곡 제목')));
  assert.ok(bad.some((p) => p.includes('IPI')));
  assert.ok(bad.some((p) => p.includes('100%')));
});

test('cwrPreflight: 제대로 채워지면 문제 없음', () => {
  const okRows = [c({ n: 'KIM', c: 'lyrics', s: 100 }), c({ n: 'KIM', c: 'composition', s: 100 })];
  const ok = cwrPreflight(sheet, okRows, writerShares(okRows, DEFAULT_WEIGHTS), { senderId: '00123456789' });
  assert.deepEqual(ok, []);
});

// ── CWR 반려 사유 수정 (2026-09-17) ──
const recLen: Record<string, number> = { HDR: 101, GRH: 28, NWR: 260, SPU: 183, SPT: 58, SWR: 180, SWT: 52, PWR: 110, GRT: 24, TRL: 24 };

test('CWR: 레코드마다 규격 폭이 정확하다 (한 칸 밀리면 전체 반려)', () => {
  const rows = [c({ n: '김민현', c: 'lyrics', s: 100, pub: '뉴노멀뮤직' }), c({ n: 'Kevin Lee', c: 'composition', s: 100 })];
  const lines = buildCwr(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS), { senderId: '00123456789', senderName: 'NEN' });
  for (const l of lines) assert.equal(l.length, recLen[l.slice(0, 3)], `${l.slice(0, 3)} 폭`);
  assert.ok(lines.every((l) => /^[\x20-\x7E]*$/.test(l)), 'ASCII 밖 문자가 섞이면 바이트 폭이 깨진다');
});

test('CWR: 트레일러 개수에 자기 자신이 포함된다 (예전엔 2씩 모자랐다)', () => {
  const rows = [c({ n: 'KIM', c: 'lyrics', s: 100 }), c({ n: 'LEE', c: 'composition', s: 100 })];
  const lines = buildCwr(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS), { senderId: '1', senderName: 'N' });
  const grt = lines.at(-2)!, trl = lines.at(-1)!;
  const grhToGrt = lines.length - 2;                 // HDR·TRL 제외
  assert.equal(Number(grt.slice(16, 24)), grhToGrt);
  assert.equal(Number(trl.slice(16, 24)), lines.length);
});

test('CWR: 퍼블리셔가 있으면 SPU/SPT를 작가보다 먼저 선언하고 PWR이 그걸 가리킨다', () => {
  const rows = [c({ n: 'KIM', c: 'lyrics', s: 100, pub: 'NEWNORMAL MUSIC' }), c({ n: 'LEE', c: 'composition', s: 100 })];
  const lines = buildCwr(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS), { senderId: '1', senderName: 'N' });
  const types = lines.map((l) => l.slice(0, 3));
  assert.deepEqual(types, ['HDR', 'GRH', 'NWR', 'SPU', 'SPT', 'SWR', 'SWT', 'PWR', 'SWR', 'SWT', 'GRT', 'TRL']);
  const spuIp = lines[3].slice(21, 30);
  assert.equal(lines[7].slice(19, 28), spuIp, 'PWR의 퍼블리셔 번호 = SPU 번호');
  assert.equal(lines[7].slice(101, 110), lines[5].slice(19, 28), 'PWR의 작가 번호 = SWR 번호');
  const seqs = lines.slice(2, -2).map((l) => Number(l.slice(11, 19)));
  assert.deepEqual(seqs, seqs.map((_, i) => i));
});

test('CWR: 권리별 지분 — 퍼블리셔 있으면 PR 반반·MR/SR 전부, 합계는 권리마다 100', () => {
  const rows = [c({ n: 'KIM', c: 'lyrics', s: 100, pub: 'NN' }), c({ n: 'LEE', c: 'composition', s: 100 })];
  const a = cwrAllocate(rows, writerShares(rows, DEFAULT_WEIGHTS));
  const kim = a.writers.find((w) => w.name === 'KIM')!, lee = a.writers.find((w) => w.name === 'LEE')!;
  assert.deepEqual([kim.pr, kim.mr, kim.sr], [25, 0, 0]);
  assert.deepEqual([lee.pr, lee.mr, lee.sr], [50, 50, 50]);
  assert.deepEqual([a.publishers[0].pr, a.publishers[0].mr, a.publishers[0].sr], [25, 50, 50]);
  for (const k of ['pr', 'mr', 'sr'] as const) {
    assert.equal([...a.writers, ...a.publishers].reduce((s, x) => s + x[k], 0), 100);
  }
});

test('CWR: IPI 없는 작가끼리 이해관계자 번호가 겹치지 않는다', () => {
  const rows = [c({ n: 'KIM', c: 'lyrics', s: 100, ipi: '' }), c({ n: 'LEE', c: 'composition', s: 100, ipi: '' })];
  const lines = buildCwr(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS), { senderId: '1', senderName: 'N' });
  const ips = lines.filter((l) => l.startsWith('SWR')).map((l) => l.slice(19, 28));
  assert.equal(new Set(ips).size, 2);
  // 모르는 IPI는 0이 아니라 공백 — '00000000000'이라는 사람이 생기면 안 된다
  assert.ok(lines.filter((l) => l.startsWith('SWR')).every((l) => l.slice(115, 126) === ' '.repeat(11)));
});

test('CWR: 허용오차 ±0.06 — 33.33×3은 통과, 99.9는 반려', () => {
  assert.ok(within100(99.99));
  assert.ok(within100(100.06));
  assert.ok(!within100(99.9));
  const rows = ['A', 'B', 'C'].flatMap((n) => [c({ n, c: 'lyrics', s: 33.33 }), c({ n, c: 'composition', s: 33.33 })]);
  const p = cwrPreflight(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS), { senderId: '00123456789' });
  assert.ok(!p.some((x) => x.includes('100%')), p.join(' / '));
});

test('romanizeKo / cwrName / cwrTitle: 한글이 공백이 아니라 로마자로 들어간다', () => {
  assert.equal(romanizeKo('고백'), 'GOBAEK');
  assert.equal(romanizeKo('사랑해 Baby'), 'SARANGHAE BABY');
  assert.deepEqual(cwrName('김민현'), { last: 'KIM', first: 'MINHYEON' });
  assert.deepEqual(cwrName('남궁민'), { last: 'NAMGOONG', first: 'MIN' });
  assert.deepEqual(cwrName('이 수'), { last: 'LEE', first: 'SU' });
  assert.deepEqual(cwrName('Kevin Kim'), { last: 'KIM', first: 'KEVIN' });
  assert.equal(cwrTitle({ song_title: '고백', aka: null }), 'GOBAEK');
  assert.equal(cwrTitle({ song_title: '고백', aka: 'Confession' }), 'CONFESSION');
  const nwr = buildCwr(sheet, [c({ n: 'KIM', c: 'lyrics', s: 100 })], [], { senderId: '1', senderName: 'N' })[2];
  assert.equal(nwr.slice(19, 79).trim(), 'GOBAEK');
  assert.equal(nwr.slice(79, 81), 'KO');
});

test('CWR: 11자리 IPI 제출자는 앞 2자리가 Sender Type 칸으로 간다', () => {
  const hdr = buildCwr(sheet, [], [], { senderId: '01234567890', senderName: 'N' })[0];
  assert.equal(hdr.slice(3, 5), '01');
  assert.equal(hdr.slice(5, 14), '234567890');
});

test('cwrNotices: 로마자 변환과 퍼블리셔 기본 배분을 사람에게 알린다', () => {
  const rows = [c({ n: '김민현', c: 'lyrics', s: 100, pub: 'NN' }), c({ n: '김민현', c: 'composition', s: 100 })];
  const n = cwrNotices(sheet, rows, writerShares(rows, DEFAULT_WEIGHTS));
  assert.ok(n.some((x) => x.includes('GOBAEK')));
  assert.ok(n.some((x) => x.includes('KIM, MINHYEON')));
  assert.ok(n.some((x) => x.includes('퍼블리셔 몫')));
});

test('cwrFile: EDI 관행대로 CRLF로 끝난다', () => {
  assert.ok(cwrFile(['HDR', 'TRL']).endsWith('\r\n'));
  assert.equal(cwrFile(['HDR', 'TRL']), 'HDR\r\nTRL\r\n');
});

// ── 리드 카드 색 — 틀리면 밝은 배경에 밝은 글씨가 된다 ──
import { getCardColor } from './brand.ts';

test('getCardColor: 성별로 색이 갈리고, 남자는 브랜드색(#C14425)과 겹치지 않는다', () => {
  assert.ok(getCardColor('male', 'solo', true).bg.includes('#3E6FA8'));
  assert.ok(getCardColor('female', 'solo', true).bg.includes('#C0392F'));
  assert.ok(getCardColor('mixed', 'solo', true).bg.includes('#7C7F65'));
  assert.ok(!getCardColor('male', 'solo', true).bg.includes('C14425'));
});

test('getCardColor: 글자색이 테마따라 갈린다 (다크=밝은 틴트, 라이트=어두운 틴트)', () => {
  assert.equal(getCardColor('male', 'solo', true).text, 'text-[#94B6EE]');
  assert.equal(getCardColor('male', 'solo', false).text, 'text-[#2C5384]');
});

test('getCardColor: 모르는 성별은 남자로, 그룹은 라벨에 붙는다', () => {
  assert.equal(getCardColor('', 'solo', true).label, '남자');
  assert.equal(getCardColor('female', 'group', true).label, '여자 그룹');
});
