-- Interview workflow enhancements: reusable criteria groups, interview-level criterion snapshots,
-- explicit in-progress state, and draft/submitted evaluation lifecycle.

ALTER TABLE `Interview`
  MODIFY COLUMN `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN `criterionGroupId` VARCHAR(36) NULL,
  ADD COLUMN `startedAt` DATETIME(3) NULL,
  ADD COLUMN `completedAt` DATETIME(3) NULL,
  ADD INDEX `Interview_criterionGroupId_idx`(`criterionGroupId`);

ALTER TABLE `InterviewEvaluation`
  ADD COLUMN `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `submittedAt` DATETIME(3) NULL,
  ADD INDEX `InterviewEvaluation_interviewerId_status_createdAt_idx`(`interviewerId`, `status`, `createdAt`);

UPDATE `InterviewEvaluation`
SET `status` = 'SUBMITTED',
    `submittedAt` = COALESCE(`submittedAt`, `updatedAt`);

CREATE TABLE `InterviewCriterionGroup` (
  `id` VARCHAR(36) NOT NULL,
  `agencyId` VARCHAR(36) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `category` VARCHAR(120) NULL,
  `description` VARCHAR(500) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `InterviewCriterionGroup_agencyId_active_name_idx`(`agencyId`, `active`, `name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InterviewCriterionGroupItem` (
  `groupId` VARCHAR(36) NOT NULL,
  `criterionId` VARCHAR(36) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`groupId`, `criterionId`),
  INDEX `InterviewCriterionGroupItem_criterionId_idx`(`criterionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `InterviewCriterionAssignment` (
  `id` VARCHAR(36) NOT NULL,
  `interviewId` VARCHAR(36) NOT NULL,
  `criterionId` VARCHAR(36) NOT NULL,
  `groupId` VARCHAR(36) NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) NULL,
  `maxPoints` INTEGER NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `InterviewCriterionAssignment_interviewId_criterionId_key`(`interviewId`, `criterionId`),
  INDEX `InterviewCriterionAssignment_interviewId_sortOrder_idx`(`interviewId`, `sortOrder`),
  INDEX `InterviewCriterionAssignment_criterionId_idx`(`criterionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Interview`
  ADD CONSTRAINT `Interview_criterionGroupId_fkey`
    FOREIGN KEY (`criterionGroupId`) REFERENCES `InterviewCriterionGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `InterviewCriterionGroup`
  ADD CONSTRAINT `InterviewCriterionGroup_agencyId_fkey`
    FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewCriterionGroupItem`
  ADD CONSTRAINT `InterviewCriterionGroupItem_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `InterviewCriterionGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `InterviewCriterionGroupItem_criterionId_fkey`
    FOREIGN KEY (`criterionId`) REFERENCES `InterviewCriterion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewCriterionAssignment`
  ADD CONSTRAINT `InterviewCriterionAssignment_interviewId_fkey`
    FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `InterviewCriterionAssignment_criterionId_fkey`
    FOREIGN KEY (`criterionId`) REFERENCES `InterviewCriterion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `InterviewCriterionAssignment_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `InterviewCriterionGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
