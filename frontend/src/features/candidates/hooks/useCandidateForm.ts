import { useMemo, useState } from 'react';
import type { Candidate, CandidateDraft, CandidateSource, EnglishLevel, Availability } from '../types/candidate';

const emptyDraft: CandidateDraft = {
  name: '', phone: '', passportNumber: '', age: '', location: '', profession: '', originalProfession: '', experienceYears: '', secondarySkills: '', overseasCountries: '', englishLevel: 'Working', locationReady: true, drivingLicense: false, availability: 'Available now', source: 'Walk-in',
};

const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `cand-${Date.now()}`);

export const useCandidateForm = (onCreate: (candidate: Candidate) => void, onClose: () => void) => {
  const [draft, setDraft] = useState<CandidateDraft>(emptyDraft);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateField = <K extends keyof CandidateDraft>(field: K, value: CandidateDraft[K]) => { setDraft((current) => ({ ...current, [field]: value })); setError(null); };
  const next = () => {
    if (step === 1) {
      if (!draft.name.trim() || !draft.phone.trim() || !draft.profession.trim()) { setError('Add the candidate name, phone number and profession to continue.'); return; }
      setStep(2); return;
    }
    if (!draft.experienceYears || Number(draft.experienceYears) < 0) { setError('Enter the candidate experience in years.'); return; }
    setStep(3); setError(null);
  };
  const back = () => { setError(null); setStep((current) => current === 1 ? 1 : (current - 1) as 1 | 2); };
  const submit = () => {
    if (!draft.name.trim() || !draft.phone.trim() || !draft.profession.trim() || !draft.experienceYears) { setError('Complete the required candidate details before saving.'); return; }
    const now = new Date().toISOString();
    const candidate: Candidate = {
      id: makeId(), reference: `CA-${Math.floor(1000 + Math.random() * 8999)}`, name: draft.name.trim(), phone: draft.phone.trim(), passportNumber: draft.passportNumber.trim() || 'Not provided', age: Number(draft.age) || 0,
      location: draft.location.trim() || 'Not provided', profession: draft.profession.trim(), originalProfession: draft.originalProfession.trim() || draft.profession.trim(), experienceYears: Number(draft.experienceYears),
      secondarySkills: draft.secondarySkills.split(',').map((value) => value.trim()).filter(Boolean), overseasCountries: draft.overseasCountries.split(',').map((value) => value.trim()).filter(Boolean),
      englishLevel: draft.englishLevel, locationReady: draft.locationReady, drivingLicense: draft.drivingLicense, availability: draft.availability, source: draft.source, status: 'new', fitScore: 0,
      documents: { passport: draft.passportNumber.trim() ? 'needs-review' : 'missing', cv: 'missing', tradeCertificate: 'missing' }, journey: [{ id: makeId(), date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), title: 'Candidate added', detail: `Added from ${draft.source.toLowerCase()}.`, tone: 'neutral' }], createdAt: now,
    };
    onCreate(candidate); setSaved(true); setDraft(emptyDraft); setStep(1); setError(null); onClose();
  };
  const setEnglishLevel = (value: string) => updateField('englishLevel', value as EnglishLevel);
  const setAvailability = (value: string) => updateField('availability', value as Availability);
  const setSource = (value: CandidateSource) => updateField('source', value);
  const reset = () => { setDraft(emptyDraft); setStep(1); setError(null); setSaved(false); };

  return useMemo(() => ({ draft, step, error, saved, updateField, next, back, submit, setEnglishLevel, setAvailability, setSource, reset }), [draft, step, error, saved]);
};
