import { getPrisma } from './prisma.js';

export interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
}

export const createNotification = async (input: NotificationInput): Promise<void> => {
  await createNotifications([input]);
};

export const createNotifications = async (inputs: NotificationInput[]): Promise<void> => {
  if (!inputs.length) return;
  try {
    await getPrisma().notification.createMany({ data: inputs });
  } catch {
    // Notifications are operational aids and must never block the core workflow.
  }
};

export const notifyAgencyUsers = async (
  agencyId: string,
  input: Omit<NotificationInput, 'userId'>,
  roles: Array<'AGENCY' | 'INTERVIEWER'> = ['AGENCY'],
): Promise<void> => {
  try {
    const users = await getPrisma().user.findMany({
      where: { agencyId, role: { in: roles }, active: true },
      select: { id: true },
    });
    await createNotifications(users.map((user) => ({ ...input, userId: user.id })));
  } catch {
    // Keep notifications non-blocking.
  }
};

export const notifyCandidateAccount = async (
  candidateId: string,
  input: Omit<NotificationInput, 'userId'>,
): Promise<void> => {
  try {
    const account = await getPrisma().user.findFirst({
      where: { candidateId, role: 'INTERVIEWEE', active: true },
      select: { id: true },
    });
    if (account) await createNotification({ ...input, userId: account.id });
  } catch {
    // Keep notifications non-blocking.
  }
};
