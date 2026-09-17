import type { Candidate } from '../../candidates/types/candidate';
import { formatInterviewDateLabel } from './interviewRescheduler';
import { getConflictReasons, interviewOverlaps, fromIsoDate, toIsoDate } from './interviewCalendar';
import type { Interview, InterviewDraft, InterviewScheduleValidation, Interviewer } from '../types/interview';

const buildValidationTarget = (draft: InterviewDraft, candidate: Candidate, interviewers: Interviewer[]): Interview => ({
  id: '__new-interview__',
  reference: '__new__',
  candidateId: candidate.id,
  candidateName: candidate.name,
  profession: candidate.profession,
  type: draft.type,
  status: 'scheduled',
  date: formatInterviewDateLabel(draft.date),
  time: draft.time,
  durationMinutes: Number(draft.durationMinutes),
  location: draft.location.trim(),
  interviewers,
  notes: '',
  scorecard: { templateId: '__draft__', criteria: [] },
  practicalTest: [],
  decision: { decision: 'pending', reason: '', note: '' },
  createdAt: new Date(0).toISOString(),
});

const normalize = (value: string): string => value.trim().toLowerCase();

export const validateInterviewSchedule = (
  draft: InterviewDraft,
  candidate: Candidate | null,
  interviewers: Interviewer[],
  interviews: Interview[],
): InterviewScheduleValidation => {
  const reasons = new Set<string>();
  const warnings = new Set<string>();

  if (!candidate) {
    reasons.add('Choose a candidate before scheduling the interview.');
  } else if (candidate.status === 'rejected') {
    reasons.add('Rejected candidates cannot be scheduled for a new interview.');
  }

  const date = fromIsoDate(draft.date);
  if (Number.isNaN(date.getTime()) || toIsoDate(date) !== draft.date) {
    reasons.add('Choose a valid interview date.');
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)) {
    reasons.add('Choose a valid start time.');
  }

  const duration = Number(draft.durationMinutes);
  if (!Number.isFinite(duration) || duration < 15 || duration > 480) {
    reasons.add('Choose a duration between 15 and 480 minutes.');
  }

  if (!normalize(draft.location)) {
    reasons.add('Add an interview location or meeting link.');
  }

  const selected = draft.interviewerIds
    .map((id) => interviewers.find((interviewer) => interviewer.id === id))
    .filter((interviewer): interviewer is Interviewer => Boolean(interviewer));

  if (draft.interviewerIds.length === 0) {
    reasons.add('Assign at least one interviewer.');
  }
  if (selected.length !== draft.interviewerIds.length) {
    reasons.add('One or more selected interviewers could not be found.');
  }
  if (selected.some((interviewer) => !interviewer.active)) {
    reasons.add('One or more selected interviewers are inactive.');
  }

  if (candidate && reasons.size === 0) {
    const target = buildValidationTarget(draft, candidate, selected);
    const activeInterviews = interviews.filter((interview) => interview.status === 'scheduled' || interview.status === 'in-progress' || interview.status === 'evaluation');

    const sameCandidate = activeInterviews.find((interview) => interview.candidateId === candidate.id && interviewOverlaps(target, interview));
    if (sameCandidate) {
      reasons.add(`Candidate already has an overlapping interview with ${sameCandidate.candidateName} at ${sameCandidate.time}.`);
    }

    reasons.forEach(() => undefined);
    getConflictReasons(target, activeInterviews).forEach((reason) => reasons.add(reason));

    const profession = normalize(candidate.profession);
    const specialtyMatches = selected.filter((interviewer) => interviewer.specialties.some((specialty) => normalize(specialty) === profession || profession.includes(normalize(specialty)) || normalize(specialty).includes(profession)));
    if (specialtyMatches.length === 0 && selected.length > 0) {
      warnings.add(`None of the selected interviewers lists ${candidate.profession} as a specialty. Confirm the panel before scheduling.`);
    }
  }

  return {
    valid: reasons.size === 0,
    reasons: Array.from(reasons),
    warnings: Array.from(warnings),
  };
};
