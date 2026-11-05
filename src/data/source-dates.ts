import { publishedOffers } from './products';

const dates = publishedOffers.map((offer) => offer.checkedAt).sort();
const format = (date: string) => new Date(`${date}T00:00:00.000Z`).toLocaleDateString('ru-RU', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

export const sourceDateRangeLabel = dates.length
  ? dates[0] === dates.at(-1)
    ? format(dates[0])
    : `${format(dates[0])} — ${format(dates.at(-1)!)}`
  : 'Пока нет проверенных предложений';
