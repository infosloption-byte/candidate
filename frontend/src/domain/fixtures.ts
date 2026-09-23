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
  { id: 'user-interviewer-global', agencyId: null, candidateId: null, name: 'David Perera', email: 'david@buildhire.demo', role: 'INTERVIEWER', active: true },
  { id: 'user-candidate-1', agencyId: 'agency-1', candidateId: 'candidate-1', name: 'Ruwan Fernando', email: 'ruwan@example.com', role: 'INTERVIEWEE', active: true },
];

export const candidates: Candidate[] = [
  { id: 'candidate-1', agencyId: 'agency-1', reference: 'CA-0001', name: 'Ruwan Fernando', email: 'ruwan@example.com', phone: '+94 77 123 4567', alternatePhone: '+94 76 234 5678', country: 'Sri Lanka', passportNumber: 'N9087654', passportExpiry: '2031-06-30T00:00:00.000Z', currentLocation: 'Colombo, Sri Lanka', availability: 'Immediately', visaStatus: 'Required', profession: 'Mason', experienceYears: 7, skills: ['Masonry', 'Tile', 'Plaster'], onboardingStatus: 'COMPLETED', source: 'AGENCY_ADDED', status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: '2026-09-18T09:00:00.000Z' },
  { id: 'candidate-2', agencyId: 'agency-1', reference: 'CA-0002', name: 'Dinesh Kumar', email: 'dinesh@example.com', phone: '+94 76 234 5678', alternatePhone: '+94 71 345 6789', country: 'Sri Lanka', passportNumber: 'N8123456', passportExpiry: '2029-11-15T00:00:00.000Z', currentLocation: 'Kandy, Sri Lanka', availability: 'Within 2 weeks', visaStatus: 'In process', profession: 'Welder', experienceYears: 5, skills: ['Arc Welding', 'Fabrication'], onboardingStatus: 'SUBMITTED', source: 'SELF_ONBOARDED', status: 'READY_FOR_INTERVIEW', statusUpdatedAt: '2026-09-18T10:00:00.000Z' },
  { id: 'candidate-3', agencyId: 'agency-1', reference: 'CA-0003', name: 'Suresh Perera', email: 'suresh@example.com', phone: '+94 71 345 6789', alternatePhone: '+94 77 456 7890', country: 'Sri Lanka', passportNumber: 'N7456789', passportExpiry: '2028-03-20T00:00:00.000Z', currentLocation: 'Galle, Sri Lanka', availability: 'Within 1 month', visaStatus: 'Available', profession: 'Carpenter', experienceYears: 4, skills: ['Formwork', 'Joinery'], onboardingStatus: 'IN_PROGRESS', source: 'BULK_IMPORTED', status: 'POOL', statusUpdatedAt: '2026-09-18T11:00:00.000Z' },
];

export const jobs: Job[] = [
  { id: 'job-1', agencyId: 'agency-1', title: 'Mason — Dubai Tower Project', description: 'General masonry and finishing work.', location: 'Dubai, UAE', openings: 5, status: 'PUBLISHED', publishedAt: '2026-09-16T08:00:00.000Z' },
  { id: 'job-2', agencyId: 'agency-1', title: 'Welder — Doha Industrial Expansion', description: 'Structural welding and fabrication.', location: 'Doha, Qatar', openings: 4, status: 'PUBLISHED', publishedAt: '2026-09-15T08:00:00.000Z' },
  { id: 'job-3', agencyId: 'agency-1', title: 'Shuttering Carpenter — Colombo Mall', description: 'Formwork and shuttering carpentry.', location: 'Colombo, Sri Lanka', openings: 3, status: 'DRAFT', publishedAt: null },
];

export const interviewCriteria: InterviewCriterion[] = [
  { id: 'criterion-1', name: 'Technical skill', description: 'Role-specific practical and technical ability.', maxPoints: 10, responseType: 'TEXT', required: true, options: null, active: true },
  { id: 'criterion-2', name: 'Experience', description: 'Relevant experience and project exposure.', maxPoints: 10, responseType: 'TEXT', required: true, options: null, active: true },
  { id: 'criterion-3', name: 'Communication', description: 'Clarity, teamwork, and communication.', maxPoints: 5, responseType: 'TEXT', required: true, options: null, active: true },
  { id: 'criterion-4', name: 'Previous experience notes', description: 'Capture relevant experience as an interview answer and score.', maxPoints: 5, responseType: 'TEXT', required: true, options: null, active: true },
  { id: 'criterion-5', name: 'Other skills / sub-professions', description: 'Capture every additional trade or profession demonstrated by the candidate.', maxPoints: 5, responseType: 'MULTI_SELECT', required: true, options: null, active: true },
];

export const interviewCriterionGroups = [
  {
    id: 'criterion-group-1',
    name: 'Skilled Trades — Technical',
    category: 'Skilled Trades',
    description: 'Technical, experience, and communication checks for skilled-trade roles.',
    active: true,
    criteria: [
      { criterionId: 'criterion-1', sortOrder: 0, criterion: interviewCriteria[0]! },
      { criterionId: 'criterion-2', sortOrder: 1, criterion: interviewCriteria[1]! },
      { criterionId: 'criterion-3', sortOrder: 2, criterion: interviewCriteria[2]! },
    ],
  },
  {
    id: 'criterion-group-2',
    name: 'Initial Screening',
    category: 'Screening',
    description: 'Fast screening focused on experience and communication.',
    active: true,
    criteria: [
      { criterionId: 'criterion-2', sortOrder: 0, criterion: interviewCriteria[1]! },
      { criterionId: 'criterion-3', sortOrder: 1, criterion: interviewCriteria[2]! },
      { criterionId: 'criterion-4', sortOrder: 2, criterion: interviewCriteria[3]! },
      { criterionId: 'criterion-5', sortOrder: 3, criterion: interviewCriteria[4]! },
    ],
  },
];

