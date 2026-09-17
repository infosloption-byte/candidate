export type InterviewStatus = 'scheduled' | 'in-progress' | 'evaluation' | 'completed' | 'no-show' | 'cancelled';
export type InterviewType = 'Screening' | 'Technical' | 'Practical' | 'Client' | 'Final';
export type ScoreLabel = 'Needs improvement' | 'Basic' | 'Good' | 'Strong' | 'Excellent';
export type Decision = 'pending' | 'selected' | 'reserve' | 'rejected';
export type PracticalResult = 'not-started' | 'passed' | 'failed' | 'pending';
export type InterviewLoadState = 'loading' | 'error' | 'success';
export type InterviewCalendarView = 'day' | 'week';
export type InterviewerAvailabilityStatus = 'available' | 'busy';

export interface Interviewer { id: string; name: string; role: string; specialties: string[]; active: boolean; }
export interface InterviewerAvailabilityConflict { interviewId: string; candidateName: string; time: string; endTime: string; }
export interface InterviewerAvailabilityNextAppointment { time: string; endTime: string; candidateName: string; }
export interface InterviewerAvailability {
  interviewerId: string;
  status: InterviewerAvailabilityStatus;
  dayAppointmentCount: number;
  bookedMinutes: number;
  bookedLabel: string;
  requestedSlotLabel: string;
  conflict: InterviewerAvailabilityConflict | null;
  nextAppointment: InterviewerAvailabilityNextAppointment | null;
}
export interface ScorecardCriterion { id: string; label: string; weight: number; score: number | null; note: string; }
export interface PracticalTestItem { id: string; label: string; required: boolean; result: PracticalResult; note: string; }
export interface InterviewScorecard { templateId: string; criteria: ScorecardCriterion[]; }
export interface InterviewDecision { decision: Decision; reason: string; note: string; }
export interface InterviewRescheduleHistory { id: string; fromDate: string; fromTime: string; fromInterviewerIds: string[]; toDate: string; toTime: string; toInterviewerIds: string[]; reason: string; changedAt: string; undoneAt: string | null; }
export interface InterviewRescheduleDraft { interviewId: string; date: string; time: string; interviewerIds: string[]; reason: string; }
export interface InterviewRescheduleAlternative { date: string; time: string; interviewerIds: string[]; label: string; }
export interface InterviewScheduleValidation { valid: boolean; reasons: string[]; warnings: string[]; }
export interface Interview { id: string; reference: string; candidateId: string; candidateName: string; profession: string; type: InterviewType; status: InterviewStatus; date: string; time: string; durationMinutes: number; location: string; interviewers: Interviewer[]; notes: string; scorecard: InterviewScorecard; practicalTest: PracticalTestItem[]; decision: InterviewDecision; createdAt: string; rescheduleHistory?: InterviewRescheduleHistory[]; }
export interface InterviewDraft { candidateId: string; type: InterviewType; date: string; time: string; durationMinutes: string; location: string; interviewerIds: string[]; }

export interface BulkInterviewScheduleConfig { type: InterviewType; startDate: string; endDate: string; dayStart: string; dayEnd: string; durationMinutes: number; breakMinutes: number; location: string; sharedLocation: boolean; interviewerIds: string[]; includeWeekends: boolean; }
export interface BulkInterviewScheduleIssue { candidateId: string; candidateName: string; reason: string; }
export interface BulkInterviewScheduleSlot { candidateId: string; candidateName: string; profession: string; isoDate: string; date: string; time: string; interviewer: Interviewer; location: string; conflicts: string[]; }
export interface BulkInterviewInterviewerLoad { interviewerId: string; interviewerName: string; existingCount: number; plannedCount: number; totalCount: number; utilizationPercent: number; }
export interface BulkInterviewSchedulePlan { slots: BulkInterviewScheduleSlot[]; unscheduled: BulkInterviewScheduleIssue[]; capacity: number; requested: number; interviewerLoads: BulkInterviewInterviewerLoad[]; }
export interface BulkInterviewScheduleEdit { candidateId: string; isoDate: string; time: string; interviewerId: string; }

export interface InterviewState { loadState: InterviewLoadState; errorMessage: string | null; loadAttempt: number; interviews: Interview[]; interviewers: Interviewer[]; selectedInterviewId: string | null; isScheduleDrawerOpen: boolean; calendarView: InterviewCalendarView; calendarDate: string; }
export interface InterviewCalendarDay { isoDate: string; date: Date; label: string; shortLabel: string; isToday: boolean; }
export interface InterviewCalendarEntry { interview: Interview; startMinutes: number; endMinutes: number; conflicts: string[]; }

export type InterviewAction =
  | { type: 'HYDRATE'; interviews: Interview[]; interviewers: Interviewer[] }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'RETRY_LOAD' }
  | { type: 'SELECT_INTERVIEW'; interviewId: string }
  | { type: 'OPEN_SCHEDULE_DRAWER' }
  | { type: 'CLOSE_SCHEDULE_DRAWER' }
  | { type: 'CREATE_INTERVIEW'; interview: Interview }
  | { type: 'CREATE_INTERVIEWS'; interviews: Interview[] }
  | { type: 'UPDATE_STATUS'; interviewId: string; status: InterviewStatus }
  | { type: 'SET_SCORE'; interviewId: string; criterionId: string; score: number | null }
  | { type: 'SET_CRITERION_NOTE'; interviewId: string; criterionId: string; note: string }
  | { type: 'SET_PRACTICAL_RESULT'; interviewId: string; itemId: string; result: PracticalResult }
  | { type: 'SET_PRACTICAL_NOTE'; interviewId: string; itemId: string; note: string }
  | { type: 'SET_INTERVIEW_NOTE'; interviewId: string; note: string }
  | { type: 'SET_DECISION'; interviewId: string; decision: Decision; reason: string; note: string }
  | { type: 'RESCHEDULE_INTERVIEW'; interviewId: string; date: string; time: string; interviewerIds: string[]; reason: string; changedAt: string; historyId: string }
  | { type: 'UNDO_RESCHEDULE'; interviewId: string; historyId: string; undoneAt: string }
  | { type: 'SET_CALENDAR_VIEW'; value: InterviewCalendarView }
  | { type: 'SET_CALENDAR_DATE'; value: string };

export const scoreLabel = (score: number | null): ScoreLabel => {
  if (score === null || score < 1) return 'Needs improvement';
  if (score === 1) return 'Needs improvement';
  if (score === 2) return 'Basic';
  if (score === 3) return 'Good';
  if (score === 4) return 'Strong';
  return 'Excellent';
};
