-- Final BuildHire role model:
-- ADMIN = developer/platform owner
-- COMPANY_ADMIN = tenant/company administrator
-- AGENCY = agency user
-- INTERVIEWER = interviewer
-- INTERVIEWEE = candidate portal user
--
-- The previous company-tenancy migration renamed legacy ADMIN users to COMPANY.
-- Preserve the earliest such account as the platform ADMIN, and convert the
-- remaining COMPANY accounts into COMPANY_ADMIN users.

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','COMPANY_ADMIN','COMPANY','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;

SET @legacy_platform_admin_id = (
  SELECT `id`
  FROM `User`
  WHERE `role` = 'COMPANY'
  ORDER BY `createdAt` ASC
  LIMIT 1
);

UPDATE `User`
SET `role` = 'COMPANY_ADMIN'
WHERE `role` = 'COMPANY';

UPDATE `User`
SET
  `role` = 'ADMIN',
  `companyId` = NULL,
  `agencyId` = NULL
WHERE `id` = @legacy_platform_admin_id;

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','COMPANY_ADMIN','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;
