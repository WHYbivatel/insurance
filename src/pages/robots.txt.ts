import type { APIRoute } from 'astro';
import { site } from '../data/site';

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /poisk/
Disallow: /ui-kit/

Sitemap: ${new URL('/sitemap.xml', site.url).href}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
