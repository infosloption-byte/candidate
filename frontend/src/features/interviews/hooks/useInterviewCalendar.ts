import { useMemo } from 'react';
import { useInterviewContext } from '../context/useInterviewContext';
import { addDays, buildCalendarDays, buildCalendarEntries, fromIsoDate, startOfWeek, toIsoDate } from '../services/interviewCalendar';
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
      const interviewDay = entry.interview.date;
      const parsed = new Date(entry.interview.date);
      const calendarDay = Number.isNaN(parsed.getTime()) ? null : toIsoDate(parsed);
      if (calendarDay) {
        const existing = grouped.get(calendarDay) ?? [];
        existing.push(entry);
        grouped.set(calendarDay, existing);
        return;
      }
      const matchingDay = days.find((day) => day.label.startsWith(interviewDay.split(' ')[0]));
      if (matchingDay) {
        const existing = grouped.get(matchingDay.isoDate) ?? [];
        existing.push(entry);
        grouped.set(matchingDay.isoDate, existing);
      }
    });
    return grouped;
  }, [days, entries]);

  const conflictCount = useMemo(() => entries.filter((entry) => entry.conflicts.length > 0).length, [entries]);

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
