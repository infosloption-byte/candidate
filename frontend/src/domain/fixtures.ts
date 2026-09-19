import type { Agency, Candidate, Interview, InterviewCriterion, InterviewEvaluation, Job, User } from './types';

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
  { id: 'candidate-1', agencyId: 'agency-1', reference: 'CA-0001', name: 'Ruwan Fernando', email: 'ruwan@example.com', phone: '+94 77 123 4567', profession: 'Mason', experienceYears: 7, skills: ['Masonry', 'Tile', 'Plaster'], onboardingStatus: 'COMPLETED', source: 'AGENCY_ADDED', status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: '2026-09-18T09:00:00.000Z' },
  { id: 'candidate-2', agencyId: 'agency-1', reference: 'CA-0002', name: 'Dinesh Kumar', email: 'dinesh@example.com', phone: '+94 76 234 5678', profession: 'Welder', experienceYears: 5, skills: ['Arc Welding', 'Fabrication'], onboardingStatus: 'SUBMITTED', source: 'SELF_ONBOARDED', status: 'READY_FOR_INTERVIEW', statusUpdatedAt: '2026-09-18T10:00:00.000Z' },
  { id: 'candidate-3', agencyId: 'agency-1', reference: 'CA-0003', name: 'Suresh Perera', email: 'suresh@example.com', phone: '+94 71 345 6789', profession: 'Carpenter', experienceYears: 4, skills: ['Formwork', 'Joinery'], onboardingStatus: 'IN_PROGRESS', source: 'BULK_IMPORTED', status: 'POOL', statusUpdatedAt: '2026-09-18T11:00:00.000Z' },
];

export const jobs: Job[] = [
  { id: 'job-1', agencyId: 'agency-1', title: 'Mason — Dubai Tower Project', description: 'General masonry and finishing work.', location: 'Dubai, UAE', openings: 5, status: 'PUBLISHED', publishedAt: '2026-09-16T08:00:00.000Z' },
  { id: 'job-2', agencyId: 'agency-1', title: 'Welder — Doha Industrial Expansion', description: 'Structural welding and fabrication.', location: 'Doha, Qatar', openings: 4, status: 'PUBLISHED', publishedAt: '2026-09-15T08:00:00.000Z' },
  { id: 'job-3', agencyId: 'agency-1', title: 'Shuttering Carpenter — Colombo Mall', description: 'Formwork and shuttering carpentry.', location: 'Colombo, Sri Lanka', openings: 3, status: 'DRAFT', publishedAt: null },
];

export const interviewCriteria: InterviewCriterion[] = [
  { id: 'criterion-1', agencyId: 'agency-1', name: 'Technical skill', description: 'Role-specific practical and technical ability.', maxPoints: 10, active: true },
  { id: 'criterion-2', agencyId: 'agency-1', name: 'Experience', description: 'Relevant experience and project exposure.', maxPoints: 10, active: true },
  { id: 'criterion-3', agencyId: 'agency-1', name: 'Communication', description: 'Clarity, teamwork, and communication.', maxPoints: 5, active: true },
];

export const interviews: Interview[] = [
  { id: 'interview-1', candidateId: 'candidate-1', jobId: 'job-1', type: 'TECHNICAL', status: 'SCHEDULED', scheduledAt: '2026-09-22T05:00:00.000Z', durationMins: 45, location: 'Colombo Interview Room 1', panelUserIds: ['user-interviewer-1', 'user-interviewer-2'], candidate: { id: 'candidate-1', name: 'Ruwan Fernando', reference: 'CA-0001', profession: 'Mason', email: 'ruwan@example.com', status: 'INTERVIEW_SCHEDULED' }, job: { id: 'job-1', title: 'Mason — Dubai Tower Project', location: 'Dubai, UAE', status: 'PUBLISHED' } },
  { id: 'interview-2', candidateId: 'candidate-2', jobId: 'job-2', type: 'SCREENING', status: 'COMPLETED', scheduledAt: '2026-09-20T04:30:00.000Z', durationMins: 30, location: 'Online', panelUserIds: ['user-interviewer-1'], candidate: { id: 'candidate-2', name: 'Dinesh Kumar', reference: 'CA-0002', profession: 'Welder', email: 'dinesh@example.com', status: 'READY_FOR_INTERVIEW' }, job: { id: 'job-2', title: 'Welder — Doha Industrial Expansion', location: 'Doha, Qatar', status: 'PUBLISHED' } },
];

export const evaluations: InterviewEvaluation[] = [
  {
    id: 'eval-1',
    interviewId: 'interview-2',
    interviewerId: 'user-interviewer-1',
    comments: 'Strong fabrication background and clear communication.',
    scores: [
      { criterionId: 'criterion-1', points: 9, criterion: interviewCriteria[0] },
      { criterionId: 'criterion-2', points: 8, criterion: interviewCriteria[1] },
      { criterionId: 'criterion-3', points: 4, criterion: interviewCriteria[2] },
    ],
  },
];
