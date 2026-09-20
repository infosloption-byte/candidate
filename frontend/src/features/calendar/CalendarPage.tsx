import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import type { Candidate, Interview, InterviewStatus, InterviewType, Job, User, UserRole } from '../../domain/types';
import { apiFetch } from '../../shared/lib/api';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';

interface Props {
  role: UserRole;
  onOpenInterview?: (interviewId: string) => void;
}

type CalendarMode = 'month' | 'agenda';

interface CalendarEvent {
  id: string;
  kind: 'interview';
  title: string;
  date: Date;
  interview: Interview;
}

const statusLabel = (value: string) => value.replaceAll('_', ' ');

const dateKey = (date: Date): string =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const startOfCalendar = (date: Date): Date => {
  const first = startOfMonth(date);
  const day = first.getDay();
  const result = new Date(first);
  result.setDate(first.getDate() - day);
  return startOfDay(result);
};

const endOfCalendar = (date: Date): Date => {
  const last = endOfMonth(date);
  const day = last.getDay();
  const result = new Date(last);
  result.setDate(last.getDate() + (6 - day));
  return startOfDay(result);
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatMonth = (date: Date): string =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const formatTime = (date: Date): string =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const formatDate = (date: Date): string =>
  date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const isSameDay = (left: Date, right: Date): boolean => dateKey(left) === dateKey(right);

const isPast = (date: Date): boolean => date.getTime() < startOfDay(new Date()).getTime();

const isToday = (date: Date): boolean => isSameDay(date, new Date());

const statusTone = (status: InterviewStatus): string => {
  if (status === 'COMPLETED') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (status === 'CANCELLED') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'NO_SHOW') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'IN_PROGRESS') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  return 'border-indigo-200 bg-indigo-50 text-indigo-700';
};

const buildDevInterviews = (
  interviews: Interview[],
  candidates: Candidate[],
  jobs: Job[],
  users: User[],
): Interview[] =>
  interviews.map((interview) => ({
    ...interview,
    candidate: interview.candidate ?? candidates.find((candidate) => candidate.id === interview.candidateId),
    job: interview.job ?? (interview.jobId ? jobs.find((job) => job.id === interview.jobId) : null),
    panel: interview.panel ?? interview.panelUserIds.map((userId) => {
      const user = users.find((item) => item.id === userId);
      return user ? { userId, assignedAt: interview.createdAt ?? interview.scheduledAt, user } : null;
    }).filter((item): item is NonNullable<typeof item> => Boolean(item)),
  }));

