import type { Dispatch } from 'react';
import type { AuthState } from '../types/auth';
import type { AuthAction } from '../types/authState';

export interface AuthContextValue {
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
}
