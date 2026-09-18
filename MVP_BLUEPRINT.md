# BuildHire — Frontend MVP Blueprint

## 1. Repository architecture

```text
candidate/
├── frontend/              # React 19 + TypeScript + Tailwind UI
│   └── src/
│       ├── app/           # Shell, app context, navigation
│       ├── features/      # Domain features
│       └── shared/        # Cross-feature UI primitives
├── backend/               # Reserved for Node/Fastify/MySQL milestone
├── docs/                  # UX diagrams
├── TASKS.md               # Living implementation tracker
└── README.md
```

The product is being built frontend-first. Local browser persistence is a prototype adapter behind candidate, interview, and selection service boundaries; it can later be replaced by native `fetch` API services without rewriting the screen workflow.

## 2. MVP navigation

```text
Dashboard
  ├─ Recruitment overview + daily actions
  ├─ Candidate pipeline snapshot
  ├─ Action center for onboarding, documents and interview decisions
  ├─ Today's interview desk and workload
  └─ Recent candidate intake
Candidates ★
  ├─ Search / smart filters
  ├─ Saved searches
  ├─ Responsive candidate directory
  ├─ Candidate profile workspace
  ├─ Recruiter tags
  ├─ Add candidate: Essentials → Trade → Readiness
  ├─ Creation-time duplicate review
  └─ Compare up to 4 candidates
  ├─ Candidate onboarding workspace
  └─ Bulk candidate import (CSV frontend MVP)
Interviews ★
  ├─ Interview queue
  ├─ Queue / Calendar view switch
  ├─ Day / Week calendar
  ├─ Search / status filters
  ├─ Schedule one interview
  ├─ Batch interview planner
  ├─ Large candidate multi-select / select-all-filtered
  ├─ Multi-day interviewer capacity planning
  ├─ Interviewer workload balancing
  ├─ Batch slot editing / reallocation
  ├─ Shared-room / parallel-workstation resource mode
  ├─ Interviewer assignment / panel
  ├─ Interview workspace
  ├─ Profession-aware scorecard
  ├─ Practical test
  ├─ Final decision
  └─ Interview history / decision audit timeline
Jobs ★
  ├─ Job requirement workspace
  ├─ Vacancy / openings tracking
  ├─ Required + preferred skills
  ├─ Status / deadline management
  └─ Selection / allocation handoffs
Selection ★
  ├─ Job-specific openings / requirements
  ├─ Recommended / Selected / Reserve / Rejected
  ├─ Candidate evidence workspace
  ├─ Configurable job suitability score
  ├─ Bulk shortlist decisions
  ├─ Bulk reassignment to another job
  ├─ Selection decision
  ├─ Management approval
  └─ Selection history / audit timeline
Allocation ★
  ├─ Cross-job candidate matching
  ├─ Target-job requirement review
  ├─ Capacity-safe candidate selection
  └─ Allocation history
Reports ★
  ├─ Date-range and trade filters
  ├─ Recruitment pipeline and candidate source
  ├─ Onboarding lifecycle
  ├─ Interview outcomes and rejection reasons
  ├─ Trade/profession performance
  └─ CSV export
Documents ★
  ├─ Candidate file upload / replacement
  ├─ Verification / needs-review workflow
  └─ Readiness synchronization
Notifications ★
  ├─ Unread activity center
  ├─ Mark read / mark all read
  └─ Notification cleanup
Settings
  ├─ Professions & skills
  ├─ Interview scorecards
  ├─ Interviewers
  └─ Users & permissions
```

## 3. Candidate profile states

```text
New
  ↓ Start screening
Screening
  ↓ Schedule interview
Interview
  ├── Select
  ├── Reserve
  └── Reject → mandatory reason + decision note
```

The profile changes its guidance and primary actions by state. Previous interview evidence, documents, fit information, duplicate signals, recruiter tags, and the candidate journey remain visible on the same workspace.

## 4. Candidate acquisition & onboarding UX

Candidate acquisition is intentionally split into two layers:

`Manual Add / Bulk Import → Candidate Record → Candidate Onboarding → Recruiter Review → Screening → Interview → Selection`

