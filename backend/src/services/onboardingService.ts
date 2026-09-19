import { createHash, randomBytes, randomUUID } from "node:crypto";
import { CandidateOnboardingStatus as PrismaOnboardingStatus, InvitationStatus } from "../generated/prisma/enums.js";
import { AppError } from "../errors/AppError.js";
import { withTransaction, type DbClient } from "../lib/db.js";
import { prisma } from "../lib/prisma.js";
import { createAuditEvent } from "../repositories/auditRepository.js";
import { createJourneyEvent, findCandidateById } from "../repositories/candidateRepository.js";
import { toCandidateDto } from "./candidateService.js";
import type { AuthContext } from "../types/fastify.js";

const TOKEN_BYTES = 32;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REMINDER_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

const hashToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

const onboardingMap: Record<PrismaOnboardingStatus, "not-started" | "invited" | "in-progress" | "submitted" | "needs-changes" | "completed"> = {
  NOT_STARTED: "not-started",
  INVITED: "invited",
  IN_PROGRESS: "in-progress",
  SUBMITTED: "submitted",
  NEEDS_CHANGES: "needs-changes",
  COMPLETED: "completed",
};

const statusProgress = (status: keyof typeof onboardingMap): number => ({
  NOT_STARTED: 0,
  INVITED: 10,
  IN_PROGRESS: 55,
  SUBMITTED: 100,
  NEEDS_CHANGES: 70,
  COMPLETED: 100,
}[status]);

const invitationDto = (invitation: {
  status: InvitationStatus;
  sentAt: Date;
  lastSentAt: Date;
  expiresAt: Date;
  openedAt: Date | null;
  startedAt: Date | null;
  reminderDueAt: Date | null;
  cancelledAt: Date | null;
  sendCount: number;
}) => ({
  status: invitation.status.toLowerCase() as "pending" | "opened" | "started" | "expired" | "cancelled",
  sentAt: invitation.sentAt.toISOString(),
  lastSentAt: invitation.lastSentAt.toISOString(),
  expiresAt: invitation.expiresAt.toISOString(),
  openedAt: invitation.openedAt?.toISOString(),
  startedAt: invitation.startedAt?.toISOString(),
  reminderDueAt: invitation.reminderDueAt?.toISOString(),
  cancelledAt: invitation.cancelledAt?.toISOString(),
  sendCount: invitation.sendCount,
});

const loadCandidate = async (tenantId: string, id: string) => {
  const candidate = await prisma.candidate.findFirst({
    where: { tenantId, id },
    include: { invitation: true },
  });
  if (!candidate) throw AppError.notFound("Candidate not found.");
  return candidate;
};

const validateInvitationTransition = (
  current: InvitationStatus,
  next: "opened" | "started" | "expired" | "cancelled",
): void => {
  const valid: Record<InvitationStatus, readonly string[]> = {
    PENDING: ["opened", "expired", "cancelled"],
    OPENED: ["started", "expired", "cancelled"],
    STARTED: [],
    EXPIRED: [],
    CANCELLED: [],
  };
  if (!valid[current].includes(next)) {
    throw AppError.invalidState(`Invitation cannot move from ${current.toLowerCase()} to ${next}.`);
  }
};

const writeJourneyAndAudit = async (
  tx: DbClient,
  auth: AuthContext,
  candidateId: string,
  title: string,
  detail: string,
  tone: "NEUTRAL" | "POSITIVE" | "WARNING" | "NEGATIVE",
  action: string,
  metadata: Record<string, string | number | boolean | null>,
) => {
  await createJourneyEvent(tx, {
    id: randomUUID(),
    tenantId: auth.tenantId,
    candidateId,
    title,
    detail,
    tone,
    occurredAt: new Date(),
  });
  await createAuditEvent({
    tenantId: auth.tenantId,
    actorUserId: auth.userId,
    entityType: "Candidate",
    entityId: candidateId,
    action,
    metadata,
  }, tx);
};

