# Construction Candidate ERP — Task Tracker

Legend: ✅ completed · 🔄 in progress · ⏳ planned · 🧪 verify

## Phase 1 — Frontend foundation

- ✅ Create React 19 + TypeScript strict frontend MVP.
- ✅ Establish feature-based source structure.
- ✅ Introduce Context + `useReducer` candidate domain state.
- ✅ Create initial navigation, dashboard, candidates, interviews, jobs, selection, reports, and settings surfaces.
- ✅ Add candidate workflow and structured rejection capture.
- ✅ Move the application into a clear `frontend/` + `backend/` repository structure.
- ✅ Make shell navigation, content scrolling, and candidate workspace responsive across desktop/tablet/mobile.
- ✅ Refine candidate profile states and the multi-step add-candidate experience.
- ✅ Add candidate storage migration/normalization so legacy browser data cannot crash the current profile UI.
- ✅ Align candidate TypeScript contracts with migration/default states.
- ✅ Add BuildHire favicon and remove the browser favicon 404.
- ✅ Add reusable loading, error/retry, and empty state components for async candidate flows.
- ✅ Add retryable candidate hydration without a full page reload.
- ✅ Add shared focus trapping with Escape handling for mobile navigation, candidate drawer, and rejection dialog.
- ✅ Respect reduced-motion preferences and safe-area interactions.
- 🧪 Complete accessibility QA with keyboard navigation and real-device mobile interaction checks.

## Phase 2 — Candidate intelligence UX

- ✅ Advanced candidate search with keyword, status, profession, experience, English, availability, overseas, driving, document readiness, and multi-skill filters.
- ✅ Saved filters and reusable search presets with local persistence.
- ✅ Candidate skills, experience, country history, availability, and readiness views are available in smart filtering/comparison.
- ✅ Explainable duplicate detection based on passport, phone, name, profession, and age signals.
- ✅ Creation-time duplicate warning with high-confidence acknowledgement before save.
- ✅ Responsive candidate comparison workspace supporting up to four candidates.
- ✅ Candidate comparison minimize/restore controls.
- ✅ Candidate comparison height controls with drag resize and increase/decrease actions.
- ✅ Comparison height/minimized preferences persist locally.
- ✅ Recruiter tags and user-defined labels with quick suggestions.
- ✅ Candidate tags participate in keyword search.
- ✅ Job-fit evidence and configurable suitability score presentation.
- ✅ Full interview history and decision audit timeline.
- ✅ Candidate onboarding workspace with recruiter handoff, progress tracking, submitted/review/needs-changes/completed states, and onboarding activity in the candidate journey.
- ✅ Recruiter/system-admin frontend bulk candidate CSV intake with automatic header mapping, validation preview, duplicate protection, import template and atomic local commit.
- ✅ Recruiter dashboard workspace with live candidate/interview metrics, pipeline visibility, action center, today's interview view, onboarding/document readiness, selection capacity/approval signals, retry handling and responsive navigation actions.
- ✅ Recruitment reports workspace with date/trade filters, explicit candidate-vs-interview date scope, pipeline/source/onboarding/interview/rejection breakdowns, readiness metrics, profession performance table, retry handling and CSV export.
- ⏳ Candidate self-service onboarding portal for authenticated candidate access, profile editing, consent and document upload.
- ⏳ Invitation delivery, reminder/escalation workflows and candidate-facing authentication.

## Phase 3 — Interview workflow UX

- ✅ Interview queue with status, search, attention and completion filters.
- ✅ Interview scheduling drawer with candidate, type, date, time, duration, location and interviewer assignment.
- ✅ Day/week calendar view with responsive mobile agenda.
- ✅ Calendar date navigation, Today, day/week toggle and direct date jump.
- ✅ Interview conflict visualization for overlapping active interviewer assignments and rooms.
- ✅ Calendar interview detail sheet with keyboard focus management and Escape handling.
- ✅ Interviewer profiles and panel assignment for the MVP.
- ✅ Profession-aware evaluation scorecards with weighted criteria and 1–5 scoring.
- ✅ Mandatory failure/decision reasons and structured interviewer notes.
- ✅ Profession-aware practical test workflow with required and optional tasks.
- ✅ Interview result review and final decision workflow with Select / Reserve / Reject.
- ✅ Interview decisions synchronize back to the candidate profile with result, score, reason and note.
- ✅ Multi-candidate interview selection with search, select-all-filtered, paging and persistent cross-page selection.
- ✅ Bulk interview scheduling planner for large candidate groups across a configurable date window.
- ✅ Scheduler capacity model across multiple interviewers with specialty-aware assignment.
- ✅ Existing active interview detection prevents duplicate interview scheduling.
- ✅ Existing interviewer conflicts are surfaced through the generated plan instead of silently overwriting appointments.
- ✅ Parallel interviewer capacity supported when a location is not a shared resource.
- ✅ Shared-location resource mode prevents double-booking a single interview room/centre.
- ✅ Bulk schedule preview shows requested, capacity, planned and unscheduled candidates before commit.
- ✅ Large batches are created with one atomic interview reducer action, then candidate statuses are updated atomically.
- ✅ Responsive bulk planner uses paged candidate rendering and touch-safe controls for 200–300 candidate workflows.
- ✅ Interviewer load balancing accounts for existing workload and planned batch workload before choosing slots.
- ✅ Batch schedule editing allows date/time/interviewer changes with existing-calendar and intra-batch conflict validation.
- ✅ Batch workload panel exposes existing, planned, total and utilization metrics per interviewer.
- ✅ Rebalance and regenerate controls let recruiters iterate on a batch before committing it.
- ✅ Advanced drag-and-drop rescheduling and conflict-resolution actions with conflict-safe alternatives and undo.

## Phase 4 — Selection and decision UX

