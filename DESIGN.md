---
version: 1
name: LEAD-CAST-SPLIT
description: >
  Dark-first poster typography for a working music-industry tool. Archivo Black + Black Han Sans
  carry every display line at a single weight; Wanted Sans runs the body; IBM Plex Mono runs numerals.
  Three products share one shell and are told apart by one color each — purple LEAD, gold CAST,
  teal SPLIT — never by layout. Chrome stays flat and quiet: no gradients on controls, no drop
  shadows on chrome, surfaces separated by 1px hairlines and near-black steps instead.

# 실제 구현과 1:1로 맞춰 둔 파일이다.
#   색 → lib/brand.ts + app/globals.css :root
#   타입 스케일 → app/globals.css @theme
# 여기 없는 값을 화면에 새로 박지 말 것. 필요하면 이 파일과 위 두 파일을 같이 고친다.

colors:
  # 표면 (다크 우선. 라이트 테마는 화면별로 D 플래그가 갈라 쓴다)
  surface-0: "#0a0a0a"     # 앱 바탕
  surface-1: "#141416"     # 카드·패널
  surface-2: "#1e1e1e"     # 한 단계 올라온 면
  hairline: "rgba(255,255,255,0.10)"

  # 제품색 — base는 배경용, on은 그 위 글자색, on-dark는 다크 배경 위 텍스트용
  lead: "#7c5ae8"
  lead-on: "#ffffff"
  lead-on-dark: "#a78bfa"
  lead-hover: "#6a48d6"
  cast: "#e3b24a"
  cast-on: "#0a0a0a"
  split: "#2fb6a3"
  split-on: "#0a0a0a"

  # 텍스트 (다크 배경 기준)
  text: "#ffffff"
  text-muted: "rgba(255,255,255,0.55)"    # 이 아래로는 내리지 않는다 — 대비 4.5 하한선
  danger: "#f87171"
  success: "#6ee7b7"

typography:
  display:
    fontFamily: "Archivo Black, Black Han Sans, Wanted Sans Variable, sans-serif"
    fontWeight: 400        # 이 폰트들은 굵기가 400 하나뿐. font-bold를 얹으면 가짜 볼드로 뭉갠다.
    letterSpacing: -0.025em
  body:
    fontFamily: "Wanted Sans Variable, -apple-system, Apple SD Gothic Neo, sans-serif"
    letterSpacing: -0.005em
  numeric:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontFeatureSettings: "tnum"

  # 스케일 — 이 7단계 + 디스플레이 2단계가 전부다 (globals.css @theme / @utility)
  scale:
    text-micro: 10px      # 뱃지·최소 라벨
    text-mini: 12px       # 보조 정보
    text-body: 14px       # 본문
    text-lead: 16px       # 강조 본문·컨트롤
    text-sub: 18px        # 소제목·주요 버튼
    text-title: 24px      # 섹션 제목
    text-display: "clamp(1.75rem, 7vw, 2.5rem)"   # 워드마크·페이지 헤더
    text-hero: "clamp(2.5rem, 9vw, 4.5rem)"       # 랜딩 포스터 전용

rounded:
  sm: 8px
  md: 12px      # 입력창·버튼 (rounded-xl)
  lg: 16px      # 카드 (rounded-2xl)
  xl: 24px      # 허브 카드 (rounded-3xl)
  pill: 9999px  # 제품 토글

motion:
  enter-rise: "riseIn .28s cubic-bezier(0.22, 1, 0.36, 1)"   # 모달·카드 진입
  enter-fade: "fadeIn .2s ease"                              # 배경 오버레이
  hover: ".18s ease"                                          # 색·그림자만. transform은 -translate-y-0.5까지.
  reduced-motion: "prefers-reduced-motion에서 전부 정지 — globals.css가 전역으로 끈다"
---

# LEAD · CAST · SPLIT — 디자인 시스템

## 이게 무엇인가

음악 회사가 실제로 굴리는 업무 도구다. 마케팅 사이트가 아니다. 화면 대부분은 리스트·표·폼이고,
사용자는 하루에 여러 번 들어온다. 그래서 **화려함보다 밀도와 가독성**이 먼저다.
단 하나 예외가 브랜드 타이포 — 워드마크와 페이지 헤더는 포스터처럼 크고 무겁게 간다.

## 세 제품, 한 껍데기

LEAD(리드·피칭) / CAST(로스터·가능일) / SPLIT(분배·스플릿시트)는 **같은 레이아웃**을 쓴다.
구분은 오직 색 하나다. 제품마다 다른 레이아웃을 만들지 말 것 — 사용자는 셋을 오간다.

상단은 항상 `components/ProductHeader.tsx`: 왼쪽 `← hub`, 가운데 워드마크 + 제품 토글, 오른쪽 컨트롤.

## 지켜야 하는 규칙

**색**
- 새 hex를 화면에 직접 박지 않는다. `lib/brand.ts`(제품색)와 `globals.css :root`(표면)를 거친다.
- 골드(CAST)·틸(SPLIT) 배경에 흰 글씨를 얹지 않는다. 대비가 각각 1.96 / 2.52로 실패한다.
  배경색마다 짝지어 둔 `on` 색을 쓴다.
- 보라(#7C5AE8)는 24px 이상에서만 다크 배경 위 텍스트로 쓸 수 있다(대비 4.23).
  작은 텍스트·아이콘엔 `lead-on-dark`(#A78BFA, 대비 7.3).
- 다크 배경 위 흰 텍스트 투명도는 **/55가 하한**이다. /40은 3.77로 실패한다.

**타이포**
- 스케일 밖의 크기를 만들지 않는다. `text-[13px]` 같은 임의값 금지 — 위 9단계로 해결된다.
- `.font-display`에 `font-bold`를 얹지 않는다 (가짜 볼드).
- 숫자가 세로로 비교되는 자리엔 `.tabular` 또는 `.font-mono-num`.
- 말줄임은 `…`, 로딩 문구는 `"저장 중…"`처럼 끝에 붙인다.

**컴포넌트**
- 모달 = 배경 `fixed inset-0` + 패널 `role="dialog" aria-modal`. Esc 닫기와 진입 포커스는
  `components/EscapeToClose.tsx`가 앱 전역에서 처리하므로 모달마다 다시 만들지 않는다.
- 클릭 가능한 `<div>`를 새로 만들지 않는다. `<button>`을 쓰고, 레이아웃 때문에 불가능하면
  `lib/a11y.ts`의 `pressable()`을 편다.
- 내부 이동은 `<a href>`가 아니라 `next/link`.
- 날짜·숫자는 `lib/format.ts`의 `fmtDate` / `fmtNumber`. 로케일을 문자열로 박지 않는다.

**모션**
- `transition: all` 금지. 바뀌는 속성만 적는다.
- 애니메이션은 `transform`과 `opacity`만. 무한 루프는 `prefers-reduced-motion`에서 멈춰야 한다.

## 안 하는 것

- 컨트롤에 그라디언트 (배경 오브의 blur 글로우는 예외 — 허브·랜딩에만)
- chrome에 드롭섀도. 떠 있는 것(모달·팝오버)만 그림자를 갖는다.
- 카드 안의 카드 안의 카드. 중첩은 2단까지.
- 아이콘 시스템 둘 섞기. Tabler 웹폰트가 기본이고, 이모지는 감정 표현이 목적일 때만.
