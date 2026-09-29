-- Platform-admin "act as company" context. It lives on the session row so it ends with the session
-- (logout / expiry) and can never be inherited by a new login.
ALTER TABLE `Session`
  ADD COLUMN `actingCompanyId` VARCHAR(36) NULL,
  ADD COLUMN `actingMode` ENUM('READ_ONLY','READ_WRITE') NULL,
  ADD COLUMN `actingReason` VARCHAR(255) NULL,
  ADD COLUMN `actingUntil` DATETIME(3) NULL;

CREATE INDEX `Session_actingCompanyId_idx` ON `Session`(`actingCompanyId`);

ALTER TABLE `Session`
  ADD CONSTRAINT `Session_actingCompanyId_fkey`
  FOREIGN KEY (`actingCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
