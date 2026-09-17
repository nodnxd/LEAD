// 노션 공개 DB "진행중인 리드" → LEAD 리드. 노션이 원본, LEAD는 사본이다.
//
// 가져오기 규칙 (2026-09-15 사용자 결정):
//   아티스트 = "아티스트명 / 레이블"(레이블 없으면 이름만), 본문 = 리드 원문, 마감 = 마감일.
//   재실행 중복 방지는 leads.memo = 'notion:<노션 행 id>' 마커로 한다(memo는 화면에서 안 쓴다).
//   노션에서 본문이 바뀐 리드는 기존 걸 덮지 않고 새 리드로 추가한다 — 단 마감이 지난 건 건너뛴다.
//
// 함정 두 개 (둘 다 실제로 밟았다):
// 1) 본문 비교는 NFKC로 정규화해서 한다. 첫 가져오기가 NFKC로 저장해서, 원문 그대로 비교하면
//    노션이 넣는 줄바꿈 없는 공백(NBSP) 같은 보이지 않는 문자 때문에 30건 중 16건이
//    '바뀐 리드'로 잘못 잡혔다. (NFKC는 NBSP를 일반 공백으로 바꾼다)
// 2) 노션엔 성별·형태 칸이 없다. 컬럼 기본값(male/solo)으로 넣으면 리드 목록의 성별 필터에
//    걸려 화면에서 조용히 사라진다. 이 데이터에서 '성별 미정'은 mixed/solo로 쓴다.

export const NOTION_LEADS_HOST = 'def69b95-3bd7-4059-8489-b8a1951a1441'; // LEAD 회사 워크스페이스
export const NOTION_SITE = 'https://experienced-echidna-917.notion.site';
export const NOTION_PAGE_ID = '28af3a3b-3414-80df-8f7e-fe4436a1aaf4';

export type NotionLead = { id: string; artist: string; label: string; lead: string; deadline: string };
export type ExistingLead = { memo: string | null; content: string | null };
export type LeadInsert = {
  host_id: string; artist: string; content: string; deadline: string | null;
  kind: 'lead'; status: 'pending'; gender: 'mixed'; group_type: 'solo'; memo: string;
};

const nfkc = (s: string | null | undefined) => (s ?? '').normalize('NFKC');
// 비교용 키. 둥근 따옴표(‘’“”)는 곧은 따옴표로 본다 — 리드를 손으로 옮겨 적으면 거의 반드시 바뀐다.
// (실제로 STUN-X를 SQL로 옮기다 ‘ ’가 ' 로 바뀌어, 그대로면 같은 리드가 '바뀐 리드'로 또 들어갈 뻔했다)
const sameKey = (s: string | null | undefined) => nfkc(s).replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"');
const plain = (v: unknown): string => (Array.isArray(v) ? v.map((seg) => (Array.isArray(seg) ? String(seg[0] ?? '') : '')).join('') : '');
// 노션 공개 API는 레코드를 value 안에 한 번 더 감싸서 줄 때가 있다.
const unwrap = (rec: any) => (rec?.value?.value && !rec?.value?.properties && !rec?.value?.schema ? rec.value.value : rec?.value);

/** loadPageChunk 응답에서 컬렉션·뷰 id와 스키마(칸 이름 → 칸 키)를 꺼낸다. */
export function notionCollection(chunk: any): { collectionId: string; viewId: string; columns: Record<string, string> } {
  const rm = chunk?.recordMap ?? {};
  const collectionId = Object.keys(rm.collection ?? {})[0];
  const viewId = Object.keys(rm.collection_view ?? {})[0];
  if (!collectionId || !viewId) throw new Error('노션 페이지에서 표를 찾지 못했어요');
  const schema = unwrap(rm.collection[collectionId])?.schema ?? {};
  const columns: Record<string, string> = {};
  for (const [key, col] of Object.entries<any>(schema)) columns[col.name] = key;
  return { collectionId, viewId, columns };
}

/** queryCollection 응답 → 행 목록 (노션 화면 순서). */
export function notionRows(result: any, collectionId: string, columns: Record<string, string>): NotionLead[] {
  const blocks = result?.recordMap?.block ?? {};
  const ids: string[] = result?.result?.reducerResults?.collection_group_results?.blockIds ?? [];
  const norm = (id: string) => id.replace(/-/g, '');
  const rows: NotionLead[] = [];
  for (const id of ids) {
    const b = unwrap(blocks[id]);
    if (!b || norm(b.parent_id ?? '') !== norm(collectionId)) continue;
    const props = b.properties ?? {};
    const raw = (name: string) => (columns[name] ? plain(props[columns[name]]) : '');
    const get = (name: string) => raw(name).trim();
    let deadline = '';
    const dk = columns['마감일'];
    if (dk && props[dk]) {
      try { deadline = props[dk][0][1][0][1].start_date ?? ''; } catch { deadline = ''; }
      const time = (() => { try { return props[dk][0][1][0][1].start_time ?? ''; } catch { return ''; } })();
      if (deadline && time) deadline = `${deadline}T${time}`;
    }
    // 본문은 자르지 않는다 — 저장된 본문이 끝 공백까지 원문 그대로라, 자르면 전부 '바뀐 리드'가 된다
    rows.push({ id: b.id, artist: get('아티스트명'), label: get('레이블'), lead: raw('리드'), deadline });
  }
  return rows;
}

const isPast = (d: string, now: Date) => {
  if (!d) return false;
  return d.includes('T') ? new Date(d) < now : new Date(d) < new Date(now.toDateString());
};

/** 무엇을 새로 넣을지 정한다. 같은 걸 여러 번 돌려도 결과가 같아야 한다. */
export function planNotionImport(rows: NotionLead[], existing: ExistingLead[], now = new Date()) {
  const byNotionId = new Map<string, Set<string>>();
  for (const e of existing) {
    const m = /^notion:([0-9a-f-]{36})/.exec(e.memo ?? '');
    if (!m) continue;
    if (!byNotionId.has(m[1])) byNotionId.set(m[1], new Set());
    byNotionId.get(m[1])!.add(sameKey(e.content));
  }
  const inserts: LeadInsert[] = [];
  let added = 0, updated = 0, unchanged = 0, skippedPast = 0, skippedEmpty = 0;
  for (const r of rows) {
    if (!r.artist && !r.lead) { skippedEmpty++; continue; }
    const content = nfkc(r.lead);
    const seen = byNotionId.get(r.id);
    if (seen?.has(sameKey(r.lead))) { unchanged++; continue; }
    if (seen && isPast(r.deadline, now)) { skippedPast++; continue; }
    inserts.push({
      host_id: NOTION_LEADS_HOST,
      artist: nfkc(r.label ? `${r.artist} / ${r.label}` : r.artist),
      content,
      deadline: r.deadline || null,
      kind: 'lead', status: 'pending',
      gender: 'mixed', group_type: 'solo',   // 노션에 칸이 없다 — '미정'. 기본값(male)이면 필터에 숨는다
      memo: `notion:${r.id}`,
    });
    if (seen) updated++; else added++;
  }
  return { inserts, added, updated, unchanged, skippedPast, skippedEmpty };
}
