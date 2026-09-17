import { useContext } from 'react';
import { InterviewContext } from './InterviewContextObject';

export const useInterviewContext = () => {
  const context = useContext(InterviewContext);
  if (!context) throw new Error('useInterviewContext must be used within InterviewProvider');
  return context;
};
