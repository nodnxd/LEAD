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

/**
 * 스플릿시트 한 장 → CWR v2.1 NWR 트랜잭션 하나.
 * 반환은 줄 배열이며, 파일로 쓸 때는 CRLF로 잇는다(EDI 관행).
 */
export function buildCwr(sheet: SplitSheet, rows: Contributor[], writers: WriterShare[], opt: CwrOptions): string[] {
  const now = opt.now ?? new Date();
  const { date, time } = stamp(now);
  // 사람 → 그 사람의 대표 행(협회·IPI·이름을 여기서 가져온다)
  const rowFor = new Map<string, Contributor>();
  for (const r of rows) {
    const k = r.user_id || (r.email || '').trim().toLowerCase() || (r.legal_name || '').trim() || r.id;
    if (!rowFor.has(k)) rowFor.set(k, r);
  }

  const out: string[] = [];
  const senderType = opt.senderType ?? 'PB';

  // ── 전송 헤더 ──
  out.push(
    'HDR' + A(senderType, 2) + N(opt.senderId, 9) + A(opt.senderName, 45) +
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
    A(sheet.song_title, 60) +
    A('', 2) +                                   // 언어 코드
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
    A(opt.senderName, 30) + A('', 10) +          // 연락 담당·ID
    A('', 2) +                                   // CWR 작품 유형
    'N' +                                        // 공연권(그랜드라이츠)
    A('', 3),                                    // 합성 구성요소 수
  );

  // ── 작가들 ──
  for (const w of writers) {
    const r = rowFor.get(w.key)!;
    const soc = societyCode(r.pro);
    const share = S(w.share);
    const names = (w.name || '').trim().split(/\s+/);
    // 한글 이름은 성/이름이 안 갈라진다 — 통째로 성(Last Name) 칸에 넣는다.
    // 협회 쪽에서도 단일 필드로 받는 편이 오히려 안전하다.
    const last = names.length > 1 && /^[A-Za-z]/.test(w.name) ? names.slice(1).join(' ') : w.name;
    const first = names.length > 1 && /^[A-Za-z]/.test(w.name) ? names[0] : '';
    const ip = N(r.ipi, 9);

    out.push(
      'SWR' + tx + seq() +
      A(ip, 9) +                                 // 이해관계자 번호
      A(last, 45) + A(first, 30) +
      ' ' +                                      // 작가 미상 표시
      writerDesignation(w.parts) +
      A('', 9) +                                 // 납세자 번호
      A(r.ipi, 11) +                             // IPI Name #
      soc + share +                              // 공연권 협회 · 지분
      soc + S(0) +                               // 복제권
      soc + S(0) +                               // 동기화권
      A('', 1) + A('', 1) + A('', 1) + A('', 1) +
      A('', 13) + A('', 12) + A('', 1),
    );
    // 관할 영역 — 2136 = 전 세계
    out.push(
      'SWT' + tx + seq() + A(ip, 9) + share + S(0) + S(0) + 'I' + N(2136, 4) + 'Y',
    );
    // 퍼블리셔가 있으면 연결 고리를 남긴다
    if (r.publisher_name) {
      out.push(
        'PWR' + tx + seq() +
        A(N(r.publisher_ipi, 9), 9) + A(r.publisher_name, 45) +
        A('', 14) + A('', 14) + A(ip, 9),
      );
    }
  }

  // ── 트레일러 ──
  const txCount = 1;
  const recCount = out.length - 2 + 2;   // HDR·GRH 제외한 레코드 + GRT·TRL
  out.push('GRT' + N(1, 5) + N(txCount, 8) + N(rec, 8));
  out.push('TRL' + N(1, 5) + N(txCount, 8) + N(recCount, 8));
  return out;
}

export const cwrFile = (lines: string[]) => lines.join('\r\n') + '\r\n';

/** 협회에 내기 전에 스스로 잡을 수 있는 것들. 통과 못 하면 반려된다. */
export function cwrPreflight(sheet: SplitSheet, rows: Contributor[], writers: WriterShare[], opt: Pick<CwrOptions, 'senderId'>): string[] {
  const problems: string[] = [];
  const total = Math.round(writers.reduce((s, w) => s + w.share, 0) * 100) / 100;
  if (!opt.senderId || !/^\d{1,11}$/.test(opt.senderId)) problems.push('제출자 ID(협회 발급 IPI)가 필요해요');
  if (!sheet.song_title) problems.push('곡 제목이 비어 있어요');
  if (writers.length === 0) problems.push('작가가 없어요');
  if (total !== 100) problems.push(`최종 지분 합계가 ${total}% 예요 — 100%여야 해요`);
  for (const w of writers) {
    const r = rows.find((x) => (x.legal_name || '') === w.name || (x.stage_name || '') === w.name);
    if (!w.name || w.name === '—') problems.push('법적 본명이 빈 작가가 있어요');
    if (r && !r.ipi) problems.push(`${w.name}: IPI 번호가 없어요 (없으면 협회가 사람을 특정 못 해요)`);
    if (r && !r.pro) problems.push(`${w.name}: 저작권협회가 지정되지 않았어요`);
  }
  return [...new Set(problems)];
}
