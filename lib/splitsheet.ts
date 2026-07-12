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
  created_at?: string;
};

export type Contributor = {
  id: string;
  sheet_id: string;
  user_id: string | null;
  legal_name: string | null;
  stage_name: string | null;
  lyrics_share: number | null;
  composition_share: number | null;
  arrangement_share: number | null;
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
  order_index: number | null;
};

// The three ownership pools. Each column must total 100% across contributors.
export const CATEGORIES = [
  { key: 'lyrics_share', label: '작사', en: 'Lyrics' },
  { key: 'composition_share', label: '작곡', en: 'Composition' },
  { key: 'arrangement_share', label: '편곡', en: 'Arrangement' },
] as const;

export type ShareKey = (typeof CATEGORIES)[number]['key'];

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

export function shareTotal(rows: Contributor[], key: ShareKey): number {
  return rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
}
