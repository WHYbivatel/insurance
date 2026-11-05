import type { Offer, OfferEditorialMetadata } from './types';

/** Срок плановой проверки источника: 90 дней после последней подтверждённой проверки. */
export const SOURCE_REVIEW_INTERVAL_DAYS = 90;

export type EditorialOffer = Offer & { editorial: OfferEditorialMetadata };

export function nextSourceReviewDate(checkedAt: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) return '';
  const date = new Date(`${checkedAt}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== checkedAt) return '';
  date.setUTCDate(date.getUTCDate() + SOURCE_REVIEW_INTERVAL_DAYS);
  return date.toISOString().slice(0, 10);
}

/** Добавляет редакционные поля, не подменяя неизвестную дату изменения контента. */
export function attachEditorialMetadata(offers: Offer[], now = new Date()): EditorialOffer[] {
  const today = now.toISOString().slice(0, 10);
  return offers.map((offer) => {
    const nextReviewAt = nextSourceReviewDate(offer.checkedAt);
    return {
      ...offer,
      editorial: {
        visibility: offer.status === 'published' ? 'public' : 'internal',
        reviewStatus: nextReviewAt && today < nextReviewAt ? 'scheduled' : 'due',
        sourceCheckedAt: offer.checkedAt,
        nextReviewAt,
      },
    };
  });
}
