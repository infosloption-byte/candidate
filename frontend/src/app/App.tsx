import { AppProvider } from './context/AppProvider';
import { CandidateProvider } from '../features/candidates/context/CandidateProvider';
import { InterviewProvider } from '../features/interviews/context/InterviewProvider';
import { SelectionProvider } from '../features/selection/context/SelectionProvider';
import { AppContent } from './AppContent';

export const App = () => (
  <AppProvider>
    <CandidateProvider>
      <InterviewProvider>
        <SelectionProvider>
          <AppContent />
        </SelectionProvider>
      </InterviewProvider>
    </CandidateProvider>
  </AppProvider>
);
