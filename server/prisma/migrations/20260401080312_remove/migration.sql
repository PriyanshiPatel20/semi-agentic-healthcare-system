/*
  Warnings:

  - You are about to drop the column `userId` on the `Patient` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Patient` DROP FOREIGN KEY `Patient_userId_fkey`;

-- DropIndex
DROP INDEX `Patient_userId_key` ON `Patient`;

-- AlterTable
ALTER TABLE `Patient` DROP COLUMN `userId`;
