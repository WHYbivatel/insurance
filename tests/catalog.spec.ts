import { test, expect } from '@playwright/test';

test('поиск показывает все совпадения из счётчика, включая больше 40 предложений', async ({ page }) => {
  await page.goto('/poisk/?q=предложение');
  const offers = await page.locator('#global-index').evaluate((el) =>
    JSON.parse(el.textContent ?? '[]').filter((item: { type: string }) => item.type === 'Предложение').length
  );
  expect(offers).toBeGreaterThan(40);
  await expect(page.locator('[data-global-count] strong')).toHaveText(String(offers));
  await expect(page.locator('[data-global-results] a')).toHaveCount(offers);
  await page.locator('[data-global-input]').fill('страх');
  const count = Number(await page.locator('[data-global-count] strong').textContent());
  await expect(page.locator('[data-global-results] a')).toHaveCount(count);
});

test('поиск переходит между результатами, пустым состоянием и подсказкой', async ({ page }) => {
  await page.goto('/poisk/?q=КАСКО');
  await expect(page.locator('[data-global-results] a').first()).toBeVisible();
  await page.locator('[data-global-input]').fill('неттакойстраховки123');
  await expect(page.locator('[data-global-empty]')).toBeVisible();
  await expect(page.locator('[data-global-results] a')).toHaveCount(0);
  await page.locator('[data-global-input]').fill('');
  await expect(page.locator('[data-global-hint]')).toBeVisible();
  await expect(page.locator('[data-global-count]')).toBeHidden();
  await expect(page.locator('[data-global-empty]')).toBeHidden();
});

test('единый индекс полного поиска находит продукт по его покрытию', async ({ page }) => {
  await page.goto('/poisk/?q=эвакуация%20детей');
  await expect(page.locator('[data-global-results] a[href="/predlozhenie/travel-freedom/"]')).toBeVisible();
  await expect(page.locator('[data-global-count] strong')).toHaveText('1');
});

test('поиск находит синонимы, переставленные слова и короткое название страховщика', async ({ page }) => {
  await page.goto('/poisk/?q=автогражданка');
  await expect(page.locator('[data-global-results] a[href="/dlya-sebya/ogpo/"]')).toBeVisible();
  await expect(page.locator('[data-global-results] a[href="/predlozhenie/ogpo-nomad/"]')).toBeVisible();

  await page.goto('/poisk/?q=поездки%20страхование');
  await expect(page.locator('[data-global-results] a[href="/dlya-sebya/poezdki/"]')).toBeVisible();

  await page.goto('/');
  await page.locator('#hero-search').fill('АО СК Nomad');
  await expect(page.locator('#hero-search-results')).toContainText('Nomad Insurance');
});

test('подсказки поддерживают клавиатуру, Escape и поиск по полному индексу через Enter', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('#hero-search');
  await input.fill('Nomad Insurance');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.press('ArrowDown');
  const activeId = await input.getAttribute('aria-activedescendant');
  expect(activeId).toBeTruthy();
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.fill('эвакуация детей');
  await expect(page.locator('#hero-search-results .search-empty')).toContainText('Нажмите Enter');
  await input.press('Enter');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('эвакуация детей');
  await expect(page.locator('[data-global-results] a[href="/predlozhenie/travel-freedom/"]')).toBeVisible();
});

test.describe('шаги оформления предложения', () => {
  test('онлайн-продукт ведёт по шагам онлайн-оформления', async ({ page }) => {
    await page.goto('/predlozhenie/kasko-nomad-transformer/');
    await expect(page.locator('.steps')).toContainText('Проверьте условия и оформите');
    await expect(page.locator('.offer-cta__domain')).toContainText('Страница оформления у страховщика');
  });

  test('заявка объясняет запрос расчёта у страховщика', async ({ page }) => {
    await page.goto('/predlozhenie/kasko-amanat/');
    await expect(page.locator('.steps')).toContainText('Сравните предложение перед оформлением');
    await expect(page.locator('.offer-cta__domain')).toContainText('Страница оформления у страховщика');
  });

  test('партнёрское оформление не называется сайтом страховщика', async ({ page }) => {
    await page.goto('/predlozhenie/ogpo-centras/');
    await expect(page.locator('.steps')).toContainText('Перейдите на сайт-партнёр');
    await expect(page.locator('.steps')).toContainText('Порядок оплаты и получения полиса зависит от правил сайта-партнёра');
    await expect(page.locator('.offer-cta__domain')).toContainText('Оформление открывается на партнёрском сайте');
    await expect(page.locator('.offer-cta__domain')).toContainText('kupipolis.kz');
    await expect(page.locator('.offer-cta__domain')).not.toContainText('сайте страховщика');
  });
});

