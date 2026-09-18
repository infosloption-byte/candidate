import { useEffect, useMemo, useState } from 'react';
import { useCandidateWorkspace } from './useCandidateWorkspace';
import type { Candidate, CandidatePriority, VisaStatus } from '../types/candidate';

export interface CandidateOperationalProfileDraft {
  nationality: string;
  dateOfBirth: string;
  passportExpiry: string;
  visaStatus: VisaStatus;
  preferredDestinationCountries: string;
  expectedSalary: string;
  salaryCurrency: string;
  noticePeriod: string;
  yearsInCurrentTrade: string;
  tradeCertificateDetails: string;
  drivingLicenseCategories: string;
  preferredInterviewLanguage: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  recruiterOwnerName: string;
  priority: CandidatePriority;
  sourceCampaign: string;
}

export interface CandidateOperationalProfileController {
  open: boolean;
  draft: CandidateOperationalProfileDraft;
  actions: {
    open: () => void;
    close: () => void;
    update: <K extends keyof CandidateOperationalProfileDraft>(key: K, value: CandidateOperationalProfileDraft[K]) => void;
    save: () => void;
  };
}

export const useCandidateOperationalProfile = (candidate: Candidate | null): CandidateOperationalProfileController => {
  const { actions: candidateActions } = useCandidateWorkspace();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CandidateOperationalProfileDraft>(() => ({
    nationality: candidate?.nationality ?? '',
    dateOfBirth: candidate?.dateOfBirth ?? '',
    passportExpiry: candidate?.passportExpiry ?? '',
    visaStatus: candidate?.visaStatus ?? 'Not started',
    preferredDestinationCountries: candidate?.preferredDestinationCountries?.join(', ') ?? '',
    expectedSalary: candidate?.expectedSalary ?? '',
    salaryCurrency: candidate?.salaryCurrency ?? 'USD',
    noticePeriod: candidate?.noticePeriod ?? '',
    yearsInCurrentTrade: String(candidate?.yearsInCurrentTrade ?? candidate?.experienceYears ?? 0),
    tradeCertificateDetails: candidate?.tradeCertificateDetails ?? '',
    drivingLicenseCategories: candidate?.drivingLicenseCategories?.join(', ') ?? '',
    preferredInterviewLanguage: candidate?.preferredInterviewLanguage ?? 'English',
    emergencyName: candidate?.emergencyContact?.name ?? '',
    emergencyPhone: candidate?.emergencyContact?.phone ?? '',
    emergencyRelationship: candidate?.emergencyContact?.relationship ?? '',
    recruiterOwnerName: candidate?.recruiterOwnerName ?? '',
    priority: candidate?.priority ?? 'normal',
    sourceCampaign: candidate?.sourceCampaign ?? '',
  }));

  useEffect(() => {
    setDraft({
      nationality: candidate?.nationality ?? '',
      dateOfBirth: candidate?.dateOfBirth ?? '',
      passportExpiry: candidate?.passportExpiry ?? '',
      visaStatus: candidate?.visaStatus ?? 'Not started',
      preferredDestinationCountries: candidate?.preferredDestinationCountries?.join(', ') ?? '',
      expectedSalary: candidate?.expectedSalary ?? '',
      salaryCurrency: candidate?.salaryCurrency ?? 'USD',
      noticePeriod: candidate?.noticePeriod ?? '',
      yearsInCurrentTrade: String(candidate?.yearsInCurrentTrade ?? candidate?.experienceYears ?? 0),
      tradeCertificateDetails: candidate?.tradeCertificateDetails ?? '',
      drivingLicenseCategories: candidate?.drivingLicenseCategories?.join(', ') ?? '',
      preferredInterviewLanguage: candidate?.preferredInterviewLanguage ?? 'English',
      emergencyName: candidate?.emergencyContact?.name ?? '',
      emergencyPhone: candidate?.emergencyContact?.phone ?? '',
      emergencyRelationship: candidate?.emergencyContact?.relationship ?? '',
      recruiterOwnerName: candidate?.recruiterOwnerName ?? '',
      priority: candidate?.priority ?? 'normal',
      sourceCampaign: candidate?.sourceCampaign ?? '',
    });
    setOpen(false);
  }, [candidate?.id]);

  const normalized = useMemo<Partial<Candidate>>(() => ({
    nationality: draft.nationality.trim() || undefined,
    dateOfBirth: draft.dateOfBirth || undefined,
    passportExpiry: draft.passportExpiry || undefined,
    visaStatus: draft.visaStatus,
    preferredDestinationCountries: draft.preferredDestinationCountries.split(',').map((value) => value.trim()).filter(Boolean),
    expectedSalary: draft.expectedSalary.trim() || undefined,
    salaryCurrency: draft.salaryCurrency.trim() || undefined,
    noticePeriod: draft.noticePeriod.trim() || undefined,
    yearsInCurrentTrade: Math.max(0, Number(draft.yearsInCurrentTrade) || 0),
    tradeCertificateDetails: draft.tradeCertificateDetails.trim() || undefined,
    drivingLicenseCategories: draft.drivingLicenseCategories.split(',').map((value) => value.trim()).filter(Boolean),
    preferredInterviewLanguage: draft.preferredInterviewLanguage.trim() || undefined,
    emergencyContact: draft.emergencyName.trim() || draft.emergencyPhone.trim()
      ? { name: draft.emergencyName.trim(), phone: draft.emergencyPhone.trim(), relationship: draft.emergencyRelationship.trim() }
      : undefined,
    recruiterOwnerName: draft.recruiterOwnerName.trim() || undefined,
    priority: draft.priority,
    sourceCampaign: draft.sourceCampaign.trim() || undefined,
  }), [draft]);

  const save = () => {
    if (!candidate) return;
    candidateActions.updateProfile(candidate.id, normalized, {
      id: 'profile-ops-' + Date.now(),
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      title: 'Operational profile updated',
      detail: 'Recruitment operational fields were updated.',
      tone: 'neutral',
    });
    setOpen(false);
  };

  return {
    open,
    draft,
    actions: {
      open: () => setOpen(true),
      close: () => setOpen(false),
      update: <K extends keyof CandidateOperationalProfileDraft>(key: K, value: CandidateOperationalProfileDraft[K]) =>
        setDraft((current) => ({ ...current, [key]: value })),
      save,
    },
  };
};
