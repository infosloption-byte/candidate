import { useMemo, useState } from 'react';
import type { Candidate } from '../../candidates/types/candidate';
import type { Interview, InterviewDraft, InterviewType, Interviewer } from '../types/interview';

interface UseInterviewFormProps {
  candidates: Candidate[];
  interviewers: Interviewer[];
  onCreate: (interview: Interview) => void;
  onClose: () => void;
}

const createScorecard = (profession: string) => {
  const normalized = profession.toLowerCase();
  const labels = normalized.includes('welder')
    ? [['technical', 'Welding technique', 30], ['experience', 'Relevant experience', 15], ['fabrication', 'Fabrication skill', 15], ['safety', 'Safety awareness', 15], ['quality', 'Weld quality', 10], ['english', 'English / communication', 5], ['tools', 'Tools & methods', 10]]
    : normalized.includes('carpenter')
      ? [['technical', 'Formwork / carpentry skill', 30], ['experience', 'Relevant experience', 15], ['drawing', 'Drawing understanding', 15], ['safety', 'Safety awareness', 15], ['quality', 'Accuracy / finish', 10], ['english', 'English / communication', 5], ['tools', 'Tools & methods', 10]]
      : [['technical', 'Technical trade skill', 30], ['experience', 'Relevant experience', 15], ['secondary', 'Secondary skills', 15], ['safety', 'Safety awareness', 15], ['quality', 'Finish quality', 10], ['english', 'English / communication', 5], ['tools', 'Tools & methods', 10]];

  return {
    templateId: normalized.includes('welder') ? 'welding-standard' : normalized.includes('carpenter') ? 'carpentry-standard' : 'general-trade-standard',
    criteria: labels.map(([id, label, weight]) => ({ id: String(id), label: String(label), weight: Number(weight), score: null, note: '' })),
  };
};

const createPracticalTest = (profession: string, type: InterviewType) => {
  if (type === 'Screening' || type === 'Client') return [];

  const normalized = profession.toLowerCase();
  if (normalized.includes('mason') || normalized.includes('tile')) {
    return [
      { id: 'practical-block', label: 'Block / masonry work', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-finish', label: 'Plaster / finish quality', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-tile', label: 'Tile alignment / grouting', required: false, result: 'not-started' as const, note: '' },
      { id: 'practical-safety', label: 'Safe tool handling', required: true, result: 'not-started' as const, note: '' },
    ];
  }
  if (normalized.includes('welder')) {
    return [
      { id: 'practical-weld', label: 'Weld execution', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-fabrication', label: 'Cut / fit / fabrication', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-safety', label: 'PPE and safe handling', required: true, result: 'not-started' as const, note: '' },
    ];
  }
  return [
    { id: 'practical-trade', label: 'Core practical trade task', required: true, result: 'not-started' as const, note: '' },
    { id: 'practical-quality', label: 'Accuracy / finish quality', required: true, result: 'not-started' as const, note: '' },
    { id: 'practical-safety', label: 'PPE and safe handling', required: true, result: 'not-started' as const, note: '' },
  ];
};

const getNextDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

const emptyDraft: InterviewDraft = {
  candidateId: '',
  type: 'Technical',
  date: getNextDate(),
  time: '09:00',
  durationMinutes: '45',
  location: 'Colombo Interview Room 1',
  interviewerIds: [],
};

const makeId = (prefix: string): string => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`;

export const useInterviewForm = ({ candidates, interviewers, onCreate, onClose }: UseInterviewFormProps) => {
  const [draft, setDraft] = useState<InterviewDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = useMemo(() => candidates.find((candidate) => candidate.id === draft.candidateId) ?? null, [candidates, draft.candidateId]);

  const updateField = <K extends keyof InterviewDraft>(field: K, value: InterviewDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const toggleInterviewer = (interviewerId: string) => {
    setDraft((current) => ({
      ...current,
      interviewerIds: current.interviewerIds.includes(interviewerId)
        ? current.interviewerIds.filter((id) => id !== interviewerId)
        : [...current.interviewerIds, interviewerId],
    }));
    setError(null);
  };

  const submit = () => {
    if (!selectedCandidate) {
      setError('Choose a candidate before scheduling the interview.');
      return;
    }
    if (!draft.date || !draft.time || Number(draft.durationMinutes) < 15) {
      setError('Add a valid date, time and duration of at least 15 minutes.');
      return;
    }
    if (draft.interviewerIds.length === 0) {
      setError('Assign at least one interviewer.');
      return;
    }

    const assigned = interviewerIdsToObjects(draft.interviewerIds, interviewers);
    if (assigned.length === 0) {
      setError('The selected interviewer could not be found. Choose an active interviewer and try again.');
      return;
    }

    const profession = selectedCandidate.profession;
    const interview: Interview = {
      id: makeId('iv'),
      reference: `IV-${Math.floor(1000 + Math.random() * 8999)}`,
      candidateId: selectedCandidate.id,
      candidateName: selectedCandidate.name,
      profession,
      type: draft.type,
      status: 'scheduled',
      date: new Date(`${draft.date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: draft.time,
      durationMinutes: Number(draft.durationMinutes),
      location: draft.location.trim() || 'Interview room',
      interviewers: assigned,
      notes: '',
      scorecard: createScorecard(profession),
      practicalTest: createPracticalTest(profession, draft.type),
      decision: { decision: 'pending', reason: '', note: '' },
      createdAt: new Date().toISOString(),
    };

    onCreate(interview);
    setDraft({ ...emptyDraft, interviewerIds: [] });
    setError(null);
    onClose();
  };

  const reset = () => {
    setDraft({ ...emptyDraft, interviewerIds: [] });
    setError(null);
  };

  return useMemo(() => ({ draft, error, selectedCandidate, updateField, toggleInterviewer, submit, reset }), [draft, error, selectedCandidate, interviewers]);
};

const interviewerIdsToObjects = (ids: string[], interviewers: Interviewer[]): Interviewer[] => ids
  .map((id) => interviewers.find((interviewer) => interviewer.id === id))
  .filter((interviewer): interviewer is Interviewer => Boolean(interviewer));
