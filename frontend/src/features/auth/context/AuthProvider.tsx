import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { AuthContext } from './AuthContextObject';
import type { AuthState } from '../types/auth';
import type { AuthAction } from '../types/authState';
import { defaultAuthState } from '../types/authState';

const STORAGE_KEY = 'buildhire.auth';

const reducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_CANDIDATE': return { authenticated: true, user: action.user };
    case 'LOGIN_RECRUITER': return { authenticated: true, user: action.user };
    case 'LOGOUT': return { authenticated: false, user: { id: '', name: '', role: 'candidate' } };
    default: return state;
  }
};

const load = (): AuthState => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultAuthState;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return defaultAuthState;
    const value = parsed as AuthState;
    return value.authenticated && value.user ? value : defaultAuthState;
  } catch {
    return defaultAuthState;
  }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
