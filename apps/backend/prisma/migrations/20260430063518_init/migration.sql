/*
  Warnings:

  - A unique constraint covering the columns `[studentCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AttendanceLog_date_idx";

-- DropIndex
DROP INDEX "AttendanceLog_studentId_idx";

-- AlterTable
ALTER TABLE "AttendanceLog" ADD COLUMN     "checkInDistanceM" DOUBLE PRECISION,
ADD COLUMN     "checkOutDistanceM" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fcmToken" TEXT,
ADD COLUMN     "studentCode" TEXT;

-- CreateIndex
CREATE INDEX "AttendanceLog_studentId_date_idx" ON "AttendanceLog"("studentId", "date");

-- CreateIndex
CREATE INDEX "FraudLog_riskLevel_idx" ON "FraudLog"("riskLevel");

-- CreateIndex
CREATE INDEX "FraudLog_createdAt_idx" ON "FraudLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentCode_key" ON "User"("studentCode");
