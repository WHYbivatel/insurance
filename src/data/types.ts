import type { IconName } from '../lib/icons';

export type Audience = 'individual' | 'business';

export type PurchaseMethod = 'online' | 'request' | 'office' | 'partner';

/** Условие: значение указано в каталоге либо пока неизвестно. Неизвестное не означает отсутствие покрытия. */
export interface StructuredCondition {
  status: 'known' | 'unknown';
  value: string | number | boolean | null;
  unit?: string;
  note?: string;
}

export interface KaskoConditions {
  amountLimit: StructuredCondition;
  deductible: StructuredCondition;
  vehicleAge: StructuredCondition;
  territory: StructuredCondition;
}

export interface TravelConditions {
  medicalLimit: StructuredCondition;
  ageLimit: StructuredCondition;
  tripDuration: StructuredCondition;
  deductible: StructuredCondition;
  territory: StructuredCondition;
  covidCoverage: StructuredCondition;
}

export type OfferConditions = { kasko: KaskoConditions } | { travel: TravelConditions };

/**
 * Обязательность конкретного предложения.
 * Категория может содержать и обязательные, и добровольные продукты,
 * поэтому статус задаётся у оффера, а не у категории.
 */
export type ObligationStatus = 'required' | 'voluntary' | 'conditional';

export interface OfferObligation {
  status: ObligationStatus;
  /** Короткая метка для бейджа. */
  label: string;
  /** Объяснение простыми словами. */
  text: string;
  /** Условие применения, если обязательность зависит от деятельности клиента. */
  condition?: string;
}

/**
 * Логотип страховщика.
 * mark — знак для компактного отображения, lockup — полный логотип с названием.
 * Все файлы лежат локально в src/assets/logos и получают хеш в имени при сборке.
 */
export interface CompanyLogo {
  /** Знак компании (квадратный или вертикальный). */
  mark: string;
  /** Ширина и высота исходного файла — нужны, чтобы сохранить пропорции. */
  markWidth: number;
  markHeight: number;
  /** Полный логотип, если официальный файл удалось получить. */
  lockup?: string;
  lockupWidth?: number;
  lockupHeight?: number;
  /** Страница, с которой получен файл. */
  sourceUrl: string;
  /** Дата получения файла, YYYY-MM-DD. */
  fetchedAt: string;
  /** Ограничение или уточнение по файлу. */
  note?: string;
}

export interface Company {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  shortName: string;
  site: string;
  siteLabel: string;
  city: string;
  summary: string;
  facts: string[];
  note?: string;
  accent: string;
  logo: CompanyLogo;
}

export interface Category {
  id: string;
  slug: string;
  audience: Audience;
  title: string;
  navTitle: string;
  group: string;
  groupTitle: string;
  short: string;
  lead: string;
  icon: IconName;
  tint: string;
  whoFor: string[];
  /** Общее описание обязательности категории — не заменяет статус оффера. */
  obligation: {
    status: ObligationStatus;
    label: string;
    text: string;
  };
  risks: string[];
  differences: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  related: string[];
}

export interface Offer {
  id: string;
  slug: string;
  title: string;
  companyId: string;
  audience: Audience;
  categoryId: string;
  tagline: string;
  description: string;
  /** Сервисные возможности и другие свойства продукта; не перечень застрахованных рисков. */
  features?: string[];
  /** Структурированные условия для КАСКО и страхования поездок. */
  conditions?: OfferConditions;
  coverage: string[];
  exclusions: string[];
  limits: string[];
  obligation: OfferObligation;
  purchase: {
    method: PurchaseMethod;
    label: string;
    ctaLabel: string;
    url: string;
    note: string;
  };
  price: {
    kind: 'from' | 'range' | 'individual' | 'calculated';
    text: string;
    note?: string;
  };
  documents: string[];
  source: { label: string; url: string };
  checkedAt: string;
  /** Редакционные метаданные вычисляются при загрузке каталога и не публикуются в карточке. */
  editorial?: OfferEditorialMetadata;
  status: 'published' | 'draft' | 'archived';
  featured?: boolean;
  badge?: string;
  searchTerms?: string[];
}

export interface OfferEditorialMetadata {
  /** published становится публичным, draft/archived остаются во внутреннем каталоге. */
  visibility: 'public' | 'internal';
  /** Источник проверен и срок следующей проверки ещё не наступил либо уже наступил. */
  reviewStatus: 'scheduled' | 'due';
  sourceCheckedAt: string;
  nextReviewAt: string;
  /** Указываем только при наличии достоверной истории редакционных изменений. */
  contentModifiedAt?: string;
  notes?: { public?: string; internal?: string };
}

export const purchaseLabels: Record<PurchaseMethod, string> = {
  online: 'Онлайн у страховщика',
  request: 'Заявка и расчёт у страховщика',
  office: 'В отделении страховщика',
  partner: 'Через сайт-партнёр',
};

export const purchaseShort: Record<PurchaseMethod, string> = {
  online: 'Онлайн',
  request: 'Заявка',
  office: 'Офис',
  partner: 'Партнёрский сайт',
};

export const obligationShort: Record<ObligationStatus, string> = {
  required: 'Обязательно',
  voluntary: 'Добровольно',
  conditional: 'При условиях',
};

export const obligationLabels: Record<ObligationStatus, string> = {
  required: 'Обязательно',
  voluntary: 'Добровольно',
  conditional: 'При определённых условиях',
};

/** Тон бейджа обязательности: обязательное — предупреждение, добровольное — нейтральный. */
export const obligationTone: Record<ObligationStatus, 'warning' | 'neutral' | 'info'> = {
  required: 'warning',
  voluntary: 'neutral',
  conditional: 'info',
};
