import { useState } from 'react';
import { useInterviewContext } from '../context/useInterviewContext';
import { formatInterviewDateLabel, validateInterviewReschedule } from '../services/interviewRescheduler';
import { parseInterviewDate, toIsoDate } from '../services/interviewCalendar';
import type { Interview, InterviewRescheduleAlternative, InterviewRescheduleDraft } from '../types/interview';

interface LastReschedule {
  interviewId: string;
  candidateName: string;
  changedAt: string;
  historyId: string;
}

interface UseInterviewReschedulerResult {
  open: boolean;
  draft: InterviewRescheduleDraft | null;
  error: string | null;
  alternatives: InterviewRescheduleAlternative[];
  lastReschedule: LastReschedule | null;
  actions: {
    openForInterview: (interviewId: string) => void;
    handleDrop: (interviewId: string, date: string, time: string) => void;
    setDate: (date: string) => void;
    setTime: (time: string) => void;
    toggleInterviewer: (interviewerId: string) => void;
    setReason: (reason: string) => void;
    useAlternative: (alternative: InterviewRescheduleAlternative) => void;
    save: () => void;
    close: () => void;
    undo: () => void;
  };
}

const draftFromInterview = (interview: Interview): InterviewRescheduleDraft => {
  const parsedDate = parseInterviewDate(interview.date, interview.time) ?? new Date();
  return {
    interviewId: interview.id,
    date: toIsoDate(parsedDate),
    time: interview.time,
    interviewerIds: interview.interviewers.map((person) => person.id),
    reason: '',
  };
};

const getErrorMessage = (reasons: string[]): string => reasons.length > 0 ? reasons.join(' ') : 'The schedule could not be updated. Review the proposed slot and try again.';

export const useInterviewRescheduler = (): UseInterviewReschedulerResult => {
  const { state, dispatch } = useInterviewContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InterviewRescheduleDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<InterviewRescheduleAlternative[]>([]);
  const [lastReschedule, setLastReschedule] = useState<LastReschedule | null>(null);

  const prepare = (nextDraft: InterviewRescheduleDraft): boolean => {
    const interview = state.interviews.find((item) => item.id === nextDraft.interviewId);
    if (!interview) {
      setError('The interview could not be found. Refresh the interview workspace and try again.');
      return false;
    }
    const validation = validateInterviewReschedule(interview, nextDraft, state.interviews, state.interviewers);
    setError(validation.valid ? null : getErrorMessage(validation.reasons));
    setAlternatives(validation.alternatives);
    return validation.valid;
  };

  const commit = (nextDraft: InterviewRescheduleDraft, reason: string) => {
    const interview = state.interviews.find((item) => item.id === nextDraft.interviewId);
    if (!interview) return;
    const changedAt = new Date().toISOString();
    const historyId = `reschedule-${Date.now()}-${interview.id}`;
    dispatch({
      type: 'RESCHEDULE_INTERVIEW',
      interviewId: interview.id,
      date: formatInterviewDateLabel(nextDraft.date),
      time: nextDraft.time,
      interviewerIds: nextDraft.interviewerIds,
      reason: reason.trim() || 'Interview schedule changed',
      changedAt,
      historyId,
    });
    setLastReschedule({ interviewId: interview.id, candidateName: interview.candidateName, changedAt, historyId });
    setOpen(false);
    setError(null);
    setAlternatives([]);
  };

  const openForInterview = (interviewId: string) => {
    const interview = state.interviews.find((item) => item.id === interviewId);
    if (!interview) return;
    const nextDraft = draftFromInterview(interview);
    setDraft(nextDraft);
    setError(null);
    setAlternatives([]);
    setOpen(true);
  };

  const handleDrop = (interviewId: string, date: string, time: string) => {
    const interview = state.interviews.find((item) => item.id === interviewId);
    if (!interview) return;
    const nextDraft: InterviewRescheduleDraft = {
      ...draftFromInterview(interview),
      date,
      time,
      reason: 'Calendar drag-and-drop',
    };
    setDraft(nextDraft);
    if (prepare(nextDraft)) {
      commit(nextDraft, 'Calendar drag-and-drop');
      return;
    }
    setOpen(true);
  };

  const setDate = (date: string) => {
    if (!draft) return;
    const nextDraft = { ...draft, date };
    setDraft(nextDraft);
    prepare(nextDraft);
  };

  const setTime = (time: string) => {
    if (!draft) return;
    const nextDraft = { ...draft, time };
    setDraft(nextDraft);
    prepare(nextDraft);
  };

  const toggleInterviewer = (interviewerId: string) => {
    if (!draft) return;
    const interviewerIds = draft.interviewerIds.includes(interviewerId)
      ? draft.interviewerIds.filter((id) => id !== interviewerId)
      : [...draft.interviewerIds, interviewerId];
    const nextDraft = { ...draft, interviewerIds };
    setDraft(nextDraft);
    prepare(nextDraft);
  };

  const setReason = (reason: string) => {
    if (!draft) return;
    setDraft({ ...draft, reason });
  };

  const useAlternative = (alternative: InterviewRescheduleAlternative) => {
    if (!draft) return;
    const nextDraft = { ...draft, date: alternative.date, time: alternative.time, interviewerIds: alternative.interviewerIds };
    setDraft(nextDraft);
    setError(null);
    setAlternatives([]);
  };

  const save = () => {
    if (!draft) return;
    if (!prepare(draft)) return;
    commit(draft, draft.reason);
  };

  const close = () => {
    setOpen(false);
    setDraft(null);
    setError(null);
    setAlternatives([]);
  };

  const undo = () => {
    if (!lastReschedule) return;
    dispatch({ type: 'UNDO_RESCHEDULE', interviewId: lastReschedule.interviewId, historyId: lastReschedule.historyId, undoneAt: new Date().toISOString() });
    setLastReschedule(null);
  };

  return {
    open,
    draft,
    error,
    alternatives,
    lastReschedule,
    actions: { openForInterview, handleDrop, setDate, setTime, toggleInterviewer, setReason, useAlternative, save, close, undo },
  };
};
