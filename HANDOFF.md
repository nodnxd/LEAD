# 작업 핸드오프 (LEAD / CAST / room)

> 새 세션에서 이 파일을 먼저 읽으면 이어서 작업할 수 있어요.
> 마지막 업데이트: 2026-06-29

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

## ⚠️ 지금 당장 할 것 — 안 돌리면 기능 절반이 조용히 안 됨
**room Supabase**(프로젝트 다름)에서:
- `room/supabase-roof-rooms.sql` (roof_rooms + roof_room_items + RLS) — roof 방
- `room/supabase-album.sql` (folders: album_notes/album_credits/is_public_album, songs.track_no, public RLS) — 앨범 모드
**lead/cast Supabase**에서:
- `alter table pitches add column if not exists hidden boolean default false;`
- `alter table pitch_files add column if not exists hidden boolean default false;`

## GitHub / 배포
- 토큰(classic "rosters") 한 번 만료됐다가 **재발급 → 키체인 갱신 완료**. 이제 push 정상. (osxkeychain, https remote)
- room 프로덕션 웹: **`room-nu-seven.vercel.app`** (Vercel 프로젝트 "room"). lead: nodnxd/LEAD → Vercel 자동배포.
- 로컬 검증 한계: room·lead 둘 다 로그인 필요해 브라우저 확인 못 함 → **tsc만 게이트**. 배포+로그인 후 실동작 확인.

## 2026-06 세션 작업 (현재 상태)
### LEAD/CAST (`/Users/newnormal/Desktop/lead by nen`)
- **이모지 전부 제거 → Tabler 라인 아이콘**. `app/layout.tsx`에 Tabler webfont(`<i className="ti ti-*">`). dashboard·view·guest 전부. getLinkIcon은 브랜드 아이콘 반환.
- **파일 관리(dashboard Files 뷰)**: 다운로드(원본 파일명, signed URL→blob), 보낸이(멤버)+vocal 성별 표시, **컴팩트 리스트**(▶ 누를 때만 오디오), 검색 강화(BPM 포함·결과수·초기화), **BPM 범위 필터**, **태그 클릭 필터**(성별/장르/키/BPM), **멤버 배지 클릭→그 멤버만**, **우클릭/빈곳우클릭→폴더 모달(생성·이동)**, **소프트 히드**(체크박스 일괄/행 단위 + 숨김 보기·복구, `pitch_files.hidden`).
- **수신 피칭**: 상태 버튼들 제거 → **`확인` 버튼 하나**(누르면 목록서 사라짐=`pitches.hidden`), 상단 "확인한 피칭 보기"로 복구.
- **BPM·Key 자동분석**: `lib/audioAnalysis.ts` — BPM(`web-audio-beat-detector`, half/double 클램프) + Key(chroma+Krumhansl, FFT 자체구현) + vocal(F0). view 업로드에 **탭템포**. (dep: web-audio-beat-detector)
- **레이아웃(A안)**: 뷰탭(달력·목록·피칭·파일·통계) 풀폭 세그먼트로 분리, 활성/마감·리드추가·지난리드숨기기는 **달력/목록 뷰에서만**. number input 스피너 화살표 전역 제거(globals.css).

### room (`/Users/newnormal/Desktop/room`, 프로덕션 room-nu-seven.vercel.app)
- **에디터(가장 최신)**: 가사·메모 **둘 다 칸 없는 노트패드**. 가사(`LyricEditor`) 블록 박스(테두리/배경) 제거 → 색깔 섹션 라벨만 흐름, 컨트롤은 hover. **우클릭→섹션(Intro/Verse…) 삽입**(하단 +버튼 제거, 데이터는 여전히 blocks). 메모는 가사 옆 **노트패드(textarea, 기본 표시)**, localStorage `room-memo-{songId}`. SongEditorPanel·EditorClient 둘 다.
- **roof 방**: **템플릿**(board/gallery/music/links)으로 개편(자유 캔버스 아님). 프로필 헤더 + 방 박스 그리드(이름·칸모양) → 클릭 시 템플릿별 콘텐츠. guestbook 유지. → `supabase-roof-rooms.sql` 필요.
- **앨범 모드** `/album/[folderId]`: 트랙리스트+플레이어 | 가사(편집) | 앨범 메모(6:4), 전체 가사 copy/download, **공개공유**(is_public_album + 링크), **드래그 정렬**(track_no). → `supabase-album.sql` 필요.
- roof EditModal: accent/background 제거(글로벌 accent), BGM **파일 업로드**(media 버킷). square: people·open calls 메뉴 숨김(feed만). 곡 섹션별 copy + 패널 copy lyrics.
- **Tauri 통일(데스크탑·모바일 = 웹 셸)**: `src-tauri/tauri.conf.json` frontendDist=`https://room-nu-seven.vercel.app` → 앱이 라이브 웹 로드(정적 export 불가: force-dynamic). 모바일 = `tauri ios`(gen/apple 있음), **Xcode에서 Run으로 서명·설치**(무료 Apple 계정 SK9V2ZJAA9, CLI 자동서명 안 됨). 기존 **room-native(Expo) 은퇴**(웹셸로 대체).

## 남은/후속 (미검증·아이디어)
- 위 SQL 4건 실행 + 배포 후 실동작 클릭 검증.
- room 에디터: 우클릭 메뉴 위치 클램프(뷰포트 끝), 섹션을 "현재 위치"에 삽입(현재는 끝에 append).
- LEAD 성별 = 트랙 vocal 기준. 보낸이 본인 성별 원하면 pitches에 필드 추가 필요.
- room 모바일앱: Apple 무료 서명 7일 만료 → 그때 Xcode Run 재실행. 독립앱 원하면 TestFlight.
- (옛 항목) CAST 대시보드 스케일·헤더 위치 LEAD와 나란히 재확인.

## 작업 방식 메모
- 색 hex가 brand/카테고리(역할·성별·출석)로 얽혀 있어 **global sed 주의**. 같은 hex가 brand+status 양쪽이면 분리 먼저(예: 참석 green을 brand sed 전에 분리).
- 공백 경로 + `[hostId]` 글로브 → `find -print0 | while read -d ''` 또는 따옴표.
- **한 기능이 뷰/대시보드 등 여러 화면에 중복**되니(줌·역할색·로고) 전부 grep해서 같이 바꿀 것.
- 변경 후 `npx tsc --noEmit`(위 필터). 대시보드/뷰는 로그인 세션 필요해 브라우저 확인 제한적(로그인 화면만 가능).
