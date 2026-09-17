import { useContext } from 'react';
import { CandidateContext } from '../context/CandidateContextObject';

export const useCandidateContext = () => {
  const context = useContext(CandidateContext);
  if (!context) throw new Error('useCandidateContext must be used inside CandidateProvider.');
  return context;
};
