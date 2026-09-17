import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { AppAction, AppState } from './AppContextTypes';

export interface AppContextValue { state: AppState; dispatch: Dispatch<AppAction>; }
export const AppContext = createContext<AppContextValue | null>(null);
