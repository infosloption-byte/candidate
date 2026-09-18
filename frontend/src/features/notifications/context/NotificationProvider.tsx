import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { NotificationContext } from './NotificationContextObject';
import { loadNotifications, saveNotifications } from '../services/notificationRepository';
import type { NotificationAction, NotificationState } from '../types/notificationState';

const initialState: NotificationState = { notifications: [] };

const reducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'HYDRATE': return { notifications: action.notifications };
    case 'MARK_READ': return { notifications: state.notifications.map((item) => item.id === action.notificationId ? { ...item, read: true } : item) };
    case 'MARK_ALL_READ': return { notifications: state.notifications.map((item) => ({ ...item, read: true })) };
    case 'CLEAR_READ': return { notifications: state.notifications.filter((item) => !item.read) };
    default: return state;
  }
};

export const NotificationProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState, () => ({ notifications: loadNotifications() }));
  useEffect(() => saveNotifications(state.notifications), [state.notifications]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
