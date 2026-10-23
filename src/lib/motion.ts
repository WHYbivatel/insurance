/**
 * Слой анимаций.
 *
 * Появление секций — через IntersectionObserver и CSS-переходы: это дешевле,
 * чем JS-анимация на каждый блок, и корректно отключается при
 * prefers-reduced-motion. Motion Mini используется там, где нужен контроль
 * над завершением (уведомления), — см. lib/toast.ts.
 */

const REVEAL_SELECTOR = '[data-reveal], .hero-stagger';
const MAX_STAGGER_MS = 200;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Показывает всё сразу — используется как безопасный фолбэк. */
function revealImmediately(nodes: Element[]): void {
  for (const node of nodes) node.classList.add('is-visible');
}

export function initReveal(): void {
  const nodes = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
  if (nodes.length === 0) return;

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    revealImmediately(nodes);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
        // После появления снимаем will-change.
        window.setTimeout(() => entry.target.classList.add('is-done'), 500);
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.06 }
  );

  for (const node of nodes) observer.observe(node);
}

/**
 * Короткое появление карточек после фильтрации.
 * Задержка ограничена 200 мс, чтобы длинный каталог не «сыпался» очередью.
 */
export function flashCards(cards: HTMLElement[]): void {
  if (prefersReducedMotion() || cards.length === 0) return;

  const step = Math.min(18, MAX_STAGGER_MS / cards.length);
  cards.forEach((card, index) => {
    card.classList.remove('is-entering');
    // Перезапуск анимации без лишних reflow на каждом элементе.
    void card.offsetWidth;
    card.style.animationDelay = `${Math.round(index * step)}ms`;
    card.classList.add('is-entering');
    window.setTimeout(
      () => {
        card.classList.remove('is-entering');
        card.style.animationDelay = '';
      },
      180 + index * step
    );
  });
}
