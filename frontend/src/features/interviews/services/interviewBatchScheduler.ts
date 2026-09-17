import type { Candidate } from '../../candidates/types/candidate';
import type { BulkInterviewInterviewerLoad, BulkInterviewScheduleConfig, BulkInterviewScheduleEdit, BulkInterviewScheduleIssue, BulkInterviewSchedulePlan, BulkInterviewScheduleSlot, Interview, Interviewer, InterviewType, PracticalTestItem, ScorecardCriterion } from '../types/interview';

const pad = (value: number): string => String(value).padStart(2, '0');
const toMinutes = (time: string): number => { const [hours, minutes] = time.split(':').map(Number); return (hours ?? 0) * 60 + (minutes ?? 0); };
const toTime = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const toIsoDate = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIsoDate = (iso: string): Date => { const [year, month, day] = iso.split('-').map(Number); return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1); };
const dateLabel = (date: Date): string => date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const makeId = (prefix: string): string => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const overlaps = (startA: number, durationA: number, startB: number, durationB: number): boolean => startA < startB + durationB && startB < startA + durationA;
const activeInterviewStatuses = ['scheduled', 'in-progress', 'evaluation'];
const specialtyMatch = (profession: string, interviewer: Interviewer): boolean => { const key = profession.toLowerCase(); return interviewer.specialties.some((specialty) => { const value = specialty.toLowerCase(); return value === key || value.includes(key) || key.includes(value); }); };
const isWeekdayAllowed = (date: Date, includeWeekends: boolean): boolean => includeWeekends || (date.getDay() !== 0 && date.getDay() !== 6);

const scorecardFor = (profession: string): ScorecardCriterion[] => { const key = profession.toLowerCase(); const labels = key.includes('welder') ? ['Welding technique', 'Relevant experience', 'Fabrication skill', 'Safety awareness', 'Weld quality'] : key.includes('carpenter') || key.includes('formwork') ? ['Trade / formwork skill', 'Relevant experience', 'Drawing understanding', 'Safety awareness', 'Accuracy / finish'] : ['Technical trade skill', 'Relevant experience', 'Secondary skills', 'Safety awareness', 'Finish quality']; const weights = [30, 20, 20, 15, 15]; return labels.map((label, index) => ({ id: `bulk-${index + 1}`, label, weight: weights[index] ?? 15, score: null, note: '' })); };
const practicalFor = (profession: string, type: InterviewType): PracticalTestItem[] => { if (type === 'Screening' || type === 'Client') return []; const key = profession.toLowerCase(); if (key.includes('welder')) return [{ id: 'bulk-weld', label: 'Weld execution', required: true, result: 'not-started', note: '' }, { id: 'bulk-fit', label: 'Cut / fit / fabrication', required: true, result: 'not-started', note: '' }, { id: 'bulk-safety', label: 'PPE and safe handling', required: true, result: 'not-started', note: '' }]; if (key.includes('mason') || key.includes('tile')) return [{ id: 'bulk-core', label: 'Core masonry / finish task', required: true, result: 'not-started', note: '' }, { id: 'bulk-quality', label: 'Accuracy / finish quality', required: true, result: 'not-started', note: '' }, { id: 'bulk-safety', label: 'Safe tool handling', required: true, result: 'not-started', note: '' }]; return [{ id: 'bulk-trade', label: 'Core practical trade task', required: true, result: 'not-started', note: '' }, { id: 'bulk-quality', label: 'Accuracy / finish quality', required: true, result: 'not-started', note: '' }, { id: 'bulk-safety', label: 'PPE and safe handling', required: true, result: 'not-started', note: '' }]; };

