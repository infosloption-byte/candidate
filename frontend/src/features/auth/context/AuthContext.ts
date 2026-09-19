import type { Dispatch } from 'react';
import type { AuthState, AuthUser } from '../types/auth';
import type { AuthAction } from '../types/authState';

export interface AuthContextValue {
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}