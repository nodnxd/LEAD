# 작업 핸드오프 (LEAD / CAST / room)

> 새 세션에서 이 파일을 먼저 읽으면 이어서 작업할 수 있어요.
> 마지막 업데이트: 2026-06-12

## 프로젝트 구조
- **LEAD + CAST 통합앱**: `/Users/newnormal/Desktop/lead by nen` (이 repo, GitHub: nodnxd/LEAD) ← **앞으로 여기만 수정**
  - LEAD: `app/dashboard`, `app/view/[hostId]`, `app/guest`, `app/mypage`, `app/hub`
  - CAST(=roster): `app/roster/*` (dashboard, view, artists)
  - 공통: `app/page.tsx`(통합 로그인, LEAD↔CAST 제품 토글 → cast는 /roster/dashboard, lead는 /hub로), `app/components/ChatPanel.tsx`
  - LEAD/CAST 같은 Supabase 백엔드 공유. **유저는 LEAD 통합앱으로만 진입** (/roster가 그 안의 CAST)
- **별도 CAST(레거시 standalone)**: `/Users/newnormal/epg-roster` (GitHub: nodnxd/ROSTERS)
  - **더 이상 안 건드림** (유저가 "리드만 바꿔" 지시). 과거엔 동기화했지만 이제 통합앱만.
- **room**: `/Users/newnormal/Desktop/room` (별도 프로젝트, 가사 에디터 + square 소셜허브)
- 스택: Next.js 16 App Router, React 19, Supabase, Tailwind v4. `node_modules/next/dist/docs/` 먼저 읽기(AGENTS.md).
- 로컬 미설치 의존성(`@hello-pangea/dnd`, `jspdf`)으로 `tsc` 에러 뜨지만 **무시**(Vercel엔 설치됨). 필터: `grep -viE "hello-pangea|jspdf|implicitly has an 'any'"`

## 현재 색상 팔레트 (확정)
- **LEAD = 블루**: brand `#3E78DB`, hover `#2F62C2`, light `#A9C4F0`
  - 성별 카드색(getCardColor): 남자 `#80A1D4`, 여자 `#DE3C4B`(raspberry), 혼성 `#7C7F65`(olive)
- **CAST = red**: brand `#DE3C4B`(raspberry), hover `#C32C3B`, light `#E97582`
  - 참석(attending) = green `#46B883` (브랜드 red와 분리). 불참 `#CB827C`(더스티로즈), 미정 `#C7B27A`(머스터드), 미응답 그레이
  - 역할색: **Producer `#3E78DB`(blue)**, Topliner `#E97582`, **Engineer+A&R `#7C7F65`(올리브, 한 그룹)**
  - 삭제·에러용 red(`hover:text-red-*`)는 유지
- **room = 바이올렛** `#a78bfa` (변경 금지)
- 로그인은 room 포맷(큰 로고 text-6xl + 태그라인 + 제품 토글).

## 대시보드 스케일 / 줌 (중요)
- LEAD 대시보드: `<main style={{zoom: zoom*1.1}}>` (전역 1.1× 확대)
- CAST 대시보드: `<div style={{transform: scale(zoom*1.1), width:100/(zoom*1.1)%...}}>` (LEAD와 동일 스케일로 맞춤)
- 두 대시보드 로고 모두 `text-4xl font-semibold` (1.1× 스케일로 동일 렌더 ≈40px)
- 줌 컨트롤(뷰 + 대시보드 둘 다): **좌측 하단 고정, +/- 버튼 + 드래그(더블클릭 시 100% 리셋), "1:1" 없음**. LEAD/CAST 동일.
  - ⚠️ 대시보드와 뷰에 줌 컨트롤이 **각각** 있으니 둘 다 챙길 것.

