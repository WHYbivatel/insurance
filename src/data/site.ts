import type { Audience } from './types';

export const site = {
  name: 'Полис',
  tagline: 'страхование в Казахстане',
  description:
    'Каталог страхования Казахстана: объяснения видов страхования, проверенные предложения страховых компаний и переход к оформлению у страховщика.',
  url: import.meta.env.PUBLIC_SITE_URL ?? 'https://polis.kz',
  locale: 'ru_KZ',
  language: 'ru',
  updatedAt: '2026-10-23',
  disclaimer:
    'Сервис не является страховщиком и не заключает договоры страхования. Оформление, оплата и урегулирование происходят у страховой компании. Итоговые условия определяет договор страховщика.',
};

export const audienceLabels: Record<Audience, { short: string; title: string; path: string }> = {
  individual: { short: 'Для себя', title: 'Для себя', path: '/dlya-sebya/' },
  business: { short: 'Для бизнеса', title: 'Для бизнеса', path: '/dlya-biznesa/' },
};
