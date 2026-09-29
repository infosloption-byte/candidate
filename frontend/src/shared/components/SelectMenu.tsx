import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface SelectMenuOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type SelectMenuSize = 'sm' | 'md';

interface SelectMenuProps {
  value: string;
  options: SelectMenuOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Classes for the wrapper element (width, margin…). */
  className?: string;
  /**
   * Replaces the default trigger appearance (border, colours, padding, text size).
   * Use it for surfaces with their own theme, such as the public marketing pages.
   */
  triggerClassName?: string;
  disabled?: boolean;
  size?: SelectMenuSize;
  /** Minimum width of the options panel; the panel is never narrower than the trigger. */
  minPanelWidth?: number;
}

interface PanelPosition {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

const MAX_PANEL_HEIGHT = 288;
const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;

const triggerAppearance: Record<SelectMenuSize, string> = {
  sm: 'min-h-9 gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
  md: 'min-h-10 gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
};

const rowHeight: Record<SelectMenuSize, number> = { sm: 34, md: 38 };

/**
 * Modern replacement for the native <select>.
 *
 * The options panel is rendered in a portal with fixed positioning, so it can never be
 * clipped or covered by a parent with `overflow: hidden`, a card, a table wrapper or a modal.
 * It flips above the trigger when there is no room below, follows scroll/resize, and supports
 * keyboard navigation (arrows, Home/End, type-ahead, Enter/Space, Escape).
 */
export const SelectMenu = ({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  ariaLabel,
  className = '',
  triggerClassName,
  disabled = false,
  size = 'md',
  minPanelWidth,
}: SelectMenuProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const typeahead = useRef<{ text: string; timer: number }>({ text: '', timer: 0 });
  const reveal = useRef<'center' | 'nearest' | null>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);
  const panelMinWidth = minPanelWidth ?? (size === 'sm' ? 112 : 192);

