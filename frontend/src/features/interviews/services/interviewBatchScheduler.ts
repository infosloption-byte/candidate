import type { Candidate } from '../../candidates/types/candidate';
import type { BulkInterviewScheduleConfig, BulkInterviewSchedulePlan, BulkInterviewScheduleSlot, Interview, Interviewer, InterviewType, PracticalTestItem, ScorecardCriterion } from '../types/interview';

const pad = (value: number): string => String(value).padStart(2, '0');
const toMinutes = (time: string): number => { const [hours, minutes] = time.split(':').map(Number); return (hours ?? 0) * 60 + (minutes ?? 0); };
const toTime = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const toIsoDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIsoDate = (iso: string): Date => { const [year, month, day] = iso.split('-').map(Number); return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1); };
const dateLabel = (date: Date): string => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const makeId = (prefix: string): string => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const overlaps = (startA: number, durationA: number, startB: number, durationB: number): boolean => startA < startB + durationB && startB < startA + durationA;

const specialtyMatch = (candidate: Candidate, interviewer: Interviewer): boolean => {
  const profession = candidate.profession.toLowerCase();
  return interviewer.specialties.some((specialty) => { const value = specialty.toLowerCase(); return value === profession || value.includes(profession) || profession.includes(value); });
};

const scorecardFor = (profession: string): ScorecardCriterion[] => {
  const key = profession.toLowerCase();
  const labels = key.includes('welder')
    ? ['Welding technique', 'Relevant experience', 'Fabrication skill', 'Safety awareness', 'Weld quality']
    : key.includes('carpenter') || key.includes('formwork')
      ? ['Trade / formwork skill', 'Relevant experience', 'Drawing understanding', 'Safety awareness', 'Accuracy / finish']
      : ['Technical trade skill', 'Relevant experience', 'Secondary skills', 'Safety awareness', 'Finish quality'];
  const weights = [30, 20, 20, 15, 15];
  return labels.map((label, index) => ({ id: `bulk-${index + 1}`, label, weight: weights[index] ?? 15, score: null, note: '' }));
};

const practicalFor = (profession: string, type: InterviewType): PracticalTestItem[] => {
  if (type === 'Screening' || type === 'Client') return [];
  const key = profession.toLowerCase();
  if (key.includes('welder')) return [
    { id: 'bulk-weld', label: 'Weld execution', required: true, result: 'not-started', note: '' },
    { id: 'bulk-fit', label: 'Cut / fit / fabrication', required: true, result: 'not-started', note: '' },
    { id: 'bulk-safety', label: 'PPE and safe handling', required: true, result: 'not-started', note: '' },
  ];
  if (key.includes('mason') || key.includes('tile')) return [
    { id: 'bulk-core', label: 'Core masonry / finish task', required: true, result: 'not-started', note: '' },
    { id: 'bulk-quality', label: 'Accuracy / finish quality', required: true, result: 'not-started', note: '' },
    { id: 'bulk-safety', label: 'Safe tool handling', required: true, result: 'not-started', note: '' },
  ];
  return [
    { id: 'bulk-trade', label: 'Core practical trade task', required: true, result: 'not-started', note: '' },
    { id: 'bulk-quality', label: 'Accuracy / finish quality', required: true, result: 'not-started', note: '' },
    { id: 'bulk-safety', label: 'PPE and safe handling', required: true, result: 'not-started', note: '' },
  ];
};

const slotConflicts = (slot: { date: string; time: string; interviewerId: string; durationMinutes: number; location: string }, interviews: Interview[]): string[] => {
  const start = toMinutes(slot.time);
  return interviews.filter((interview) => interview.date === slot.date && overlaps(start, slot.durationMinutes, toMinutes(interview.time), interview.durationMinutes)).flatMap((interview) => {
    const reasons: string[] = [];
    if (interview.interviewers.some((person) => person.id === slot.interviewerId)) reasons.push(`Interviewer busy: ${interview.candidateName}`);
    if (slot.location && interview.location && interview.location.trim().toLowerCase() === slot.location.trim().toLowerCase()) reasons.push(`Location busy: ${interview.location}`);
    return reasons;
  });
};

