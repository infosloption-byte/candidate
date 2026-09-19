import { API_BASE_URL } from '../../../shared/services/apiClient';
import type {
  Availability,
  Candidate,
  CandidateJourneyEvent,
  CandidateSource,
  CandidateStatus,
  CandidateOnboardingStatus,
  CandidateInvitationStatus,
  VisaStatus,
  CandidatePriority,
  DocumentState,
  EnglishLevel,
  RejectionReason,
} from '../types/candidate';

type CandidateRecord = Record<string, unknown>;

const seedCandidates: Candidate[] = [
  { id: 'cand-001', reference: 'CA-1001', name: 'Kasun Perera', phone: '+94 77 123 4567', passportNumber: 'N7XXXX21', age: 31, location: 'Colombo', profession: 'Mason', originalProfession: 'Mason', experienceYears: 9, secondarySkills: ['Tile', 'Putty', 'Plaster'], overseasCountries: ['Qatar', 'UAE'], englishLevel: 'Good', locationReady: true, drivingLicense: true, availability: 'Available now', source: 'Referral', status: 'interview', fitScore: 92, documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'verified' }, lastInterview: { date: '16 Sep 2026', interviewer: 'Nadeesha Fernando', role: 'Mason', result: 'Passed', score: 88, note: 'Strong finish work and site awareness.' }, journey: [{ id: 'e1', date: '16 Sep 2026', title: 'Interview passed', detail: 'Technical interview scored 88%.', tone: 'positive' }, { id: 'e2', date: '15 Sep 2026', title: 'Shortlisted', detail: 'Matched Mason requirement for Dubai project.', tone: 'positive' }, { id: 'e3', date: '12 Sep 2026', title: 'Candidate added', detail: 'Added from referral.', tone: 'neutral' }], createdAt: '2026-09-12' },
  { id: 'cand-002', reference: 'CA-1002', name: 'Ruwan Silva', phone: '+94 71 442 1902', passportNumber: 'N6XXXX78', age: 36, location: 'Gampaha', profession: 'Welder', originalProfession: 'Welder', experienceYears: 7, secondarySkills: ['Fabrication', 'Arc Welding'], overseasCountries: ['Saudi Arabia'], englishLevel: 'Working', locationReady: true, drivingLicense: false, availability: 'Within 2 weeks', source: 'Agency', status: 'screening', fitScore: 84, documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'needs-review' }, journey: [{ id: 'e1', date: '17 Sep 2026', title: 'Screening started', detail: 'Recruiter is checking trade fit and availability.', tone: 'warning' }, { id: 'e2', date: '17 Sep 2026', title: 'Candidate added', detail: 'Imported from agency shortlist.', tone: 'neutral' }], createdAt: '2026-09-17' },
  { id: 'cand-003', reference: 'CA-1003', name: 'Chaminda Jayasuriya', phone: '+94 76 201 9981', passportNumber: 'N5XXXX33', age: 29, location: 'Kurunegala', profession: 'Shuttering Carpenter', originalProfession: 'Carpenter', experienceYears: 6, secondarySkills: ['Formwork', 'Scaffolding'], overseasCountries: ['Oman', 'Qatar'], englishLevel: 'Working', locationReady: true, drivingLicense: true, availability: 'Available now', source: 'Walk-in', status: 'selected', fitScore: 89, documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'verified' }, lastInterview: { date: '14 Sep 2026', interviewer: 'Aruna Wijesinghe', role: 'Shuttering Carpenter', result: 'Passed', score: 91 }, journey: [{ id: 'e1', date: '16 Sep 2026', title: 'Selected', detail: 'Approved for the project shortlist.', tone: 'positive' }, { id: 'e2', date: '14 Sep 2026', title: 'Interview passed', detail: 'Technical and practical tests passed.', tone: 'positive' }], createdAt: '2026-09-10' },
  { id: 'cand-004', reference: 'CA-1004', name: 'Tharindu Fernando', phone: '+94 78 300 1144', passportNumber: 'N8XXXX09', age: 27, location: 'Negombo', profession: 'Tile Mason', originalProfession: 'Mason', experienceYears: 4, secondarySkills: ['Tile', 'Grouting'], overseasCountries: [], englishLevel: 'Basic', locationReady: true, drivingLicense: false, availability: 'Available now', source: 'Existing database', status: 'reserve', fitScore: 76, documents: { passport: 'needs-review', cv: 'verified', tradeCertificate: 'missing' }, lastInterview: { date: '11 Sep 2026', interviewer: 'Nadeesha Fernando', role: 'Tile Mason', result: 'Passed', score: 76 }, journey: [{ id: 'e1', date: '12 Sep 2026', title: 'Placed on reserve', detail: 'Technical fit met, but certificate is missing.', tone: 'warning' }], createdAt: '2026-08-28' },
  { id: 'cand-005', reference: 'CA-1005', name: 'Pradeep Kumara', phone: '+94 75 888 2017', passportNumber: 'N3XXXX90', age: 42, location: 'Matara', profession: 'Painter', originalProfession: 'Painter', experienceYears: 12, secondarySkills: ['Spray Paint', 'Putty'], overseasCountries: ['Kuwait'], englishLevel: 'Working', locationReady: false, drivingLicense: true, availability: 'Not available', source: 'Referral', status: 'rejected', fitScore: 61, documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'verified' }, lastInterview: { date: '09 Sep 2026', interviewer: 'Suresh Perera', role: 'Painter', result: 'Failed', score: 61, note: 'Finish quality below the current client requirement.' }, rejectionReason: 'Client requirement', rejectionNote: 'Practical finish quality did not meet the current client acceptance level.', journey: [{ id: 'e1', date: '09 Sep 2026', title: 'Rejected', detail: 'Client requirement: finish quality below threshold.', tone: 'negative' }], createdAt: '2026-08-21' },
];

