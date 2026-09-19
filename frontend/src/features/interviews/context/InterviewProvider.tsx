import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { InterviewContext } from './InterviewContextObject';
import { loadInterviews, loadInterviewers } from '../services/interviewRepository';
import type { InterviewAction, InterviewState, Interviewer } from '../types/interview';

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialState: InterviewState = {
  loadState: 'loading',
  errorMessage: null,
  loadAttempt: 0,
  interviews: [],
  interviewers: [],
  selectedInterviewId: null,
  isScheduleDrawerOpen: false,
  calendarView: 'week',
  calendarDate: toIsoDate(new Date()),
};

const resolveInterviewers = (ids: string[], interviewers: Interviewer[], fallback: Interviewer[]): Interviewer[] => ids.map((id) => interviewers.find((person) => person.id === id) ?? fallback.find((person) => person.id === id)).filter((person): person is Interviewer => Boolean(person));

export const interviewReducer = (state: InterviewState, action: InterviewAction): InterviewState => {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, loadState: 'success', errorMessage: null, interviews: action.interviews, interviewers: action.interviewers, selectedInterviewId: state.selectedInterviewId ?? action.interviews[0]?.id ?? null };
    case 'LOAD_ERROR': return { ...state, loadState: 'error', errorMessage: action.message };
    case 'RETRY_LOAD': return { ...state, loadState: 'loading', errorMessage: null, loadAttempt: state.loadAttempt + 1 };
    case 'SELECT_INTERVIEW': return { ...state, selectedInterviewId: action.interviewId };
    case 'OPEN_SCHEDULE_DRAWER': return { ...state, isScheduleDrawerOpen: true };
    case 'CLOSE_SCHEDULE_DRAWER': return { ...state, isScheduleDrawerOpen: false };
    case 'CREATE_INTERVIEW':
      return { ...state, interviews: [action.interview, ...state.interviews], selectedInterviewId: action.interview.id, isScheduleDrawerOpen: false, calendarDate: toIsoDate(new Date(`${action.interview.date} ${action.interview.time}`)) };
    case 'CREATE_INTERVIEWS':
      if (action.interviews.length === 0) return state;
      return { ...state, interviews: [...action.interviews, ...state.interviews], selectedInterviewId: action.interviews[0]?.id ?? state.selectedInterviewId, isScheduleDrawerOpen: false, calendarDate: toIsoDate(new Date(`${action.interviews[0]?.date ?? state.calendarDate} ${action.interviews[0]?.time ?? '09:00'}`)) };
    case 'REPLACE_INTERVIEW':
      return {
        ...state,
        interviews: state.interviews.some((item) => item.id === action.interview.id)
          ? state.interviews.map((item) => item.id === action.interview.id ? action.interview : item)
          : [action.interview, ...state.interviews],
        selectedInterviewId: action.interview.id,
      };
    case 'UPDATE_STATUS': return { ...state, interviews: state.interviews.map((interview) => interview.id === action.interviewId ? { ...interview, status: action.status } : interview) };
    case 'SET_SCORE':
      return { ...state, interviews: state.interviews.map((interview) => interview.id !== action.interviewId ? interview : { ...interview, scorecard: { ...interview.scorecard, criteria: interview.scorecard.criteria.map((criterion) => criterion.id === action.criterionId ? { ...criterion, score: action.score } : criterion) } }) };
    case 'SET_CRITERION_NOTE':
      return { ...state, interviews: state.interviews.map((interview) => interview.id !== action.interviewId ? interview : { ...interview, scorecard: { ...interview.scorecard, criteria: interview.scorecard.criteria.map((criterion) => criterion.id === action.criterionId ? { ...criterion, note: action.note } : criterion) } }) };
    case 'SET_PRACTICAL_RESULT':
      return { ...state, interviews: state.interviews.map((interview) => interview.id !== action.interviewId ? interview : { ...interview, practicalTest: interview.practicalTest.map((item) => item.id === action.itemId ? { ...item, result: action.result } : item) }) };
    case 'SET_PRACTICAL_NOTE':
      return { ...state, interviews: state.interviews.map((interview) => interview.id !== action.interviewId ? interview : { ...interview, practicalTest: interview.practicalTest.map((item) => item.id === action.itemId ? { ...item, note: action.note } : item) }) };
    case 'SET_INTERVIEW_NOTE': return { ...state, interviews: state.interviews.map((interview) => interview.id === action.interviewId ? { ...interview, notes: action.note } : interview) };
    case 'SET_DECISION':
      return {
        ...state,
        interviews: state.interviews.map((interview) => {
          if (interview.id !== action.interviewId) return interview;
          const changedAt = new Date().toISOString();
          const isSameDecision = action.decision === interview.decision.decision
            && action.reason === interview.decision.reason
            && action.note === interview.decision.note;
          let decisionHistory = interview.decisionHistory ?? [];

          if (!isSameDecision && action.decision !== 'pending') {
            decisionHistory = [
              ...decisionHistory,
              {
                id: `decision-${Date.now()}-${interview.id}`,
                fromDecision: interview.decision.decision,
                toDecision: action.decision,
                reason: action.reason,
                note: action.note,
                changedAt,
              },
            ];
          }

          return { ...interview, decision: { decision: action.decision, reason: action.reason, note: action.note }, status: 'completed', decisionHistory };
        }),
      };
    case 'RESCHEDULE_INTERVIEW':
      return {
        ...state,
        interviews: state.interviews.map((interview) => {
          if (interview.id !== action.interviewId) return interview;
          const updatedInterviewerList = resolveInterviewers(action.interviewerIds, state.interviewers, interview.interviewers);
          if (updatedInterviewerList.length !== action.interviewerIds.length) return interview;
          const history = {
            id: action.historyId,
            fromDate: interview.date,
            fromTime: interview.time,
            fromInterviewerIds: interview.interviewers.map((person) => person.id),
            toDate: action.date,
            toTime: action.time,
            toInterviewerIds: updatedInterviewerList.map((person) => person.id),
            reason: action.reason,
            changedAt: action.changedAt,
            undoneAt: null,
          } as const;
          return { ...interview, date: action.date, time: action.time, interviewers: updatedInterviewerList, rescheduleHistory: [...(interview.rescheduleHistory ?? []), history] };
        }),
      };
    case 'UNDO_RESCHEDULE':
      return {
        ...state,
        interviews: state.interviews.map((interview) => {
          if (interview.id !== action.interviewId) return interview;
          const history = interview.rescheduleHistory?.find((item) => item.id === action.historyId);
          if (!history || history.undoneAt) return interview;
          const restoreInterviewerList = resolveInterviewers(history.fromInterviewerIds, state.interviewers, interview.interviewers);
          return {
            ...interview,
            date: history.fromDate,
            time: history.fromTime,
            interviewers: restoreInterviewerList,
            rescheduleHistory: (interview.rescheduleHistory ?? []).map((item) => item.id === action.historyId ? { ...item, undoneAt: action.undoneAt } : item),
          };
        }),
      };
    case 'SET_CALENDAR_VIEW': return { ...state, calendarView: action.value };
    case 'SET_CALENDAR_DATE': return { ...state, calendarDate: action.value };
    default: return state;
  }
};

export const InterviewProvider = ({ children }: PropsWithChildren) => {
  const { state: authState } = useAuth();
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!authState.authenticated || authState.user.role === 'candidate') return;
      try {
        const [interviews, interviewers] = await Promise.all([loadInterviews(), loadInterviewers()]);
        if (!cancelled) dispatch({ type: 'HYDRATE', interviews, interviewers });
      } catch {
        if (!cancelled) dispatch({ type: 'LOAD_ERROR', message: 'Interview data could not be loaded. Retry to restore the interview workspace.' });
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, [authState.authenticated, authState.user.role, state.loadAttempt]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>;
};