### Manual candidate intake

The recruiter can create one candidate using the existing progressive `Essentials → Trade → Readiness` form. Every manually created candidate starts in recruitment status `New` and onboarding status `Not started`.

### Bulk candidate intake

Recruiters and system administrators have a `Bulk import` action from the Candidates workspace. The frontend MVP accepts CSV files and provides:

- Downloadable import template.
- Automatic mapping for common candidate headers.
- Required-field validation for name, phone, profession and experience years.
- Row-level validation messages with original CSV row numbers.
- Duplicate matching against the existing candidate pool using the same candidate-matching service used by manual creation.
- High-confidence duplicate protection: skipped by default and explicitly overridable in the preview.
- Possible-duplicate warnings that remain importable for recruiter review.
- Atomic reducer commit of all approved rows.
- Imported records use source `Bulk import`, recruitment status `New`, and onboarding status `Not started`.

The frontend does not claim to provide server authorization or real file persistence. Backend authentication and role enforcement must restrict this capability to the configured recruiter and system-administrator roles.

### Candidate onboarding lifecycle

Each candidate has a separate onboarding lifecycle from recruitment status:

`Not started → Invited → In progress → Submitted → Needs changes ↔ Submitted → Completed`

The onboarding workspace shows the candidate's completion percentage, current stage, recruiter review note, document state and recent onboarding activity.

The candidate-facing onboarding form will collect and verify:

- Identity and contact information.
- Trade, experience and secondary skills.
- Readiness, availability, destination and licence information.
- Passport, CV and trade certificate documents.
- Consent/declarations and final review before submission.

The current frontend milestone provides the recruiter-side handoff and review-state workflow. Authenticated candidate form entry, invitation delivery, file uploads and server-side verification remain backend-dependent.

### Recruiter onboarding actions

From the onboarding workspace, recruiters can:

- Send/mark an onboarding invitation.
- Mark onboarding as started.
- Review a submitted profile.
- Request changes with a written note.
- Mark a corrected submission as verified/completed.
- Open the bulk import workflow without leaving the onboarding context.

Onboarding transitions are recorded in the candidate journey so recruiters can see acquisition, onboarding and later recruitment actions in one timeline.

## 5. Candidate creation UX

The form is intentionally progressive instead of a single long ERP form.

### Step 1 — Essentials

- Full name (required)
- Phone (required)
- Passport number
- Age
- Current location
- Inline duplicate signals appear as identifying fields are entered.

### Step 2 — Trade

- Primary profession (required)
- Original profession
- Experience years (required)
- Secondary skills
- Countries worked in

### Step 3 — Readiness

- English level
- Availability
- Driving licence
- Location readiness
- Candidate source

Creating a candidate starts them in `New` state and sends them directly into the candidate workspace. High-confidence duplicate matches require explicit recruiter acknowledgement before creation.

## 6. Candidate intelligence UX

### Smart search

The directory combines one fast keyword search with optional structured criteria:

- Status and profession.
- Minimum/maximum experience.
- English level and availability.
- Overseas experience.
- Driving licence.
- Document readiness.
- Multi-skill matching where every selected skill must be present.
- Recruiter-defined tags are searchable through the same keyword field.

The advanced panel stays closed by default so routine recruiters are not presented with a wall of filters. Active filters are counted and clearable in one action. On small screens the panel scrolls independently so it does not push the candidate list off-screen.

### Saved searches

Recruiters can save the current combined keyword/filter state with a short name and reuse it later. Applying a saved search restores the exact top-level and smart filter criteria. Saved search preferences are persisted locally in a dedicated workspace-preferences adapter.

### Duplicate detection

Duplicate detection is explainable rather than opaque. The current frontend checks:

- Passport number exact match.
- Phone number exact match after normalization.
- Full-name match.
- Same profession and near-identical age as supporting signals.

A high-confidence match is shown separately from a possible match, and the recruiter can open the matched profile without losing the current workspace. High-confidence matches during candidate creation require acknowledgement before saving. Final uniqueness policy and server-side enforcement remain backend responsibilities.

