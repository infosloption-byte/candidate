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
- ✅ Admin cross-agency operations for candidate, job, interview, interview criteria, and user management.
- ✅ Admin agency workspace controls on operational screens.
- ✅ Admin agency record edit control.
- ✅ Agency isolation for agency users.
- ✅ Admin agency workspace selector in operational screens.

## Candidate pool

- ✅ Candidate creation places candidates directly in the candidate pool.
- ✅ Candidate self-onboarding creates a linked candidate in the pool.
- ✅ Bulk CSV onboarding creates candidates in the pool.
- ✅ Candidate Pool bulk-import UI with CSV template and agency selection.
- ✅ Candidate profile editing.
- ✅ Candidate identity/contact fields: country, passport number, passport expiry, contact and alternate contact numbers.
- ✅ Candidate birthdate persistence, profile editing, and CSV import/template support.
- ✅ Candidate recruitment-readiness fields: current location, availability, and visa/work status.
- ✅ Candidate CSV import/template supports expanded profile fields.
- ✅ Candidate filtering/search covers country, profession, current location, availability, visa/work status, passport expiry, passport number, and contact data.
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
- ✅ Interview details view with full panel and scorecard history.
- ✅ Create interview action with multi-candidate selection.
- ✅ Bulk candidate scheduling using consecutive interview slots.
- ✅ Edit interview can optionally schedule the same setup for additional selected candidates.
- ✅ Interviewer schedule buckets for past, current, and upcoming assigned interviews.
- ✅ Explicit interview IN_PROGRESS lifecycle with start time and completion time.
- ✅ Interview-level criteria group selection with a frozen scoring snapshot.

## Interview criteria and evaluation

- ✅ Agency-configurable interview criteria.
- ✅ Reusable criteria groups by job / trade category.
- ✅ Interview scheduling selects an active criteria group and copies its criteria into the interview scorecard.
- ✅ Interviewer start / continue workspace with score progress and live total / percentage.
- ✅ Interview panel candidate identity details with interviewer birthdate capture and automatic Age criteria fill.
- ✅ Draft scorecard autosave with notes and final submission lock.
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