export const CalendarPage = ({ role, onOpenInterview }: Props) => {
  const { developmentMode, user } = useAuth();
  const { state } = useRecruitment();
  const [interviews, setInterviews] = useState<Interview[]>(developmentMode ? buildDevInterviews(state.interviews, state.candidates, state.jobs, state.users) : []);
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [mode, setMode] = useState<CalendarMode>('month');
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<InterviewType | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (developmentMode) {
      setInterviews(buildDevInterviews(state.interviews, state.candidates, state.jobs, state.users));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch<Interview[]>('/interviews')
      .then((result) => {
        if (!cancelled) setInterviews(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load calendar events.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentMode, role, user?.id, state.interviews, state.candidates, state.jobs, state.users]);

  const events = useMemo<CalendarEvent[]>(() => {
    const query = search.trim().toLowerCase();

    return interviews
      .filter((interview) => !statusFilter || interview.status === statusFilter)
      .filter((interview) => !typeFilter || interview.type === typeFilter)
      .filter((interview) => {
        if (!query) return true;
        const record = {
          interview,
          candidate: interview.candidate,
          job: interview.job,
          panel: interview.panel,
        };
        return JSON.stringify(record).toLowerCase().includes(query);
      })
      .map((interview) => ({
        id: interview.id,
        kind: 'interview' as const,
        title: interview.candidate?.name ?? interview.candidateId,
        date: new Date(interview.scheduledAt),
        interview,
      }))
      .sort((left, right) => left.date.getTime() - right.date.getTime());
  }, [interviews, search, statusFilter, typeFilter]);

  const calendarStart = useMemo(() => startOfCalendar(visibleMonth), [visibleMonth]);
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let current = calendarStart;
    const end = endOfCalendar(visibleMonth);

    while (current.getTime() <= end.getTime()) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [calendarStart, visibleMonth]);

  const today = startOfDay(new Date());
  const summary = useMemo(() => {
    const past = events.filter((event) => isPast(event.date) && !isToday(event.date)).length;
    const todayCount = events.filter((event) => isToday(event.date)).length;
    const upcoming = events.filter((event) => event.date.getTime() >= addDays(today, 1).getTime()).length;
    const currentMonth = events.filter((event) => event.date.getFullYear() === visibleMonth.getFullYear() && event.date.getMonth() === visibleMonth.getMonth()).length;
    return { past, today: todayCount, upcoming, currentMonth };
  }, [events, today, visibleMonth]);

  const agendaEvents = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    return events.filter((event) => event.date >= monthStart && event.date <= new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999));
  }, [events, visibleMonth]);

  const goToToday = () => {
    setVisibleMonth(startOfMonth(new Date()));
  };

  const moveMonth = (delta: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
  };

  return (
    <section className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'ADMIN' ? 'System schedule' : role === 'AGENCY' ? 'Agency schedule' : role === 'INTERVIEWER' ? 'My interview schedule' : 'My recruitment schedule'}
        title="Calendar"
        description={
          role === 'ADMIN'
            ? 'System-wide interview calendar with past, current and upcoming activity.'
            : role === 'AGENCY'
              ? 'All interviews belonging to your agency, including completed and upcoming schedules.'
              : role === 'INTERVIEWER'
                ? 'Only interviews assigned to your panel, including completed and upcoming schedules.'
                : 'Your scheduled interview activity in one calendar.'
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Past', summary.past, 'Historical events'],
          ['Today', summary.today, 'Today’s schedule'],
          ['Upcoming', summary.upcoming, 'Future events'],
          [formatMonth(visibleMonth), summary.currentMonth, 'Visible month'],
        ].map(([labelText, count, helper]) => (
          <Card key={String(labelText)} className="p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{labelText}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{count}</p>
            <p className="mt-1 text-[10px] text-slate-400">{helper}</p>
          </Card>
        ))}
      </div>

      <Card className="shrink-0 p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={goToToday}>Today</Button>
            <button type="button" aria-label="Previous month" className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => moveMonth(-1)}>‹</button>
            <button type="button" aria-label="Next month" className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={() => moveMonth(1)}>›</button>
            <h2 className="ml-1 text-base font-black text-slate-950 sm:text-lg">{formatMonth(visibleMonth)}</h2>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="field-input min-w-0 sm:w-64"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search candidate, passport, job or interviewer…"
              aria-label="Search calendar"
            />
            <select className="field-input sm:w-36" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InterviewStatus | '')}>
              <option value="">All status</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No show</option>
            </select>
            <select className="field-input sm:w-36" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as InterviewType | '')}>
              <option value="">All types</option>
              <option value="SCREENING">Screening</option>
              <option value="TECHNICAL">Technical</option>
              <option value="PRACTICAL">Practical</option>
              <option value="FINAL">Final</option>
            </select>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(['month', 'agenda'] as CalendarMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={'rounded-lg px-3 py-2 text-[10px] font-black capitalize ' + (mode === item ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-700')}
                >
                  {item}
                </button>
              ))}
            </div>
            {(search || statusFilter || typeFilter) && <Button size="sm" variant="secondary" onClick={clearFilters}>Clear</Button>}
          </div>
        </div>
      </Card>

      {loading && <StateMessage kind="loading" title="Loading calendar" description="Fetching role-specific interview schedules." />}
      {error && <StateMessage kind="error" title="Calendar unavailable" description={error} />}

      {!loading && !error && mode === 'month' && (
        <Card className="shrink-0 overflow-visible p-0">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-2 py-2.5 text-center text-[9px] font-black uppercase tracking-wider text-slate-400 sm:px-3">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 overflow-visible" style={{ gridTemplateRows: `repeat(${calendarDays.length / 7}, minmax(120px, 1fr))` }}>
            {calendarDays.map((day) => {
              const dayEvents = events.filter((event) => isSameDay(event.date, day));
              const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
              const dayToday = isToday(day);

              return (
                <div
                  key={dateKey(day)}
                  className={'min-h-[120px] border-b border-r border-slate-100 p-1.5 sm:min-h-[136px] sm:p-2 ' + (outsideMonth ? 'bg-slate-50/60' : 'bg-white') + (dayToday ? ' ring-2 ring-inset ring-cyan-100' : '')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={'grid size-7 place-items-center rounded-full text-[11px] font-black ' + (dayToday ? 'bg-cyan-700 text-white' : outsideMonth ? 'text-slate-300' : 'text-slate-500')}>{day.getDate()}</span>
                    {dayEvents.length > 0 && <span className="text-[9px] font-bold text-slate-300">{dayEvents.length}</span>}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 4).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        title={event.title}
                        onClick={() => onOpenInterview?.(event.interview.id)}
                        className={'w-full rounded-lg border px-1.5 py-1 text-left transition hover:-translate-y-px hover:shadow-sm ' + statusTone(event.interview.status)}
                      >
                        <p className="truncate text-[9px] font-black">{formatTime(event.date)} · {event.title}</p>
                        <p className="truncate text-[8px] opacity-75">{statusLabel(event.interview.type)} · {event.interview.job?.title ?? 'General interview'}</p>
                      </button>
                    ))}
                    {dayEvents.length > 4 && (
                      <button type="button" className="w-full rounded-lg bg-slate-100 px-2 py-1 text-left text-[9px] font-black text-slate-500 hover:bg-slate-200" onClick={() => setMode('agenda')}>
                        + {dayEvents.length - 4} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!loading && !error && mode === 'agenda' && (
        <Card className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-950">{formatMonth(visibleMonth)} agenda</h2>
              <p className="mt-1 text-xs text-slate-500">{agendaEvents.length} event(s) in this month.</p>
            </div>
          </div>

          {!agendaEvents.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-xs text-slate-400">No matching events in this month.</div>
          )}

          <div className="space-y-3">
            {agendaEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-slate-950">{event.title}</p>
                      <StatusPill value={event.interview.status} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{statusLabel(event.interview.type)}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-cyan-700">{event.interview.job?.title ?? 'General interview'}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatDate(event.date)} · {formatTime(event.date)} · {event.interview.durationMins} min · {event.interview.location ?? 'Location not specified'}</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-400">View details →</span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}


    </section>
  );
};