test('структурированные условия показывают подтверждённые значения, неизвестное и источник', async ({ page }) => {
  await page.goto('/predlozhenie/kasko-amanat/');
  const conditions = page.locator('.structured-conditions');
  await expect(conditions).toContainText('Условия КАСКО');
  await expect(conditions).toContainText('Не указано в данных каталога');
  await expect(conditions).toContainText('не означает, что риск исключён');
  await expect(conditions.locator('.structured-conditions__source')).toContainText('Amanat — КАСКО');
  await expect(conditions.locator('.structured-conditions__source')).toContainText('5 ноября 2026 г.');

  await page.goto('/predlozhenie/mini-kasko-centras/');
  await expect(page.locator('.structured-conditions')).toContainText('500 000 ₸ — максимальный лимит выплаты');

  await page.goto('/predlozhenie/travel-freedom/');
  await expect(page.locator('.structured-conditions')).toContainText('COVID-19');
  await expect(page.locator('.structured-conditions')).toContainText('Любая страна по условиям программы');
});

test('сводка предложения показывает основные факты и ведёт к подробным условиям', async ({ page }) => {
  await page.goto('/predlozhenie/kasko-eurasia-smartcasco/');
  const summary = page.locator('.offer-summary');
  await expect(summary).toContainText('Основные условия');
  await expect(summary).toContainText('Стоимость');
  await expect(summary.locator('a[href="#coverage-title"]')).toBeVisible();
  await summary.locator('a[href="#structured-conditions-title"]').click();
  await expect(page).toHaveURL(/#structured-conditions-title$/);
  await expect(page.locator('#structured-conditions-title')).toBeInViewport();
});

test('сравнение КАСКО отделяет опубликованные условия от неизвестных', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/');
  const region = page.getByRole('region', { name: 'Сравнение предложений КАСКО' });
  const table = region.getByRole('table');
  await expect(page.getByRole('heading', { name: 'Чем отличаются программы КАСКО' })).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(4);
  await expect(table).toContainText('АВТОКАСКО Трансформер');
  await expect(table).toContainText('SmartCASCO');
  await expect(table).toContainText('КАСКО');
  await expect(table).toContainText('YES: 500 000');
  await expect(table).toContainText('STANDART и VIP');
  await expect(table.locator('[data-conditions-status="known"]')).toHaveCount(4);
  await expect(table.locator('[data-conditions-status="unknown"]')).toHaveCount(8);
  await expect(table.locator('a.kasko-comparison__source')).toHaveCount(3);
  await expect(page.locator('.kasko-comparison__note')).toContainText('Centras Мини КАСКО');
  await expect(page.locator('.kasko-comparison__note')).toContainText('500 000 ₸');

  if ((page.viewportSize()?.width ?? 1280) <= 640) {
    const overflow = await region.evaluate((element) => element.scrollWidth > element.clientWidth);
    const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBeTruthy();
    expect(pageOverflow).toBeFalsy();
  }
});

test('карточки показывают ключевое покрытие и подтверждённый параметр, когда он есть', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/');
  const eurasia = page.locator('[data-offer-card]').filter({ has: page.locator('a[href="/predlozhenie/kasko-eurasia-smartcasco/"]') });
  await expect(eurasia.locator('.offer-card__key-coverage')).toContainText('Покрытие:');
  await expect(eurasia.locator('.offer-card__key-condition')).toContainText('Лимит');
  await expect(eurasia.locator('.offer-card__facts')).toContainText('Расчёт у страховщика');

  const amanat = page.locator('[data-offer-card]').filter({ has: page.locator('a[href="/predlozhenie/kasko-amanat/"]') });
  await expect(amanat.locator('.offer-card__key-coverage')).toContainText('Царапины и сколы');
  await expect(amanat.locator('.offer-card__key-condition')).toHaveCount(0);
});

