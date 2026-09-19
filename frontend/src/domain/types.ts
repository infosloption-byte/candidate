export type UserRole = 'ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE';

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
export type CandidateSource = 'AGENCY_ADDED' | 'SELF_ONBOARDED' | 'BULK_IMPORTED';
export type CandidateStatus = 'POOL' | 'READY_FOR_INTERVIEW' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'PASSED' | 'REJECTED' | 'ON_HOLD' | 'HIRED' | 'INACTIVE';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type InterviewType = 'SCREENING' | 'TECHNICAL' | 'PRACTICAL' | 'FINAL';

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

export interface CandidateDocument {
  id: string;
  candidateId: string;
  originalName: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  sizeBytes: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  agencyId: string;
  reference: string;
  name: string;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  country: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  currentLocation: string | null;
  availability: string | null;
  visaStatus: string | null;
  profession: string | null;
  experienceYears: number | null;
  skills: string[];
  onboardingStatus: OnboardingStatus;
  source: CandidateSource;
  status: CandidateStatus;
  statusUpdatedAt: string;
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

export interface InterviewCriterion {
  id: string;
  agencyId: string;
  name: string;
  description: string | null;
  maxPoints: number;
  active: boolean;
}

export interface InterviewScore {
  criterionId: string;
  criterion?: InterviewCriterion;
  points: number;
}

export interface InterviewEvaluation {
  id: string;
  interviewId: string;
  interviewerId: string;
  comments: string | null;
  scores: InterviewScore[];
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string | null;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  durationMins: number;
  location: string | null;
  panelUserIds: string[];
  candidate?: Pick<Candidate, 'id' | 'name' | 'reference' | 'profession' | 'email' | 'status'>;
  job?: Pick<Job, 'id' | 'title' | 'location' | 'status'> | null;
  panel?: Array<{
    userId: string;
    assignedAt: string;
    user: Pick<User, 'id' | 'name' | 'email' | 'active'>;
  }>;
  evaluations?: InterviewEvaluation[];
}

export interface CandidateStatusHistory {
  id: string;
  candidateId: string;
  fromStatus: CandidateStatus | null;
  toStatus: CandidateStatus;
  reason: string | null;
  changedBy: { id: string; name: string; role: UserRole } | null;
  createdAt: string;
}

export interface CandidateAuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  createdAt: string;
  actor: { id: string; name: string; role: UserRole } | null;
}

export interface CandidateHistoryInterview {
  id: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  durationMins: number;
  location: string | null;
  job: { id: string; title: string; location: string | null } | null;
  panel: Array<{ userId: string; user: { id: string; name: string; email: string; active: boolean } }>;
  evaluations: InterviewEvaluation[];
}
