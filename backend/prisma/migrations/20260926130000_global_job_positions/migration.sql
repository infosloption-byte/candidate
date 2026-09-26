-- Jobs are global recruitment requirements. Position rows define the required worker mix.
CREATE TABLE `JobPosition` (
  `id` VARCHAR(36) NOT NULL,
  `jobId` VARCHAR(36) NOT NULL,
  `position` VARCHAR(160) NOT NULL,
  `requiredCount` INT NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `JobPosition_jobId_position_key`(`jobId`, `position`),
  INDEX `JobPosition_jobId_sortOrder_idx`(`jobId`, `sortOrder`),

  CONSTRAINT `JobPosition_jobId_fkey`
    FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve the previous single opening count as one position before converting jobs to global records.
INSERT INTO `JobPosition` (
  `id`, `jobId`, `position`, `requiredCount`, `sortOrder`, `createdAt`, `updatedAt`
)
SELECT
  UUID(),
  j.`id`,
  j.`title`,
  j.`openings`,
  0,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `Job` j
WHERE NOT EXISTS (
  SELECT 1 FROM `JobPosition` jp WHERE jp.`jobId` = j.`id`
);

-- Jobs are no longer owned by an agency.
UPDATE `Job` SET `agencyId` = NULL;
ALTER TABLE `Job` MODIFY COLUMN `agencyId` VARCHAR(36) NULL;