const isRecord = (value: unknown): value is CandidateRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const asString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback = 0): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown, fallback = false): boolean => typeof value === 'boolean' ? value : fallback;
const asStringArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asCandidateStatus = (value: unknown): CandidateStatus => ['new', 'screening', 'interview', 'selected', 'reserve', 'rejected'].includes(value as string) ? value as CandidateStatus : 'new';
const asCandidateSource = (value: unknown): CandidateSource => ['Walk-in', 'Referral', 'Agency', 'Existing database', 'Bulk import'].includes(value as string) ? value as CandidateSource : 'Existing database';
const asEnglishLevel = (value: unknown): EnglishLevel => ['Basic', 'Working', 'Good', 'Strong', 'Not assessed'].includes(value as string) ? value as EnglishLevel : 'Not assessed';
const asAvailability = (value: unknown): Availability => ['Available now', 'Within 2 weeks', 'Within 1 month', 'Not available'].includes(value as string) ? value as Availability : 'Available now';
const asDocumentState = (value: unknown, fallback: DocumentState = 'missing'): DocumentState => ['verified', 'needs-review', 'missing', 'pending'].includes(value as string) ? (value === 'pending' ? 'needs-review' : value as DocumentState) : fallback;
const asOnboardingStatus = (value: unknown): CandidateOnboardingStatus => ['not-started', 'invited', 'in-progress', 'submitted', 'needs-changes', 'completed'].includes(value as string) ? value as CandidateOnboardingStatus : 'not-started';
const asInvitationStatus = (value: unknown): CandidateInvitationStatus => ['pending', 'opened', 'started', 'expired', 'cancelled'].includes(value as string) ? value as CandidateInvitationStatus : 'pending';
const asVisaStatus = (value: unknown): VisaStatus => ['Not started', 'Pending', 'Approved', 'Expired', 'Not required'].includes(value as string) ? value as VisaStatus : 'Not started';
const asPriority = (value: unknown): CandidatePriority => ['low', 'normal', 'high', 'urgent'].includes(value as string) ? value as CandidatePriority : 'normal';
const normalizeOnboarding = (record: CandidateRecord): Candidate['onboarding'] => {
  if (!isRecord(record.onboarding)) return { status: 'completed', completionPercent: 100, lastActivityAt: asString(record.createdAt) || undefined, reviewerNote: 'Legacy candidate record; onboarding tracking was introduced after this record was created.' };
  return {
    status: asOnboardingStatus(record.onboarding.status),
    completionPercent: Math.min(100, Math.max(0, asNumber(record.onboarding.completionPercent, 0))),
    invitedAt: asString(record.onboarding.invitedAt) || undefined,
    lastActivityAt: asString(record.onboarding.lastActivityAt) || undefined,
    submittedAt: asString(record.onboarding.submittedAt) || undefined,
    reviewedAt: asString(record.onboarding.reviewedAt) || undefined,
    reviewerNote: asString(record.onboarding.reviewerNote) || undefined,
    invitation: isRecord(record.onboarding.invitation) ? {
      status: asInvitationStatus(record.onboarding.invitation.status),
      sentAt: asString(record.onboarding.invitation.sentAt),
      lastSentAt: asString(record.onboarding.invitation.lastSentAt),
      expiresAt: asString(record.onboarding.invitation.expiresAt),
      openedAt: asString(record.onboarding.invitation.openedAt) || undefined,
      startedAt: asString(record.onboarding.invitation.startedAt) || undefined,
      reminderDueAt: asString(record.onboarding.invitation.reminderDueAt) || undefined,
      cancelledAt: asString(record.onboarding.invitation.cancelledAt) || undefined,
      sendCount: asNumber(record.onboarding.invitation.sendCount, 1),
    } : undefined,
  };
};

