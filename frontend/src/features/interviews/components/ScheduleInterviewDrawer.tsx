import { ScheduleInterviewDrawerContent } from './ScheduleInterviewDrawerContent';
import type { Candidate } from '../../candidates/types/candidate';
import type { Interview, Interviewer } from '../types/interview';

interface ScheduleInterviewDrawerProps {
  open: boolean;
  candidates: Candidate[];
  interviewers: Interviewer[];
  onClose: () => void;
  onCreate: (interview: Interview) => void;
}

export const ScheduleInterviewDrawer = ({ open, candidates, interviewers, onClose, onCreate }: ScheduleInterviewDrawerProps) => {
  if (!open) return null;
  return <ScheduleInterviewDrawerContent candidates={candidates} interviewers={interviewers} onClose={onClose} onCreate={onCreate} />;
};