export const planBulkInterviewSchedule = (candidates: Candidate[], interviewers: Interviewer[], existingInterviews: Interview[], config: BulkInterviewScheduleConfig): BulkInterviewSchedulePlan => {
  const activeInterviewers = interviewers.filter((person) => person.active && config.interviewerIds.includes(person.id));
  const requestedCandidates = candidates.filter((candidate) => candidate.status !== 'rejected');
  const startDate = fromIsoDate(config.startDate);
  const endDate = fromIsoDate(config.endDate);
  const dayStart = toMinutes(config.dayStart);
  const dayEnd = toMinutes(config.dayEnd);
  const step = config.durationMinutes + config.breakMinutes;
  const candidateBusy = new Set(existingInterviews.filter((interview) => ['scheduled', 'in-progress', 'evaluation'].includes(interview.status)).map((interview) => interview.candidateId));
  const availableCandidates = requestedCandidates.filter((candidate) => !candidateBusy.has(candidate.id));
  const unscheduled: BulkInterviewSchedulePlan['unscheduled'] = availableCandidates.length === requestedCandidates.length ? [] : requestedCandidates.filter((candidate) => candidateBusy.has(candidate.id)).map((candidate) => ({ candidateId: candidate.id, candidateName: candidate.name, reason: 'Already has an active interview.' }));

  if (activeInterviewers.length === 0 || dayEnd <= dayStart || step <= 0 || endDate < startDate) {
    return { slots: [], unscheduled: [...unscheduled, ...availableCandidates.map((candidate) => ({ candidateId: candidate.id, candidateName: candidate.name, reason: 'The schedule configuration does not contain a usable interviewer pool or time window.' }))], capacity: 0, requested: requestedCandidates.length };
  }

  const slots: BulkInterviewScheduleSlot[] = [];
  const reserved: Array<{ date: string; time: string; interviewerId: string; durationMinutes: number; location: string }> = [];
  const dates: Date[] = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    if (config.includeWeekends || (day !== 0 && day !== 6)) dates.push(new Date(cursor));
  }

  const capacity = dates.length * activeInterviewers.length * Math.max(Math.floor((dayEnd - dayStart + config.breakMinutes) / step), 0);
  let candidateIndex = 0;
  for (const date of dates) {
    const iso = toIsoDate(date);
    for (let time = dayStart; time + config.durationMinutes <= dayEnd && candidateIndex < availableCandidates.length; time += step) {
      const interviewerOrder = [...activeInterviewers].sort((left, right) => {
        const leftLoad = reserved.filter((slot) => slot.date === iso && slot.interviewerId === left.id).length;
        const rightLoad = reserved.filter((slot) => slot.date === iso && slot.interviewerId === right.id).length;
        return leftLoad - rightLoad || left.id.localeCompare(right.id);
      });
      for (const interviewer of interviewerOrder) {
        if (candidateIndex >= availableCandidates.length) break;
        const candidate = availableCandidates[candidateIndex];
        const relevantInterviewers = activeInterviewers.filter((person) => specialtyMatch(candidate, person));
        const preferred = relevantInterviewers.find((person) => person.id === interviewer.id);
        if (relevantInterviewers.length > 0 && !preferred) continue;
        const slot = { date: dateLabel(date), time: toTime(time), interviewerId: interviewer.id, durationMinutes: config.durationMinutes, location: config.location.trim() };
        const conflicts = [...slotConflicts(slot, existingInterviews), ...reserved.filter((item) => item.date === slot.date && item.interviewerId === slot.interviewerId && overlaps(toMinutes(slot.time), slot.durationMinutes, toMinutes(item.time), item.durationMinutes)).map(() => `Generated slot already occupied for ${interviewer.name}`), ...reserved.filter((item) => item.date === slot.date && item.location && slot.location && item.location.toLowerCase() === slot.location.toLowerCase() && overlaps(toMinutes(slot.time), slot.durationMinutes, toMinutes(item.time), item.durationMinutes)).map(() => `Location ${slot.location} is already occupied`)];
        if (conflicts.length > 0) continue;
        reserved.push(slot);
        slots.push({ candidateId: candidate.id, candidateName: candidate.name, date: slot.date, time: slot.time, interviewer, conflicts: [] });
        candidateIndex += 1;
      }
    }
  }

  const scheduledIds = new Set(slots.map((slot) => slot.candidateId));
  for (const candidate of availableCandidates) {
    if (!scheduledIds.has(candidate.id)) unscheduled.push({ candidateId: candidate.id, candidateName: candidate.name, reason: 'No free interviewer slot remained in the selected window.' });
  }
  return { slots, unscheduled, capacity, requested: requestedCandidates.length };
};

export const buildBulkInterviews = (plan: BulkInterviewSchedulePlan, candidates: Candidate[], config: BulkInterviewScheduleConfig): Interview[] => {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const now = new Date().toISOString();
  return plan.slots.flatMap((slot) => {
    const candidate = candidateMap.get(slot.candidateId);
    if (!candidate) return [];
    return [{
      id: makeId('iv'),
      reference: `IV-${Date.now().toString().slice(-6)}-${slot.candidateId.slice(-4)}`,
      candidateId: candidate.id,
      candidateName: candidate.name,
      profession: candidate.profession,
      type: config.type,
      status: 'scheduled' as const,
      date: slot.date,
      time: slot.time,
      durationMinutes: config.durationMinutes,
      location: config.location.trim(),
      interviewers: [slot.interviewer],
      notes: `Batch scheduled for ${dateLabel(new Date())}.`,
      scorecard: { templateId: `bulk-${candidate.profession.toLowerCase().replace(/\s+/g, '-')}`, criteria: scorecardFor(candidate.profession) },
      practicalTest: practicalFor(candidate.profession, config.type),
      decision: { decision: 'pending' as const, reason: '', note: '' },
      createdAt: now,
    } satisfies Interview];
  });
};
