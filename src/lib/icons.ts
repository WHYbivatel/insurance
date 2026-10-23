/**
 * Карта иконок Lucide.
 *
 * Единственное место, где смысловые имена связываются с конкретными иконками.
 * Импортируются только используемые иконки: на клиент не попадает ни байта JS,
 * вся библиотека не подключается.
 *
 * Лицензия Lucide — ISC: https://lucide.dev/license, см. THIRD_PARTY_NOTICES.md
 */
import {
  ArrowRight,
  ArrowUpRight,
  Building,
  BusFront,
  CarFront,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Copy,
  Cross,
  ExternalLink,
  Factory,
  FileText,
  HardHat,
  HeartPulse,
  House,
  Info,
  Landmark,
  Leaf,
  Menu,
  Package,
  Plane,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  Sprout,
  TriangleAlert,
  UsersRound,
  X,
} from '@lucide/astro';

export const icons = {
  /* --- категории страхования --- */
  ogpo: CarFront,
  kasko: ShieldCheck,
  dgpo: ShieldPlus,
  home: House,
  health: HeartPulse,
  accident: Cross,
  travel: Plane,
  life: Sprout,
  pension: Landmark,
  people: UsersRound,
  fleet: BusFront,
  building: Building,
  cargo: Package,
  construction: HardHat,
  liability: Scale,
  ecology: Leaf,
  industry: Factory,

  /* --- интерфейс --- */
  search: Search,
  filter: SlidersHorizontal,
  arrow: ArrowRight,
  'arrow-up-right': ArrowUpRight,
  external: ExternalLink,
  'chevron-down': ChevronDown,
  check: Check,
  close: X,
  menu: Menu,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
  refresh: RefreshCw,
  copy: Copy,
  doc: FileText,

  /* --- прежние имена (совместимость) --- */
  car: CarFront,
  'shield-car': ShieldCheck,
  'shield-check': ShieldCheck,
  'shield-plus': ShieldPlus,
} as const;

export type IconName = keyof typeof icons;

export const isIconName = (value: string): value is IconName => value in icons;
