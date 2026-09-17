# Backend

Reserved for the Node.js + TypeScript API and MySQL persistence layer.

The backend is intentionally not implemented in this milestone. Frontend workflows and domain contracts are being validated first so the API can be designed around proven user flows rather than the old spreadsheet structure.

Planned stack:

- Node.js
- TypeScript strict mode
- Fastify
- Prisma
- MySQL
- Secure authentication and role-based authorization
- File/document storage abstraction

Target domain modules:

`auth`, `candidates`, `jobs`, `interviews`, `evaluations`, `selection`, `documents`, `reports`, `audit`
