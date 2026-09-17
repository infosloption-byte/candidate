import type {
  Availability,
  Candidate,
  CandidateJourneyEvent,
  CandidateSource,
  CandidateStatus,
  DocumentState,
  EnglishLevel,
  RejectionReason,
} from '../types/candidate';

const STORAGE_KEY = 'buildhire.candidates';

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
const asCandidateSource = (value: unknown): CandidateSource => ['Walk-in', 'Referral', 'Agency', 'Existing database'].includes(value as string) ? value as CandidateSource : 'Existing database';
const asEnglishLevel = (value: unknown): EnglishLevel => ['Basic', 'Working', 'Good', 'Strong', 'Not assessed'].includes(value as string) ? value as EnglishLevel : 'Not assessed';
const asAvailability = (value: unknown): Availability => ['Available now', 'Within 2 weeks', 'Within 1 month', 'Not available'].includes(value as string) ? value as Availability : 'Available now';
const asDocumentState = (value: unknown, fallback: DocumentState = 'missing'): DocumentState => ['verified', 'needs-review', 'missing', 'pending'].includes(value as string) ? (value === 'pending' ? 'needs-review' : value as DocumentState) : fallback;
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
    fitScore: asNumber(record.fitScore, 0),
    documents: {
      passport: asDocumentState(documents.passport),
      cv: asDocumentState(documents.cv),
      tradeCertificate: asDocumentState(documents.tradeCertificate, asDocumentState(documents.certificate, 'missing')),
    },
    lastInterview: normalizeLastInterview(record),
    rejectionReason: asRejectionReason(record.rejectionReason),
    rejectionNote: asString(record.rejectionNote) || undefined,
    journey: normalizeJourney(record),
    createdAt: asString(record.createdAt, new Date().toISOString()),
  };
};

export const loadCandidates = async (): Promise<Candidate[]> => {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedCandidates;

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed)) return seedCandidates;
  return parsed.map(normalizeCandidate);
};

export const saveCandidates = async (candidates: Candidate[]): Promise<void> => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
};
