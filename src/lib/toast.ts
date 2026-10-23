/**
 * ToastManager — всплывающие уведомления.
 *
 * API:
 *   toast.success('Ссылка скопирована')
 *   toast.info('Доступна новая версия сайта', { action: { label: 'Обновить', onClick } })
 *   toast.warning('Заголовок', { description: 'Пояснение' })
 *   toast.error('Не удалось загрузить данные')
 *
 * Появление и исчезновение анимируются Motion Mini; прогресс-бар — CSS,
 * поэтому таймер и полоска всегда синхронны и корректно встают на паузу.
 * Уведомления не забирают фокус, живут в live-region и не дублируются.
 */

import { animate } from 'motion/mini';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Закрыть уведомление после действия. */
  closeOnClick?: boolean;
}

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
  /** Не удалять автоматически. */
  persistent?: boolean;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 8000,
};

const WITH_ACTION_DURATION = 11000;
const MAX_VISIBLE = 3;

const LABELS: Record<ToastType, string> = {
  success: 'Готово',
  info: 'Информация',
  warning: 'Внимание',
  error: 'Ошибка',
};

interface Entry {
  el: HTMLElement;
  timer: number | null;
  remaining: number;
  startedAt: number;
  paused: boolean;
  duration: number;
  signature: string;
  closed: boolean;
}

const entries: Entry[] = [];
let politeRegion: HTMLElement | null = null;
let assertiveRegion: HTMLElement | null = null;

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensureRegions(): void {
  if (politeRegion && assertiveRegion && document.body.contains(politeRegion)) return;

  // Сначала пробуем готовую разметку из ToastViewport: она уже отрендерена
  // в HTML, поэтому live-region существует до первого уведомления, а второй
  // контейнер в DOM не появляется.
  const existing = document.querySelector<HTMLElement>('[data-toast-viewport]');
  if (existing) {
    const polite = existing.querySelector<HTMLElement>('[role="status"]');
    const assertive = existing.querySelector<HTMLElement>('[role="alert"]');
    if (polite && assertive) {
      politeRegion = polite;
      assertiveRegion = assertive;
      return;
    }
  }

  const viewport = document.createElement('div');
  viewport.className = 'toast-viewport';
  viewport.setAttribute('data-toast-viewport', '');

  politeRegion = document.createElement('div');
  politeRegion.className = 'toast-viewport__stack';
  politeRegion.setAttribute('role', 'status');
  politeRegion.setAttribute('aria-live', 'polite');
  politeRegion.setAttribute('aria-atomic', 'false');

  assertiveRegion = document.createElement('div');
  assertiveRegion.className = 'toast-viewport__stack';
  assertiveRegion.setAttribute('role', 'alert');
  assertiveRegion.setAttribute('aria-live', 'assertive');

  viewport.append(politeRegion, assertiveRegion);
  document.body.append(viewport);
}

/**
 * Иконка типа берётся из шаблона, который отрендерил Astro (ToastViewport):
 * так у уведомлений те же SVG Lucide, что и во всём интерфейсе, без второй
 * копии путей и без подключения библиотеки иконок в клиентский бандл.
 */
function iconNode(name: ToastType | 'close'): Node | null {
  const template = document.querySelector<HTMLTemplateElement>(`template[data-toast-icon="${name}"]`);
  return template?.content.cloneNode(true) ?? null;
}

function startTimer(entry: Entry): void {
  if (entry.duration <= 0) return;
  entry.startedAt = Date.now();
  entry.timer = window.setTimeout(() => close(entry), entry.remaining);
}

function pause(entry: Entry): void {
  if (entry.paused || entry.closed) return;
  entry.paused = true;
  if (entry.timer) {
    window.clearTimeout(entry.timer);
    entry.timer = null;
  }
  entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
  const progress = entry.el.querySelector<HTMLElement>('.toast__progress');
  if (progress) {
    progress.dataset.paused = 'true';
    // Инлайновый animation задаёт и play-state, поэтому пауза ставится тоже инлайново.
    progress.style.animationPlayState = 'paused';
  }
}

function resume(entry: Entry): void {
  if (!entry.paused || entry.closed) return;
  entry.paused = false;
  const progress = entry.el.querySelector<HTMLElement>('.toast__progress');
  if (progress) {
    delete progress.dataset.paused;
    progress.style.animationPlayState = 'running';
  }
  startTimer(entry);
}

