import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/lib/auth.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const url = new URL(databaseUrl);
const database = decodeURIComponent(url.pathname.slice(1));
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

const seedPassword = process.env.BUILDHIRE_SEED_PASSWORD;
if (!seedPassword || seedPassword.length < 8) {
  throw new Error('BUILDHIRE_SEED_PASSWORD must be provided and contain at least 8 characters.');
}

const upsertUser = async (
  email: string,
  name: string,
  role: 'ADMIN' | 'AGENCY' | 'INTERVIEWER',
  agencyId: string | null,
) => {
  const passwordHash = await hashPassword(seedPassword);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, agencyId, active: true, passwordHash },
    create: { email, name, role, agencyId, passwordHash },
  });
};

const main = async () => {
  const agency = await prisma.agency.upsert({
    where: { slug: 'demo-agency' },
    update: { name: 'Demo Agency', status: 'ACTIVE' },
    create: { name: 'Demo Agency', slug: 'demo-agency', status: 'ACTIVE' },
  });

  const admin = await upsertUser(
    process.env.BUILDHIRE_ADMIN_EMAIL ?? 'admin@buildhire.local',
    'BuildHire Admin',
    'ADMIN',
    null,
  );
  const agencyUser = await upsertUser(
    process.env.BUILDHIRE_AGENCY_EMAIL ?? 'agency@buildhire.local',
    'Demo Agency User',
    'AGENCY',
    agency.id,
  );
  const interviewer = await upsertUser(
    process.env.BUILDHIRE_INTERVIEWER_EMAIL ?? 'interviewer@buildhire.local',
    'Demo Interviewer',
    'INTERVIEWER',
    agency.id,
  );

  const defaultCriteria = [
    { name: 'Technical skill', description: 'Role-specific practical and technical ability.', maxPoints: 10, responseType: 'SCORE' as const, required: true, options: null },
    { name: 'Relevant experience', description: 'Relevant trade experience and project exposure.', maxPoints: 10, responseType: 'SCORE' as const, required: true, options: null },
    { name: 'Communication', description: 'Clarity, teamwork, and communication.', maxPoints: 5, responseType: 'SCORE' as const, required: true, options: null },
    { name: 'Current activities', description: 'What are you doing these days?', maxPoints: 0, responseType: 'TEXT' as const, required: true, options: null },
    { name: 'Sub Professions', description: 'Other professions or trades the candidate can perform.', maxPoints: 0, responseType: 'MULTI_SELECT' as const, required: false, options: null },
  ];

  // Interview criteria are a global library (no agencyId since 20260920110000_global_interview_criteria_library).
  for (const criterion of defaultCriteria) {
    const existing = await prisma.interviewCriterion.findFirst({
      where: { name: criterion.name },
      select: { id: true },
    });

    if (existing) {
      await prisma.interviewCriterion.update({
        where: { id: existing.id },
        data: { description: criterion.description, maxPoints: criterion.maxPoints, responseType: criterion.responseType, required: criterion.required, options: criterion.options === null ? Prisma.DbNull : criterion.options, active: true },
      });
    } else {
      await prisma.interviewCriterion.create({
        data: {
          name: criterion.name,
          description: criterion.description,
          maxPoints: criterion.maxPoints,
          responseType: criterion.responseType,
          required: criterion.required,
          options: criterion.options ?? undefined,
          active: true,
        },
      });
    }
  }

  console.log(`Seeded admin=${admin.email}, agency=${agencyUser.email}, interviewer=${interviewer.email}, agencyId=${agency.id}`);
};

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