const slotConflictReasons = (slot: { isoDate: string; time: string; interviewerId: string; durationMinutes: number; location: string }, interviews: Interview[], sharedLocation: boolean): string[] => { const start = toMinutes(slot.time); return interviews.filter((interview) => interview.date === dateLabel(fromIsoDate(slot.isoDate)) && overlaps(start, slot.durationMinutes, toMinutes(interview.time), interview.durationMinutes)).flatMap((interview) => { const reasons: string[] = []; if (interview.interviewers.some((person) => person.id === slot.interviewerId)) reasons.push(`Interviewer busy: ${interview.candidateName}`); if (sharedLocation && slot.location && interview.location && interview.location.trim().toLowerCase() === slot.location.trim().toLowerCase()) reasons.push(`Location busy: ${interview.location}`); return reasons; }); };
const buildInterviewerLoads = (activeInterviewers: Interviewer[], existingInterviews: Interview[], slots: BulkInterviewScheduleSlot[], dates: Date[], slotsPerInterviewer: number): BulkInterviewInterviewerLoad[] => activeInterviewers.map((interviewer) => { const existingCount = existingInterviews.filter((interview) => activeInterviewStatuses.includes(interview.status) && dates.some((date) => dateLabel(date) === interview.date) && interview.interviewers.some((person) => person.id === interviewer.id)).length; const plannedCount = slots.filter((slot) => slot.interviewer.id === interviewer.id).length; const totalCount = existingCount + plannedCount; const capacity = dates.length * slotsPerInterviewer; return { interviewerId: interviewer.id, interviewerName: interviewer.name, existingCount, plannedCount, totalCount, utilizationPercent: capacity > 0 ? Math.min(999, Math.round((totalCount / capacity) * 100)) : 0 }; });
const makeEmptyPlan = (unscheduled: BulkInterviewScheduleIssue[], capacity: number, requested: number, interviewerLoads: BulkInterviewInterviewerLoad[] = []): BulkInterviewSchedulePlan => ({ slots: [], unscheduled, capacity, requested, interviewerLoads });

