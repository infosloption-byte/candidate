import { useMemo } from 'react';
import { useInterviewContext } from '../context/useInterviewContext';
import type { Interview, InterviewStatus } from '../types/interview';

export const useInterviewWorkspace = () => {
  const { state, dispatch } = useInterviewContext();

  const selectedInterview = useMemo<Interview | null>(
    () => state.interviews.find((interview) => interview.id === state.selectedInterviewId) ?? state.interviews[0] ?? null,
    [state.interviews, state.selectedInterviewId],
  );

  const sortedInterviews = useMemo(
    () => [...state.interviews].sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`)),
    [state.interviews],
  );

  const metrics = useMemo(() => ({
    total: state.interviews.length,
    scheduled: state.interviews.filter((interview) => interview.status === 'scheduled').length,
    evaluation: state.interviews.filter((interview) => interview.status === 'evaluation' || interview.status === 'in-progress').length,
    completed: state.interviews.filter((interview) => interview.status === 'completed').length,
    needsDecision: state.interviews.filter((interview) => interview.decision.decision === 'pending' && (interview.status === 'evaluation' || interview.status === 'in-progress')).length,
  }), [state.interviews]);

  const actions = {
    retryLoad: () => dispatch({ type: 'RETRY_LOAD' }),
    selectInterview: (interviewId: string) => dispatch({ type: 'SELECT_INTERVIEW', interviewId }),
    openSchedule: () => dispatch({ type: 'OPEN_SCHEDULE_DRAWER' }),
    closeSchedule: () => dispatch({ type: 'CLOSE_SCHEDULE_DRAWER' }),
    createInterview: (interview: Interview) => dispatch({ type: 'CREATE_INTERVIEW', interview }),
    updateStatus: (interviewId: string, status: InterviewStatus) => dispatch({ type: 'UPDATE_STATUS', interviewId, status }),
    setScore: (interviewId: string, criterionId: string, score: number | null) => dispatch({ type: 'SET_SCORE', interviewId, criterionId, score }),
    setCriterionNote: (interviewId: string, criterionId: string, note: string) => dispatch({ type: 'SET_CRITERION_NOTE', interviewId, criterionId, note }),
    setPracticalResult: (interviewId: string, itemId: string, result: import('../types/interview').PracticalResult, note: string) => dispatch({ type: 'SET_PRACTICAL_RESULT', interviewId, itemId, result, note }),
    setInterviewNote: (interviewId: string, note: string) => dispatch({ type: 'SET_INTERVIEW_NOTE', interviewId, note }),
    setDecision: (interviewId: string, decision: import('../types/interview').Decision, reason: string, note: string) => dispatch({ type: 'SET_DECISION', interviewId, decision, reason, note }),
  };

  return { state, selectedInterview, sortedInterviews, metrics, actions };
};
