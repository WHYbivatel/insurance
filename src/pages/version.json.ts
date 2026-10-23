import type { APIRoute } from 'astro';
import { buildInfo } from '../lib/build-info';

/**
 * Публичные сведения о сборке. Секретов здесь нет.
 * Отдаётся с Cache-Control: no-store (см. public/_headers и README),
 * чтобы открытая вкладка всегда получала актуальный buildId.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildInfo, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
