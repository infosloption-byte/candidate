import { useMemo } from 'react';
import { useInterviewContext } from '../context/useInterviewContext';
import type { Decision, Interview, PracticalResult } from '../types/interview';

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
  setPracticalResult: (itemId: string, result: PracticalResult, note: string) => void;
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
  const progress = useMemo(() => calculateProgress(interview), [interview]);

  const validationMessage = useMemo(() => {
    if (!interview) return 'Select an interview first.';
    if (progress.completedCriteria < progress.totalCriteria) return 'Complete every scorecard criterion before recording the final decision.';
    if (!progress.requiredPracticalComplete) return 'Complete every required practical-test item before recording the final decision.';
    if (interview.decision.decision === 'pending') return 'Choose Select, Reserve or Reject to complete this interview.';
    if (interview.decision.decision === 'rejected' && (!interview.decision.reason.trim() || !interview.decision.note.trim())) return 'Rejected interviews require a reason and a written decision note.';
    return null;
  }, [interview, progress]);

  const setScore = (criterionId: string, score: number | null) => {
    if (!interview) return;
    dispatch({ type: 'SET_SCORE', interviewId: interview.id, criterionId, score });
  };

  const setCriterionNote = (criterionId: string, note: string) => {
    if (!interview) return;
    dispatch({ type: 'SET_CRITERION_NOTE', interviewId: interview.id, criterionId, note });
  };

  const setPracticalResult = (itemId: string, result: PracticalResult, note: string) => {
    if (!interview) return;
    dispatch({ type: 'SET_PRACTICAL_RESULT', interviewId: interview.id, itemId, result, note });
  };

  const setInterviewNote = (note: string) => {
    if (!interview) return;
    dispatch({ type: 'SET_INTERVIEW_NOTE', interviewId: interview.id, note });
  };

  const setDecision = (decision: Decision, reason: string, note: string) => {
    if (!interview) return;
    dispatch({ type: 'SET_DECISION', interviewId: interview.id, decision, reason, note });
  };

  return {
    progress,
    canComplete: validationMessage === null,
    validationMessage,
    setScore,
    setCriterionNote,
    setPracticalResult,
    setInterviewNote,
    setDecision,
  };
};