## 완료된 작업
- 로그인 room 스타일 + 제품 토글, 색상 최종(LEAD 블루/CAST red)
- CAST 출석색 조화, Producer=blue, Engineer+A&R 한 그룹(올리브) + 뷰 섹션 병합 + 대시보드 pool 3칸(Producer/Topliner/Engineer·A&R)
- LEAD 대시보드 로그아웃 버튼, theme·EN/KO 우측 끝, ko/en 🌐 제거, hub 호스트카드 블루
- LEAD 대시보드 헤더 2줄(Row1: 활성/마감+뷰탭 / Row2: 유틸버튼들) — CAST와 통일
- CAST 대시보드 스케일·줌·로고·pool wrap을 LEAD와 동일하게 통일 (커밋 832dccb)
- pool 멤버 `flex-wrap`으로 줄바꿈(드래그 스크롤 제거)

## ⏳ 남은 작업
### CAST/LEAD 폴리시 (배포 후 재확인 필요)
- CAST 대시보드 1.1× 스케일·줌위치·pool wrap·로고크기 — **배포 후 로그인해서 LEAD와 나란히 확인**. 어긋나면 헤더 레이아웃(로고+토글 위치) 추가 정렬.
- LEAD/CAST 헤더 "위치"가 여전히 다르면: LEAD는 `flex-col items-center`(로고 위, 회사 pill 아래), CAST는 `items-center justify-center`(로고+토글 한 줄). 완전 동일하게 맞추려면 구조 통일 필요.

### room 미니홈피 (진행 중)
- 위치: `/Users/newnormal/Desktop/room`
- 2026-06-13 작업분:
  - room/roof/square switcher 위치 통일 — `dashboard`만 어긋나서 로고 `mb-10`/pill `mb-8`로 Shell에 맞춤(roof·square는 Shell 공유).
  - `Shell`에 `hideZen` prop 추가 → roof에서 zen 버튼·글로우 숨김(square엔 유지).
  - roof EditModal에 BGM 파일 업로드 추가(`media` 버킷, `uid/bgm-*`. 기존 버킷이라 SQL 불필요). URL 붙여넣기도 그대로.
- 2026-06-13 2차(현재):
  - roof EditModal에서 accent color 슬라이더 + background 프리셋 **제거**(per-roof 색 적용 로직도 제거 → 글로벌 accent + 기본 배경). featured 라벨 'featured song'으로.
  - roof zen **되돌림**: `Shell.hideZen` 제거 → room/roof/square 좌하단 zen·color·size 동일 노출.
  - square에서 people·open calls 메뉴 **숨김**(feed만). 코드는 남겨둠.
  - roof를 **자유 꾸미기 캔버스 방** 구조로 전면 개편: 프로필 헤더(풀) 복원 → 그 밑 방 박스 그리드(오너가 +new room, 이름/칸모양 사각·둥근·원 지정) → 방 클릭 시 캔버스 진입. 캔버스에서 오너가 'decorate' 모드로 텍스트/이미지 추가·드래그 배치·삭제. guestbook은 그리드 아래 섹션 유지. 기존 about/posts 좌측 네비·posts 보드는 제거.
  - **DB 필요**: `supabase-roof-rooms.sql` (roof_rooms + roof_room_items + RLS). 유저가 SQL 에디터에서 1회 실행해야 작동. 이미지/오디오는 기존 `media` 버킷.
- requests·messages: 좌하단 유지, 클릭 시 별도창(인스타 DM처럼) — messages는 이미 RoomChat 패널로 그렇게 열림(추가작업 보류).
- **남은/후속**: 캔버스 resize·rotate·z순서 컨트롤은 v1에서 생략(드래그+삭제만). 텍스트 편집은 더블클릭→textarea. 배포+로그인 후 실동작 확인 필요(로컬은 세션 없어 미검증, tsc만 통과).

## 작업 방식 메모
- 색 hex가 brand/카테고리(역할·성별·출석)로 얽혀 있어 **global sed 주의**. 같은 hex가 brand+status 양쪽이면 분리 먼저(예: 참석 green을 brand sed 전에 분리).
- 공백 경로 + `[hostId]` 글로브 → `find -print0 | while read -d ''` 또는 따옴표.
- **한 기능이 뷰/대시보드 등 여러 화면에 중복**되니(줌·역할색·로고) 전부 grep해서 같이 바꿀 것.
- 변경 후 `npx tsc --noEmit`(위 필터). 대시보드/뷰는 로그인 세션 필요해 브라우저 확인 제한적(로그인 화면만 가능).
