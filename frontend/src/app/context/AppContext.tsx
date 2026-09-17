import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react';

export type AppView = 'dashboard' | 'candidates' | 'interviews' | 'jobs' | 'selection' | 'reports' | 'settings';

type AppState = { activeView: AppView; sidebarCollapsed: boolean; mobileNavOpen: boolean };
type AppAction =
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'OPEN_MOBILE_NAV' }
  | { type: 'CLOSE_MOBILE_NAV' };

const initialState: AppState = { activeView: 'candidates', sidebarCollapsed: false, mobileNavOpen: false };
const AppContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null);

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
  const [state, dispatch] = useReducer(reducer, initialState, (base) => {
    const saved = window.localStorage.getItem('candidate-erp.sidebar-collapsed');
    return saved === null ? base : { ...base, sidebarCollapsed: saved === 'true' };
  });

  useEffect(() => {
    window.localStorage.setItem('candidate-erp.sidebar-collapsed', String(state.sidebarCollapsed));
  }, [state.sidebarCollapsed]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used inside AppProvider.');
  return context;
};
