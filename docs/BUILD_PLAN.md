# BuildHire Rebuild Plan

## Goal

Rebuild the application around one simple, candidate-first recruitment workflow and remove unnecessary application-stage complexity.

## Target roles

| Role | Responsibility |
|---|---|
| Admin | System-wide administration and full agency operations on behalf of any agency |
| Agency | Manage its candidate pool, positions, interviews, interviewers, and candidate decisions |
| Interviewer | Participate in assigned interviews and submit criterion scores |
| Interviewee | Maintain candidate profile and view assigned interview information |

## Target workflow

Candidate is onboarded
      ↓
Candidate enters the agency candidate pool
      ↓
Admin / Agency selects candidate
      ↓
Interview is assigned directly to candidate
  ├─ optional job / position context
  └─ one interviewer OR panel
      ↓
Interview is conducted
      ↓
Each assigned interviewer scores configured criteria
      ↓
All panel evaluations complete
      ↓
Interview is marked COMPLETED
      ↓
Candidate moves to INTERVIEW_COMPLETED
      ↓
Admin / Agency records final status
  ├─ PASSED
  ├─ REJECTED
  ├─ HIRED
  └─ another supported lifecycle status
      ↓
Candidate profile retains status, interview, score, and activity history

## Candidate lifecycle

POOL → READY_FOR_INTERVIEW → INTERVIEW_SCHEDULED → INTERVIEW_COMPLETED → PASSED / REJECTED / HIRED

Supporting operational states include ON_HOLD and INACTIVE.

## Domain model

Agency
 ├─ Users
 ├─ Jobs / Positions
 ├─ Candidates
 └─ Interview Criteria

Candidate
 ├─ Documents
 ├─ Interviews
 └─ Candidate Status History

Interview
 ├─ optional Job
 ├─ Interview Participants
 └─ Interview Evaluations

InterviewEvaluation
 └─ Interview Evaluation Scores
      └─ Interview Criterion

There is intentionally no JobApplication domain object.

## Phase 0 — Repository reset

Status: completed

- Remove legacy ERP complexity.
- Preserve the frontend visual theme and responsive shell.
- Reduce the backend to the Fastify + Prisma/MySQL foundation.
- Reduce the frontend to the React + Tailwind + Vite foundation.

## Phase 1 — Frontend foundation

Status: completed

- Role-aware application shell.
- Responsive navigation.
- Shared table, card, form, status, and state components.
- Simple role-aware domain state and fixtures.

## Phase 2 — Identity and agency foundation

Status: completed

- Login/session behavior for all four roles.
- Admin agency management.
- Agency user management.
- Agency-scoped authorization.
- Interviewer eligibility.
- Interviewee candidate account relationship.

## Phase 3 — Jobs / Positions

Status: completed

- Create/edit/publish/close positions.
- Store title, description, location, openings, and publish state.
- Admin can manage positions on behalf of an agency.
- Jobs remain independent from candidate lifecycle and are optional interview context.

## Phase 4 — Candidate pool and onboarding

Status: completed

- Candidate self-onboarding.
- Agency-created candidate onboarding.
- Bulk CSV onboarding.
- Persistent candidate profile.
- Candidate lifecycle status.
- Candidate status history.
- Candidate activity history.
- Candidate interview history and score summaries.
- Candidate documents.

## Phase 5 — Interview assignment

Status: completed

- Direct candidate-to-interview assignment.
- Optional job / position context.
- One or multiple interviewers.
- Schedule conflict checks.
- Reschedule and cancellation.
- No-show handling.
- Admin cross-agency interview operations.

## Phase 6 — Interview criteria and scoring

Status: completed

- Agency-configurable interview criteria.
- Criterion maximum points.
- Activate/deactivate criteria without deleting historical score meaning.
- One evaluation per panel interviewer.
- Per-criterion points.
- Total and percentage summaries.
- Complete interview after all panel evaluations.

## Phase 7 — Candidate decision and history

Status: completed

- Automatically move candidate to INTERVIEW_COMPLETED after all panel evaluations.
- Require a completed interview before final pass/reject/hire decisions.
- Record final status and reason.
- Preserve status history and candidate activity history.
- Keep interview score history attached to the candidate.

## Phase 8 — Admin and operational polish

Status: completed / verification pending

- Admin dashboard with cross-agency counts.
- Admin agency workspace selection on operational screens.
- Admin access to agency jobs, candidates, interviews, criteria, and users.
- Basic audit logging.
- Basic notifications.
- Professional application shell/top bar/sidebar.
- Responsive mobile navigation.

## Phase 9 — QA and release

Status: in progress

- Frontend type/build verification.
- Backend TypeScript build.
- Prisma schema validation.
- Fresh migration recreation.
- Authentication/role/agency isolation integration tests.
- Candidate onboarding/bulk import integration tests.
- Candidate interview assignment/reschedule/conflict tests.
- Criteria scoring/final status tests.
- Responsive browser QA.
- Production deployment, backup, monitoring, and rollback checks.

## Explicitly removed

- JobApplication entity.
- Candidate Apply workflow.
- Application status pipeline.
- Application-based interview scheduling.
- Rating-only evaluation.
- Recommendation-based automatic final decisions.
- Selection board / selection approvals.
- Allocation / reassignment.
- Manager/approver role.
- Recruiter role as a separate account type.
- Weighted suitability/scoring engine.
- Complex practical-test subsystem.
- Candidate comparison intelligence.
- Batch scheduling optimizer.
- Advanced notification center/escalation framework.
- Advanced document versioning/verification.
- Reporting/analytics suite.