import { supabase } from './supabase';

// pitch-files 버킷은 비공개 — 재생/다운로드는 짧은 서명 URL로만.
// file_url엔 옛 getPublicUrl 결과(.../object/public/pitch-files/<경로>)가 들어있다. 맨 경로도 받는다.
export const pitchPath = (fileUrl: string) => decodeURIComponent((fileUrl.split('/pitch-files/')[1] ?? fileUrl).split('?')[0]);

const TTL = 3600;
const cache = new Map<string, { url: string; until: number }>();

// 같은 파일을 다시 누르면 만료 5분 전까지는 서명을 재사용한다.
export async function pitchSignedUrl(fileUrl: string): Promise<string> {
  const path = pitchPath(fileUrl);
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from('pitch-files').createSignedUrl(path, TTL);
  if (error || !data?.signedUrl) throw error ?? new Error('서명 URL 없음');
  cache.set(path, { url: data.signedUrl, until: Date.now() + (TTL - 300) * 1000 });
  return data.signedUrl;
}
