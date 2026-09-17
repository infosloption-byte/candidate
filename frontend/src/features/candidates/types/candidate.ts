export type CandidateStatus = 'new' | 'screening' | 'interview' | 'selected' | 'reserve' | 'rejected';
export type CandidateSource = 'Walk-in' | 'Referral' | 'Agency' | 'Existing database';
export type EnglishLevel = 'Basic' | 'Working' | 'Good' | 'Strong';
export type Availability = 'Available now' | 'Within 2 weeks' | 'Within 1 month' | 'Not available';
export type DocumentState = 'verified' | 'needs-review' | 'missing';
export type RejectionReason = 'Technical skill' | 'Experience gap' | 'Required skill missing' | 'Communication' | 'Documents' | 'Availability' | 'Client requirement' | 'Other';

export interface CandidateDocumentSummary {
  passport: DocumentState;
  cv: DocumentState;
  tradeCertificate: DocumentState;
}

export interface CandidateInterviewSummary {
  date: string;
  interviewer: string;
  role: string;
  result: 'Passed' | 'Failed' | 'Pending';
  score: number;
  note?: string;
}

export interface CandidateJourneyEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  tone: 'neutral' | 'positive' | 'warning' | 'negative';
}

export interface Candidate {
  id: string;
  reference: string;
  name: string;
  phone: string;
  passportNumber: string;
  age: number;
  location: string;
  profession: string;
  originalProfession: string;
  experienceYears: number;
  secondarySkills: string[];
  overseasCountries: string[];
  englishLevel: EnglishLevel;
  locationReady: boolean;
  drivingLicense: boolean;
  availability: Availability;
  source: CandidateSource;
  status: CandidateStatus;
  fitScore: number;
  documents: CandidateDocumentSummary;
  lastInterview?: CandidateInterviewSummary;
  rejectionReason?: RejectionReason;
  rejectionNote?: string;
  journey: CandidateJourneyEvent[];
  createdAt: string;
}

export interface CandidateDraft {
  name: string;
  phone: string;
  passportNumber: string;
  age: string;
  location: string;
  profession: string;
  originalProfession: string;
  experienceYears: string;
  secondarySkills: string;
  overseasCountries: string;
  englishLevel: EnglishLevel;
  locationReady: boolean;
  drivingLicense: boolean;
  availability: Availability;
  source: CandidateSource;
}

export interface CandidateFilters {
  search: string;
  status: CandidateStatus | 'all';
  profession: string;
}
