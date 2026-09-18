import type { Dispatch } from 'react';
import type { NotificationAction, NotificationState } from '../types/notifications';

export interface NotificationContextValue {
  state: NotificationState;
  dispatch: Dispatch<NotificationAction>;
}