### Recruiter tags

Recruiters can add lightweight, user-defined labels such as `High potential`, `Re-contact`, `Urgent documents`, or any custom tag. Tags are editable directly from the candidate profile and participate in keyword search and comparison.

### Comparison

Recruiters can select up to four candidates directly from the directory. A responsive comparison tray shows:

- Job-fit score.
- Profession.
- Experience.
- Key skills.
- Recruiter tags.
- Overseas experience.
- English.
- Availability.
- Driving licence.
- Document readiness.
- Last interview result.

The tray supports:

- Minimize / restore without clearing selected candidates.
- Drag-to-resize on pointer-capable screens.
- Quick decrease/increase height controls for touch devices.
- Persisted comparison height and minimized preference.
- Internal scrolling for dense comparison data.

The tray is height-limited on small screens so it never blocks the entire workspace.

## 7. Interview workflow UX

### Queue

The Interview Desk is a split workspace using the same list/detail interaction pattern as Candidates. Recruiters can search by candidate, trade, location or interviewer and filter by All, Today, Needs attention, or Completed.

A `Batch schedule` action is available from the main Interview header and Queue so high-volume campaigns can start without changing workspace context.

### Calendar

The Interview Desk has a dedicated full-width Calendar view alongside the queue. It supports:

- Day view for focused scheduling.
- Week view for workload planning across seven days.
- Today shortcut and previous/next navigation.
- Direct date jump.
- Responsive mobile day agenda when the screen is narrow.
- Appointment cards that open the existing interview workspace in a detail sheet.
- Conflict visualization when active interviews overlap on the same interviewer or room.
- Conflict indicators with the affected candidate shown as the reason.

The current calendar remains the operational schedule view. Scheduled appointments can be moved by drag-and-drop, with validation, conflict-safe alternatives, explicit reschedule history, and undo. Server-side transactional enforcement remains a backend responsibility.

### Single scheduling

Single scheduling continues to use the focused drawer:

`Candidate → Interview type → Date / time / duration / location → Interviewer availability → Interviewer(s) → Schedule`

### Batch scheduling for large campaigns

High-volume interviewing uses a dedicated planner instead of opening one scheduling drawer per candidate.

The batch planner supports:

- Multi-candidate selection with search.
- `Select all` across the complete filtered result set.
- Cross-page selection without losing previously selected candidates.
- Paginated candidate rendering so 200–300 candidates do not produce one huge DOM list.
- Date range spanning multiple days.
- Working-day/weekend control.
- Day start and end time.
- Interview duration.
- Break between interviews.
- Active interviewer pool selection.
- Specialty-aware interviewer assignment where matching specialties exist.
- Load balancing that considers existing active interviews plus newly planned interviews before assigning a slot.
- Existing active-interview detection so the same candidate is not scheduled twice.
- Existing interviewer conflict detection.
- Optional shared-location conflict detection.
- Parallel interviewer capacity when the location represents multiple independent workstations.
- A preview showing requested candidates, calculated capacity, planned interviews, and candidates that still need another scheduling window.

The planner does not immediately mutate the schedule. Recruiters first build a plan, inspect interviewer workload, edit individual slots when needed, rebalance or regenerate, and then commit the batch in one reducer transition.

### Capacity model

The initial frontend capacity calculation is:

`eligible working days × active interviewers × usable slots per interviewer`

Usable slots are derived from the working window, interview duration, and between-interview break. Existing appointments are excluded during planning. Specialty matching is used during assignment, so the displayed `Planned` count is the authoritative result for the selected candidate group.

### Interviewer load balancing

Each selected interviewer gets a workload summary containing:

- Existing active interviews in the selected planning window.
- Planned interviews from the new batch.
- Combined workload.
- Approximate utilization against that interviewer's available window capacity.

The planner assigns candidates to the lightest eligible interviewer first and uses earlier dates/times as tie breakers. Candidates with fewer specialty-compatible interviewers are considered earlier so constrained trades do not lose their only matching capacity.

### Batch schedule editing

