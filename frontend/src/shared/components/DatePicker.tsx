import { useEffect, useMemo, useRef, useState } from 'react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  max?: string;
  min?: string;
  showTime?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const pad = (value: number): string => String(value).padStart(2, '0');

const parseDateValue = (value: string): Date | null => {
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseTimeValue = (value: string): { hour: number; minute: number } => {
  const match = /T(\\d{2}):(\\d{2})/.exec(value);
  if (!match) return { hour: 9, minute: 0 };
  return {
    hour: Math.min(23, Math.max(0, Number(match[1]))),
    minute: Math.min(59, Math.max(0, Number(match[2]))),
  };
};

const dateKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateTimeKey = (date: Date, hour: number, minute: number): string =>
  `${dateKey(date)}T${pad(hour)}:${pad(minute)}`;

const compareDateOnly = (left: Date, right: Date): number => {
  const a = new Date(left.getFullYear(), left.getMonth(), left.getDate()).getTime();
  const b = new Date(right.getFullYear(), right.getMonth(), right.getDate()).getTime();
  return a - b;
};

const formatDisplayValue = (value: string, showTime: boolean): string => {
  const date = parseDateValue(value);
  if (!date) return '';

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);

  if (!showTime) return dateLabel;

  const { hour, minute } = parseTimeValue(value);
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour, minute));

  return `${dateLabel} · ${timeLabel}`;
};

const monthYearLabel = (date: Date): string =>
  new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);

const isSameDay = (left: Date | null, right: Date): boolean =>
  Boolean(left) &&
  left!.getFullYear() === right.getFullYear() &&
  left!.getMonth() === right.getMonth() &&
  left!.getDate() === right.getDate();

