import { test, expect } from '@playwright/test';

test('canonical, Open Graph и Twitter metadata совпадают на основных страницах', async ({ page }) => {
  for (const route of [
    '/',
    '/dlya-sebya/',
    '/dlya-sebya/kasko/',
    '/kompanii/nomad-insurance/',
    '/predlozhenie/kasko-amanat/',
    '/o-servise/',
  ]) {
    await page.goto(route);
    const metadata = await page.evaluate(() => ({
      canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
      ogUrl: document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content,
      ogImage: document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content,
      twitterImage: document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content,
      imageType: document.querySelector<HTMLMetaElement>('meta[property="og:image:type"]')?.content,
      imageWidth: document.querySelector<HTMLMetaElement>('meta[property="og:image:width"]')?.content,
      imageHeight: document.querySelector<HTMLMetaElement>('meta[property="og:image:height"]')?.content,
      imageAlt: document.querySelector<HTMLMetaElement>('meta[property="og:image:alt"]')?.content,
      twitterCard: document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content,
      description: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
    }));
    const current = new URL(page.url());
    expect(metadata.canonical, route).toBe(`${new URL(metadata.canonical!).origin}${current.pathname}`);
    expect(metadata.ogUrl, route).toBe(metadata.canonical);
    expect(metadata.ogImage, route).toBe(`${new URL(metadata.canonical!).origin}/og.png`);
    expect(metadata.twitterImage, route).toBe(metadata.ogImage);
    expect(metadata.imageType, route).toBe('image/png');
    expect(metadata.imageWidth, route).toBe('1200');
    expect(metadata.imageHeight, route).toBe('630');
    expect(metadata.imageAlt, route).toBeTruthy();
    expect(metadata.twitterCard, route).toBe('summary_large_image');
    expect(metadata.description, route).toBeTruthy();
  }

  const image = await page.request.get('/og.png');
  expect(image.ok()).toBeTruthy();
  expect(image.headers()['content-type']).toContain('image/png');
});

test('индексируемые страницы имеют WebPage schema и абсолютные URL в JSON-LD', async ({ page }) => {
  for (const [route, expectedTypes] of [
    ['/', ['WebPage', 'WebSite']],
    ['/dlya-sebya/kasko/', ['WebPage', 'CollectionPage', 'BreadcrumbList']],
    ['/kompanii/nomad-insurance/', ['WebPage', 'BreadcrumbList']],
    ['/predlozhenie/kasko-amanat/', ['WebPage', 'BreadcrumbList']],
    ['/o-servise/', ['WebPage']],
  ] as const) {
    await page.goto(route);
    const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent ?? '{}')),
    );
    const entries = schemas.flatMap((schema) => Array.isArray(schema) ? schema : [schema]);
    const types = entries.map((schema) => schema['@type']);
    for (const type of expectedTypes) expect(types, `${route}: ${type}`).toContain(type);

    const pageSchema = entries.find((schema) => schema['@type'] === 'WebPage');
    const canonicalOrigin = new URL(pageSchema.url).origin;
    expect(pageSchema.url).toBe(`${canonicalOrigin}${new URL(page.url()).pathname}`);
    expect(pageSchema.isPartOf.url).toBe(canonicalOrigin);

    for (const schema of entries) {
      if (schema.url) expect(new URL(schema.url).origin, `${route}: ${schema['@type']} URL`).toBe(canonicalOrigin);
      if (schema['@type'] === 'BreadcrumbList') {
        for (const item of schema.itemListElement) {
          expect(new URL(item.item).origin, `${route}: breadcrumb ${item.name}`).toBe(canonicalOrigin);
        }
      }
    }
  }
});

test('sitemap и robots перечисляют только индексируемые URL и не блокируют noindex страницы', async ({ page }) => {
  const sitemapResponse = await page.request.get('/sitemap.xml');
  expect(sitemapResponse.ok()).toBeTruthy();
  expect(sitemapResponse.headers()['content-type']).toMatch(/(?:application|text)\/xml/);
  const xml = await sitemapResponse.text();
  const urls = Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1]);
  const origin = new URL(xml.match(/<loc>(.*?)<\/loc>/)?.[1] ?? sitemapResponse.url()).origin;
  expect(urls.length).toBeGreaterThan(80);
  expect(new Set(urls).size).toBe(urls.length);
  expect(xml).not.toContain('<lastmod>');
  for (const value of urls) {
    const url = new URL(value);
    expect(url.origin).toBe(origin);
    expect(url.pathname === '/' || url.pathname.endsWith('/')).toBeTruthy();
    expect(url.pathname).not.toMatch(/^\/(?:poisk|ui-kit|404\.html)(?:\/|$)/);
  }

  const robotsResponse = await page.request.get('/robots.txt');
  expect(robotsResponse.ok()).toBeTruthy();
  const robots = await robotsResponse.text();
  expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
  expect(robots).not.toContain('Disallow: /poisk/');
  expect(robots).not.toContain('Disallow: /ui-kit/');
  expect(urls).toContain(`${origin}/dlya-sebya/kasko/`);
  expect(urls).toContain(`${origin}/predlozhenie/kasko-amanat/`);

  for (const route of ['/poisk/', '/ui-kit/']) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
});
