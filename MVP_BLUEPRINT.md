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

The product is being built frontend-first. Local browser persistence is a prototype adapter behind a candidate service boundary; it can later be replaced by native `fetch` API services without rewriting the screen workflow.

## 2. MVP navigation

```text
Dashboard
  └─ Recruitment overview + daily actions
Candidates ★
  ├─ Search / smart filters
  ├─ Responsive candidate directory
  ├─ Candidate profile workspace
  ├─ Add candidate: Essentials → Trade → Readiness
  └─ Rejection decision: Reason + Note
Interviews
  └─ Today queue + interviewer assignments
Jobs
  └─ Manpower demand / requirement cards
Selection
  └─ Shortlist comparison + select/reserve
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

The profile changes its guidance and primary actions by state. Previous interview evidence, documents, fit information, and the candidate journey remain visible on the same workspace.

## 4. Candidate creation UX

The form is intentionally progressive instead of a single long ERP form.

### Step 1 — Essentials

- Full name (required)
- Phone (required)
- Passport number
- Age
- Current location

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

Creating a candidate starts them in `New` state and sends them directly into the candidate workspace.

## 5. Responsive shell

### Desktop

- Persistent left sidebar.
- Sidebar collapses from full navigation to an icon rail and remembers the preference.
- Sticky top bar.
- Independent main-content scrolling.
- Candidate directory and profile use a split workspace.

### Tablet

- Same workspace principles with fluid widths.
- Dense controls wrap rather than overflow.
- Candidate profile content uses responsive grids.

### Mobile

- Sidebar becomes a slide-over navigation panel.
- Mobile navigation always opens expanded.
- Candidate directory and profile become a single-panel flow.
- Selecting a candidate opens their profile with a back action.
- Fixed action bars respect device safe areas.
- Tap targets and controls use touch-friendly spacing.

## 6. Smart SaaS UX

- `/` focuses global search; `Ctrl+K` focuses candidate search.
- Search covers names, reference IDs, professions, locations, skills, and countries.
- Loading uses skeleton content.
- Loading failure shows a retry action.
- Empty filtered results explain what to do next.
- Rejection requires an explainable reason and note.
- Candidate status changes append to the visible journey.
- Thin modern scrollbars are used for long panels.
- Reduced-motion preferences are respected.

## 7. State architecture

- App shell state: `AppProvider` + `useReducer`.
- Candidate domain state: `CandidateProvider` + `useReducer`.
- Candidate filtering and workflow actions: `useCandidateWorkspace`.
- Candidate creation: `useCandidateForm`.
- Rejection validation: `useRejectionForm`.
- Candidate persistence: `candidateRepository` service boundary.
- UI components remain presentational; business rules and mutations stay in hooks/provider layers.

## 8. Next frontend milestones

1. Finish reusable async state primitives and accessibility/focus management.
2. Build candidate duplicate detection and richer search/filter UX.
3. Build the interview scheduling and scorecard experience.
4. Build the selection board and candidate comparison workspace.
5. Once frontend workflows stabilize, implement the Node/Fastify + MySQL backend to the proven domain contracts.
