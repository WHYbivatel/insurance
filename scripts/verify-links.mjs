#!/usr/bin/env node
/**
 * Проверка ссылок каталога.
 *
 * Внешние ссылки: берёт все адреса из src/data/products.*.ts (поля source.url
 * и purchase.url), удаляет дубликаты и опрашивает каждый адрес. Редиректы
 * отслеживаются, потому что страница продукта может переехать.
 *
 * Внутренние ссылки: разбирает собранные страницы в dist/ и проверяет, что
 * каждый внутренний адрес ведёт на существующую страницу. Требует сборки.
 *
 * Запуск:
 *   npm run verify:links              — проверить внешние ссылки
 *   npm run verify:links -- --all     — то же, но показывать и успешные адреса
 *   npm run verify:links -- --internal — проверить внутренние ссылки в dist/
 *   npm run verify:links -- --internal --all — оба режима
 *
 * Коды 403 / 429 / 503 означают, что сайт страховщика закрыт от
 * автоматических запросов (Cloudflare и подобные). Это не сломанная ссылка:
 * такие адреса помечаются как «закрыто для проверки» и требуют ручного
 * открытия в браузере.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILES = [
  'src/data/products.individual.ts',
  'src/data/products.business.ts',
];

const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const showAll = process.argv.includes('--all');
const checkInternal = process.argv.includes('--internal');
/* Мягкий режим для CI: сетевые сбои не ломают сборку, но подтверждённые
   ошибки (404/410) всё равно видны в отчёте и помечаются отдельно. */
const soft = process.argv.includes('--soft');

/** Вытаскиваем все `url: '...'` из файлов данных. */
async function collectUrls() {
  const found = new Map(); // url -> Set(файл)

  for (const rel of DATA_FILES) {
    const abs = path.join(root, rel);
    let text;
    try {
      text = await readFile(abs, 'utf8');
    } catch {
      console.warn(`! не найден файл данных: ${rel}`);
      continue;
    }

    for (const match of text.matchAll(/url:\s*'([^']+)'/g)) {
      const url = match[1].trim();
      if (!/^https?:\/\//i.test(url)) continue;
      if (!found.has(url)) found.set(url, new Set());
      found.get(url).add(path.basename(rel));
    }
  }

  return [...found.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

/** Один запрос: сначала HEAD, при отказе — GET. */
async function probe(url) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const base = {
    redirect: 'follow',
    signal,
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8',
    },
  };

  let response;
  try {
    response = await fetch(url, { ...base, method: 'HEAD' });
    // Часть сайтов отвечает на HEAD ошибкой (например nomad.kz отдаёт 500),
    // хотя обычный GET работает. Поэтому любой неуспех на HEAD перепроверяем через GET.
    if (response.status >= 400) {
      response = await fetch(url, { ...base, method: 'GET' });
    }
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? 'таймаут' : error?.message ?? 'ошибка сети';
    // Это не подтверждённая битая ссылка: сайт мог быть недоступен временно.
    return { url, ok: false, kind: 'unavailable', status: 0, note: reason };
  }

  const status = response.status;
  const finalUrl = response.url && response.url !== url ? response.url : null;

  if (status >= 200 && status < 300) {
    return { url, ok: true, kind: 'ok', status, note: finalUrl ? `→ ${finalUrl}` : '' };
  }
  if (status >= 300 && status < 400) {
    return { url, ok: true, kind: 'ok', status, note: finalUrl ? `→ ${finalUrl}` : 'редирект' };
  }
  if ([401, 403, 429, 503].includes(status)) {
    return { url, ok: true, kind: 'blocked', status, note: 'закрыто для автоматической проверки' };
  }
  const confirmed = status === 404 || status === 410;
  return {
    url,
    ok: false,
    kind: confirmed ? 'broken' : 'unavailable',
    status,
    note: confirmed ? 'страница не найдена — ссылка могла переехать' : 'сайт ответил ошибкой',
  };
}

async function runPool(items, worker, limit) {
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

/* ------------------------------------------------------------------ */
/* Внутренние ссылки: читаем dist/ и проверяем, что адрес существует.  */
/* ------------------------------------------------------------------ */

async function listHtml(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listHtml(abs)));
    else if (entry.name.endsWith('.html')) files.push(abs);
  }
  return files;
}

