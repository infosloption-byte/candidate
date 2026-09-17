import type { Dispatch } from 'react';
import type { InterviewAction, InterviewState } from '../types/interview';

export interface InterviewContextValue {
  state: InterviewState;
  dispatch: Dispatch<InterviewAction>;
}
