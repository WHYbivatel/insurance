/**
 * Страница поиска /poisk/.
 *
 * Индекс приходит одним JSON-блоком, результаты строятся через DOM API:
 * текст запроса никогда не вставляется как HTML. Группы и счётчик обновляются
 * без перезагрузки, адрес меняется через replaceState, чтобы ссылкой можно
 * было поделиться.
 */

interface IndexItem {
  title: string;
  sub: string;
  url: string;
  type: string;
  text: string;
}

const GROUPS: { type: string; title: string }[] = [
  { type: 'Предложение', title: 'Предложения' },
  { type: 'Раздел', title: 'Разделы' },
  { type: 'Компания', title: 'Компании' },
];

const normalize = (value: string): string => value.toLowerCase().replace(/ё/g, 'е').trim();

export function initSearchPage(): void {
  const input = document.querySelector<HTMLInputElement>('[data-global-input]');
  const results = document.querySelector<HTMLElement>('[data-global-results]');
  const indexEl = document.querySelector<HTMLScriptElement>('#global-index');
  if (!input || !results || !indexEl) return;

  const hint = document.querySelector<HTMLElement>('[data-global-hint]');
  const empty = document.querySelector<HTMLElement>('[data-global-empty]');
  const counter = document.querySelector<HTMLElement>('[data-global-count]');

  let items: IndexItem[] = [];
  try {
    items = JSON.parse(indexEl.textContent || '[]') as IndexItem[];
  } catch {
    items = [];
  }

  const arrowTemplate = document.querySelector<HTMLTemplateElement>('template[data-row-arrow]');

  const makeRow = (item: IndexItem): HTMLAnchorElement => {
    const row = document.createElement('a');
    row.className = 'company-row';
    row.href = item.url;

    const text = document.createElement('span');
    text.className = 'company-row__text';

    const name = document.createElement('span');
    name.className = 'company-row__name';
    name.textContent = item.title;

    const meta = document.createElement('span');
    meta.className = 'company-row__meta';
    meta.textContent = item.sub;

    text.append(name, meta);
    row.append(text);

    const arrow = arrowTemplate?.content.cloneNode(true);
    if (arrow) row.append(arrow);
    return row;
  };

  const render = (raw: string): void => {
    const q = normalize(raw);
    results.replaceChildren();

    // Короткий запрос: подсказываем, с чего начать, вместо пустого экрана.
    if (q.length < 2) {
      if (hint) hint.hidden = false;
      if (empty) empty.hidden = true;
      if (counter) counter.hidden = true;
      return;
    }

    if (hint) hint.hidden = true;

    const matches = items.filter((item) =>
      normalize(`${item.title} ${item.sub} ${item.text} ${item.type}`).includes(q)
    );

    if (counter) {
      counter.hidden = false;
      counter.replaceChildren(
        document.createTextNode('Найдено '),
        Object.assign(document.createElement('strong'), { textContent: String(matches.length) }),
        document.createTextNode(` по запросу «${raw.trim()}»`)
      );
    }

    if (empty) empty.hidden = matches.length !== 0;
    if (matches.length === 0) return;

    for (const group of GROUPS) {
      const list = matches.filter((item) => item.type === group.type);
      if (list.length === 0) continue;

      const section = document.createElement('section');
      section.className = 'search-group';

      const heading = document.createElement('h2');
      heading.className = 'search-group__title';
      heading.textContent = `${group.title} `;
      const amount = document.createElement('span');
      amount.className = 'muted';
      amount.textContent = String(list.length);
      heading.append(amount);

      const rows = document.createElement('div');
      rows.className = 'company-list';
      for (const item of list.slice(0, 40)) rows.append(makeRow(item));

      section.append(heading, rows);
      results.append(section);
    }
  };

  const initial = new URLSearchParams(location.search).get('q') ?? '';
  input.value = initial;
  render(initial);

  input.addEventListener('input', () => {
    render(input.value);
    const params = new URLSearchParams(location.search);
    if (input.value.trim()) params.set('q', input.value.trim());
    else params.delete('q');
    const next = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
    history.replaceState(null, '', next);
  });

  input.focus({ preventScroll: true });
}
