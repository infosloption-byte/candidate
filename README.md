# BuildHire — Construction Candidate ERP

Frontend-first MVP for construction recruitment and interview management.

## Stack

- React 19 + TypeScript strict mode
- Vite
- Tailwind CSS
- Native React Context + `useReducer`
- Native browser APIs only for MVP persistence

## Current MVP

The application focuses on a frictionless candidate workflow:

`New → Screening → Interview → Selected / Reserve / Rejected`

The Candidates workspace uses a split directory/profile layout. Staff can search and filter candidates, inspect suitability evidence, review documents and history, move a candidate through the workflow, add a new candidate in a side drawer, and record structured rejection reasons.

## Run locally

```bash
npm install
npm run dev
```

## Important

This MVP intentionally has no Node/MySQL backend yet. The goal is to validate the user experience and workflow before committing to the server/data model.
