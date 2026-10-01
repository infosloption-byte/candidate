import { useEffect, useRef, type RefObject } from 'react';
import { useScrollLock } from './useScrollLock';

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
].join(', ');

/**
 * Open traps, oldest first. Only the top one reacts to Escape / Tab, so a confirm dialog opened over
 * a form closes alone on Escape and keeps focus inside itself, instead of every open popup closing
 * and fighting over Tab at once.
 */
const trapStack: symbol[] = [];

export const useFocusTrap = <T extends HTMLElement = HTMLElement>({ enabled, onEscape, restoreFocusRef }: UseFocusTrapOptions): RefObject<T | null> => {
  const containerRef = useRef<T | null>(null);
  const onEscapeRef = useRef(onEscape);

  // Every trapped popup is modal, so it also freezes the page behind it.
  useScrollLock(enabled);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = Symbol('focus-trap');
    trapStack.push(id);
    const isTop = () => trapStack[trapStack.length - 1] === id;
    const focusFirst = () => {
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      (focusable[0] ?? container).focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current?.();
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
      if (!first || !last) return;
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
      const index = trapStack.indexOf(id);
      if (index !== -1) trapStack.splice(index, 1);
      (restoreFocusRef?.current ?? previousFocus)?.focus();
    };
  }, [enabled, restoreFocusRef]);

  return containerRef;
};
