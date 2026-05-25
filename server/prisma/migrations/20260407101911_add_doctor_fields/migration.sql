/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Doctor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Doctor` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `experience` INTEGER NULL,
    ADD COLUMN `image` VARCHAR(191) NULL,
    ADD COLUMN `mobile` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Doctor_email_key` ON `Doctor`(`email`);
