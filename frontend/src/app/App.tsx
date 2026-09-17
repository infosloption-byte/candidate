import { AppProvider } from './context/AppProvider';
import { CandidateProvider } from '../features/candidates/context/CandidateProvider';
import { AppContent } from './AppContent';

export const App = () => (
  <AppProvider>
    <CandidateProvider>
      <AppContent />
    </CandidateProvider>
  </AppProvider>
);
