-- Create a reusable job-specific candidate pool so candidates can participate in multiple jobs.
CREATE TABLE `JobCandidate` (
  `id` VARCHAR(36) NOT NULL,
  `jobId` VARCHAR(36) NOT NULL,
  `candidateId` VARCHAR(36) NOT NULL,
  `status` ENUM('POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED') NOT NULL DEFAULT 'POOL',
  `statusUpdatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `JobCandidate_jobId_candidateId_key`(`jobId`, `candidateId`),
  INDEX `JobCandidate_jobId_status_idx`(`jobId`, `status`),
  INDEX `JobCandidate_candidateId_status_idx`(`candidateId`, `status`),

  CONSTRAINT `JobCandidate_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `JobCandidate_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve the job context already present on historical interviews.
INSERT INTO `JobCandidate` (
  `id`, `jobId`, `candidateId`, `status`, `statusUpdatedAt`, `createdAt`, `updatedAt`
)
SELECT
  LOWER(CONCAT(
    HEX(RANDOM_BYTES(4)), '-',
    HEX(RANDOM_BYTES(2)), '-',
    HEX(RANDOM_BYTES(2)), '-',
    HEX(RANDOM_BYTES(2)), '-',
    HEX(RANDOM_BYTES(6))
  )),
  source.`jobId`,
  source.`candidateId`,
  source.`status`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM (
  SELECT
    i.`jobId`,
    i.`candidateId`,
    CASE
      WHEN c.`status` = 'HIRED' THEN 'HIRED'
      WHEN c.`status` = 'PASSED' THEN 'PASSED'
      WHEN c.`status` = 'REJECTED' THEN 'REJECTED'
      WHEN i.`status` IN ('SCHEDULED', 'IN_PROGRESS') THEN 'INTERVIEW_SCHEDULED'
      WHEN i.`status` = 'COMPLETED' THEN 'INTERVIEW_COMPLETED'
      WHEN i.`status` = 'NO_SHOW' THEN 'ON_HOLD'
      ELSE 'READY_FOR_INTERVIEW'
    END AS `status`
  FROM `Interview` i
  INNER JOIN `Candidate` c ON c.`id` = i.`candidateId`
  WHERE i.`jobId` IS NOT NULL
  GROUP BY i.`jobId`, i.`candidateId`, c.`status`, i.`status`
  ORDER BY i.`jobId`, i.`candidateId`, MAX(i.`scheduledAt`) DESC
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM `JobCandidate` jc
  WHERE jc.`jobId` = source.`jobId`
    AND jc.`candidateId` = source.`candidateId`
);
