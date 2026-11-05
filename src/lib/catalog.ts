/**
 * Фильтрация каталога.
 *
 * Поиск, компания, способ оформления и обязательность работают совместно.
 * Скрытие — через атрибут hidden, который теперь гарантированно побеждает
 * display из компонентов (правило [hidden] в ui.css).
 */

import { flashCards } from './motion';

const plural = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'предложение';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'предложения';
  return 'предложений';
};

const normalize = (value: string): string => value.toLowerCase().replace(/ё/g, 'е').trim();

export function initCatalog(): void {
  const root = document.querySelector<HTMLElement>('[data-catalog]');
  if (!root) return;

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-offer-card]'));
  if (cards.length === 0) return;

  const search = root.querySelector<HTMLInputElement>('[data-catalog-search]');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const sort = root.querySelector<HTMLSelectElement>('[data-catalog-sort]');
  const resultList = root.querySelector<HTMLElement>('[data-results]');
  const facetCounts = Array.from(root.querySelectorAll<HTMLElement>('[data-filter-count]'));
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const checks = Array.from(root.querySelectorAll<HTMLInputElement>('[data-filter]'));
  const resetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-reset]'));
  const filterToggle = root.querySelector<HTMLButtonElement>('[data-filter-toggle]');
  const filters = root.querySelector<HTMLElement>('[data-filters]');

  const selected = (name: string): string[] =>
    checks.filter((c) => c.dataset.filter === name && c.checked).map((c) => c.value);

  let flashTimer = 0;

  const apply = (
    updateUrl = true,
    animate = true,
    historyMode: 'replace' | 'push' = 'replace',
  ): void => {
    const q = normalize(search?.value ?? '');
    const company = selected('company');
    const method = selected('method');
    const obligation = selected('obligation');
    const sortValue = sort?.value === 'title' ? 'title' : 'recommended';

    let visible = 0;
    const shown: HTMLElement[] = [];

    for (const card of cards) {
      const matchesQuery = !q || normalize(card.dataset.text ?? '').includes(q);
      const matchesCompany = company.length === 0 || company.includes(card.dataset.company ?? '');
      const matchesMethod = method.length === 0 || method.includes(card.dataset.method ?? '');
      const matchesObligation =
        obligation.length === 0 || obligation.includes(card.dataset.obligation ?? '');

      const show = matchesQuery && matchesCompany && matchesMethod && matchesObligation;
      card.hidden = !show;
      if (show) {
        visible += 1;
        shown.push(card);
      }
    }

    // Facet counts show how many results each option yields with the other
    // active filters applied (the current facet itself is intentionally omitted).
    for (const badge of facetCounts) {
      const facet = badge.dataset.filter ?? '';
      const value = badge.dataset.value ?? '';
      const matches = cards.filter((card) => {
        const matchesQuery = !q || normalize(card.dataset.text ?? '').includes(q);
        const matchesCompany = facet === 'company' || company.length === 0 || company.includes(card.dataset.company ?? '');
        const matchesMethod = facet === 'method' || method.length === 0 || method.includes(card.dataset.method ?? '');
        const matchesObligation = facet === 'obligation' || obligation.length === 0 || obligation.includes(card.dataset.obligation ?? '');
        return matchesQuery && matchesCompany && matchesMethod && matchesObligation && card.dataset[facet] === value;
      }).length;
      badge.textContent = String(matches);
    }

    if (resultList) {
      const ordered = sortValue === 'title'
        ? [...cards].sort((a, b) => normalize(a.dataset.title ?? '').localeCompare(normalize(b.dataset.title ?? ''), 'ru'))
        : cards;
      ordered.forEach((card) => resultList.insertBefore(card, empty));
    }

    if (count) count.innerHTML = `Найдено <strong>${visible}</strong> ${plural(visible)}`;
    if (empty) empty.hidden = visible !== 0;

    // Анимация появления: короткая, с общей задержкой не больше 200 мс.
    // Быстрый ввод не должен выстраивать очередь — предыдущий запуск отменяем.
    if (animate) {
      window.clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => flashCards(shown), 90);
    }

    if (updateUrl) {
      const params = new URLSearchParams(location.search);
      for (const name of ['q', 'company', 'method', 'obligation', 'sort']) params.delete(name);
      if (q) params.set('q', search?.value.trim() ?? '');
      if (company.length) params.set('company', company.join(','));
      if (method.length) params.set('method', method.join(','));
      if (obligation.length) params.set('obligation', obligation.join(','));
      if (sortValue !== 'recommended') params.set('sort', sortValue);
      const next = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
      history[`${historyMode}State`](null, '', next + location.hash);
    }
  };

  const restoreFromUrl = (): void => {
    const params = new URLSearchParams(location.search);
    if (search) search.value = params.get('q') ?? '';
    if (sort) sort.value = params.get('sort') === 'title' ? 'title' : 'recommended';
    for (const name of ['company', 'method', 'obligation']) {
      const values = (params.get(name) ?? '').split(',').filter(Boolean);
      checks.forEach((c) => {
        if (c.dataset.filter === name) c.checked = values.includes(c.value);
      });
    }
  };

  // Восстанавливаем фильтры при загрузке и при переходе назад/вперёд.
  restoreFromUrl();

  checks.forEach((c) => c.addEventListener('change', () => apply(true, true, 'push')));
  search?.addEventListener('input', () => apply());
  sort?.addEventListener('change', () => apply(true, false, 'push'));
  window.addEventListener('popstate', () => {
    restoreFromUrl();
    apply(false, true);
  });

  resetButtons.forEach((button) =>
    button.addEventListener('click', () => {
      checks.forEach((c) => (c.checked = false));
      if (search) search.value = '';
      if (sort) sort.value = 'recommended';
      apply(true, true, 'push');
      if (filters) filters.dataset.open = 'false';
      filterToggle?.setAttribute('aria-expanded', 'false');
      if (filters?.contains(document.activeElement) && window.matchMedia('(max-width: 1024px)').matches) filterToggle?.focus();
    })
  );

  filterToggle?.addEventListener('click', () => {
    if (!filters) return;
    const open = filters.dataset.open === 'true';
    filters.dataset.open = String(!open);
    filterToggle.setAttribute('aria-expanded', String(!open));
  });

  // Начальное состояние без анимации и без перезаписи адреса.
  apply(false, false);
}