- ✅ Selection board using the candidate comparison/evidence model.
- ✅ Job-specific selection requirements with openings, profession, minimum experience and required skills.
- ✅ Recommended / Selected / Reserve / Rejected board views.
- ✅ Explainable selection evidence for experience, skills, documents, readiness and interview results.
- ✅ Capacity protection prevents selecting more candidates than the job openings allow.
- ✅ Selection decision form requires a reason and written decision note.
- ✅ Job-scoped management approval workflow: Draft → Pending → Approved / Returned.
- ✅ Any change to an approved shortlist automatically returns that job to Draft for re-review.
- ✅ Selection decisions persist locally behind a replaceable service boundary.
- ✅ Bulk shortlist actions with multi-candidate Select / Reserve / Reject decisions.
- ✅ Bulk reassignment to another job with target-job conflict protection.
- ✅ Bulk decisions and reassignment use atomic reducer actions and preserve decision reasons/notes.
- ✅ Selection history records decision changes, reassignment events, and approval changes.
- ✅ Selection history is persisted locally and displayed as an audit-ready timeline per job.
- ⏳ Advanced cross-job candidate allocation.

## Phase 5 — Backend and data

- ⏳ Create Node.js + TypeScript backend under `backend/`.
- ⏳ Define REST API contracts matching frontend domain types.
- ⏳ Add MySQL database and migration strategy.
- ⏳ Add authentication, roles, and permissions, including recruiter/system-admin authorization for candidate import and onboarding administration.
- ⏳ Add server-side audit trail.
- ⏳ Add file/document storage abstraction.

## Phase 6 — Data migration and release

- ⏳ Extend the frontend CSV importer to XLSX import and server-side validation/processing.
- ⏳ Map historical interview data to candidate/interview records.
- ⏳ Add server-side duplicate/quality review and import job controls before persistence.
- ⏳ End-to-end testing with real recruitment workflows.
- ⏳ Production deployment and backup/monitoring plan.

## Current UX definition

Primary daily candidate flow:

`Find candidate → Filter / search → Open profile → Review evidence → Compare or start screening / schedule interview → interview evaluation → Select / Reserve / Reject → preserve reason and timeline`

Interview workflow:

`Queue → Schedule one or Batch schedule → Select candidate group → Configure window / duration / breaks / location mode → Select interviewer pool → Balance interviewer workload → Build capacity-safe plan → Edit or rebalance planned slots → Review planned + unscheduled candidates → Commit batch → Candidate statuses updated → Day/Week calendar`

Large interview campaign flow:

`Search / filter → Select all matching candidates → Work across pages without losing selection → Set multi-day capacity → Balance existing + planned interviewer load → Conflict / duplicate check → Preview → Edit individual slots when needed → Schedule batch → Review calendar workload`

Selection workflow:

`Choose job requirement → Review recommended candidates → Multi-select / bulk action or open evidence → Select / Reserve / Reject / Reassign → Build shortlist → Submit for management approval → Approve / Return → review history`

Candidate creation flow:

`Essentials → Trade → Readiness → duplicate review if needed → Create → New state`

Candidate acquisition and onboarding flow:

`Manual add / CSV bulk import → duplicate + validation review → Candidate created in New / Onboarding not started → Send onboarding invitation → Candidate completes identity, trade, readiness and documents → Candidate submits → Recruiter reviews → Request changes or Verify → Screening → Interview → Selection`

Bulk import rules:

- Recruiter and system-administrator UI entry is available in the frontend MVP; backend role enforcement remains a backend milestone.
- CSV import is preview-first: validation errors block rows, high-confidence duplicates are skipped by default, possible duplicates are flagged for review.
- Imported candidates retain source=`Bulk import`, start in `New` recruitment status and `Not started` onboarding.
- The importer provides a downloadable template and preserves source row numbers for operational cleanup.

Candidate profile states:

`New → Screening → Interview → Selected / Reserve / Rejected`

Rejection is always accompanied by a structured reason and written decision note.

Candidate intelligence flow:

`Search → Smart filters / saved search → Review matches → Detect possible duplicates → Select up to 4 → Compare → Minimize or resize comparison`

Interview scheduling flow:

`Queue / Calendar → Batch schedule when volume is high → Select date window → Allocate and balance interviewer capacity → Preview conflicts / overflow → Edit / rebalance if needed → Commit → Day/Week calendar`

Responsive rules:

- Desktop: persistent sidebar with collapse-to-rail, sticky top bar, independently scrolling main content.
- Tablet: compact sidebar behavior with flexible content widths.
- Mobile: slide-over navigation, single-column candidate/interview/selection flows, large tap targets, safe-area-aware action bars, height-limited comparison tray with minimize and quick resize controls, compact day-agenda interview calendar, and stacked selection evidence/decision panels.
- Large-batch scheduling: candidate results are paged so a 200–300 candidate selection does not render one giant DOM list; selection state survives page changes and search-filtered select-all.
- Bulk scheduling: configuration and candidate selection remain in one planner surface, while schedule generation happens before persistence so recruiters can adjust the window rather than cleaning up hundreds of conflicts afterward.
- Batch editing: planned slots can be edited one candidate at a time inside the same planner, with date/time/interviewer validation against both existing appointments and other planned slots.

## Current bugfix note

The candidate profile previously crashed on `candidate.journey.map(...)` when an older `buildhire.candidates` localStorage payload from the previous MVP schema was loaded. The candidate repository now treats storage as untrusted input, normalizes legacy `timeline` data and missing arrays, and returns a complete `Candidate` shape before the data reaches the React view.

## Accessibility foundation

The async state primitives and focus-management utilities are now shared building blocks. Runtime accessibility QA remains marked for real keyboard and device validation rather than being inferred from source inspection alone.