const asRejectionReason = (value: unknown): RejectionReason | undefined => ['Technical skill', 'Experience gap', 'Required skill missing', 'Communication', 'Documents', 'Availability', 'Client requirement', 'Other'].includes(value as string) ? value as RejectionReason : undefined;
const toneFromLegacy = (tone: unknown): CandidateJourneyEvent['tone'] => tone === 'positive' || tone === 'negative' || tone === 'warning' || tone === 'neutral' ? tone : 'neutral';

const normalizeJourney = (record: CandidateRecord): CandidateJourneyEvent[] => {
  if (Array.isArray(record.journey)) {
    return record.journey.filter(isRecord).map((item, index) => ({
      id: asString(item.id, `journey-${index}`),
      date: asString(item.date, 'Unknown date'),
      title: asString(item.title, 'Candidate update'),
      detail: asString(item.detail, ''),
      tone: toneFromLegacy(item.tone),
    }));
  }

  if (Array.isArray(record.timeline)) {
    return record.timeline.filter(isRecord).map((item, index) => ({
      id: asString(item.id, `legacy-${index}`),
      date: asString(item.date, 'Unknown date'),
      title: asString(item.title, 'Candidate update'),
      detail: asString(item.description, asString(item.detail, '')),
      tone: toneFromLegacy(item.tone),
    }));
  }

  return [{
    id: `created-${asString(record.id, Date.now().toString())}`,
    date: asString(record.createdAt, 'Recently'),
    title: 'Candidate imported',
    detail: 'Profile migrated into the current candidate workspace format.',
    tone: 'neutral',
  }];
};

const normalizeLastInterview = (record: CandidateRecord): Candidate['lastInterview'] => {
  if (!isRecord(record.lastInterview)) return undefined;
  const role = asString(record.lastInterview.role, asString(record.profession, 'Unknown'));
  const result = record.lastInterview.result;
  const normalizedResult = result === 'Passed' || result === 'Failed' || result === 'Pending' ? result : 'Pending';
  return {
    date: asString(record.lastInterview.date, 'Unknown date'),
    interviewer: asString(record.lastInterview.interviewer, 'Unknown interviewer'),
    role,
    result: normalizedResult,
    score: asNumber(record.lastInterview.score, 0),
    note: asString(record.lastInterview.note) || undefined,
  };
};

