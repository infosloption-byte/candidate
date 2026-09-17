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
- ⏳ Add reusable loading, error/retry, empty, and success state components.
- 🔄 Complete accessibility pass with keyboard navigation, focus management, reduced motion, and mobile interaction checks.

## Phase 2 — Candidate intelligence UX

- ✅ Advanced candidate search with keyword, status, profession, experience, English, availability, overseas, driving, document readiness, and multi-skill filters.
- ⏳ Saved filters and reusable search presets.
- ✅ Candidate skills, experience, country history, availability, and readiness views are available in smart filtering/comparison.
- ✅ Explainable duplicate detection based on passport, phone, name, profession, and age signals.
- ✅ Responsive candidate comparison workspace supporting up to four candidates.
- ⏳ Candidate tags and recruiter-defined labels.
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

`Find candidate → Filter / search → Open profile → Review evidence → Compare or start screening / schedule interview / select / reserve / reject → preserve reason and timeline`

Candidate creation flow:

`Essentials → Trade → Readiness → Create → New state`

Candidate profile states:

`New → Screening → Interview → Selected / Reserve / Rejected`

Rejection is always accompanied by a structured reason and written decision note.

Candidate intelligence flow:

`Search → Smart filters → Review matches → Detect possible duplicates → Select up to 4 → Compare side by side`

Responsive rules:

- Desktop: persistent sidebar with collapse-to-rail, sticky top bar, independently scrolling main content.
- Tablet: compact sidebar behavior with flexible content widths.
- Mobile: slide-over navigation, single-column candidate flow, large tap targets, safe-area-aware action bars, and height-limited comparison tray.

## Current bugfix note

The candidate profile previously crashed on `candidate.journey.map(...)` when an older `buildhire.candidates` localStorage payload from the previous MVP schema was loaded. The candidate repository now treats storage as untrusted input, normalizes legacy `timeline` data and missing arrays, and returns a complete `Candidate` shape before the data reaches the React view.
