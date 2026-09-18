import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { canRole, canView, getDefaultView, type Permission } from '../services/permissions';
import type { AppView } from '../../../app/context/AppContextTypes';

export const usePermissions = () => {
  const { state } = useAuth();

  return useMemo(() => ({
    can: (permission: Permission) => canRole(state.user.role, permission),
    canView: (view: AppView) => canView(state.user.role, view),
    defaultView: getDefaultView(state.user.role),
  }), [state.user.role]);
};
