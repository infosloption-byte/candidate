import type { UserRole } from "../generated/prisma/enums.js";

export type Permission =
  | "dashboard.view"
  | "candidate.view"
  | "candidate.manage"
  | "candidate.import"
  | "candidate.invite"
  | "interview.view"
  | "interview.schedule"
  | "interview.evaluate"
  | "job.view"
  | "job.manage"
  | "selection.view"
  | "selection.decide"
  | "selection.approve"
  | "allocation.view"
  | "allocation.manage"
  | "document.view"
  | "document.manage"
  | "document.bulk-follow-up"
  | "report.view"
  | "notification.view"
  | "settings.view"
  | "settings.manage";

const rolePermissions: Record<UserRole, readonly Permission[]> = {
  SYSTEM_ADMIN: [
    "dashboard.view", "candidate.view", "candidate.manage", "candidate.import", "candidate.invite",
    "interview.view", "interview.schedule", "interview.evaluate",
    "job.view", "job.manage",
    "selection.view", "selection.decide", "selection.approve",
    "allocation.view", "allocation.manage",
    "document.view", "document.manage", "document.bulk-follow-up",
    "report.view", "notification.view", "settings.view", "settings.manage",
  ],
  RECRUITER: [
    "dashboard.view", "candidate.view", "candidate.manage", "candidate.import", "candidate.invite",
    "interview.view", "interview.schedule", "interview.evaluate",
    "job.view", "job.manage",
    "selection.view", "selection.decide",
    "allocation.view", "allocation.manage",
    "document.view", "document.manage", "document.bulk-follow-up",
    "report.view", "notification.view",
  ],
  INTERVIEWER: [
    "dashboard.view", "candidate.view",
    "interview.view", "interview.schedule", "interview.evaluate",
    "document.view", "report.view", "notification.view",
  ],
  MANAGER: [
    "dashboard.view", "candidate.view",
    "job.view", "job.manage",
    "selection.view", "selection.approve",
    "allocation.view", "allocation.manage",
    "document.view", "document.manage",
    "report.view", "notification.view",
  ],
  CANDIDATE: [],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  rolePermissions[role].includes(permission);

export const roleToFrontend = (role: UserRole): "system-admin" | "recruiter" | "interviewer" | "manager" | "candidate" => ({
  SYSTEM_ADMIN: "system-admin",
  RECRUITER: "recruiter",
  INTERVIEWER: "interviewer",
  MANAGER: "manager",
  CANDIDATE: "candidate",
}[role]);

export const roleFromFrontend = (role: "system-admin" | "recruiter" | "interviewer" | "manager" | "candidate"): UserRole => ({
  "system-admin": "SYSTEM_ADMIN",
  recruiter: "RECRUITER",
  interviewer: "INTERVIEWER",
  manager: "MANAGER",
  candidate: "CANDIDATE",
}[role]);
