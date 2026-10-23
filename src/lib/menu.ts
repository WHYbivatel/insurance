/**
 * Мобильное меню.
 *
 * Открытие по кнопке, закрытие по Escape с возвратом фокуса на кнопку,
 * корректный aria-expanded, закрытие по клику вне меню и по переходу.
 */

export function initMobileMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('#mobile-menu');
  if (!toggle || !menu) return;

  const firstLink = menu.querySelector<HTMLAnchorElement>('a[href]');

  const isOpen = (): boolean => menu.dataset.open === 'true';

  const open = (): void => {
    menu.dataset.open = 'true';
    menu.removeAttribute('inert');
    toggle.setAttribute('aria-expanded', 'true');
    // Фокус — на первый пункт, чтобы меню было доступно с клавиатуры сразу.
    window.setTimeout(() => firstLink?.focus(), 60);
  };

  const close = (returnFocus = false): void => {
    menu.dataset.open = 'false';
    menu.setAttribute('inert', '');
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  };

  // Исходное состояние: закрыто и недоступно для Tab.
  if (!isOpen()) menu.setAttribute('inert', '');

  toggle.addEventListener('click', () => {
    if (isOpen()) close();
    else open();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    event.preventDefault();
    close(true);
  });

  // Переход по пункту меню закрывает его без возврата фокуса.
  menu.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest('a[href]')) close();
  });

  // Клик вне меню и кнопки закрывает меню.
  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    if (!isOpen()) return;
    if (menu.contains(target) || toggle.contains(target)) return;
    close();
  });

  // На десктопной ширине меню не должно оставаться открытым.
  const mq = window.matchMedia('(min-width: 1025px)');
  mq.addEventListener('change', (event) => {
    if (event.matches && isOpen()) close();
  });
}
