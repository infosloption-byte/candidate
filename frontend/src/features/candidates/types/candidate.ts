export type CandidateStatus = 'new' | 'screening' | 'interview' | 'selected' | 'reserve' | 'rejected';
export type CandidateSource = 'Walk-in' | 'Referral' | 'Agency' | 'Existing database' | 'Bulk import';
export type EnglishLevel = 'Not assessed' | 'Basic' | 'Working' | 'Good' | 'Strong';
export type Availability = 'Available now' | 'Within 2 weeks' | 'Within 1 month' | 'Not available';
export type DocumentState = 'verified' | 'needs-review' | 'missing';
export type RejectionReason = 'Technical skill' | 'Experience gap' | 'Required skill missing' | 'Safety concern' | 'Communication' | 'Documents' | 'Availability' | 'Client requirement' | 'Other';
export type BooleanFilter = 'all' | 'yes' | 'no';
export type DocumentReadinessFilter = 'all' | 'ready' | 'attention';
export type DuplicateConfidence = 'high' | 'possible';
export type CandidateOnboardingStatus = 'not-started' | 'invited' | 'in-progress' | 'submitted' | 'needs-changes' | 'completed';
export type CandidateInvitationStatus = 'pending' | 'opened' | 'started' | 'expired' | 'cancelled';
export type VisaStatus = 'Not started' | 'Pending' | 'Approved' | 'Expired' | 'Not required';
export type CandidatePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CandidateEmergencyContact { name: string; phone: string; relationship: string; }
export interface CandidateInvitation { status: CandidateInvitationStatus; sentAt: string; lastSentAt: string; expiresAt: string; openedAt?: string; startedAt?: string; reminderDueAt?: string; cancelledAt?: string; sendCount: number; }

export interface CandidateDocumentSummary {
  passport: DocumentState;
  cv: DocumentState;
  tradeCertificate: DocumentState;
  visa?: DocumentState;
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

export interface CandidateOnboarding {
  status: CandidateOnboardingStatus;
  completionPercent: number;
  invitedAt?: string;
  lastActivityAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerNote?: string;
  invitation?: CandidateInvitation;
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
  tags?: string[];
  englishLevel: EnglishLevel;
  locationReady: boolean;
  drivingLicense: boolean;
  availability: Availability;
  source: CandidateSource;
  status: CandidateStatus;
  onboarding?: CandidateOnboarding;
  nationality?: string;
  dateOfBirth?: string;
  passportExpiry?: string;
  visaStatus?: VisaStatus;
  preferredDestinationCountries?: string[];
  expectedSalary?: string;
  salaryCurrency?: string;
  noticePeriod?: string;
  yearsInCurrentTrade?: number;
  tradeCertificateDetails?: string;
  drivingLicenseCategories?: string[];
  preferredInterviewLanguage?: string;
  emergencyContact?: CandidateEmergencyContact;
  recruiterOwnerId?: string;
  recruiterOwnerName?: string;
  priority?: CandidatePriority;
  sourceCampaign?: string;
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

export interface CandidateSmartFilters {
  minExperience: number | null;
  maxExperience: number | null;
  englishLevel: EnglishLevel | 'all';
  availability: Availability | 'all';
  overseasExperience: BooleanFilter;
  drivingLicense: BooleanFilter;
  documentReadiness: DocumentReadinessFilter;
  skills: string[];
}

export interface CandidateSavedFilter {
  id: string;
  name: string;
  filters: CandidateFilters;
  smartFilters: CandidateSmartFilters;
  createdAt: string;
}

export interface CandidateDuplicateMatch {
  candidateId: string;
  confidence: DuplicateConfidence;
  score: number;
  reasons: string[];
}
