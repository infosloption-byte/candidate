# BuildHire — Construction Recruitment Platform

This repository has been reset to a smaller product scope and is being rebuilt from a clean domain model.

## Product roles

- **Admin** — system administrator.
- **Agency** — recruitment agency that publishes jobs and onboards candidates.
- **Interviewer** — person who conducts interviews and submits evaluations.
- **Interviewee** — candidate who applies for jobs and completes onboarding.

## Core workflow

`Agency → Publish Job → Onboard Candidate → Candidate Applies → Schedule Interview → Assign Interviewer / Panel → Interview Evaluation`

Candidate onboarding supports three entry modes in the target product:

- Candidate self-onboarding.
- Agency-created onboarding.
- Bulk agency onboarding.

## Repository layout

```text
candidate/
├── frontend/       # React 19 + TypeScript + Tailwind visual shell
├── backend/        # Fastify + TypeScript API foundation
├── docs/           # Current rebuild plan
├── TASKS.md        # Living implementation tracker
└── README.md
```

## Current reset state

The previous feature implementation has been removed from the active codebase. The frontend keeps the existing BuildHire visual theme, responsive sidebar, top bar, typography, spacing, colors, and mobile navigation pattern. Business screens and business state will be rebuilt on top of this shell.

The backend now contains only a minimal Fastify foundation and health endpoint. Prisma remains installed, but the database model has been replaced with a new minimal schema for Agency, User, Candidate, Job, JobApplication, Interview, InterviewParticipant, and InterviewEvaluation.

No selection, allocation, notification, reports, complex document control, approval workflow, or legacy recruitment state is part of the new baseline.

## Development principles

- Keep the workflow small and explicit.
- Build frontend UX first, then API/database behavior for the same workflow.
- Prefer simple React state and native browser APIs.
- Avoid introducing a subsystem until the core workflow needs it.
- Keep interview scheduling attached to a **JobApplication**, not directly to a candidate.
- A panel is simply multiple interviewers assigned to one interview.
- Candidate onboarding and recruitment status are separate concepts.
- Bulk onboarding is an import operation, not a separate candidate domain.

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

## Run backend

```bash
cd backend
npm install
npm run dev
```

The full rebuild sequence is maintained in [docs/BUILD_PLAN.md](./docs/BUILD_PLAN.md), and the detailed task tracker is [TASKS.md](./TASKS.md).
