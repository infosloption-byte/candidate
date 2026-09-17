import { useAppContext, type AppView } from '../context/AppContext';

export const useAppShell = () => {
  const { state, dispatch } = useAppContext();
  const setView = (view: AppView) => dispatch({ type: 'SET_VIEW', view });
  const toggleSidebar = () => dispatch({ type: 'TOGGLE_SIDEBAR' });
  const openMobileNav = () => dispatch({ type: 'OPEN_MOBILE_NAV' });
  const closeMobileNav = () => dispatch({ type: 'CLOSE_MOBILE_NAV' });
  return { state, actions: { setView, toggleSidebar, openMobileNav, closeMobileNav } };
};
