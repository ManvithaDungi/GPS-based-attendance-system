import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { toDateOnly } from '../src/utils/date';
//command to run this file : npx ts-node prisma/seed.ts
const prisma = new PrismaClient();

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

type SeedStudent = { id: string; deviceId: string | null };
type SeedLocation = { id: string; radiusMeters: number };

const FRAUD_SEED_TEMPLATES: Array<{
  type: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  buildDetails: (student: SeedStudent, loc: SeedLocation) => Prisma.InputJsonValue;
}> = [
  {
    type: 'VELOCITY_ANOMALY',
    riskLevel: 'HIGH',
    buildDetails: () => {
      const velocityKmh = randomBetween(210, 480);
      return {
        factors: [`Impossible velocity: ${velocityKmh.toFixed(1)} km/h`],
        velocityKmh,
      };
    },
  },
  {
    type: 'DEVICE_MISMATCH',
    riskLevel: 'MEDIUM',
    buildDetails: (student) => ({
      factors: [
        `Device mismatch: user=${student.deviceId}, session=session_alt_${student.id.slice(0, 8)}`,
      ],
      registeredDeviceId: student.deviceId,
      sessionDeviceId: `session_alt_${student.id.slice(0, 8)}`,
    }),
  },
  {
    type: 'BOUNDARY_PROXIMITY',
    riskLevel: 'MEDIUM',
    buildDetails: (_student, loc) => {
      const distanceM = randomBetween(loc.radiusMeters * 0.82, loc.radiusMeters * 0.98);
      return {
        factors: [`Near boundary: ${distanceM.toFixed(1)}m / ${loc.radiusMeters}m`],
        distanceM,
        radiusMeters: loc.radiusMeters,
      };
    },
  },
  {
    type: 'DISTANCE_ANOMALY',
    riskLevel: 'HIGH',
    buildDetails: (_student, loc) => {
      const distanceM = randomBetween(loc.radiusMeters + 20, loc.radiusMeters + 350);
      return {
        factors: ['Distance from geofence centre exceeds allowed radius'],
        distanceM,
        allowedRadiusM: loc.radiusMeters,
      };
    },
  },
  {
    type: 'LOW_GPS_ACCURACY',
    riskLevel: 'LOW',
    buildDetails: () => ({
      factors: ['Device GPS accuracy is too low; location is untrustworthy'],
      accuracyMeters: randomBetween(105, 280),
      thresholdMeters: 100,
    }),
  },
  {
    type: 'OUTSIDE_GEOFENCE',
    riskLevel: 'HIGH',
    buildDetails: (_student, loc) => ({
      factors: ['Check-in attempted outside geofence'],
      distanceM: randomBetween(loc.radiusMeters + 50, loc.radiusMeters + 400),
      allowedRadiusM: loc.radiusMeters,
    }),
  },
];

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
  });

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
        latitude: BASE_LAT + 0.0045,
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

  // ─── GENERATE LAST 30 WEEKDAYS ───
  const weekDays: Date[] = [];
  const cursor = new Date();

  while (weekDays.length < 30) {
    const day = cursor.getDay(); // 0 = Sun, 6 = Sat
    if (day !== 0 && day !== 6) {
      weekDays.push(toDateOnly(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  weekDays.reverse(); // chronological: oldest → today (today is included when the loop starts from today)

  console.log(`📅 Generating attendance for ${weekDays.length} weekdays...`);

  // ─── ATTENDANCE (30 weekdays × 50 students = up to 1500 records) ───
  for (const student of students) {
    for (const day of weekDays) {
      const loc = locations[Math.floor(Math.random() * locations.length)];

      const statusRoll = Math.random();
      let status: any = 'PRESENT';
      let punctuality: any = 'ON_TIME';

      if (statusRoll < 0.1) {
        status = 'ABSENT';
      } else if (statusRoll < 0.3) {
        status = 'LATE';
        punctuality = 'LATE';
      }

      // LATE students check in between 09:15 and 10:30
      // ON_TIME students check in between 08:45 and 09:14
      const checkInHour =
        status === 'LATE'
          ? 9 + randomBetween(0.25, 1.5)
          : 9 + randomBetween(-0.25, 0.24);

      const checkOutHour = 17 + randomBetween(0, 0.5);

      const checkInTime = new Date(day.getTime() + checkInHour * 3600000);
      const checkOutTime = new Date(day.getTime() + checkOutHour * 3600000);
      const durationHours =
        status === 'ABSENT'
          ? 0
          : (checkOutTime.getTime() - checkInTime.getTime()) / 3600000;

      await prisma.attendanceLog.create({
        data: {
          studentId: student.id,
          locationId: loc.id,
          date: day,

          checkInTime: status === 'ABSENT' ? null : checkInTime,
          checkInLat:
            status === 'ABSENT'
              ? null
              : loc.latitude + randomBetween(-0.0005, 0.0005),
          checkInLng:
            status === 'ABSENT'
              ? null
              : loc.longitude + randomBetween(-0.0005, 0.0005),
          checkInDistanceM:
            status === 'ABSENT' ? null : randomBetween(5, 80),
          checkInAccuracyM:
            status === 'ABSENT' ? null : randomBetween(5, 30),

          checkOutTime: status === 'ABSENT' ? null : checkOutTime,
          checkOutLat:
            status === 'ABSENT'
              ? null
              : loc.latitude + randomBetween(-0.0005, 0.0005),
          checkOutLng:
            status === 'ABSENT'
              ? null
              : loc.longitude + randomBetween(-0.0005, 0.0005),
          checkOutDistanceM:
            status === 'ABSENT' ? null : randomBetween(5, 80),
          checkOutAccuracyM:
            status === 'ABSENT' ? null : randomBetween(5, 30),

          durationHours,
          status,
          punctuality,
        },
      });
    }

    // ─── SESSION (once per student) ───
    await prisma.session.create({
      data: {
        userId: student.id,
        refreshToken: `token_${student.id}`,
        deviceId: student.deviceId,
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

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

    console.log(`  ✔ Seeded student ${student.studentCode}`);
  }

  // ─── FRAUD LOGS (all risk types) ───
  let fraudCount = 0;

  for (let t = 0; t < FRAUD_SEED_TEMPLATES.length; t++) {
    const template = FRAUD_SEED_TEMPLATES[t];
    const student = students[t % students.length];
    const loc = locations[t % locations.length];
    await prisma.fraudLog.create({
      data: {
        studentId: student.id,
        type: template.type,
        riskLevel: template.riskLevel,
        details: template.buildDetails(student, loc),
      },
    });
    fraudCount++;
  }

  for (const student of students) {
    if (Math.random() >= 0.3) continue;
    const template =
      FRAUD_SEED_TEMPLATES[Math.floor(Math.random() * FRAUD_SEED_TEMPLATES.length)];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    await prisma.fraudLog.create({
      data: {
        studentId: student.id,
        type: template.type,
        riskLevel: template.riskLevel,
        details: template.buildDetails(student, loc),
      },
    });
    fraudCount++;
  }

  console.log(`🔒 Seeded ${fraudCount} fraud logs across ${FRAUD_SEED_TEMPLATES.length} risk types\n`);

  // ─── DAILY STATS (one per location per weekday) ───
  for (const day of weekDays) {
    for (const loc of locations) {
      await prisma.dailyStats.create({
        data: {
          date: day,
          locationId: loc.id,
          present: Math.floor(randomBetween(20, 30)),
          absent: Math.floor(randomBetween(3, 8)),
          late: Math.floor(randomBetween(5, 12)),
        },
      });
    }
  }

  // ─── REPORT JOB ───
  await prisma.reportJob.create({
    data: {
      status: 'DONE',
      format: 'pdf',
      filters: { date: new Date().toISOString() },
      fileUrl: 'https://example.com/report.pdf',
      createdById: admin.id,
    },
  });

  console.log(
    `\n🎉 Done! Seeded ${students.length} students × ${weekDays.length} weekdays = ${students.length * weekDays.length} attendance records`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());