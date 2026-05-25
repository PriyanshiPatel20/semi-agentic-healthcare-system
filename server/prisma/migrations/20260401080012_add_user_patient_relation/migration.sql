/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Patient` ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Patient_userId_key` ON `Patient`(`userId`);

-- AddForeignKey
ALTER TABLE `Patient` ADD CONSTRAINT `Patient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
