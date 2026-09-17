import type { Interview, InterviewDecisionHistory, InterviewRescheduleHistory } from '../types/interview';
import { parseInterviewDate } from './interviewCalendar';

export type InterviewHistoryEventKind = 'interview' | 'decision' | 'reschedule';

export interface InterviewHistoryEvent {
  id: string;
  kind: InterviewHistoryEventKind;
  occurredAt: string;
  title: string;
  detail: string;
  meta: string;
  isUndone?: boolean;
}

const scheduledEpoch = (interview: Interview): number => {
  const parsed = parseInterviewDate(interview.date, interview.time);
  return parsed?.getTime() ?? Date.parse(interview.createdAt);
};

const decisionLabel = (value: Interview['decision']['decision']): string => value === 'pending' ? 'Pending' : value.charAt(0).toUpperCase() + value.slice(1);

const formatAuditDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const interviewEvent = (interview: Interview): InterviewHistoryEvent => ({
  id: `interview-${interview.id}`,
  kind: 'interview',
  occurredAt: interview.createdAt,
  title: `${interview.type} interview`,
  detail: `${interview.date} at ${interview.time} · ${interview.durationMinutes} min · ${interview.location}`,
  meta: `${interview.status} · ${interview.interviewers.map((person) => person.name).join(', ') || 'No interviewer'}`,
});

const decisionEvents = (interview: Interview, history: InterviewDecisionHistory[]): InterviewHistoryEvent[] => history.map((item) => ({
  id: item.id,
  kind: 'decision' as const,
  occurredAt: item.changedAt,
  title: `Decision: ${decisionLabel(item.toDecision)}`,
  detail: item.reason ? `${item.reason}${item.note ? ` · ${item.note}` : ''}` : item.note || 'Decision recorded without an additional note.',
  meta: `From ${decisionLabel(item.fromDecision)} · ${formatAuditDate(item.changedAt)}`,
}));

const rescheduleEvents = (history: InterviewRescheduleHistory[]): InterviewHistoryEvent[] => history.map((item) => ({
  id: item.id,
  kind: 'reschedule' as const,
  occurredAt: item.changedAt,
  title: item.undoneAt ? 'Reschedule undone' : 'Interview rescheduled',
  detail: `${item.fromDate} at ${item.fromTime} → ${item.toDate} at ${item.toTime}`,
  meta: item.reason || 'Interview schedule changed',
  isUndone: Boolean(item.undoneAt),
}));

export const buildInterviewHistory = (interviews: Interview[]): InterviewHistoryEvent[] => interviews
  .flatMap((interview) => [
    interviewEvent(interview),
    ...decisionEvents(interview, interview.decisionHistory ?? []),
    ...rescheduleEvents(interview.rescheduleHistory ?? []),
  ])
  .sort((left, right) => {
    const rightTime = Date.parse(right.occurredAt);
    const leftTime = Date.parse(left.occurredAt);
    if (Number.isFinite(rightTime) && Number.isFinite(leftTime)) return rightTime - leftTime;
    return right.occurredAt.localeCompare(left.occurredAt);
  });
