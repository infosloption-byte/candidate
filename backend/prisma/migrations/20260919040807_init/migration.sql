-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `timezone` VARCHAR(80) NOT NULL DEFAULT 'Asia/Colombo',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    INDEX `Tenant_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `title` VARCHAR(160) NULL,
    `specialties` JSON NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SYSTEM_ADMIN', 'RECRUITER', 'INTERVIEWER', 'MANAGER', 'CANDIDATE') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_tenantId_role_active_idx`(`tenantId`, `role`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(36) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `jti` VARCHAR(64) NOT NULL,
    `csrfHash` VARCHAR(128) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NULL,

    UNIQUE INDEX `Session_jti_key`(`jti`),
    INDEX `Session_tenantId_userId_expiresAt_idx`(`tenantId`, `userId`, `expiresAt`),
    INDEX `Session_tenantId_revokedAt_expiresAt_idx`(`tenantId`, `revokedAt`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Candidate` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `phone` VARCHAR(60) NOT NULL,
    `phoneNormalized` VARCHAR(60) NOT NULL,
    `passportNumber` VARCHAR(80) NULL,
    `passportNumberNormalized` VARCHAR(80) NULL,
    `age` INTEGER NULL,
    `location` VARCHAR(160) NOT NULL,
    `profession` VARCHAR(120) NOT NULL,
    `originalProfession` VARCHAR(120) NOT NULL,
    `experienceYears` INTEGER NOT NULL,
    `secondarySkills` JSON NOT NULL,
    `overseasCountries` JSON NOT NULL,
    `tags` JSON NOT NULL,
    `englishLevel` ENUM('NOT_ASSESSED', 'BASIC', 'WORKING', 'GOOD', 'STRONG') NOT NULL,
    `locationReady` BOOLEAN NOT NULL DEFAULT false,
    `drivingLicense` BOOLEAN NOT NULL DEFAULT false,
    `availability` ENUM('AVAILABLE_NOW', 'WITHIN_2_WEEKS', 'WITHIN_1_MONTH', 'NOT_AVAILABLE') NOT NULL,
    `source` ENUM('WALK_IN', 'REFERRAL', 'AGENCY', 'EXISTING_DATABASE', 'BULK_IMPORT') NOT NULL,
    `status` ENUM('NEW', 'SCREENING', 'INTERVIEW', 'SELECTED', 'RESERVE', 'REJECTED') NOT NULL DEFAULT 'NEW',
    `onboardingStatus` ENUM('NOT_STARTED', 'INVITED', 'IN_PROGRESS', 'SUBMITTED', 'NEEDS_CHANGES', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `onboardingCompletionPercent` INTEGER NOT NULL DEFAULT 0,
    `onboardingInvitedAt` DATETIME(3) NULL,
    `onboardingLastActivityAt` DATETIME(3) NULL,
    `onboardingSubmittedAt` DATETIME(3) NULL,
    `onboardingReviewedAt` DATETIME(3) NULL,
    `onboardingReviewerNote` TEXT NULL,
    `nationality` VARCHAR(100) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `passportExpiry` DATETIME(3) NULL,
    `visaStatus` ENUM('NOT_STARTED', 'PENDING', 'APPROVED', 'EXPIRED', 'NOT_REQUIRED') NULL,
    `preferredDestinationCountries` JSON NOT NULL,
    `expectedSalary` VARCHAR(80) NULL,
    `salaryCurrency` VARCHAR(12) NULL,
    `noticePeriod` VARCHAR(80) NULL,
    `yearsInCurrentTrade` INTEGER NULL,
    `tradeCertificateDetails` TEXT NULL,
    `drivingLicenseCategories` JSON NOT NULL,
    `preferredInterviewLanguage` VARCHAR(80) NULL,
    `emergencyName` VARCHAR(160) NULL,
    `emergencyPhone` VARCHAR(60) NULL,
    `emergencyRelationship` VARCHAR(80) NULL,
    `recruiterOwnerId` VARCHAR(36) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `sourceCampaign` VARCHAR(160) NULL,
    `fitScore` INTEGER NOT NULL DEFAULT 0,
    `rejectionReason` VARCHAR(120) NULL,
    `rejectionNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Candidate_tenantId_status_profession_idx`(`tenantId`, `status`, `profession`),
    INDEX `Candidate_tenantId_phoneNormalized_idx`(`tenantId`, `phoneNormalized`),
    INDEX `Candidate_tenantId_recruiterOwnerId_idx`(`tenantId`, `recruiterOwnerId`),
    UNIQUE INDEX `Candidate_tenantId_reference_key`(`tenantId`, `reference`),
    UNIQUE INDEX `Candidate_tenantId_passportNumberNormalized_key`(`tenantId`, `passportNumberNormalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateInvitation` (
    `id` VARCHAR(36) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'OPENED', 'STARTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `tokenHash` VARCHAR(128) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL,
    `lastSentAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `openedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `reminderDueAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `sendCount` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CandidateInvitation_candidateId_key`(`candidateId`),
    UNIQUE INDEX `CandidateInvitation_tokenHash_key`(`tokenHash`),
    INDEX `CandidateInvitation_tenantId_status_expiresAt_idx`(`tenantId`, `status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateJourneyEvent` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `detail` TEXT NOT NULL,
    `tone` ENUM('NEUTRAL', 'POSITIVE', 'WARNING', 'NEGATIVE') NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CandidateJourneyEvent_tenantId_candidateId_occurredAt_idx`(`tenantId`, `candidateId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateDocument` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NOT NULL,
    `type` ENUM('PASSPORT', 'CV', 'TRADE_CERTIFICATE', 'VISA', 'OTHER') NOT NULL,
    `state` ENUM('VERIFIED', 'NEEDS_REVIEW', 'MISSING') NOT NULL DEFAULT 'NEEDS_REVIEW',
    `fileName` VARCHAR(255) NULL,
    `storageKey` VARCHAR(191) NULL,
    `mimeType` VARCHAR(120) NULL,
    `sizeBytes` BIGINT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `expiresAt` DATETIME(3) NULL,
    `uploadedById` VARCHAR(36) NULL,
    `verifiedById` VARCHAR(36) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `reviewNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CandidateDocument_storageKey_key`(`storageKey`),
    INDEX `CandidateDocument_tenantId_candidateId_type_version_idx`(`tenantId`, `candidateId`, `type`, `version`),
    INDEX `CandidateDocument_tenantId_state_expiresAt_idx`(`tenantId`, `state`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CandidateDocumentVersion` (
    `id` VARCHAR(36) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `documentId` VARCHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `sizeBytes` BIGINT NOT NULL,
    `uploadedById` VARCHAR(36) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CandidateDocumentVersion_storageKey_key`(`storageKey`),
    INDEX `CandidateDocumentVersion_tenantId_documentId_uploadedAt_idx`(`tenantId`, `documentId`, `uploadedAt`),
    UNIQUE INDEX `CandidateDocumentVersion_tenantId_documentId_version_key`(`tenantId`, `documentId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `project` VARCHAR(160) NOT NULL,
    `location` VARCHAR(160) NOT NULL,
    `openings` INTEGER NOT NULL,
    `profession` VARCHAR(120) NOT NULL,
    `requiredExperience` INTEGER NOT NULL,
    `requiredSkills` JSON NOT NULL,
    `preferredSkills` JSON NOT NULL,
    `client` VARCHAR(160) NOT NULL,
    `status` ENUM('DRAFT', 'OPEN', 'PAUSED', 'FILLED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `startDate` DATETIME(3) NULL,
    `deadline` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `scoringWeights` JSON NOT NULL,

    INDEX `Job_tenantId_status_profession_idx`(`tenantId`, `status`, `profession`),
    INDEX `Job_tenantId_deadline_idx`(`tenantId`, `deadline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Interview` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `candidateId` VARCHAR(36) NOT NULL,
    `type` ENUM('SCREENING', 'TECHNICAL', 'PRACTICAL', 'CLIENT', 'FINAL') NOT NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'EVALUATION', 'COMPLETED', 'NO_SHOW', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `startsAt` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `timezone` VARCHAR(80) NOT NULL DEFAULT 'Asia/Colombo',
    `notes` TEXT NOT NULL,
    `decision` ENUM('PENDING', 'SELECTED', 'RESERVE', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `decisionReason` VARCHAR(160) NULL,
    `decisionNote` TEXT NULL,
    `createdById` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Interview_tenantId_candidateId_startsAt_idx`(`tenantId`, `candidateId`, `startsAt`),
    INDEX `Interview_tenantId_status_startsAt_idx`(`tenantId`, `status`, `startsAt`),
    UNIQUE INDEX `Interview_tenantId_reference_key`(`tenantId`, `reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterviewerAssignment` (
    `tenantId` VARCHAR(36) NOT NULL,
    `interviewId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InterviewerAssignment_userId_assignedAt_idx`(`userId`, `assignedAt`),
    PRIMARY KEY (`interviewId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterviewScorecard` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `interviewId` VARCHAR(36) NOT NULL,
    `templateId` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `InterviewScorecard_interviewId_key`(`interviewId`),
    INDEX `InterviewScorecard_tenantId_templateId_idx`(`tenantId`, `templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterviewScoreCriterion` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `scorecardId` VARCHAR(36) NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `weight` INTEGER NOT NULL,
    `score` INTEGER NULL,
    `note` TEXT NULL,

    INDEX `InterviewScoreCriterion_tenantId_scorecardId_idx`(`tenantId`, `scorecardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PracticalTestItem` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `interviewId` VARCHAR(36) NOT NULL,
    `label` VARCHAR(200) NOT NULL,
    `required` BOOLEAN NOT NULL,
    `result` VARCHAR(40) NOT NULL,
    `note` TEXT NULL,

    INDEX `PracticalTestItem_tenantId_interviewId_idx`(`tenantId`, `interviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterviewReschedule` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `interviewId` VARCHAR(36) NOT NULL,
    `fromStartsAt` DATETIME(3) NOT NULL,
    `fromDurationMinutes` INTEGER NOT NULL,
    `fromInterviewerIds` JSON NOT NULL,
    `toStartsAt` DATETIME(3) NOT NULL,
    `toInterviewerIds` JSON NOT NULL,
    `reason` TEXT NULL,
    `undoneAt` DATETIME(3) NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InterviewReschedule_tenantId_interviewId_changedAt_idx`(`tenantId`, `interviewId`, `changedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterviewDecisionHistory` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `interviewId` VARCHAR(36) NOT NULL,
    `fromDecision` ENUM('PENDING', 'SELECTED', 'RESERVE', 'REJECTED') NOT NULL,
    `toDecision` ENUM('PENDING', 'SELECTED', 'RESERVE', 'REJECTED') NOT NULL,
    `reason` VARCHAR(160) NOT NULL,
    `note` TEXT NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InterviewDecisionHistory_tenantId_interviewId_changedAt_idx`(`tenantId`, `interviewId`, `changedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SelectionRecord` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NOT NULL,
    `jobId` VARCHAR(36) NOT NULL,
    `decision` ENUM('RECOMMENDED', 'SELECTED', 'RESERVE', 'REJECTED') NOT NULL,
    `reason` VARCHAR(160) NOT NULL,
    `note` TEXT NOT NULL,
    `decidedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedById` VARCHAR(36) NOT NULL,

    INDEX `SelectionRecord_tenantId_jobId_decision_idx`(`tenantId`, `jobId`, `decision`),
    UNIQUE INDEX `SelectionRecord_tenantId_candidateId_jobId_key`(`tenantId`, `candidateId`, `jobId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SelectionApproval` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `jobId` VARCHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'RETURNED') NOT NULL DEFAULT 'DRAFT',
    `note` TEXT NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changedById` VARCHAR(36) NOT NULL,

    UNIQUE INDEX `SelectionApproval_jobId_key`(`jobId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NULL,
    `type` VARCHAR(80) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_tenantId_userId_readAt_createdAt_idx`(`tenantId`, `userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `tenantId` VARCHAR(36) NOT NULL,
    `id` VARCHAR(36) NOT NULL,
    `actorUserId` VARCHAR(36) NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `action` VARCHAR(120) NOT NULL,
    `metadata` JSON NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_tenantId_entityType_entityId_occurredAt_idx`(`tenantId`, `entityType`, `entityId`, `occurredAt`),
    INDEX `AuditEvent_tenantId_actorUserId_occurredAt_idx`(`tenantId`, `actorUserId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SelectionHistory` (
    `id` VARCHAR(36) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NULL,
    `jobId` VARCHAR(36) NOT NULL,
    `relatedJobId` VARCHAR(36) NULL,
    `action` ENUM('DECISION_CHANGED', 'REASSIGNED', 'APPROVAL_CHANGED', 'ALLOCATED') NOT NULL,
    `fromDecision` ENUM('RECOMMENDED', 'SELECTED', 'RESERVE', 'REJECTED') NULL,
    `toDecision` ENUM('RECOMMENDED', 'SELECTED', 'RESERVE', 'REJECTED') NULL,
    `reason` VARCHAR(160) NOT NULL,
    `note` TEXT NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `occurredById` VARCHAR(36) NOT NULL,

    INDEX `SelectionHistory_tenantId_jobId_occurredAt_idx`(`tenantId`, `jobId`, `occurredAt`),
    INDEX `SelectionHistory_tenantId_candidateId_occurredAt_idx`(`tenantId`, `candidateId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_recruiterOwnerId_fkey` FOREIGN KEY (`recruiterOwnerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateInvitation` ADD CONSTRAINT `CandidateInvitation_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateInvitation` ADD CONSTRAINT `CandidateInvitation_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateJourneyEvent` ADD CONSTRAINT `CandidateJourneyEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateJourneyEvent` ADD CONSTRAINT `CandidateJourneyEvent_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocumentVersion` ADD CONSTRAINT `CandidateDocumentVersion_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocumentVersion` ADD CONSTRAINT `CandidateDocumentVersion_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `CandidateDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocumentVersion` ADD CONSTRAINT `CandidateDocumentVersion_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewerAssignment` ADD CONSTRAINT `InterviewerAssignment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewerAssignment` ADD CONSTRAINT `InterviewerAssignment_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewerAssignment` ADD CONSTRAINT `InterviewerAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScorecard` ADD CONSTRAINT `InterviewScorecard_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScorecard` ADD CONSTRAINT `InterviewScorecard_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScoreCriterion` ADD CONSTRAINT `InterviewScoreCriterion_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScoreCriterion` ADD CONSTRAINT `InterviewScoreCriterion_scorecardId_fkey` FOREIGN KEY (`scorecardId`) REFERENCES `InterviewScorecard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticalTestItem` ADD CONSTRAINT `PracticalTestItem_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticalTestItem` ADD CONSTRAINT `PracticalTestItem_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewReschedule` ADD CONSTRAINT `InterviewReschedule_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewReschedule` ADD CONSTRAINT `InterviewReschedule_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewDecisionHistory` ADD CONSTRAINT `InterviewDecisionHistory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewDecisionHistory` ADD CONSTRAINT `InterviewDecisionHistory_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionApproval` ADD CONSTRAINT `SelectionApproval_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionApproval` ADD CONSTRAINT `SelectionApproval_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionApproval` ADD CONSTRAINT `SelectionApproval_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_relatedJobId_fkey` FOREIGN KEY (`relatedJobId`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_occurredById_fkey` FOREIGN KEY (`occurredById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
