// 브랜드 팔레트 단일 출처. 새 hex를 화면에 직접 박지 말고 여기서 가져다 쓴다.
//
// 왜 값이 제품당 하나가 아닌가 — 대비 때문이다. 측정값(WCAG 상대휘도 기준):
//   #7C5AE8 on #0a0a0a  = 4.23  → 24px 이상만 통과. 작은 텍스트엔 leadOnDark(7.3).
//   #E3B24A 위 흰 글씨  = 1.96  → 실패. 골드/틸 배경엔 반드시 검은 글씨(on).
//   #2FB6A3 위 흰 글씨  = 2.52  → 실패. 같음.
// 그래서 배경으로 쓸 색(base), 그 위에 얹을 글자색(on), 다크 배경 위 텍스트용(onDark)을
// 분리해 둔다. 셋을 섞어 쓰면 대비가 깨진다.

export type ProductKey = 'lead' | 'cast' | 'split';

export const BRAND: Record<ProductKey, { base: string; on: string; onDark: string; hover: string }> = {
  lead:  { base: '#7C5AE8', on: '#ffffff', onDark: '#A78BFA', hover: '#6A48D6' },
  cast:  { base: '#E3B24A', on: '#0a0a0a', onDark: '#E3B24A', hover: '#D2A139' },
  split: { base: '#2FB6A3', on: '#0a0a0a', onDark: '#2FB6A3', hover: '#26A192' },
};

/** 배경으로 쓰는 제품색 (기존 PRODUCT_COLOR 자리) */
export const PRODUCT_COLOR: Record<ProductKey, string> = {
  lead: BRAND.lead.base, cast: BRAND.cast.base, split: BRAND.split.base,
};

/** 다크 배경 위 작은 텍스트/아이콘에 안전한 제품색 */
export const PRODUCT_COLOR_ON_DARK: Record<ProductKey, string> = {
  lead: BRAND.lead.onDark, cast: BRAND.cast.onDark, split: BRAND.split.onDark,
};

export const PRODUCTS: { key: ProductKey; label: string; href: string }[] = [
  { key: 'lead',  label: 'LEAD',  href: '/dashboard' },
  { key: 'cast',  label: 'CAST',  href: '/roster/dashboard' },
  { key: 'split', label: 'SPLIT', href: '/split' },
];
