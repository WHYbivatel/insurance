import type { Audience } from './types';
import { individualOffers } from './products.individual';
import { businessOffers } from './products.business';
import { companies } from './companies';
import { categories } from './categories';
import { validateCatalogData } from './validate';
import { attachEditorialMetadata, type EditorialOffer } from './editorial';
import type { KaskoConditions, TravelConditions } from './types';

const known = (value: string | number | boolean, unit?: string) => ({ status: 'known' as const, value, ...(unit ? { unit } : {}) });
const unknown = () => ({
  status: 'unknown' as const,
  value: null,
  note: 'В данных каталога не указано. Уточните условие у страховщика до оформления.',
});

const noKaskoDetails = (): KaskoConditions => ({
  amountLimit: unknown(), deductible: unknown(), vehicleAge: unknown(), territory: unknown(),
});
const noTravelDetails = (): TravelConditions => ({
  medicalLimit: unknown(), ageLimit: unknown(), tripDuration: unknown(),
  deductible: unknown(), territory: unknown(), covidCoverage: unknown(),
});

const structuredConditions: Record<string, { kasko: KaskoConditions } | { travel: TravelConditions }> = {
  'kasko-nomad-transformer': { kasko: noKaskoDetails() },
  'kasko-eurasia-smartcasco': { kasko: {
    amountLimit: known('YES: 500 000 или 1 000 000; STANDART: 2 800 000–120 000 000; VIP: 15 000 000–120 000 000', '₸'),
    deductible: known('YES: 5%; STANDART и VIP: 1% при повреждении, 10% при полной гибели или угоне', '% страховой суммы'),
    vehicleAge: known('VIP — до 15 лет; YES и STANDART — для всех годов выпуска'),
    territory: known('YES — Казахстан; STANDART и VIP — весь мир'),
  } },
  'kasko-amanat': { kasko: noKaskoDetails() },
  'kasko-centras': { kasko: noKaskoDetails() },
  'mini-kasko-centras': { kasko: {
    amountLimit: known(500_000, '₸ — максимальный лимит выплаты'),
    deductible: unknown(), vehicleAge: unknown(), territory: unknown(),
  } },
  'auto-kasko-nomad-jur': { kasko: {
    amountLimit: known('Стоимость автомобиля: 11 000–35 000', '$'),
    deductible: known('Повреждение: 0–2%; полная гибель и кража: 10%; при тарифе 6% за пределами РК: 35%', '% страховой суммы'),
    vehicleAge: known('Автомобили старше 16 лет не принимаются', 'лет'),
    territory: unknown(),
  } },
  'travel-nomad-standard': { travel: {
    ...noTravelDetails(), medicalLimit: known(50_000, '€ или $'),
    tripDuration: known('Госпитализация — до 5 суток', 'суток'),
  } },
  'travel-nomad-premium': { travel: {
    ...noTravelDetails(), medicalLimit: known(100_000, '€ или $'),
    tripDuration: known('Госпитализация — до 10 суток', 'суток'),
  } },
  'travel-eurasia': { travel: {
    ...noTravelDetails(),
    ageLimit: known('До 75 лет; для возраста 65–75 лет тариф увеличивается на 100%; детям до 1 года — на 50%'),
  } },
  'travel-amanat': { travel: {
    ...noTravelDetails(), medicalLimit: known(100_000, '€'),
  } },
  'travel-freedom': { travel: {
    ...noTravelDetails(),
    tripDuration: known('Любой срок по условиям программы'),
    territory: known('Любая страна по условиям программы'),
    covidCoverage: known('Условия и лимит зависят от выбранной программы; по правилам действуют ограничения по сроку страховой защиты'),
  } },
  'travel-halyk-life-doroga': { travel: {
    ...noTravelDetails(), ageLimit: known(80, 'лет'),
    territory: known('СНГ — до 30 000 USD; Европа и Шенген — до 50 000 EUR; весь мир, кроме исключённых зон — до 100 000 USD'),
  } },
};

const offersWithConditions = [...individualOffers, ...businessOffers].map((offer) => ({
  ...offer,
  ...(structuredConditions[offer.slug] ? { conditions: structuredConditions[offer.slug] } : {}),
}));

export const allOffers: EditorialOffer[] = attachEditorialMetadata(offersWithConditions);

const validationErrors = validateCatalogData(allOffers, companies, categories);
if (validationErrors.length > 0) {
  throw new Error(`Ошибка проверки каталога:\n- ${validationErrors.join('\n- ')}`);
}

export const publishedOffers = allOffers.filter((o) => o.status === 'published');

export const offersByAudience = (audience: Audience) =>
  publishedOffers.filter((o) => o.audience === audience);

export const offersByCategory = (audience: Audience, categoryId: string) =>
  publishedOffers.filter((o) => o.audience === audience && o.categoryId === categoryId);

export const offersByCompany = (companyId: string) =>
  publishedOffers.filter((o) => o.companyId === companyId);

export const offerBySlug = (slug: string) => publishedOffers.find((o) => o.slug === slug);

export const featuredOffers = (audience: Audience, limit = 3) =>
  offersByAudience(audience)
    .filter((o) => o.featured)
    .slice(0, limit);

export const companyName = (id: string) =>
  companies.find((c) => c.id === id)?.name ?? 'Страховщик';

export const categoryTitle = (id: string) =>
  categories.find((c) => c.id === id)?.navTitle ?? 'Страхование';

export const audienceCount = (audience: Audience) => offersByAudience(audience).length;

export const countByCompany = (audience: Audience) => {
  const map = new Map<string, number>();
  for (const offer of offersByAudience(audience)) {
    map.set(offer.companyId, (map.get(offer.companyId) ?? 0) + 1);
  }
  return map;
};
