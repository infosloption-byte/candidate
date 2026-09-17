import { useCallback, useMemo, useState } from 'react';
import type { Candidate } from '../../candidates/types/candidate';
import type { Interview, InterviewDraft, InterviewType, Interviewer } from '../types/interview';
import { validateInterviewSchedule } from '../services/interviewScheduling';

interface UseInterviewFormProps {
  candidates: Candidate[];
  interviewers: Interviewer[];
  interviews: Interview[];
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

const toLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNextDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toLocalIsoDate(date);
};

const createEmptyDraft = (): InterviewDraft => ({
  candidateId: '',
  type: 'Technical',
  date: getNextDate(),
  time: '09:00',
  durationMinutes: '45',
  location: 'Colombo Interview Room 1',
  interviewerIds: [],
});

const makeId = (prefix: string): string => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`;

export const useInterviewForm = ({ candidates, interviewers, interviews, onCreate, onClose }: UseInterviewFormProps) => {
  const [draft, setDraft] = useState<InterviewDraft>(createEmptyDraft);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = useMemo(() => candidates.find((candidate) => candidate.id === draft.candidateId) ?? null, [candidates, draft.candidateId]);
  const selectedInterviewers = useMemo(
    () => draft.interviewerIds
      .map((id) => interviewers.find((interviewer) => interviewer.id === id))
      .filter((interviewer): interviewer is Interviewer => Boolean(interviewer)),
    [draft.interviewerIds, interviewers],
  );
  const validation = useMemo(
    () => validateInterviewSchedule(draft, selectedCandidate, interviewers, interviews),
    [draft, interviews, interviewers, selectedCandidate],
  );

  const updateField = useCallback(<K extends keyof InterviewDraft>(field: K, value: InterviewDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError(null);
  }, []);

  const toggleInterviewer = useCallback((interviewerId: string) => {
    setDraft((current) => ({
      ...current,
      interviewerIds: current.interviewerIds.includes(interviewerId)
        ? current.interviewerIds.filter((id) => id !== interviewerId)
        : [...current.interviewerIds, interviewerId],
    }));
    setError(null);
  }, []);

  const submit = useCallback(() => {
    if (!validation.valid) {
      setError(validation.reasons[0] ?? 'Review the schedule before continuing.');
      return;
    }

    const profession = selectedCandidate?.profession;
    if (!selectedCandidate || !profession) {
      setError('Choose a candidate before scheduling the interview.');
      return;
    }

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
      location: draft.location.trim(),
      interviewers: selectedInterviewers,
      notes: '',
      scorecard: createScorecard(profession),
      practicalTest: createPracticalTest(profession, draft.type),
      decision: { decision: 'pending', reason: '', note: '' },
      createdAt: new Date().toISOString(),
    };

    onCreate(interview);
    setError(null);
    onClose();
  }, [draft, onClose, onCreate, selectedCandidate, selectedInterviewers, validation]);

  const reset = useCallback(() => {
    setDraft(createEmptyDraft());
    setError(null);
  }, []);

  return useMemo(() => ({
    draft,
    error,
    selectedCandidate,
    selectedInterviewers,
    validation,
    updateField,
    toggleInterviewer,
    submit,
    reset,
  }), [draft, error, reset, selectedCandidate, selectedInterviewers, submit, toggleInterviewer, updateField, validation]);
};
