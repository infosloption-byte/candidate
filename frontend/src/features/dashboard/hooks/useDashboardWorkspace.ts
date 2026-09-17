import { useMemo } from 'react';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { useInterviewWorkspace } from '../../interviews/hooks/useInterviewWorkspace';
import { buildDashboardSnapshot } from '../services/dashboardMetrics';

export const useDashboardWorkspace = () => {
  const { state: candidateState } = useCandidateWorkspace();
  const { state: interviewState } = useInterviewWorkspace();

  const snapshot = useMemo(
    () => buildDashboardSnapshot(candidateState.candidates, interviewState.interviews),
    [candidateState.candidates, interviewState.interviews],
  );

  return {
    snapshot,
    loading: candidateState.loadState === 'loading' || interviewState.loadState === 'loading',
    hasError: candidateState.loadState === 'error' || interviewState.loadState === 'error',
  };
};
