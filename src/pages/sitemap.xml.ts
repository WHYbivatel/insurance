import type { APIRoute } from 'astro';
import { categories } from '../data/categories';
import { companies } from '../data/companies';
import { publishedOffers } from '../data/products';
import { site } from '../data/site';

/**
 * Карта сайта строится по явному списку страниц.
 * Служебные адреса (/ui-kit/, /poisk/, /version.json) сюда не входят.
 */
export const GET: APIRoute = () => {
  const staticPages = ['/', '/dlya-sebya/', '/dlya-biznesa/', '/kompanii/', '/o-servise/'];

  const urls = [
    ...staticPages.map((path) => ({ path, priority: path === '/' ? '1.0' : '0.8' })),
    ...categories.map((category) => ({
      path: category.audience === 'individual' ? `/dlya-sebya/${category.slug}/` : `/dlya-biznesa/${category.slug}/`,
      priority: '0.8',
    })),
    ...companies.map((company) => ({ path: `/kompanii/${company.slug}/`, priority: '0.6' })),
    ...publishedOffers.map((offer) => ({ path: `/predlozhenie/${offer.slug}/`, priority: '0.7' })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ path, priority }) => `  <url>
    <loc>${new URL(path, site.url).href}</loc>
    <lastmod>${site.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
