import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "../src/generated/prisma/client.js";
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
    ["user-admin", "admin@buildhire.demo", "BuildHire Admin", "System Administrator", "SYSTEM_ADMIN", []],
    ["user-recruiter", "recruiter@buildhire.demo", "BuildHire Recruiter", "Recruitment Lead", "RECRUITER", []],
    ["int-001", "nadeesha@buildhire.demo", "Nadeesha Fernando", "Senior Technical Interviewer", "INTERVIEWER", ["Mason", "Tile Mason", "Plaster"]],
    ["int-002", "aruna@buildhire.demo", "Aruna Wijesinghe", "Carpentry & Formwork Interviewer", "INTERVIEWER", ["Shuttering Carpenter", "Carpenter", "Scaffolding"]],
    ["int-003", "suresh@buildhire.demo", "Suresh Perera", "Finishing Trades Interviewer", "INTERVIEWER", ["Painter", "Putty", "Finishing"]],
    ["int-004", "kasun.j@buildhire.demo", "Kasun Jayawardena", "Welding & Fabrication Interviewer", "INTERVIEWER", ["Welder", "Fabricator", "Arc Welding"]],
    ["user-manager", "manager@buildhire.demo", "BuildHire Manager", "Manager / Approver", "MANAGER", []],
  ] as const;

  for (const [id, email, name, title, role, specialties] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { id, tenantId: tenant.id, name, title, specialties, role, active: true, passwordHash },
      create: {
        id,
        tenantId: tenant.id,
        email,
        name,
        title,
        specialties,
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
        preferredDestinationCountries: [],
        drivingLicenseCategories: [],
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
        preferredDestinationCountries: [],
        drivingLicenseCategories: [],
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

  const interviewerUsers = [
    {
      id: "int-001",
      email: "nadeesha@buildhire.demo",
      name: "Nadeesha Fernando",
      title: "Senior Technical Interviewer",
      specialties: ["Mason", "Tile Mason", "Plaster"],
      role: "INTERVIEWER" as const,
    },
    {
      id: "int-002",
      email: "aruna@buildhire.demo",
      name: "Aruna Wijesinghe",
      title: "Carpentry & Formwork Interviewer",
      specialties: ["Shuttering Carpenter", "Carpenter", "Scaffolding"],
      role: "INTERVIEWER" as const,
    },
    {
      id: "int-003",
      email: "suresh@buildhire.demo",
      name: "Suresh Perera",
      title: "Finishing Trades Interviewer",
      specialties: ["Painter", "Putty", "Finishing"],
      role: "INTERVIEWER" as const,
    },
    {
      id: "int-004",
      email: "kasun.j@buildhire.demo",
      name: "Kasun Jayawardena",
      title: "Welding & Fabrication Interviewer",
      specialties: ["Welder", "Fabricator", "Arc Welding"],
      role: "INTERVIEWER" as const,
    },
  ];

  const interviewSeeds = [
    {
      id: "iv-001",
      reference: "IV-1001",
      candidateId: "cand-001",
      type: "TECHNICAL" as const,
      status: "EVALUATION" as const,
      startsAt: new Date("2026-09-18T04:00:00.000Z"),
      timezone: "Asia/Colombo",
      durationMinutes: 45,
      location: "Colombo Interview Room 1",
      notes: "Client requires strong finish work.",
      decision: "PENDING" as const,
      interviewerId: "int-001",
      templateId: "mason-standard",
      criteria: [
        ["technical", "Technical trade skill", 30],
        ["experience", "Relevant experience", 15],
        ["secondary", "Secondary skills", 15],
        ["safety", "Safety awareness", 15],
        ["quality", "Finish quality", 10],
        ["english", "English / communication", 5],
        ["tools", "Tools & methods", 10],
      ],
      practical: [
        ["practical-block", "Block / masonry work", true, "not-started"],
        ["practical-finish", "Plaster / finish quality", true, "not-started"],
        ["practical-tile", "Tile alignment / grouting", false, "not-started"],
        ["practical-safety", "Safe tool handling", true, "not-started"],
      ],
    },
    {
      id: "iv-002",
      reference: "IV-1002",
      candidateId: "cand-003",
      type: "PRACTICAL" as const,
      status: "SCHEDULED" as const,
      startsAt: new Date("2026-09-18T05:30:00.000Z"),
      timezone: "Asia/Colombo",
      durationMinutes: 60,
      location: "Practical Yard A",
      notes: "Focus on formwork accuracy.",
      decision: "PENDING" as const,
      interviewerId: "int-002",
      templateId: "carpentry-standard",
      criteria: [
        ["technical", "Formwork / carpentry skill", 30],
        ["experience", "Relevant experience", 15],
        ["drawing", "Drawing understanding", 15],
        ["safety", "Safety awareness", 15],
        ["quality", "Accuracy / finish", 10],
        ["english", "English / communication", 5],
        ["tools", "Tools & methods", 10],
      ],
      practical: [
        ["practical-trade", "Core practical trade task", true, "not-started"],
        ["practical-quality", "Accuracy / finish quality", true, "not-started"],
        ["practical-safety", "PPE and safe handling", true, "not-started"],
      ],
    },
    {
      id: "iv-003",
      reference: "IV-1003",
      candidateId: "cand-002",
      type: "SCREENING" as const,
      status: "SCHEDULED" as const,
      startsAt: new Date("2026-09-19T04:30:00.000Z"),
      timezone: "Asia/Colombo",
      durationMinutes: 30,
      location: "Colombo Interview Room 2",
      notes: "",
      decision: "PENDING" as const,
      interviewerId: "int-004",
      templateId: "welding-standard",
      criteria: [
        ["technical", "Welding technique", 30],
        ["experience", "Relevant experience", 15],
        ["fabrication", "Fabrication skill", 15],
        ["safety", "Safety awareness", 15],
        ["quality", "Weld quality", 10],
        ["english", "English / communication", 5],
        ["tools", "Tools & methods", 10],
      ],
      practical: [
        ["practical-weld", "Weld execution", true, "not-started"],
        ["practical-fabrication", "Cut / fit / fabrication", true, "not-started"],
        ["practical-safety", "PPE and safe handling", true, "not-started"],
      ],
    },
  ];

  for (const interviewer of interviewerUsers) {
    await prisma.user.upsert({
      where: { email: interviewer.email },
      update: {
        id: interviewer.id,
        tenantId: tenant.id,
        name: interviewer.name,
        title: interviewer.title,
        specialties: interviewer.specialties,
        role: interviewer.role,
        active: true,
        passwordHash,
      },
      create: {
        id: interviewer.id,
        tenantId: tenant.id,
        email: interviewer.email,
        name: interviewer.name,
        title: interviewer.title,
        specialties: interviewer.specialties,
        role: interviewer.role,
        active: true,
        passwordHash,
      },
    });
  }

  for (const interview of interviewSeeds) {
    await prisma.interview.upsert({
      where: { id: interview.id },
      update: {
        tenantId: tenant.id,
        reference: interview.reference,
        candidateId: interview.candidateId,
        type: interview.type,
        status: interview.status,
        startsAt: interview.startsAt,
        timezone: interview.timezone,
        durationMinutes: interview.durationMinutes,
        location: interview.location,
        notes: interview.notes,
        decision: interview.decision,
        createdById: recruiter.id,
      },
      create: {
        id: interview.id,
        tenantId: tenant.id,
        reference: interview.reference,
        candidateId: interview.candidateId,
        type: interview.type,
        status: interview.status,
        startsAt: interview.startsAt,
        timezone: interview.timezone,
        durationMinutes: interview.durationMinutes,
        location: interview.location,
        notes: interview.notes,
        decision: interview.decision,
        createdById: recruiter.id,
      },
    });

    // Rebuild interview children deterministically so the seed is safe to rerun.
    await prisma.interviewerAssignment.deleteMany({
      where: { tenantId: tenant.id, interviewId: interview.id },
    });

    const existingScorecard = await prisma.interviewScorecard.findUnique({
      where: { interviewId: interview.id },
      select: { id: true },
    });
    if (existingScorecard) {
      await prisma.interviewScoreCriterion.deleteMany({
        where: { tenantId: tenant.id, scorecardId: existingScorecard.id },
      });
      await prisma.interviewScorecard.delete({
        where: { id: existingScorecard.id },
      });
    }

    await prisma.practicalTestItem.deleteMany({
      where: { tenantId: tenant.id, interviewId: interview.id },
    });

    await prisma.interviewerAssignment.create({
      data: {
        tenantId: tenant.id,
        interviewId: interview.id,
        userId: interview.interviewerId,
      },
    });

    await prisma.interviewScorecard.create({
      data: {
        id: `${interview.id}-scorecard`,
        tenantId: tenant.id,
        interviewId: interview.id,
        templateId: interview.templateId,
        criteria: {
          create: interview.criteria.map(([id, label, weight]) => ({
            id: `${interview.id}-${id}`,
            tenantId: tenant.id,
            label,
            weight,
            score: null,
            note: null,
          })),
        },
      },
    });

    await prisma.practicalTestItem.createMany({
      data: interview.practical.map(([id, label, required, result]) => ({
        id: `${interview.id}-${id}`,
        tenantId: tenant.id,
        interviewId: interview.id,
        label,
        required,
        result,
        note: null,
      })),
    });
  }

  const jobSeeds = [
    { id: "job-dubai-mason", title: "Mason — Dubai Tower Project", project: "Dubai Tower Project", location: "Dubai, UAE", openings: 5, profession: "Mason", requiredExperience: 5, requiredSkills: ["Tile", "Putty"], preferredSkills: ["Plaster", "Grouting"], client: "Gulf Build Contracting", status: "OPEN" as const, startDate: "2026-10-15", deadline: "2026-10-01" },
    { id: "job-colombo-shuttering", title: "Shuttering Carpenter — Colombo Mall", project: "Colombo Mall Project", location: "Colombo, Sri Lanka", openings: 3, profession: "Shuttering Carpenter", requiredExperience: 4, requiredSkills: ["Formwork"], preferredSkills: ["Scaffolding"], client: "Urban Structure Group", status: "OPEN" as const, startDate: "2026-10-01", deadline: "2026-09-25" },
    { id: "job-doha-welder", title: "Welder — Doha Industrial Expansion", project: "Doha Industrial Expansion", location: "Doha, Qatar", openings: 4, profession: "Welder", requiredExperience: 5, requiredSkills: ["Fabrication", "Arc Welding"], preferredSkills: ["MIG Welding"], client: "Qatar Industrial Works", status: "OPEN" as const, startDate: "2026-10-20", deadline: "2026-10-05" },
  ];
  const scoringWeights = { experience: 25, skills: 25, interview: 25, documents: 10, readiness: 10, communication: 5 };

  for (const job of jobSeeds) {
    await prisma.job.upsert({
      where: { id: job.id },
      update: { tenantId: tenant.id, title: job.title, project: job.project, location: job.location, openings: job.openings, profession: job.profession, requiredExperience: job.requiredExperience, requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills, client: job.client, status: job.status, startDate: new Date(`${job.startDate}T00:00:00.000Z`), deadline: new Date(`${job.deadline}T00:00:00.000Z`), scoringWeights },
      create: { id: job.id, tenantId: tenant.id, title: job.title, project: job.project, location: job.location, openings: job.openings, profession: job.profession, requiredExperience: job.requiredExperience, requiredSkills: job.requiredSkills, preferredSkills: job.preferredSkills, client: job.client, status: job.status, startDate: new Date(`${job.startDate}T00:00:00.000Z`), deadline: new Date(`${job.deadline}T00:00:00.000Z`), scoringWeights },
    });
  }

  const selectionSeeds = [
    { id: "sel-001", candidateId: "cand-001", jobId: "job-dubai-mason", decision: "RECOMMENDED" as const, reason: "Strong technical fit", note: "Passed prior technical interview with strong finish-work evidence." },
    { id: "sel-002", candidateId: "cand-003", jobId: "job-colombo-shuttering", decision: "SELECTED" as const, reason: "Meets project requirement", note: "Technical and practical interview passed." },
    { id: "sel-003", candidateId: "cand-004", jobId: "job-dubai-mason", decision: "RESERVE" as const, reason: "Needs document follow-up", note: "Good technical fit; trade certificate needs attention." },
  ];

  for (const selection of selectionSeeds) {
    await prisma.selectionRecord.upsert({
      where: { tenantId_candidateId_jobId: { tenantId: tenant.id, candidateId: selection.candidateId, jobId: selection.jobId } },
      update: { decision: selection.decision, reason: selection.reason, note: selection.note, decidedById: recruiter.id },
      create: { id: selection.id, tenantId: tenant.id, candidateId: selection.candidateId, jobId: selection.jobId, decision: selection.decision, reason: selection.reason, note: selection.note, decidedById: recruiter.id },
    });
    await prisma.selectionHistory.deleteMany({ where: { tenantId: tenant.id, candidateId: selection.candidateId, jobId: selection.jobId } });
    await prisma.selectionHistory.create({
      data: { id: `${selection.id}-history`, tenantId: tenant.id, candidateId: selection.candidateId, jobId: selection.jobId, action: "DECISION_CHANGED", fromDecision: null, toDecision: selection.decision, reason: selection.reason, note: selection.note, occurredById: recruiter.id },
    });
  }
  const manager = await prisma.user.findUniqueOrThrow({
    where: { email: "manager@buildhire.demo" },
  });

  await prisma.selectionApproval.upsert({
    where: { jobId: "job-colombo-shuttering" },
    update: { tenantId: tenant.id, status: "APPROVED", note: "Initial development shortlist approved.", changedById: manager.id },
    create: { id: "approval-colombo-shuttering", tenantId: tenant.id, jobId: "job-colombo-shuttering", status: "APPROVED", note: "Initial development shortlist approved.", changedById: manager.id },
  });
  console.log("BuildHire development seed completed.");
  console.log("Staff login password: password");
  console.log("Workspace: buildhire-demo");
};

try {
  await main();
} finally {
  await prisma.$disconnect();
}
