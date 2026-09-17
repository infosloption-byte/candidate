import { useMemo } from 'react';
import { useInterviewContext } from '../context/useInterviewContext';
import { addDays, buildCalendarDays, buildCalendarEntries, fromIsoDate, parseInterviewDate, startOfWeek, toIsoDate } from '../services/interviewCalendar';
import type { InterviewCalendarDay, InterviewCalendarEntry, InterviewCalendarView } from '../types/interview';

interface UseInterviewCalendarResult {
  view: InterviewCalendarView;
  focusedDate: Date;
  days: InterviewCalendarDay[];
  entries: InterviewCalendarEntry[];
  entriesByDay: Map<string, InterviewCalendarEntry[]>;
  conflictCount: number;
  setView: (view: InterviewCalendarView) => void;
  setDate: (value: string) => void;
  move: (direction: -1 | 1) => void;
  goToday: () => void;
}

export const useInterviewCalendar = (): UseInterviewCalendarResult => {
  const { state, dispatch } = useInterviewContext();
  const focusedDate = useMemo(() => fromIsoDate(state.calendarDate), [state.calendarDate]);
  const days = useMemo(() => buildCalendarDays(state.calendarDate, state.calendarView), [state.calendarDate, state.calendarView]);
  const entries = useMemo(() => buildCalendarEntries(state.interviews), [state.interviews]);

  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, InterviewCalendarEntry[]>();
    entries.forEach((entry) => {
      const parsed = parseInterviewDate(entry.interview.date, entry.interview.time);
      if (!parsed) return;
      const calendarDay = toIsoDate(parsed);
      const existing = grouped.get(calendarDay) ?? [];
      existing.push(entry);
      grouped.set(calendarDay, existing);
    });
    return grouped;
  }, [entries]);

  const conflictCount = useMemo(() => {
    const visibleDates = new Set(days.map((day) => day.isoDate));
    return entries.filter((entry) => visibleDates.has(toIsoDate(parseInterviewDate(entry.interview.date, entry.interview.time) ?? new Date(0))) && entry.conflicts.length > 0).length;
  }, [days, entries]);

  return {
    view: state.calendarView,
    focusedDate,
    days,
    entries,
    entriesByDay,
    conflictCount,
    setView: (view) => dispatch({ type: 'SET_CALENDAR_VIEW', value: view }),
    setDate: (value) => dispatch({ type: 'SET_CALENDAR_DATE', value }),
    move: (direction) => {
      const base = state.calendarView === 'week' ? startOfWeek(focusedDate) : focusedDate;
      const next = addDays(base, state.calendarView === 'week' ? 7 * direction : direction);
      dispatch({ type: 'SET_CALENDAR_DATE', value: toIsoDate(next) });
    },
    goToday: () => dispatch({ type: 'SET_CALENDAR_DATE', value: toIsoDate(new Date()) }),
  };
};
