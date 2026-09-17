import type { Interview, InterviewRescheduleAlternative, InterviewRescheduleDraft, Interviewer } from '../types/interview';
import { fromIsoDate, getConflictReasons, interviewOverlaps, parseInterviewStartMinutes, toIsoDate } from './interviewCalendar';

export const formatInterviewDateLabel = (isoDate: string): string => {
  const date = fromIsoDate(isoDate);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()] ?? 'Jan';
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
};

const buildTarget = (source: Interview, isoDate: string, time: string, interviewerIds: string[], interviewerLookup: Map<string, Interviewer>): Interview => ({
  ...source,
  date: formatInterviewDateLabel(isoDate),
  time,
  interviewers: interviewerIds.flatMap((id) => {
    const interviewer = interviewerLookup.get(id);
    return interviewer ? [interviewer] : [];
  }),
});

const validateCore = (source: Interview, isoDate: string, time: string, interviewerIds: string[], interviews: Interview[], interviewers: Interviewer[]): string[] => {
  const reasons: string[] = [];
  if (source.status !== 'scheduled') reasons.push('Only scheduled interviews can be rescheduled.');
  const date = fromIsoDate(isoDate);
  if (Number.isNaN(date.getTime()) || toIsoDate(date) !== isoDate) reasons.push('Choose a valid interview date.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) reasons.push('Choose a valid start time.');

  const activeLookup = new Map(interviewers.filter((person) => person.active).map((person) => [person.id, person]));
  if (interviewerIds.length === 0) reasons.push('Select at least one active interviewer.');
  if (interviewerIds.some((id) => !activeLookup.has(id))) reasons.push('One or more selected interviewers are no longer active.');

  const original = `${source.date}|${source.time}|${source.interviewers.map((person) => person.id).sort().join(',')}`;
  const next = `${formatInterviewDateLabel(isoDate)}|${time}|${interviewerIds.slice().sort().join(',')}`;
  if (original === next) reasons.push('Select a different date, time, or interviewer.');

  const target = buildTarget(source, isoDate, time, interviewerIds, new Map(interviewers.map((person) => [person.id, person])));
  if (target.interviewers.length !== interviewerIds.length) reasons.push('The selected interviewer panel could not be resolved.');
  const others = interviews.filter((interview) => interview.id !== source.id);
  if (others.some((other) => other.candidateId === source.candidateId && interviewOverlaps(target, other))) {
    reasons.push('Candidate already has an overlapping interview.');
  }
  reasons.push(...getConflictReasons(target, others));
  return [...new Set(reasons)];
};

const buildAlternatives = (source: Interview, draft: InterviewRescheduleDraft, interviews: Interview[], interviewers: Interviewer[]): InterviewRescheduleAlternative[] => {
  const lookup = new Map(interviewers.map((person) => [person.id, person]));
  const active = interviewers.filter((person) => person.active);
  const candidates: Array<{ date: string; time: string; interviewerIds: string[] }> = [];
  const baseDate = fromIsoDate(draft.date);
  const baseMinutes = parseInterviewStartMinutes(draft.time);

  [-120, -90, -60, -30, 30, 60, 90, 120].forEach((offset) => {
    const minutes = baseMinutes + offset;
    if (minutes < 7 * 60 || minutes > 20 * 60) return;
    candidates.push({ date: toIsoDate(baseDate), time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`, interviewerIds: draft.interviewerIds });
  });
  active.forEach((person) => {
    if (draft.interviewerIds.length === 1 && draft.interviewerIds[0] === person.id) return;
    candidates.push({ date: draft.date, time: draft.time, interviewerIds: [person.id] });
  });

  const results: InterviewRescheduleAlternative[] = [];
  candidates.forEach((candidate) => {
    if (results.length >= 6) return;
    const reasons = validateCore(source, candidate.date, candidate.time, candidate.interviewerIds, interviews, interviewers);
    if (reasons.length > 0) return;
    const names = candidate.interviewerIds.map((id) => lookup.get(id)?.name ?? 'Interviewer');
    results.push({ date: candidate.date, time: candidate.time, interviewerIds: candidate.interviewerIds, label: `${formatInterviewDateLabel(candidate.date)} · ${candidate.time} · ${names.join(', ')}` });
  });
  return results;
};

export const validateInterviewReschedule = (source: Interview, draft: InterviewRescheduleDraft, interviews: Interview[], interviewers: Interviewer[]): { valid: boolean; reasons: string[]; alternatives: InterviewRescheduleAlternative[] } => {
  const reasons = validateCore(source, draft.date, draft.time, draft.interviewerIds, interviews, interviewers);
  return { valid: reasons.length === 0, reasons, alternatives: reasons.length > 0 ? buildAlternatives(source, draft, interviews, interviewers) : [] };
};
