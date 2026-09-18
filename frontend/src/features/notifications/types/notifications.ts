export type NotificationType = 'onboarding' | 'interview' | 'document' | 'approval' | 'import' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
