-- MySQL requires an index on `agencyId` to back the Job_agencyId_fkey foreign key,
-- so the replacement index is created BEFORE the old one is dropped.
-- (This index was previously added later, in 20260919160000_candidate_workflow.)
ALTER TABLE `Job`
  ADD INDEX `Job_agencyId_status_idx`(`agencyId`, `status`);

-- DropIndex
DROP INDEX `Job_agencyId_status_publishedAt_idx` ON `Job`;
