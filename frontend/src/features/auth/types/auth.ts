export type AuthRole = 'recruiter' | 'system-admin' | 'candidate';

export interface AuthUser {
  id: string;
  name: string;
  role: AuthRole;
  candidateId?: string;
}

export interface AuthState {
  user: AuthUser;
  authenticated: boolean;
}
