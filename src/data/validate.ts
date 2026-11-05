import type { Category, Company, Offer, StructuredCondition } from './types';
import { nextSourceReviewDate } from './editorial.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function checkText(errors: string[], label: string, value: unknown): void {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${label}: поле обязательно и не должно быть пустым`);
}

function checkTextList(errors: string[], label: string, value: unknown, required: boolean): void {
  if (!Array.isArray(value)) {
    errors.push(`${label}: ожидается список строк`);
    return;
  }
  if (required && value.length === 0) errors.push(`${label}: список не должен быть пустым`);
  value.forEach((item, index) => checkText(errors, `${label}[${index}]`, item));
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/** Проверяет смысловую целостность редакционных данных перед генерацией страниц. */
export function validateCatalogData(
  offers: Offer[],
  companies: Company[],
  categories: Category[],
): string[] {
  const errors: string[] = [];
  const checkUnique = (label: string, values: string[]) => {
    for (const value of duplicates(values)) errors.push(`${label}: повторяется «${value}»`);
  };
  const checkSlugs = (entity: string, values: Array<{ id: string; slug: string }>) => {
    for (const row of values) {
      if (!SLUG_PATTERN.test(row.id)) errors.push(`${entity} ${row.id}: ID должен состоять из латинских букв, цифр и дефисов`);
      if (!SLUG_PATTERN.test(row.slug)) errors.push(`${entity} ${row.id}: некорректный slug «${row.slug}»`);
    }
  };

  checkUnique('Компания ID', companies.map((company) => company.id));
  checkUnique('Компания slug', companies.map((company) => company.slug));
  checkUnique('Категория ID', categories.map((category) => category.id));
  checkUnique('Категория slug', categories.map((category) => category.slug));
  checkUnique('Предложение ID', offers.map((offer) => offer.id));
  checkUnique('Предложение slug', offers.map((offer) => offer.slug));
  checkSlugs('Компания', companies);
  checkSlugs('Категория', categories);
  checkSlugs('Предложение', offers);

  const companyIds = new Set(companies.map((company) => company.id));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

  for (const company of companies) {
    for (const [field, value] of [
      ['name', company.name], ['legalName', company.legalName], ['shortName', company.shortName],
      ['siteLabel', company.siteLabel], ['city', company.city], ['summary', company.summary], ['accent', company.accent],
      ['logo.mark', company.logo.mark],
    ] as const) checkText(errors, `Компания ${company.id}: ${field}`, value);
    checkTextList(errors, `Компания ${company.id}: facts`, company.facts, true);
    if (!validHttpUrl(company.site)) errors.push(`Компания ${company.id}: некорректный site URL «${company.site}»`);
    if (!validHttpUrl(company.logo.sourceUrl)) errors.push(`Компания ${company.id}: некорректный logo.sourceUrl`);
    if (!validDate(company.logo.fetchedAt)) errors.push(`Компания ${company.id}: некорректная дата logo.fetchedAt «${company.logo.fetchedAt}»`);
    if (!Number.isFinite(company.logo.markWidth) || !Number.isFinite(company.logo.markHeight) || company.logo.markWidth <= 0 || company.logo.markHeight <= 0) {
      errors.push(`Компания ${company.id}: размеры логотипа должны быть положительными`);
    }
    if (company.logo.lockup && (!company.logo.lockupWidth || !company.logo.lockupHeight || company.logo.lockupWidth <= 0 || company.logo.lockupHeight <= 0)) {
      errors.push(`Компания ${company.id}: для lockup нужны положительные размеры`);
    }
    if (company.logo.lockup) checkText(errors, `Компания ${company.id}: logo.lockup`, company.logo.lockup);
  }

  for (const category of categories) {
    for (const [field, value] of [
      ['title', category.title], ['navTitle', category.navTitle], ['group', category.group],
      ['groupTitle', category.groupTitle], ['short', category.short], ['lead', category.lead],
      ['obligation.label', category.obligation.label], ['obligation.text', category.obligation.text],
    ] as const) checkText(errors, `Категория ${category.id}: ${field}`, value);
    checkTextList(errors, `Категория ${category.id}: whoFor`, category.whoFor, true);
    checkTextList(errors, `Категория ${category.id}: risks`, category.risks, true);
    if (!['individual', 'business'].includes(category.audience)) errors.push(`Категория ${category.id}: неизвестная аудитория «${category.audience}»`);
    if (!['required', 'voluntary', 'conditional'].includes(category.obligation.status)) {
      errors.push(`Категория ${category.id}: неизвестный статус обязательности «${category.obligation.status}»`);
    }
    checkUnique(`Категория ${category.id} related`, category.related);
    for (const slug of category.related) {
      const related = categoryBySlug.get(slug);
      if (!related) errors.push(`Категория ${category.id}: неизвестная связанная категория «${slug}»`);
      else if (related.audience !== category.audience) {
        errors.push(`Категория ${category.id}: связанная категория «${slug}» относится к другой аудитории`);
      }
    }
  }

  for (const offer of offers) {
    const category = categoryById.get(offer.categoryId);
    if (!companyIds.has(offer.companyId)) errors.push(`Предложение ${offer.id}: неизвестная компания «${offer.companyId}»`);
    if (!category) errors.push(`Предложение ${offer.id}: неизвестная категория «${offer.categoryId}»`);
    else if (category.audience !== offer.audience) {
      errors.push(`Предложение ${offer.id}: аудитория не совпадает с категорией «${category.slug}»`);
    }
    const conditionKind = offer.categoryId === 'kasko' ? 'kasko' : offer.categoryId === 'poezdki' ? 'travel' : undefined;
    if (conditionKind) {
      const conditions = conditionKind === 'kasko'
        ? (offer.conditions && 'kasko' in offer.conditions ? offer.conditions.kasko : undefined)
        : (offer.conditions && 'travel' in offer.conditions ? offer.conditions.travel : undefined);
      if (!conditions) errors.push(`Предложение ${offer.id}: для категории «${conditionKind}» обязательны структурированные условия`);
      else {
        const requiredFields = conditionKind === 'kasko'
          ? ['amountLimit', 'deductible', 'vehicleAge', 'territory']
          : ['medicalLimit', 'ageLimit', 'tripDuration', 'deductible', 'territory', 'covidCoverage'];
        for (const field of requiredFields) {
          if (!(field in conditions)) errors.push(`Предложение ${offer.id}: отсутствует conditions.${conditionKind}.${field}`);
        }
        for (const [field, condition] of Object.entries(conditions) as [string, StructuredCondition][]) {
          const label = `Предложение ${offer.id}: conditions.${conditionKind}.${field}`;
          if (!condition || !['known', 'unknown'].includes(condition.status)) {
            errors.push(`${label}: статус должен быть known или unknown`);
            continue;
          }
          if (condition.status === 'unknown' && condition.value !== null) errors.push(`${label}: неизвестное значение должно быть null`);
          if (condition.status === 'unknown' && !condition.note?.trim()) errors.push(`${label}: для неизвестного значения требуется пояснение`);
          if (condition.status === 'known' && (condition.value === null || condition.value === undefined || condition.value === '')) {
            errors.push(`${label}: известное условие должно содержать значение`);
          }
          if (condition.unit !== undefined) checkText(errors, `${label}.unit`, condition.unit);
        }
      }
    }
    if (!validDate(offer.checkedAt)) errors.push(`Предложение ${offer.id}: некорректная дата checkedAt «${offer.checkedAt}»`);
    if (!validHttpUrl(offer.purchase.url)) errors.push(`Предложение ${offer.id}: некорректный purchase.url`);
    if (!validHttpUrl(offer.source.url)) errors.push(`Предложение ${offer.id}: некорректный source.url`);
    if (!['individual', 'business'].includes(offer.audience)) errors.push(`Предложение ${offer.id}: неизвестная аудитория «${offer.audience}»`);
    if (!['online', 'request', 'office', 'partner'].includes(offer.purchase.method)) {
      errors.push(`Предложение ${offer.id}: неизвестный способ оформления «${offer.purchase.method}»`);
    }
    if (!['required', 'voluntary', 'conditional'].includes(offer.obligation.status)) {
      errors.push(`Предложение ${offer.id}: неизвестный статус обязательности «${offer.obligation.status}»`);
    }
    for (const [label, value] of [
      ['title', offer.title],
      ['tagline', offer.tagline],
      ['description', offer.description],
      ['price.text', offer.price.text],
      ['price.note', offer.price.note],
      ['purchase.label', offer.purchase.label],
      ['purchase.ctaLabel', offer.purchase.ctaLabel],
      ['purchase.note', offer.purchase.note],
      ['source.label', offer.source.label],
      ['obligation.label', offer.obligation.label],
      ['obligation.text', offer.obligation.text],
    ]) {
      if (value !== undefined) checkText(errors, `Предложение ${offer.id}: ${label}`, value);
    }
    for (const [label, values] of [
      ['coverage', offer.coverage],
      ['exclusions', offer.exclusions],
      ['limits', offer.limits],
      ['documents', offer.documents],
    ] as const) checkTextList(errors, `Предложение ${offer.id}: ${label}`, values, true);
    if (offer.features !== undefined) checkTextList(errors, `Предложение ${offer.id}: features`, offer.features, true);
    if (!['published', 'draft', 'archived'].includes(offer.status)) {
      errors.push(`Предложение ${offer.id}: неизвестный статус «${offer.status}»`);
    }
    if (offer.editorial) {
      const expectedVisibility = offer.status === 'published' ? 'public' : 'internal';
      if (offer.editorial.visibility !== expectedVisibility) {
        errors.push(`Предложение ${offer.id}: editorial.visibility должен быть «${expectedVisibility}» для статуса «${offer.status}»`);
      }
      if (!validDate(offer.editorial.sourceCheckedAt) || offer.editorial.sourceCheckedAt !== offer.checkedAt) {
        errors.push(`Предложение ${offer.id}: editorial.sourceCheckedAt должен совпадать с checkedAt`);
      }
      const expectedNextReviewAt = nextSourceReviewDate(offer.checkedAt);
      if (!validDate(offer.editorial.nextReviewAt) || offer.editorial.nextReviewAt !== expectedNextReviewAt) {
        errors.push(`Предложение ${offer.id}: editorial.nextReviewAt должен быть через 90 дней после checkedAt`);
      }
      if (!['scheduled', 'due'].includes(offer.editorial.reviewStatus)) {
        errors.push(`Предложение ${offer.id}: неизвестный статус проверки источника «${offer.editorial.reviewStatus}»`);
      }
      const expectedReviewStatus = expectedNextReviewAt && new Date().toISOString().slice(0, 10) < expectedNextReviewAt
        ? 'scheduled'
        : 'due';
      if (offer.editorial.reviewStatus !== expectedReviewStatus) {
        errors.push(`Предложение ${offer.id}: статус проверки должен быть «${expectedReviewStatus}» по сроку следующей проверки`);
      }
      if (offer.editorial.contentModifiedAt !== undefined && !validDate(offer.editorial.contentModifiedAt)) {
        errors.push(`Предложение ${offer.id}: некорректная дата editorial.contentModifiedAt`);
      }
      if (offer.editorial.notes) {
        if (offer.editorial.notes.public !== undefined) checkText(errors, `Предложение ${offer.id}: editorial.notes.public`, offer.editorial.notes.public);
        if (offer.editorial.notes.internal !== undefined) checkText(errors, `Предложение ${offer.id}: editorial.notes.internal`, offer.editorial.notes.internal);
      }
    }
    if (!['from', 'range', 'individual', 'calculated'].includes(offer.price.kind)) {
      errors.push(`Предложение ${offer.id}: неизвестный тип цены «${offer.price.kind}»`);
    }
  }

  return errors;
}
