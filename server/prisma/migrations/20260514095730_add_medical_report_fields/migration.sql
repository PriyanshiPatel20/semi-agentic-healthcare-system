-- AlterTable
ALTER TABLE `MedicalRecord` ADD COLUMN `recommendations` TEXT NULL,
    ADD COLUMN `redFlags` LONGTEXT NULL,
    ADD COLUMN `riskLevel` VARCHAR(191) NULL;
