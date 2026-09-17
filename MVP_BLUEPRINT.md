# BuildHire — Frontend MVP Blueprint

## 1. MVP navigation

```text
Dashboard
  └─ Recruitment overview + daily actions
Candidates
  ├─ Search / filters
  ├─ Candidate directory
  ├─ Candidate profile workspace
  ├─ Add candidate drawer
  └─ Rejection reason dialog
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

## 2. Candidate workflow UX

```text
New candidate
   ↓
Screening
   ↓
Interview
   ↓
Decision
 ┌─┼───────────────┐
 ↓ ↓               ↓
Selected  Reserve  Rejected
                  ↳ Reason + note required
```

The Candidate page is intentionally a split workspace:

- Left: searchable/filterable candidate directory.
- Right: selected candidate profile, suitability evidence, documents, work history, and timeline.
- Primary actions are visible at the top of the profile.
- Rejection requires a reason and supporting note.
- New candidates can be added from a side drawer without leaving the page.

## 3. State architecture

- Feature state uses `CandidateProvider` + `useReducer`.
- `useCandidateWorkspace` contains filtering, selection and workflow actions.
- `useCandidateForm` owns candidate creation form state and validation.
- `useRejectionForm` owns rejection form state.
- No router/state/data-fetching dependency is used in this MVP.
- Local storage is used only to make the prototype usable across page refreshes.

## 4. UX principles

- One primary action per screen.
- Search remains visible.
- Candidate evidence is available without navigating through multiple pages.
- Status is explicit and easy to scan.
- Decisions always have context and history.
- Mobile layouts stack rather than compress dense desktop tables.
- Inline SVG icons avoid a UI icon dependency.
