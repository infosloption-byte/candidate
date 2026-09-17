import { AppProvider } from './context/AppProvider';
import { CandidateProvider } from '../features/candidates/context/CandidateProvider';
import { InterviewProvider } from '../features/interviews/context/InterviewProvider';
import { AppContent } from './AppContent';

export const App = () => (
  <AppProvider>
    <CandidateProvider>
      <InterviewProvider>
        <AppContent />
      </InterviewProvider>
    </CandidateProvider>
  </AppProvider>
);
