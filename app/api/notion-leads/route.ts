// 노션 공개 DB "진행중인 리드"를 읽어 행 목록으로 돌려준다.
// 브라우저에서 notion.site를 직접 부르면 CORS로 막혀서 여기서 대신 읽는다.
// 쓰기는 하지 않는다 — DB에 넣는 건 로그인한 호스트가 자기 권한(RLS)으로 한다.
import { NOTION_PAGE_ID, NOTION_SITE, notionCollection, notionRows } from '@/lib/notionLeads';

export const dynamic = 'force-dynamic';

async function notion(path: string, body: unknown) {
  const res = await fetch(`${NOTION_SITE}/api/v3/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (LEAD notion sync)' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`노션 응답 ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const chunk = await notion('loadPageChunk', {
      pageId: NOTION_PAGE_ID, limit: 100, cursor: { stack: [] }, chunkNumber: 0, verticalColumns: false,
    });
    const { collectionId, viewId, columns } = notionCollection(chunk);
    const result = await notion('queryCollection', {
      collectionId, collectionViewId: viewId,
      loader: {
        type: 'reducer',
        reducers: { collection_group_results: { type: 'results', limit: 1000 } },
        searchQuery: '', userTimeZone: 'Asia/Seoul',
      },
      query: {},
    });
    return Response.json({ rows: notionRows(result, collectionId, columns) });
  } catch (e: any) {
    return Response.json({ error: e?.message || '노션을 읽지 못했어요' }, { status: 502 });
  }
}
