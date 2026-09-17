import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { AppContext } from './AppContextObject';
import type { AppAction, AppState } from './AppContextTypes';

const initialState: AppState = { activeView: 'candidates', sidebarCollapsed: false, mobileNavOpen: false };

const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_VIEW': return { ...state, activeView: action.view, mobileNavOpen: false };
    case 'TOGGLE_SIDEBAR': return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'OPEN_MOBILE_NAV': return { ...state, mobileNavOpen: true };
    case 'CLOSE_MOBILE_NAV': return { ...state, mobileNavOpen: false };
    default: return state;
  }
};

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState, (base) => ({ ...base, sidebarCollapsed: window.localStorage.getItem('buildhire.sidebar-collapsed') === 'true' }));
  useEffect(() => { window.localStorage.setItem('buildhire.sidebar-collapsed', String(state.sidebarCollapsed)); }, [state.sidebarCollapsed]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