test('дата проверки не публикуется как дата изменения страницы', async ({ page }) => {
  await page.goto('/predlozhenie/kasko-nomad-transformer/');
  await expect(page.locator('.source-box')).toContainText('Дата проверки: 5 ноября 2026');
  const webPageSchema = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts.map((script) => JSON.parse(script.textContent ?? '{}'))
      .find((schema) => schema['@type'] === 'WebPage'),
  );
  expect(webPageSchema).toBeTruthy();
  expect(webPageSchema).not.toHaveProperty('dateModified');
});

test('сервисные возможности отделены от покрытия и остаются в поиске', async ({ page }) => {
  await page.goto('/predlozhenie/ogpo-centras/');
  const coverage = page.locator('section[aria-labelledby="coverage-title"]');
  await expect(coverage).toContainText('Ответственность перед потерпевшими в ДТП');
  await expect(coverage).not.toContainText('Онлайн-оформление на kupipolis.kz');
  await expect(page.locator('section[aria-labelledby="features-title"]')).toContainText('Онлайн-оформление на kupipolis.kz');
  await expect(page.locator('section[aria-labelledby="features-title"]')).toContainText('Проверка полиса на сайте компании');

  await page.goto('/dlya-sebya/ogpo/');
  await page.locator('[data-catalog-search]').fill('ЕСБД');
  const visibleCards = page.locator('[data-offer-card]:visible');
  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards.locator('.offer-card__title a')).toHaveAttribute('href', '/predlozhenie/ogpo-eurasia/');
});

test('внешние ссылки карточки, предложения и компании ведут на нужные домены', async ({ page }) => {
  await page.goto('/dlya-sebya/ogpo/');
  const card = page.locator('.offer-card').filter({ has: page.locator('h3 a[href="/predlozhenie/ogpo-centras/"]') });
  const cardCta = card.locator('.offer-card__actions a.btn--primary');
  await expect(cardCta).toHaveAttribute('href', 'https://kupipolis.kz/');
  await expect(cardCta).toHaveAttribute('aria-label', /kupipolis\.kz.*новой вкладке/);
  await expect(cardCta).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  await expect(card.locator('.offer-card__note')).toContainText('kupipolis.kz · партнёрский сайт');

  await page.goto('/predlozhenie/ogpo-centras/');
  const offerCta = page.locator('.offer-cta a[href="https://kupipolis.kz/"]');
  await expect(offerCta).toHaveAttribute('aria-label', /kupipolis\.kz.*новой вкладке/);
  await expect(offerCta).toHaveAttribute('rel', 'noopener noreferrer nofollow');

  await page.goto('/kompanii/centras-insurance/');
  const companyLink = page.locator('a[href="https://cic.kz/"]').first();
  await expect(companyLink).toContainText('Официальный сайт: cic.kz');
  await expect(companyLink).toHaveAttribute('aria-label', /cic\.kz.*новой вкладке/);
  await expect(companyLink).toHaveAttribute('rel', 'noopener noreferrer nofollow');
});

