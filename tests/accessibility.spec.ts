import { test, expect } from '@playwright/test';

test('основные страницы имеют landmarks, уникальные идентификаторы и доступные имена', async ({ page }) => {
  for (const route of ['/', '/dlya-sebya/kasko/', '/predlozhenie/kasko-amanat/', '/kompanii/nomad-insurance/', '/poisk/']) {
    await page.goto(route);
    const audit = await page.evaluate(() => {
      const visible = (el: Element) =>
        !el.closest('[hidden], [inert], [aria-hidden="true"]') &&
        getComputedStyle(el).display !== 'none' &&
        getComputedStyle(el).visibility !== 'hidden' &&
        el.getClientRects().length > 0;
      const nameOf = (el: Element) => {
        const labelledBy = (el.getAttribute('aria-labelledby') ?? '')
          .split(/\s+/).filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
        const labels = 'labels' in el ? Array.from((el as HTMLInputElement).labels ?? []).map((label) => label.textContent ?? '').join(' ') : '';
        const imageNames = Array.from(el.querySelectorAll('img[alt]')).map((image) => image.getAttribute('alt')).join(' ');
        return [el.getAttribute('aria-label'), labelledBy, labels, el.getAttribute('title'), el.textContent, imageNames]
          .filter(Boolean).join(' ').trim();
      };
      const duplicates = Array.from(document.querySelectorAll('[id]'))
        .map((el) => el.id)
        .filter((id, index, ids) => ids.indexOf(id) !== index);
      const unnamed = Array.from(document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea'))
        .filter(visible)
        .filter((el) => !nameOf(el))
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className)}`);
      const missingAlt = Array.from(document.querySelectorAll('img:not([alt])')).map((el) => el.outerHTML);
      const missingReferences = Array.from(document.querySelectorAll('[aria-controls], [aria-labelledby], [aria-describedby]'))
        .flatMap((el) => ['aria-controls', 'aria-labelledby', 'aria-describedby']
          .flatMap((attr) => (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)
            .filter((id) => !document.getElementById(id))));
      return {
        h1Count: document.querySelectorAll('main h1').length,
        mainCount: document.querySelectorAll('main').length,
        duplicates,
        unnamed,
        missingAlt,
        missingReferences,
      };
    });
    expect(audit.mainCount, route).toBe(1);
    expect(audit.h1Count, route).toBe(1);
    expect(audit.duplicates, route).toEqual([]);
    expect(audit.unnamed, route).toEqual([]);
    expect(audit.missingAlt, route).toEqual([]);
    expect(audit.missingReferences, route).toEqual([]);
  }
});

test('ссылка пропуска к содержимому переводит фокус в main', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('мобильное меню открывается клавиатурой, закрывается Escape и возвращает фокус', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('[data-menu-toggle]');
  const menu = page.locator('#mobile-menu');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.locator('nav a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(menu).toHaveAttribute('inert', '');
});

test('аккордеон управляется клавиатурой и синхронизирует доступное состояние', async ({ page }) => {
  await page.goto('/');
  const trigger = page.locator('[data-accordion-trigger]').first();
  const panelId = await trigger.getAttribute('aria-controls');
  const panel = page.locator(`#${panelId}`);
  await trigger.focus();
  await page.keyboard.press('Space');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).not.toHaveAttribute('inert', '');
  await expect(panel).toBeVisible();
});

test('пустая выдача сообщает статус отдельно от кнопки действия', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/');
  await page.locator('[data-catalog-search]').fill('неттакойстраховки123');
  const empty = page.locator('[data-empty]');
  await expect(empty.getByRole('status')).toBeVisible();
  await expect(empty.getByRole('status').getByRole('button')).toHaveCount(0);
  await expect(empty.getByRole('button', { name: 'Сбросить фильтры' })).toBeVisible();
});

test('пустая быстрая подсказка остаётся валидным пунктом listbox', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#hero-search');
  await input.fill('неттакойстраховки123');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  const message = page.getByRole('option', { name: /совпадений нет.*Нажмите Enter/ });
  await expect(message).toHaveAttribute('aria-disabled', 'true');
});

test('поиск, сортировка и фильтры каталога имеют понятные имена и состояние', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dlya-sebya/kasko/');
  await expect(page.getByRole('searchbox', { name: 'Поиск по каталогу' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Сортировка' })).toBeVisible();

  const toggle = page.getByRole('button', { name: 'Фильтры' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const filters = page.locator('#catalog-filters');
  await expect(filters).toBeVisible();
  await expect(filters.getByRole('checkbox').first()).toBeVisible();
  await expect(filters.getByRole('button', { name: 'Сбросить' })).toBeVisible();
});
