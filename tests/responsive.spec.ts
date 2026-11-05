import { test, expect } from '@playwright/test';

test('ключевые страницы адаптируются без горизонтальной прокрутки', async ({ page }) => {
  const widths = [360, 390, 640, 768, 820, 1024, 1025, 1280, 1440];
  const routes = [
    '/',
    '/dlya-sebya/kasko/',
    '/predlozhenie/kasko-amanat/',
    '/kompanii/nomad-insurance/',
    '/o-servise/',
    '/dlya-biznesa/',
    '/poisk/?q=КАСКО',
  ];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `${route} at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
    }

    await page.goto('/dlya-sebya/kasko/');
    if (width <= 390) {
      const cards = await page.locator('.offer-card').evaluateAll((items) =>
        items.map((item) => ({
          title: item.querySelector('.offer-card__title')?.textContent?.trim() ?? '',
          width: item.clientWidth,
          contentWidth: item.scrollWidth,
        })),
      );
      for (const card of cards) {
        expect(card.contentWidth, `${card.title} at ${width}px`).toBeLessThanOrEqual(card.width + 1);
      }
    }
    if (width <= 1024) {
      await expect(page.locator('[data-filter-toggle]')).toBeVisible();
      await expect(page.locator('.header__inner > .nav')).toBeHidden();
      await expect(page.locator('.header .menu-toggle')).toBeVisible();
    } else {
      await expect(page.locator('[data-filter-toggle]')).toBeHidden();
      await expect(page.locator('.header__inner > .nav')).toBeVisible();
      await expect(page.locator('.header .menu-toggle')).toBeHidden();
    }
  }
});
