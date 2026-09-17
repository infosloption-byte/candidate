export type CandidateStatus = 'new' | 'screening' | 'interview' | 'selected' | 'reserve' | 'rejected';

export type CandidateSource = 'Walk-in' | 'Referral' | 'Agency' | 'Existing database';

export interface CandidateExperience {
  company: string;
  country: string;
  role: string;
  years: number;
}

export interface CandidateDocumentStatus {
  passport: 'verified' | 'pending' | 'missing';
  cv: 'verified' | 'pending' | 'missing';
  certificate: 'verified' | 'pending' | 'missing';
}

export interface CandidateTimelineItem {
  id: string;
  title: string;
  description: string;
  date: string;
  tone: 'neutral' | 'positive' | 'warning' | 'negative';
}

export interface Candidate {
  id: string;
  reference: string;
  name: string;
  initials: string;
  profession: string;
  secondarySkills: string[];
  experienceYears: number;
  overseasCountries: string[];
  englishLevel: string;
  location: string;
  phone: string;
  email: string;
  age: number;
  source: CandidateSource;
  status: CandidateStatus;
  fitScore: number;
  fitReasons: string[];
  availability: 'Available now' | 'Available in 2 weeks' | 'Notice period';
  expectedSalary: string;
  drivingLicence: boolean;
  alcoholRestriction: boolean;
  experience: CandidateExperience[];
  documents: CandidateDocumentStatus;
  timeline: CandidateTimelineItem[];
  createdAt: string;
  rejectionReason?: string;
}

export interface CandidateDraft {
  name: string;
  profession: string;
  location: string;
  phone: string;
  experienceYears: string;
  secondarySkills: string;
  source: CandidateSource;
}

export interface CandidateFilters {
  search: string;
  status: CandidateStatus | 'all';
  profession: string;
}
