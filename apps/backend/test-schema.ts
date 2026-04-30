import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing database...');

  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.fraudLog.deleteMany(),
    prisma.session.deleteMany(),
    prisma.attendanceLog.deleteMany(),
    prisma.workingHours.deleteMany(),
    prisma.dailyStats.deleteMany(),
    prisma.reportJob.deleteMany(),
    prisma.idempotencyRecord.deleteMany(),
    prisma.location.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('✅ Database cleared\n');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // ─── USERS ───
  const student1 = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      passwordHash: hashedPassword,
      role: 'STUDENT',
      studentCode: 'STU001',
      deviceId: 'device_alice',
      fcmToken: 'fcm_alice',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      passwordHash: hashedPassword,
      role: 'STUDENT',
      studentCode: 'STU002',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  // ─── LOCATIONS ───
  const location1 = await prisma.location.create({
    data: {
      name: 'Campus A',
      latitude: 40.758,
      longitude: -73.9855,
      radiusMeters: 100,
    },
  });

  const location2 = await prisma.location.create({
    data: {
      name: 'Campus B',
      latitude: 40.7614,
      longitude: -73.9776,
      radiusMeters: 150,
    },
  });

  // ─── WORKING HOURS ───
  await prisma.workingHours.create({
    data: {
      locationId: location1.id,
      startTime: '09:00',
      endTime: '17:00',
    },
  });

  await prisma.workingHours.create({
    data: {
      locationId: location2.id,
      startTime: '08:30',
      endTime: '16:30',
      lateThresholdMins: 10,
      minDurationHours: 8,
    },
  });

  // ─── ATTENDANCE ───
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance1 = await prisma.attendanceLog.create({
    data: {
      studentId: student1.id,
      locationId: location1.id,
      date: today,
      checkInTime: new Date(today.getTime() + 9 * 3600000),
      checkOutTime: new Date(today.getTime() + 17 * 3600000),
      durationHours: 8,
      status: 'PRESENT',
      punctuality: 'ON_TIME',
    },
  });

  const attendance2 = await prisma.attendanceLog.create({
    data: {
      studentId: student2.id,
      locationId: location1.id,
      date: today,
      checkInTime: new Date(today.getTime() + 9.25 * 3600000),
      status: 'LATE',
      punctuality: 'LATE',
    },
  });

  const attendance3 = await prisma.attendanceLog.create({
    data: {
      studentId: student1.id,
      locationId: location2.id,
      date: new Date(today.getTime() - 86400000),
      status: 'ABSENT',
    },
  });

  // ─── SESSIONS ───
  await prisma.session.create({
    data: {
      userId: student1.id,
      refreshToken: 'token_' + Date.now(),
      deviceId: 'device_alice',
      ipAddress: '127.0.0.1',
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  // ─── FRAUD LOGS ───
  await prisma.fraudLog.create({
    data: {
      studentId: student2.id,
      type: 'DISTANCE_ANOMALY',
      riskLevel: 'LOW',
      details: { distance: 250 },
    },
  });

  await prisma.fraudLog.create({
    data: {
      studentId: student1.id,
      type: 'LOCATION_JUMP',
      riskLevel: 'HIGH',
      details: { jumpKm: 500 },
    },
  });

  // ─── NOTIFICATIONS ───
  await prisma.notification.createMany({
    data: [
      {
        userId: student2.id,
        type: 'LATE_ALERT',
        title: 'Late Check-in',
        body: 'You were late today',
      },
      {
        userId: student1.id,
        type: 'ABSENT_ALERT',
        title: 'Absence',
        body: 'You were absent yesterday',
      },
      {
        userId: admin.id,
        type: 'FRAUD_ALERT',
        title: 'Fraud Detected',
        body: 'Suspicious activity detected',
      },
    ],
  });

  // ─── IDEMPOTENCY ───
  await prisma.idempotencyRecord.create({
    data: {
      key: 'idem_' + Date.now(),
      userId: student1.id,
      endpoint: '/attendance/checkin',
      requestHash: 'hash1',
      responseData: {
        message: 'Check-in success',
        attendanceId: attendance1.id,
      },
    },
  });

  // ─── DAILY STATS ───
  await prisma.dailyStats.create({
    data: {
      date: today,
      locationId: location1.id,
      present: 1,
      late: 1,
      absent: 0,
    },
  });

  // ─── REPORT JOBS ───
  await prisma.reportJob.create({
    data: {
      status: 'DONE',
      format: 'pdf',
      filters: { date: today.toISOString() },
      fileUrl: 'https://example.com/report.pdf',
      createdById: admin.id,
    },
  });

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());