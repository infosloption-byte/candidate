import type { ApprovalStatus, SelectionJob, SelectionRecord } from '../types/selection';

const JOBS_KEY = 'buildhire.selection.jobs';
const RECORDS_KEY = 'buildhire.selection.records';
const APPROVAL_KEY = 'buildhire.selection.approval';

export const selectionJobSeed: SelectionJob[] = [
  {
    id: 'job-dubai-mason',
    title: 'Mason — Dubai Tower Project',
    project: 'Dubai Tower Project',
    location: 'Dubai, UAE',
    openings: 5,
    profession: 'Mason',
    requiredExperience: 5,
    requiredSkills: ['Tile', 'Putty'],
    client: 'Gulf Build Contracting',
  },
  {
    id: 'job-colombo-shuttering',
    title: 'Shuttering Carpenter — Colombo Mall',
    project: 'Colombo Mall Project',
    location: 'Colombo, Sri Lanka',
    openings: 3,
    profession: 'Shuttering Carpenter',
    requiredExperience: 4,
    requiredSkills: ['Formwork'],
    client: 'Urban Structure Group',
  },
  {
    id: 'job-doha-welder',
    title: 'Welder — Doha Industrial Expansion',
    project: 'Doha Industrial Expansion',
    location: 'Doha, Qatar',
    openings: 4,
    profession: 'Welder',
    requiredExperience: 5,
    requiredSkills: ['Fabrication', 'Arc Welding'],
    client: 'Qatar Industrial Works',
  },
];

const recordSeed: SelectionRecord[] = [
  {
    candidateId: 'cand-001',
    jobId: 'job-dubai-mason',
    decision: 'recommended',
    reason: 'Strong technical fit',
    note: 'Passed prior technical interview with strong finish-work evidence.',
    decidedAt: '16 Sep 2026 14:30',
    decidedBy: 'Recruitment team',
  },
  {
    candidateId: 'cand-003',
    jobId: 'job-colombo-shuttering',
    decision: 'selected',
    reason: 'Meets project requirement',
    note: 'Technical and practical interview passed.',
    decidedAt: '16 Sep 2026 16:10',
    decidedBy: 'Recruitment team',
  },
  {
    candidateId: 'cand-004',
    jobId: 'job-dubai-mason',
    decision: 'reserve',
    reason: 'Needs document follow-up',
    note: 'Good technical fit; trade certificate needs attention.',
    decidedAt: '12 Sep 2026 11:15',
    decidedBy: 'Recruitment team',
  },
];

const defaultApproval = { status: 'draft' as ApprovalStatus, note: '' };

const parseArray = <T>(raw: string | null, fallback: T[]): T[] => {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
};

export const loadSelectionJobs = async (): Promise<SelectionJob[]> => parseArray(window.localStorage.getItem(JOBS_KEY), selectionJobSeed);
export const loadSelectionRecords = async (): Promise<SelectionRecord[]> => parseArray(window.localStorage.getItem(RECORDS_KEY), recordSeed);
export const saveSelectionRecords = async (records: SelectionRecord[]): Promise<void> => {
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};
export const saveSelectionJobs = async (jobs: SelectionJob[]): Promise<void> => {
  window.localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
};
export const loadSelectionApproval = async (): Promise<{ status: ApprovalStatus; note: string }> => {
  const raw = window.localStorage.getItem(APPROVAL_KEY);
  if (!raw) return defaultApproval;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultApproval;
    const record = parsed as Record<string, unknown>;
    const status = ['draft', 'pending', 'approved', 'returned'].includes(record.status as string) ? record.status as ApprovalStatus : 'draft';
    return { status, note: typeof record.note === 'string' ? record.note : '' };
  } catch {
    return defaultApproval;
  }
};
export const saveSelectionApproval = async (approval: { status: ApprovalStatus; note: string }): Promise<void> => {
  window.localStorage.setItem(APPROVAL_KEY, JSON.stringify(approval));
};
