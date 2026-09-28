-- Rename the legacy ADMIN role to the explicit COMPANY role and remove agency ownership from jobs.
-- Existing ADMIN accounts become company administrators in their existing tenant.
SET @default_company_id = (
  SELECT `id` FROM `Company`
  ORDER BY `createdAt` ASC
  LIMIT 1
);

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','COMPANY','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;

UPDATE `User`
SET
  `role` = 'COMPANY',
  `companyId` = COALESCE(`companyId`, @default_company_id),
  `agencyId` = NULL
WHERE `role` = 'ADMIN';

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('COMPANY','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;

ALTER TABLE `Job`
  DROP FOREIGN KEY `Job_agencyId_fkey`,
  DROP INDEX `Job_agencyId_status_idx`,
  DROP COLUMN `agencyId`;
