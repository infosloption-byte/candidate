# BuildHire Rebuild Plan

## Goal

Rebuild the application around one simple recruitment workflow and remove the legacy ERP complexity.

## Target roles

| Role | Responsibility |
|---|---|
| Admin | System-wide administration and agency/user control |
| Agency | Publish jobs, onboard candidates, review applications, schedule interviews |
| Interviewer | Participate in interviews and submit evaluations |
| Interviewee | Maintain candidate profile and apply for jobs |

## Target workflow

```text
Agency creates job
      ↓
Job is published
      ↓
Candidate is onboarded
      ├─ self onboarding
      ├─ agency onboarding
      └─ bulk onboarding
      ↓
Candidate applies to a job
      ↓
Agency reviews application
      ↓
Interview is scheduled for that application
      ↓
One interviewer OR multiple interviewers are assigned
      ↓
Interview is conducted
      ↓
Interviewer(s) submit evaluation
      ↓
Application moves to the next decision state
```

## Domain model

```text
Agency
 ├─ Users
 ├─ Jobs
 └─ Candidates

Candidate
 └─ Job Applications

Job
 └─ Job Applications

JobApplication
 └─ Interviews

Interview
 ├─ Interview Participants
 └─ Interview Evaluations
```

## Phase 0 — Repository reset

Status: **completed**

- Remove all previous frontend business features and domain state.
- Keep the existing frontend theme, responsive shell, typography, spacing, icons, and mobile navigation.
- Remove legacy backend controllers, services, repositories, auth stack, feature routes, and test suites.
- Replace the old Prisma schema with the minimal target-domain schema.
- Remove legacy Prisma migrations and seed data.
- Reduce frontend and backend dependencies to the foundation required by the rebuild.
- Replace the old task tracker and blueprint with this rebuild plan.

## Phase 1 — Frontend foundation

- Rebuild the application shell on the preserved theme.
- Define role-aware navigation for Admin, Agency, Interviewer, and Interviewee.
- Create frontend domain types for agencies, jobs, candidates, applications, interviews, participants, and evaluations.
- Establish simple feature folders and state boundaries only where a module needs them.
- Keep business screens initially backed by local fixture data so UX is stable before API integration.
- Build responsive empty, loading, error, and success presentation primitives.

## Phase 2 — Identity and agency foundation

- Implement login and session behavior for the four roles.
- Create Admin agency management.
- Create Agency user management.
- Enforce agency ownership for agency-scoped records.
- Add Interviewer assignment eligibility.
- Add Interviewee account/profile relationship.
- Add basic password recovery/change flows only after core login is stable.

## Phase 3 — Jobs

- Create agency job form.
- Edit draft jobs.
- Publish jobs.
- Close jobs.
- Store title, description, location, openings, and publish state.
- Build agency job list and job detail screens.
- Build the published-job view needed for applications.

## Phase 4 — Candidate onboarding

- Build candidate self-onboarding.
- Build agency-created candidate onboarding.
- Add candidate profile editing.
- Add onboarding progress and submission.
- Add agency review of submitted onboarding.
- Add bulk onboarding via CSV first.
- Add validation and duplicate handling only at the level required to import safely.
- Add optional candidate documents after the core profile/application flow is stable, using a replaceable storage contract.

## Phase 5 — Applications

- Add JobApplication API and persistence.
- Allow an interviewee to apply to a published job.
- Allow an agency to review applications.
- Implement application states: APPLIED → SCREENING → SHORTLISTED → INTERVIEW → SELECTED / REJECTED.
- Support candidate withdrawal.
- Prevent duplicate applications to the same job.
- Keep the application as the source record for job-specific recruitment progress.

## Phase 6 — Interview scheduling

- Schedule an interview against a JobApplication.
- Add interview type, date/time, duration, and location.
- Add one interviewer.
- Add multiple interviewers as a panel.
- Detect basic interviewer conflicts.
- Allow reschedule and cancel.
- Show interview calendar/list views.
- Keep scheduling rules simple until real workflow usage identifies additional needs.

## Phase 7 — Interview evaluation

- Allow each assigned interviewer to submit an evaluation.
- Capture simple rating, recommendation, and comments.
- Support panel evaluations independently.
- Show evaluation summary on the application/interview.
- Move the application to the appropriate next state.
- Do not introduce weighted scorecards or configurable scoring engines initially.

## Phase 8 — Admin and operational polish

- Admin dashboard with essential counts only.
- Agency dashboard with jobs, applications, candidates, and upcoming interviews.
- Interviewer dashboard with assigned interviews.
- Interviewee dashboard with profile, applications, and upcoming interviews.
- Basic audit logging for important mutations.
- Basic notification hooks after the core workflow is stable.

## Phase 9 — QA and release

- Frontend type/build verification.
- Backend unit/integration tests for every core workflow.
- Prisma migration reproducibility from an empty database.
- Role and agency-scope authorization tests.
- Candidate self-onboarding test.
- Agency onboarding and bulk-import tests.
- Job publish/application tests.
- Interview panel scheduling tests.
- Interview evaluation tests.
- Responsive browser QA.
- Production environment, backup, monitoring, and deployment checklist.

## Explicitly removed from the new baseline

- Selection board and selection approvals.
- Cross-job allocation and reassignment.
- Weighted suitability/scoring engines.
- Complex interview scorecards and practical-test subsystems.
- Notification center and reminder/escalation workflows.
- Advanced document versioning/verification workflows.
- Reports/analytics workspace and reporting exports.
- Complex audit history UI.
- Large-batch scheduling optimizer.
- Specialty-aware scheduling and workload balancing engine.
- Candidate comparison/search intelligence subsystem.
- Manager/approver role.
- Recruiter role as a separate account type.
