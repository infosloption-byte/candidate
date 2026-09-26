export type UserRole = 'ADMIN' | 'AGENCY' | 'INTERVIEWER' | 'INTERVIEWEE';

export type JobStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type JobCandidateStatus = 'POOL' | 'READY_FOR_INTERVIEW' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'PASSED' | 'REJECTED' | 'ON_HOLD' | 'HIRED';
export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';
export type CandidateSource = 'AGENCY_ADDED' | 'SELF_ONBOARDED' | 'BULK_IMPORTED';
export type CandidateStatus = 'POOL' | 'READY_FOR_INTERVIEW' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'PASSED' | 'REJECTED' | 'ON_HOLD' | 'HIRED' | 'INACTIVE';
export type InterviewStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type InterviewEvaluationStatus = 'DRAFT' | 'SUBMITTED';
export type InterviewType = 'SCREENING' | 'TECHNICAL' | 'PRACTICAL' | 'FINAL';
export type InterviewCriterionResponseType = 'SCORE' | 'TEXT' | 'MULTI_SELECT';

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
  birthdate?: string | null;
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
  createdAt?: string;
  updatedAt?: string;
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
  candidateCount?: number;
  interviewCount?: number;
  filledCount?: number;
  agency?: Pick<Agency, 'id' | 'name' | 'slug' | 'status'>;
}

export interface JobCandidate {
  id: string;
  jobId: string;
  candidateId: string;
  status: JobCandidateStatus;
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  candidate: Candidate;
}

export interface JobDetail extends Job {
  candidatePool: JobCandidate[];
  interviews: Interview[];
}

export interface InterviewCriterion {
  id: string;
  name: string;
  description: string | null;
  maxPoints: number;
  responseType: InterviewCriterionResponseType;
  required: boolean;
  options: string[] | null;
  active: boolean;
}

export interface InterviewCriterionGroup {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  active: boolean;
  criteria: Array<{
    criterionId: string;
    sortOrder: number;
    criterion: InterviewCriterion;
  }>;
}

export interface InterviewScore {
  criterionId: string;
  criterion?: InterviewCriterion;
  points: number;
}

export interface InterviewEvaluationResponse {
  criterionId: string;
  textValue: string | null;
  selectedOptions: string[] | null;
}

export interface InterviewEvaluation {
  id: string;
  interviewId: string;
  interviewerId: string;
  status: InterviewEvaluationStatus;
  comments: string | null;
  submittedAt: string | null;
  scores: InterviewScore[];
  responses: InterviewEvaluationResponse[];
}

export interface InterviewCriterionAssignment {
  id: string;
  interviewId?: string;
  criterionId: string;
  groupId: string | null;
  name: string;
  description: string | null;
  maxPoints: number;
  responseType: InterviewCriterionResponseType;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
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
  notes?: string | null;
  panelUserIds: string[];
  createdAt?: string;
  updatedAt?: string;
  criterionGroupId?: string | null;
  criterionGroupIds?: string[];
  criterionGroup?: Pick<InterviewCriterionGroup, 'id' | 'name' | 'category' | 'description' | 'active'> | null;
  criterionGroups?: Array<Pick<InterviewCriterionGroup, 'id' | 'name' | 'category' | 'description' | 'active'> & { sortOrder: number }>;
  criterionAssignments?: InterviewCriterionAssignment[];
  startedAt?: string | null;
  completedAt?: string | null;
  candidate?: Pick<Candidate, 'id' | 'agencyId' | 'reference' | 'name' | 'birthdate' | 'email' | 'phone' | 'alternatePhone' | 'country' | 'passportNumber' | 'passportExpiry' | 'currentLocation' | 'availability' | 'visaStatus' | 'profession' | 'experienceYears' | 'skills' | 'onboardingStatus' | 'source' | 'status' | 'statusUpdatedAt'>;
  job?: Pick<Job, 'id' | 'agencyId' | 'title' | 'location' | 'status'> | null;
  panel?: Array<{
    userId: string;
    assignedAt: string;
    user: Pick<User, 'id' | 'agencyId' | 'name' | 'email' | 'active'>;
  }>;
  evaluations?: Array<InterviewEvaluation & { interviewer?: Pick<User, 'id' | 'name' | 'email'> }>;
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
  candidateId?: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  durationMins: number;
  location: string | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  job: { id: string; title: string; location: string | null } | null;
  panel: Array<{ userId: string; assignedAt: string; user: { id: string; name: string; email: string; active: boolean } }>;
  evaluations: Array<InterviewEvaluation & {
    createdAt?: string;
    updatedAt?: string;
    interviewer?: { id: string; name: string; email: string };
  }>;
}
