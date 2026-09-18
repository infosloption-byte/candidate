export type AuthRole = 'system-admin' | 'recruiter' | 'interviewer' | 'manager' | 'candidate';

export interface AuthUser {
  id: string;
  name: string;
  role: AuthRole;
  email?: string;
  candidateId?: string;
}

export type AuthView = 'login' | 'forgot' | 'reset' | 'change-password' | 'expired';

export interface AuthState {
  user: AuthUser;
  authenticated: boolean;
  authView: AuthView;
  sessionExpiresAt: string | null;
  notice: string | null;
}
