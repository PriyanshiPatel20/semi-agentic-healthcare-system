-- DropForeignKey
ALTER TABLE `Appointment` DROP FOREIGN KEY `Appointment_doctorId_fkey`;

-- DropForeignKey
ALTER TABLE `Appointment` DROP FOREIGN KEY `Appointment_patientId_fkey`;

-- DropIndex
DROP INDEX `Appointment_doctorId_fkey` ON `Appointment`;

-- DropIndex
DROP INDEX `Appointment_patientId_fkey` ON `Appointment`;

-- AlterTable
ALTER TABLE `Patient` ADD COLUMN `bloodGroup` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('ACTIVE', 'CRITICAL', 'DISCHARGED') NULL DEFAULT 'ACTIVE';

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
