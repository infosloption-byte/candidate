-- DropIndex
DROP INDEX `AuditEvent_actorUserId_fkey` ON `auditevent`;

-- DropIndex
DROP INDEX `Candidate_recruiterOwnerId_fkey` ON `candidate`;

-- DropIndex
DROP INDEX `CandidateDocument_candidateId_fkey` ON `candidatedocument`;

-- DropIndex
DROP INDEX `CandidateDocument_uploadedById_fkey` ON `candidatedocument`;

-- DropIndex
DROP INDEX `CandidateDocument_verifiedById_fkey` ON `candidatedocument`;

-- DropIndex
DROP INDEX `CandidateDocumentVersion_documentId_fkey` ON `candidatedocumentversion`;

-- DropIndex
DROP INDEX `CandidateDocumentVersion_uploadedById_fkey` ON `candidatedocumentversion`;

-- DropIndex
DROP INDEX `CandidateJourneyEvent_candidateId_fkey` ON `candidatejourneyevent`;

-- DropIndex
DROP INDEX `Interview_candidateId_fkey` ON `interview`;

-- DropIndex
DROP INDEX `Interview_createdById_fkey` ON `interview`;

-- DropIndex
DROP INDEX `InterviewDecisionHistory_interviewId_fkey` ON `interviewdecisionhistory`;

-- DropIndex
DROP INDEX `InterviewerAssignment_tenantId_fkey` ON `interviewerassignment`;

-- DropIndex
DROP INDEX `InterviewReschedule_interviewId_fkey` ON `interviewreschedule`;

-- DropIndex
DROP INDEX `InterviewScoreCriterion_scorecardId_fkey` ON `interviewscorecriterion`;

-- DropIndex
DROP INDEX `Notification_candidateId_fkey` ON `notification`;

-- DropIndex
DROP INDEX `Notification_userId_fkey` ON `notification`;

-- DropIndex
DROP INDEX `PracticalTestItem_interviewId_fkey` ON `practicaltestitem`;

-- DropIndex
DROP INDEX `SelectionApproval_changedById_fkey` ON `selectionapproval`;

-- DropIndex
DROP INDEX `SelectionApproval_tenantId_fkey` ON `selectionapproval`;

-- DropIndex
DROP INDEX `SelectionHistory_candidateId_fkey` ON `selectionhistory`;

-- DropIndex
DROP INDEX `SelectionHistory_jobId_fkey` ON `selectionhistory`;

-- DropIndex
DROP INDEX `SelectionHistory_occurredById_fkey` ON `selectionhistory`;

-- DropIndex
DROP INDEX `SelectionHistory_relatedJobId_fkey` ON `selectionhistory`;

-- DropIndex
DROP INDEX `SelectionRecord_candidateId_fkey` ON `selectionrecord`;

-- DropIndex
DROP INDEX `SelectionRecord_decidedById_fkey` ON `selectionrecord`;

-- DropIndex
DROP INDEX `SelectionRecord_jobId_fkey` ON `selectionrecord`;

-- DropIndex
DROP INDEX `Session_userId_fkey` ON `session`;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_recruiterOwnerId_fkey` FOREIGN KEY (`recruiterOwnerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Candidate` ADD CONSTRAINT `Candidate_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateInvitation` ADD CONSTRAINT `CandidateInvitation_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateInvitation` ADD CONSTRAINT `CandidateInvitation_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateJourneyEvent` ADD CONSTRAINT `CandidateJourneyEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateJourneyEvent` ADD CONSTRAINT `CandidateJourneyEvent_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocument` ADD CONSTRAINT `CandidateDocument_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocumentVersion` ADD CONSTRAINT `CandidateDocumentVersion_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocumentVersion` ADD CONSTRAINT `CandidateDocumentVersion_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `CandidateDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CandidateDocumentVersion` ADD CONSTRAINT `CandidateDocumentVersion_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewerAssignment` ADD CONSTRAINT `InterviewerAssignment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewerAssignment` ADD CONSTRAINT `InterviewerAssignment_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewerAssignment` ADD CONSTRAINT `InterviewerAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScorecard` ADD CONSTRAINT `InterviewScorecard_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScorecard` ADD CONSTRAINT `InterviewScorecard_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScoreCriterion` ADD CONSTRAINT `InterviewScoreCriterion_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewScoreCriterion` ADD CONSTRAINT `InterviewScoreCriterion_scorecardId_fkey` FOREIGN KEY (`scorecardId`) REFERENCES `InterviewScorecard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticalTestItem` ADD CONSTRAINT `PracticalTestItem_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PracticalTestItem` ADD CONSTRAINT `PracticalTestItem_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewReschedule` ADD CONSTRAINT `InterviewReschedule_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewReschedule` ADD CONSTRAINT `InterviewReschedule_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewDecisionHistory` ADD CONSTRAINT `InterviewDecisionHistory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterviewDecisionHistory` ADD CONSTRAINT `InterviewDecisionHistory_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `Interview`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionRecord` ADD CONSTRAINT `SelectionRecord_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionApproval` ADD CONSTRAINT `SelectionApproval_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionApproval` ADD CONSTRAINT `SelectionApproval_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionApproval` ADD CONSTRAINT `SelectionApproval_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditEvent` ADD CONSTRAINT `AuditEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_relatedJobId_fkey` FOREIGN KEY (`relatedJobId`) REFERENCES `Job`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SelectionHistory` ADD CONSTRAINT `SelectionHistory_occurredById_fkey` FOREIGN KEY (`occurredById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
