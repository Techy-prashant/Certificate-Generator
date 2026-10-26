/**
 * Smooth scrolling utility with customizable duration and gentle ease-in-out easing.
 * Provides a fluid, slow, and polished animated scroll to elements or positions.
 */

export interface SmoothScrollOptions {
  /** Offset in pixels from the top of the viewport (e.g., to account for sticky navigation). Default: 80 */
  offset?: number;
  /** Duration in milliseconds of the scroll animation. Default: 800 */
  duration?: number;
  /** Delay in milliseconds before initiating scroll (allows DOM height expansion to settle). Default: 60 */
  delay?: number;
}

/**
 * Standard cubic easeInOut easing function for smooth acceleration and gentle landing.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

let activeAnimationId: number | null = null;
let activeCancelCallback: (() => void) | null = null;

/**
 * Smoothly scrolls the window to targetY over a given duration.
 * Automatically cancels if the user manually scrolls with mouse wheel, touch, or keys.
 */
export function smoothScrollTo(targetY: number, duration: number = 800): Promise<void> {
  // Cancel any existing active scroll animation
  if (activeCancelCallback) {
    activeCancelCallback();
  }
  if (activeAnimationId !== null) {
    cancelAnimationFrame(activeAnimationId);
    activeAnimationId = null;
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    const startY = window.pageYOffset || document.documentElement.scrollTop;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clampedTargetY = Math.max(0, Math.min(targetY, maxScroll));
    const difference = clampedTargetY - startY;

    // If already at or very close to target position, resolve immediately
    if (Math.abs(difference) < 4) {
      resolve();
      return;
    }

    const startTime = performance.now();
    let isCancelled = false;

    const cancel = () => {
      isCancelled = true;
      if (activeAnimationId !== null) {
        cancelAnimationFrame(activeAnimationId);
        activeAnimationId = null;
      }
      activeCancelCallback = null;
      cleanup();
      resolve();
    };

    activeCancelCallback = cancel;

    const cleanup = () => {
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchmove', cancel);
      window.removeEventListener('keydown', handleKey);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', 'Home', 'End'].includes(e.code)) {
        cancel();
      }
    };

    window.addEventListener('wheel', cancel, { passive: true, once: true });
    window.addEventListener('touchmove', cancel, { passive: true, once: true });
    window.addEventListener('keydown', handleKey, { passive: true, once: true });

    function step(currentTime: number) {
      if (isCancelled) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, Math.round(startY + difference * ease));

      if (progress < 1) {
        activeAnimationId = requestAnimationFrame(step);
      } else {
        activeAnimationId = null;
        activeCancelCallback = null;
        cleanup();
        resolve();
      }
    }

    activeAnimationId = requestAnimationFrame(step);
  });
}

/**
 * Smoothly scrolls an element into comfortable view with a header offset.
 * Waits for a brief delay to allow React state expansion and DOM layout to commit.
 */
export function smoothScrollToElement(
  elementOrId: HTMLElement | string,
  options: SmoothScrollOptions = {}
): Promise<void> {
  const { offset = 80, duration = 800, delay = 60 } = options;

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    setTimeout(() => {
      const el =
        typeof elementOrId === 'string'
          ? document.getElementById(elementOrId)
          : elementOrId;

      if (!el) {
        resolve();
        return;
      }

      const rect = el.getBoundingClientRect();
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = currentScrollY + rect.top - offset;

      smoothScrollTo(targetY, duration).then(resolve);
    }, delay);
  });
}
