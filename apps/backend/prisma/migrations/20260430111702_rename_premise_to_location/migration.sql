-- Rename Premise table to Location
ALTER TABLE "Premise" RENAME TO "Location";

-- Update AttendanceLog: rename premiseId to locationId
ALTER TABLE "AttendanceLog" RENAME COLUMN "premiseId" TO "locationId";

-- Update WorkingHours: rename premiseId to locationId
ALTER TABLE "WorkingHours" RENAME COLUMN "premiseId" TO "locationId";

-- Update DailyStats: rename premiseId to locationId
ALTER TABLE "DailyStats" RENAME COLUMN "premiseId" TO "locationId";

-- Drop old foreign key constraints and recreate with new column names
ALTER TABLE "WorkingHours" DROP CONSTRAINT "WorkingHours_premiseId_fkey";
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttendanceLog" DROP CONSTRAINT "AttendanceLog_premiseId_fkey";
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyStats" DROP CONSTRAINT "DailyStats_premiseId_fkey";
ALTER TABLE "DailyStats" ADD CONSTRAINT "DailyStats_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update unique index in DailyStats
DROP INDEX "DailyStats_date_premiseId_key";
CREATE UNIQUE INDEX "DailyStats_date_locationId_key" ON "DailyStats"("date", "locationId");
