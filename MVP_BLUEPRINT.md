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
  └─ Recruitment overview + daily actions
Candidates ★
  ├─ Search / smart filters
  ├─ Saved searches
  ├─ Responsive candidate directory
  ├─ Candidate profile workspace
  ├─ Recruiter tags
  ├─ Add candidate: Essentials → Trade → Readiness
  ├─ Creation-time duplicate review
  └─ Compare up to 4 candidates
Interviews ★
  ├─ Interview queue
  ├─ Queue / Calendar view switch
  ├─ Day / Week calendar
  ├─ Search / status filters
  ├─ Schedule interview
  ├─ Interviewer assignment / panel
  ├─ Interview workspace
  ├─ Profession-aware scorecard
  ├─ Practical test
  └─ Final decision
Jobs
  └─ Manpower demand / requirement cards
Selection ★
  ├─ Job-specific openings / requirements
  ├─ Recommended / Selected / Reserve / Rejected
  ├─ Candidate evidence workspace
  ├─ Bulk shortlist decisions
  ├─ Bulk reassignment to another job
  ├─ Selection decision
  ├─ Management approval
  └─ Selection history / audit timeline
Reports
  └─ Pipeline + rejection reason insights
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

## 4. Candidate creation UX

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

## 5. Candidate intelligence UX

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

## 6. Interview workflow UX

### Queue

The Interview Desk is a split workspace using the same list/detail interaction pattern as Candidates. Recruiters can search by candidate, trade, location or interviewer and filter by All, Today, Needs attention, or Completed.

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

The current calendar is a scheduling UX prototype. Drag-and-drop rescheduling and server-side conflict enforcement remain later milestones.

### Scheduling

Scheduling uses a focused drawer:

`Candidate → Interview type → Date / time / duration / location → Interviewer(s) → Schedule`

The interviewer list displays role and specialties so HR can assign the appropriate panel without opening another screen.

### Interview lifecycle

```text
Scheduled
   ↓ Start interview
In progress
   ↓ Open evaluation
Evaluation
   ↓ complete evidence
Final decision
   ├── Selected
   ├── Reserve
   └── Rejected → reason + note
   ↓
Completed
```

No-show and cancelled are explicit appointment outcomes.

### Profession-aware scorecard

The schedule form prepares a scorecard from the profession. Criteria use 1–5 ratings and configurable weights, with automatic weighted-score calculation. The interviewer can add an observation note to every criterion.

The scorecard is editable only while the appointment is `In progress` or `Evaluation`.

### Practical test

Practical tasks are generated from the trade and interview type. Screening and Client interviews can omit practical testing. Required tasks must be recorded as Pass, Fail or Pending before final decision; optional tasks can be left unassessed.

### Final decision

Final decision is available only after the scorecard is complete and every required practical task has a recorded result. Rejections require both a reason and written decision note. The final result is synchronized back to the candidate profile with the interview date, interviewer, score and decision evidence.

## 7. Selection and decision UX

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

## 8. Responsive shell

### Desktop

- Persistent left sidebar.
- Sidebar collapses from full navigation to an icon rail and remembers the preference.
- Sticky top bar.
- Independent main-content scrolling.
- Candidate and interview queues use split workspaces.
- Selection uses a split evidence/decision workspace.
- Comparison and scheduling drawers remain available without leaving the workspace.
- Interview calendar uses the full main content width for week planning.

### Tablet

- Same workspace principles with fluid widths.
- Dense controls wrap rather than overflow.
- Candidate, interview, and selection profile content uses responsive grids.
- Smart filters and interview/selection controls remain usable with touch input.

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
- Selection bulk actions wrap into stacked touch controls, and evidence, decision, approval, and history panels stack vertically.

## 9. Smart SaaS UX

- `/` focuses global search; `Ctrl+K` focuses candidate search.
- Search covers names, reference IDs, professions, locations, phone/passport values, skills, countries, and tags.
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
- Selection decisions require capacity-safe, explainable reasons and notes.
- Bulk selection mutations use the same capacity and approval-reset rules as individual decisions.
- Reassignment prevents target-job record collisions and records an explicit audit event.
- Selection history is visible without leaving the active job workflow.
- Approval is scoped to the selected job and invalidated when that shortlist changes.
- Thin modern scrollbars are used for long panels.
- Reduced-motion preferences are respected.

## 10. State architecture

- App shell state: `AppProvider` + `useReducer`.
- Candidate domain state: `CandidateProvider` + `useReducer`.
- Interview domain state: `InterviewProvider` + `useReducer`.
- Selection domain state: `SelectionProvider` + `useReducer`.
- Candidate filtering, saved searches, duplicate review, tags, and comparison actions: `useCandidateWorkspace` + reducer actions.
- Candidate creation: `useCandidateForm`.
- Rejection validation: `useRejectionForm`.
- Interview queue and workflow actions: `useInterviewWorkspace`.
- Interview calendar navigation and derived scheduling state: `useInterviewCalendar` + reducer actions.
- Interview scheduling: `useInterviewForm`.
- Interview scorecard evaluation: `useInterviewScorecard`.
- Interview decision validation: `useInterviewDecisionForm`.
- Selection board intelligence: `useSelectionWorkspace`.
- Selection bulk selection/action state: `useSelectionBulkActions`.
- Selection decision validation: `useSelectionDecisionForm`.
- Selection approval form state: `useSelectionApprovalForm`.
- Candidate persistence: `candidateRepository` service boundary.
- Interview persistence: `interviewRepository` service boundary.
- Selection persistence: `selectionRepository` service boundary, including selection history.
- Duplicate matching: pure `candidateMatching` service.
- Calendar conflict detection: pure `interviewCalendar` service.
- UI components remain presentational; business rules and mutations stay in hooks/provider/service layers.

## 11. Next frontend milestones

1. Complete runtime accessibility QA on keyboard navigation and real mobile devices.
2. Add configurable job-fit evidence and suitability score presentation.
3. Expand interview history and decision audit views.
4. Add advanced cross-job candidate allocation.
5. Add advanced drag-and-drop interview rescheduling and conflict-resolution actions.
6. Once frontend workflows stabilize, implement the Node/Fastify + MySQL backend to the proven domain contracts.
