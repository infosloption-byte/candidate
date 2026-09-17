import { createContext } from 'react';
import type { CandidateContextValue } from './CandidateContext';

export const CandidateContext = createContext<CandidateContextValue | null>(null);
