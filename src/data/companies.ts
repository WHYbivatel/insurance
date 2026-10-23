import type { Company } from './types';
import nomadMark from '../assets/logos/nomad-mark.png';
import eurasiaMark from '../assets/logos/eurasia-mark.png';
import eurasiaLockup from '../assets/logos/eurasia-lockup.png';
import amanatLockup from '../assets/logos/amanat-lockup.svg';
import centrasMark from '../assets/logos/centras-mark.png';
import freedomMark from '../assets/logos/freedom-mark.svg';
import halykMark from '../assets/logos/halyk-mark.svg';
import halykLockup from '../assets/logos/halyk-lockup.png';

/**
 * Компании каталога.
 * facts — только сведения, подтверждённые официальным сайтом компании на дату проверки.
 */
export const companies: Company[] = [
  {
    id: 'nomad',
    slug: 'nomad-insurance',
    name: 'Nomad Insurance',
    legalName: 'АО «СК «Nomad Insurance»',
    shortName: 'Nomad',
    site: 'https://nomad.kz/ru',
    siteLabel: 'nomad.kz',
    city: 'Алматы',
    summary:
      'Универсальная страховая компания: авто, имущество, путешествия, здоровье и корпоративные программы. Часть полисов можно оформить онлайн в личном кабинете.',
    facts: [
      'Онлайн-оформление ОГПО, КАСКО, имущества и путешествий',
      'Отдельные разделы для физических и юридических лиц',
      'БИН 040140001147 указан на сайте компании',
    ],
    note: 'Онлайн-оформление ОГПО и части имущественных продуктов требует авторизации в личном кабинете и подтверждения через SMS.',
    logo: {
      mark: nomadMark.src,
      markWidth: nomadMark.width,
      markHeight: nomadMark.height,
      sourceUrl: 'https://nomad.kz/build/assets/Logo_v1-DnyaSbSv.png',
      fetchedAt: '2026-10-23',
      note: 'Квадратный знак Nomad Insurance с сайта компании (101×100). Логотип контакт-центра «1414» с того же сайта не используется: это не логотип страховщика.',
    },
    accent: '#0E5A3C',
  },
  {
    id: 'eurasia',
    slug: 'eurasia',
    name: 'Евразия',
    legalName: 'АО «Страховая компания «Евразия»',
    shortName: 'Евразия',
    site: 'https://theeurasia.kz/',
    siteLabel: 'theeurasia.kz',
    city: 'Алматы',
    summary:
      'Одна из крупнейших страховых компаний Казахстана, работает с 1995 года. Страхует частных лиц и бизнес, продажи онлайн идут через магазин полисов eurasia36.kz.',
    facts: [
      'Работает с 1995 года',
      'Онлайн-магазин полисов eurasia36.kz',
      'Отдельные линейки для частных лиц и корпоративных клиентов',
    ],
    note: 'Онлайн-оформление ОГПО доступно на eurasia36.kz; часть добровольных продуктов оформляется через менеджера.',
    logo: {
      mark: eurasiaMark.src,
      markWidth: eurasiaMark.width,
      markHeight: eurasiaMark.height,
      lockup: eurasiaLockup.src,
      lockupWidth: eurasiaLockup.width,
      lockupHeight: eurasiaLockup.height,
      sourceUrl: 'https://theeurasia.kz/bitrix/templates/eurasia_ru/images/Eurasia_kaz_rus2.png',
      fetchedAt: '2026-10-23',
    },
    accent: '#1D4E89',
  },
  {
    id: 'amanat',
    slug: 'amanat',
    name: 'Amanat',
    legalName: 'АО «Страховая компания «Amanat»',
    shortName: 'Amanat',
    site: 'https://amanat24.kz/',
    siteLabel: 'amanat24.kz',
    city: 'Алматы',
    summary:
      'Страховая компания с онлайн-продажей обязательной автогражданки, КАСКО и медицинского страхования туристов. Полисы оформляются на сайте и в личном кабинете.',
    facts: [
      'Онлайн-оформление ОГПО, КАСКО и страхования туристов',
      'Личный кабинет и онлайн-урегулирование',
      'Круглосуточный колл-центр по данным сайта',
    ],
    logo: {
      /* На сайте страховщика есть только словесный логотип: квадратной марки нет.
         Используем официальный файл как есть, без рисунка «по мотивам». */
      mark: amanatLockup.src,
      markWidth: amanatLockup.width,
      markHeight: amanatLockup.height,
      lockup: amanatLockup.src,
      lockupWidth: amanatLockup.width,
      lockupHeight: amanatLockup.height,
      sourceUrl: 'https://amanat24.kz/_nuxt/img/logo.2b6daef.svg',
      fetchedAt: '2026-10-23',
      note: 'Официальный файл — словесный логотип 99×30, отдельной квадратной марки на сайте нет. Поэтому логотип показывается в широком контейнере с сохранением пропорций.',
    },
    accent: '#8A5A2B',
  },
  {
    id: 'centras',
    slug: 'centras-insurance',
    name: 'Centras Insurance',
    legalName: 'Страховая компания «Centras Insurance»',
    shortName: 'Centras',
    site: 'https://cic.kz/',
    siteLabel: 'cic.kz',
    city: 'Алматы',
    summary:
      'Страховая компания, работающая с 1997 года. Предлагает автострахование, имущество, грузы, ответственность и корпоративные программы; часть расчётов идёт через онлайн-калькулятор.',
    facts: [
      'Работает с 1997 года',
      'Отдельные разделы для частных и юридических лиц',
      'ОГПО ВТС оформляется на партнёрском сайте kupipolis.kz',
    ],
    note: 'Публичные страницы продуктов содержат описание условий, но не всегда — полный тариф. Стоимость рассчитывается индивидуально.',
    logo: {
      mark: centrasMark.src,
      markWidth: centrasMark.width,
      markHeight: centrasMark.height,
      sourceUrl: 'https://cic.kz/logo.png',
      fetchedAt: '2026-10-23',
    },
    accent: '#3E4A59',
  },
  {
    id: 'freedom',
    slug: 'freedom-finance-insurance',
    name: 'Freedom Finance Insurance',
    legalName: 'АО «СК «Freedom Finance Insurance»',
    shortName: 'Freedom',
    site: 'https://ffins.kz/ru',
    siteLabel: 'ffins.kz',
    city: 'Алматы',
    summary:
      'Страховая компания группы Freedom Holding. Развивает онлайн-оформление автострахования и имущества, отдельно работает с корпоративными рисками.',
    facts: [
      'Онлайн-калькуляторы ОГПО и ОГПО+',
      'Продукты для физических и юридических лиц',
      'Национальный рейтинг kzA- указан на сайте компании',
    ],
    note: 'Часть продуктов оформляется онлайн, корпоративные — по заявке через менеджера.',
    logo: {
      mark: freedomMark.src,
      markWidth: freedomMark.width,
      markHeight: freedomMark.height,
      sourceUrl: 'https://ffins.kz/main-front/images/Freedom-logo.svg',
      fetchedAt: '2026-10-23',
      note: 'Знак выделен из официального SVG: словесная часть логотипа набрана белым и на светлом фоне не читается.',
    },
    accent: '#0B6E4F',
  },
  {
    id: 'halyklife',
    slug: 'halyk-life',
    name: 'Halyk Life',
    legalName: 'Halyk Life',
    shortName: 'Halyk Life',
    site: 'https://halyklife.kz/ru/',
    siteLabel: 'halyklife.kz',
    city: 'Алматы',
    summary:
      'Компания по страхованию жизни: накопительные программы, защита от несчастных случаев и критических заболеваний, пенсионный аннуитет и обязательное страхование работников.',
    facts: [
      'Специализируется на страховании жизни',
      'Входит в Halyk Group',
      'Онлайн-оформление обязательного страхования работников',
    ],
    note: 'Накопительные программы — долгосрочные договоры; условия и доходность фиксируются в договоре.',
    logo: {
      mark: halykMark.src,
      markWidth: halykMark.width,
      markHeight: halykMark.height,
      lockup: halykLockup.src,
      lockupWidth: halykLockup.width,
      lockupHeight: halykLockup.height,
      sourceUrl: 'https://halyklife.kz/favicon.svg',
      fetchedAt: '2026-10-23',
      note: 'Логотип именно Halyk Life, не Halyk Bank.',
    },
    accent: '#1F6B45',
  },
];

export const companyById = (id: string) => companies.find((c) => c.id === id);
