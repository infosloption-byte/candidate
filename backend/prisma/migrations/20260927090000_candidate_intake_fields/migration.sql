-- Replace the legacy candidate profile with the seven fields collected at intake.

ALTER TABLE `Candidate`
  ADD COLUMN `agencyRegisterNo` VARCHAR(60) NULL,
  ADD COLUMN `firstName` VARCHAR(100) NULL,
  ADD COLUMN `lastName` VARCHAR(100) NULL,
  ADD COLUMN `requestedProfession` VARCHAR(120) NULL;

-- Preserve existing records while moving to the new canonical fields.
UPDATE `Candidate`
SET
  `agencyRegisterNo` = COALESCE(NULLIF(TRIM(`reference`), ''), UUID()),
  `firstName` = CASE
    WHEN LOCATE(' ', TRIM(`name`)) > 0 THEN SUBSTRING_INDEX(TRIM(`name`), ' ', 1)
    ELSE TRIM(`name`)
  END,
  `lastName` = CASE
    WHEN LOCATE(' ', TRIM(`name`)) > 0 THEN TRIM(SUBSTRING(TRIM(`name`), LOCATE(' ', TRIM(`name`)) + 1))
    ELSE ''
  END,
  `requestedProfession` = COALESCE(NULLIF(TRIM(`profession`), ''), 'Not specified');

ALTER TABLE `Candidate`
  DROP INDEX `Candidate_agencyId_name_idx`,
  DROP INDEX `Candidate_agencyId_profession_idx`,
  DROP INDEX `Candidate_agencyId_country_idx`,
  DROP INDEX `Candidate_agencyId_passportNumber_idx`,
  DROP INDEX `Candidate_agencyId_visaStatus_idx`,
  DROP INDEX `Candidate_agencyId_availability_idx`;

ALTER TABLE `Candidate`
  DROP COLUMN `name`,
  DROP COLUMN `email`,
  DROP COLUMN `phone`,
  DROP COLUMN `alternatePhone`,
  DROP COLUMN `country`,
  DROP COLUMN `currentLocation`,
  DROP COLUMN `availability`,
  DROP COLUMN `visaStatus`,
  DROP COLUMN `profession`,
  DROP COLUMN `experienceYears`,
  DROP COLUMN `skills`;

ALTER TABLE `Candidate`
  MODIFY COLUMN `agencyRegisterNo` VARCHAR(60) NOT NULL,
  MODIFY COLUMN `firstName` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `lastName` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `requestedProfession` VARCHAR(120) NOT NULL;

CREATE UNIQUE INDEX `Candidate_agencyId_agencyRegisterNo_key` ON `Candidate` (`agencyId`, `agencyRegisterNo`);
CREATE INDEX `Candidate_agencyId_firstName_lastName_idx` ON `Candidate` (`agencyId`, `firstName`, `lastName`);
CREATE INDEX `Candidate_agencyId_requestedProfession_idx` ON `Candidate` (`agencyId`, `requestedProfession`);
CREATE INDEX `Candidate_agencyId_passportNumber_idx` ON `Candidate` (`agencyId`, `passportNumber`);
