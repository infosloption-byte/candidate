import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "mysql://candidate_erp:password@127.0.0.1:3306/construction_candidate_erp");
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.replace(/^\//, ""),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

const main = async (): Promise<void> => {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "buildhire-demo" },
    update: { name: "BuildHire Demo Workspace", active: true },
    create: { name: "BuildHire Demo Workspace", slug: "buildhire-demo" },
  });

  const passwordHash = await argon2.hash("password", { type: argon2.argon2id });

  const users = [
    ["admin@buildhire.demo", "BuildHire Admin", "SYSTEM_ADMIN"],
    ["recruiter@buildhire.demo", "BuildHire Recruiter", "RECRUITER"],
    ["interviewer@buildhire.demo", "BuildHire Interviewer", "INTERVIEWER"],
    ["manager@buildhire.demo", "BuildHire Manager", "MANAGER"],
  ] as const;

  for (const [email, name, role] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { tenantId: tenant.id, name, role, active: true, passwordHash },
      create: {
        tenantId: tenant.id,
        email,
        name,
        role,
        active: true,
        passwordHash,
      },
    });
  }

  const recruiter = await prisma.user.findUniqueOrThrow({
    where: { email: "recruiter@buildhire.demo" },
  });

  const seedCandidates = [
    {
      id: "cand-001",
      reference: "CA-1001",
      name: "Kasun Perera",
      phone: "+94 77 123 4567",
      phoneNormalized: "94771234567",
      passportNumber: "N7XXXX21",
      passportNumberNormalized: "n7xxxx21",
      age: 31,
      location: "Colombo",
      profession: "Mason",
      originalProfession: "Mason",
      experienceYears: 9,
      secondarySkills: ["Tile", "Putty", "Plaster"],
      overseasCountries: ["Qatar", "UAE"],
      tags: [],
      englishLevel: "GOOD",
      locationReady: true,
      drivingLicense: true,
      availability: "AVAILABLE_NOW",
      source: "REFERRAL",
      status: "INTERVIEW",
      onboardingStatus: "NOT_STARTED",
      fitScore: 92,
      priority: "HIGH",
      sourceCampaign: null,
      rejectionReason: null,
      rejectionNote: null,
      recruiterOwnerId: recruiter.id,
      createdAt: new Date("2026-09-12T09:00:00.000Z"),
      journey: [
        ["16 Sep 2026", "Interview passed", "Technical interview scored 88%.", "POSITIVE"],
        ["15 Sep 2026", "Shortlisted", "Matched Mason requirement for Dubai project.", "POSITIVE"],
        ["12 Sep 2026", "Candidate added", "Added from referral.", "NEUTRAL"],
      ],
    },
    {
      id: "cand-002",
      reference: "CA-1002",
      name: "Ruwan Silva",
      phone: "+94 71 442 1902",
      phoneNormalized: "94714421902",
      passportNumber: "N6XXXX78",
      passportNumberNormalized: "n6xxxx78",
      age: 36,
      location: "Gampaha",
      profession: "Welder",
      originalProfession: "Welder",
      experienceYears: 7,
      secondarySkills: ["Fabrication", "Arc Welding"],
      overseasCountries: ["Saudi Arabia"],
      tags: [],
      englishLevel: "WORKING",
      locationReady: true,
      drivingLicense: false,
      availability: "WITHIN_2_WEEKS",
      source: "AGENCY",
      status: "SCREENING",
      onboardingStatus: "NOT_STARTED",
      fitScore: 84,
      priority: "NORMAL",
      sourceCampaign: null,
      rejectionReason: null,
      rejectionNote: null,
      recruiterOwnerId: recruiter.id,
      createdAt: new Date("2026-09-17T09:00:00.000Z"),
      journey: [
        ["17 Sep 2026", "Screening started", "Recruiter is checking trade fit and availability.", "WARNING"],
        ["17 Sep 2026", "Candidate added", "Imported from agency shortlist.", "NEUTRAL"],
      ],
    },
    {
      id: "cand-003",
      reference: "CA-1003",
      name: "Chaminda Jayasuriya",
      phone: "+94 76 201 9981",
      phoneNormalized: "94762019981",
      passportNumber: "N5XXXX33",
      passportNumberNormalized: "n5xxxx33",
      age: 29,
      location: "Kurunegala",
      profession: "Shuttering Carpenter",
      originalProfession: "Carpenter",
      experienceYears: 6,
      secondarySkills: ["Formwork", "Scaffolding"],
      overseasCountries: ["Oman", "Qatar"],
      tags: [],
      englishLevel: "WORKING",
      locationReady: true,
      drivingLicense: true,
      availability: "AVAILABLE_NOW",
      source: "WALK_IN",
      status: "SELECTED",
      onboardingStatus: "NOT_STARTED",
      fitScore: 89,
      priority: "NORMAL",
      sourceCampaign: null,
      rejectionReason: null,
      rejectionNote: null,
      recruiterOwnerId: recruiter.id,
      createdAt: new Date("2026-09-10T09:00:00.000Z"),
      journey: [
        ["16 Sep 2026", "Selected", "Approved for the project shortlist.", "POSITIVE"],
        ["14 Sep 2026", "Interview passed", "Technical and practical tests passed.", "POSITIVE"],
      ],
    },
    {
      id: "cand-004",
      reference: "CA-1004",
      name: "Tharindu Fernando",
      phone: "+94 78 300 1144",
      phoneNormalized: "94783001144",
      passportNumber: "N8XXXX09",
      passportNumberNormalized: "n8xxxx09",
      age: 27,
      location: "Negombo",
      profession: "Tile Mason",
      originalProfession: "Mason",
      experienceYears: 4,
      secondarySkills: ["Tile", "Grouting"],
      overseasCountries: [],
      tags: [],
      englishLevel: "BASIC",
      locationReady: true,
      drivingLicense: false,
      availability: "AVAILABLE_NOW",
      source: "EXISTING_DATABASE",
      status: "RESERVE",
      onboardingStatus: "NOT_STARTED",
      fitScore: 76,
      priority: "NORMAL",
      sourceCampaign: null,
      rejectionReason: null,
      rejectionNote: null,
      recruiterOwnerId: recruiter.id,
      createdAt: new Date("2026-08-28T09:00:00.000Z"),
      journey: [
        ["12 Sep 2026", "Placed on reserve", "Technical fit met, but certificate is missing.", "WARNING"],
      ],
    },
    {
      id: "cand-005",
      reference: "CA-1005",
      name: "Pradeep Kumara",
      phone: "+94 75 888 2017",
      phoneNormalized: "94758882017",
      passportNumber: "N3XXXX90",
      passportNumberNormalized: "n3xxxx90",
      age: 42,
      location: "Matara",
      profession: "Painter",
      originalProfession: "Painter",
      experienceYears: 12,
      secondarySkills: ["Spray Paint", "Putty"],
      overseasCountries: ["Kuwait"],
      tags: [],
      englishLevel: "WORKING",
      locationReady: false,
      drivingLicense: true,
      availability: "NOT_AVAILABLE",
      source: "REFERRAL",
      status: "REJECTED",
      onboardingStatus: "NOT_STARTED",
      fitScore: 61,
      priority: "NORMAL",
      sourceCampaign: null,
      rejectionReason: "Client requirement",
      rejectionNote: "Practical finish quality did not meet the current client acceptance level.",
      recruiterOwnerId: recruiter.id,
      createdAt: new Date("2026-08-21T09:00:00.000Z"),
      journey: [
        ["09 Sep 2026", "Rejected", "Client requirement: finish quality below threshold.", "NEGATIVE"],
      ],
    },
  ] as const;

  for (const candidate of seedCandidates) {
    await prisma.candidate.upsert({
      where: { id: candidate.id },
      update: {
        tenantId: tenant.id,
        reference: candidate.reference,
        name: candidate.name,
        phone: candidate.phone,
        phoneNormalized: candidate.phoneNormalized,
        passportNumber: candidate.passportNumber,
        passportNumberNormalized: candidate.passportNumberNormalized,
        age: candidate.age,
        location: candidate.location,
        profession: candidate.profession,
        originalProfession: candidate.originalProfession,
        experienceYears: candidate.experienceYears,
        secondarySkills: candidate.secondarySkills,
        overseasCountries: candidate.overseasCountries,
        tags: candidate.tags,
        englishLevel: candidate.englishLevel,
        locationReady: candidate.locationReady,
        drivingLicense: candidate.drivingLicense,
        availability: candidate.availability,
        source: candidate.source,
        status: candidate.status,
        onboardingStatus: candidate.onboardingStatus,
        fitScore: candidate.fitScore,
        priority: candidate.priority,
        sourceCampaign: candidate.sourceCampaign,
        rejectionReason: candidate.rejectionReason,
        rejectionNote: candidate.rejectionNote,
        recruiterOwnerId: candidate.recruiterOwnerId,
      },
      create: {
        id: candidate.id,
        tenantId: tenant.id,
        reference: candidate.reference,
        name: candidate.name,
        phone: candidate.phone,
        phoneNormalized: candidate.phoneNormalized,
        passportNumber: candidate.passportNumber,
        passportNumberNormalized: candidate.passportNumberNormalized,
        age: candidate.age,
        location: candidate.location,
        profession: candidate.profession,
        originalProfession: candidate.originalProfession,
        experienceYears: candidate.experienceYears,
        secondarySkills: candidate.secondarySkills,
        overseasCountries: candidate.overseasCountries,
        tags: candidate.tags,
        englishLevel: candidate.englishLevel,
        locationReady: candidate.locationReady,
        drivingLicense: candidate.drivingLicense,
        availability: candidate.availability,
        source: candidate.source,
        status: candidate.status,
        onboardingStatus: candidate.onboardingStatus,
        fitScore: candidate.fitScore,
        priority: candidate.priority,
        sourceCampaign: candidate.sourceCampaign,
        rejectionReason: candidate.rejectionReason,
        rejectionNote: candidate.rejectionNote,
        recruiterOwnerId: candidate.recruiterOwnerId,
        createdAt: candidate.createdAt,
      },
    });

    await prisma.candidateJourneyEvent.deleteMany({
      where: { tenantId: tenant.id, candidateId: candidate.id },
    });
    for (const [dateLabel, title, detail, tone] of candidate.journey) {
      const parts = dateLabel.split(" ");
      const day = Number(parts[0]);
      const month = new Date(`2026-${String(new Date(`2026 ${parts[1]} 01`).getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00.000Z`);
      await prisma.candidateJourneyEvent.create({
        data: {
          id: `${candidate.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          tenantId: tenant.id,
          candidateId: candidate.id,
          title,
          detail,
          tone,
          occurredAt: month,
        },
      });
    }
  }

  console.log("BuildHire development seed completed.");
  console.log("Staff login password: password");
  console.log("Workspace: buildhire-demo");
};

try {
  await main();
} finally {
  await prisma.$disconnect();
}
