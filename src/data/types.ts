export type Audience = 'individual' | 'business';

export type PurchaseMethod = 'online' | 'request' | 'office' | 'partner';

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
  icon: string;
  tint: string;
  whoFor: string[];
  obligation: {
    status: 'required' | 'voluntary' | 'conditional';
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
  coverage: string[];
  exclusions: string[];
  limits: string[];
  obligationNote: string;
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
  status: 'published' | 'draft' | 'archived';
  featured?: boolean;
  badge?: string;
  searchTerms?: string[];
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

export const obligationShort = {
  required: 'Обязательно',
  voluntary: 'Добровольно',
  conditional: 'При условиях',
} as const;

export const obligationLabels = {
  required: 'Обязательно',
  voluntary: 'Добровольно',
  conditional: 'При определённых условиях',
} as const;
