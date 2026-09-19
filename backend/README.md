# BuildHire Backend

The backend implements the rebuilt core recruitment workflow.

## Stack

- Node.js 20+
- TypeScript strict mode
- Fastify
- Prisma 7
- MySQL / MariaDB

## Implemented workflow

The API supports:

- session authentication for Admin, Agency, Interviewer, and Interviewee
- agency and user administration
- candidate self-onboarding, agency onboarding, and bulk CSV import
- candidate review and onboarding status changes
- optional candidate document upload/list/download/delete
- job create/edit/publish/close
- candidate applications and workflow progression
- interview scheduling with one or multiple interviewers
- basic interviewer/candidate conflict checks
- panel evaluations and final application decision
- operational audit events and basic notifications

## Document storage

Candidate documents are stored as files on the backend filesystem while only metadata is stored in MySQL.

Set DOCUMENT_STORAGE_DIR to a persistent directory in production. The default is:

backend/storage/documents

Supported document types are PDF, JPEG, and PNG. Each file is limited to 5 MB.

The storage code is isolated in src/lib/documentStorage.ts, so the persistence layer can later be replaced with object storage without changing the document API contract.

## Database setup

Create backend/.env from backend/.env.example, then run:

    npm install
    npm run prisma:generate
    npm run prisma:migrate
    npm run prisma:seed
    npm run dev

Integration tests require:

    RUN_DB_TESTS=1
    DATABASE_URL=...
