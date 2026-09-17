// CWR (Common Works Registration) v2.1 — CISAC이 정한, 전 세계 협회가 실제로
// 주고받는 등록 파일. PDF는 사람이 읽고 이건 협회 시스템이 바로 먹는다.
//
// 고정폭 레코드다. 필드 하나가 한 칸 밀리면 파일 전체가 반려되므로,
// 여기서는 폭을 상수로 박고 자르기·채우기를 한 군데(A/N/S)에서만 한다.
//
// ⚠ 이 파일이 만드는 건 '제출용 초안'이다. 실제 제출에는 협회가 발급한
//   Sender ID(보통 IPI)와 그 협회의 검증 도구 통과가 필요하다. 그 값은
//   호출부가 넘긴다 — 여기서 지어내지 않는다.

import type { Contributor, CategoryKey, SplitSheet, WriterShare } from './splitsheet';

/** 알파뉴메릭: 왼쪽 정렬, 공백 채움, 넘치면 자른다 */
export const A = (v: string | null | undefined, n: number) =>
  (v ?? '').replace(/[^\x20-\x7E]/g, ' ').slice(0, n).padEnd(n, ' ');
/** 숫자: 오른쪽 정렬, 0 채움 */
export const N = (v: number | string | null | undefined, n: number) =>
  String(v ?? 0).replace(/\D/g, '').slice(-n).padStart(n, '0');
/** 지분: 5자리, 소수 둘째까지 (50% → '05000') */
export const S = (pct: number) => N(Math.round(Math.max(0, Math.min(100, pct)) * 100), 5);

/** CWR 합계 허용오차. 33.33×3 = 99.99 같은 정상 분배를 반려하지 않으려고 규정이 ±0.06%를 둔다. */
export const SHARE_TOLERANCE = 0.06;
export const within100 = (total: number) => Math.abs(total - 100) <= SHARE_TOLERANCE + 1e-9;

const round2 = (x: number) => Math.round(x * 100) / 100;

