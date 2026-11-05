import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCatalogData } from '../src/data/validate.ts';
import { attachEditorialMetadata, nextSourceReviewDate } from '../src/data/editorial.ts';

const company = {
  id: 'company-a',
  slug: 'company-a',
  name: 'Компания A',
  legalName: 'АО «Компания A»',
  shortName: 'A',
  site: 'https://example.kz/',
  siteLabel: 'example.kz',
  city: 'Алматы',
  summary: 'Описание компании.',
  facts: ['Факт из источника.'],
  accent: '#123456',
  logo: {
    mark: '/assets/mark.svg',
    markWidth: 100,
    markHeight: 100,
    sourceUrl: 'https://example.kz/',
    fetchedAt: '2026-01-01',
  },
};

const category = {
  id: 'category-a',
  slug: 'category-a',
  audience: 'individual',
  title: 'Категория A',
  navTitle: 'A',
  group: 'general',
  groupTitle: 'Общее',
  short: 'Кратко о категории.',
  lead: 'Описание категории.',
  icon: 'info',
  tint: 'sage',
  whoFor: ['Для владельцев полиса.'],
  obligation: { status: 'voluntary', label: 'Добровольно', text: 'Оформляется по желанию.' },
  risks: ['Риск по условиям договора.'],
  differences: [],
  faq: [],
  related: [],
};

const offer = {
  id: 'offer-a',
  slug: 'offer-a',
  title: 'Предложение A',
  companyId: company.id,
  audience: 'individual',
  categoryId: category.id,
  tagline: 'Краткое описание.',
  description: 'Описание предложения.',
  coverage: ['Риск A.'],
  exclusions: ['Исключение A.'],
  limits: ['Лимит по договору.'],
  obligation: { status: 'voluntary', label: 'Добровольно', text: 'Оформляется по желанию.' },
  purchase: {
    method: 'online',
    label: 'Сайт страховщика',
    ctaLabel: 'Оформить',
    url: 'https://example.kz/buy',
    note: 'Оформление онлайн.',
  },
  price: { kind: 'individual', text: 'Стоимость рассчитывается индивидуально' },
  documents: ['Данные страхователя.'],
  source: { label: 'Официальная страница', url: 'https://example.kz/product' },
  checkedAt: '2026-01-01',
  status: 'published',
};

test('валидные записи каталога проходят проверку', () => {
  assert.deepEqual(validateCatalogData([offer], [company], [category]), []);
});

test('ошибки указывают запись и поле с некорректным значением', () => {
  const broken = {
    ...offer,
    slug: 'Bad slug',
    companyId: 'missing-company',
    checkedAt: '2026-02-30',
    purchase: { ...offer.purchase, url: 'javascript:alert(1)' },
  };
  const errors = validateCatalogData([broken], [company], [category]).join('\n');

  assert.match(errors, /Предложение offer-a: некорректный slug/);
  assert.match(errors, /неизвестная компания «missing-company»/);
  assert.match(errors, /некорректная дата checkedAt/);
  assert.match(errors, /некорректный purchase\.url/);
});

test('неизвестные методы и URL с учётными данными отклоняются', () => {
  const broken = {
    ...offer,
    purchase: { ...offer.purchase, method: 'messenger', url: 'https://user:pass@example.kz/buy' },
  };
  const errors = validateCatalogData([broken], [company], [category]).join('\n');

  assert.match(errors, /неизвестный способ оформления «messenger»/);
  assert.match(errors, /некорректный purchase\.url/);
});

test('повторяющиеся slug и отсутствующая связанная категория выявляются', () => {
  const secondOffer = { ...offer, id: 'offer-b', slug: offer.slug };
  const relatedCategory = { ...category, related: ['unknown-category'] };
  const errors = validateCatalogData([offer, secondOffer], [company], [relatedCategory]).join('\n');

  assert.match(errors, /Предложение slug: повторяется «offer-a»/);
  assert.match(errors, /Категория category-a: неизвестная связанная категория «unknown-category»/);
});

test('пустые поля и некорректные даты компании выдают понятные ошибки', () => {
  const brokenCompany = {
    ...company,
    summary: '   ',
    logo: { ...company.logo, fetchedAt: '2026-13-01', markWidth: 0 },
  };
  const errors = validateCatalogData([offer], [brokenCompany], [category]).join('\n');

  assert.match(errors, /Компания company-a: summary/);
  assert.match(errors, /некорректная дата logo\.fetchedAt/);
  assert.match(errors, /размеры логотипа должны быть положительными/);
});

