import { describe, expect, it } from 'vitest';
import { validateInterviewSchedule } from '../src/features/interviews/services/interviewScheduling';
import { planBulkInterviewSchedule, validateBulkInterviewScheduleEdit, applyBulkInterviewScheduleEdit } from '../src/features/interviews/services/interviewBatchScheduler';
import type { BulkInterviewScheduleConfig } from '../src/features/interviews/types/interview';
import { makeCandidate, makeInterview, makeInterviewer } from './fixtures';

const bulkConfig: BulkInterviewScheduleConfig = {
  type: 'Technical',
  startDate: '2026-09-21',
  endDate: '2026-09-21',
  dayStart: '09:00',
  dayEnd: '10:30',
  durationMinutes: 30,
  breakMinutes: 0,
  location: 'Colombo Interview Centre',
  sharedLocation: true,
  interviewerIds: ['interviewer-001', 'interviewer-002'],
  includeWeekends: false,
};

describe('single interview scheduling', () => {
  it('accepts a valid schedule for an active specialty-matched interviewer', () => {
    const candidate = makeCandidate();
    const interviewer = makeInterviewer();

    const result = validateInterviewSchedule(
      {
        candidateId: candidate.id,
        type: 'Technical',
        date: '2026-09-21',
        time: '09:00',
        durationMinutes: '30',
        location: 'Colombo Interview Centre',
        interviewerIds: [interviewer.id],
      },
      candidate,
      [interviewer],
      [],
    );

    expect(result.valid).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('blocks a rejected candidate and an inactive interviewer', () => {
    const candidate = makeCandidate({ status: 'rejected' });
    const inactive = makeInterviewer({ active: false });

    const result = validateInterviewSchedule(
      {
        candidateId: candidate.id,
        type: 'Technical',
        date: '2026-09-21',
        time: '09:00',
        durationMinutes: '30',
        location: 'Colombo Interview Centre',
        interviewerIds: [inactive.id],
      },
      candidate,
      [inactive],
      [],
    );

    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      'Rejected candidates cannot be scheduled for a new interview.',
      'One or more selected interviewers are inactive.',
    ]));
  });

  it('blocks interviewer conflicts with an existing active interview', () => {
    const candidate = makeCandidate();
    const interviewer = makeInterviewer();
    const existing = makeInterview({
      id: 'existing-001',
      candidateId: 'candidate-999',
      candidateName: 'Other Candidate',
      interviewers: [interviewer],
    });

    const result = validateInterviewSchedule(
      {
        candidateId: candidate.id,
        type: 'Technical',
        date: '2026-09-21',
        time: '09:15',
        durationMinutes: '30',
        location: 'Another Room',
        interviewerIds: [interviewer.id],
      },
      candidate,
      [interviewer],
      [existing],
    );

    expect(result.valid).toBe(false);
    expect(result.reasons.some((reason) => reason.includes('Interviewer busy'))).toBe(true);
  });
});

describe('bulk interview planning', () => {
  it('skips candidates with active interviews and schedules the remaining candidates', () => {
    const first = makeCandidate({ id: 'candidate-001', name: 'Kasun Perera' });
    const alreadyScheduled = makeCandidate({ id: 'candidate-002', name: 'Ruwan Silva' });
    const interviewer = makeInterviewer();
    const existing = makeInterview({
      id: 'existing-002',
      candidateId: alreadyScheduled.id,
      candidateName: alreadyScheduled.name,
      interviewers: [interviewer],
    });

    const plan = planBulkInterviewSchedule(
      [first, alreadyScheduled, makeCandidate({ id: 'candidate-003', name: 'Chaminda Jayasuriya' })],
      [interviewer],
      [existing],
      { ...bulkConfig, interviewerIds: [interviewer.id] },
    );

    expect(plan.requested).toBe(3);
    expect(plan.slots).toHaveLength(2);
    expect(plan.unscheduled).toEqual(expect.arrayContaining([
      expect.objectContaining({ candidateId: alreadyScheduled.id, reason: 'Already has an active interview.' }),
    ]));
  });

  it('uses specialty matching when distributing a batch', () => {
    const masonInterviewer = makeInterviewer({ id: 'interviewer-001', specialties: ['Mason'] });
    const welderInterviewer = makeInterviewer({ id: 'interviewer-002', specialties: ['Welder'] });
    const mason = makeCandidate({ id: 'candidate-mason', profession: 'Mason' });
    const welder = makeCandidate({ id: 'candidate-welder', profession: 'Welder' });

    const plan = planBulkInterviewSchedule(
      [mason, welder],
      [masonInterviewer, welderInterviewer],
      [],
      bulkConfig,
    );

    expect(plan.slots).toHaveLength(2);
    expect(plan.slots.find((slot) => slot.candidateId === mason.id)?.interviewer.id).toBe(masonInterviewer.id);
    expect(plan.slots.find((slot) => slot.candidateId === welder.id)?.interviewer.id).toBe(welderInterviewer.id);
  });

  it('prevents moving a planned slot into another planned slot at the same shared location', () => {
    const masonInterviewer = makeInterviewer({ id: 'interviewer-001', specialties: ['Mason'] });
    const secondInterviewer = makeInterviewer({ id: 'interviewer-002', specialties: ['Mason'] });
    const candidateA = makeCandidate({ id: 'candidate-a', name: 'Candidate A' });
    const candidateB = makeCandidate({ id: 'candidate-b', name: 'Candidate B' });

    const plan = planBulkInterviewSchedule(
      [candidateA, candidateB],
      [masonInterviewer, secondInterviewer],
      [],
      bulkConfig,
    );

    const targetSlot = plan.slots.find((slot) => slot.candidateId === candidateB.id);
    expect(targetSlot).toBeTruthy();

    const conflict = validateBulkInterviewScheduleEdit(
      plan,
      {
        candidateId: candidateB.id,
        isoDate: targetSlot?.isoDate ?? bulkConfig.startDate,
        time: plan.slots.find((slot) => slot.candidateId === candidateA.id)?.time ?? '09:00',
        interviewerId: masonInterviewer.id,
      },
      [],
      [masonInterviewer, secondInterviewer],
      bulkConfig,
    );

    expect(conflict).toContain('Interviewer already assigned');
  });

  it('applies a valid planned slot edit and recalculates interviewer load', () => {
    const masonInterviewer = makeInterviewer({ id: 'interviewer-001', specialties: ['Mason'] });
    const secondInterviewer = makeInterviewer({ id: 'interviewer-002', specialties: ['Mason'] });
    const candidate = makeCandidate({ id: 'candidate-a', profession: 'Mason' });

    const plan = planBulkInterviewSchedule(
      [candidate],
      [masonInterviewer, secondInterviewer],
      [],
      bulkConfig,
    );

    const edited = applyBulkInterviewScheduleEdit(
      plan,
      { candidateId: candidate.id, isoDate: bulkConfig.startDate, time: '10:00', interviewerId: secondInterviewer.id },
      secondInterviewer,
      bulkConfig,
    );

    expect(edited.slots[0]).toMatchObject({
      candidateId: candidate.id,
      time: '10:00',
      interviewer: secondInterviewer,
    });
    expect(edited.interviewerLoads.find((load) => load.interviewerId === secondInterviewer.id)?.plannedCount).toBe(1);
  });
});
