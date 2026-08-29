'use client';

// Supabase 쓰기 실패가 전부 무음이었음 — 저장이 안 돼도 화면은 성공처럼 보였다.
// 호출부가 60곳 넘어서 각각 고치는 대신 fetch를 한 번만 가로채 실패를 알린다.
// ponytail: window.fetch 전역 몽키패치. 호출부 수정 0이 목표라 택한 방식이고,
//           나중에 supabase 클라이언트를 감싸는 래퍼로 바꿀 수 있음.

export const DB_ERROR_EVENT = 'cast-db-error';

export type DbError = { status: number; message: string; table: string; write: boolean };

let installed = false;

function tableOf(url: string) {
  const m = url.match(/\/rest\/v1\/(?:rpc\/)?([^?/]+)/);
  return m ? m[1] : 'unknown';
}

export function installDbErrorReporter() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const orig = window.fetch.bind(window);

  window.fetch = async (input: any, init?: any) => {
    const res = await orig(input, init);
    try {
      const url = typeof input === 'string' ? input : (input?.url ?? String(input));
      if (!res.ok && url.includes('/rest/v1/')) {
        const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
        const write = method !== 'GET' && method !== 'HEAD';
        // 본문은 clone으로 읽어야 호출부가 다시 읽을 수 있다
        let message = `${res.status}`;
        try {
          const body = await res.clone().json();
          message = body?.message || body?.error_description || body?.hint || message;
        } catch { /* 본문 없거나 JSON 아님 */ }
        window.dispatchEvent(new CustomEvent<DbError>(DB_ERROR_EVENT, {
          detail: { status: res.status, message, table: tableOf(url), write },
        }));
      }
    } catch { /* 리포팅 실패가 요청을 깨뜨리면 안 됨 */ }
    return res;
  };
}

// 페이지에서 한 줄로 붙이는 구독 헬퍼
export function onDbError(handler: (e: DbError) => void) {
  installDbErrorReporter();
  const fn = (ev: Event) => handler((ev as CustomEvent<DbError>).detail);
  window.addEventListener(DB_ERROR_EVENT, fn);
  return () => window.removeEventListener(DB_ERROR_EVENT, fn);
}