export const planBulkInterviewSchedule = (candidates: Candidate[], interviewers: Interviewer[], existingInterviews: Interview[], config: BulkInterviewScheduleConfig): BulkInterviewSchedulePlan => {
  const activeInterviewers = interviewers.filter((person) => person.active && config.interviewerIds.includes(person.id));
  const requestedCandidates = candidates.filter((candidate) => candidate.status !== 'rejected');
  const startDate = fromIsoDate(config.startDate);
  const endDate = fromIsoDate(config.endDate);
  const dayStart = toMinutes(config.dayStart);
  const dayEnd = toMinutes(config.dayEnd);
  const step = config.durationMinutes + config.breakMinutes;
  const candidateBusy = new Set(existingInterviews.filter((interview) => activeInterviewStatuses.includes(interview.status)).map((interview) => interview.candidateId));
  const availableCandidates = requestedCandidates.filter((candidate) => !candidateBusy.has(candidate.id));
  const unscheduled: BulkInterviewScheduleIssue[] = requestedCandidates.filter((candidate) => candidateBusy.has(candidate.id)).map((candidate) => ({ candidateId: candidate.id, candidateName: candidate.name, reason: 'Already has an active interview.' }));

  if (activeInterviewers.length === 0 || dayEnd <= dayStart || step <= 0 || endDate < startDate || config.durationMinutes <= 0) return makeEmptyPlan([...unscheduled, ...availableCandidates.map((candidate) => ({ candidateId: candidate.id, candidateName: candidate.name, reason: 'The schedule configuration does not contain a usable interviewer pool or time window.' }))], 0, requestedCandidates.length);

  const dates: Date[] = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) if (isWeekdayAllowed(cursor, config.includeWeekends)) dates.push(new Date(cursor));
  const slotsPerInterviewer = Math.max(Math.floor((dayEnd - dayStart + config.breakMinutes) / step), 0);
  const capacity = dates.length * activeInterviewers.length * slotsPerInterviewer;
  if (dates.length === 0 || slotsPerInterviewer === 0) return makeEmptyPlan([...unscheduled, ...availableCandidates.map((candidate) => ({ candidateId: candidate.id, candidateName: candidate.name, reason: 'No usable working days or interview slots exist in the configured window.' }))], capacity, requestedCandidates.length, buildInterviewerLoads(activeInterviewers, existingInterviews, [], dates, slotsPerInterviewer));

  const existingWindow = existingInterviews.filter((interview) => activeInterviewStatuses.includes(interview.status));
  const slots: BulkInterviewScheduleSlot[] = [];
  const totalLoad = new Map<string, number>();
  const dailyLoad = new Map<string, number>();
  for (const interviewer of activeInterviewers) totalLoad.set(interviewer.id, existingWindow.filter((interview) => interview.interviewers.some((person) => person.id === interviewer.id) && dates.some((date) => dateLabel(date) === interview.date)).length);

  const candidateOrder = [...availableCandidates].sort((left, right) => { const leftMatches = activeInterviewers.filter((person) => specialtyMatch(left.profession, person)).length; const rightMatches = activeInterviewers.filter((person) => specialtyMatch(right.profession, person)).length; return leftMatches - rightMatches || left.id.localeCompare(right.id); });

  for (const candidate of candidateOrder) {
    const matchingPool = activeInterviewers.filter((person) => specialtyMatch(candidate.profession, person));
    const interviewerPool = matchingPool.length > 0 ? matchingPool : activeInterviewers;
    type CandidateOption = { date: Date; time: number; interviewer: Interviewer; load: number; dayLoad: number; dateIndex: number };
    let bestOption: CandidateOption | null = null;
    for (const [dateIndex, date] of dates.entries()) {
      const iso = toIsoDate(date);
      for (let time = dayStart; time + config.durationMinutes <= dayEnd; time += step) {
        for (const interviewer of interviewerPool) {
          const slotBase = { isoDate: iso, time: toTime(time), interviewerId: interviewer.id, durationMinutes: config.durationMinutes, location: config.location.trim() };
          if (slotConflictReasons(slotBase, existingWindow, config.sharedLocation).length > 0) continue;
          const reservedConflict = slots.some((other) => other.isoDate === iso && overlaps(time, config.durationMinutes, toMinutes(other.time), config.durationMinutes) && (other.interviewer.id === interviewer.id || (config.sharedLocation && other.location && slotBase.location && other.location.toLowerCase() === slotBase.location.toLowerCase())));
          if (reservedConflict) continue;
          const load = totalLoad.get(interviewer.id) ?? 0;
          const dayLoad = dailyLoad.get(`${iso}::${interviewer.id}`) ?? 0;
          const option = { date, time, interviewer, load, dayLoad, dateIndex };
          if (!bestOption || load < bestOption.load || load === bestOption.load && (dayLoad < bestOption.dayLoad || dayLoad === bestOption.dayLoad && (dateIndex < bestOption.dateIndex || dateIndex === bestOption.dateIndex && (time < bestOption.time || time === bestOption.time && interviewer.id < bestOption.interviewer.id)))) bestOption = option;
        }
      }
    }
    if (bestOption === null) { unscheduled.push({ candidateId: candidate.id, candidateName: candidate.name, reason: matchingPool.length > 0 ? 'No free slot remained for a specialty-matched interviewer in the selected window.' : 'No free interviewer slot remained in the selected window.' }); continue; }
    const slot: BulkInterviewScheduleSlot = { candidateId: candidate.id, candidateName: candidate.name, profession: candidate.profession, isoDate: toIsoDate(bestOption.date), date: dateLabel(bestOption.date), time: toTime(bestOption.time), interviewer: bestOption.interviewer, location: config.location.trim(), conflicts: [] };
    slots.push(slot);
    totalLoad.set(bestOption.interviewer.id, (totalLoad.get(bestOption.interviewer.id) ?? 0) + 1);
    const dailyKey = `${slot.isoDate}::${bestOption.interviewer.id}`;
    dailyLoad.set(dailyKey, (dailyLoad.get(dailyKey) ?? 0) + 1);
  }

  const interviewerLoads = buildInterviewerLoads(activeInterviewers, existingInterviews, slots, dates, slotsPerInterviewer);
  return { slots, unscheduled, capacity, requested: requestedCandidates.length, interviewerLoads };
};

