import { useContext, useMemo } from 'react';
import { NotificationContext } from '../context/NotificationContextObject';

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  const unreadCount = useMemo(() => context.state.notifications.filter((item) => !item.read).length, [context.state.notifications]);
  return { ...context, unreadCount };
};