test('фильтры сохраняют соседние параметры и hash, а назад восстанавливает выбор', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/?campaign=keep&company=nomad&method=request#offers-title');
  if ((page.viewportSize()?.width ?? 1280) <= 1024) {
    await page.locator('[data-filter-toggle]').click();
  }
  const company = page.locator('input[name="company"][value="nomad"]');
  const method = page.locator('input[name="method"][value="request"]');
  const obligation = page.locator('input[name="obligation"][value="voluntary"]');
  await expect(company).toBeChecked();
  await expect(method).toBeChecked();

  await obligation.check();
  await expect(page).toHaveURL(/campaign=keep/);
  await expect(page).toHaveURL(/company=nomad/);
  await expect(page).toHaveURL(/method=request/);
  await expect(page).toHaveURL(/obligation=voluntary/);
  await expect(page).toHaveURL(/#offers-title$/);

  await page.goBack();
  await expect(obligation).not.toBeChecked();
  await expect(company).toBeChecked();
  await expect(method).toBeChecked();

  await page.goForward();
  await expect(obligation).toBeChecked();
  await expect(company).toBeChecked();
  await expect(method).toBeChecked();

  await page.locator('[data-catalog-search]').fill('Nomad');
  await expect(page).toHaveURL(/q=Nomad/);
  await expect(page).toHaveURL(/campaign=keep/);
  await expect(page).toHaveURL(/#offers-title$/);
});

test('сброс удаляет только параметры каталога, а назад восстанавливает весь выбор', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/?campaign=keep&q=Nomad&company=nomad&method=online#offers-title');
  if ((page.viewportSize()?.width ?? 1280) <= 1024) {
    await page.locator('[data-filter-toggle]').click();
  }
  const company = page.locator('input[name="company"][value="nomad"]');
  const method = page.locator('input[name="method"][value="online"]');
  const query = page.locator('[data-catalog-search]');
  await expect(company).toBeChecked();
  await expect(method).toBeChecked();
  await expect(query).toHaveValue('Nomad');

  await page.locator('[data-filters] [data-reset]').click();
  await expect(company).not.toBeChecked();
  await expect(method).not.toBeChecked();
  await expect(query).toHaveValue('');
  await expect(page).toHaveURL(/campaign=keep/);
  await expect(page).not.toHaveURL(/(?:\?|&)q=/);
  await expect(page).not.toHaveURL(/(?:\?|&)company=/);
  await expect(page).not.toHaveURL(/(?:\?|&)method=/);
  await expect(page).toHaveURL(/#offers-title$/);

  await page.goBack();
  await expect(company).toBeChecked();
  await expect(method).toBeChecked();
  await expect(query).toHaveValue('Nomad');
});

test('общая ссылка сразу восстанавливает несколько фильтров и сортировку', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/?campaign=keep&company=nomad%2Ceurasia&sort=title#offers-title');
  const catalog = page.locator('[data-catalog]');
  const filters = catalog.locator('[data-filters]');
  if ((page.viewportSize()?.width ?? 1280) <= 1024) await catalog.locator('[data-filter-toggle]').click();

  await expect(filters.locator('input[name="company"][value="nomad"]')).toBeChecked();
  await expect(filters.locator('input[name="company"][value="eurasia"]')).toBeChecked();
  await expect(catalog.locator('[data-catalog-sort]')).toHaveValue('title');
  await expect(page).toHaveURL(/campaign=keep/);
  await expect(page).toHaveURL(/#offers-title$/);

  const titles = await catalog.locator('[data-offer-card]:visible').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-title') ?? ''),
  );
  expect(titles.length).toBeGreaterThan(1);
  expect(titles).toEqual([...titles].sort((a, b) => a.toLocaleLowerCase('ru').localeCompare(b.toLocaleLowerCase('ru'), 'ru')));
});

test('сортировка каталога сохраняется в URL и восстанавливается кнопкой назад', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/?campaign=keep#offers-title');
  const sort = page.locator('[data-catalog-sort]');
  await sort.selectOption('title');
  await expect(page).toHaveURL(/sort=title/);
  await expect(page).toHaveURL(/campaign=keep/);
  await expect(page).toHaveURL(/#offers-title$/);
  const titles = await page.locator('[data-offer-card]:visible').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-title') ?? ''),
  );
  expect(titles).toEqual([...titles].sort((a, b) => a.toLocaleLowerCase('ru').localeCompare(b.toLocaleLowerCase('ru'), 'ru')));

  await page.goBack();
  await expect(sort).toHaveValue('recommended');
  await expect(page).not.toHaveURL(/sort=title/);
  await page.goForward();
  await expect(sort).toHaveValue('title');
});

test('счётчики фильтров пересчитываются с учётом активного поиска и других фильтров', async ({ page }) => {
  await page.goto('/dlya-sebya/kasko/');
  const catalog = page.locator('[data-catalog]');
  const query = catalog.locator('[data-catalog-search]');
  const filters = catalog.locator('[data-filters]');
  if ((page.viewportSize()?.width ?? 1280) <= 1024) await catalog.locator('[data-filter-toggle]').click();
  await filters.locator('input[name="company"][value="nomad"]').check();
  await query.fill('nomad');

  const onlineCount = Number(await filters.locator('[data-filter-count][data-filter="method"][data-value="online"]').textContent());
  const matchingOnline = await catalog.locator('[data-offer-card][data-company="nomad"][data-method="online"]:visible').count();
  expect(onlineCount).toBe(matchingOnline);
  await expect(catalog.locator('[data-count] strong')).toHaveText(String(await catalog.locator('[data-offer-card]:visible').count()));
});

