import { useCallback, useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { AuthContext } from './AuthContextObject';
import type { AuthState } from '../types/auth';
import type { AuthAction } from '../types/authState';
import { defaultAuthState } from '../types/authState';
import { apiRequest, ApiError } from '../../../shared/services/apiClient';

const guestState = (): AuthState => ({
  ...defaultAuthState,
  user: { ...defaultAuthState.user },
});

const reducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN':
    case 'RESTORE_SESSION':
      return {
        authenticated: true,
        user: action.user,
        authView: 'login',
        sessionExpiresAt: action.sessionExpiresAt,
        notice: null,
      };
    case 'LOGIN_CANDIDATE':
      return { ...state, authenticated: true, user: action.user, authView: 'login', sessionExpiresAt: null, notice: null };
    case 'OPEN_FORGOT_PASSWORD':
      return { ...state, authView: 'forgot', notice: null };
    case 'OPEN_RESET_PASSWORD':
      return { ...state, authView: 'reset', notice: action.email.trim() ? 'A password reset request was created.' : null };
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

interface LoginResponse {
  user: AuthState["user"];
  sessionExpiresAt: string;
}

interface MeResponse {
  user: AuthState["user"];
  sessionExpiresAt: string;
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, guestState());

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    dispatch({ type: "LOGIN", user: session.user, sessionExpiresAt: session.sessionExpiresAt });
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<null>("/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "UNAUTHENTICATED") throw error;
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restore = async (): Promise<void> => {
      try {
        const session = await apiRequest<MeResponse>("/auth/me");
        if (!cancelled) {
          dispatch({ type: "RESTORE_SESSION", user: session.user, sessionExpiresAt: session.sessionExpiresAt });
        }
      } catch {
        if (!cancelled) dispatch({ type: "LOGOUT" });
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.authenticated || !state.sessionExpiresAt) return undefined;

    const expiry = new Date(state.sessionExpiresAt).getTime();
    const timer = window.setTimeout(
      () => dispatch({ type: "SESSION_EXPIRED" }),
      Math.max(0, expiry - Date.now()),
    );

    return () => window.clearTimeout(timer);
  }, [state.authenticated, state.sessionExpiresAt]);

  const value = useMemo(() => ({ state, dispatch, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};