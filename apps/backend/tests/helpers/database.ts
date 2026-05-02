import { PrismaClient } from '@prisma/client';

export const cleanDatabase = async (prisma: PrismaClient) => {
  await prisma.idempotencyRecord.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.fraudLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reportJob.deleteMany();
  await prisma.session.deleteMany();
  await prisma.dailyStats.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
};
