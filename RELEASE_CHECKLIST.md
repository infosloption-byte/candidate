# BuildHire — Release Checklist

## 1. Application verification

### Frontend
Run from `frontend/`:

```bash
npm ci
npm run build
npm run test:smoke
```

Verify the production build contains the four role experiences:
- Admin
- Agency
- Interviewer
- Interviewee

### Backend
Run from `backend/` with a test database configured:

```bash
npm ci
npx prisma generate
npx prisma validate
npx prisma migrate deploy
npm test
npm run build
```

For DB-backed integration coverage:

```bash
RUN_DB_TESTS=1 npm test
```

On Windows PowerShell, set the variable for the session first:

```powershell
$env:RUN_DB_TESTS="1"
npm test
```

## 2. Clean database recreation

Use a disposable empty database and run:

```bash
npx prisma migrate deploy
```

Confirm the following core tables are present:

`Agency`, `User`, `Session`, `Candidate`, `Job`, `JobApplication`, `Interview`, `InterviewParticipant`, `InterviewEvaluation`, `AuditEvent`, `Notification`.

Then run the integration suite against that database.

## 3. Manual workflow smoke test

Complete this sequence with real API-backed sessions:

1. Admin creates an agency.
2. Agency user is created for that agency.
3. Agency creates a job and publishes it.
4. Agency adds a candidate or imports candidates by CSV.
5. Candidate signs in or self-registers and completes the profile.
6. Candidate applies to a published job.
7. Agency advances the application to Shortlisted.
8. Agency schedules an interview with one or more Interviewers.
9. Interviewer opens My Interviews and submits an evaluation.
10. Completed panel evaluations move the application to the resolved status.
11. Candidate receives workflow notifications.
12. Agency sees recent activity on the dashboard.

## 4. Authorization checks

Verify each role can only perform its intended actions.

- Admin: agency management plus global oversight.
- Agency: only its own jobs, candidates, applications, interviews, users, audit history.
- Interviewer: assigned interviews and evaluations only.
- Interviewee: own profile, own applications, own interviews, published jobs for the linked agency.

Explicitly test one cross-agency read/update attempt and one outsider interviewer evaluation attempt.

## 5. Responsive browser QA

Check at minimum:
- desktop wide
- desktop compact/sidebar collapsed
- tablet width
- mobile width

Verify navigation, tables/cards, forms, dialogs, search fields, notifications, and action buttons remain usable without horizontal overflow.

## 6. Data protection and backup

Before production deployment:
- confirm `DATABASE_URL` is provided through the deployment secret/configuration;
- confirm production uses `NODE_ENV=production`;
- confirm HTTPS is enabled so secure session cookies are used;
- configure automated database backups;
- test restoring a backup into a disposable database;
- retain migration files with the deployed release.

## 7. Monitoring

At minimum monitor:
- backend process health
- HTTP 5xx responses
- database connectivity/errors
- migration failures
- authentication failures
- deployment failures

Keep application logs free of passwords, session tokens, and other secrets.

## 8. Current verification state

GitHub Actions is currently not providing executable job steps/logs: recent frontend and backend runs complete as failures within a few seconds with `steps: null`. Until the Actions runner environment is functioning, build/test pass items must be verified locally or by a working CI runner.
