// prisma/seed.ts
// Run with: npx ts-node prisma/depseed.ts

import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { toDateOnly } from '../src/utils/date';

// ─────────────────────────────────────────────
// 👇 PASTE YOUR DEPLOYED DATABASE URLS HERE
// ─────────────────────────────────────────────

const DATABASE_URL = 'postgresql://neondb_owner:npg_k7SMvqWmL2Vo@ep-fancy-cell-aoib9il9-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const DIRECT_URL   = 'postgresql://neondb_owner:npg_k7SMvqWmL2Vo@ep-fancy-cell-aoib9il9.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DIRECT_URL, // Use DIRECT_URL for seeding (bypasses connection pooler)
    },
  },
});

// ─── HELPERS ───────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

type SeedStudent = { id: string; deviceId: string | null };
type SeedLocation = { id: string; radiusMeters: number };

// ─── FRAUD TEMPLATES ───────────────────────────────────────────────────────

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

// ─── SEED FUNCTIONS ────────────────────────────────────────────────────────

async function clearDatabase() {
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
}

async function seedLocations() {
  const BASE_LAT = 17.732326;
  const BASE_LNG = 83.321304;

  const locations = await Promise.all([
    prisma.location.create({
      data: { name: 'Campus A', latitude: BASE_LAT, longitude: BASE_LNG, radiusMeters: 120 },
    }),
    prisma.location.create({
      data: { name: 'Campus B', latitude: BASE_LAT + 0.0045, longitude: BASE_LNG, radiusMeters: 150 },
    }),
  ]);

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

  return locations;
}

async function seedStudents(count = 50) {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const students = [];

  for (let i = 1; i <= count; i++) {
    const student = await prisma.user.create({
      data: {
        name: `Student ${i}`,
        email: `student${i}@indazone.com`,
        passwordHash: hashedPassword,
        role: 'STUDENT',
        studentCode: `STU${String(i).padStart(3, '0')}`,
        deviceId: `device_${i}`,
        fcmToken: `fcm_${i}`,
      },
    });
    students.push(student);
  }

  return students;
}