test('редакционный статус и срок проверки рассчитываются по checkedAt без выдуманной даты правки', () => {
  assert.equal(nextSourceReviewDate('2026-10-23'), '2027-01-21');
  assert.equal(nextSourceReviewDate('2026-02-30'), '');

  const checkedInOctober = { ...offer, checkedAt: '2026-10-23' };
  const scheduled = attachEditorialMetadata([checkedInOctober], new Date('2027-01-20T23:00:00Z'))[0];
  assert.equal(scheduled.editorial.sourceCheckedAt, checkedInOctober.checkedAt);
  assert.equal(scheduled.editorial.nextReviewAt, '2027-01-21');
  assert.equal(scheduled.editorial.reviewStatus, 'scheduled');
  assert.equal(scheduled.editorial.visibility, 'public');
  assert.equal(scheduled.editorial.contentModifiedAt, undefined);

  const due = attachEditorialMetadata([checkedInOctober], new Date('2027-01-21T00:00:00Z'))[0];
  assert.equal(due.editorial.reviewStatus, 'due');

  const draft = attachEditorialMetadata([{ ...offer, status: 'draft' }], new Date('2026-11-05T00:00:00Z'))[0];
  assert.equal(draft.editorial.visibility, 'internal');
  assert.deepEqual(validateCatalogData([scheduled], [company], [category]), []);
});

test('публичные и внутренние заметки опциональны и проходят проверку', () => {
  const reviewed = attachEditorialMetadata([offer], new Date('2026-11-05T00:00:00Z'))[0];
  const withPublicNote = { ...reviewed, editorial: { ...reviewed.editorial, notes: { public: 'Условия могут меняться.' } } };
  assert.deepEqual(validateCatalogData([withPublicNote], [company], [category]), []);

  const withInternalNote = { ...reviewed, editorial: { ...reviewed.editorial, notes: { internal: 'Проверить источник повторно.' } } };
  assert.deepEqual(validateCatalogData([withInternalNote], [company], [category]), []);
});

test('особенности продукта сохраняются отдельным непустым списком', () => {
  const withFeatures = { ...offer, features: ['Полис доступен в личном кабинете.'] };
  assert.deepEqual(validateCatalogData([withFeatures], [company], [category]), []);

  const withoutFeatures = { ...offer, features: ['  '] };
  assert.match(validateCatalogData([withoutFeatures], [company], [category]).join('\n'), /features\[0\]/);
});

test('валидатор выявляет несоответствие редакционных дат и срока проверки', () => {
  const reviewed = attachEditorialMetadata([offer], new Date('2026-11-05T00:00:00Z'))[0];
  const broken = {
    ...reviewed,
    editorial: { ...reviewed.editorial, sourceCheckedAt: '2026-10-22', nextReviewAt: '2027-04-01' },
  };
  const errors = validateCatalogData([broken], [company], [category]).join('\n');
  assert.match(errors, /sourceCheckedAt должен совпадать с checkedAt/);
  assert.match(errors, /nextReviewAt должен быть через 90 дней/);
});

test('для КАСКО и поездок обязательны все структурированные условия, неизвестное значение явно помечено', () => {
  const kaskoCategory = { ...category, id: 'kasko', slug: 'kasko' };
  const missing = { ...offer, categoryId: 'kasko' };
  assert.match(validateCatalogData([missing], [company], [kaskoCategory]).join('\n'), /обязательны структурированные условия/);

  const unknownField = {
    status: 'unknown', value: null, note: 'Уточните у страховщика.',
  };
  const withKasko = {
    ...missing,
    conditions: { kasko: {
      amountLimit: unknownField, deductible: unknownField, vehicleAge: unknownField, territory: unknownField,
    } },
  };
  assert.deepEqual(validateCatalogData([withKasko], [company], [kaskoCategory]), []);

  const malformed = {
    ...withKasko,
    conditions: { kasko: { ...withKasko.conditions.kasko, deductible: { status: 'unknown', value: 5 } } },
  };
  const errors = validateCatalogData([malformed], [company], [kaskoCategory]).join('\n');
  assert.match(errors, /неизвестное значение должно быть null/);
  assert.match(errors, /для неизвестного значения требуется пояснение/);
});
