// Split-sheet domain constants & types.
// PRO/CMO = Performing Rights Org / Collective Management Org (저작권협회).
// IPI/CAE = the CISAC worldwide interested-party (writer/publisher) identifier.

export type CopyrightProfile = {
  id: string;
  legal_name: string | null;
  stage_name: string | null;
  pro: string | null;
  ipi: string | null;
  publisher_name: string | null;
  publisher_pro: string | null;
  publisher_ipi: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type SplitSheet = {
  id: string;
  owner_id: string;
  song_title: string | null;
  aka: string | null;
  artist_name: string | null;
  album: string | null;
  duration: string | null;
  iswc: string | null;
  isrc: string | null;
  contains_sample: boolean | null;
  sample_note: string | null;
  work_date: string | null;
  notes: string | null;
  audio_path: string | null;   // storage path in the 'member-demos' bucket
  audio_name: string | null;   // original filename (shown on the sheet/PDF)
  locked: boolean | null;      // finalized after everyone signs
  locked_at: string | null;
  version: number | null;      // bumps when unlocked for edits
  signature_requested_at: string | null;
  // 풀 가중치. 작사 100 + 작곡 100 + 편곡 100짜리 시트는 KOMCA에도 ASCAP에도
  // 등록이 안 된다 — 협회는 사람당 숫자 하나를 요구한다. 이 셋이 그 하나를 만든다.
  // 업계 관행은 작사 50 / 작곡 50, 편곡은 별도 협의(0)라 그게 기본값이다.
  weight_lyrics: number | null;
  weight_composition: number | null;
  weight_arrangement: number | null;
  created_at?: string;
};

export const DEFAULT_WEIGHTS: Record<CategoryKey, number> = { lyrics: 50, composition: 50, arrangement: 0 };

export const sheetWeights = (s: Pick<SplitSheet, 'weight_lyrics' | 'weight_composition' | 'weight_arrangement'> | null): Record<CategoryKey, number> => ({
  lyrics: s?.weight_lyrics ?? DEFAULT_WEIGHTS.lyrics,
  composition: s?.weight_composition ?? DEFAULT_WEIGHTS.composition,
  arrangement: s?.weight_arrangement ?? DEFAULT_WEIGHTS.arrangement,
});

// One entry = one person's contribution to ONE category (작사/작곡/편곡).
// A person who did both 작사 and 작곡 has two entries.
export type Contributor = {
  id: string;
  sheet_id: string;
  user_id: string | null;
  category: CategoryKey | null;   // which pool this entry belongs to
  share: number | null;           // % within that pool
  legal_name: string | null;
  stage_name: string | null;
  pro: string | null;
  ipi: string | null;
  publisher_name: string | null;
  publisher_pro: string | null;
  publisher_ipi: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  signed: boolean | null;
  signed_at: string | null;
  signature_name: string | null;  // typed legal name at signing
  signature_data: string | null;  // drawn signature PNG (data URL)
  signed_hash: string | null;     // SHA-256 of the agreement snapshot at signing
  sign_token: string | null;      // secret token for external (no-account) signing link
  order_index: number | null;
};

// The three ownership pools. Each pool must total 100% across its entries.
export const CATEGORIES = [
  { key: 'lyrics', label: '작사', en: 'Lyrics' },
  { key: 'composition', label: '작곡', en: 'Composition' },
  { key: 'arrangement', label: '편곡', en: 'Arrangement' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

// Worldwide PRO / CMO societies, grouped by region. value = code stored in DB.
export const PRO_GROUPS: { region: string; items: { code: string; label: string }[] }[] = [
  { region: 'Korea', items: [
    { code: 'KOMCA', label: 'KOMCA — 한국음악저작권협회' },
    { code: 'KOSCAP', label: 'KOSCAP — 함께하는음악저작인협회' },
    { code: 'FKMP', label: 'FKMP — 한국음악실연자연합회' },
  ]},
  { region: 'United States', items: [
    { code: 'ASCAP', label: 'ASCAP' },
    { code: 'BMI', label: 'BMI' },
    { code: 'SESAC', label: 'SESAC' },
    { code: 'GMR', label: 'GMR — Global Music Rights' },
  ]},
  { region: 'Europe', items: [
    { code: 'PRS', label: 'PRS for Music (UK)' },
    { code: 'GEMA', label: 'GEMA (Germany)' },
    { code: 'SACEM', label: 'SACEM (France)' },
    { code: 'BUMASTEMRA', label: 'BUMA/STEMRA (Netherlands)' },
    { code: 'SIAE', label: 'SIAE (Italy)' },
    { code: 'SGAE', label: 'SGAE (Spain)' },
    { code: 'STIM', label: 'STIM (Sweden)' },
    { code: 'SUISA', label: 'SUISA (Switzerland)' },
    { code: 'SABAM', label: 'SABAM (Belgium)' },
    { code: 'AKM', label: 'AKM (Austria)' },
    { code: 'ZAIKS', label: 'ZAiKS (Poland)' },
  ]},
  { region: 'Asia-Pacific', items: [
    { code: 'JASRAC', label: 'JASRAC (Japan)' },
    { code: 'NEXTONE', label: 'NexTone (Japan)' },
    { code: 'APRA', label: 'APRA AMCOS (Australia/NZ)' },
    { code: 'MCSC', label: 'MCSC (China)' },
    { code: 'CASH', label: 'CASH (Hong Kong)' },
    { code: 'COMPASS', label: 'COMPASS (Singapore)' },
    { code: 'MACP', label: 'MACP (Malaysia)' },
    { code: 'IPRS', label: 'IPRS (India)' },
  ]},
  { region: 'Americas (other)', items: [
    { code: 'SOCAN', label: 'SOCAN (Canada)' },
    { code: 'UBC', label: 'UBC / ECAD (Brazil)' },
    { code: 'SACM', label: 'SACM (Mexico)' },
    { code: 'SADAIC', label: 'SADAIC (Argentina)' },
  ]},
  { region: 'Africa / Other', items: [
    { code: 'SAMRO', label: 'SAMRO (South Africa)' },
    { code: 'NONE', label: '미가입 / None' },
    { code: 'OTHER', label: '기타 (직접 입력)' },
  ]},
];

export const PRO_LABEL: Record<string, string> = Object.fromEntries(
  PRO_GROUPS.flatMap((g) => g.items.map((i) => [i.code, i.label.split(' — ')[0].split(' (')[0]])),
);

export function categoryTotal(rows: Contributor[], cat: CategoryKey): number {
  return rows.filter((r) => r.category === cat).reduce((sum, r) => sum + (Number(r.share) || 0), 0);
}

/** 한 사람을 가리키는 열쇠. 같은 사람이 작사·작곡에 각각 한 줄씩 있으므로 묶어야 한다. */
const personKey = (r: Contributor) =>
  r.user_id || (r.email || '').trim().toLowerCase() || (r.legal_name || '').trim() || r.id;

export type WriterShare = { key: string; name: string; stage: string | null; share: number; parts: Partial<Record<CategoryKey, number>> };

/**
 * 협회에 낼 수 있는 '사람당 하나'의 지분을 만든다.
 *   최종 = Σ (그 풀에서의 지분 × 풀 가중치) / 100
 * 풀별 100%와 가중치 합 100%가 지켜지면 최종 합계도 100%가 된다.
 */
export function writerShares(rows: Contributor[], weights: Record<CategoryKey, number>): WriterShare[] {
  const byPerson = new Map<string, WriterShare>();
  for (const r of rows) {
    if (!r.category) continue;
    const w = weights[r.category] ?? 0;
    const k = personKey(r);
    const cur = byPerson.get(k) ?? { key: k, name: r.legal_name || r.stage_name || '—', stage: r.stage_name, share: 0, parts: {} };
    cur.share += ((Number(r.share) || 0) * w) / 100;
    cur.parts[r.category] = (cur.parts[r.category] ?? 0) + (Number(r.share) || 0);
    if (!cur.name || cur.name === '—') cur.name = r.legal_name || r.stage_name || '—';
    byPerson.set(k, cur);
  }
  return [...byPerson.values()]
    .map((p) => ({ ...p, share: Math.round(p.share * 100) / 100 }))
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
}

export const writerTotal = (ws: WriterShare[]) => Math.round(ws.reduce((s, w) => s + w.share, 0) * 100) / 100;