/** Внутренний адрес -> файл в dist, либо null, если такого файла нет. */
function resolveTarget(dist, pathname) {
  const clean = decodeURIComponent(pathname.split('#')[0].split('?')[0]);
  const rel = clean.replace(/^\/+/, '');
  if (rel === '') return path.join(dist, 'index.html');
  const candidates = rel.endsWith('/')
    ? [path.join(dist, rel, 'index.html')]
    : [path.join(dist, rel), path.join(dist, rel, 'index.html'), path.join(dist, `${rel}.html`)];
  return candidates;
}

async function checkInternalLinks() {
  const dist = path.join(root, 'dist');
  try {
    await stat(dist);
  } catch {
    console.error('Папка dist/ не найдена. Сначала выполните npm run build.');
    return 1;
  }

  const pages = await listHtml(dist);
  if (pages.length === 0) {
    console.error('В dist/ нет HTML-страниц. Сначала выполните npm run build.');
    return 1;
  }

  const broken = new Map(); // href -> Set(страница, где встретился)

  for (const page of pages) {
    const html = await readFile(page, 'utf8');
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      if (href.startsWith('/_astro/') || /\.(css|js|svg|png|jpe?g|webp|ico|woff2?|xml|txt)$/.test(href)) {
        continue;
      }

      const candidates = resolveTarget(dist, href);
      let exists = false;
      for (const candidate of candidates) {
        try {
          await stat(candidate);
          exists = true;
          break;
        } catch {
          /* пробуем следующий вариант */
        }
      }

      if (!exists) {
        const from = `/${path.relative(dist, page).replace(/index\.html$/, '')}`;
        if (!broken.has(href)) broken.set(href, new Set());
        broken.get(href).add(from || '/');
      }
    }
  }

  console.log(`Проверено ${pages.length} страниц в dist/.\n`);

  if (broken.size === 0) {
    console.log('Битых внутренних ссылок не найдено.');
    return 0;
  }

  console.log('Битые внутренние ссылки:');
  for (const [href, from] of [...broken.entries()].sort()) {
    console.log(`  ${href}`);
    console.log(`        встречается на: ${[...from].slice(0, 4).join(', ')}`);
  }
  console.log(`\nИтого: ${broken.size} проблемных адресов.`);
  return 1;
}

if (checkInternal) {
  process.exitCode = await checkInternalLinks();
} else {
  const entries = await collectUrls();

  if (entries.length === 0) {
    console.error('Не найдено ни одной внешней ссылки в файлах данных.');
    process.exit(1);
  }

  console.log(`Проверяю ${entries.length} уникальных внешних адресов…\n`);

  const results = await runPool(
    entries.map(([url, files]) => ({ url, files: [...files] })),
    async (item) => ({ ...item, ...(await probe(item.url)) }),
    CONCURRENCY
  );

  const ok = results.filter((r) => r.kind === 'ok');
  const blocked = results.filter((r) => r.kind === 'blocked');
  const unavailable = results.filter((r) => r.kind === 'unavailable');
  const broken = results.filter((r) => r.kind === 'broken');

  if (showAll) {
    for (const item of ok) {
      console.log(`  ok   ${item.status}  ${item.url}${item.note ? `  ${item.note}` : ''}`);
    }
    if (ok.length) console.log('');
  }

  if (blocked.length) {
    console.log('Закрыты для автоматической проверки (открыть вручную в браузере):');
    for (const item of blocked) {
      console.log(`  ${item.status}  ${item.url}`);
    }
    console.log('');
  }

  if (broken.length) {
    console.log('Подтверждённые битые ссылки (404/410):');
    for (const item of broken) {
      console.log(`  ${item.status}  ${item.url}`);
      console.log(`        ${item.files.join(', ')}`);
    }
    console.log('');
  }

  if (unavailable.length) {
    console.log('Проверка недоступна (сеть, таймаут или ошибка на стороне сайта):');
    for (const item of unavailable) {
      const status = item.status ? String(item.status) : '—';
      console.log(`  ${status}  ${item.url}  ${item.note}`);
    }
    console.log('');
  }

  console.log(
    `Итого: ${ok.length} в порядке, ${blocked.length} закрыто для проверки, ` +
      `${unavailable.length} недоступно, ${broken.length} подтверждённо битых.`
  );

  if (broken.length > 0) {
    console.log(
      '\nПроверьте эти адреса вручную: возможно, страница переехала — тогда обновите ' +
        'source.url и purchase.url в src/data/products.*.ts и дату checkedAt.'
    );
  }

  if (broken.length > 0 && !soft) process.exit(1);
  if (broken.length === 0 && unavailable.length === 0) {
    console.log('Битых внешних ссылок не найдено.');
  }
}
