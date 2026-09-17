import type { ApprovalStatus, SelectionApproval, SelectionDecision, SelectionHistoryEntry, SelectionJob, SelectionRecord } from '../types/selection';

const JOBS_KEY = 'buildhire.selection.jobs';
const RECORDS_KEY = 'buildhire.selection.records';
const APPROVAL_KEY = 'buildhire.selection.approval';
const HISTORY_KEY = 'buildhire.selection.history';

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

const isDecision = (value: unknown): value is SelectionDecision => ['recommended', 'selected', 'reserve', 'rejected'].includes(value as string);

const historySeed: SelectionHistoryEntry[] = recordSeed.map((record) => ({
  candidateId: record.candidateId,
  jobId: record.jobId,
  action: 'decision_changed',
  fromDecision: null,
  toDecision: record.decision,
  reason: record.reason,
  note: record.note,
  occurredAt: record.decidedAt,
  occurredBy: record.decidedBy,
}));

const defaultApproval: SelectionApproval = { status: 'draft', note: '' };

const parseArray = <T>(raw: string | null, fallback: T[]): T[] => {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
};

const isHistoryAction = (value: unknown): value is SelectionHistoryEntry['action'] => ['decision_changed', 'reassigned', 'approval_changed'].includes(value as string);

const parseHistory = (raw: string | null): SelectionHistoryEntry[] => {
  if (!raw) return historySeed;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return historySeed;
    return parsed.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item)).filter((item) => {
      const candidateIdValid = item.candidateId === null || typeof item.candidateId === 'string';
      const fromDecisionValid = item.fromDecision === undefined || item.fromDecision === null || isDecision(item.fromDecision);
      const toDecisionValid = item.toDecision === undefined || item.toDecision === null || isDecision(item.toDecision);
      return typeof item.jobId === 'string' && candidateIdValid && isHistoryAction(item.action) && fromDecisionValid && toDecisionValid && typeof item.reason === 'string' && typeof item.note === 'string' && typeof item.occurredAt === 'string' && typeof item.occurredBy === 'string';
    }).map((item) => ({
      candidateId: item.candidateId as string | null,
      jobId: item.jobId as string,
      relatedJobId: typeof item.relatedJobId === 'string' ? item.relatedJobId : undefined,
      action: item.action as SelectionHistoryEntry['action'],
      fromDecision: item.fromDecision as SelectionDecision | null | undefined,
      toDecision: item.toDecision as SelectionDecision | null | undefined,
      reason: item.reason as string,
      note: item.note as string,
      occurredAt: item.occurredAt as string,
      occurredBy: item.occurredBy as string,
    }));
  } catch {
    return historySeed;
  }
};

export const loadSelectionJobs = async (): Promise<SelectionJob[]> => parseArray(window.localStorage.getItem(JOBS_KEY), selectionJobSeed);
export const loadSelectionRecords = async (): Promise<SelectionRecord[]> => parseArray(window.localStorage.getItem(RECORDS_KEY), recordSeed);
export const loadSelectionHistory = async (): Promise<SelectionHistoryEntry[]> => parseHistory(window.localStorage.getItem(HISTORY_KEY));

export const saveSelectionRecords = async (records: SelectionRecord[]): Promise<void> => {
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const saveSelectionHistory = async (history: SelectionHistoryEntry[]): Promise<void> => {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const loadSelectionApproval = async (): Promise<Record<string, SelectionApproval>> => {
  const raw = window.localStorage.getItem(APPROVAL_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const source = parsed as Record<string, unknown>;
    if (typeof source.status === 'string') {
      const status: ApprovalStatus = ['draft', 'pending', 'approved', 'returned'].includes(source.status) ? source.status as ApprovalStatus : 'draft';
      return { legacy: { status, note: typeof source.note === 'string' ? source.note : '' } };
    }
    return Object.fromEntries(Object.entries(source).map(([jobId, value]) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return [jobId, defaultApproval];
      const record = value as Record<string, unknown>;
      const status: ApprovalStatus = ['draft', 'pending', 'approved', 'returned'].includes(record.status as string) ? record.status as ApprovalStatus : 'draft';
      return [jobId, { status, note: typeof record.note === 'string' ? record.note : '' }];
    }));
  } catch {
    return {};
  }
};

export const saveSelectionApproval = async (approvalByJob: Record<string, SelectionApproval>): Promise<void> => {
  window.localStorage.setItem(APPROVAL_KEY, JSON.stringify(approvalByJob));
};
