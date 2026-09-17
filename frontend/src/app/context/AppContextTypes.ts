export type AppView = 'dashboard' | 'candidates' | 'interviews' | 'jobs' | 'selection' | 'reports' | 'settings';
export interface AppState { activeView: AppView; sidebarCollapsed: boolean; mobileNavOpen: boolean; }
export type AppAction =
  | { type: 'SET_VIEW'; view: AppView }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'OPEN_MOBILE_NAV' }
  | { type: 'CLOSE_MOBILE_NAV' };
