import type { Notification } from './notifications';

export interface NotificationState {
  notifications: Notification[];
}

export type NotificationAction =
  | { type: 'HYDRATE'; notifications: Notification[] }
  | { type: 'MARK_READ'; notificationId: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR_READ' };
