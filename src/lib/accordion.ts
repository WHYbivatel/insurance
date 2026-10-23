/**
 * Аккордеон FAQ.
 *
 * Плавное раскрытие за 180–220 мс (CSS grid-template-rows), шеврон
 * поворачивается. Закрытая панель получает inert, чтобы её содержимое
 * не попадало в Tab и не читалось скринридером.
 */

export function initAccordion(): void {
  const triggers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]'));
  if (triggers.length === 0) return;

  const setState = (trigger: HTMLButtonElement, open: boolean): void => {
    const panelId = trigger.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    trigger.setAttribute('aria-expanded', String(open));
    if (!panel) return;
    panel.dataset.open = String(open);
    if (open) panel.removeAttribute('inert');
    else panel.setAttribute('inert', '');
  };

  for (const trigger of triggers) {
    setState(trigger, trigger.getAttribute('aria-expanded') === 'true');

    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      setState(trigger, !open);
    });
  }
}