After a plan is generated, recruiters can edit an individual planned interview without rebuilding the entire candidate selection. The edit surface supports:

- Date.
- Start time.
- Interviewer.

Every edit is validated against:

- The selected date window.
- Working hours and weekends.
- Active interviewer pool.
- Candidate/interviewer specialty compatibility.
- Existing active interviews.
- Other planned interviews in the same batch.
- Shared-room constraints when enabled.

Invalid edits remain unsaved and show the concrete conflict reason. Valid edits immediately refresh the workload summary. `Rebalance workload` or `Regenerate` can still rebuild the whole plan when the recruiter wants a different distribution.

### Interview history and decision audit

The interview workspace now exposes the selected candidate's interview history in one timeline. It combines every recorded interview appointment with schedule changes and decision changes, while each reschedule preserves the before/after date, time, interviewer panel, reason, timestamp, and undo state. Decision changes preserve the previous decision, new decision, reason, note, and timestamp. This frontend audit is persisted with the interview record and remains a replaceable adapter boundary until the backend provides immutable server-side audit storage.

### Batch commit

Batch creation uses one interview-domain reducer action. Candidate status changes to `Interview` are also applied with one candidate-domain bulk action rather than hundreds of separate dispatches. This is the frontend prototype boundary; persistence becomes server-transactional in the backend milestone.

## 8. Selection and decision UX

### Job requirement

The Selection Board is job-specific. A requirement exposes:

- Project and location.
- Client.
- Profession.
- Open positions.
- Minimum experience.
- Required skills.

### Candidate board

Candidates with relevant interview evidence are shown under:

`Recommended → Selected → Reserve → Rejected`

The board uses the same candidate evidence model already established. Each candidate shows interview score, experience fit, required-skill coverage, documents, readiness, tags, and interview observations.

### Configurable job-fit suitability

Each job has an explainable suitability model using configurable weights for:

`Experience + Required skills + Interview evidence + Documents + Readiness + Communication`

Weights are normalized to 100% and persisted per job in the frontend adapter. The active candidate evidence panel shows each factor's observed value, weight, and contribution so the final suitability score is inspectable rather than opaque.

### Bulk shortlist

Recruiters can multi-select visible candidates from any selection tab and apply a shared decision with one reason and written note:

`Select / Reserve / Reject`

Bulk Select uses the same opening-capacity protection as individual selection. Each candidate receives a selection record and an audit-history event through a single reducer transition. When a bulk mutation changes an approved shortlist, that job returns to Draft.

### Bulk reassignment

Selected candidates can be moved from the current job to another job in one operation. The target job must be different and cannot already contain the candidate. A reassigned candidate is reintroduced to the target as `Recommended` so the target-specific evidence can be reviewed again. The source job records a reassignment history event and any approved source shortlist is returned to Draft.

### Selection decision

The recruiter records one of:

`Keep recommended / Select / Reserve / Reject`

Every decision requires a reason and written note. The system prevents selecting above the job's open-position capacity. Existing selected candidates may remain selected when the job is full.

### Management approval

Each job has its own approval state:

`Draft → Pending approval → Approved / Returned`

Changing any decision after approval automatically returns that job to Draft so management cannot accidentally approve an outdated shortlist.

### Selection history

Selection history is append-only in the frontend persistence adapter. The timeline records:

- Candidate decision changes.
- Bulk decision changes.
- Job reassignment.
- Approval-state changes.

The active job view shows recent history with candidate, action, reason, note, actor, timestamp, and reassignment target where applicable. Server-side immutable audit storage remains a backend responsibility.

Selection data is currently persisted locally behind a replaceable service boundary. Final job-specific allocation, permissions, approval identity, and server-side enforcement belong to the backend milestone.

## 9. Responsive shell

### Desktop

- Persistent left sidebar.
- Sidebar collapses from full navigation to an icon rail and remembers the preference.
- Sticky top bar.
- Independent main-content scrolling.
- Candidate and interview queues use split workspaces.
- Selection uses a split evidence/decision workspace.
- Comparison and scheduling drawers remain available without leaving the workspace.
- Interview calendar uses the full main content width for week planning.
- Batch planner uses a wide two-column candidate/configuration layout with dense workload and plan-review sections.