export const DatePicker = ({
  value,
  onChange,
  placeholder,
  max,
  min,
  showTime = false,
  disabled = false,
  className = '',
  ariaLabel,
}: DatePickerProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDateValue(value) ?? new Date());
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0, width: 336 });
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const minimumDate = useMemo(() => (min ? parseDateValue(min) : null), [min]);
  const maximumDate = useMemo(() => (max ? parseDateValue(max) : null), [max]);
  const selectedTime = useMemo(() => parseTimeValue(value), [value]);

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(336, window.innerWidth - 24);
    const panelHeight = showTime ? 500 : 414;
    const openBelow = window.innerHeight - rect.bottom >= panelHeight + 16;
    const top = openBelow
      ? rect.bottom + 8
      : Math.max(12, rect.top - panelHeight - 8);
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - width - 12),
    );
    setPanelPosition({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const handleOutsidePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handleReposition = () => updatePanelPosition();

    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, showTime]);

  useEffect(() => {
    if (!open) {
      setViewDate(parseDateValue(value) ?? new Date());
    }
  }, [open, value]);

  const calendarDays = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [viewDate]);

  const isSelectable = (date: Date): boolean => {
    if (minimumDate && compareDateOnly(date, minimumDate) < 0) return false;
    if (maximumDate && compareDateOnly(date, maximumDate) > 0) return false;
    return true;
  };

  const applyDate = (date: Date) => {
    if (!isSelectable(date)) return;
    const nextValue = showTime
      ? dateTimeKey(date, selectedTime.hour, selectedTime.minute)
      : dateKey(date);
    onChange(nextValue);
    if (!showTime) setOpen(false);
  };

  const applyTime = (hour: number, minute: number) => {
    const date = selectedDate ?? new Date();
    onChange(dateTimeKey(date, hour, minute));
  };

  const setToday = () => {
    const today = new Date();
    if (!isSelectable(today)) return;
    if (showTime) {
      const now = new Date();
      const roundedMinute = Math.ceil(now.getMinutes() / 5) * 5;
      const next = roundedMinute === 60
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinute);
      onChange(dateTimeKey(today, next.getHours(), next.getMinutes()));
      setViewDate(today);
      return;
    }
    onChange(dateKey(today));
    setViewDate(today);
    setOpen(false);
  };

  const clearValue = () => {
    onChange('');
    setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const openPicker = () => {
    if (disabled) return;
    setViewDate(selectedDate ?? new Date());
    setOpen(true);
    window.requestAnimationFrame(updatePanelPosition);
  };

  const hours = Array.from({ length: 12 }, (_, index) => index + 1);
  const minutes = Array.from({ length: 12 }, (_, index) => index * 5);
  const displayHour = selectedTime.hour % 12 || 12;
  const period = selectedTime.hour >= 12 ? 'PM' : 'AM';

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="field-input flex min-h-11 w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
        onClick={openPicker}
        disabled={disabled}
        aria-label={ariaLabel ?? placeholder ?? (showTime ? 'Select date and time' : 'Select date')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? 'truncate text-slate-900' : 'truncate text-slate-400'}>
          {value ? formatDisplayValue(value, showTime) : (placeholder ?? (showTime ? 'Select date & time' : 'Select date'))}
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 text-slate-400">
          <rect x="4" y="5.5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 3.5v4M16 3.5v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="m9 15 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={showTime ? 'Date and time picker' : 'Date picker'}
          className="fixed z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5"
          style={{ top: panelPosition.top, left: panelPosition.left, width: panelPosition.width }}
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                ‹
              </button>
              <div className="min-w-0 text-center">
                <p className="text-sm font-black text-slate-900">{monthYearLabel(viewDate)}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                  {selectedDate ? formatDisplayValue(value, showTime) : 'Choose a date'}
                </p>
              </div>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                ›
              </button>
            </div>
          </div>

          <div className="px-4 pt-3">
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span key={day} className="py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{day.slice(0, 1)}</span>
              ))}
              {calendarDays.map((date) => {
                const inCurrentMonth = date.getMonth() === viewDate.getMonth();
                const selectable = isSelectable(date);
                const selected = isSameDay(selectedDate, date);
                const today = isSameDay(new Date(), date);
                return (
                  <button
                    key={dateKey(date)}
                    type="button"
                    disabled={!selectable}
                    onClick={() => applyDate(date)}
                    className={`grid aspect-square place-items-center rounded-xl text-xs font-bold transition ${selected ? 'bg-cyan-600 text-white shadow-sm' : today ? 'border border-cyan-200 text-cyan-700 hover:bg-cyan-50' : inCurrentMonth ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-50'} disabled:cursor-not-allowed disabled:opacity-30`}
                    aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)}
                    aria-pressed={selected}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {showTime && (
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">Time</p>
                  <p className="text-[10px] text-slate-400">Choose in 5-minute steps.</p>
                </div>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-black text-cyan-700">
                  {String(displayHour).padStart(2, '0')}:{pad(selectedTime.minute)} {period}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  className="field-input h-10 min-w-0 appearance-none bg-white px-2 text-xs"
                  value={displayHour}
                  onChange={(event) => {
                    const nextDisplayHour = Number(event.target.value);
                    const nextHour = period === 'PM'
                      ? (nextDisplayHour === 12 ? 12 : nextDisplayHour + 12)
                      : (nextDisplayHour === 12 ? 0 : nextDisplayHour);
                    applyTime(nextHour, selectedTime.minute);
                  }}
                  aria-label="Hour"
                >
                  {hours.map((hour) => <option key={hour} value={hour}>{pad(hour)}</option>)}
                </select>
                <select
                  className="field-input h-10 min-w-0 appearance-none bg-white px-2 text-xs"
                  value={selectedTime.minute}
                  onChange={(event) => applyTime(selectedTime.hour, Number(event.target.value))}
                  aria-label="Minute"
                >
                  {minutes.map((minute) => <option key={minute} value={minute}>{pad(minute)}</option>)}
                </select>
                <select
                  className="field-input h-10 min-w-0 appearance-none bg-white px-2 text-xs"
                  value={period}
                  onChange={(event) => {
                    const nextPeriod = event.target.value;
                    const nextHour = nextPeriod === 'PM'
                      ? (selectedTime.hour % 12) + 12
                      : selectedTime.hour % 12;
                    applyTime(nextHour === 24 ? 12 : nextHour, selectedTime.minute);
                  }}
                  aria-label="AM or PM"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
            <button type="button" className="text-xs font-extrabold text-cyan-700 hover:text-cyan-800" onClick={setToday}>
              {showTime ? 'Today' : 'Today'}
            </button>
            {value ? (
              <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800" onClick={clearValue}>
                Clear
              </button>
            ) : (
              <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800" onClick={() => setOpen(false)}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
