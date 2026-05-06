import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
//command to run this file : npx ts-node prisma/seed.ts
const prisma = new PrismaClient();

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

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

  // ─── ADMIN ───
  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  }); await prisma.location.deleteMany(); // optional reset

  const BASE_LAT = 17.732326;
  const BASE_LNG = 83.321304;

  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: 'Campus A',
        latitude: BASE_LAT,
        longitude: BASE_LNG,
        radiusMeters: 120,
      },
    }),
    prisma.location.create({
      data: {
        name: 'Campus B',
        latitude: BASE_LAT + 0.0045, // ~500m north
        longitude: BASE_LNG,
        radiusMeters: 150,
      },
    }),
  ]);

  // ─── WORKING HOURS ───
  for (const loc of locations) {
    await prisma.workingHours.create({
      data: {
        locationId: loc.id,
        startTime: '09:00',
        endTime: '17:00',
        lateThresholdMins: 15,
        minDurationHours: 6,
      },
    });
  }

  // ─── STUDENTS (50) ───
  const students = [];
  for (let i = 1; i <= 50; i++) {
    const student = await prisma.user.create({
      data: {
        name: `Student ${i}`,
        email: `student${i}@example.com`,
        passwordHash: hashedPassword,
        role: 'STUDENT',
        studentCode: `STU${String(i).padStart(3, '0')}`,
        deviceId: `device_${i}`,
        fcmToken: `fcm_${i}`,
      },
    });
    students.push(student);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ─── ATTENDANCE (randomized) ───
  for (const student of students) {
    const loc = locations[Math.floor(Math.random() * locations.length)];

    const checkInHour = 9 + randomBetween(0, 1.5);
    const checkOutHour = 17;

    const statusRoll = Math.random();

    let status: any = 'PRESENT';
    let punctuality: any = 'ON_TIME';

    if (statusRoll < 0.1) status = 'ABSENT';
    else if (statusRoll < 0.3) {
      status = 'LATE';
      punctuality = 'LATE';
    }

    const checkInTime = new Date(today.getTime() + checkInHour * 3600000);

    await prisma.attendanceLog.create({
      data: {
        studentId: student.id,
        locationId: loc.id,
        date: today,
        checkInTime: status === 'ABSENT' ? null : checkInTime,
        checkInLat: loc.latitude + randomBetween(-0.0005, 0.0005),
        checkInLng: loc.longitude + randomBetween(-0.0005, 0.0005),
        checkInDistanceM: randomBetween(5, 80),
        checkInAccuracyM: randomBetween(5, 30),

        checkOutTime:
          status === 'ABSENT'
            ? null
            : new Date(today.getTime() + checkOutHour * 3600000),

        checkOutLat: loc.latitude,
        checkOutLng: loc.longitude,
        checkOutDistanceM: randomBetween(5, 80),
        checkOutAccuracyM: randomBetween(5, 30),

        durationHours: status === 'ABSENT' ? 0 : 8,
        status,
        punctuality,
      },
    });

    // ─── SESSION ───
    await prisma.session.create({
      data: {
        userId: student.id,
        refreshToken: `token_${student.id}`,
        deviceId: student.deviceId,
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    // ─── FRAUD (random) ───
    if (Math.random() < 0.2) {
      await prisma.fraudLog.create({
        data: {
          studentId: student.id,
          type: 'DISTANCE_ANOMALY',
          riskLevel: 'MEDIUM',
          details: { distance: randomBetween(200, 500) },
        },
      });
    }

    // ─── NOTIFICATIONS ───
    await prisma.notification.create({
      data: {
        userId: student.id,
        type: 'INFO',
        title: 'Attendance Update',
        body: 'Your attendance has been recorded',
      },
    });

    // ─── IDEMPOTENCY ───
    await prisma.idempotencyRecord.create({
      data: {
        key: `idem_${student.id}`,
        userId: student.id,
        endpoint: '/attendance/checkin',
        requestHash: 'hash',
        responseData: { success: true },
      },
    });
  }

  // ─── DAILY STATS ───
  for (const loc of locations) {
    await prisma.dailyStats.create({
      data: {
        date: today,
        locationId: loc.id,
        present: 30,
        absent: 10,
        late: 10,
      },
    });
  }

  // ─── REPORT JOB ───
  await prisma.reportJob.create({
    data: {
      status: 'DONE',
      format: 'pdf',
      filters: { date: today.toISOString() },
      fileUrl: 'https://example.com/report.pdf',
      createdById: admin.id,
    },
  });

  console.log('🎉 Full database seeded with realistic data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());