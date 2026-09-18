import type { Candidate } from '../src/features/candidates/types/candidate';
import type { Interview, Interviewer } from '../src/features/interviews/types/interview';

export const makeCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  id: 'candidate-001',
  reference: 'CA-1001',
  name: 'Kasun Perera',
  phone: '+94 77 123 4567',
  passportNumber: 'N7XXXX21',
  age: 31,
  location: 'Colombo',
  profession: 'Mason',
  originalProfession: 'Mason',
  experienceYears: 9,
  secondarySkills: ['Tile', 'Putty', 'Plaster'],
  overseasCountries: ['Qatar', 'UAE'],
  englishLevel: 'Good',
  locationReady: true,
  drivingLicense: true,
  availability: 'Available now',
  source: 'Referral',
  status: 'screening',
  fitScore: 90,
  documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'verified' },
  journey: [],
  createdAt: '2026-09-12T00:00:00.000Z',
  ...overrides,
});

export const makeInterviewer = (overrides: Partial<Interviewer> = {}): Interviewer => ({
  id: 'interviewer-001',
  name: 'Nadeesha Fernando',
  role: 'Technical interviewer',
  specialties: ['Mason', 'Tile Mason'],
  active: true,
  ...overrides,
});

export const makeInterview = (overrides: Partial<Interview> = {}): Interview => ({
  id: 'interview-001',
  reference: 'IV-1001',
  candidateId: 'candidate-001',
  candidateName: 'Kasun Perera',
  profession: 'Mason',
  type: 'Technical',
  status: 'scheduled',
  date: '21 Sep 2026',
  time: '09:00',
  durationMinutes: 30,
  location: 'Colombo Interview Centre',
  interviewers: [makeInterviewer()],
  notes: '',
  scorecard: { templateId: 'mason', criteria: [] },
  practicalTest: [],
  decision: { decision: 'pending', reason: '', note: '' },
  createdAt: '2026-09-20T00:00:00.000Z',
  ...overrides,
});
