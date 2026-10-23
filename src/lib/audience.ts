/**
 * Единое сохранение выбранной аудитории.
 *
 * Раньше выбор запоминался только у ссылок с data-audience-link, поэтому
 * кнопки первого экрана и навигация его не сохраняли. Теперь источник один:
 * клик по любой ссылке, ведущей в раздел, и синхронизация при загрузке
 * страницы с однозначной аудиторией.
 */

export type Audience = 'individual' | 'business';

const KEY = 'polis:audience';

export function readAudience(): Audience | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'individual' || value === 'business' ? value : null;
  } catch {
    return null;
  }
}

export function saveAudience(value: Audience): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* приватный режим или отключённое хранилище — не мешаем навигации */
  }
}

/** Определяем аудиторию по адресу ссылки. */
function audienceFromHref(href: string): Audience | null {
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return null;
    if (url.pathname === '/dlya-sebya/' || url.pathname.startsWith('/dlya-sebya/')) {
      return 'individual';
    }
    if (url.pathname === '/dlya-biznesa/' || url.pathname.startsWith('/dlya-biznesa/')) {
      return 'business';
    }
  } catch {
    /* некорректный адрес — игнорируем */
  }
  return null;
}

/** Подсветка переключателей и кнопок первого экрана. */
export function applyAudience(value: Audience): void {
  document.querySelectorAll<HTMLElement>('[data-audience-switch]').forEach((sw) => {
    sw.dataset.active = 'set';
    sw.style.setProperty('--audience-index', value === 'business' ? '1' : '0');
  });

  document.querySelectorAll<HTMLAnchorElement>('[data-audience-link]').forEach((link) => {
    if (link.dataset.audienceLink === value) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });

  document.querySelectorAll<HTMLAnchorElement>('[data-hero-audience]').forEach((link) => {
    if (link.dataset.heroAudience === value) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

export function initAudience(): void {
  const pageAudience = document.body.dataset.pageAudience as Audience | '' | undefined;

  // Страница сама знает свою аудиторию — синхронизируем сохранённое значение.
  if (pageAudience === 'individual' || pageAudience === 'business') {
    saveAudience(pageAudience);
    applyAudience(pageAudience);
  } else {
    const saved = readAudience();
    if (saved) applyAudience(saved);
  }

  // Один делегированный обработчик на все способы входа в раздел.
  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const link = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    // Не перехватываем клики с модификаторами и внешние ссылки.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const explicit =
      link.dataset.audienceLink ?? link.dataset.heroAudience ?? link.dataset.navAudience ?? null;
    const value =
      explicit === 'individual' || explicit === 'business'
        ? (explicit as Audience)
        : audienceFromHref(link.getAttribute('href') ?? '');

    if (value) saveAudience(value);
  });
}
