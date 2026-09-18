import type { Dispatch } from 'react';
import type { AuthAction, AuthState } from '../types/auth';

export interface AuthContextValue {
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
}
