import type { AuthState, AuthUser } from './auth';

export type AuthAction =
  | { type: 'LOGIN'; user: AuthUser; sessionExpiresAt: string }
  | { type: 'LOGIN_CANDIDATE'; user: AuthUser }
  | { type: 'RESTORE_SESSION'; user: AuthUser; sessionExpiresAt: string }
  | { type: 'OPEN_FORGOT_PASSWORD' }
  | { type: 'OPEN_RESET_PASSWORD'; email: string }
  | { type: 'COMPLETE_RESET_PASSWORD'; notice: string }
  | { type: 'OPEN_CHANGE_PASSWORD' }
  | { type: 'COMPLETE_CHANGE_PASSWORD'; notice: string }
  | { type: 'DISMISS_NOTICE' }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'LOGOUT' };

export const defaultAuthState: AuthState = {
  authenticated: false,
  user: { id: '', name: '', role: 'candidate' },
  authView: 'login',
  sessionExpiresAt: null,
  notice: null,
};