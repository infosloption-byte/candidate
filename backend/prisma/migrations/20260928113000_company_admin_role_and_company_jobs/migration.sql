-- Establish the final five-role model.
-- ADMIN is the developer/platform-owner role.
-- COMPANY_ADMIN is the tenant/company administrator role.
--
-- The preceding tenancy migration temporarily converted legacy ADMIN users to COMPANY.
-- This follow-up keeps those tenant administrators as COMPANY_ADMIN and restores ADMIN
-- as an available platform role without guessing which real account should be the
-- developer/platform owner.

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','COMPANY','COMPANY_ADMIN','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;

UPDATE `User`
SET `role` = 'COMPANY_ADMIN'
WHERE `role` = 'COMPANY';

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','COMPANY_ADMIN','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;

-- Jobs belong to the company, never to an agency.
ALTER TABLE `Job`
  DROP FOREIGN KEY `Job_agencyId_fkey`,
  DROP INDEX `Job_agencyId_status_idx`,
  DROP COLUMN `agencyId`;
