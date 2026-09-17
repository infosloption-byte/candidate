import { useState } from 'react';
import type { Candidate, CandidateDraft, CandidateSource } from '../types/candidate';

const emptyDraft: CandidateDraft = {
  name: '',
  profession: '',
  location: '',
  phone: '',
  experienceYears: '',
  secondarySkills: '',
  source: 'Walk-in',
};

export const useCandidateForm = (onCreate: (candidate: Candidate) => void, onClose: () => void) => {
  const [draft, setDraft] = useState<CandidateDraft>(emptyDraft);
  const [error, setError] = useState<string>('');

  const updateField = <Key extends keyof CandidateDraft>(key: Key, value: CandidateDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const submit = () => {
    const name = draft.name.trim();
    const profession = draft.profession.trim();
    const experienceYears = Number(draft.experienceYears);
    if (!name || !profession || !draft.phone.trim()) {
      setError('Name, profession and phone number are required.');
      return;
    }
    if (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 50) {
      setError('Enter experience between 0 and 50 years.');
      return;
    }

    const referenceNumber = `${Date.now()}`.slice(-4);
    const initials = name.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase();
    const skills = draft.secondarySkills.split(',').map((skill) => skill.trim()).filter(Boolean);
    const candidate: Candidate = {
      id: `cand-${Date.now()}`,
      reference: `CA-${referenceNumber}`,
      name,
      initials,
      profession,
      secondarySkills: skills,
      experienceYears,
      overseasCountries: [],
      englishLevel: 'Not assessed',
      location: draft.location.trim() || 'Not provided',
      phone: draft.phone.trim(),
      email: '',
      age: 0,
      source: draft.source,
      status: 'new',
      fitScore: 0,
      fitReasons: ['Awaiting screening'],
      availability: 'Available now',
      expectedSalary: 'Not discussed',
      drivingLicence: false,
      alcoholRestriction: false,
      experience: [],
      documents: { passport: 'pending', cv: 'pending', certificate: 'pending' },
      timeline: [{ id: `created-${Date.now()}`, title: 'Candidate created', description: 'Awaiting initial screening', date: 'Just now', tone: 'neutral' }],
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    onCreate(candidate);
    setDraft(emptyDraft);
    onClose();
  };

  const reset = () => {
    setDraft(emptyDraft);
    setError('');
  };

  return { draft, error, updateField, submit, reset, setSource: (value: CandidateSource) => updateField('source', value) };
};