/** 'mm:ss' 또는 's' → CWR 의 HHMMSS */
export function cwrDuration(d: string | null | undefined): string {
  if (!d) return '000000';
  const parts = String(d).split(':').map((x) => parseInt(x, 10) || 0);
  let sec = 0;
  if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
  else sec = parts[0] || 0;
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${N(h, 2)}${N(m, 2)}${N(s, 2)}`;
}

/** ISWC 는 'T1234567890' 11자. 하이픈·공백을 걷어낸다 */
export const cwrIswc = (v: string | null | undefined) => A((v ?? '').replace(/[-\s.]/g, '').toUpperCase(), 11);

// ── 한글 → 로마자 ─────────────────────────────────────────────────────────
// 왜: CWR 고정폭은 '바이트' 단위다. UTF-8 한글은 한 글자가 3바이트라 한 글자만
// 들어가도 뒤 필드가 전부 밀린다. 그렇다고 ASCII 밖을 공백으로 바꾸면(예전 동작)
// 한글 제목·이름이 통째로 빈칸이 되어 '제목 없는 작품'으로 반려됐다.
// 그래서 국어의 로마자 표기법(2000) 음절 단위 변환으로 넣는다. 음운 변화(종로→Jongno)는
// 반영하지 않는다 — 협회 등록명과 다를 수 있으니 cwrNotices가 사람에게 확인시킨다.
const RR_INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const RR_MEDIAL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const RR_FINAL = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

export const hasHangul = (s: string | null | undefined) => /[가-힣]/.test(s ?? '');

/** 한글 음절만 로마자로, 나머지 ASCII는 그대로. 결과는 대문자. */
export function romanizeKo(s: string | null | undefined): string {
  let out = '';
  for (const ch of s ?? '') {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code < 11172) {
      out += RR_INITIAL[Math.floor(code / 588)] + RR_MEDIAL[Math.floor((code % 588) / 28)] + RR_FINAL[code % 28];
    } else {
      out += /[\x20-\x7E]/.test(ch) ? ch : ' ';
    }
  }
  return out.replace(/\s+/g, ' ').trim().toUpperCase();
}

// 성은 표기법이 아니라 여권·협회에서 실제로 쓰는 관용 표기가 기준이다(김 → KIM, 이 → LEE).
const SURNAME: Record<string, string> = {
  김: 'KIM', 이: 'LEE', 박: 'PARK', 최: 'CHOI', 정: 'JUNG', 강: 'KANG', 조: 'CHO', 윤: 'YOON', 장: 'JANG',
  임: 'LIM', 한: 'HAN', 오: 'OH', 서: 'SEO', 신: 'SHIN', 권: 'KWON', 황: 'HWANG', 안: 'AHN', 송: 'SONG',
  류: 'RYU', 유: 'YOO', 홍: 'HONG', 전: 'JEON', 고: 'KO', 문: 'MOON', 양: 'YANG', 손: 'SON', 배: 'BAE',
  백: 'BAEK', 허: 'HEO', 노: 'NOH', 남: 'NAM', 심: 'SHIM', 하: 'HA', 곽: 'KWAK', 성: 'SUNG', 차: 'CHA',
  주: 'JOO', 우: 'WOO', 구: 'KOO', 민: 'MIN', 나: 'NA', 진: 'JIN', 지: 'JI', 엄: 'UM', 채: 'CHAE',
  원: 'WON', 천: 'CHUN', 방: 'BANG', 공: 'KONG', 현: 'HYUN', 변: 'BYUN', 여: 'YEO', 추: 'CHOO', 도: 'DO',
  석: 'SEOK', 선: 'SUN', 설: 'SEOL', 길: 'GIL', 표: 'PYO', 명: 'MYUNG', 기: 'KI', 반: 'BAN', 왕: 'WANG',
  금: 'KEUM', 옥: 'OK', 육: 'YOOK', 인: 'IN', 탁: 'TAK', 국: 'KOOK', 은: 'EUN', 편: 'PYUN', 용: 'YONG',
  예: 'YE', 봉: 'BONG', 경: 'KYUNG', 모: 'MO', 소: 'SO', 마: 'MA', 연: 'YEON', 함: 'HAM', 염: 'YEOM',
  위: 'WI', 라: 'RA', 태: 'TAE',
};
const COMPOUND_SURNAME: Record<string, string> = {
  남궁: 'NAMGOONG', 황보: 'HWANGBO', 제갈: 'JEGAL', 선우: 'SUNWOO', 독고: 'DOKGO', 사공: 'SAGONG', 서문: 'SEOMUN', 동방: 'DONGBANG',
};

/** 작가 이름 → CWR 성/이름 칸. 한글 이름은 성과 이름을 가르고 각각 로마자로. */
export function cwrName(name: string | null | undefined): { last: string; first: string } {
  const raw = (name ?? '').trim();
  const compact = raw.replace(/\s+/g, '');
  if (hasHangul(raw) && /^[가-힣]+$/.test(compact) && compact.length >= 2) {
    const two = compact.slice(0, 2);
    if (compact.length >= 3 && COMPOUND_SURNAME[two]) {
      return { last: COMPOUND_SURNAME[two], first: romanizeKo(compact.slice(2)) };
    }
    const one = compact[0];
    return { last: SURNAME[one] ?? romanizeKo(one), first: romanizeKo(compact.slice(1)) };
  }
  const roman = hasHangul(raw) ? romanizeKo(raw) : raw.toUpperCase();
  const words = roman.split(/\s+/).filter(Boolean);
  // 영문 'Kevin Kim' → 이름 KEVIN / 성 KIM. 한 단어면 통째로 성 칸.
  if (words.length > 1) return { last: words.slice(1).join(' '), first: words[0] };
  return { last: roman, first: '' };
}

/** 작품 제목. 한글이면 영문 병기(aka)가 ASCII일 때 그걸 쓰고, 아니면 로마자로. */
export function cwrTitle(sheet: Pick<SplitSheet, 'song_title' | 'aka'>): string {
  const title = (sheet.song_title ?? '').trim();
  if (!hasHangul(title)) return title.toUpperCase();
  const aka = (sheet.aka ?? '').trim();
  if (aka && !hasHangul(aka) && /^[\x20-\x7E]+$/.test(aka)) return aka.toUpperCase();
  return romanizeKo(title);
}

// 작가 역할 코드. 한 사람이 작사·작곡을 다 했으면 CA(Composer/Author).
export function writerDesignation(parts: Partial<Record<CategoryKey, number>>): string {
  const lyr = (parts.lyrics ?? 0) > 0;
  const com = (parts.composition ?? 0) > 0;
  const arr = (parts.arrangement ?? 0) > 0;
  if (lyr && com) return 'CA';
  if (lyr) return 'A ';
  if (com) return 'C ';
  if (arr) return 'AR';
  return 'CA';
}

// 협회 코드 → CISAC 숫자 코드. 모르는 곳은 000(미상)으로 둔다 —
// 틀린 숫자를 넣는 것보다 낫다.
export const SOCIETY_CODE: Record<string, string> = {
  KOMCA: '040', KOSCAP: '119', FKMP: '087',
  ASCAP: '010', BMI: '021', SESAC: '071', GMR: '319',
  PRS: '052', GEMA: '035', SACEM: '058', BUMASTEMRA: '023',
  SIAE: '005', SGAE: '061', STIM: '079', SUISA: '080', SABAM: '055',
  AKM: '013', ZAIKS: '090', JASRAC: '103', NEXTONE: '319',
  APRA: '101', MCSC: '129', CASH: '025', COMPASS: '108', MACP: '104', IPRS: '099',
  SOCAN: '076', UBC: '084', SACM: '060', SADAIC: '059', SAMRO: '065',
};
export const societyCode = (pro: string | null | undefined) => SOCIETY_CODE[(pro ?? '').toUpperCase()] ?? '000';

// ── 지분 배분 ─────────────────────────────────────────────────────────────
// 스플릿시트엔 '퍼블리셔가 몇 %를 갖는지' 칸이 없다. 그래서 CISAC 관행 기본값을 쓴다:
//   공연권(PR) — 작가 몫의 절반을 퍼블리셔에게. (규정상 퍼블리셔 PR 합계는 50%를 넘지 못한다)
//   복제권(MR)·동기화권(SR) — 전부 퍼블리셔에게.
// 퍼블리셔가 없는 작가는 세 권리를 모두 자기 몫 그대로 갖는다.
// 계약이 이와 다르면 파일을 고쳐 내야 한다 — cwrNotices가 이 가정을 사람에게 알린다.
export const PUBLISHER_PR_PERCENT = 50;

export type CwrWriter = WriterShare & {
  ip: string; row: Contributor; pr: number; mr: number; sr: number; publisherIp: string | null;
};
export type CwrPublisher = {
  ip: string; seq: number; name: string; ipi: string; society: string; pr: number; mr: number; sr: number;
};

/** 사람 → 대표 행(협회·IPI·퍼블리셔를 여기서 가져온다) */
function rowIndex(rows: Contributor[]) {
  const m = new Map<string, Contributor>();
  for (const r of rows) {
    const k = r.user_id || (r.email || '').trim().toLowerCase() || (r.legal_name || '').trim() || r.id;
    if (!m.has(k)) m.set(k, r);
  }
  return m;
}

/** 작가·퍼블리셔별 PR/MR/SR 소유 지분. buildCwr와 cwrPreflight가 같은 계산을 쓴다. */
export function cwrAllocate(rows: Contributor[], writers: WriterShare[]): { writers: CwrWriter[]; publishers: CwrPublisher[] } {
  const rowFor = rowIndex(rows);
  const pubs = new Map<string, CwrPublisher>();
  const out: CwrWriter[] = [];
  writers.forEach((w, i) => {
    const row = rowFor.get(w.key) ?? rows.find((r) => (r.legal_name || r.stage_name) === w.name) ?? rows[0];
    const share = round2(w.share);
    // 이해관계자 번호(IP#)는 '제출자 내부 ID'다. IPI를 쓰면 IPI 없는 사람끼리 000000000으로 겹쳐 반려됐다.
    const ip = 'W' + N(i + 1, 8);
    const pubName = (row?.publisher_name ?? '').trim();
    if (!pubName) {
      out.push({ ...w, ip, row, pr: share, mr: share, sr: share, publisherIp: null });
      return;
    }
    const pubKey = (row.publisher_ipi ?? '').replace(/\D/g, '') || pubName.toUpperCase();
    let p = pubs.get(pubKey);
    if (!p) {
      const seq = pubs.size + 1;
      p = {
        ip: 'P' + N(seq, 8), seq,
        name: hasHangul(pubName) ? romanizeKo(pubName) : pubName.toUpperCase(),
        ipi: (row.publisher_ipi ?? '').replace(/\D/g, ''),
        society: societyCode(row.publisher_pro), pr: 0, mr: 0, sr: 0,
      };
      pubs.set(pubKey, p);
    }
    const pubPr = round2((share * PUBLISHER_PR_PERCENT) / 100);
    p.pr = round2(p.pr + pubPr);
    p.mr = round2(p.mr + share);
    p.sr = round2(p.sr + share);
    out.push({ ...w, ip, row, pr: round2(share - pubPr), mr: 0, sr: 0, publisherIp: p.ip });
  });
  return { writers: out, publishers: [...pubs.values()] };
}

export type CwrOptions = {
  /** 협회가 발급한 제출자 ID(보통 IPI). 없으면 파일은 만들되 초안으로 표시된다. */
  senderId: string;
  senderName: string;
  /** 'PB' 퍼블리셔 · 'AA' 관리대행 · 'WR' 작가 */
  senderType?: 'PB' | 'AA' | 'WR' | 'SO';
  /** 제출자 내부 작품번호 */
  submitterWorkId?: string;
  now?: Date;
};

const stamp = (d: Date) => ({
  date: `${d.getFullYear()}${N(d.getMonth() + 1, 2)}${N(d.getDate(), 2)}`,
  time: `${N(d.getHours(), 2)}${N(d.getMinutes(), 2)}${N(d.getSeconds(), 2)}`,
});

/** IPI 이름번호(11자리) → 칸. 모르면 공백(0으로 채우면 '00000000000'이라는 사람이 된다). */
const ipiField = (v: string | null | undefined) => {
  const d = (v ?? '').replace(/\D/g, '');
  return d ? N(d, 11) : A('', 11);
};

/**
 * 스플릿시트 한 장 → CWR v2.1 NWR 트랜잭션 하나.
 * 반환은 줄 배열이며, 파일로 쓸 때는 CRLF로 잇는다(EDI 관행).
 * 레코드 순서는 규정대로: NWR → (SPU·SPT)* → (SWR·SWT·PWR?)*
 */
export function buildCwr(sheet: SplitSheet, rows: Contributor[], writers: WriterShare[], opt: CwrOptions): string[] {
  const now = opt.now ?? new Date();
  const { date, time } = stamp(now);
  const alloc = cwrAllocate(rows, writers);
  const out: string[] = [];

  // ── 전송 헤더 ──
  // 제출자 ID 칸은 9자리다. IPI 이름번호는 11자리라, 규정대로 앞 2자리를 Sender Type 칸에 넣는다.
  const senderDigits = (opt.senderId ?? '').replace(/\D/g, '');
  const senderType = senderDigits.length > 9 ? senderDigits.slice(0, senderDigits.length - 9).padStart(2, '0') : (opt.senderType ?? 'PB');
  out.push(
    'HDR' + A(senderType, 2) + N(senderDigits, 9) + A(opt.senderName.toUpperCase(), 45) +
    '01.10' + date + time + date + A('', 15),
  );
  // ── 그룹 헤더 (NWR = 신규 작품 등록) ──
  out.push('GRH' + 'NWR' + N(1, 5) + '02.10' + N(0, 10) + A('', 2));

  let rec = 0;                          // 트랜잭션 안의 레코드 순번
  const tx = N(0, 8);                   // 트랜잭션 순번 (한 장이라 0)
  const seq = () => N(rec++, 8);

  // ── 작품 ──
  out.push(
    'NWR' + tx + seq() +
    A(cwrTitle(sheet), 60) +
    A(hasHangul(sheet.song_title) ? 'KO' : '', 2) + // 언어 코드(ISO 639-1)
    A(opt.submitterWorkId ?? sheet.id.replace(/-/g, '').slice(0, 14), 14) +
    cwrIswc(sheet.iswc) +
    A('', 8) +                                   // 저작권 등록일
    A('', 12) +                                  // 저작권 등록번호
    'POP' +                                      // 배분 카테고리
    cwrDuration(sheet.duration) +
    (sheet.audio_path ? 'Y' : 'U') +             // 녹음물 존재 여부
    'MTX' +                                      // 가사·음악 관계
    A('', 3) +                                   // 합성 유형
    'ORI' +                                      // 버전 유형 (원곡)
    A('', 3) + A('', 3) + A('', 3) +             // 발췌·편곡·개사
    A(opt.senderName.toUpperCase(), 30) + A('', 10) + // 연락 담당·ID
    A('', 2) +                                   // CWR 작품 유형
    'N' +                                        // 공연권(그랜드라이츠)
    A('', 3) +                                   // 합성 구성요소 수
    A('', 8) +                                   // 인쇄본 발행일
    A('', 1) +                                   // 예외 조항
    A('', 25) + A('', 25) +                      // 작품번호(Opus)·카탈로그 번호
    A('', 1),                                    // 우선 처리
  );

  // ── 퍼블리셔 (작가보다 먼저 선언돼야 PWR이 가리킬 수 있다) ──
  for (const p of alloc.publishers) {
    out.push(
      'SPU' + tx + seq() +
      N(p.seq, 2) +                              // 퍼블리셔 체인 순번
      A(p.ip, 9) + A(p.name, 45) +
      ' ' +                                      // 퍼블리셔 미상 표시
      'E ' +                                     // 유형: 원 퍼블리셔
      A('', 9) +                                 // 납세자 번호
      ipiField(p.ipi) +
      A('', 14) +                                // 제출자 계약번호
      p.society + S(p.pr) +
      p.society + S(p.mr) +
      p.society + S(p.sr) +
      A('', 1) + A('', 1) + A('', 1) +           // 특약·최초녹음거부·필러
      A('', 13) + A('', 14) + A('', 14) +        // IPI Base·ISAC·협회 계약번호
      A('', 2) + A('', 1),                       // 계약 유형·USA 라이선스
    );
    out.push(
      'SPT' + tx + seq() + A(p.ip, 9) + A('', 6) +
      S(p.pr) + S(p.mr) + S(p.sr) + 'I' + N(2136, 4) + 'N' + N(1, 3),
    );
  }

  // ── 작가들 ──
  for (const w of alloc.writers) {
    const soc = societyCode(w.row?.pro);
    const { last, first } = cwrName(w.name);
    out.push(
      'SWR' + tx + seq() +
      A(w.ip, 9) +                               // 이해관계자 번호(제출자 내부 ID)
      A(last, 45) + A(first, 30) +
      ' ' +                                      // 작가 미상 표시
      writerDesignation(w.parts) +
      A('', 9) +                                 // 납세자 번호
      ipiField(w.row?.ipi) +                     // IPI Name #
      soc + S(w.pr) +                            // 공연권 협회 · 지분
      soc + S(w.mr) +                            // 복제권
      soc + S(w.sr) +                            // 동기화권
      A('', 1) + A('', 1) + A('', 1) + A('', 1) +
      A('', 13) + A('', 12) + A('', 1),
    );
    // 관할 영역 — 2136 = 전 세계
    out.push(
      'SWT' + tx + seq() + A(w.ip, 9) + S(w.pr) + S(w.mr) + S(w.sr) + 'I' + N(2136, 4) + 'N' + N(1, 3),
    );
    if (w.publisherIp) {
      const p = alloc.publishers.find((x) => x.ip === w.publisherIp)!;
      out.push(
        'PWR' + tx + seq() +
        A(p.ip, 9) + A(p.name, 45) +
        A('', 14) + A('', 14) + A(w.ip, 9),
      );
    }
  }

  // ── 트레일러 ── 개수엔 자기 자신도 들어간다.
  // GRT: 그룹 안 레코드 = GRH + 트랜잭션 레코드 + GRT
  out.push('GRT' + N(1, 5) + N(1, 8) + N(rec + 2, 8));
  // TRL: 파일 전체 레코드 = 지금까지 + TRL
  out.push('TRL' + N(1, 5) + N(1, 8) + N(out.length + 1, 8));
  return out;
}

export const cwrFile = (lines: string[]) => lines.join('\r\n') + '\r\n';

/** 협회에 내기 전에 스스로 잡을 수 있는 것들. 통과 못 하면 반려된다. */
export function cwrPreflight(sheet: SplitSheet, rows: Contributor[], writers: WriterShare[], opt: Pick<CwrOptions, 'senderId'>): string[] {
  const problems: string[] = [];
  const total = round2(writers.reduce((s, w) => s + w.share, 0));
  if (!opt.senderId || !/^\d{1,11}$/.test(opt.senderId)) problems.push('제출자 ID(협회 발급 IPI)가 필요해요');
  if (!sheet.song_title || !cwrTitle(sheet)) problems.push('곡 제목이 비어 있어요');
  if (writers.length === 0) problems.push('작가가 없어요');
  if (!within100(total)) problems.push(`최종 지분 합계가 ${total}% 예요 — 100%여야 해요 (허용오차 ±${SHARE_TOLERANCE}%)`);
  for (const w of writers) {
    const r = rows.find((x) => (x.legal_name || '') === w.name || (x.stage_name || '') === w.name);
    if (!w.name || w.name === '—') problems.push('법적 본명이 빈 작가가 있어요');
    if (r && !r.ipi) problems.push(`${w.name}: IPI 번호가 없어요 (없으면 협회가 사람을 특정 못 해요)`);
    if (r && !r.pro) problems.push(`${w.name}: 저작권협회가 지정되지 않았어요`);
  }
  if (writers.length && within100(total)) {
    const a = cwrAllocate(rows, writers);
    const sum = (k: 'pr' | 'mr' | 'sr') => round2([...a.writers, ...a.publishers].reduce((s, x) => s + x[k], 0));
    for (const [k, label] of [['pr', '공연권'], ['mr', '복제권'], ['sr', '동기화권']] as const) {
      if (!within100(sum(k))) problems.push(`${label} 지분 합계가 ${sum(k)}% 예요 — 100%여야 해요`);
    }
  }
  return [...new Set(problems)];
}

/** 막지는 않지만 내기 전에 사람이 확인해야 할 것들 — 로마자 변환·퍼블리셔 기본 배분. */
export function cwrNotices(sheet: SplitSheet, rows: Contributor[], writers: WriterShare[]): string[] {
  const notes: string[] = [];
  if (hasHangul(sheet.song_title)) {
    notes.push(`제목을 "${cwrTitle(sheet)}"(으)로 넣었어요 — 협회 등록 영문 제목과 다르면 AKA에 영문 제목을 적어주세요`);
  }
  for (const w of writers) {
    if (hasHangul(w.name)) {
      const { last, first } = cwrName(w.name);
      notes.push(`${w.name} → ${last}${first ? ', ' + first : ''} — 협회에 등록된 영문 이름과 같은지 확인하세요`);
    }
  }
  const a = cwrAllocate(rows, writers);
  if (a.publishers.length) {
    notes.push(`퍼블리셔 몫은 관행 기본값으로 넣었어요: 공연권 작가 몫의 ${PUBLISHER_PR_PERCENT}%, 복제·동기화권 100% — 계약이 다르면 고쳐서 내세요`);
  }
  for (const p of a.publishers) {
    if (p.society === '000') notes.push(`${p.name}: 퍼블리셔 협회가 지정되지 않아 000(미상)으로 넣었어요`);
  }
  return notes;
}
