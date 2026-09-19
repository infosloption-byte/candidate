CREATE TABLE `Agency` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Agency_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `agencyId` VARCHAR(36) NULL,
    `candidateId` VARCHAR(36) NULL,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'AGENCY', 'INTERVIEWER', 'INTERVIEWEE') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_candidateId_key`(`candidateId`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_agencyId_role_active_idx`(`agencyId`, `role`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Session` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Candidate` (
    `id` VARCHAR(36) NOT NULL,
    `agencyId` VARCHAR(36) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(60) NULL,
    `profession` VARCHAR(120) NULL,
    `experienceYears` INTEGER NULL,
    `skills` JSON NOT NULL,
    `onboardingStatus` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `source` ENUM('AGENCY_ADDED', 'SELF_ONBOARDED', 'BULK_IMPORTED') NOT NULL DEFAULT 'AGENCY_ADDED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Candidate_agencyId_reference_key`(`agencyId`, `reference`),
    INDEX `Candidate_agencyId_name_idx`(`agencyId`, `name`),
    INDEX `Candidate_agencyId_profession_idx`(`agencyId`, `profession`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Job` (
    `id` VARCHAR(36) NOT NULL,
    `agencyId` VARCHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(160) NULL,
    `openings` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'PUBLISHED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Job_agencyId_status_publishedAt_idx`(`agencyId`, `status`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `JobApplication` (
    `id` VARCHAR(36) NOT NULL,
    `jobId` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NOT NULL,
    `status` ENUM('APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'APPLIED',
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `JobApplication_jobId_candidateId_key`(`jobId`, `candidateId`),
    INDEX `JobApplication_jobId_status_idx`(`jobId`, `status`),
    INDEX `JobApplication_candidateId_status_idx`(`candidateId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Interview` (
    `id` VARCHAR(36) NOT NULL,
    `applicationId` VARCHAR(36) NOT NULL,
    `type` ENUM('SCREENING', 'TECHNICAL', 'PRACTICAL', 'FINAL') NOT NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    `scheduledAt` DATETIME(3) NOT NULL,
    `durationMins` INTEGER NOT NULL DEFAULT 30,
    `location` VARCHAR(160) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Interview_applicationId_scheduledAt_idx`(`applicationId`, `scheduledAt`),
    INDEX `Interview_status_scheduledAt_idx`(`status`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InterviewParticipant` (
    `interviewId` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InterviewParticipant_userId_assignedAt_idx`(`userId`, `assignedAt`),
    PRIMARY KEY (`interviewId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InterviewEvaluation` (
    `id` VARCHAR(36) NOT NULL,
    `interviewId` VARCHAR(36) NOT NULL,
    `interviewerId` VARCHAR(36) NOT NULL,
    `rating` INTEGER NOT NULL,
    `recommendation` ENUM('RECOMMENDED', 'MAYBE', 'NOT_RECOMMENDED') NOT NULL,
    `comments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InterviewEvaluation_interviewId_interviewerId_key`(`interviewId`, `interviewerId`),
    INDEX `InterviewEvaluation_interviewerId_createdAt_idx`(`interviewerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User`
    ADD CONSTRAINT `User_agencyId_fkey`
    FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `User`
    ADD CONSTRAINT `User_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Session`
    ADD CONSTRAINT `Session_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Candidate`
    ADD CONSTRAINT `Candidate_agencyId_fkey`
    FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Job`
    ADD CONSTRAINT `Job_agencyId_fkey`
    FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `JobApplication`
    ADD CONSTRAINT `JobApplication_jobId_fkey`
    FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `JobApplication`
    ADD CONSTRAINT `JobApplication_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Interview`
    ADD CONSTRAINT `Interview_applicationId_fkey`
    FOREIGN KEY (`applicationId`) REFERENCES `JobApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewParticipant`
    ADD CONSTRAINT `InterviewParticipant_interviewId_fkey`
    FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewParticipant`
    ADD CONSTRAINT `InterviewParticipant_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewEvaluation`
    ADD CONSTRAINT `InterviewEvaluation_interviewId_fkey`
    FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewEvaluation`
    ADD CONSTRAINT `InterviewEvaluation_interviewerId_fkey`
    FOREIGN KEY (`interviewerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
