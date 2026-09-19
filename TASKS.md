# BuildHire — Rebuild Task Tracker

Legend: ✅ completed · 🔄 implemented / awaiting verification · ⏳ planned

## Product foundation

- ✅ Reset legacy recruitment modules to the four-role BuildHire foundation.
- ✅ Preserve the existing BuildHire visual theme and responsive shell.
- ✅ Implement Admin / Agency / Interviewer / Interviewee role boundaries.
- ✅ Implement session authentication, password hashing, session expiry, and inactive-agency protection.

## Agency and Admin operations

- ✅ Admin agency CRUD and activation/deactivation.
- ✅ Agency user management for Agency and Interviewer accounts.
- ✅ Admin cross-agency operations for candidate, job, interview, and criteria management.
- ✅ Agency isolation for agency users.
- ✅ Admin agency workspace selector in operational screens.

## Candidate pool

- ✅ Candidate creation places candidates directly in the candidate pool.
- ✅ Candidate self-onboarding creates a linked candidate in the pool.
- ✅ Bulk CSV onboarding creates candidates in the pool.
- ✅ Candidate profile editing.
- ✅ Candidate onboarding state tracking.
- ✅ Candidate lifecycle status.
- ✅ Candidate status-change history.
- ✅ Candidate activity/audit history.
- ✅ Candidate interview history with score summaries.
- ✅ Candidate document upload and agency-isolated access.

## Jobs / positions

- ✅ Job create/edit/publish/close.
- ✅ Jobs remain independent of candidate lifecycle.
- ✅ Jobs can be attached as optional context to interviews.
- ✅ Admin can manage jobs on behalf of an agency.

## Interviews

- ✅ Interview is linked directly to Candidate.
- ✅ Optional Job/position context on Interview.
- ✅ Single interviewer assignment.
- ✅ Multi-interviewer panel assignment.
- ✅ Schedule conflict validation for candidate and interviewers.
- ✅ Reschedule and cancellation.
- ✅ No-show handling.
- ✅ Interviewer “My Interviews” experience.
- ✅ Admin and Agency interview assignment.
- ✅ Admin can schedule interviews on behalf of any active agency.

## Interview criteria and evaluation

- ✅ Agency-configurable interview criteria.
- ✅ Criterion maximum points.
- ✅ Activate/deactivate criteria without deleting history.
- ✅ One evaluation per panel interviewer per interview.
- ✅ Per-criterion scoring.
- ✅ Total and percentage score summary.
- ✅ All-panel-evaluated → interview completed transition.
- ✅ Completed interview → candidate INTERVIEW_COMPLETED transition.
- ✅ Final candidate status recorded after a completed interview.
- ✅ Final status reason stored in candidate history.

## Removed from the product

- ✅ JobApplication entity and application module removed from active code.
- ✅ Candidate “Apply” workflow removed.
- ✅ Application status pipeline removed.
- ✅ Recommendation-based final decision logic removed.
- ✅ Rating-only evaluation removed in favor of criterion scoring.

## QA and release

- ✅ Pre-release route, authorization, validation, workflow, document, and responsive source audit completed.
- 🔄 Frontend production build — local verification pending.
- 🔄 Backend TypeScript build — local verification pending.
- 🔄 Prisma schema validation — local verification pending.
- 🔄 Fresh Prisma migration recreation — local verification pending.
- 🔄 Authentication/role/agency isolation integration tests — local verification pending.
- 🔄 Candidate onboarding/bulk-import integration tests — local verification pending.
- 🔄 Candidate interview assignment/reschedule/conflict integration tests — local verification pending.
- 🔄 Criteria scoring/final status integration tests — local verification pending.
- ⏳ Responsive browser QA.
- ✅ Deployment, backup, and monitoring checklist documented.

## Not planned

- Selection board / selection approvals.
- Allocation / reassignment system.
- Manager / approver role.
- Recruiter role as a separate user role.
- Weighted candidate suitability engine.
- Complex practical-test engine.
- Candidate comparison intelligence.
- Batch scheduling optimizer.
- Notification center/escalation framework.
- Advanced document versioning and verification.
- Reporting/analytics suite.
