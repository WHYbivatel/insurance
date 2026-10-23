/**
 * Поиск с подсказками.
 *
 * Фокус всё время остаётся в поле ввода: активная подсказка помечается через
 * aria-activedescendant, а не переносом фокуса. Из-за этого стрелки работают
 * последовательно, Tab уводит из поля обычным порядком, а скринридер
 * объявляет выбранный вариант.
 */

interface Suggestion {
  title: string;
  sub: string;
  url: string;
  type: string;
}

const MAX_ITEMS = 7;
const MIN_QUERY = 2;

const normalize = (value: string): string => value.toLowerCase().replace(/ё/g, 'е').trim();

export function initSearch(): void {
  const form = document.querySelector<HTMLFormElement>('[data-search]');
  const input = document.querySelector<HTMLInputElement>('[data-search-input]');
  const panel = document.querySelector<HTMLElement>('[data-search-results]');
  const indexEl = document.querySelector<HTMLScriptElement>('#search-index');

  if (!form || !input || !panel || !indexEl) return;

  let items: Suggestion[] = [];
  try {
    items = JSON.parse(indexEl.textContent || '[]') as Suggestion[];
  } catch {
    return;
  }

  let active = -1;
  let matches: Suggestion[] = [];

  const options = (): HTMLAnchorElement[] =>
    Array.from(panel.querySelectorAll<HTMLAnchorElement>('.search-result'));

  const setActive = (index: number): void => {
    const links = options();
    if (links.length === 0) {
      active = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    active = (index + links.length) % links.length;
    links.forEach((link, i) => {
      const isActive = i === active;
      link.setAttribute('aria-selected', String(isActive));
      link.classList.toggle('is-active', isActive);
      // Прокручиваем панель, чтобы активный вариант был виден.
      if (isActive) link.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', links[active].id);
  };

  const close = (): void => {
    panel.dataset.open = 'false';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const render = (query: string): void => {
    const q = normalize(query);
    panel.replaceChildren();
    active = -1;
    input.removeAttribute('aria-activedescendant');

    if (q.length < MIN_QUERY) {
      close();
      return;
    }

    matches = items
      .filter((item) => normalize(`${item.title} ${item.sub} ${item.type}`).includes(q))
      .slice(0, MAX_ITEMS);

    if (matches.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent =
        'Ничего не нашли. Попробуйте «ОГПО», «КАСКО», «квартира» или название компании.';
      panel.append(empty);
      panel.dataset.open = 'true';
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    matches.forEach((item, i) => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.url;
      link.id = `search-option-${i}`;
      link.setAttribute('role', 'option');
      link.setAttribute('aria-selected', 'false');
      link.dataset.index = String(i);

      const type = document.createElement('span');
      type.className = 'search-result__type';
      type.textContent = item.type;

      const text = document.createElement('span');
      text.className = 'search-result__text';
      text.textContent = item.title;

      const sub = document.createElement('span');
      sub.className = 'search-result__sub';
      sub.textContent = item.sub;
      text.append(sub);

      link.append(type, text);

      // Мышь не должна перебивать клавиатуру: только подсветка, без фокуса.
      link.addEventListener('mouseenter', () => setActive(i));

      panel.append(link);
    });

    panel.dataset.open = 'true';
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => render(input.value));

  input.addEventListener('keydown', (event) => {
    const links = options();
    const open = panel.dataset.open === 'true';

    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        close();
      }
      return;
    }

    // Tab не перехватываем: пользователь уходит из поля обычным порядком.
    if (event.key === 'Tab') {
      close();
      return;
    }

    if (!open || links.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(active + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(active <= 0 ? links.length - 1 : active - 1);
      return;
    }

    if (event.key === 'Enter') {
      if (active >= 0 && links[active]) {
        event.preventDefault();
        window.location.href = links[active].href;
      }
      // Без активной подсказки Enter отправляет форму на страницу поиска.
    }
  });

  // Клик по подсказке — обычный переход по ссылке.
  panel.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest('a.search-result');
    if (link) close();
  });

  document.addEventListener('click', (event) => {
    if (!form.contains(event.target as Node)) close();
  });

  form.addEventListener('submit', (event) => {
    if (active >= 0) {
      const links = options();
      if (links[active]) {
        event.preventDefault();
        window.location.href = links[active].href;
      }
    }
  });
}
