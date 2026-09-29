import { getPrisma } from './prisma.js';
import { recordAuditEvent } from './audit.js';
import { createNotifications } from './notifications.js';

/** An interview can no longer be started once scheduledAt + duration has passed; give managers this long to react first. */
export const STALE_GRACE_MS = 2 * 60 * 60_000;
const CHECK_INTERVAL_MS = 10 * 60_000;

/**
 * Scheduled interviews whose start window has long passed (nobody started them, and the API refuses to
 * start them now) would otherwise stay SCHEDULED forever, blocking the candidate from being rescheduled.
 * They are closed as CANCELLED, the candidate/job go back to READY_FOR_INTERVIEW, and the panel and
 * agency are told. Interviews already IN_PROGRESS are never touched automatically - they hold scorecard
 * data - and stay available to company/agency managers via POST /interviews/:id/status.
 */
export const closeStaleInterviews = async (now: Date = new Date()): Promise<number> => {
  const prisma = getPrisma();
  const candidates = await prisma.interview.findMany({
    where: { status: 'SCHEDULED' },
    select: {
      id: true, companyId: true, candidateId: true, jobId: true, scheduledAt: true, durationMins: true,
      candidate: { select: { agencyId: true, status: true, firstName: true, lastName: true } },
      panel: { select: { userId: true } },
    },
    take: 500,
  });

  let closed = 0;
  for (const interview of candidates) {
    if (interview.scheduledAt.getTime() + interview.durationMins * 60_000 + STALE_GRACE_MS > now.getTime()) continue;

    const didClose = await prisma.$transaction(async (tx) => {
      // Conditional update: another instance (or a manager) may have changed the interview meanwhile.
      const updated = await tx.interview.updateMany({ where: { id: interview.id, status: 'SCHEDULED' }, data: { status: 'CANCELLED' } });
      if (updated.count === 0) return false;

      // Only reset the candidate if this was their only open interview.
      const otherOpen = await tx.interview.count({
        where: { candidateId: interview.candidateId, id: { not: interview.id }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      });
      if (!otherOpen && interview.candidate.status === 'INTERVIEW_SCHEDULED') {
        await tx.candidate.update({ where: { id: interview.candidateId }, data: { status: 'READY_FOR_INTERVIEW', statusUpdatedAt: now } });
        await tx.candidateStatusHistory.create({
          data: {
            candidateId: interview.candidateId,
            fromStatus: 'INTERVIEW_SCHEDULED',
            toStatus: 'READY_FOR_INTERVIEW',
            reason: 'Interview was not started within its window and was closed automatically.',
            changedById: null,
          },
        });
        if (interview.jobId) {
          await tx.jobCandidate.updateMany({
            where: { jobId: interview.jobId, candidateId: interview.candidateId, status: { notIn: ['HIRED', 'PASSED', 'REJECTED'] } },
            data: { status: 'READY_FOR_INTERVIEW', statusUpdatedAt: now },
          });
        }
      }
      return true;
    });
    if (!didClose) continue;
    closed += 1;

    const name = interview.candidate.firstName + ' ' + interview.candidate.lastName;
    await recordAuditEvent({
      actorId: null,
      companyId: interview.companyId,
      agencyId: interview.candidate.agencyId,
      action: 'INTERVIEW_AUTO_CLOSED',
      entityType: 'Interview',
      entityId: interview.id,
      summary: 'Interview for "' + name + '" was not started within its window and was closed automatically. Please reschedule.',
    });
    const agencyUsers = await getPrisma().user.findMany({
      where: { companyId: interview.companyId, active: true, OR: [{ role: 'COMPANY_ADMIN' }, { role: 'AGENCY', agencyId: interview.candidate.agencyId }] },
      select: { id: true },
    });
    const recipients = new Set([...interview.panel.map((item) => item.userId), ...agencyUsers.map((user) => user.id)]);
    await createNotifications([...recipients].map((userId) => ({
      userId,
      type: 'INTERVIEW_UPDATED',
      title: 'Interview closed automatically',
      message: 'The interview for "' + name + '" was never started and has been closed. Please schedule a new one.',
    })));
  }
  return closed;
};

/** Starts the periodic check. Returns a stop function. Intended for the real server process only. */
export const startInterviewMaintenance = (log: { error: (obj: unknown, msg: string) => void }): (() => void) => {
  const run = (): void => {
    closeStaleInterviews().catch((error: unknown) => log.error({ err: error }, 'Stale interview cleanup failed'));
  };
  const timer = setInterval(run, CHECK_INTERVAL_MS);
  timer.unref();
  setTimeout(run, 30_000).unref();
  return () => clearInterval(timer);
};
