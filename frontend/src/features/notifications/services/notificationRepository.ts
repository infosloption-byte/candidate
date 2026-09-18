import type { Notification } from '../types/notifications';

const STORAGE_KEY = 'buildhire.notifications';

const seeds: Notification[] = [
  { id: 'n-001', type: 'onboarding', title: 'Onboarding review available', message: 'A candidate has submitted onboarding for recruiter review.', createdAt: new Date().toISOString(), read: false },
  { id: 'n-002', type: 'interview', title: 'Interview decision pending', message: 'An evaluation-stage interview still needs a final decision.', createdAt: new Date(Date.now() - 3600000).toISOString(), read: false },
  { id: 'n-003', type: 'document', title: 'Documents need verification', message: 'A candidate profile has documents waiting for review.', createdAt: new Date(Date.now() - 7200000).toISOString(), read: false },
  { id: 'n-004', type: 'approval', title: 'Selection approval requested', message: 'A job shortlist is waiting for management approval.', createdAt: new Date(Date.now() - 86400000).toISOString(), read: true },
];

export const loadNotifications = (): Notification[] => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seeds;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Notification[] : seeds;
  } catch {
    return seeds;
  }
};

export const saveNotifications = (notifications: Notification[]): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};
