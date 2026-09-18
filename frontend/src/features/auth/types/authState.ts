import type { AuthRole, AuthState, AuthUser } from './auth';

export type AuthAction =
  | { type: 'LOGIN_CANDIDATE'; user: AuthUser }
  | { type: 'LOGIN_RECRUITER'; user: AuthUser }
  | { type: 'LOGOUT' };

export const defaultAuthState: AuthState = {
  authenticated: true,
  user: { id: 'user-recruiter', name: 'Recruitment Team', role: 'recruiter' as AuthRole },
};
