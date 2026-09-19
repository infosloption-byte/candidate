CREATE TABLE `CandidateDocument` (
    `id` VARCHAR(36) NOT NULL,
    `candidateId` VARCHAR(36) NOT NULL,
    `originalName` VARCHAR(180) NOT NULL,
    `mimeType` VARCHAR(80) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `storageKey` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CandidateDocument_storageKey_key`(`storageKey`),
    INDEX `CandidateDocument_candidateId_createdAt_idx`(`candidateId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CandidateDocument`
    ADD CONSTRAINT `CandidateDocument_candidateId_fkey`
    FOREIGN KEY (`candidateId`) REFERENCES `Candidate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
