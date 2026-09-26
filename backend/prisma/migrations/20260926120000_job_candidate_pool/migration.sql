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

-- Preserve job membership that can already be inferred from historical interviews.
INSERT INTO `JobCandidate` (
  `id`, `jobId`, `candidateId`, `status`, `statusUpdatedAt`, `createdAt`, `updatedAt`
)
SELECT
  UUID(),
  i.`jobId`,
  i.`candidateId`,
  'POOL',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `Interview` i
WHERE i.`jobId` IS NOT NULL
GROUP BY i.`jobId`, i.`candidateId`;

-- Set the membership status from the most recent interview/candidate state.
UPDATE `JobCandidate` jc
INNER JOIN (
  SELECT latest.`jobId`, latest.`candidateId`, latest.`status` AS `interviewStatus`, c.`status` AS `candidateStatus`
  FROM `Interview` latest
  INNER JOIN `Candidate` c ON c.`id` = latest.`candidateId`
  INNER JOIN (
    SELECT `jobId`, `candidateId`, MAX(`scheduledAt`) AS `maxScheduledAt`
    FROM `Interview`
    WHERE `jobId` IS NOT NULL
    GROUP BY `jobId`, `candidateId`
  ) latestSlot
    ON latestSlot.`jobId` = latest.`jobId`
    AND latestSlot.`candidateId` = latest.`candidateId`
    AND latestSlot.`maxScheduledAt` = latest.`scheduledAt`
) latest
  ON latest.`jobId` = jc.`jobId`
  AND latest.`candidateId` = jc.`candidateId`
SET
  jc.`status` = CASE
    WHEN latest.`candidateStatus` = 'HIRED' THEN 'HIRED'
    WHEN latest.`candidateStatus` = 'PASSED' THEN 'PASSED'
    WHEN latest.`candidateStatus` = 'REJECTED' THEN 'REJECTED'
    WHEN latest.`interviewStatus` IN ('SCHEDULED', 'IN_PROGRESS') THEN 'INTERVIEW_SCHEDULED'
    WHEN latest.`interviewStatus` = 'COMPLETED' THEN 'INTERVIEW_COMPLETED'
    WHEN latest.`interviewStatus` = 'NO_SHOW' THEN 'ON_HOLD'
    ELSE 'READY_FOR_INTERVIEW'
  END,
  jc.`statusUpdatedAt` = CURRENT_TIMESTAMP(3),
  jc.`updatedAt` = CURRENT_TIMESTAMP(3);
