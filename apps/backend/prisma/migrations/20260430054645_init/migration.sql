/*
  Warnings:

  - The values [ON_LEAVE] on the enum `AttendanceStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isAutoClosesd` on the `AttendanceLog` table. All the data in the column will be lost.
  - The `punctuality` column on the `AttendanceLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PunctualityStatus" AS ENUM ('ON_TIME', 'LATE');

-- AlterEnum
BEGIN;
CREATE TYPE "AttendanceStatus_new" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'PENDING');
ALTER TABLE "AttendanceLog" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "AttendanceLog" ALTER COLUMN "status" TYPE "AttendanceStatus_new" USING ("status"::text::"AttendanceStatus_new");
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";
ALTER TYPE "AttendanceStatus_new" RENAME TO "AttendanceStatus";
DROP TYPE "AttendanceStatus_old";
ALTER TABLE "AttendanceLog" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_studentId_fkey";

-- AlterTable
ALTER TABLE "AttendanceLog" DROP COLUMN "isAutoClosesd",
ADD COLUMN     "isAutoClosed" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "punctuality",
ADD COLUMN     "punctuality" "PunctualityStatus";

-- DropTable
DROP TABLE "LeaveRequest";

-- DropEnum
DROP TYPE "LeaveStatus";

-- DropEnum
DROP TYPE "PunctuallityStatus";
