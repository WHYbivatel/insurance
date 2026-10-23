#!/usr/bin/env node
/**
 * Регрессионные проверки по собранному сайту.
 *
 * Проверяют то, что легко сломать повторно и что видно в готовом HTML и CSS:
 * скрытие карточек, обязательность у продукта, шаги без жёсткой сетки,
 * сохранение аудитории, состав мобильного меню, логотипы, версию, ui-kit.
 *
 * Запуск: node scripts/regression-tests.mjs (после npm run build)
 * Полная проверка в браузере (клики, клавиатура, тосты) — см. README.
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const checks = [];
const check = (name, condition, detail = '') =>
  checks.push({ name, ok: Boolean(condition), detail });

const read = (rel) => readFile(path.join(dist, rel), 'utf8');
const exists = async (rel) => {
  try {
    await readFile(path.join(dist, rel), 'utf8');
    return true;
  } catch {
    return false;
  }
};

/* ---------- CSS: правило, без которого ломается фильтрация ---------- */
const assetsDir = path.join(dist, '_astro');
const cssFiles = (await readdir(assetsDir)).filter((f) => f.endsWith('.css'));
let css = '';
for (const file of cssFiles) css += await readFile(path.join(assetsDir, file), 'utf8');

check(
  'CSS: [hidden] побеждает display компонентов',
  /\[hidden\][^{]*\{[^}]*display:\s*none\s*!important/.test(css),
  cssFiles.join(', ')
);

check(
  'CSS: мобильная навигация не скрывается вместе с настольной',
  !/(^|[},])\s*\.nav\s*\{[^}]*display:\s*none/.test(css),
  'правило .nav { display: none } не должно оставаться в медиазапросах'
);

check(
  'CSS: шаги не зафиксированы в три колонки',
  !/(^|[},])\s*\.steps\s*\{[^}]*grid-template-columns:\s*repeat\(3/.test(css)
);

/* ---------- Каталог: данные для фильтров ---------- */
const catalog = await read('dlya-sebya/index.html');
const cards = [...catalog.matchAll(/<div class="results__item"[^>]*>/g)].map((m) => m[0]);
check('Каталог: карточки размечены для фильтрации', cards.length >= 30, `${cards.length} карточек`);
check(
  'Каталог: у каждой карточки есть data-obligation',
  cards.length > 0 && cards.every((c) => /data-obligation="(required|voluntary|conditional)"/.test(c)),
  cards.find((c) => !/data-obligation/.test(c)) ?? ''
);
check(
  'Каталог: пустое состояние скрыто до фильтрации',
  /<div class="empty-state[^"]*"[^>]*data-empty[^>]*hidden/.test(catalog) ||
    /data-empty[^>]*hidden/.test(catalog)
);

/* ---------- Обязательность продукта, а не категории ---------- */
const dms = await read('predlozhenie/rab-dms-eurasia/index.html');
const dmsBadge = dms.match(/class="badge badge--[a-z]+"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '';
check('ДМС помечен как добровольный', /Добровольно/.test(dmsBadge), dmsBadge.trim().slice(0, 40));
check(
  'ДМС: нет противоречия «обязательно для работодателя»',
  !/Обязательно для работодателя/.test(dms)
);

const ogpo = await read('predlozhenie/ogpo-nomad/index.html');
const ogpoBadge = ogpo.match(/class="badge badge--[a-z]+"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '';
check('ОГПО помечено как обязательное', /Обязательно/.test(ogpoBadge), ogpoBadge.trim().slice(0, 40));

const kasko = await read('predlozhenie/kasko-eurasia-smartcasco/index.html');
check(
  'КАСКО: добровольно и не заменяет обязательное',
  /Добровольно/.test(kasko) && /не заменяет/i.test(kasko)
);

/* ---------- Шаги оформления ---------- */
check(
  'Шаги: сетка управляется компонентом, без inline-колонок',
  !/class="steps[^"]*"[^>]*style="[^"]*grid-template-columns/.test(ogpo) &&
    /class="steps[^"]*"[^>]*data-cols="3"/.test(ogpo)
);

/* ---------- Аудитория ---------- */
const home = await read('index.html');
check(
  'Аудитория: ссылки переключателя и навигации размечены одинаково',
  /data-audience-link="individual"/.test(home) &&
    /data-audience-link="business"/.test(home) &&
    /data-nav-audience="business"/.test(home)
);
check(
  'Аудитория: старый атрибут первого экрана не используется',
  !/data-hero-audience/.test(home)
);

/* ---------- Мобильное меню ---------- */
check(
  'Мобильное меню: компании и о сервисе доступны',
  /id="mobile-menu"/.test(home) && /Компании/.test(home) && /О сервисе/.test(home)
);
check(
  'Мобильное меню: разделы каталога внутри меню',
  /mobile-menu__section/.test(home)
);

/* ---------- Поиск ---------- */
check(
  'Поиск: combobox с aria-activedescendant',
  /role="combobox"/.test(home) && /aria-controls="hero-search-results"/.test(home)
);
const jsFiles = (await readdir(assetsDir)).filter((f) => f.endsWith('.js'));
let js = '';
for (const file of jsFiles) js += await readFile(path.join(assetsDir, file), 'utf8');
check('Поиск: логика подсветки вариантов в клиентском коде', /activedescendant/i.test(js));

/* ---------- Логотипы ---------- */
const logoImgs = [...home.matchAll(/<span class="company-logo[^"]*"[^>]*>\s*<img([^>]*)>/g)].map(
  (m) => m[1]
);
check('Логотипы: изображения с размерами и локальными файлами', logoImgs.length > 0 && logoImgs.every((attrs) => /width="\d+"/.test(attrs) && /height="\d+"/.test(attrs) && /src="\/_astro\//.test(attrs)), `${logoImgs.length} логотипов`);
check('Логотипы: буквенных заглушек нет', !/company-mark__mono/.test(home));

/* ---------- Версия и обновления ---------- */
const version = JSON.parse(await read('version.json'));
check(
  'version.json: версия, buildId, коммит и время сборки',
  /^\d+\.\d+\.\d+$/.test(version.version) &&
    /^[a-f0-9]{12}$/.test(version.buildId) &&
    typeof version.commit === 'string' &&
    !Number.isNaN(Date.parse(version.builtAt)),
  JSON.stringify(version)
);
check('Страница: buildId в метатеге', /<meta name="build-id" content="[a-f0-9]{12}"/.test(home));
check('Страница: индикатор версии в подвале', /data-version-indicator/.test(home));
check('Клиентский код: проверка обновлений запрашивает version.json', /version\.json/.test(js));

/* ---------- ui-kit ---------- */
check('ui-kit: страница собрана', await exists('ui-kit/index.html'));
const kit = await read('ui-kit/index.html');
check('ui-kit: закрыта от индексации', /name="robots" content="noindex/.test(kit));
const sitemap = await read('sitemap.xml');
check('sitemap: ui-kit не входит', !/ui-kit/.test(sitemap));
check('robots.txt: ui-kit закрыт', /Disallow: \/ui-kit\//.test(await read('robots.txt')));

/* ---------- Итог ---------- */
for (const item of checks) {
  console.log(`${item.ok ? 'ok  ' : 'FAIL'}  ${item.name}${item.detail && !item.ok ? ` — ${item.detail}` : ''}`);
}
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} регрессионных проверок пройдено`);
process.exit(failed.length === 0 ? 0 : 1);
