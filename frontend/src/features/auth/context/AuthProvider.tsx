import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { AuthContext } from './AuthContextObject';
import type { AuthState } from '../types/auth';
import type { AuthAction } from '../types/authState';
import { defaultAuthState } from '../types/authState';

const STORAGE_KEY = 'buildhire.auth';
const SESSION_LENGTH_MS = 8 * 60 * 60 * 1000;

const guestState = (): AuthState => ({
  ...defaultAuthState,
  user: { ...defaultAuthState.user },
});

const normalizeLoadedState = (value: Partial<AuthState>): AuthState => {
  if (!value.authenticated || !value.user) return guestState();

  const sessionExpired = value.sessionExpiresAt ? new Date(value.sessionExpiresAt).getTime() <= Date.now() : false;
  if (sessionExpired) return { ...guestState(), authView: 'expired', notice: 'Your previous session expired. Sign in again to continue.' };

  return {
    authenticated: true,
    user: value.user,
    authView: 'login',
    sessionExpiresAt: value.sessionExpiresAt ?? new Date(Date.now() + SESSION_LENGTH_MS).toISOString(),
    notice: null,
  };
};

const load = (): AuthState => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return guestState();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return guestState();
    return normalizeLoadedState(parsed as Partial<AuthState>);
  } catch {
    return guestState();
  }
};

const nextSessionExpiry = (): string => new Date(Date.now() + SESSION_LENGTH_MS).toISOString();

const reducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
    case 'LOGIN_CANDIDATE':
    case 'LOGIN_RECRUITER':
      return {
        authenticated: true,
        user: action.user,
        authView: 'login',
        sessionExpiresAt: nextSessionExpiry(),
        notice: null,
      };
    case 'OPEN_FORGOT_PASSWORD':
      return { ...state, authView: 'forgot', notice: null };
    case 'OPEN_RESET_PASSWORD':
      return {
        ...state,
        authView: 'reset',
        notice: action.email.trim() ? 'A password reset request was created in the frontend preview.' : null,
      };
    case 'COMPLETE_RESET_PASSWORD':
      return { ...guestState(), authView: 'login', notice: action.notice };
    case 'OPEN_CHANGE_PASSWORD':
      return { ...state, authView: 'change-password', notice: null };
    case 'COMPLETE_CHANGE_PASSWORD':
      return { ...state, authView: 'login', notice: action.notice };
    case 'DISMISS_NOTICE':
      return { ...state, notice: null };
    case 'SESSION_EXPIRED':
      return { ...guestState(), authView: 'expired', notice: 'Your session expired. Sign in again to continue.' };
    case 'LOGOUT':
      return guestState();
    default:
      return state;
  }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    if (!state.authenticated || !state.sessionExpiresAt) return undefined;

    const expiry = new Date(state.sessionExpiresAt).getTime();
    const timer = window.setTimeout(
      () => dispatch({ type: 'SESSION_EXPIRED' }),
      Math.max(0, expiry - Date.now()),
    );

    return () => window.clearTimeout(timer);
  }, [state.authenticated, state.sessionExpiresAt]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
