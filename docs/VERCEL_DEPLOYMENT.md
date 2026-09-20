# BuildHire — Single-Project Vercel Deployment

BuildHire is deployed as a single Vercel project using Vercel Services. The React frontend and Fastify backend are built together from the same repository and served from the same Vercel domain. Vercel Services supports multiple frontends and backends in one project and routes them by path.

~~~text
infosloption-byte/candidate
├── frontend/  → frontend service → /
└── backend/   → backend service  → /api/*
~~~

## 1. Vercel project settings

Create or use one Vercel project connected to:

~~~text
infosloption-byte/candidate
~~~

Set the project's Framework Preset to Services.

Use the repository root as the Vercel project Root Directory. Do not set the root directory to frontend or backend.

## 2. Repository routing

The root vercel.json defines two services and routes API requests before the frontend catch-all:

~~~json
{
  "services": {
    "frontend": {
      "root": "frontend/",
      "framework": "vite"
    },
    "backend": {
      "root": "backend/",
      "framework": "fastify",
      "entrypoint": "src/server.ts"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": { "service": "backend" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "frontend" }
    }
  ]
}
~~~

Vercel evaluates the top-level rewrites in order. API requests reach the backend service and every other browser path reaches the frontend service. The backend receives the original /api/... request path, matching this application's existing Fastify route prefixes.

## 3. Frontend API configuration

No production API hostname is required.

The frontend already defaults to:

~~~text
VITE_API_BASE_URL=/api/v1
~~~

Therefore:

~~~text
Browser
   ↓
https://<your-vercel-domain>/api/v1/*
   ↓
Vercel routing
   ↓
Fastify backend service
~~~

Browser traffic remains same-origin.

## 4. Backend environment variables

Set these in the single Vercel project for Production:

~~~text
NODE_ENV=production
DATABASE_URL=mysql://<user>:<password>@<host>:<port>/<database>
CORS_ORIGIN=https://<your-vercel-domain>
~~~

Keep database credentials in Vercel environment variables, not in Git.

## 5. Database

Vercel hosts the application runtime, not the existing MariaDB database.

The production MariaDB server must be reachable by the backend service.

Prepare the schema before using the production app:

~~~bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
~~~

Use prisma migrate deploy for production. Do not run prisma migrate dev against production.

## 6. Prisma build

The backend package includes:

~~~json
{
  "postinstall": "prisma generate",
  "build": "prisma generate && tsc -p tsconfig.json"
}
~~~

This ensures the generated Prisma client exists during the backend service build.

## 7. Authentication

BuildHire uses an HTTP-only session cookie.

With both services under one Vercel domain:

~~~text
https://<your-vercel-domain>
~~~

the browser communicates with the API on the same site. The production cookie remains Secure and SameSite=Strict.

## 8. Candidate documents

The current candidate document implementation writes files to the backend filesystem.

Do not treat that filesystem as durable production storage on Vercel. Before relying on document uploads in production, move file contents to persistent object storage and keep the storage key in MariaDB.

## 9. Deployment behavior

A push to main creates one Vercel deployment containing both frontend and backend services. Vercel builds each service independently inside the same deployment and serves both through the same domain.

## 10. Deployment verification

After deployment, check:

~~~text
https://<your-vercel-domain>/
https://<your-vercel-domain>/api/v1/health
~~~

Then verify:

~~~text
Login
Candidates
Interviews
Calendar
Reports
Candidate documents
~~~

For authentication, confirm login succeeds and a subsequent /api/v1/auth/me request returns the current user.

## 11. Local Vercel-style testing

Vercel Services supports local multi-service development using:

~~~bash
vercel dev
~~~

or:

~~~bash
vercel dev -L
~~~

## 12. Vercel dashboard requirement

The repository configuration is not sufficient by itself. In the Vercel project's Build and Deployment settings, set the Framework Preset to Services and keep the project Root Directory at the repository root.

