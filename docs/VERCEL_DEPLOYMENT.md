# BuildHire — Two-Project Vercel Deployment

BuildHire is deployed as two independent Vercel projects from the same GitHub repository:

~~~text
infosloption-byte/candidate
├── frontend/  → Vercel project: BuildHire Web
└── backend/   → Vercel project: BuildHire API
~~~

Vercel supports deploying multiple projects from one repository by giving each project its own Root Directory and deployment settings. The backend is Fastify; Vercel currently supports Fastify as a Vercel Function with zero-configuration detection when a supported entry point such as server.ts exists at the project root or under src/.

## 1. Frontend Vercel project

Create/import a Vercel project using the same repository.

Set:

- Root Directory: frontend
- Framework Preset: Vite
- Install Command: npm install
- Build Command: npm run build
- Output Directory: dist

The repository contains frontend/vercel.json with the same build settings.

Production environment variable:

~~~text
VITE_API_BASE_URL=https://<your-backend-project>.vercel.app/api/v1
~~~

Replace the placeholder with the actual production API project URL.

## 2. Backend Vercel project

Create a second Vercel project using the same repository.

Set:

- Root Directory: backend
- Framework Preset: let Vercel detect Fastify
- Do not set a frontend output directory

The backend already has the supported src/server.ts Fastify entry point. Vercel's current Fastify deployment model runs the application as a Vercel Function.

Backend Production environment variables:

~~~text
NODE_ENV=production
CORS_ORIGIN=https://<your-frontend-project>.vercel.app
DATABASE_URL=mysql://<user>:<password>@<host>:<port>/<database>
~~~

Keep database credentials in Vercel environment variables, not Git.

BUILDHIRE_SEED_PASSWORD should only be configured when you intentionally need the seed process.

## 3. Database

Vercel does not replace the application's MariaDB database.

The production MariaDB server must be reachable from Vercel and have the BuildHire schema migrated before production use.

Run the migration from a trusted environment using the production DATABASE_URL:

~~~bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
~~~

Do not run prisma migrate dev against production.

## 4. Frontend → API requests

The frontend uses VITE_API_BASE_URL and sends authenticated requests with credentials included because BuildHire uses an HTTP-only session cookie.

Example:

~~~text
Frontend: https://buildhire-web.vercel.app
Backend:  https://buildhire-api.vercel.app

VITE_API_BASE_URL=https://buildhire-api.vercel.app/api/v1
CORS_ORIGIN=https://buildhire-web.vercel.app
~~~

The CORS origin must match the real frontend HTTPS origin.

The current session cookie is scoped to the API host and uses Secure in production. The default SameSite=Strict policy works when the frontend and API remain on the same site, such as separate Vercel subdomains. For unrelated custom domains, cookie policy and CSRF protection must be reviewed before production use.

## 5. Candidate documents

The current document implementation stores uploaded files on the backend filesystem.

That is suitable for local development but should not be treated as durable production storage on Vercel's serverless runtime. Before production document usage, move document bytes to persistent object storage and keep only the storage key in MariaDB.

## 6. Deployment order

Deploy the backend project first so its URL is known.

Then configure the frontend project's VITE_API_BASE_URL to the backend URL and deploy the frontend.

Finally test:

~~~text
GET  <backend>/api/v1/health
POST <backend>/api/v1/auth/login
GET  <backend>/api/v1/auth/me
~~~

Then test an authenticated frontend operation such as Candidates, Interviews, Calendar, or Reports.

## 7. Git workflow

Both Vercel projects can point to the same main branch. Each project builds only its configured Root Directory.

~~~bash
git add .
git commit -m "..."
git push origin main
~~~

Check the frontend and backend deployments separately in Vercel after pushing.

## 8. Local verification

Before production deployment:

~~~powershell
cd C:\wamp\www\html\candidate\frontend
npm run build

cd ..\backend
npm run build
~~~

The repository's CI history has had unrelated failures, so local build results should be checked before treating a Vercel deployment as verified.
