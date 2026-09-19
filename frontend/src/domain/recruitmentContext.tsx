import { createContext, useContext, useMemo, useReducer, type PropsWithChildren } from 'react';
import { agencies as initialAgencies, applications as initialApplications, candidates as initialCandidates, evaluations as initialEvaluations, interviews as initialInterviews, jobs as initialJobs, users as initialUsers } from './fixtures';
import type { Agency, Candidate, Interview, InterviewEvaluation, Job, JobApplication, User } from './types';

interface RecruitmentState {
  agencies: Agency[];
  users: User[];
  candidates: Candidate[];
  jobs: Job[];
  applications: JobApplication[];
  interviews: Interview[];
  evaluations: InterviewEvaluation[];
}

type RecruitmentAction =
  | { type: 'CREATE_JOB'; job: Job }
  | { type: 'SET_JOB_STATUS'; jobId: string; status: Job['status'] }
  | { type: 'CREATE_CANDIDATE'; candidate: Candidate }
  | { type: 'SET_ONBOARDING_STATUS'; candidateId: string; status: Candidate['onboardingStatus'] }
  | { type: 'APPLY_TO_JOB'; application: JobApplication }
  | { type: 'SET_APPLICATION_STATUS'; applicationId: string; status: JobApplication['status'] }
  | { type: 'SCHEDULE_INTERVIEW'; interview: Interview }
  | { type: 'SET_INTERVIEW_STATUS'; interviewId: string; status: Interview['status'] }
  | { type: 'SAVE_EVALUATION'; evaluation: InterviewEvaluation };

const initialState: RecruitmentState = {
  agencies: initialAgencies,
  users: initialUsers,
  candidates: initialCandidates,
  jobs: initialJobs,
  applications: initialApplications,
  interviews: initialInterviews,
  evaluations: initialEvaluations,
};

const reducer = (state: RecruitmentState, action: RecruitmentAction): RecruitmentState => {
  switch (action.type) {
    case 'CREATE_JOB':
      return { ...state, jobs: [action.job, ...state.jobs] };
    case 'SET_JOB_STATUS':
      return { ...state, jobs: state.jobs.map((job) => job.id === action.jobId ? { ...job, status: action.status, publishedAt: action.status === 'PUBLISHED' ? (job.publishedAt ?? new Date().toISOString()) : job.publishedAt } : job) };
    case 'CREATE_CANDIDATE':
      return { ...state, candidates: [action.candidate, ...state.candidates] };
    case 'SET_ONBOARDING_STATUS':
      return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, onboardingStatus: action.status } : candidate) };
    case 'APPLY_TO_JOB':
      return { ...state, applications: [action.application, ...state.applications] };
    case 'SET_APPLICATION_STATUS':
      return { ...state, applications: state.applications.map((application) => application.id === action.applicationId ? { ...application, status: action.status } : application) };
    case 'SCHEDULE_INTERVIEW':
      return { ...state, interviews: [action.interview, ...state.interviews], applications: state.applications.map((application) => application.id === action.interview.applicationId ? { ...application, status: 'INTERVIEW' } : application) };
    case 'SET_INTERVIEW_STATUS':
      return { ...state, interviews: state.interviews.map((interview) => interview.id === action.interviewId ? { ...interview, status: action.status } : interview) };
    case 'SAVE_EVALUATION':
      return {
        ...state,
        evaluations: [...state.evaluations.filter((evaluation) => !(evaluation.interviewId === action.evaluation.interviewId && evaluation.interviewerId === action.evaluation.interviewerId)), action.evaluation],
      };
    default:
      return state;
  }
};

interface RecruitmentContextValue {
  state: RecruitmentState;
  dispatch: React.Dispatch<RecruitmentAction>;
}

const RecruitmentContext = createContext<RecruitmentContextValue | null>(null);

export const RecruitmentProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <RecruitmentContext.Provider value={value}>{children}</RecruitmentContext.Provider>;
};

export const useRecruitment = () => {
  const context = useContext(RecruitmentContext);
  if (!context) throw new Error('useRecruitment must be used inside RecruitmentProvider.');
  return context;
};
