-- AlterTable
ALTER TABLE `Reminder` ADD COLUMN `receiverId` INTEGER NULL,
    ADD COLUMN `receiverType` VARCHAR(191) NULL;
