# Construction Candidate ERP

Frontend-first SaaS application for managing construction recruitment, candidate profiles, interviews, evaluations, selection, and later deployment workflows.

## Repository layout

```text
candidate/
├── frontend/          # React 19 + TypeScript + Tailwind CSS MVP
├── backend/           # Node.js + Fastify + Prisma + MySQL API
├── docs/              # Product and UX documentation
├── TASKS.md           # Living implementation tracker
└── README.md
```

## Current milestone

The frontend MVP is now at the backend handoff point. Browser verification remains for real keyboard/device accessibility, while application development proceeds against the stabilized frontend domain contracts.

### Backend

- Node.js 20+ runtime
- Fastify 5 REST API
- TypeScript strict mode
- Prisma ORM 7
- MySQL / MariaDB
- Environment-based configuration
- Helmet security headers
- API namespace: /api/v1

The backend foundation includes typed environment configuration, the initial recruitment data model, and process/database health endpoints.

### Frontend

- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Native Context API + `useReducer`
- Native browser APIs and `fetch` for future API integration
- Feature-based architecture
- No external router or state/data library in the MVP

### Start the frontend

```bash
cd frontend
npm install
npm run dev
```

### Engineering principles

- Mobile-first and responsive at every breakpoint.
- Desktop sidebar can collapse to an icon rail; mobile uses a slide-over navigation.
- Candidate work is centered around a directory + profile workspace instead of form-heavy navigation.
- Components remain presentational; domain state and mutations stay in contexts/hooks.
- Every asynchronous boundary must explicitly support loading, error/retry, empty, and success states.
- All actions that change candidate outcomes preserve a reason and timeline context.

See [`TASKS.md`](./TASKS.md) for the active build plan.
