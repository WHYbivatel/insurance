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
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const checks = Array.from(root.querySelectorAll<HTMLInputElement>('[data-filter]'));
  const resetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-reset]'));
  const filterToggle = root.querySelector<HTMLButtonElement>('[data-filter-toggle]');
  const filters = root.querySelector<HTMLElement>('[data-filters]');

  const selected = (name: string): string[] =>
    checks.filter((c) => c.dataset.filter === name && c.checked).map((c) => c.value);

  let flashTimer = 0;

  const apply = (updateUrl = true, animate = true): void => {
    const q = normalize(search?.value ?? '');
    const company = selected('company');
    const method = selected('method');
    const obligation = selected('obligation');

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

    if (count) count.innerHTML = `Найдено <strong>${visible}</strong> ${plural(visible)}`;
    if (empty) empty.hidden = visible !== 0;

    // Анимация появления: короткая, с общей задержкой не больше 200 мс.
    // Быстрый ввод не должен выстраивать очередь — предыдущий запуск отменяем.
    if (animate) {
      window.clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => flashCards(shown), 90);
    }

    if (updateUrl) {
      const params = new URLSearchParams();
      if (q) params.set('q', search?.value.trim() ?? '');
      if (company.length) params.set('company', company.join(','));
      if (method.length) params.set('method', method.join(','));
      if (obligation.length) params.set('obligation', obligation.join(','));
      const next = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
      history.replaceState(null, '', next);
    }
  };

  // Восстанавливаем состояние из адреса.
  const params = new URLSearchParams(location.search);
  const q = params.get('q');
  if (q && search) search.value = q;
  for (const name of ['company', 'method', 'obligation']) {
    const values = (params.get(name) ?? '').split(',').filter(Boolean);
    checks.forEach((c) => {
      if (c.dataset.filter === name && values.includes(c.value)) c.checked = true;
    });
  }

  checks.forEach((c) => c.addEventListener('change', () => apply()));
  search?.addEventListener('input', () => apply());

  resetButtons.forEach((button) =>
    button.addEventListener('click', () => {
      checks.forEach((c) => (c.checked = false));
      if (search) search.value = '';
      apply();
      if (filters) filters.dataset.open = 'false';
      filterToggle?.setAttribute('aria-expanded', 'false');
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