export const interviews: Interview[] = [
  { id: 'interview-1', candidateId: 'candidate-1', jobId: 'job-1', type: 'TECHNICAL', status: 'SCHEDULED', scheduledAt: '2026-09-22T05:00:00.000Z', durationMins: 45, location: 'Colombo Interview Room 1', panelUserIds: ['user-interviewer-1', 'user-interviewer-2'], criterionGroupId: 'criterion-group-1', criterionGroup: { id: 'criterion-group-1', name: 'Skilled Trades — Technical', category: 'Skilled Trades', description: 'Technical, experience, and communication checks for skilled-trade roles.', active: true }, criterionAssignments: [1,2,3].map((index) => ({ id: 'assignment-1-' + index, interviewId: 'interview-1', criterionId: interviewCriteria[index - 1]!.id, groupId: 'criterion-group-1', name: interviewCriteria[index - 1]!.name, description: interviewCriteria[index - 1]!.description, maxPoints: interviewCriteria[index - 1]!.maxPoints, responseType: interviewCriteria[index - 1]!.responseType, required: interviewCriteria[index - 1]!.required, options: interviewCriteria[index - 1]!.options, sortOrder: index - 1 })), candidate: { id: 'candidate-1', agencyId: 'agency-1', name: 'Ruwan Fernando', reference: 'CA-0001', email: 'ruwan@example.com', phone: '+94770000001', alternatePhone: null, country: 'Sri Lanka', passportNumber: 'N1234567', passportExpiry: '2030-06-30', currentLocation: 'Colombo', availability: 'Available', visaStatus: 'Ready', profession: 'Mason', experienceYears: 7, skills: ['Blockwork', 'Plastering'], onboardingStatus: 'COMPLETED', source: 'AGENCY_ADDED', status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: '2026-09-18T08:00:00.000Z' }, job: { id: 'job-1', title: 'Mason — Dubai Tower Project', location: 'Dubai, UAE', status: 'PUBLISHED' } },
  { id: 'interview-2', candidateId: 'candidate-2', jobId: 'job-2', type: 'SCREENING', status: 'COMPLETED', scheduledAt: '2026-09-20T04:30:00.000Z', durationMins: 30, location: 'Online', panelUserIds: ['user-interviewer-1'], criterionGroupId: 'criterion-group-1', criterionGroup: { id: 'criterion-group-1', name: 'Skilled Trades — Technical', category: 'Skilled Trades', description: 'Technical, experience, and communication checks for skilled-trade roles.', active: true }, criterionAssignments: [1,2,3].map((index) => ({ id: 'assignment-2-' + index, interviewId: 'interview-2', criterionId: interviewCriteria[index - 1]!.id, groupId: 'criterion-group-1', name: interviewCriteria[index - 1]!.name, description: interviewCriteria[index - 1]!.description, maxPoints: interviewCriteria[index - 1]!.maxPoints, responseType: interviewCriteria[index - 1]!.responseType, required: interviewCriteria[index - 1]!.required, options: interviewCriteria[index - 1]!.options, sortOrder: index - 1 })), candidate: { id: 'candidate-2', agencyId: 'agency-1', name: 'Dinesh Kumar', reference: 'CA-0002', email: 'dinesh@example.com', phone: '+94770000002', alternatePhone: null, country: 'Sri Lanka', passportNumber: 'N7654321', passportExpiry: '2029-11-15', currentLocation: 'Kandy', availability: 'Available', visaStatus: 'Ready', profession: 'Welder', experienceYears: 5, skills: ['MIG Welding', 'Fabrication'], onboardingStatus: 'COMPLETED', source: 'AGENCY_ADDED', status: 'READY_FOR_INTERVIEW', statusUpdatedAt: '2026-09-17T08:00:00.000Z' }, job: { id: 'job-2', title: 'Welder — Doha Industrial Expansion', location: 'Doha, Qatar', status: 'PUBLISHED' } },
];

export const evaluations: InterviewEvaluation[] = [
  {
    id: 'eval-1',
    interviewId: 'interview-2',
    interviewerId: 'user-interviewer-1',
    status: 'SUBMITTED',
    comments: 'Strong fabrication background and clear communication.',
    submittedAt: '2026-09-20T05:00:00.000Z',
    scores: [
      { criterionId: 'criterion-1', points: 9, criterion: interviewCriteria[0] },
      { criterionId: 'criterion-2', points: 8, criterion: interviewCriteria[1] },
      { criterionId: 'criterion-3', points: 4, criterion: interviewCriteria[2] },
    ],
    responses: [
      { criterionId: 'criterion-1', textValue: 'Strong fabrication and welding technique.', selectedOptions: null },
      { criterionId: 'criterion-2', textValue: 'Five years of industrial fabrication experience.', selectedOptions: null },
      { criterionId: 'criterion-3', textValue: 'Communicates clearly and explains technical decisions well.', selectedOptions: null },
    ],
  },
];
