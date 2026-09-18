import type { Dispatch } from 'react';
import type { NotificationState } from '../types/notificationState';
import type { NotificationAction } from '../types/notificationState';

export interface NotificationContextValue {
  state: NotificationState;
  dispatch: Dispatch<NotificationAction>;
}
