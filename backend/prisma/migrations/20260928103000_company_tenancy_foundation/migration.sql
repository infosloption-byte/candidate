-- BuildHire SaaS company tenancy foundation.
-- Existing operational data is assigned to one sample company so no records are orphaned.

CREATE TABLE `Company` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `Company_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Agency`
  ADD COLUMN `companyId` VARCHAR(36) NULL,
  ADD INDEX `Agency_companyId_status_idx` (`companyId`, `status`);

ALTER TABLE `User`
  ADD COLUMN `companyId` VARCHAR(36) NULL,
  ADD INDEX `User_companyId_role_active_idx` (`companyId`, `role`, `active`);

ALTER TABLE `Candidate`
  ADD COLUMN `companyId` VARCHAR(36) NULL,
  ADD INDEX `Candidate_companyId_status_idx` (`companyId`, `status`);

ALTER TABLE `Job`
  ADD COLUMN `companyId` VARCHAR(36) NULL,
  ADD INDEX `Job_companyId_status_idx` (`companyId`, `status`);

ALTER TABLE `Interview`
  ADD COLUMN `companyId` VARCHAR(36) NULL;

ALTER TABLE `InterviewCriterionGroup`
  ADD COLUMN `companyId` VARCHAR(36) NULL;

ALTER TABLE `InterviewCriterion`
  ADD COLUMN `companyId` VARCHAR(36) NULL;

ALTER TABLE `AuditEvent`
  ADD COLUMN `companyId` VARCHAR(36) NULL,
  ADD INDEX `AuditEvent_companyId_createdAt_idx` (`companyId`, `createdAt`);

INSERT INTO `Company` (`id`, `name`, `slug`, `status`, `createdAt`, `updatedAt`)
SELECT UUID(), 'BuildHire Demo Company', 'buildhire-demo', 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `Company` WHERE `slug` = 'buildhire-demo'
);

SET @buildhire_company_id = (
  SELECT `id` FROM `Company`
  WHERE `slug` = 'buildhire-demo'
  LIMIT 1
);

-- The current database is treated as one existing tenant.
UPDATE `Agency` SET `companyId` = @buildhire_company_id;
UPDATE `User`
SET `companyId` = @buildhire_company_id
WHERE `role` <> 'ADMIN' OR `agencyId` IS NOT NULL;
UPDATE `Candidate` SET `companyId` = @buildhire_company_id;
UPDATE `Job` SET `companyId` = @buildhire_company_id;
UPDATE `Interview` SET `companyId` = @buildhire_company_id;
UPDATE `InterviewCriterionGroup` SET `companyId` = @buildhire_company_id;
UPDATE `InterviewCriterion` SET `companyId` = @buildhire_company_id;
UPDATE `AuditEvent` SET `companyId` = @buildhire_company_id;

-- Legacy jobs without an agency are attached to the first existing agency
-- so the current agency-scoped workflow remains connected.
SET @buildhire_agency_id = (
  SELECT `id` FROM `Agency`
  WHERE `companyId` = @buildhire_company_id
  ORDER BY `createdAt` ASC
  LIMIT 1
);

UPDATE `Job`
SET `agencyId` = @buildhire_agency_id
WHERE `agencyId` IS NULL;

ALTER TABLE `Agency`
  ADD CONSTRAINT `Agency_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `User`
  ADD CONSTRAINT `User_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Candidate`
  MODIFY COLUMN `companyId` VARCHAR(36) NOT NULL,
  ADD CONSTRAINT `Candidate_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Job`
  MODIFY COLUMN `companyId` VARCHAR(36) NOT NULL,
  ADD CONSTRAINT `Job_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Interview`
  MODIFY COLUMN `companyId` VARCHAR(36) NOT NULL,
  ADD CONSTRAINT `Interview_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewCriterionGroup`
  MODIFY COLUMN `companyId` VARCHAR(36) NOT NULL,
  ADD CONSTRAINT `InterviewCriterionGroup_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `InterviewCriterion`
  MODIFY COLUMN `companyId` VARCHAR(36) NOT NULL,
  ADD CONSTRAINT `InterviewCriterion_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AuditEvent`
  ADD CONSTRAINT `AuditEvent_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
