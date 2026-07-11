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
- **CAST = Dusk 팔레트**(2026-07-03, 차분·고급·눈편함 · 소프트 골드): brand `#E3B24A`(소프트 골드), hover `#C89632`, light `#EFCF8E`. roster/* + hub + 로그인(app/page.tsx) CAST 분기.
  - 역할: **Producer `#E3B24A`(소프트골드=hero=brand)**, Topliner `#5FA39A`(뮤트 틸), Engineer+A&R `#C98BA0`(더스티 로즈)
  - 성별 점(이름 앞): 남 `#7E97C9`(더스티블루), 여 `#DB8FA9`(소프트핑크). 로스터 풀은 남/여 **칸** 분리(점 없음, 칸 틴트 rgba 126,151,201 / 219,143,169).
  - 출석: **참석 `#77B18E`(세이지=present, 브랜드와 분리)**, 불참 `#9A8F8A`(토프), 미정 `#B3A88C`/`#B5AC90`(뮤트탄), 미응답 dim. (구 red `#DE3C4B`는 LEAD 여자카드색으로만 잔존)
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
- `room/supabase-trash.sql` (songs/folders `deleted_at` + index) — **휴지통(soft delete) 필수**, 안 돌리면 삭제가 에러
- `room/supabase-lyrics.sql` (`songs.lyrics_html`) — **가사 클라우드 저장**, 안 돌리면 가사는 로컬(localStorage)에만 저장(폴백, 크래시는 없음)
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
- **에디터(2026-07-02)**: MemoPanel 툴바 **sticky**(반투명+blur), 풀스크린 에디터 폭 **80vw**(EditorClient maxWidth), 글씨 크기 **−/+ 화살표**(선택 유지)+입력 포커스 시 CSS Custom Highlight, 섹션 삽입 라벨 **18px 볼드**·이어쓰기 직전 서식 유지, 새 메모 본문색 **rgb(206,197,197)**.
  - **후속 수정**: 글씨크기 +/- 중첩 font-size span 버그(안쪽값이 이겨 자간처럼 보임)→선택 내부 strip 후 재래핑+선택유지. **undo/redo 자체 히스토리**(innerHTML 스냅샷, ⌘Z/⌘⇧Z). 텍스트색상 **네이티브 다이얼로그→커스텀 팔레트 팝오버**(sat/lit+hue+프리셋, 트리거가 현재색 표시).
  - dashboard: **zen 기본 ON**(명시 off만 유지), **폴더도 sort 적용**(free=수동드래그), 곡·폴더 드래그 순서변경 시 free 전환, 삭제 **redo ⌘⇧Z**, **Trash 좌측메뉴 하단+우측정렬**, **휴지통**(songs/folders `deleted_at` soft delete→복구/완전삭제/비우기, `supabase-trash.sql` 필요).
- **에디터(이전)**: 가사·메모 **둘 다 칸 없는 노트패드**. 가사(`LyricEditor`) 블록 박스(테두리/배경) 제거 → 색깔 섹션 라벨만 흐름, 컨트롤은 hover. **우클릭→섹션(Intro/Verse…) 삽입**(하단 +버튼 제거, 데이터는 여전히 blocks). 메모는 가사 옆 **노트패드(textarea, 기본 표시)**, localStorage `room-memo-{songId}`. SongEditorPanel·EditorClient 둘 다.
- **roof 방**: **템플릿**(board/gallery/music/links)으로 개편(자유 캔버스 아님). 프로필 헤더 + 방 박스 그리드(이름·칸모양) → 클릭 시 템플릿별 콘텐츠. guestbook 유지. → `supabase-roof-rooms.sql` 필요.
- **앨범 모드** `/album/[folderId]`: 트랙리스트+플레이어 | 가사(편집) | 앨범 메모(6:4), 전체 가사 copy/download, **공개공유**(is_public_album + 링크), **드래그 정렬**(track_no). → `supabase-album.sql` 필요.
- roof EditModal: accent/background 제거(글로벌 accent), BGM **파일 업로드**(media 버킷). square: people·open calls 메뉴 숨김(feed만). 곡 섹션별 copy + 패널 copy lyrics.
- **Tauri 통일(데스크탑·모바일 = 웹 셸)**: `src-tauri/tauri.conf.json` frontendDist=`https://room-nu-seven.vercel.app` → 앱이 라이브 웹 로드(정적 export 불가: force-dynamic). 모바일 = `tauri ios`(gen/apple 있음), **Xcode에서 Run으로 서명·설치**(무료 Apple 계정 SK9V2ZJAA9, CLI 자동서명 안 됨). 기존 **room-native(Expo) 은퇴**(웹셸로 대체).

## 🔜 다음 세션 바로 이어서 (2026-07-03 세션 말미, 유저가 "대화 정리하고 이동" 요청)
- **[room 앨범] 데스크탑 레이아웃 정리 — 진행하던 중 끊김.** 현재 `app/album/[folderId]/page.tsx` 데스크탑이 `tracklist(w-72) | lyrics(flex-1) | ALBUM MEMO(flex '4 1 0%')` 라서 **앨범 메모가 가사보다 4배 넓게** 먹어 가사가 좁고 메모는 거대한 빈칸(유저 불만). → **앨범 메모를 하단 접이식(credits처럼)으로 내리고 lyrics를 전폭**으로. (해당 memo 블록 line ~308 `desktop-only: album memo` 제거 → 하단 credits 옆에 collapsible 추가. 모바일은 이미 메모 숨김.)
- **[room 앨범] 공유 링크 뷰어/에디터 분리** — 요청됨, 미착수. 앨범 단위 편집권한(invites/collab RLS) 필요. 지금은 public 링크=보기전용.
- **[room 앨범] 기능 아이디어**(유저에 제안함): 앨범 커버 이미지 업로드(⭐), 가사 북클릿 PDF/이미지 내보내기, 곡 복제/다른 앨범 이동.
- **[room 모바일]** 에디터 화면은 여전히 "한눈에" 부족할 수 있음 — 유저 스샷 받아서 딱 집어 최적화 예정.

### 이번 세션(2026-07-03) 한 것 요약
- **room 에디터/메모**: sticky 툴바, 폭 로직(zoom 대응), 글씨크기 +/- 버그수정+선택유지, undo/redo, 커스텀 색상팔레트, 섹션 서식유지, 기본색 rgb(206,197,197), 줄별 글자수 카운터(123), 포커스모드(⊚), 복사(⧉), 텍스트정렬, **Cmd+S 저장+`saved` 플래시**, **가사 클라우드 저장(`songs.lyrics_html` — `supabase-lyrics.sql` 필요)**.
- **room 대시보드**: Unfiled/Shared/Trash 하단 우측, 폴더 sort·드래그 순서, **휴지통(`supabase-trash.sql`)**, zen 기본 ON + **zen 모양 4종**(pulse/aurora/orbit/waves), 폴더 카드 accent 글로우 + **폴더 실루엣(사다리꼴 탭)**.
- **room 앨범**: 모바일 가로 트랙리스트+하단 플레이어, **테마 커스텀 플레이어**, `▶ all` 이어듣기, **음원 교체(replace, audio 버킷)**.
- **CAST(roster)**: 색상 **Dusk 팔레트**(brand `#E3B24A` 소프트골드 / Topliner `#5FA39A` / Eng·A&R `#C98BA0` / 참석 `#77B18E` / 성별 남 `#7E97C9`·여 `#DB8FA9`) — 팔레트 상세는 위 색상 섹션. 성별=**이름 앞 점**, 로스터 풀=**남/여 칸 분리**, 역할 행 **드래그 순서변경**, **출석 현황 패널(참석/불참 + 초기화)**, 멤버 카드 색감 정리(흰끼 제거). hub CAST 카드·통합로그인 CAST도 Dusk.

## 남은/후속 (미검증·아이디어)
- 위 SQL 실행(**`supabase-trash.sql`, `supabase-lyrics.sql`** 포함) + 배포 후 실동작 클릭 검증.
- room 에디터: 우클릭 메뉴 위치 클램프(뷰포트 끝), 섹션을 "현재 위치"에 삽입(현재는 끝에 append).
- LEAD 성별 = 트랙 vocal 기준. 보낸이 본인 성별 원하면 pitches에 필드 추가 필요.
- room 모바일앱: Apple 무료 서명 7일 만료 → 그때 Xcode Run 재실행. 독립앱 원하면 TestFlight.
- (옛 항목) CAST 대시보드 스케일·헤더 위치 LEAD와 나란히 재확인.

## 작업 방식 메모
- 색 hex가 brand/카테고리(역할·성별·출석)로 얽혀 있어 **global sed 주의**. 같은 hex가 brand+status 양쪽이면 분리 먼저(예: 참석 green을 brand sed 전에 분리).
- 공백 경로 + `[hostId]` 글로브 → `find -print0 | while read -d ''` 또는 따옴표.
- **한 기능이 뷰/대시보드 등 여러 화면에 중복**되니(줌·역할색·로고) 전부 grep해서 같이 바꿀 것.
- 변경 후 `npx tsc --noEmit`(위 필터). 대시보드/뷰는 로그인 세션 필요해 브라우저 확인 제한적(로그인 화면만 가능).