### Tablet

- Same workspace principles with fluid widths.
- Dense controls wrap rather than overflow.
- Candidate, interview, and selection profile content uses responsive grids.
- Smart filters and interview/selection controls remain usable with touch input.
- Batch planner keeps candidate selection and scheduling controls separated where width allows and stacks them when necessary.

### Mobile

- Sidebar becomes a slide-over navigation panel.
- Mobile navigation always opens expanded.
- Candidate, interview, and selection queues become single-panel flows.
- Selecting an item opens its detail workspace with a back action where appropriate.
- Fixed action bars respect device safe areas.
- Tap targets and controls use touch-friendly spacing.
- Candidate comparison becomes a scrollable, height-limited bottom tray with minimize and quick resize controls.
- Advanced filters use independent scrolling.
- Schedule drawer and evaluation workspace use full-width mobile layouts.
- Interview calendar becomes a compact day agenda instead of a dense seven-column grid.
- Batch planner stacks candidate selection above scheduling controls, preserves cross-page selection, exposes workload balancing, and keeps commit controls in a safe-area-aware footer.
- Selection bulk actions wrap into stacked touch controls, and evidence, decision, approval, and history panels stack vertically.

## 10. Smart SaaS UX

- `/` focuses global search; `Ctrl+K` focuses candidate search.
- Search covers names, reference IDs, professions, locations, phone/passport values, skills, countries, and tags.
- The dashboard prioritizes operational exceptions instead of static vanity metrics.
- Reports reuse candidate and interview domain data through derived services and support filtered CSV export without a third-party charting dependency.
- Loading uses skeleton content.
- Loading failure shows a retry action without requiring a full page reload.
- Empty filtered results explain what to do next and offer filter reset.
- Rejection requires an explainable reason and note.
- Candidate status changes append to the visible journey.
- Saved searches restore complete filter state.
- Duplicate warnings explain the matched fields before creation.
- Interview scorecard progress is visible before final decision.
- Required practical tasks block incomplete final decisions.
- Interview decisions synchronize back to candidate state.
- Calendar conflicts are explained rather than shown as opaque warning colors.
- Batch scheduling detects already-scheduled candidates before allocating slots.
- Batch scheduling balances existing + planned interviewer load and exposes the distribution before commit.
- Batch schedule edits are reversible until commit and validate against current appointments and the rest of the generated plan.
- Batch scheduling previews overflow before persistence so recruiters can extend the window or add capacity without manual cleanup.
- Bulk status updates use atomic reducer transitions so large batches do not generate hundreds of state mutations.
- Selection decisions require capacity-safe, explainable reasons and notes.
- Bulk selection mutations use the same capacity and approval-reset rules as individual decisions.
- Reassignment prevents target-job record collisions and records an explicit audit event.
- Selection history is visible without leaving the active job workflow.
- Suitability scoring remains explainable and per-job configurable.
- Approval is scoped to the selected job and invalidated when that shortlist changes.
- Thin modern scrollbars are used for long panels.
- Reduced-motion preferences are respected.

## 11. State architecture

