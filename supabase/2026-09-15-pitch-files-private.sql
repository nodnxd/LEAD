-- ② 새 코드 배포 후에 실행
-- pitch-files 버킷 비공개 전환.
-- 새 코드는 재생/다운로드를 서명 URL(createSignedUrl)로 하므로 버킷이 공개여도 동작한다.
-- 반대로 먼저 비공개로 바꾸면 옛 코드의 공개 URL(<audio src=file_url>)이 전부 깨진다 — 순서 지킬 것.
-- 읽기 권한은 기존 storage 정책 pitch_obj_select(업로더 본인 / 폴더=호스트 / 워크스페이스 관리자)가 그대로 담당.
-- 재실행해도 같은 결과(멱등).

update storage.buckets set public = false where id = 'pitch-files';

-- 롤백: update storage.buckets set public = true where id = 'pitch-files';
