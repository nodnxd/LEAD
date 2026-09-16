-- 2026-09-16 · 2단계 B1 · pitch-files 버킷 비공개 전환
-- 선행(이미 배포됨): 2a7d8c0 — 재생·다운로드가 lib/pitchAudio.ts의 짧은 서명 URL을 탄다.
-- 확인한 것: pitch_obj_select/insert/delete 정책 전부 authenticated + 본인 폴더 또는
--            workspace_admins. 게스트 피칭도 signInWithPassword 뒤에 올린다.
--            공개 공유 페이지(app/view)는 업로드만 하고 재생은 안 한다.
-- 되돌리기: update storage.buckets set public = true where id = 'pitch-files';

update storage.buckets set public = false where id = 'pitch-files';

-- 확인 — pitch-files가 false로 나와야 한다
select id, public from storage.buckets order by id;
