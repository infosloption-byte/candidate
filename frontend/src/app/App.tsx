import { AppProvider } from './context/AppProvider';
import { CandidateProvider } from '../features/candidates/context/CandidateProvider';
import { InterviewProvider } from '../features/interviews/context/InterviewProvider';
import { SelectionProvider } from '../features/selection/context/SelectionProvider';
import { AuthProvider } from '../features/auth/context/AuthProvider';
import { NotificationProvider } from '../features/notifications/context/NotificationProvider';
import { AppContent } from './AppContent';

export const App = () => (
  <AuthProvider>
    <NotificationProvider>
      <AppProvider>
        <CandidateProvider>
          <InterviewProvider>
            <SelectionProvider>
              <AppContent />
            </SelectionProvider>
          </InterviewProvider>
        </CandidateProvider>
      </AppProvider>
    </NotificationProvider>
  </AuthProvider>
);
