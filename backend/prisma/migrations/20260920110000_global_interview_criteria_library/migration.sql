-- Interview criteria and reusable scorecard groups are global library records.
-- They are assigned to an interview when the interview is scheduled.

ALTER TABLE `InterviewCriterionGroup`
  DROP FOREIGN KEY `InterviewCriterionGroup_agencyId_fkey`,
  DROP INDEX `InterviewCriterionGroup_agencyId_active_name_idx`,
  DROP COLUMN `agencyId`;

ALTER TABLE `InterviewCriterion`
  DROP FOREIGN KEY `InterviewCriterion_agencyId_fkey`,
  DROP INDEX `InterviewCriterion_agencyId_active_createdAt_idx`,
  DROP COLUMN `agencyId`;
