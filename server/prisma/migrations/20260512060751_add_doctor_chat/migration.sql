-- CreateTable
CREATE TABLE `DoctorChat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` TEXT NOT NULL,
    `reply` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `doctorId` INTEGER NULL,
    `patientId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DoctorChat` ADD CONSTRAINT `DoctorChat_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `Doctor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DoctorChat` ADD CONSTRAINT `DoctorChat_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
