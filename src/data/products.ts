import type { Audience, Offer } from './types';
import { individualOffers } from './products.individual';
import { businessOffers } from './products.business';
import { companies } from './companies';
import { categories } from './categories';

export const allOffers: Offer[] = [...individualOffers, ...businessOffers];

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
