import { createContext } from 'react';
import type { InterviewContextValue } from './InterviewContext';

export const InterviewContext = createContext<InterviewContextValue | null>(null);