async function close(entry: Entry): Promise<void> {
  if (entry.closed) return;
  entry.closed = true;
  if (entry.timer) window.clearTimeout(entry.timer);

  const index = entries.indexOf(entry);
  if (index >= 0) entries.splice(index, 1);

  if (reducedMotion()) {
    entry.el.remove();
    return;
  }

  entry.el.dataset.state = 'leaving';
  try {
    await animate(
      entry.el,
      { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(6px)'] },
      { duration: 0.16, ease: [0.4, 0, 0.2, 1] }
    ).finished;
  } catch {
    /* анимация могла быть прервана — элемент всё равно удаляем */
  }
  entry.el.remove();
}

function build(
  type: ToastType,
  message: string,
  options: ToastOptions = {}
): { el: HTMLElement; body: HTMLElement } {
  const el = document.createElement('article');
  el.className = `toast toast--${type}`;
  el.dataset.state = 'entering';
  el.dataset.type = type;
  if (options.id) el.dataset.toastId = options.id;

  const icon = document.createElement('span');
  icon.className = 'toast__icon';
  const iconGlyph = iconNode(type);
  if (iconGlyph) icon.append(iconGlyph);

  const body = document.createElement('div');
  body.className = 'toast__body';

  const title = document.createElement('p');
  title.className = 'toast__title';

  /* Тип проговаривается словом: цвет и иконка не единственный носитель смысла. */
  const typeLabel = document.createElement('span');
  typeLabel.className = 'sr-only';
  typeLabel.textContent = `${LABELS[type]}: `;
  title.append(typeLabel, document.createTextNode(options.title ?? message));

  body.append(title);

  if (options.description) {
    const desc = document.createElement('p');
    desc.className = 'toast__desc';
    desc.textContent = options.description;
    body.append(desc);
  } else if (options.title && message && options.title !== message) {
    const desc = document.createElement('p');
    desc.className = 'toast__desc';
    desc.textContent = message;
    body.append(desc);
  }

  if (options.action) {
    const wrap = document.createElement('div');
    wrap.className = 'toast__action';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--secondary btn--sm';
    button.textContent = options.action.label;
    button.addEventListener('click', () => {
      options.action?.onClick();
      if (options.action?.closeOnClick !== false) {
        const entry = entries.find((e) => e.el === el);
        if (entry) void close(entry);
      }
    });
    wrap.append(button);
    body.append(wrap);
  }

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'toast__close';
  closeButton.setAttribute('aria-label', `Закрыть уведомление: ${options.title ?? message}`);
  const closeGlyph = iconNode('close');
  if (closeGlyph) closeButton.append(closeGlyph);

  const progress = document.createElement('span');
  progress.className = 'toast__progress';
  progress.setAttribute('aria-hidden', 'true');

  el.append(icon, body, closeButton, progress);
  return { el, body };
}

function show(type: ToastType, message: string, options: ToastOptions = {}): void {
  if (typeof document === 'undefined') return;
  ensureRegions();

  const signature = `${type}|${options.title ?? message}|${options.description ?? ''}`;
  const existing = entries.find((e) => e.signature === signature && !e.closed);

  // Одинаковые события объединяем: перезапускаем таймер, а не плодим карточки.
  if (existing) {
    existing.remaining = existing.duration;
    existing.startedAt = Date.now();
    if (existing.timer) window.clearTimeout(existing.timer);
    if (!existing.paused) startTimer(existing);
    const progress = existing.el.querySelector<HTMLElement>('.toast__progress');
    if (progress) {
      progress.style.animation = 'none';
      void progress.offsetWidth;
      progress.style.animation = `toast-progress ${existing.duration}ms linear forwards`;
      progress.style.animationPlayState = existing.paused ? 'paused' : 'running';
    }
    return;
  }

  const duration =
    options.duration ?? (options.action ? WITH_ACTION_DURATION : DEFAULT_DURATION[type]);

  const { el } = build(type, message, options);

  // Не больше трёх одновременно: самое старое убираем сразу.
  while (entries.length >= MAX_VISIBLE) {
    const oldest = entries[0];
    if (!oldest) break;
    oldest.closed = true;
    if (oldest.timer) window.clearTimeout(oldest.timer);
    oldest.el.remove();
    entries.shift();
  }

  const progress = el.querySelector<HTMLElement>('.toast__progress');
  if (progress && duration > 0) {
    progress.style.animation = `toast-progress ${duration}ms linear forwards`;
  } else if (progress) {
    progress.remove();
  }

  const region = type === 'error' ? assertiveRegion! : politeRegion!;
  region.append(el);

  const entry: Entry = {
    el,
    timer: null,
    remaining: duration,
    startedAt: Date.now(),
    paused: false,
    duration,
    signature,
    closed: false,
  };
  entries.push(entry);

  el.querySelector('.toast__close')?.addEventListener('click', () => void close(entry));

  // Пауза при наведении и фокусе внутри, чтобы успеть прочитать.
  el.addEventListener('mouseenter', () => pause(entry));
  el.addEventListener('mouseleave', () => resume(entry));
  el.addEventListener('focusin', () => pause(entry));
  el.addEventListener('focusout', (event) => {
    if (!el.contains(event.relatedTarget as Node)) resume(entry);
  });

  if (reducedMotion()) {
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.dataset.state = 'idle';
  } else {
    animate(
      el,
      { opacity: [0, 1], transform: ['translateY(12px) scale(0.98)', 'translateY(0px) scale(1)'] },
      { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
    ).finished.then(() => {
      if (!entry.closed) el.dataset.state = 'idle';
    });
  }

  startTimer(entry);
}

export const toast = {
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  warning: (message: string, options?: ToastOptions) => show('warning', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
  closeAll: () => {
    for (const entry of [...entries]) void close(entry);
  },
};

// Скрытая вкладка не должна «съедать» время показа.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    for (const entry of entries) {
      if (document.hidden) pause(entry);
      else resume(entry);
    }
  });
}
