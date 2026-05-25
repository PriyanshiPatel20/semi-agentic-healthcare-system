-- CreateTable
CREATE TABLE `Reminder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `appointmentId` INTEGER NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `sent` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Reminder` ADD CONSTRAINT `Reminder_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `Appointment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
