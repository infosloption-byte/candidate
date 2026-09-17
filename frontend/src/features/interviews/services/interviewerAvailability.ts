import { parseInterviewStartMinutes, parseInterviewDate, toIsoDate } from './interviewCalendar';
import type { Interview, Interviewer, InterviewerAvailability } from '../types/interview';

const blockingStatuses: Interview['status'][] = ['scheduled', 'in-progress', 'evaluation'];

const formatTime = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.min(1439, minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatBookedTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
};

const isSameDate = (interview: Interview, isoDate: string): boolean => {
  const parsed = parseInterviewDate(interview.date, interview.time);
  return parsed !== null && toIsoDate(parsed) === isoDate;
};

const getInterviewEnd = (interview: Interview): number => parseInterviewStartMinutes(interview.time) + Math.max(15, interview.durationMinutes);

export const getInterviewerAvailability = (
  interviewer: Interviewer,
  isoDate: string,
  startTime: string,
  durationMinutes: string,
  interviews: Interview[],
): InterviewerAvailability => {
  const dayInterviews = interviews
    .filter((interview) => blockingStatuses.includes(interview.status) && isSameDate(interview, isoDate) && interview.interviewers.some((person) => person.id === interviewer.id))
    .sort((left, right) => parseInterviewStartMinutes(left.time) - parseInterviewStartMinutes(right.time));

  const bookedMinutes = dayInterviews.reduce((total, interview) => total + Math.max(15, interview.durationMinutes), 0);
  const requestedStart = parseInterviewStartMinutes(startTime);
  const parsedDuration = Number(durationMinutes);
  const requestedDuration = Number.isFinite(parsedDuration) ? Math.max(15, parsedDuration) : 45;
  const requestedEnd = requestedStart + requestedDuration;

  const conflictingInterview = dayInterviews.find((interview) => {
    const existingStart = parseInterviewStartMinutes(interview.time);
    const existingEnd = getInterviewEnd(interview);
    return requestedStart < existingEnd && existingStart < requestedEnd;
  }) ?? null;

  return {
    interviewerId: interviewer.id,
    status: conflictingInterview ? 'busy' : 'available',
    dayAppointmentCount: dayInterviews.length,
    bookedMinutes,
    bookedLabel: formatBookedTime(bookedMinutes),
    requestedSlotLabel: `${formatTime(requestedStart)}–${formatTime(requestedEnd)}`,
    conflict: conflictingInterview
      ? { interviewId: conflictingInterview.id, candidateName: conflictingInterview.candidateName, time: conflictingInterview.time, endTime: formatTime(getInterviewEnd(conflictingInterview)) }
      : null,
    nextAppointment: dayInterviews.find((interview) => parseInterviewStartMinutes(interview.time) >= requestedEnd)
      ? (() => {
          const next = dayInterviews.find((interview) => parseInterviewStartMinutes(interview.time) >= requestedEnd);
          return next ? { time: next.time, endTime: formatTime(getInterviewEnd(next)), candidateName: next.candidateName } : null;
        })()
      : null,
  };
};

export const getInterviewerAvailabilities = (
  interviewers: Interviewer[],
  isoDate: string,
  startTime: string,
  durationMinutes: string,
  interviews: Interview[],
): InterviewerAvailability[] => interviewers
  .filter((interviewer) => interviewer.active)
  .map((interviewer) => getInterviewerAvailability(interviewer, isoDate, startTime, durationMinutes, interviews));
