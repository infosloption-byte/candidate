export type UserRole = 'ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE';

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type ApplicationStatus = 'APPLIED' | 'SCREENING' | 'SHORTLISTED' | 'INTERVIEW' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN';
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
export type CandidateSource = 'AGENCY_ADDED' | 'SELF_ONBOARDED' | 'BULK_IMPORTED';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type Recommendation = 'RECOMMENDED' | 'MAYBE' | 'NOT_RECOMMENDED';

export interface Agency {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  userCount: number;
  jobCount: number;
  candidateCount: number;
}

export interface User {
  id: string;
  agencyId: string | null;
  candidateId: string | null;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export interface Candidate {
  id: string;
  agencyId: string;
  reference: string;
  name: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  experienceYears: number | null;
  skills: string[];
  onboardingStatus: OnboardingStatus;
  source: CandidateSource;
}

export interface Job {
  id: string;
  agencyId: string;
  title: string;
  description: string | null;
  location: string | null;
  openings: number;
  status: JobStatus;
  publishedAt: string | null;
}

export interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  appliedAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  type: 'SCREENING' | 'TECHNICAL' | 'PRACTICAL' | 'FINAL';
  status: InterviewStatus;
  scheduledAt: string;
  durationMins: number;
  location: string | null;
  panelUserIds: string[];
}

export interface InterviewEvaluation {
  id: string;
  interviewId: string;
  interviewerId: string;
  rating: number;
  recommendation: Recommendation;
  comments: string | null;
}
