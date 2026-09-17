import { useMemo } from 'react';
import type { Candidate } from '../../candidates/types/candidate';
import type { SelectionCandidateRow } from './useSelectionWorkspace';
import type { SelectionJob, SelectionScoringWeights } from '../types/selection';

export interface SelectionSuitabilityBreakdown {
  score: number;
  weights: SelectionScoringWeights;
  factors: Array<{ key: keyof SelectionScoringWeights; label: string; value: number; weight: number; contribution: number }>;
}

const communicationScore = (level: Candidate['englishLevel']): number => ({ 'Not assessed': 0, Basic: 35, Working: 60, Good: 80, Strong: 100 }[level]);
const documentScore = (candidate: Candidate): number => {
  const states = Object.values(candidate.documents);
  if (states.every((state) => state === 'verified')) return 100;
  const verified = states.filter((state) => state === 'verified').length;
  const needsReview = states.filter((state) => state === 'needs-review').length;
  return Math.round(((verified + needsReview * 0.6) / states.length) * 100);
};

export const useSelectionSuitability = (row: SelectionCandidateRow | null, job: SelectionJob | null, weights: SelectionScoringWeights): SelectionSuitabilityBreakdown | null => useMemo(() => {
  if (!row || !job) return null;
  const candidate = row.candidate;
  const experience = job.requiredExperience <= 0 ? 100 : Math.min(Math.round((candidate.experienceYears / job.requiredExperience) * 100), 100);
  const readiness = candidate.locationReady && candidate.availability !== 'Not available' ? 100 : candidate.locationReady || candidate.availability !== 'Not available' ? 55 : 0;
  const interview = row.interviewScore ?? 0;
  const values: Record<keyof SelectionScoringWeights, number> = { experience, skills: row.skillMatchPercent, interview, documents: documentScore(candidate), readiness, communication: communicationScore(candidate.englishLevel) };
  const labels: Record<keyof SelectionScoringWeights, string> = { experience: 'Experience', skills: 'Required skills', interview: 'Interview evidence', documents: 'Documents', readiness: 'Readiness', communication: 'Communication' };
  const keys = Object.keys(weights) as Array<keyof SelectionScoringWeights>;
  const factors = keys.map((key) => ({ key, label: labels[key], value: values[key], weight: weights[key], contribution: Math.round((values[key] * weights[key]) / 100) }));
  return { score: Math.round(factors.reduce((sum, factor) => sum + factor.contribution, 0)), weights, factors };
}, [job, row, weights]);
