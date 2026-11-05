import { categories } from './categories';
import { companies } from './companies';
import { publishedOffers, categoryTitle, companyName } from './products';

export interface SearchIndexItem {
  title: string;
  sub: string;
  url: string;
  type: 'Предложение' | 'Раздел' | 'Компания';
  text: string;
  terms: string[];
}

const categoryTerms: Record<string, string[]> = {
  ogpo: ['автогражданка', 'осаго', 'обязательная автостраховка', 'автогпо'],
  kasko: ['автокаско', 'страховка автомобиля', 'защита автомобиля'],
  poezdki: ['взр', 'туристическая страховка', 'медицинская страховка за границей', 'страховка путешествий'],
  kvartira: ['страхование жилья', 'страховка дома', 'домашнее имущество'],
  zdorove: ['дмс', 'медицинская страховка', 'добровольное медицинское страхование'],
  avtopark: ['корпоративное авто', 'страхование автопарка'],
  rabotniki: ['страхование сотрудников', 'несчастный случай на производстве'],
  gruzy: ['перевозка грузов', 'страхование перевозок'],
};

const publishedCategoryIds = new Set(publishedOffers.map((offer) => offer.categoryId));
const publishedCompanyIds = new Set(publishedOffers.map((offer) => offer.companyId));

/** Один источник данных для подсказок, главной и страницы полного поиска. */
export const searchIndex: SearchIndexItem[] = [
  ...categories.filter((category) => publishedCategoryIds.has(category.id)).map((category) => ({
    title: category.title,
    sub: category.audience === 'individual' ? 'Для себя' : 'Для бизнеса',
    url: category.audience === 'individual'
      ? `/dlya-sebya/${category.slug}/`
      : `/dlya-biznesa/${category.slug}/`,
    type: 'Раздел' as const,
    terms: categoryTerms[category.id] ?? [],
    text: [category.navTitle, category.short, category.lead, ...category.risks,
      ...category.whoFor, ...category.faq.flatMap(({ q, a }) => [q, a])].join(' '),
  })),
  ...companies.filter((company) => publishedCompanyIds.has(company.id)).map((company) => ({
    title: company.name,
    sub: `Страховщик · ${company.city}`,
    url: `/kompanii/${company.slug}/`,
    type: 'Компания' as const,
    terms: [company.shortName, company.legalName, company.siteLabel],
    text: [company.name, company.legalName, company.shortName, company.city,
      company.summary, ...company.facts].join(' '),
  })),
  ...publishedOffers.map((offer) => ({
    title: offer.title,
    sub: `${companyName(offer.companyId)} · ${categoryTitle(offer.categoryId)}`,
    url: `/predlozhenie/${offer.slug}/`,
    type: 'Предложение' as const,
    terms: [...(categoryTerms[offer.categoryId] ?? []),
      ...companies.filter((company) => company.id === offer.companyId).flatMap((company) => [company.shortName, company.legalName, company.siteLabel]),
      ...(offer.searchTerms ?? [])],
    text: [offer.title, offer.tagline, offer.description, ...offer.coverage,
      ...(offer.features ?? []), ...offer.limits, ...offer.exclusions,
      ...offer.documents, ...(offer.searchTerms ?? [])].join(' '),
  })),
];

export const searchSuggestions = searchIndex.map(({ title, sub, url, type, terms }) => ({ title, sub, url, type, terms }));