const normalizeCandidate = (value: unknown, index: number): Candidate => {
  const record = isRecord(value) ? value : {};
  const name = asString(record.name, `Candidate ${index + 1}`);
  const experienceYears = asNumber(record.experienceYears, asNumber(record.experience, 0));
  const secondarySkills = asStringArray(record.secondarySkills);
  const overseasCountries = asStringArray(record.overseasCountries);
  const legacyCountry = asString(record.overseasExperience);
  if (overseasCountries.length === 0 && legacyCountry) overseasCountries.push(legacyCountry);
  const documents = isRecord(record.documents) ? record.documents : {};

  return {
    id: asString(record.id, `migrated-${index}`),
    reference: asString(record.reference, `CA-${String(1000 + index).padStart(4, '0')}`),
    name,
    phone: asString(record.phone, asString(record.mobile, '')),
    passportNumber: asString(record.passportNumber, asString(record.passport, '')),
    age: asNumber(record.age, 0),
    location: asString(record.location, 'Not provided'),
    profession: asString(record.profession, 'Not specified'),
    originalProfession: asString(record.originalProfession, asString(record.profession, 'Not specified')),
    experienceYears,
    secondarySkills,
    overseasCountries,
    englishLevel: asEnglishLevel(record.englishLevel),
    locationReady: asBoolean(record.locationReady, asBoolean(record.locationCapability, false)),
    drivingLicense: asBoolean(record.drivingLicense, asBoolean(record.drivingLicence, false)),
    availability: asAvailability(record.availability),
    source: asCandidateSource(record.source),
    status: asCandidateStatus(record.status),
    onboarding: normalizeOnboarding(record),
    fitScore: asNumber(record.fitScore, 0),
    documents: {
      passport: asDocumentState(documents.passport),
      cv: asDocumentState(documents.cv),
      tradeCertificate: asDocumentState(documents.tradeCertificate, asDocumentState(documents.certificate, 'missing')),
      visa: asDocumentState(documents.visa, 'missing'),
    },
    lastInterview: normalizeLastInterview(record),
    rejectionReason: asRejectionReason(record.rejectionReason),
    rejectionNote: asString(record.rejectionNote) || undefined,
    journey: normalizeJourney(record),
    createdAt: asString(record.createdAt, new Date().toISOString()),
    nationality: asString(record.nationality) || undefined,
    dateOfBirth: asString(record.dateOfBirth) || undefined,
    passportExpiry: asString(record.passportExpiry) || undefined,
    visaStatus: asVisaStatus(record.visaStatus),
    preferredDestinationCountries: asStringArray(record.preferredDestinationCountries),
    expectedSalary: asString(record.expectedSalary) || undefined,
    salaryCurrency: asString(record.salaryCurrency) || undefined,
    noticePeriod: asString(record.noticePeriod) || undefined,
    yearsInCurrentTrade: asNumber(record.yearsInCurrentTrade, experienceYears),
    tradeCertificateDetails: asString(record.tradeCertificateDetails) || undefined,
    drivingLicenseCategories: asStringArray(record.drivingLicenseCategories),
    preferredInterviewLanguage: asString(record.preferredInterviewLanguage) || undefined,
    emergencyContact: isRecord(record.emergencyContact) ? { name: asString(record.emergencyContact.name), phone: asString(record.emergencyContact.phone), relationship: asString(record.emergencyContact.relationship) } : undefined,
    recruiterOwnerId: asString(record.recruiterOwnerId) || undefined,
    recruiterOwnerName: asString(record.recruiterOwnerName) || undefined,
    priority: asPriority(record.priority),
    sourceCampaign: asString(record.sourceCampaign) || undefined,
  };
};

export const loadCandidates = async (): Promise<Candidate[]> => {
  const response = await fetch(`${API_BASE_URL}/candidates?page=1&pageSize=100`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Candidate data could not be loaded from the backend.");
  }

  const payload = await response.json() as {
    success: boolean;
    data?: { items: Candidate[] };
  };

  if (!payload.success || !payload.data) {
    throw new Error("The backend returned an invalid candidate response.");
  }

  return payload.data.items;
};
