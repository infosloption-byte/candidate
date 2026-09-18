import { useMemo, useState } from 'react';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { useInterviewWorkspace } from '../../interviews/hooks/useInterviewWorkspace';
import { buildReportSnapshot, reportToCsv } from '../services/reportMetrics';
import type { ReportFilters, ReportRange } from '../types/reports';

export const useReportsWorkspace = () => {
  const { state: candidateState, actions: candidateActions } = useCandidateWorkspace();
  const { state: interviewState, actions: interviewActions } = useInterviewWorkspace();
  const [filters, setFilters] = useState<ReportFilters>({ range: '30d', profession: 'all' });

  const professions = useMemo(
    () => ['all', ...Array.from(new Set(candidateState.candidates.map((candidate) => candidate.profession))).sort()],
    [candidateState.candidates],
  );

  const snapshot = useMemo(
    () => buildReportSnapshot(candidateState.candidates, interviewState.interviews, filters),
    [candidateState.candidates, interviewState.interviews, filters],
  );

  const retry = () => {
    if (candidateState.loadState === 'error') candidateActions.retryLoad();
    if (interviewState.loadState === 'error') interviewActions.retryLoad();
  };

  const downloadCsv = () => {
    const blob = new Blob([reportToCsv(snapshot)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'buildhire-report-' + filters.range + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return {
    state: { filters, snapshot, professions },
    loading: candidateState.loadState === 'loading' || interviewState.loadState === 'loading',
    hasError: candidateState.loadState === 'error' || interviewState.loadState === 'error',
    actions: {
      setRange: (range: ReportRange) => setFilters((current) => ({ ...current, range })),
      setProfession: (profession: string) => setFilters((current) => ({ ...current, profession: profession as ReportFilters['profession'] })),
      downloadCsv,
      retry,
    },
  };
};
