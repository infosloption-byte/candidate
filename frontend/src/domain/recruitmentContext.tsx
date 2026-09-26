import { createContext, useContext, useMemo, useReducer, type PropsWithChildren } from 'react';
import { agencies as initialAgencies, candidates as initialCandidates, interviewCriteria as initialInterviewCriteria, interviewCriterionGroups as initialInterviewCriterionGroups, interviews as initialInterviews, jobCandidates as initialJobCandidates, jobs as initialJobs, users as initialUsers } from './fixtures';
import type { Agency, Candidate, Interview, InterviewCriterion, InterviewCriterionGroup, Job, JobCandidate, User } from './types';

interface RecruitmentState {
  agencies: Agency[];
  users: User[];
  candidates: Candidate[];
  jobs: Job[];
  interviewCriteria: InterviewCriterion[];
  interviewCriterionGroups: InterviewCriterionGroup[];
  interviews: Interview[];
  jobCandidates: JobCandidate[];
}

type RecruitmentAction =
  | { type: 'CREATE_JOB'; job: Job }
  | { type: 'DELETE_JOB'; jobId: string }
  | { type: 'SET_JOB_STATUS'; jobId: string; status: Job['status'] }
  | { type: 'ADD_JOB_CANDIDATES'; memberships: JobCandidate[] }
  | { type: 'SET_JOB_CANDIDATE_STATUS'; jobId: string; candidateId: string; status: JobCandidate['status'] }
  | { type: 'REMOVE_JOB_CANDIDATE'; jobId: string; candidateId: string }
  | { type: 'CREATE_CANDIDATE'; candidate: Candidate }
  | { type: 'UPDATE_CANDIDATE'; candidate: Candidate }
  | { type: 'SET_ONBOARDING_STATUS'; candidateId: string; status: Candidate['onboardingStatus'] }
  | { type: 'SET_CANDIDATE_STATUS'; candidateId: string; status: Candidate['status'] }
  | { type: 'SCHEDULE_INTERVIEW'; interview: Interview }
  | { type: 'SET_INTERVIEW_STATUS'; interviewId: string; status: Interview['status'] }
  | { type: 'UPDATE_INTERVIEW'; interview: Interview }
  | { type: 'CREATE_CRITERION'; criterion: InterviewCriterion }
  | { type: 'UPDATE_CRITERION'; criterion: InterviewCriterion }
  | { type: 'CREATE_CRITERION_GROUP'; group: InterviewCriterionGroup }
  | { type: 'UPDATE_CRITERION_GROUP'; group: InterviewCriterionGroup };

const initialState: RecruitmentState = {
  agencies: initialAgencies,
  users: initialUsers,
  candidates: initialCandidates,
  jobs: initialJobs,
  interviewCriteria: initialInterviewCriteria,
  interviewCriterionGroups: initialInterviewCriterionGroups,
  interviews: initialInterviews,
  jobCandidates: initialJobCandidates,
};

const reducer = (state: RecruitmentState, action: RecruitmentAction): RecruitmentState => {
  switch (action.type) {
    case 'CREATE_JOB':
      return { ...state, jobs: [action.job, ...state.jobs] };
    case 'DELETE_JOB':
      return {
        ...state,
        jobs: state.jobs.filter((job) => job.id !== action.jobId),
        jobCandidates: state.jobCandidates.filter((item) => item.jobId !== action.jobId),
        interviews: state.interviews.filter((item) => item.jobId !== action.jobId),
      };
    case 'SET_JOB_STATUS':
      return { ...state, jobs: state.jobs.map((job) => job.id === action.jobId ? { ...job, status: action.status } : job) };
    case 'ADD_JOB_CANDIDATES':
      return { ...state, jobCandidates: [...state.jobCandidates.filter((item) => !action.memberships.some((next) => next.jobId === item.jobId && next.candidateId === item.candidateId)), ...action.memberships] };
    case 'SET_JOB_CANDIDATE_STATUS':
      return { ...state, jobCandidates: state.jobCandidates.map((item) => item.jobId === action.jobId && item.candidateId === action.candidateId ? { ...item, status: action.status, statusUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item) };
    case 'REMOVE_JOB_CANDIDATE':
      return { ...state, jobCandidates: state.jobCandidates.filter((item) => !(item.jobId === action.jobId && item.candidateId === action.candidateId)) };
    case 'CREATE_CANDIDATE':
      return { ...state, candidates: [action.candidate, ...state.candidates] };
    case 'UPDATE_CANDIDATE':
      return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidate.id ? action.candidate : candidate) };
    case 'SET_ONBOARDING_STATUS':
      return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, onboardingStatus: action.status } : candidate) };
    case 'SET_CANDIDATE_STATUS':
      return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: action.status, statusUpdatedAt: new Date().toISOString() } : candidate) };
    case 'SCHEDULE_INTERVIEW':
      return {
        ...state,
        jobCandidates: action.interview.jobId
          ? state.jobCandidates.map((item) => item.jobId === action.interview.jobId && item.candidateId === action.interview.candidateId ? { ...item, status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item)
          : state.jobCandidates,
        interviews: [action.interview, ...state.interviews],
        candidates: state.candidates.map((candidate) => candidate.id === action.interview.candidateId ? { ...candidate, status: 'INTERVIEW_SCHEDULED', statusUpdatedAt: new Date().toISOString() } : candidate),
      };
    case 'SET_INTERVIEW_STATUS': {
      const interview = state.interviews.find((item) => item.id === action.interviewId);
      const jobCandidateStatus = action.status === 'SCHEDULED' ? 'INTERVIEW_SCHEDULED' : action.status === 'CANCELLED' ? 'READY_FOR_INTERVIEW' : action.status === 'NO_SHOW' ? 'ON_HOLD' : action.status === 'COMPLETED' ? 'INTERVIEW_COMPLETED' : null;
      return {
        ...state,
        jobCandidates: interview?.jobId && jobCandidateStatus
          ? state.jobCandidates.map((item) => item.jobId === interview.jobId && item.candidateId === interview.candidateId ? { ...item, status: jobCandidateStatus, statusUpdatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item)
          : state.jobCandidates,
        interviews: state.interviews.map((item) => item.id === action.interviewId ? { ...item, status: action.status } : item),
      };
    }
    case 'UPDATE_INTERVIEW':
      return { ...state, interviews: state.interviews.map((interview) => interview.id === action.interview.id ? action.interview : interview) };
    case 'CREATE_CRITERION':
      return { ...state, interviewCriteria: [action.criterion, ...state.interviewCriteria] };
    case 'UPDATE_CRITERION':
      return { ...state, interviewCriteria: state.interviewCriteria.map((criterion) => criterion.id === action.criterion.id ? action.criterion : criterion) };
    case 'CREATE_CRITERION_GROUP':
      return { ...state, interviewCriterionGroups: [action.group, ...state.interviewCriterionGroups] };
    case 'UPDATE_CRITERION_GROUP':
      return { ...state, interviewCriterionGroups: state.interviewCriterionGroups.map((group) => group.id === action.group.id ? action.group : group) };
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