export const validateBulkInterviewScheduleEdit = (plan: BulkInterviewSchedulePlan, edit: BulkInterviewScheduleEdit, existingInterviews: Interview[], interviewers: Interviewer[], config: BulkInterviewScheduleConfig): string | null => {
  const slot = plan.slots.find((item) => item.candidateId === edit.candidateId);
  if (!slot) return 'The selected planned candidate no longer exists in this batch.';
  const interviewer = interviewers.find((person) => person.id === edit.interviewerId && person.active && config.interviewerIds.includes(person.id));
  if (!interviewer) return 'Choose an active interviewer from the selected interviewer pool.';
  const date = fromIsoDate(edit.isoDate);
  if (edit.isoDate < config.startDate || edit.isoDate > config.endDate || !isWeekdayAllowed(date, config.includeWeekends)) return 'The edited date is outside the working window.';
  const start = toMinutes(edit.time);
  if (start < toMinutes(config.dayStart) || start + config.durationMinutes > toMinutes(config.dayEnd)) return 'The edited time is outside the configured working hours.';
  if (specialtyMatch(slot.profession, interviewer) === false && interviewers.some((person) => specialtyMatch(slot.profession, person))) return 'This interviewer is not matched to the candidate trade.';
  const existingConflict = slotConflictReasons({ isoDate: edit.isoDate, time: edit.time, interviewerId: interviewer.id, durationMinutes: config.durationMinutes, location: config.location.trim() }, existingInterviews.filter((item) => activeInterviewStatuses.includes(item.status)), config.sharedLocation);
  if (existingConflict.length > 0) return existingConflict[0] ?? 'The interviewer or location is already occupied.';
  const planConflict = plan.slots.filter((item) => item.candidateId !== edit.candidateId && item.isoDate === edit.isoDate && overlaps(start, config.durationMinutes, toMinutes(item.time), config.durationMinutes)).flatMap((other) => { const reasons: string[] = []; if (other.interviewer.id === interviewer.id) reasons.push(`Interviewer already assigned to ${other.candidateName}`); if (config.sharedLocation && other.location && config.location.trim() && other.location.toLowerCase() === config.location.trim().toLowerCase()) reasons.push(`Location already assigned to ${other.candidateName}`); return reasons; });
  return planConflict[0] ?? null;
};

export const applyBulkInterviewScheduleEdit = (plan: BulkInterviewSchedulePlan, edit: BulkInterviewScheduleEdit, interviewer: Interviewer, config: BulkInterviewScheduleConfig): BulkInterviewSchedulePlan => {
  const date = fromIsoDate(edit.isoDate);
  const slots = plan.slots.map((slot) => slot.candidateId === edit.candidateId ? { ...slot, isoDate: edit.isoDate, date: dateLabel(date), time: edit.time, interviewer, conflicts: [] } : slot);
  const interviewerLoads = plan.interviewerLoads.map((load) => { const plannedCount = slots.filter((slot) => slot.interviewer.id === load.interviewerId).length; const capacity = Math.max(1, plan.capacity / Math.max(1, config.interviewerIds.length)); const totalCount = load.existingCount + plannedCount; return { ...load, plannedCount, totalCount, utilizationPercent: Math.min(999, Math.round((totalCount / capacity) * 100)) }; });
  return { ...plan, slots, interviewerLoads };
};

export const buildBulkInterviews = (plan: BulkInterviewSchedulePlan, candidates: Candidate[], config: BulkInterviewScheduleConfig): Interview[] => {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const now = new Date().toISOString();
  return plan.slots.flatMap((slot) => { const candidate = candidateMap.get(slot.candidateId); if (!candidate) return []; return [{ id: makeId('iv'), reference: `IV-${Date.now().toString().slice(-6)}-${slot.candidateId.slice(-4)}`, candidateId: candidate.id, candidateName: candidate.name, profession: candidate.profession, type: config.type, status: 'scheduled' as const, date: slot.date, time: slot.time, durationMinutes: config.durationMinutes, location: config.location.trim(), interviewers: [slot.interviewer], notes: `Batch scheduled for ${dateLabel(new Date())}.`, scorecard: { templateId: `bulk-${candidate.profession.toLowerCase().replace(/\s+/g, '-')}`, criteria: scorecardFor(candidate.profession) }, practicalTest: practicalFor(candidate.profession, config.type), decision: { decision: 'pending' as const, reason: '', note: '' }, createdAt: now } satisfies Interview]; });
};
