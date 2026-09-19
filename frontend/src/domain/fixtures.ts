import type { Agency, Candidate, Interview, InterviewEvaluation, Job, JobApplication, User } from './types';

export const agencies: Agency[] = [
  { id: 'agency-1', name: 'BuildHire Recruitment', slug: 'buildhire', status: 'ACTIVE', userCount: 8, jobCount: 12, candidateCount: 146 },
  { id: 'agency-2', name: 'Ceylon Workforce', slug: 'ceylon-workforce', status: 'ACTIVE', userCount: 5, jobCount: 7, candidateCount: 82 },
];

export const users: User[] = [
  { id: 'user-admin', agencyId: null, candidateId: null, name: 'System Admin', email: 'admin@buildhire.demo', role: 'ADMIN', active: true },
  { id: 'user-agency-1', agencyId: 'agency-1', candidateId: null, name: 'Agency Manager', email: 'agency@buildhire.demo', role: 'AGENCY', active: true },
  { id: 'user-interviewer-1', agencyId: 'agency-1', candidateId: null, name: 'Kamal Perera', email: 'kamal@buildhire.demo', role: 'INTERVIEWER', active: true },
  { id: 'user-interviewer-2', agencyId: 'agency-1', candidateId: null, name: 'Nadeesha Silva', email: 'nadeesha@buildhire.demo', role: 'INTERVIEWER', active: true },
  { id: 'user-candidate-1', agencyId: 'agency-1', candidateId: 'candidate-1', name: 'Ruwan Fernando', email: 'ruwan@example.com', role: 'INTERVIEWEE', active: true },
];

export const candidates: Candidate[] = [
  { id: 'candidate-1', agencyId: 'agency-1', reference: 'CA-0001', name: 'Ruwan Fernando', email: 'ruwan@example.com', phone: '+94 77 123 4567', profession: 'Mason', experienceYears: 7, skills: ['Masonry', 'Tile', 'Plaster'], onboardingStatus: 'COMPLETED', source: 'AGENCY_ADDED' },
  { id: 'candidate-2', agencyId: 'agency-1', reference: 'CA-0002', name: 'Dinesh Kumar', email: 'dinesh@example.com', phone: '+94 76 234 5678', profession: 'Welder', experienceYears: 5, skills: ['Arc Welding', 'Fabrication'], onboardingStatus: 'SUBMITTED', source: 'SELF_ONBOARDED' },
  { id: 'candidate-3', agencyId: 'agency-1', reference: 'CA-0003', name: 'Suresh Perera', email: 'suresh@example.com', phone: '+94 71 345 6789', profession: 'Carpenter', experienceYears: 4, skills: ['Formwork', 'Joinery'], onboardingStatus: 'IN_PROGRESS', source: 'BULK_IMPORTED' },
];

export const jobs: Job[] = [
  { id: 'job-1', agencyId: 'agency-1', title: 'Mason — Dubai Tower Project', description: 'General masonry and finishing work.', location: 'Dubai, UAE', openings: 5, status: 'PUBLISHED', publishedAt: '2026-09-16T08:00:00.000Z' },
  { id: 'job-2', agencyId: 'agency-1', title: 'Welder — Doha Industrial Expansion', description: 'Structural welding and fabrication.', location: 'Doha, Qatar', openings: 4, status: 'PUBLISHED', publishedAt: '2026-09-15T08:00:00.000Z' },
  { id: 'job-3', agencyId: 'agency-1', title: 'Shuttering Carpenter — Colombo Mall', description: 'Formwork and shuttering carpentry.', location: 'Colombo, Sri Lanka', openings: 3, status: 'DRAFT', publishedAt: null },
];

export const applications: JobApplication[] = [
  { id: 'app-1', jobId: 'job-1', candidateId: 'candidate-1', status: 'INTERVIEW', appliedAt: '2026-09-17T09:00:00.000Z' },
  { id: 'app-2', jobId: 'job-2', candidateId: 'candidate-2', status: 'SHORTLISTED', appliedAt: '2026-09-18T09:00:00.000Z' },
  { id: 'app-3', jobId: 'job-1', candidateId: 'candidate-3', status: 'SCREENING', appliedAt: '2026-09-18T11:00:00.000Z' },
];

export const interviews: Interview[] = [
  { id: 'interview-1', applicationId: 'app-1', type: 'TECHNICAL', status: 'SCHEDULED', scheduledAt: '2026-09-22T05:00:00.000Z', durationMins: 45, location: 'Colombo Interview Room 1', panelUserIds: ['user-interviewer-1', 'user-interviewer-2'] },
  { id: 'interview-2', applicationId: 'app-2', type: 'SCREENING', status: 'COMPLETED', scheduledAt: '2026-09-20T04:30:00.000Z', durationMins: 30, location: 'Online', panelUserIds: ['user-interviewer-1'] },
];

export const evaluations: InterviewEvaluation[] = [
  { id: 'eval-1', interviewId: 'interview-2', interviewerId: 'user-interviewer-1', rating: 4, recommendation: 'RECOMMENDED', comments: 'Strong fabrication background and clear communication.' },
];

export const getCandidate = (id: string) => candidates.find((candidate) => candidate.id === id);
export const getJob = (id: string) => jobs.find((job) => job.id === id);
export const getApplication = (id: string) => applications.find((application) => application.id === id);
export const getUser = (id: string) => users.find((user) => user.id === id);