- App shell state: `AppProvider` + `useReducer`.
- Candidate domain state: `CandidateProvider` + `useReducer`.
- Interview domain state: `InterviewProvider` + `useReducer`.
- Selection domain state: `SelectionProvider` + `useReducer`.
- Candidate filtering, saved searches, duplicate review, tags, comparison, and bulk status actions: `useCandidateWorkspace` + reducer actions.
- Candidate onboarding state transitions: `useCandidateOnboarding` + candidate reducer actions.
- Candidate bulk intake parsing, validation, header mapping, duplicate preview and CSV/XLSX conversion: `candidateImport` pure service + `useCandidateBulkImport`.
- Candidate onboarding and import workspace presentation: `CandidateOnboardingPage` + `CandidateBulkImportDrawer`.
- Candidate self-service portal: `CandidatePortalPage` + `CandidatePortalLogin` + `useCandidatePortal`.
- Candidate documents: `useDocumentsWorkspace` + `DocumentsPage` backed by a local document adapter.
- Jobs: `useJobsWorkspace` + `JobsPage`, sharing job state with Selection through the selection domain.
- Cross-job allocation: `useAllocationWorkspace` + `AllocationPage` with an atomic selection-domain allocation action.
- Notifications: `NotificationProvider` + `useNotifications` + `NotificationsPage`.
- Authentication: `AuthProvider` + `useAuth` with recruiter/candidate session boundaries for the frontend preview.
- Settings: `useSettingsWorkspace` + `SettingsPage` with local reference-data and user controls.
- Candidate creation: `useCandidateForm`.
- Rejection validation: `useRejectionForm`.
- Interview queue and workflow actions: `useInterviewWorkspace`.
- Interview calendar navigation and derived scheduling state: `useInterviewCalendar` + reducer actions.
- Interview scheduling: `useInterviewForm`.
- Large-batch interview planning, load balancing, and slot editing: `useInterviewBulkScheduler`.
- Bulk scheduling algorithm, conflict validation, workload calculation, and slot allocation: `interviewBatchScheduler` pure service.
- Interview scorecard evaluation: `useInterviewScorecard`.
- Interview decision validation: `useInterviewDecisionForm`.
- Interview history/audit timeline: `interviewHistory` pure service + `InterviewHistoryTimeline` presentational component.
- Selection board intelligence and suitability: `useSelectionWorkspace` + `useSelectionSuitability`.
- Selection bulk selection/action state: `useSelectionBulkActions`.
- Selection decision validation: `useSelectionDecisionForm`.
- Selection approval form state: `useSelectionApprovalForm`.
- Candidate persistence: `candidateRepository` service boundary.
- Interview persistence: `interviewRepository` service boundary.
- Selection persistence: `selectionRepository` service boundary, including selection history and per-job scoring weights.
- Duplicate matching: pure `candidateMatching` service.
- Calendar conflict detection: pure `interviewCalendar` service.
- Interview scheduling timezone cues: `interviewTimezone` service.
- UI components remain presentational; business rules and mutations stay in hooks/provider/service layers.

## 12. Dashboard & reports analytics

The dashboard and reports surfaces are now implemented as frontend workspaces over the existing candidate and interview domain state. The dashboard is optimized for daily recruiter action, while Reports supports operational analysis by date range and profession plus CSV export. Both remain local-data adapters until backend API contracts replace the browser persistence layer.

## 13. Candidate portal and operations support UX

The frontend now includes a standalone candidate portal preview with candidate authentication state, multi-step onboarding, profile editing, consent and document upload. Recruiter operations also include Jobs, Documents, Notifications and Allocation workspaces. These features use browser persistence and explicit service boundaries; secure identity, delivery, server-side file storage and authorization remain backend responsibilities.

## 14. Next frontend milestones

1. Complete runtime accessibility QA on keyboard navigation and real mobile devices.
2. Connect the finished frontend workspaces to backend identity/API contracts.
3. Move candidate documents and CSV/XLSX import processing to server-side persistence.
4. Add production notification delivery and secure invitation/reminder workflows.
5. Add backend Node/Fastify + MySQL implementation against the stabilized frontend contracts.


### Authentication and operational recruitment controls

The frontend MVP now includes an explicit authentication/session experience and role-aware UI permission model for System Admin, Recruiter, Interviewer, Manager / Approver and Candidate. Login, password recovery/reset/change-password, logout and session-expiry states are represented in the frontend; secure identity, token/session handling and server-side authorization remain backend responsibilities.

Candidate operations now include a recruiter-facing invitation center with pending/opened/started/reminder/expired/cancelled states and candidate journey activity, plus an operational candidate profile covering deployment and overseas-recruitment fields. Document control includes preview/download, expiry monitoring, version history, uploader/verifier metadata, review notes and bulk follow-up. These are frontend service-boundary implementations until backend storage, delivery and immutable audit services are connected.
