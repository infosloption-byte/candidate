# Construction Candidate ERP — Task Tracker

Legend: ✅ completed · 🔄 in progress · ⏳ planned · 🧪 verify

## Phase 1 — Frontend foundation

- ✅ Create React 19 + TypeScript strict frontend MVP.
- ✅ Establish feature-based source structure.
- ✅ Introduce Context + `useReducer` candidate domain state.
- ✅ Create initial navigation, dashboard, candidates, interviews, jobs, selection, reports, and settings surfaces.
- ✅ Add candidate workflow and structured rejection capture.
- 🔄 Move the application into a clear `frontend/` + `backend/` repository structure.
- 🔄 Make shell navigation, content scrolling, and candidate workspace responsive across desktop/tablet/mobile.
- 🔄 Refine candidate profile states and the multi-step add-candidate experience.
- ⏳ Add reusable loading, error/retry, empty, and success state components.
- ⏳ Add accessibility pass with keyboard navigation and focus management.

## Phase 2 — Candidate intelligence UX

- ⏳ Advanced candidate search and saved filters.
- ⏳ Candidate tags, skills, experience, country history, and availability views.
- ⏳ Candidate duplicate detection UX.
- ⏳ Candidate comparison workspace.
- ⏳ Job-fit evidence and configurable suitability score presentation.
- ⏳ Full interview history and decision audit timeline.

## Phase 3 — Interview workflow UX

- ⏳ Interview calendar and schedule management.
- ⏳ Interviewer profiles and panel assignment.
- ⏳ Profession-specific evaluation scorecards.
- ⏳ Mandatory failure reasons and structured interviewer notes.
- ⏳ Practical test workflow.
- ⏳ Interview result review/approval states.

## Phase 4 — Backend and data

- ⏳ Create Node.js + TypeScript backend under `backend/`.
- ⏳ Define REST API contracts matching frontend domain types.
- ⏳ Add MySQL database and migration strategy.
- ⏳ Add authentication, roles, and permissions.
- ⏳ Add server-side audit trail.
- ⏳ Add file/document storage abstraction.

## Phase 5 — Data migration and release

- ⏳ Build Excel import and validation workflow.
- ⏳ Map historical interview data to candidate/interview records.
- ⏳ Add duplicate/quality review before import.
- ⏳ End-to-end testing with real recruitment workflows.
- ⏳ Production deployment and backup/monitoring plan.

## Current UX definition

Primary daily user flow:

`Find candidate → Open profile → Review evidence → Start screening / schedule interview / select / reserve / reject → preserve reason and timeline`

Candidate creation should require only essential information first, then progressively collect professional and readiness information. The form must remain usable one-handed on mobile.