function getLast30Weekdays(): Date[] {
  const weekDays: Date[] = [];
  const cursor = new Date();

  while (weekDays.length < 30) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      weekDays.push(toDateOnly(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return weekDays.reverse(); // oldest → newest
}

async function seedAttendance(students: Awaited<ReturnType<typeof seedStudents>>, locations: Awaited<ReturnType<typeof seedLocations>>, weekDays: Date[]) {
  console.log(`📅 Generating attendance for ${weekDays.length} weekdays × ${students.length} students...`);

  for (const student of students) {
    for (const day of weekDays) {
      const loc = locations[Math.floor(Math.random() * locations.length)];
      const statusRoll = Math.random();

      let status: 'PRESENT' | 'ABSENT' | 'LATE' = 'PRESENT';
      let punctuality: 'ON_TIME' | 'LATE' = 'ON_TIME';

      if (statusRoll < 0.1) {
        status = 'ABSENT';
      } else if (statusRoll < 0.3) {
        status = 'LATE';
        punctuality = 'LATE';
      }

      const checkInHour = status === 'LATE'
        ? 9 + randomBetween(0.25, 1.5)
        : 9 + randomBetween(-0.25, 0.24);

      const checkOutHour = 17 + randomBetween(0, 0.5);
      const checkInTime  = new Date(day.getTime() + checkInHour * 3_600_000);
      const checkOutTime = new Date(day.getTime() + checkOutHour * 3_600_000);
      const durationHours = status === 'ABSENT'
        ? 0
        : (checkOutTime.getTime() - checkInTime.getTime()) / 3_600_000;

      await prisma.attendanceLog.create({
        data: {
          studentId: student.id,
          locationId: loc.id,
          date: day,

          checkInTime:       status !== 'ABSENT' ? checkInTime : null,
          checkInLat:        status !== 'ABSENT' ? loc.latitude  + randomBetween(-0.0005, 0.0005) : null,
          checkInLng:        status !== 'ABSENT' ? loc.longitude + randomBetween(-0.0005, 0.0005) : null,
          checkInDistanceM:  status !== 'ABSENT' ? randomBetween(5, 80) : null,
          checkInAccuracyM:  status !== 'ABSENT' ? randomBetween(5, 30) : null,

          checkOutTime:      status !== 'ABSENT' ? checkOutTime : null,
          checkOutLat:       status !== 'ABSENT' ? loc.latitude  + randomBetween(-0.0005, 0.0005) : null,
          checkOutLng:       status !== 'ABSENT' ? loc.longitude + randomBetween(-0.0005, 0.0005) : null,
          checkOutDistanceM: status !== 'ABSENT' ? randomBetween(5, 80) : null,
          checkOutAccuracyM: status !== 'ABSENT' ? randomBetween(5, 30) : null,

          durationHours,
          status,
          punctuality,
        },
      });
    }

    // Session, notification, idempotency per student
    await prisma.session.create({
      data: {
        userId: student.id,
        refreshToken: `token_${student.id}`,
        deviceId: student.deviceId,
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });

    await prisma.notification.create({
      data: {
        userId: student.id,
        type: 'INFO',
        title: 'Attendance Update',
        body: 'Your attendance has been recorded',
      },
    });

    await prisma.idempotencyRecord.create({
      data: {
        key: `idem_${student.id}`,
        userId: student.id,
        endpoint: '/attendance/checkin',
        requestHash: 'hash',
        responseData: { success: true },
      },
    });

    console.log(`  ✔ ${student.studentCode}`);
  }
}

async function seedFraudLogs(students: Awaited<ReturnType<typeof seedStudents>>, locations: Awaited<ReturnType<typeof seedLocations>>) {
  let fraudCount = 0;

  // One guaranteed log per template type
  for (let t = 0; t < FRAUD_SEED_TEMPLATES.length; t++) {
    const template = FRAUD_SEED_TEMPLATES[t];
    const student  = students[t % students.length];
    const loc      = locations[t % locations.length];

    await prisma.fraudLog.create({
      data: {
        studentId: student.id,
        type:      template.type,
        riskLevel: template.riskLevel,
        details:   template.buildDetails(student, loc),
      },
    });
    fraudCount++;
  }

  // Random additional logs (~30% of students)
  for (const student of students) {
    if (Math.random() >= 0.3) continue;
    const template = FRAUD_SEED_TEMPLATES[Math.floor(Math.random() * FRAUD_SEED_TEMPLATES.length)];
    const loc      = locations[Math.floor(Math.random() * locations.length)];

    await prisma.fraudLog.create({
      data: {
        studentId: student.id,
        type:      template.type,
        riskLevel: template.riskLevel,
        details:   template.buildDetails(student, loc),
      },
    });
    fraudCount++;
  }

  console.log(`🔒 Seeded ${fraudCount} fraud logs across ${FRAUD_SEED_TEMPLATES.length} risk types\n`);
}

async function seedDailyStats(locations: Awaited<ReturnType<typeof seedLocations>>, weekDays: Date[]) {
  for (const day of weekDays) {
    for (const loc of locations) {
      await prisma.dailyStats.create({
        data: {
          date:       day,
          locationId: loc.id,
          present:    Math.floor(randomBetween(20, 30)),
          absent:     Math.floor(randomBetween(3, 8)),
          late:       Math.floor(randomBetween(5, 12)),
        },
      });
    }
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  await clearDatabase();

  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Manvitha Dungi',
      email: 'manvitha3626@indazone.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  const locations = await seedLocations();
  const students  = await seedStudents(50);
  const weekDays  = getLast30Weekdays();

  await seedAttendance(students, locations, weekDays);
  await seedFraudLogs(students, locations);
  await seedDailyStats(locations, weekDays);

  await prisma.reportJob.create({
    data: {
      status:      'DONE',
      format:      'pdf',
      filters:     { date: new Date().toISOString() },
      fileUrl:     'https://example.com/report.pdf',
      createdById: admin.id,
    },
  });

  console.log(
    `\n🎉 Done! Seeded ${students.length} students × ${weekDays.length} weekdays = ${students.length * weekDays.length} attendance records`,
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());