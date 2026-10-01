import { useEffect } from 'react';

/**
 * Locks the page scroll while any popup is open.
 *
 * The app scrolls inside <main>, not on <body>, so locking the body does nothing. The lock is a
 * counter on <html> (`data-scroll-locked`) that index.css turns into `overflow: hidden` on the
 * scroll container. A counter means stacked popups (e.g. a confirm dialog over a form) release the
 * lock only when the last one closes, instead of the first one unlocking the page under the rest.
 */
let lockCount = 0;

const apply = () => {
  if (typeof document === 'undefined') return;
  if (lockCount > 0) document.documentElement.setAttribute('data-scroll-locked', 'true');
  else document.documentElement.removeAttribute('data-scroll-locked');
};

export const useScrollLock = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return;
    lockCount += 1;
    apply();
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      apply();
    };
  }, [enabled]);
};