test.describe('мобильное меню', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('сохраняет бизнес-разделы после возвращения на главную', async ({ page }) => {
    await page.goto('/dlya-biznesa/');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('polis:audience'))).toBe('business');
    await page.locator('.header a.logo').click();
    await page.locator('[data-menu-toggle]').click();
    const sections = page.locator('#mobile-menu .mobile-menu__sections:visible');
    await expect(sections).toHaveCount(1);
    await expect(sections).toContainText('Разделы · Для бизнеса');
    for (const link of await sections.locator('a').all()) {
      await expect(link).toHaveAttribute('href', /\/dlya-biznesa\//);
    }
    await page.locator('#mobile-menu [data-audience-link="individual"]').click();
    await expect(page).toHaveURL(/\/dlya-sebya\/$/);
    await page.locator('.header a.logo').click();
    await page.locator('[data-menu-toggle]').click();
    await expect(sections).toHaveCount(1);
    await expect(sections).toContainText('Разделы · Для себя');
    for (const link of await sections.locator('a').all()) {
      await expect(link).toHaveAttribute('href', /\/dlya-sebya\//);
    }
  });

  test('без сохранённой аудитории показывает разделы для себя', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-menu-toggle]').click();
    const sections = page.locator('#mobile-menu .mobile-menu__sections:visible');
    await expect(sections).toHaveCount(1);
    await expect(sections).toContainText('Разделы · Для себя');
  });
});

test('индикатор обновления остаётся после перехода, уведомление не повторяется', async ({ page }) => {
  const toastChunk = page.waitForResponse((response) => /\/_astro\/toast\.[^/]+\.js$/.test(new URL(response.url()).pathname));
  await page.route('**/version.json', (route) => route.fulfill({
    json: { buildId: 'new-browser-test-build' },
  }));
  await page.goto('/');
  await expect(page.locator('[data-toast-id="update"]')).toBeVisible();
  await toastChunk;
  await page.locator('[data-toast-id="update"] .toast__close').click();
  await expect(page.locator('[data-toast-id="update"]')).toHaveCount(0);
  await page.goto('/o-servise/');
  await expect(page.locator('[data-version-indicator]')).toHaveAttribute('data-update', 'available');
  await expect(page.locator('[data-version-reload]')).toBeVisible();
  await expect(page.locator('[data-toast-id="update"]')).toHaveCount(0);
  await page.unroute('**/version.json');
  await page.reload();
  await expect(page.locator('[data-version-reload]')).toBeHidden();
});

test('актуальная сборка не предлагает обновление', async ({ page }) => {
  const toastRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/_astro\/toast\.[^/]+\.js$/.test(new URL(request.url()).pathname)) toastRequests.push(request.url());
  });
  const response = page.waitForResponse((response) => new URL(response.url()).pathname === '/version.json');
  await page.goto('/');
  await response;
  await expect(page.locator('[data-version-reload]')).toBeHidden();
  await expect(page.locator('[data-toast-id="update"]')).toHaveCount(0);
  expect(toastRequests).toHaveLength(0);
});

test('автообновление ждёт окончания ввода и сохраняет URL без повторного цикла', async ({ page }) => {
  await page.clock.install();
  await page.route('**/version.json', (route) => route.fulfill({ json: { buildId: 'auto-update-audit' } }));
  await page.goto('/dlya-sebya/kasko/?company=nomad&utm_source=audit#catalog');
  const originalUrl = page.url();
  await expect(page.locator('[data-version-reload]')).toBeVisible();
  const input = page.locator('input[type="search"]').first();
  await input.focus();
  await page.clock.fastForward(9000);
  expect(await page.evaluate(() => sessionStorage.getItem('polis:auto-reloaded'))).toBeNull();
  await input.blur();
  const navigation = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await page.clock.fastForward(9000);
  await navigation;
  await page.waitForLoadState();
  expect(page.url()).toBe(originalUrl);
  expect(await page.evaluate(() => sessionStorage.getItem('polis:auto-reloaded'))).toBe('auto-update-audit');
  let reloads = 0;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) reloads++; });
  await page.clock.fastForward(40000);
  expect(reloads).toBe(0);
});
