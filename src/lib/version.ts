/**
 * Проверка обновлений для уже открытой вкладки.
 *
 * Сравниваем buildId загруженной страницы с /version.json, запрошенным
 * без кеша. При расхождении показываем одно уведомление с кнопкой
 * «Обновить» и оставляем ненавязчивый индикатор в подвале.
 *
 * Проверки: после загрузки, при возвращении на вкладку (не чаще раза в 15 секунд)
 * и раз в 30 секунд, только когда вкладка видима. Ошибки сети игнорируются:
 * сайт продолжает работать без сообщений.
 */

const CHECK_INTERVAL_MS = 30 * 1000;
const MIN_RETURN_GAP_MS = 15 * 1000;
const NOTIFIED_KEY = 'polis:update-notified';

let currentBuildId = '';
let lastCheck = 0;
let notifiedBuild = '';
let pendingBuild = '';
let autoReloadTimer = 0;

function scheduleReload(buildId: string): void {
  if (autoReloadTimer) return;
  try {
    if (sessionStorage.getItem('polis:auto-reloaded') === buildId) return;
  } catch { return; }
  autoReloadTimer = window.setTimeout(() => {
    autoReloadTimer = 0;
    if (document.hidden || document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) {
      scheduleReload(buildId);
      return;
    }
    try { sessionStorage.setItem('polis:auto-reloaded', buildId); } catch { return; }
    reload();
  }, 8000);
}

function readBuildId(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="build-id"]');
  return meta?.content ?? '';
}

function indicator(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-version-indicator]');
}

function markUpdateAvailable(buildId: string): void {
  const el = indicator();
  if (!el) return;
  el.dataset.update = 'available';
  const label = el.querySelector<HTMLElement>('[data-version-label]');
  if (label) label.textContent = 'Доступно обновление';
  const button = el.querySelector<HTMLElement>('[data-version-reload]');
  if (button) {
    button.hidden = false;
    button.dataset.buildId = buildId;
  }
}

function reload(): void {
  // Состояние сохраняется само: аудитория в localStorage, фильтры в URL.
  // Прокрутку восстанавливаем после перезагрузки.
  try {
    sessionStorage.setItem('polis:restore-scroll', String(window.scrollY));
  } catch {
    /* не критично */
  }
  location.reload();
}

function alreadyNotified(buildId: string): boolean {
  if (notifiedBuild === buildId) return true;
  try {
    return sessionStorage.getItem(NOTIFIED_KEY) === buildId;
  } catch {
    return false;
  }
}

function rememberNotified(buildId: string): void {
  notifiedBuild = buildId;
  try {
    sessionStorage.setItem(NOTIFIED_KEY, buildId);
  } catch {
    /* не критично */
  }
}

function notify(buildId: string): void {
  markUpdateAvailable(buildId);
  if (alreadyNotified(buildId)) return;
  rememberNotified(buildId);

  void import('./toast')
    .then(({ toast }) => {
      toast.info('Доступна новая версия сайта', {
        id: 'update',
        description: 'Страница автоматически обновится через несколько секунд. Фильтры и позиция сохранятся.',
        duration: 12000,
        action: {
          label: 'Обновить',
          onClick: reload,
          closeOnClick: false,
        },
      });
    })
    .catch(() => {
      // Если чанк уведомлений не загрузился, индикатор обновления всё равно доступен.
    });
}

async function check(): Promise<void> {
  if (document.hidden) return;
  const now = Date.now();
  if (now - lastCheck < MIN_RETURN_GAP_MS) return;
  lastCheck = now;

  if (!currentBuildId) currentBuildId = readBuildId();
  if (!currentBuildId) return;

  try {
    const response = await fetch('/version.json', {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return;
    const data = (await response.json()) as { buildId?: string };
    if (!data.buildId || data.buildId === currentBuildId) return;

    pendingBuild = data.buildId;
    scheduleReload(data.buildId);
    notify(data.buildId);
  } catch {
    // Нет сети или version.json недоступен — молча ждём следующей проверки.
  }
}

function restoreScroll(): void {
  let value: string | null = null;
  try {
    value = sessionStorage.getItem('polis:restore-scroll');
    if (value) sessionStorage.removeItem('polis:restore-scroll');
  } catch {
    return;
  }
  const y = Number(value);
  if (!Number.isFinite(y) || y <= 0) return;
  // Ждём отрисовки, чтобы высота документа уже была корректной.
  requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }));
}

export function initVersion(): void {
  currentBuildId = readBuildId();
  restoreScroll();

  // Кнопка в подвале и кнопка в уведомлении ведут к одному действию.
  document.addEventListener('click', (event) => {
    const target = (event.target as Element | null)?.closest('[data-version-reload]');
    if (!target) return;
    event.preventDefault();
    reload();
  });

  // Первая проверка — после того как страница отрисовалась.
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => void check());
  } else {
    window.setTimeout(() => void check(), 1200);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void check();
  });

  window.setInterval(() => {
    if (!document.hidden) void check();
  }, CHECK_INTERVAL_MS);

  // Полезно для отладки и тестов: какой buildId считает активным эта вкладка.
  (window as unknown as { __polisBuild?: string }).__polisBuild = currentBuildId;
  (window as unknown as { __polisPendingBuild?: () => string }).__polisPendingBuild = () =>
    pendingBuild;
}
