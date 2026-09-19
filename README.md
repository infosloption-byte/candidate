# BuildHire — Construction Recruitment Platform

This repository has been reset to a smaller product scope and is being rebuilt from a clean domain model.

## Product roles

- **Admin** — system administrator.
- **Agency** — recruitment agency that publishes jobs and onboards candidates.
- **Interviewer** — person who conducts interviews and submits evaluations.
- **Interviewee** — candidate who applies for jobs and completes onboarding.

## Core workflow

`Agency → Publish Job → Onboard Candidate → Candidate Applies → Schedule Interview → Assign Interviewer / Panel → Interview Evaluation → Decision`

Candidate onboarding supports three entry modes in the target product:

- Candidate self-onboarding.
- Agency-created onboarding.
- Bulk agency onboarding.

## Repository layout

```text
candidate/
├── frontend/       # React 19 + TypeScript + Tailwind visual shell
├── backend/        # Fastify + TypeScript API
├── docs/           # Current rebuild plan
├── TASKS.md        # Living implementation tracker
└── README.md
```

## Current implementation

The rebuilt system now has the core database model and protected API workflow for:

- session-based authentication with four roles
- Admin agency management
- Agency and Interviewer account management
- candidate self-registration and agency onboarding
- job create/edit/publish/close
- candidate applications and duplicate protection
- application workflow progression
- interview scheduling against an application
- single or panel interview assignment
- interviewer/candidate schedule conflict checks
- panel evaluation and application decision
- optional candidate document upload with agency-isolated access

The frontend is connected to these APIs for authentication, jobs, candidates, applications, interviews, evaluations, and candidate documents. Set `VITE_API_BASE_URL` when the API is not served from the default `/api/v1` path.

## Development setup

### Backend

Create `backend/.env` from `backend/.env.example` and point `DATABASE_URL` at a local MySQL/MariaDB database.

Then:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The seed requires `BUILDHIRE_SEED_PASSWORD` and creates a demo agency plus Admin, Agency, and Interviewer accounts. The email addresses are configurable in `.env`.

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://localhost:4000` during development.

### Candidate self-registration

Open the frontend without an active session, choose **Create a candidate account**, select an active agency, complete the profile, and submit. The API creates the Interviewee account and linked Candidate record in one transaction.

## Development principles

- Keep the workflow small and explicit.
- Build frontend UX first, then API/database behavior for the same workflow.
- Prefer simple React state and native browser APIs.
- Avoid introducing a subsystem until the core workflow needs it.
- Keep interview scheduling attached to a **JobApplication**, not directly to a candidate.
- A panel is simply multiple interviewers assigned to one interview.
- Candidate onboarding and recruitment status are separate concepts.
- Bulk onboarding is an import operation, not a separate candidate domain.

The full rebuild sequence is maintained in [docs/BUILD_PLAN.md](./docs/BUILD_PLAN.md), the detailed task tracker is [TASKS.md](./TASKS.md), and release checks are documented in [docs/RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md).
