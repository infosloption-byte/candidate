-- Final BuildHire role model:
-- ADMIN = developer/platform owner
-- COMPANY_ADMIN = tenant/company administrator
-- AGENCY = agency user
-- INTERVIEWER = interviewer
-- INTERVIEWEE = candidate portal user
--
-- The previous company-tenancy migration temporarily renamed legacy ADMIN
-- users to COMPANY. Convert those tenant users to COMPANY_ADMIN without
-- guessing which real account should be the developer/platform owner.

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','COMPANY_ADMIN','COMPANY','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;

UPDATE `User`
SET `role` = 'COMPANY_ADMIN'
WHERE `role` = 'COMPANY';

ALTER TABLE `User`
  MODIFY COLUMN `role` ENUM('ADMIN','COMPANY_ADMIN','AGENCY','INTERVIEWER','INTERVIEWEE') NOT NULL;
