import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { InterviewContext } from './InterviewContextObject';
import { loadInterviews, saveInterviews } from '../services/interviewRepository';
import type { InterviewAction, InterviewState } from '../types/interview';

const initialState: InterviewState = {
  loadState: 'loading',
  errorMessage: null,
  loadAttempt: 0,
  interviews: [],
  selectedInterviewId: null,
  isScheduleDrawerOpen: false,
};

const interviewReducer = (state: InterviewState, action: InterviewAction): InterviewState => {
  switch (action.type) {
    case 'HYDRATE':
      return {
        ...state,
        loadState: 'success',
        errorMessage: null,
        interviews: action.interviews,
        selectedInterviewId: state.selectedInterviewId ?? action.interviews[0]?.id ?? null,
      };
    case 'LOAD_ERROR':
      return { ...state, loadState: 'error', errorMessage: action.message };
    case 'RETRY_LOAD':
      return { ...state, loadState: 'loading', errorMessage: null, loadAttempt: state.loadAttempt + 1 };
    case 'SELECT_INTERVIEW':
      return { ...state, selectedInterviewId: action.interviewId };
    case 'OPEN_SCHEDULE_DRAWER':
      return { ...state, isScheduleDrawerOpen: true };
    case 'CLOSE_SCHEDULE_DRAWER':
      return { ...state, isScheduleDrawerOpen: false };
    case 'CREATE_INTERVIEW':
      return {
        ...state,
        interviews: [action.interview, ...state.interviews],
        selectedInterviewId: action.interview.id,
        isScheduleDrawerOpen: false,
      };
    case 'UPDATE_STATUS':
      return {
        ...state,
        interviews: state.interviews.map((interview) => interview.id === action.interviewId ? { ...interview, status: action.status } : interview),
      };
    case 'SET_SCORE':
      return {
        ...state,
        interviews: state.interviews.map((interview) => interview.id !== action.interviewId ? interview : {
          ...interview,
          scorecard: {
            ...interview.scorecard,
            criteria: interview.scorecard.criteria.map((criterion) => criterion.id === action.criterionId ? { ...criterion, score: action.score } : criterion),
          },
        }),
      };
    case 'SET_CRITERION_NOTE':
      return {
        ...state,
        interviews: state.interviews.map((interview) => interview.id !== action.interviewId ? interview : {
          ...interview,
          scorecard: {
            ...interview.scorecard,
            criteria: interview.scorecard.criteria.map((criterion) => criterion.id === action.criterionId ? { ...criterion, note: action.note } : criterion),
          },
        }),
      };
    case 'SET_PRACTICAL_RESULT':
      return {
        ...state,
        interviews: state.interviews.map((interview) => interview.id !== action.interviewId ? interview : {
          ...interview,
          practicalTest: interview.practicalTest.map((item) => item.id === action.itemId ? { ...item, result: action.result, note: action.note } : item),
        }),
      };
    case 'SET_INTERVIEW_NOTE':
      return { ...state, interviews: state.interviews.map((interview) => interview.id === action.interviewId ? { ...interview, notes: action.note } : interview) };
    case 'SET_DECISION':
      return {
        ...state,
        interviews: state.interviews.map((interview) => interview.id === action.interviewId ? {
          ...interview,
          decision: { decision: action.decision, reason: action.reason, note: action.note },
          status: 'completed',
        } : interview),
      };
    default:
      return state;
  }
};

export const InterviewProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const interviews = await loadInterviews();
        if (!cancelled) dispatch({ type: 'HYDRATE', interviews });
      } catch {
        if (!cancelled) dispatch({ type: 'LOAD_ERROR', message: 'Interview data could not be loaded. Retry to restore the interview workspace.' });
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [state.loadAttempt]);

  useEffect(() => {
    if (state.loadState !== 'success') return;
    void saveInterviews(state.interviews).catch(() => undefined);
  }, [state.interviews, state.loadState]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>;
};
