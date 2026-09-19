-- Candidate-centered recruitment workflow:
-- Candidate pool -> interview assignment -> criteria scoring -> final candidate status.

ALTER TABLE `Candidate`
  ADD COLUMN `status` ENUM('POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE') NOT NULL DEFAULT 'POOL',
  ADD COLUMN `statusUpdatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

ALTER TABLE `Interview`
  ADD COLUMN `candidateId` VARCHAR(36) NULL,
  ADD COLUMN `jobId` VARCHAR(36) NULL;

UPDATE `Interview` i
JOIN `JobApplication` a ON a.id = i.applicationId
SET i.candidateId = a.candidateId,
    i.jobId = a.jobId;


ALTER TABLE `Interview`
  DROP FOREIGN KEY `Interview_applicationId_fkey`,
  DROP COLUMN `applicationId`,
  MODIFY COLUMN `candidateId` VARCHAR(36) NOT NULL,
  ADD INDEX `Interview_candidateId_scheduledAt_idx`(`candidateId`, `scheduledAt`),
  ADD INDEX `Interview_jobId_scheduledAt_idx`(`jobId`, `scheduledAt`);

ALTER TABLE `Interview`
  ADD CONSTRAINT `Interview_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Interview_jobId_fkey`
    FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Job`
  ADD INDEX `Job_agencyId_status_idx`(`agencyId`, `status`);

CREATE TABLE `InterviewCriterion` (
  `id` VARCHAR(36) NOT NULL,
  `agencyId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) NULL,
  `maxPoints` INTEGER NOT NULL DEFAULT 5,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `InterviewCriterion_agencyId_active_createdAt_idx`(`agencyId`, `active`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InterviewEvaluationScore` (
  `id` VARCHAR(36) NOT NULL,
  `evaluationId` VARCHAR(36) NOT NULL,
  `criterionId` VARCHAR(36) NOT NULL,
  `points` INTEGER NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `InterviewEvaluationScore_evaluationId_criterionId_key`(`evaluationId`, `criterionId`),
  INDEX `InterviewEvaluationScore_criterionId_idx`(`criterionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CandidateStatusHistory` (
  `id` VARCHAR(36) NOT NULL,
  `candidateId` VARCHAR(36) NOT NULL,
  `fromStatus` ENUM('POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE') NULL,
  `toStatus` ENUM('POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE') NOT NULL,
  `reason` VARCHAR(500) NULL,
  `changedById` VARCHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `CandidateStatusHistory_candidateId_createdAt_idx`(`candidateId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `CandidateStatusHistory` (
  `id`, `candidateId`, `fromStatus`, `toStatus`, `reason`, `changedById`
)
SELECT UUID(), `id`, NULL, 'POOL', 'Candidate entered the candidate pool during workflow migration.', NULL
FROM `Candidate`;

ALTER TABLE `Interview`
  DROP INDEX `Interview_applicationId_scheduledAt_idx`;

ALTER TABLE `InterviewEvaluation`
  DROP COLUMN `rating`,
  DROP COLUMN `recommendation`;


ALTER TABLE `InterviewCriterion`
  ADD CONSTRAINT `InterviewCriterion_agencyId_fkey`
    FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewEvaluationScore`
  ADD CONSTRAINT `InterviewEvaluationScore_evaluationId_fkey`
    FOREIGN KEY (`evaluationId`) REFERENCES `InterviewEvaluation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `InterviewEvaluationScore_criterionId_fkey`
    FOREIGN KEY (`criterionId`) REFERENCES `InterviewCriterion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CandidateStatusHistory`
  ADD CONSTRAINT `CandidateStatusHistory_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `CandidateStatusHistory_changedById_fkey`
    FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE `JobApplication`;

