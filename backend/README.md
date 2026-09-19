# BuildHire Backend

The backend has been reset to a clean foundation.

## Stack

- Node.js 20+
- TypeScript strict mode
- Fastify
- Prisma 7
- MySQL / MariaDB

## Current state

Only the Fastify application foundation and health endpoint are implemented. The previous authentication, candidate services, interview services, selection system, allocation logic, notifications, reports, document workflow, and legacy controllers/repositories have been removed.

The new Prisma schema contains only the entities required for the rebuilt core workflow:

`Agency`, `User`, `Candidate`, `Job`, `JobApplication`, `Interview`, `InterviewParticipant`, `InterviewEvaluation`.

Database migrations and domain persistence services will be rebuilt in the next implementation phases.
