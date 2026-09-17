import { useEffect, useRef, type RefObject } from 'react';

interface UseFocusTrapOptions {
  enabled: boolean;
  onEscape?: () => void;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const useFocusTrap = ({ enabled, onEscape, restoreFocusRef }: UseFocusTrapOptions): RefObject<HTMLElement | null> => {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFirst = () => {
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      (focusable[0] ?? container).focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
        return;
      }
      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    focusFirst();
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const restoreTarget = restoreFocusRef?.current ?? previousFocus;
      restoreTarget?.focus();
    };
  }, [enabled, onEscape, restoreFocusRef]);

  return containerRef;
};
