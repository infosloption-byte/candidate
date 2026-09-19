# BuildHire — Release Checklist

The canonical release checklist is maintained in [docs/RELEASE_CHECKLIST.md](./docs/RELEASE_CHECKLIST.md).

## Repository verification commands

Because the repository intentionally does not commit npm lockfiles, use `npm install` rather than `npm ci` for this project.

### Frontend

From `frontend/`:

```bash
npm install
npm run build
npm run test:smoke
```

Set `VITE_API_BASE_URL` for production when the API is not served from the default `/api/v1` path.

### Backend

From `backend/` with a disposable test database:

```bash
npm install
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:deploy
RUN_DB_TESTS=1 npm test
npm run build
```

On Windows PowerShell:

```powershell
$env:RUN_DB_TESTS="1"
npm test
```

Production frontend/API should be deployed on the same site (for example, sibling subdomains under one domain) unless the authentication cookie policy is intentionally redesigned for a cross-site deployment.