export const sendInvitation = async (auth: AuthContext, candidateId: string, resend = false) => {
  const candidate = await loadCandidate(auth.tenantId, candidateId);
  const existing = candidate.invitation;

  if (!resend && existing && existing.status !== InvitationStatus.EXPIRED && existing.status !== InvitationStatus.CANCELLED) {
    throw AppError.conflict("An active onboarding invitation already exists.");
  }

  if (resend && existing && existing.status !== InvitationStatus.PENDING && existing.status !== InvitationStatus.OPENED) {
    throw AppError.invalidState("Only pending or opened invitations can be resent.");
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);
  const reminderDueAt = new Date(now.getTime() + REMINDER_AFTER_MS);
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);

  await withTransaction(async (tx) => {
    if (existing) {
      await tx.candidateInvitation.update({
        where: { id: existing.id },
        data: {
          status: InvitationStatus.PENDING,
          tokenHash,
          sentAt: existing.sentAt,
          lastSentAt: now,
          expiresAt,
          openedAt: null,
          startedAt: null,
          reminderDueAt,
          cancelledAt: null,
          sendCount: { increment: 1 },
        },
      });
    } else {
      await tx.candidateInvitation.create({
        data: {
          id: randomUUID(),
          tenantId: auth.tenantId,
          candidateId,
          status: InvitationStatus.PENDING,
          tokenHash,
          sentAt: now,
          lastSentAt: now,
          expiresAt,
          reminderDueAt,
          sendCount: 1,
        },
      });
    }

    await tx.candidate.update({
      where: { id: candidate.id },
      data: {
        onboardingStatus: PrismaOnboardingStatus.INVITED,
        onboardingCompletionPercent: 10,
        onboardingInvitedAt: candidate.onboardingInvitedAt ?? now,
        onboardingLastActivityAt: now,
      },
    });

    await writeJourneyAndAudit(
      tx,
      auth,
      candidateId,
      `Onboarding invitation ${resend ? "resent" : "sent"}`,
      `A secure onboarding invitation was ${resend ? "resent" : "created"} for the candidate.`,
      "WARNING",
      resend ? "candidate.invitation_resent" : "candidate.invitation_sent",
      { resend },
    );
  });

  const refreshed = await loadCandidate(auth.tenantId, candidateId);
  return {
    candidate: toCandidateDto(refreshed as never),
    invitation: refreshed.invitation ? invitationDto(refreshed.invitation) : null,
  };
};

