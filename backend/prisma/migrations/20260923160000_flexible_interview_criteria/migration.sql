-- Support multiple criteria groups per interview and non-scoring criterion responses.

CREATE TABLE `InterviewCriterionGroupAssignment` (
  `interviewId` VARCHAR(36) NOT NULL,
  `groupId` VARCHAR(36) NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`interviewId`, `groupId`),
  INDEX `InterviewCriterionGroupAssignment_groupId_sortOrder_idx` (`groupId`, `sortOrder`),
  CONSTRAINT `InterviewCriterionGroupAssignment_interviewId_fkey`
    FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE,
  CONSTRAINT `InterviewCriterionGroupAssignment_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `InterviewCriterionGroup`(`id`) ON DELETE CASCADE
);

ALTER TABLE `InterviewCriterion`
  ADD COLUMN `responseType` ENUM('SCORE', 'TEXT', 'SINGLE_SELECT', 'MULTI_SELECT', 'BOOLEAN') NOT NULL DEFAULT 'SCORE',
  ADD COLUMN `required` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `options` JSON NULL;

ALTER TABLE `InterviewCriterionAssignment`
  ADD COLUMN `responseType` ENUM('SCORE', 'TEXT', 'SINGLE_SELECT', 'MULTI_SELECT', 'BOOLEAN') NOT NULL DEFAULT 'SCORE',
  ADD COLUMN `required` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `options` JSON NULL;

CREATE TABLE `InterviewEvaluationResponse` (
  `id` VARCHAR(36) NOT NULL,
  `evaluationId` VARCHAR(36) NOT NULL,
  `criterionId` VARCHAR(36) NOT NULL,
  `textValue` TEXT NULL,
  `selectedOptions` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `InterviewEvaluationResponse_evaluationId_criterionId_key` (`evaluationId`, `criterionId`),
  INDEX `InterviewEvaluationResponse_criterionId_idx` (`criterionId`),
  CONSTRAINT `InterviewEvaluationResponse_evaluationId_fkey`
    FOREIGN KEY (`evaluationId`) REFERENCES `InterviewEvaluation`(`id`) ON DELETE CASCADE,
  CONSTRAINT `InterviewEvaluationResponse_criterionId_fkey`
    FOREIGN KEY (`criterionId`) REFERENCES `InterviewCriterion`(`id`) ON DELETE CASCADE
);

ALTER TABLE `InterviewCriterion`
  ADD COLUMN `_responseMigrationMarker` TINYINT NULL;

UPDATE `InterviewCriterion`
SET `responseType` = 'SCORE', `required` = TRUE, `options` = NULL;

ALTER TABLE `InterviewCriterion` DROP COLUMN `_responseMigrationMarker`;
