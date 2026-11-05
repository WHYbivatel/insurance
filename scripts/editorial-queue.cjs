#!/usr/bin/env node
// @ts-nocheck
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const DAY = 86_400_000;

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function buildEditorialQueue(offers, today, windowDays = 30) {
  if (!validDate(today)) throw new Error(`Некорректная дата --as-of: ${today}`);
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  return offers.filter((offer) => offer.status === 'published').map((offer) => {
    const next = validDate(offer.editorial?.nextReviewAt ?? '') ? offer.editorial.nextReviewAt : '';
    const daysUntilReview = next ? Math.ceil((Date.parse(`${next}T00:00:00.000Z`) - todayMs) / DAY) : null;
    const unknownConditions = [];
    if (offer.conditions) {
      for (const [group, fields] of Object.entries(offer.conditions)) {
        for (const [field, value] of Object.entries(fields ?? {})) {
          if (value?.status === 'unknown') unknownConditions.push(`${group}.${field}`);
        }
      }
    }
    const reasons = [];
    if (!next) reasons.push('Нет корректного срока следующей проверки');
    else if (daysUntilReview < 0) reasons.push(`Срок проверки просрочен на ${Math.abs(daysUntilReview)} дн.`);
    else if (daysUntilReview <= windowDays) reasons.push(`Плановая проверка через ${daysUntilReview} дн.`);
    if (unknownConditions.length) reasons.push(`Нужно проверить неизвестные условия (${unknownConditions.length})`);
    if (offer.editorial?.notes?.internal) reasons.push('Есть внутренняя редакционная заметка');
    if (!offer.source?.url || !offer.source?.label) reasons.push('Не заполнены подпись или URL первоисточника');
    return {
      id: offer.id, slug: offer.slug, title: offer.title, categoryId: offer.categoryId,
      source: offer.source, sourceCheckedAt: offer.checkedAt, nextReviewAt: next,
      daysUntilReview, unknownConditions, reasons,
      internalNote: offer.editorial?.notes?.internal ?? null,
      technicalLinkStatus: 'not checked by this report',
      contentStatus: 'requires manual comparison with the current official source',
    };
  }).filter((item) => item.reasons.length)
    .sort((a, b) => (a.daysUntilReview ?? -Infinity) - (b.daysUntilReview ?? -Infinity)
      || a.categoryId.localeCompare(b.categoryId) || a.title.localeCompare(b.title, 'ru'));
}

function loadOffers() {
  require.extensions['.ts'] = (module, filename) => {
    const source = readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    module._compile(output, filename);
  };
  for (const ext of ['.svg', '.png', '.webp']) {
    require.extensions[ext] = (module, filename) => {
    const bytes = readFileSync(filename);
    let width = 0; let height = 0;
    if (ext === '.png' && bytes.toString('hex', 0, 8) === '89504e470d0a1a0a') {
      width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
    } else if (ext === '.svg') {
      const svg = bytes.toString('utf8');
      const viewBox = svg.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)/i);
      width = Number(svg.match(/\bwidth=["']([\d.]+)/i)?.[1] ?? viewBox?.[1] ?? 0);
      height = Number(svg.match(/\bheight=["']([\d.]+)/i)?.[1] ?? viewBox?.[2] ?? 0);
    } else if (ext === '.webp') {
      const match = bytes.toString('ascii').match(/VP8X[\s\S]{4}([\s\S]{3})([\s\S]{3})/);
      if (match) { width = 1 + match[1].charCodeAt(0) + (match[1].charCodeAt(1) << 8) + (match[1].charCodeAt(2) << 16); height = 1 + match[2].charCodeAt(0) + (match[2].charCodeAt(1) << 8) + (match[2].charCodeAt(2) << 16); }
    }
    module.exports = { default: { src: filename, width, height }, src: filename, width, height };
    };
  }
  return require('../src/data/products.ts').publishedOffers;
}

function main() {
  const asOfArg = process.argv.find((arg) => arg.startsWith('--as-of='));
  const today = asOfArg?.slice('--as-of='.length) ?? new Date().toISOString().slice(0, 10);
  if (!validDate(today)) {
    throw new Error(`Некорректная дата --as-of: ${today}`);
  }
  const queue = buildEditorialQueue(loadOffers(), today);
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ generatedAt: today, publishedOffers: loadOffers().length, queue }, null, 2)}\n`);
    return;
  }
  console.log(`Очередь редакционной проверки на ${today}`);
  console.log(`В очереди: ${queue.length} из ${loadOffers().length} опубликованных предложений.\n`);
  for (const item of queue) {
    const timing = item.daysUntilReview === null ? 'нет срока' : item.daysUntilReview < 0 ? `просрочено ${-item.daysUntilReview} дн.` : `через ${item.daysUntilReview} дн.`;
    console.log(`- [${timing}] ${item.title} (${item.categoryId}; ${item.slug})`);
    console.log(`  Проверено: ${item.sourceCheckedAt}; далее: ${item.nextReviewAt || 'не задано'}`);
    for (const reason of item.reasons) console.log(`  Причина: ${reason}`);
    if (item.internalNote) console.log(`  Заметка редактора: ${item.internalNote}`);
    if (item.unknownConditions.length) console.log(`  Неизвестно: ${item.unknownConditions.join(', ')}`);
    console.log(`  Источник: ${item.source?.url ?? 'НЕ УКАЗАН'}`);
  }
  console.log('\nОтдельно: npm run verify:links проверяет доступность URL. Это не подтверждает актуальность условий; их нужно сверять вручную с первоисточником.');
}

module.exports = { buildEditorialQueue };
if (require.main === module) main();
