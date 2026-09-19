-- Expand candidate profile with identity, contact, mobility, and work-permit fields used by recruitment operations.

ALTER TABLE `Candidate`
  ADD COLUMN `alternatePhone` VARCHAR(60) NULL,
  ADD COLUMN `country` VARCHAR(100) NULL,
  ADD COLUMN `passportNumber` VARCHAR(60) NULL,
  ADD COLUMN `passportExpiry` DATETIME(3) NULL,
  ADD COLUMN `currentLocation` VARCHAR(160) NULL,
  ADD COLUMN `availability` VARCHAR(80) NULL,
  ADD COLUMN `visaStatus` VARCHAR(80) NULL,
  ADD INDEX `Candidate_agencyId_country_idx`(`agencyId`, `country`),
  ADD INDEX `Candidate_agencyId_passportNumber_idx`(`agencyId`, `passportNumber`),
  ADD INDEX `Candidate_agencyId_visaStatus_idx`(`agencyId`, `visaStatus`),
  ADD INDEX `Candidate_agencyId_availability_idx`(`agencyId`, `availability`);
