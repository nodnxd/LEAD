// 브랜드 팔레트 단일 출처. 새 hex를 화면에 직접 박지 말고 여기서 가져다 쓴다.
//
// 왜 값이 제품당 하나가 아닌가 — 대비 때문이다. 측정값(WCAG 상대휘도 기준):
//   #C14425 위 흰 글씨   = 5.10  → 통과. subscrr 원색 #DD684B은 3.81이라 못 쓴다.
//   채도를 트리오에 맞췄다 — HSL로 LEAD S68 / CAST S73 / SPLIT S59.
//   #DD684B은 S100이라 혼자 튀었다("너무 빨감"). 명도도 틸과 같은 L45로 앉혔다.
//   #E3B24A 위 흰 글씨  = 1.96  → 실패. 골드/틸 배경엔 반드시 검은 글씨(on).
//   #2FB6A3 위 흰 글씨  = 2.52  → 실패. 같음.
// 그래서 배경으로 쓸 색(base), 그 위에 얹을 글자색(on), 다크 배경 위 텍스트용(onDark)을
// 분리해 둔다. 셋을 섞어 쓰면 대비가 깨진다.

export type ProductKey = 'lead' | 'cast' | 'split';

export const BRAND: Record<ProductKey, { base: string; on: string; onDark: string; hover: string }> = {
  lead:  { base: '#C14425', on: '#ffffff', onDark: '#DD684B', hover: '#A3391F' },
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

// ── 성별색 ────────────────────────────────────────────────────────────────
// 로스터에서 남/여를 점 하나로 말한다. 예전엔 화면마다 hex를 인라인으로 박아
// 일곱 군데에 흩어져 있었다(#7E97C9 / #DB8FA9) — 바꾸려면 전부 찾아야 했다.
//
// 값을 하늘/벽돌로 고른 이유는 대비다. 옛 조합은 남↔여 대비가 1.19라
// 두 점의 밝기가 사실상 같았고, 그래서 흑백 캡처·색약에서 구분이 안 됐다.
// 콜시트를 이미지로 내보내는 기능이 있어 이건 실제로 걸리는 문제였다.
//   다크  : 남 #9CC4F0 / 여 #B85C38 — 남↔여 2.50, 바탕 대비 10.91 / 4.36
//   라이트: 남 #4A83BC / 여 #A45230 — 남↔여 1.38, 흰 배경 3.99 / 5.49
// 라이트를 따로 두는 이유: 하늘색 원본은 흰 배경에서 대비 1.82라 거의 안 보인다.
// ⚠️ 알려진 한계 — 다크 조합은 적록색약 D형에서 1.23으로 구분이 약하다
//    (P형은 3.14로 좋다). 더 벌리려면 여자색을 #94492B 쪽으로 더 어둡게.
export const GENDER_COLORS = {
  dark:  { male: '#9CC4F0', female: '#B85C38' },
  light: { male: '#4A83BC', female: '#A45230' },
};

/** 성별 점 색. gender 값이 'female' | 'F' | '여' 로 섞여 들어와서 한 곳에서 흡수한다. */
export const genderColor = (gender: string | null | undefined, dark: boolean) =>
  GENDER_COLORS[dark ? 'dark' : 'light'][
    gender === 'female' || gender === 'F' || gender === '여' ? 'female' : 'male'
  ];

// ── 역할 배너 ──────────────────────────────────────────────────────────────
// 풀의 역할 구획(PRO / TOP / ENG·A&R)과 스튜디오 카드 제목이 같은 물건을 쓴다.
// 세 역할이 모두 같은 색인 게 핵심이다 — 색이 역할을 구분하지 않고, 구분은 글자가 한다.
// 그래서 역할이 4~5개로 늘어도 색을 새로 정할 필요가 없다.
// 따뜻한 중간 회색을 고른 이유: 브랜드색 무리에 안 끼면서 팔레트(주황·골드)와 온도가 맞는다.
// 배너는 브랜드가 아니라 구조라서 제품색을 쓰지 않는다.
//   패널(#141416) 위 대비 5.05 — 띠로 확실히 보임 / 검은 글씨 대비 5.44
export const ROLE_BANNER = { bg: '#8C857D', fg: '#0a0a0a' };
