import type { Candidate, CandidateDraft, CandidateDuplicateMatch, DuplicateConfidence } from '../types/candidate';

const normalize = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizePhone = (value: string): string => value.replace(/\D/g, '').replace(/^0+/, '');
const usableValue = (value: string): boolean => {
  const normalized = normalize(value);
  return normalized.length > 2 && !['notprovided', 'unknown', 'noprovided'].includes(normalized);
};

const compareCandidatePair = (source: Candidate, target: Candidate): CandidateDuplicateMatch | null => {
  const reasons: string[] = [];
  let score = 0;

  const sourcePassport = normalize(source.passportNumber);
  const targetPassport = normalize(target.passportNumber);
  if (usableValue(source.passportNumber) && sourcePassport === targetPassport) {
    reasons.push('Same passport number');
    score += 80;
  }

  const sourcePhone = normalizePhone(source.phone);
  const targetPhone = normalizePhone(target.phone);
  if (sourcePhone.length >= 7 && sourcePhone === targetPhone) {
    reasons.push('Same phone number');
    score += 70;
  }

  const sameName = normalize(source.name) === normalize(target.name);
  if (sameName) {
    reasons.push('Same full name');
    score += 35;
  }

  const sameProfession = normalize(source.profession) === normalize(target.profession);
  if (sameProfession) score += 10;

  if (source.age > 0 && target.age > 0 && Math.abs(source.age - target.age) <= 1) {
    reasons.push('Age is within one year');
    score += 10;
  }

  if (!sameName && score < 70) return null;

  const confidence: DuplicateConfidence = score >= 70 ? 'high' : 'possible';
  if (confidence === 'possible' && reasons.length < 2) return null;

  return { candidateId: target.id, confidence, score: Math.min(score, 100), reasons };
};

const compareDraftPair = (draft: CandidateDraft, target: Candidate): CandidateDuplicateMatch | null => {
  const reasons: string[] = [];
  let score = 0;
  const draftPassport = normalize(draft.passportNumber);
  const targetPassport = normalize(target.passportNumber);
  if (usableValue(draft.passportNumber) && draftPassport === targetPassport) {
    reasons.push('Same passport number');
    score += 80;
  }

  const draftPhone = normalizePhone(draft.phone);
  const targetPhone = normalizePhone(target.phone);
  if (draftPhone.length >= 7 && draftPhone === targetPhone) {
    reasons.push('Same phone number');
    score += 70;
  }

  const draftName = normalize(draft.name);
  const targetName = normalize(target.name);
  const sameName = draftName.length > 2 && draftName === targetName;
  if (sameName) {
    reasons.push('Same full name');
    score += 35;
  }

  const draftProfession = normalize(draft.profession);
  const sameProfession = draftProfession.length > 2 && draftProfession === normalize(target.profession);
  if (sameProfession) score += 10;

  const age = Number(draft.age);
  if (Number.isFinite(age) && age > 0 && target.age > 0 && Math.abs(age - target.age) <= 1) {
    reasons.push('Age is within one year');
    score += 10;
  }

  if (!sameName && score < 70) return null;

  const confidence: DuplicateConfidence = score >= 70 ? 'high' : 'possible';
  if (confidence === 'possible' && reasons.length < 2) return null;

  return { candidateId: target.id, confidence, score: Math.min(score, 100), reasons };
};

export const findDuplicateMatches = (candidates: Candidate[], candidateId: string): CandidateDuplicateMatch[] => {
  const source = candidates.find((candidate) => candidate.id === candidateId);
  if (!source) return [];
  return candidates
    .filter((candidate) => candidate.id !== candidateId)
    .map((candidate) => compareCandidatePair(source, candidate))
    .filter((match): match is CandidateDuplicateMatch => match !== null)
    .sort((left, right) => right.score - left.score);
};

export const findDuplicateMatchesForDraft = (candidates: Candidate[], draft: CandidateDraft): CandidateDuplicateMatch[] => {
  if (normalize(draft.name).length < 3 && normalizePhone(draft.phone).length < 7 && !usableValue(draft.passportNumber)) return [];
  return candidates
    .map((candidate) => compareDraftPair(draft, candidate))
    .filter((match): match is CandidateDuplicateMatch => match !== null)
    .sort((left, right) => right.score - left.score);
};
