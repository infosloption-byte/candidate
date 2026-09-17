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
- ⏳ Full interview history and decision audit timeline.

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
- ⏳ Advanced drag-and-drop rescheduling and conflict-resolution actions.

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
- ⏳ Add authentication, roles, and permissions.
- ⏳ Add server-side audit trail.
- ⏳ Add file/document storage abstraction.

## Phase 6 — Data migration and release

- ⏳ Build Excel import and validation workflow.
- ⏳ Map historical interview data to candidate/interview records.
- ⏳ Add duplicate/quality review before import.
- ⏳ End-to-end testing with real recruitment workflows.
- ⏳ Production deployment and backup/monitoring plan.

## Current UX definition

Primary daily candidate flow:

`Find candidate → Filter / search → Open profile → Review evidence → Compare or start screening / schedule interview → interview evaluation → Select / Reserve / Reject → preserve reason and timeline`

Interview workflow:

`Queue → Schedule one or Batch schedule → Select candidate group → Configure window / duration / breaks / location mode → Select interviewer pool → Build capacity-safe plan → Review planned + unscheduled candidates → Commit batch → Candidate statuses updated → Day/Week calendar`

Large interview campaign flow:

`Search / filter → Select all matching candidates → Work across pages without losing selection → Set multi-day capacity → Parallel interviewer allocation → Conflict / duplicate check → Preview → Schedule batch → Review calendar workload`

Selection workflow:

`Choose job requirement → Review recommended candidates → Multi-select / bulk action or open evidence → Select / Reserve / Reject / Reassign → Build shortlist → Submit for management approval → Approve / Return → review history`

Candidate creation flow:

`Essentials → Trade → Readiness → duplicate review if needed → Create → New state`

Candidate profile states:

`New → Screening → Interview → Selected / Reserve / Rejected`

Rejection is always accompanied by a structured reason and written decision note.

Candidate intelligence flow:

`Search → Smart filters / saved search → Review matches → Detect possible duplicates → Select up to 4 → Compare → Minimize or resize comparison`

Interview scheduling flow:

`Queue / Calendar → Batch schedule when volume is high → Select date window → Allocate interviewer capacity → Preview conflicts / overflow → Commit → Day/Week calendar`

Responsive rules:

- Desktop: persistent sidebar with collapse-to-rail, sticky top bar, independently scrolling main content.
- Tablet: compact sidebar behavior with flexible content widths.
- Mobile: slide-over navigation, single-column candidate/interview/selection flows, large tap targets, safe-area-aware action bars, height-limited comparison tray with minimize and quick resize controls, compact day-agenda interview calendar, and stacked selection evidence/decision panels.
- Large-batch scheduling: candidate results are paged so a 200–300 candidate selection does not render one giant DOM list; selection state survives page changes and search-filtered select-all.
- Bulk scheduling: configuration and candidate selection remain in one planner surface, while schedule generation happens before persistence so recruiters can adjust the window rather than cleaning up hundreds of conflicts afterward.

## Current bugfix note

The candidate profile previously crashed on `candidate.journey.map(...)` when an older `buildhire.candidates` localStorage payload from the previous MVP schema was loaded. The candidate repository now treats storage as untrusted input, normalizes legacy `timeline` data and missing arrays, and returns a complete `Candidate` shape before the data reaches the React view.

## Accessibility foundation

The async state primitives and focus-management utilities are now shared building blocks. Runtime accessibility QA remains marked for real keyboard and device validation rather than being inferred from source inspection alone.
