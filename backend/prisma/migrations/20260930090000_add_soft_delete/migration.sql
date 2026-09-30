ALTER TABLE `Candidate` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `Job` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `Interview` ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `Candidate_companyId_deletedAt_idx` ON `Candidate`(`companyId`, `deletedAt`);
CREATE INDEX `Job_companyId_deletedAt_idx` ON `Job`(`companyId`, `deletedAt`);
CREATE INDEX `Interview_companyId_deletedAt_idx` ON `Interview`(`companyId`, `deletedAt`);
CREATE INDEX `Interview_candidateId_deletedAt_idx` ON `Interview`(`candidateId`, `deletedAt`);
