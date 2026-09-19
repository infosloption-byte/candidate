# BuildHire — Rebuild Task Tracker

Legend: ✅ completed · 🔄 in progress · ⏳ planned

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
- 🔄 Build reusable table/list/detail/form primitives using the preserved theme.
- ⏳ Add loading, empty, error, and success states.
- ⏳ Add frontend smoke tests for the new shell and core navigation.
- ✅ Keep business data isolated in a simple domain/fixtures boundary for the frontend-first phase.

## Phase 2 — Authentication and agencies

- ⏳ Implement login and session handling.
- ⏳ Implement Admin agency CRUD.
- ⏳ Implement Agency user management.
- ⏳ Implement role-based access: Admin / Agency / Interviewer / Interviewee.
- ⏳ Implement agency-scoped authorization.
- ⏳ Implement Interviewer user onboarding.
- ⏳ Implement Interviewee account linkage.
- ⏳ Add secure password handling and session expiry.
- ⏳ Add backend authentication tests.

## Phase 3 — Jobs

- ⏳ Build Job API and persistence.
- ⏳ Build agency job list.
- ⏳ Build create/edit job form.
- ⏳ Implement publish / close.
- ⏳ Build published job view.
- ⏳ Add job validation.
- ⏳ Add job API tests.

## Phase 4 — Candidates and onboarding

- ⏳ Build Candidate API and persistence.
- ⏳ Build agency-created candidate onboarding.
- ⏳ Build candidate self-onboarding.
- ⏳ Build onboarding progress/submission states.
- ⏳ Build agency review of submitted candidate profiles.
- ⏳ Build bulk candidate onboarding via CSV.
- ⏳ Add row validation and duplicate protection for bulk import.
- ⏳ Add candidate onboarding tests.

## Phase 5 — Applications

- ⏳ Build JobApplication API and persistence.
- ⏳ Allow candidates to apply to published jobs.
- ⏳ Prevent duplicate job applications.
- ⏳ Build agency application queue.
- ⏳ Implement application status workflow.
- ⏳ Connect application state to candidate/job detail views.
- ⏳ Add application workflow tests.

## Phase 6 — Interviews

- ⏳ Build Interview API and persistence against JobApplication.
- ⏳ Schedule single interview.
- ⏳ Assign one interviewer.
- ⏳ Assign multiple interviewers as a panel.
- ⏳ Add basic schedule-conflict validation.
- ⏳ Add reschedule and cancellation.
- ⏳ Build interview list/calendar.
- ⏳ Add interviewer My Interviews view.
- ⏳ Add interview scheduling tests.

## Phase 7 — Evaluations

- ⏳ Build InterviewEvaluation API and persistence.
- ⏳ Allow each panel interviewer to submit one evaluation.
- ⏳ Store rating, recommendation, and comments.
- ⏳ Show evaluation summary.
- ⏳ Map evaluation result to application status.
- ⏳ Add evaluation authorization tests.
- ⏳ Add evaluation workflow tests.

## Phase 8 — Operational polish

- ⏳ Add simple dashboards by role.
- ⏳ Add minimal audit events for important mutations.
- ⏳ Add basic notifications only for core workflow events.
- ⏳ Add candidate/job/application/interview search where actually needed.
- ⏳ Add document upload only after the core onboarding flow is stable.

## Phase 9 — QA and release

- ⏳ Frontend production build passes.
- ⏳ Backend TypeScript build passes.
- ⏳ Prisma schema validation passes.
- ⏳ Prisma migration can recreate an empty database.
- ⏳ Role authorization tests pass.
- ⏳ Agency isolation tests pass.
- ⏳ Self-onboarding end-to-end test passes.
- ⏳ Agency onboarding and bulk import tests pass.
- ⏳ Job publish/application end-to-end test passes.
- ⏳ Interview panel scheduling end-to-end test passes.
- ⏳ Interview evaluation end-to-end test passes.
- ⏳ Responsive browser QA passes.
- ⏳ Deployment, backup, and monitoring checklist complete.

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
