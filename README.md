# BuildHire — Construction Recruitment Platform

BuildHire is a lightweight construction recruitment and interview management platform built around a candidate-first workflow.

## Product roles

- **Admin** — manages all agency workspaces and can operate the complete recruitment workflow on behalf of any agency.
- **Agency** — manages its own candidate pool, positions, interviews, and interviewers.
- **Interviewer** — sees assigned interviews and completes interview scorecards.
- **Interviewee** — maintains their own candidate profile and sees assigned interview information.

## Core workflow

`Agency → Candidate Pool → Assign Candidate to Interview → Interview Panel → Criteria Scoring → Interview Completed → Final Candidate Status → Candidate History`

A candidate is added to the system once and remains in the candidate pool. There is no separate job-application workflow.

Positions/jobs remain available as optional context when an interview is assigned; they do not create an application record.

Candidate onboarding supports:

- Candidate self-onboarding.
- Agency-created onboarding.
- Bulk agency onboarding by CSV.

## Candidate record

Each candidate maintains a persistent profile containing:

- identity and contact information
- profession, experience, and skills
- onboarding state
- lifecycle status
- candidate documents
- interview history
- interview score totals
- status-change history
- candidate activity/audit history

## Interview and scoring

An interview is assigned directly to a candidate and may optionally reference a job/position.

An interview can have one or more active interviewers. Each panel interviewer submits one scorecard using the agency's configured interview criteria. Each criterion has its own maximum points.

When all assigned interviewers have completed their scorecards:

1. the interview is marked completed;
2. the candidate moves to **INTERVIEW_COMPLETED**;
3. the score summary is retained with the interview history;
4. Admin or Agency records the final candidate status, such as **PASSED**, **REJECTED**, **HIRED**, or **ON_HOLD**.

## Admin operations

Admin has cross-agency access for operational work. The Admin interface can select an agency workspace and manage:

- candidates and candidate history
- jobs/positions
- interview assignment, rescheduling, and cancellation
- interview criteria
- agency users and interviewers
- agency activation/deactivation

## Repository layout

```text
candidate/
├── frontend/       # React 19 + TypeScript + Tailwind
├── backend/        # Fastify + TypeScript + Prisma/MySQL
├── docs/           # Current product/release documentation
├── TASKS.md        # Living implementation tracker
└── README.md
```

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

The seed requires `BUILDHIRE_SEED_PASSWORD` and creates a demo agency plus Admin, Agency, and Interviewer accounts. It also creates the default interview scoring criteria for the demo agency.

### Frontend

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` requests to `http://localhost:4000` during development.

### Candidate self-registration

Open the frontend without an active session, choose **Create a candidate account**, select an active agency, complete the profile, and submit. The API creates the Interviewee account and linked Candidate record in one transaction. The candidate then enters the pool.

## Development principles

- Keep the workflow candidate-first and explicit.
- A candidate is created once and reused across all interview history.
- Do not introduce a separate application entity for the interview workflow.
- Jobs are optional interview context, not a prerequisite for candidate management.
- Keep interview scheduling attached directly to a Candidate.
- Keep interview criteria configurable at agency level.
- Record lifecycle changes and important candidate actions as history.
- Admin can operate on behalf of an agency while Agency users remain isolated to their own agency.
- Prefer simple React state and native browser APIs.
- Avoid introducing a subsystem until the core workflow needs it.

The detailed tracker is [TASKS.md](./TASKS.md) and release checks are documented in [docs/RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md).

Two-project Vercel deployment is documented in [docs/VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md).
