# BuildHire Release Checklist

## Current verification state

The latest GitHub Actions runs on main are failing before runner steps are exposed. The GitHub API reports completed failed jobs but no executable step/log payload, so source-level success must not be inferred from those runs.

The repository contains separate frontend and backend CI workflows. Once the GitHub Actions runner is available, both workflows should be allowed to complete without skipping any build/test steps.

## Pre-release checks

### Frontend/API deployment configuration

- Set `VITE_API_BASE_URL` when the API is not served from the default `/api/v1` path.
- Keep the frontend and API on the same site (for example, sibling subdomains under one domain) so the existing `SameSite=Strict` session cookie works with credentialed API requests.


### Source and database

- [ ] npm run build passes in frontend/.
- [ ] npm run test:smoke passes in frontend/.
- [ ] npm run prisma:generate passes in backend/.
- [ ] npm run prisma:validate passes in backend/.
- [ ] npm run prisma:migrate:deploy succeeds against a fresh MySQL database.
- [ ] RUN_DB_TESTS=1 npm test passes against the fresh database.
- [ ] npm run build passes in backend/.

### Responsive browser QA

Test the core workflow at minimum at these viewport sizes:

- 360×800 phone
- 390×844 phone
- 768×1024 tablet
- 1280×800 desktop
- 1440×900 desktop

Verify:

- sidebar navigation opens/closes correctly on small screens
- tables do not trap the page in horizontal overflow
- forms stack cleanly on small screens
- schedule/evaluation controls remain reachable without overlap
- candidate review and document lists remain readable
- success/error/loading states are visible without clipping
- mobile touch targets are comfortably tappable

### Production environment

Required configuration:

- DATABASE_URL
- CORS_ORIGIN
- NODE_ENV=production
- DOCUMENT_STORAGE_DIR pointing to persistent storage

Do not use demo seed credentials in production.

### Deployment

- [ ] Build frontend assets and publish frontend/dist.
- [ ] Build backend and publish backend/dist plus production dependencies.
- [ ] Apply Prisma migrations before opening traffic.
- [ ] Run /api/v1/health after deployment.
- [ ] Confirm CORS origin matches the production frontend origin.
- [ ] Confirm document storage is writable by the API process.

### Backup

- [ ] Schedule regular MySQL backups.
- [ ] Store backups outside the primary database host.
- [ ] Test a restore from a recent backup before production sign-off.
- [ ] Back up the configured document storage directory or use a durable volume/object store.
- [ ] Verify database and document backups are both covered by the retention policy.

### Monitoring and operations

- [ ] Monitor API process health and restart failures automatically.
- [ ] Monitor database connectivity and storage capacity.
- [ ] Monitor document storage growth.
- [ ] Retain application/error logs long enough to investigate production incidents.
- [ ] Define an owner and escalation path for outages.
- [ ] Verify health endpoint monitoring and alert delivery.

## Rollback

For an application rollback:

1. Stop routing new traffic to the deployment.
2. Restore the previous frontend/backend build.
3. Do not roll back the database past an already-applied destructive migration.
4. Investigate migration compatibility before retrying the deployment.
5. Confirm health and core login/application flows after rollback.
