import type { Interview, InterviewCalendarDay, InterviewCalendarEntry, InterviewStatus } from '../types/interview';

const monthIndexes: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const blockingStatuses: InterviewStatus[] = ['scheduled', 'in-progress', 'evaluation'];

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fromIsoDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const buildCalendarDays = (focusedDate: string, view: 'day' | 'week'): InterviewCalendarDay[] => {
  const focus = fromIsoDate(focusedDate);
  const firstDay = view === 'week' ? startOfWeek(focus) : focus;
  const count = view === 'week' ? 7 : 1;
  const todayIso = toIsoDate(new Date());

  return Array.from({ length: count }, (_, index) => {
    const date = addDays(firstDay, index);
    return {
      isoDate: toIsoDate(date),
      date,
      label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
      shortLabel: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      isToday: toIsoDate(date) === todayIso,
    };
  });
};

export const parseInterviewStartMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.max(0, Math.min(1439, (hours * 60) + minutes));
};

export const parseInterviewDate = (dateLabel: string, time: string): Date | null => {
  const match = dateLabel.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = monthIndexes[match[2].toLowerCase()];
  const year = Number(match[3]);
  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const safeHours = Number.isFinite(hours) ? hours : 0;
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  return new Date(year, month, day, safeHours, safeMinutes, 0, 0);
};

const activeInterview = (interview: Interview): boolean => blockingStatuses.includes(interview.status);
const normalizedLocation = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');
const sharesInterviewer = (left: Interview, right: Interview): boolean => {
  const rightIds = new Set(right.interviewers.map((person) => person.id));
  return left.interviewers.some((person) => rightIds.has(person.id));
};

export const interviewOverlaps = (left: Interview, right: Interview): boolean => {
  if (!activeInterview(left) || !activeInterview(right)) return false;
  const leftDate = parseInterviewDate(left.date, left.time);
  const rightDate = parseInterviewDate(right.date, right.time);
  if (!leftDate || !rightDate || toIsoDate(leftDate) !== toIsoDate(rightDate)) return false;
  const leftStart = parseInterviewStartMinutes(left.time);
  const rightStart = parseInterviewStartMinutes(right.time);
  const leftEnd = leftStart + Math.max(15, left.durationMinutes);
  const rightEnd = rightStart + Math.max(15, right.durationMinutes);
  return Math.max(leftStart, rightStart) < Math.min(leftEnd, rightEnd);
};

export const getConflictReasons = (interview: Interview, others: Interview[]): string[] => {
  const reasons = new Set<string>();

  others.forEach((other) => {
    if (other.id === interview.id || !interviewOverlaps(interview, other)) return;
    if (sharesInterviewer(interview, other)) {
      reasons.add(`Interviewer overlap with ${other.candidateName}`);
    }
    const location = normalizedLocation(interview.location);
    const otherLocation = normalizedLocation(other.location);
    if (location && location !== 'online' && location === otherLocation) {
      reasons.add(`Room conflict with ${other.candidateName}`);
    }
  });

  return Array.from(reasons);
};

export const buildCalendarEntries = (interviews: Interview[]): InterviewCalendarEntry[] => interviews
  .map((interview) => ({
    interview,
    startMinutes: parseInterviewStartMinutes(interview.time),
    endMinutes: parseInterviewStartMinutes(interview.time) + Math.max(15, interview.durationMinutes),
    conflicts: getConflictReasons(interview, interviews),
  }))
  .sort((left, right) => left.startMinutes - right.startMinutes || left.interview.candidateName.localeCompare(right.interview.candidateName));