  const computePosition = useCallback((): PanelPosition | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedHeight = Math.min(MAX_PANEL_HEIGHT, options.length * rowHeight[size] + 12);
    const spaceBelow = viewportHeight - rect.bottom - TRIGGER_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - TRIGGER_GAP - VIEWPORT_MARGIN;
    const openAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const available = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(96, Math.min(MAX_PANEL_HEIGHT, available));
    const width = Math.min(Math.max(rect.width, panelMinWidth), viewportWidth - VIEWPORT_MARGIN * 2);
    const isRtl = document.documentElement.dir === 'rtl';
    const preferredLeft = isRtl ? rect.right - width : rect.left;
    const left = Math.min(Math.max(VIEWPORT_MARGIN, preferredLeft), viewportWidth - width - VIEWPORT_MARGIN);

    return openAbove
      ? { left, width, maxHeight, bottom: viewportHeight - rect.top + TRIGGER_GAP }
      : { left, width, maxHeight, top: rect.bottom + TRIGGER_GAP };
  }, [options.length, panelMinWidth, size]);

  const findEnabled = (start: number, step: 1 | -1): number => {
    for (let index = start; index >= 0 && index < options.length; index += step) {
      if (!options[index]?.disabled) return index;
    }
    return -1;
  };

  const openMenu = () => {
    if (disabled) return;
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    reveal.current = 'center';
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : findEnabled(0, 1));
    setPosition(computePosition());
    setOpen(true);
  };

  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const selectIndex = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (option.value !== value) onChange(option.value);
    closeMenu();
  };

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  // Keep the panel attached to the trigger while the page scrolls or resizes.
  useEffect(() => {
    if (!open) return;

    const reposition = (event?: Event) => {
      if (event?.target instanceof Node && panelRef.current?.contains(event.target)) return;
      setPosition(computePosition());
    };

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, computePosition]);

  // Move focus into the listbox so arrow keys work like a native select.
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Keep the highlighted option visible. Only keyboard navigation and opening scroll the list;
  // hovering must not, otherwise the option under the pointer would keep changing.
  useEffect(() => {
    const mode = reveal.current;
    if (!open || activeIndex < 0 || !mode) return;
    reveal.current = null;
    const panel = panelRef.current;
    const option = optionRefs.current[activeIndex];
    if (!panel || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (mode === 'center') {
      panel.scrollTop = Math.max(0, top - (panel.clientHeight - option.offsetHeight) / 2);
    } else if (top < panel.scrollTop) {
      panel.scrollTop = Math.max(0, top - 6);
    } else if (bottom > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = bottom - panel.clientHeight + 6;
    }
  }, [open, activeIndex]);

  useEffect(() => {
    const state = typeahead.current;
    return () => window.clearTimeout(state.timer);
  }, []);

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open) {
      event.preventDefault();
      openMenu();
    }
  };

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Tab keeps bubbling so focus traps and native tabbing still see it after focus returns to the trigger.
    if (event.key === 'Tab') {
      closeMenu();
      return;
    }

    // Everything else stays inside the menu: Escape must not close a parent modal,
    // and Enter/Space must not activate a parent card.
    event.stopPropagation();

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeMenu();
        return;
      case 'ArrowDown':
        event.preventDefault();
        reveal.current = 'nearest';
        setActiveIndex((current) => {
          const next = findEnabled(current + 1, 1);
          return next >= 0 ? next : current;
        });
        return;
      case 'ArrowUp':
        event.preventDefault();
        reveal.current = 'nearest';
        setActiveIndex((current) => {
          const next = findEnabled(current - 1, -1);
          return next >= 0 ? next : current;
        });
        return;
      case 'Home':
        event.preventDefault();
        reveal.current = 'nearest';
        setActiveIndex(findEnabled(0, 1));
        return;
      case 'End':
        event.preventDefault();
        reveal.current = 'nearest';
        setActiveIndex(findEnabled(options.length - 1, -1));
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) selectIndex(activeIndex);
        return;
      default:
        break;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const state = typeahead.current;
      window.clearTimeout(state.timer);
      state.text += event.key.toLowerCase();
      state.timer = window.setTimeout(() => { state.text = ''; }, 600);
      const match = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(state.text));
      if (match >= 0) {
        reveal.current = 'nearest';
        setActiveIndex(match);
      }
    }
  };

  const optionPadding = size === 'sm' ? 'py-2' : 'py-2.5';

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`flex w-full items-center justify-between text-start font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName ?? triggerAppearance[size]} ${open && !triggerClassName ? 'border-cyan-500 ring-2 ring-cyan-100' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) closeMenu(false);
          else openMenu();
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'opacity-50'}`}>
          {selected?.label ?? placeholder}
        </span>
        <Icon
          name="chevron-down"
          size={size === 'sm' ? 14 : 16}
          strokeWidth={2}
          className={`shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !disabled && position && typeof document !== 'undefined' && createPortal(
        <>
          {/* Transparent catcher: an outside click only closes the menu instead of hitting whatever is underneath. */}
          <div
            aria-hidden="true"
            data-select-menu-panel=""
            className="fixed inset-0 z-[10049]"
            onClick={(event) => {
              event.stopPropagation();
              closeMenu(false);
            }}
          />
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            data-select-menu-panel=""
            className="fixed z-[10050] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-slate-950/5 outline-none"
            style={{
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              top: position.top,
              bottom: position.bottom,
            }}
            onKeyDown={handlePanelKeyDown}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.preventDefault()}
          >
            {options.length === 0 && (
              <p className="px-3 py-2.5 text-xs font-semibold text-slate-400">No options available</p>
            )}
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <div
                  key={option.value}
                  id={`${listboxId}-option-${index}`}
                  ref={(node) => { optionRefs.current[index] = node; }}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 ${optionPadding} text-start text-xs font-semibold transition ${option.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${isSelected ? 'bg-cyan-50 text-cyan-800' : isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                  onMouseEnter={() => { if (!option.disabled) setActiveIndex(index); }}
                  onClick={() => selectIndex(index)}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Icon name="check" size={16} strokeWidth={2} className="shrink-0 text-cyan-600" />}
                </div>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};
