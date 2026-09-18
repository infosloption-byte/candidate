import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { useDocumentsWorkspace } from '../../documents/hooks/useDocumentsWorkspace';
import type { Candidate } from '../../candidates/types/candidate';

export type PortalStep = 1 | 2 | 3 | 4 | 5;

interface PortalDraft {
  name: string;
  phone: string;
  passportNumber: string;
  age: string;
  location: string;
  profession: string;
  experienceYears: string;
  secondarySkills: string;
  englishLevel: Candidate['englishLevel'];
  availability: Candidate['availability'];
  drivingLicense: boolean;
  locationReady: boolean;
  consent: boolean;
}

const makeDraft = (candidate: Candidate): PortalDraft => ({
  name: candidate.name,
  phone: candidate.phone,
  passportNumber: candidate.passportNumber === 'Not provided' ? '' : candidate.passportNumber,
  age: String(candidate.age || ''),
  location: candidate.location,
  profession: candidate.profession,
  experienceYears: String(candidate.experienceYears),
  secondarySkills: candidate.secondarySkills.join(', '),
  englishLevel: candidate.englishLevel,
  availability: candidate.availability,
  drivingLicense: candidate.drivingLicense,
  locationReady: candidate.locationReady,
  consent: false,
});

const onboardingEvent = (title: string, detail: string, tone: Candidate['journey'][number]['tone']) => ({
  id: 'portal-' + Date.now(),
  date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
  title,
  detail,
  tone,
});

export const useCandidatePortal = () => {
  const { state: authState, dispatch: authDispatch } = useAuth();
  const { state: candidateState, actions: candidateActions } = useCandidateWorkspace();
  const documents = useDocumentsWorkspace();
  const candidate = useMemo(
    () => candidateState.candidates.find((item) => item.id === authState.user.candidateId) ?? null,
    [authState.user.candidateId, candidateState.candidates],
  );
  const [step, setStep] = useState<PortalStep>(1);
  const [draft, setDraft] = useState<PortalDraft | null>(() => candidate ? makeDraft(candidate) : null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (candidate && !draft) setDraft(makeDraft(candidate));
  }, [candidate, draft]);

  useEffect(() => {
    if (candidate?.id && documents.selectedCandidate?.id !== candidate.id) documents.actions.setSelectedCandidateId(candidate.id);
  }, [candidate?.id, documents.selectedCandidate?.id, documents.actions]);

  const update = (patch: Partial<PortalDraft>) => setDraft((current) => current ? { ...current, ...patch } : current);

  const saveStep = (): boolean => {
    if (!candidate || !draft) return false;
    if (step === 1 && (!draft.name.trim() || !draft.phone.trim() || !draft.location.trim())) return false;
    if (step === 2 && (!draft.profession.trim() || Number(draft.experienceYears) < 0)) return false;
    candidateActions.updateProfile(candidate.id, {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      passportNumber: draft.passportNumber.trim() || 'Not provided',
      age: Number(draft.age) || 0,
      location: draft.location.trim(),
      profession: draft.profession.trim(),
      originalProfession: candidate.originalProfession,
      experienceYears: Number(draft.experienceYears) || 0,
      secondarySkills: draft.secondarySkills.split(',').map((value) => value.trim()).filter(Boolean),
      englishLevel: draft.englishLevel,
      availability: draft.availability,
      drivingLicense: draft.drivingLicense,
      locationReady: draft.locationReady,
    }, onboardingEvent('Candidate profile updated', 'Candidate details were updated through self-service onboarding.', 'neutral'));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
    return true;
  };

  const next = () => {
    if (!saveStep()) return false;
    if (step < 5) setStep((current) => (current + 1) as PortalStep);
    return true;
  };

  const back = () => setStep((current) => (current === 1 ? 1 : (current - 1) as PortalStep));

  const submit = () => {
    if (!candidate || !draft || !draft.consent) return false;
    if (!saveStep()) return false;
    candidateActions.updateOnboarding(candidate.id, {
      status: 'submitted',
      completionPercent: 100,
      submittedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      reviewedAt: candidate.onboarding?.reviewedAt,
      reviewerNote: candidate.onboarding?.reviewerNote,
    }, onboardingEvent('Onboarding submitted', 'Candidate completed the self-service profile and submitted it for recruiter review.', 'positive'));
    setSaved(true);
    return true;
  };

  return {
    authState,
    candidate,
    step,
    draft,
    saved,
    documents,
    update,
    actions: { next, back, setStep, submit, logout: () => authDispatch({ type: 'LOGOUT' }) },
  };
};