export const transitionInvitation = async (
  auth: AuthContext,
  candidateId: string,
  action: "opened" | "started" | "expired" | "cancelled",
) => {
  const candidate = await loadCandidate(auth.tenantId, candidateId);
  const invitation = candidate.invitation;
  if (!invitation) throw AppError.notFound("Onboarding invitation not found.");

  validateInvitationTransition(invitation.status, action);

  const now = new Date();
  const nextStatus = ({
    opened: InvitationStatus.OPENED,
    started: InvitationStatus.STARTED,
    expired: InvitationStatus.EXPIRED,
    cancelled: InvitationStatus.CANCELLED,
  } as const)[action];

  await withTransaction(async (tx) => {
    await tx.candidateInvitation.update({
      where: { id: invitation.id },
      data: {
        status: nextStatus,
        openedAt: action === "opened" ? now : invitation.openedAt,
        startedAt: action === "started" ? now : invitation.startedAt,
        cancelledAt: action === "cancelled" ? now : invitation.cancelledAt,
      },
    });

    const nextOnboarding = action === "started"
      ? PrismaOnboardingStatus.IN_PROGRESS
      : action === "opened"
        ? PrismaOnboardingStatus.INVITED
        : undefined;

    await tx.candidate.update({
      where: { id: candidate.id },
      data: {
        ...(nextOnboarding ? {
          onboardingStatus: nextOnboarding,
          onboardingCompletionPercent: statusProgress(nextOnboarding),
        } : {}),
        onboardingLastActivityAt: now,
      },
    });

    await writeJourneyAndAudit(
      tx,
      auth,
      candidateId,
      `Invitation — ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      action === "started"
        ? "Candidate onboarding was marked as started."
        : `The onboarding invitation was marked as ${action}.`,
      action === "cancelled" || action === "expired" ? "NEGATIVE" : "POSITIVE",
      `candidate.invitation_${action}`,
      {},
    );
  });

  const refreshed = await loadCandidate(auth.tenantId, candidateId);
  return {
    candidate: toCandidateDto(refreshed as never),
    invitation: refreshed.invitation ? invitationDto(refreshed.invitation) : null,
  };
};

export const updateOnboardingStatus = async (
  auth: AuthContext,
  candidateId: string,
  status: "not-started" | "invited" | "in-progress" | "submitted" | "needs-changes" | "completed",
  reviewerNote = "",
) => {
  const candidate = await loadCandidate(auth.tenantId, candidateId);
  const current = onboardingMap[candidate.onboardingStatus];

  const transitions: Record<typeof current, readonly string[]> = {
    "not-started": ["invited"],
    invited: ["in-progress"],
    "in-progress": ["submitted", "needs-changes"],
    submitted: ["needs-changes", "completed"],
    "needs-changes": ["submitted"],
    completed: [],
  };

  if (current !== status && !transitions[current].includes(status)) {
    throw AppError.invalidState(`Onboarding cannot move from ${current} to ${status}.`);
  }

  if (status === "needs-changes" && !reviewerNote.trim()) {
    throw AppError.invalidInput("A reviewer note is required when requesting changes.", [
      { field: "reviewerNote", code: "REQUIRED", message: "Explain what the candidate must correct." },
    ]);
  }

  if (status === "completed") {
    const missingDocuments = await prisma.candidateDocument.count({
      where: {
        tenantId: auth.tenantId,
        candidateId,
        OR: [
          { type: "PASSPORT", state: { not: "VERIFIED" } },
          { type: "CV", state: { not: "VERIFIED" } },
          { type: "TRADE_CERTIFICATE", state: { not: "VERIFIED" } },
        ],
      },
    });
    if (missingDocuments > 0) {
      throw AppError.invalidState("Passport, CV and trade certificate must be verified before onboarding can be completed.");
    }
  }

  const nextStatus = ({
    "not-started": PrismaOnboardingStatus.NOT_STARTED,
    invited: PrismaOnboardingStatus.INVITED,
    "in-progress": PrismaOnboardingStatus.IN_PROGRESS,
    submitted: PrismaOnboardingStatus.SUBMITTED,
    "needs-changes": PrismaOnboardingStatus.NEEDS_CHANGES,
    completed: PrismaOnboardingStatus.COMPLETED,
  } as const)[status];

  const now = new Date();

  await withTransaction(async (tx) => {
    await tx.candidate.update({
      where: { id: candidate.id },
      data: {
        onboardingStatus: nextStatus,
        onboardingCompletionPercent: statusProgress(nextStatus),
        onboardingLastActivityAt: now,
        onboardingSubmittedAt: status === "submitted" ? (candidate.onboardingSubmittedAt ?? now) : candidate.onboardingSubmittedAt,
        onboardingReviewedAt: status === "completed" ? now : candidate.onboardingReviewedAt,
        onboardingReviewerNote: reviewerNote.trim() || candidate.onboardingReviewerNote,
      },
    });

    await writeJourneyAndAudit(
      tx,
      auth,
      candidateId,
      `Onboarding — ${status.replace("-", " ")}`,
      status === "needs-changes"
        ? reviewerNote.trim()
        : `Candidate onboarding moved to ${status.replace("-", " ")}.`,
      status === "completed" ? "POSITIVE" : status === "needs-changes" ? "NEGATIVE" : "WARNING",
      "candidate.onboarding_status_changed",
      { from: current, to: status },
    );
  });

  const refreshed = await loadCandidate(auth.tenantId, candidateId);
  return toCandidateDto(refreshed as never);
};