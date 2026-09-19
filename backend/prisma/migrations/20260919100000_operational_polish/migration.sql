CREATE TABLE `AuditEvent` (
    `id` VARCHAR(36) NOT NULL,
    `actorId` VARCHAR(36) NULL,
    `agencyId` VARCHAR(36) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(36) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_agencyId_createdAt_idx`(`agencyId`, `createdAt`),
    INDEX `AuditEvent_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `AuditEvent_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Notification` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AuditEvent`
    ADD CONSTRAINT `AuditEvent_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AuditEvent`
    ADD CONSTRAINT `AuditEvent_agencyId_fkey`
    FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Notification`
    ADD CONSTRAINT `Notification_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
