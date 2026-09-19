# BuildHire — Rebuild Task Tracker

Legend: ✅ completed · 🔄 implemented / awaiting verification · ⏳ planned

## Reset baseline

- ✅ Remove legacy frontend business logic, feature modules, providers, repositories, and tests.
- ✅ Preserve the existing BuildHire frontend theme and responsive shell.
- ✅ Remove legacy backend controllers, services, repositories, auth implementation, feature routes, and tests.
- ✅ Remove all old Prisma migrations and seed data.
- ✅ Replace the old Prisma schema with the minimal core-domain model.
- ✅ Reduce frontend dependencies to the React + Tailwind + Vite foundation.
- ✅ Reduce backend dependencies to the Fastify + Prisma/MySQL foundation.
- ✅ Replace legacy documentation with the new rebuild plan.
- ✅ Keep a minimal backend health endpoint as the development baseline.

## Phase 1 — Frontend foundation

- ✅ Build role-aware shell for Admin, Agency, Interviewer, and Interviewee.
- ✅ Create core frontend types and fixture data: Agency, User, Candidate, Job, JobApplication, Interview, InterviewParticipant, InterviewEvaluation.
- ✅ Create first-pass pages for Dashboard, Jobs, Candidates, Applications, Interviews, Agencies & Users, and Settings using the preserved theme.
- ✅ Build reusable table/list/detail/form primitives using the preserved theme.
- ✅ Add loading, empty, error, and success states.
- ✅ Add frontend smoke tests for the new shell and core navigation.
- ✅ Keep business data isolated in a simple domain/fixtures boundary for the frontend-first phase.

## Phase 2 — Authentication and agencies

- ✅ Implement login and session handling.
- ✅ Implement Admin agency CRUD.
- ✅ Implement Agency user management.
- ✅ Implement role-based access: Admin / Agency / Interviewer / Interviewee.
- ✅ Implement agency-scoped authorization.
- ✅ Implement Interviewer user onboarding.
- ✅ Implement Interviewee account registration and candidate account linkage.
- ✅ Add secure password handling and session expiry.
- 🔄 Backend authentication/integration test coverage added; green CI verification remains.
- ✅ Add reproducible development database seed for Admin, Agency, and Interviewer accounts.

## Phase 3 — Jobs

- ✅ Build Job API and persistence.
- ✅ Build agency job list API.
- ✅ Build create/edit job form.
- ✅ Implement publish / close.
- ✅ Build published job API view.
- ✅ Add job validation.
- ✅ Add job API validation tests.
- ✅ Restrict job mutations to Admin/Agency roles.
- ✅ Connect the frontend Jobs screen to authenticated Job API sessions.

## Phase 4 — Candidates and onboarding

- ✅ Build Candidate API and persistence.
- ✅ Build agency-created candidate onboarding API.
- ✅ Build candidate self-onboarding API and account linkage.
- ✅ Build onboarding progress/submission states at API level.
- ✅ Build frontend candidate list/form against Candidate API.
- ✅ Build agency review of submitted candidate profiles in the production UI.
- ✅ Build bulk candidate onboarding via CSV.
- ✅ Add row validation and duplicate protection for bulk import.
- 🔄 Candidate authorization, onboarding, and bulk-import integration coverage added; green CI verification remains.

## Phase 5 — Applications

- ✅ Build JobApplication API and persistence.
- ✅ Allow candidates to apply to published jobs.
- ✅ Prevent duplicate job applications.
- ✅ Build agency application queue API.
- ✅ Implement application status workflow.
- ✅ Connect application state contract to candidate/job records.
- ✅ Add application workflow validation tests.
- ✅ Connect frontend Applications screen to authenticated Application API.
- ✅ Connect published-job Apply action to Application API.

## Phase 6 — Interviews

- ✅ Build Interview API and persistence against JobApplication.
- ✅ Schedule single interview.
- ✅ Assign one interviewer.
- ✅ Assign multiple interviewers as a panel.
- ✅ Add basic schedule-conflict validation.
- ✅ Add reschedule and cancellation API.
- ✅ Build interview list/calendar UI against Interview API.
- ✅ Add interviewer My Interviews view against Interview API.
- ✅ Add agency reschedule control for scheduled interviews.
- 🔄 Interview scheduling, panel, conflict, and evaluation-access integration coverage added; green CI verification remains.

## Phase 7 — Evaluations

- ✅ Build InterviewEvaluation API and persistence.
- ✅ Allow each panel interviewer to submit one evaluation.
- ✅ Store rating, recommendation, and comments.
- ✅ Show evaluation summary API.
- ✅ Map completed panel recommendations to application status.
- ✅ Connect interviewer evaluation form to Evaluation API.
- 🔄 Evaluation authorization and final-decision workflow coverage added; green CI verification remains.

## Phase 8 — Operational polish

- ✅ Add simple live API-backed dashboards by role.
- ✅ Add minimal audit events for important workflow mutations.
- ✅ Add basic notifications for core workflow events, without restoring the legacy notification center.
- ✅ Add candidate/job/application/interview search where needed.
- ✅ Add optional candidate document upload with a small filesystem storage contract (PDF/JPEG/PNG, max 5 MB).

## Phase 9 — QA and release

- 🔄 Frontend production build — GitHub Actions currently fails before exposing runner steps; source-level verification still needs a functioning runner/local build.
- 🔄 Backend TypeScript build — same CI environment limitation.
- 🔄 Prisma schema validation — same CI environment limitation.
- 🔄 Prisma migration recreation — clean migration is committed and included in CI, but green execution is not yet verified.
- 🔄 Role authorization tests — coverage committed, CI execution not yet verifiable.
- 🔄 Agency isolation tests — coverage committed, CI execution not yet verifiable.
- 🔄 Self-onboarding end-to-end test — coverage committed, CI execution not yet verifiable.
- 🔄 Agency onboarding and bulk import tests — coverage committed, CI execution not yet verifiable.
- 🔄 Job publish/application end-to-end test — coverage committed, CI execution not yet verifiable.
- 🔄 Interview panel scheduling end-to-end test — coverage committed, CI execution not yet verifiable.
- 🔄 Interview evaluation end-to-end test — coverage committed, CI execution not yet verifiable.
- ⏳ Responsive browser QA.
- ✅ Deployment, backup, and monitoring checklist documented in `docs/RELEASE_CHECKLIST.md`.

### Current CI verification note

The latest GitHub Actions runs have been completing as failures within roughly three seconds with no job steps/logs exposed by the available GitHub tooling. That prevents a truthful claim that the builds/tests pass; code changes above are committed, but release verification remains open until the runner/environment produces real execution results.

## Not planned in the rebuild baseline

- Selection board / selection approvals.
- Allocation / reassignment system.
- Manager / approver role.
- Recruiter role as a separate user role.
- Weighted candidate suitability engine.
- Complex interview scorecards and practical-test engine.
- Advanced candidate comparison and smart-search intelligence.
- Batch scheduling optimizer and interviewer workload balancing engine.
- Notification center and escalation framework.
- Advanced document versioning and verification.
- Reporting/analytics suite.
