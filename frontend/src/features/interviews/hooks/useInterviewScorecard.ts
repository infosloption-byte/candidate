import { useEffect, useMemo, useRef } from 'react';
import { useInterviewContext } from '../context/useInterviewContext';
import type { Decision, Interview, PracticalResult } from '../types/interview';
import { recordInterviewDecisionApi, updateInterviewCriterionNoteApi, updateInterviewNoteApi, updateInterviewPracticalNoteApi, updateInterviewPracticalResultApi, updateInterviewScoreApi } from '../services/interviewApi';

interface ScorecardProgress {
  completedCriteria: number;
  totalCriteria: number;
  percentage: number;
  totalScore: number | null;
  requiredPracticalComplete: boolean;
}

interface UseInterviewScorecardResult {
  progress: ScorecardProgress;
  canComplete: boolean;
  validationMessage: string | null;
  setScore: (criterionId: string, score: number | null) => void;
  setCriterionNote: (criterionId: string, note: string) => void;
  setPracticalResult: (itemId: string, result: PracticalResult) => void;
  setPracticalNote: (itemId: string, note: string) => void;
  setInterviewNote: (note: string) => void;
  setDecision: (decision: Decision, reason: string, note: string) => void;
}

const calculateProgress = (interview: Interview | null): ScorecardProgress => {
  if (!interview) return { completedCriteria: 0, totalCriteria: 0, percentage: 0, totalScore: null, requiredPracticalComplete: false };
  const { criteria } = interview.scorecard;
  const completedCriteria = criteria.filter((criterion) => criterion.score !== null).length;
  const weightedTotal = criteria.reduce((total, criterion) => total + (criterion.score === null ? 0 : (criterion.score / 5) * criterion.weight), 0);
  const requiredPractical = interview.practicalTest.filter((item) => item.required);
  const requiredPracticalComplete = requiredPractical.every((item) => item.result === 'passed' || item.result === 'failed');

  return {
    completedCriteria,
    totalCriteria: criteria.length,
    percentage: criteria.length === 0 ? 0 : Math.round((completedCriteria / criteria.length) * 100),
    totalScore: completedCriteria === 0 ? null : Math.round(weightedTotal),
    requiredPracticalComplete,
  };
};

export const useInterviewScorecard = (interview: Interview | null): UseInterviewScorecardResult => {
  const { dispatch } = useInterviewContext();
  const noteTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => () => {
    noteTimers.current.forEach((timer) => window.clearTimeout(timer));
    noteTimers.current.clear();
  }, []);
  const progress = useMemo(() => calculateProgress(interview), [interview]);

  const validationMessage = useMemo(() => {
    if (!interview) return 'Select an interview first.';
    if (progress.completedCriteria < progress.totalCriteria) return 'Complete every scorecard criterion before recording the final decision.';
    if (!progress.requiredPracticalComplete) return 'Complete every required practical-test item before recording the final decision.';
    return null;
  }, [interview, progress]);

  const setScore = (criterionId: string, score: number | null) => {
    if (!interview) return;
    void updateInterviewScoreApi(interview.id, criterionId, score).then((updated) => {
      dispatch({ type: 'REPLACE_INTERVIEW', interview: updated });
    });
  };

  const setCriterionNote = (criterionId: string, note: string) => {
    if (!interview) return;
    dispatch({ type: 'SET_CRITERION_NOTE', interviewId: interview.id, criterionId, note });
    const key = `criterion:${interview.id}:${criterionId}`;
    const previous = noteTimers.current.get(key);
    if (previous !== undefined) window.clearTimeout(previous);
    noteTimers.current.set(key, window.setTimeout(() => {
      void updateInterviewCriterionNoteApi(interview.id, criterionId, note).then((updated) => {
        dispatch({ type: 'REPLACE_INTERVIEW', interview: updated });
      }).finally(() => noteTimers.current.delete(key));
    }, 400));
  };

  const setPracticalResult = (itemId: string, result: PracticalResult) => {
    if (!interview) return;
    void updateInterviewPracticalResultApi(interview.id, itemId, result).then((updated) => {
      dispatch({ type: 'REPLACE_INTERVIEW', interview: updated });
    });
  };

  const setPracticalNote = (itemId: string, note: string) => {
    if (!interview) return;
    dispatch({ type: 'SET_PRACTICAL_NOTE', interviewId: interview.id, itemId, note });
    const key = `practical:${interview.id}:${itemId}`;
    const previous = noteTimers.current.get(key);
    if (previous !== undefined) window.clearTimeout(previous);
    noteTimers.current.set(key, window.setTimeout(() => {
      void updateInterviewPracticalNoteApi(interview.id, itemId, note).then((updated) => {
        dispatch({ type: 'REPLACE_INTERVIEW', interview: updated });
      }).finally(() => noteTimers.current.delete(key));
    }, 400));
  };

  const setInterviewNote = (note: string) => {
    if (!interview) return;
    dispatch({ type: 'SET_INTERVIEW_NOTE', interviewId: interview.id, note });
    const key = `note:${interview.id}`;
    const previous = noteTimers.current.get(key);
    if (previous !== undefined) window.clearTimeout(previous);
    noteTimers.current.set(key, window.setTimeout(() => {
      void updateInterviewNoteApi(interview.id, note).then((updated) => {
        dispatch({ type: 'REPLACE_INTERVIEW', interview: updated });
      }).finally(() => noteTimers.current.delete(key));
    }, 400));
  };

  const setDecision = (decision: Decision, reason: string, note: string) => {
    if (!interview) return;
    void recordInterviewDecisionApi(interview.id, decision === 'pending' ? 'rejected' : decision, reason, note).then((updated) => {
      dispatch({ type: 'REPLACE_INTERVIEW', interview: updated });
    });
  };

  return {
    progress,
    canComplete: validationMessage === null,
    validationMessage,
    setScore,
    setCriterionNote,
    setPracticalResult,
    setPracticalNote,
    setInterviewNote,
    setDecision,
  };
};
