import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creating test data for all schema models...\n');

  // ─── Create Users ───────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);

  const student1 = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      passwordHash: hashedPassword,
      role: 'STUDENT',
      studentCode: 'STU001',
      fcmToken: 'token_alice_fcm_123',
      deviceId: 'device_alice_001',
    },
  });
  console.log('✓ Student 1 created:', student1.id);

  const student2 = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      passwordHash: hashedPassword,
      role: 'STUDENT',
      studentCode: 'STU002',
      fcmToken: 'token_bob_fcm_456',
      deviceId: 'device_bob_001',
    },
  });
  console.log('✓ Student 2 created:', student2.id);

  const admin = await prisma.user.create({
    data: {
      name: 'Charlie Admin',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      fcmToken: 'token_admin_fcm_789',
    },
  });
  console.log('✓ Admin created:', admin.id);

  // ─── Create Premises ────────────────────────────────────
  const premise1 = await prisma.premise.create({
    data: {
      name: 'Main Campus Building A',
      latitude: 40.7580,
      longitude: -73.9855,
      radiusMeters: 100,
    },
  });
  console.log('✓ Premise 1 created:', premise1.id);

  const premise2 = await prisma.premise.create({
    data: {
      name: 'Secondary Campus Building B',
      latitude: 40.7614,
      longitude: -73.9776,
      radiusMeters: 150,
    },
  });
  console.log('✓ Premise 2 created:', premise2.id);

  // ─── Create Working Hours ───────────────────────────────
  const workingHours1 = await prisma.workingHours.create({
    data: {
      premiseId: premise1.id,
      startTime: '09:00',
      endTime: '17:00',
      lateThresholdMins: 15,
      minDurationHours: 6,
    },
  });
  console.log('✓ Working Hours 1 created:', workingHours1.id);

  const workingHours2 = await prisma.workingHours.create({
    data: {
      premiseId: premise2.id,
      startTime: '08:30',
      endTime: '16:30',
      lateThresholdMins: 10,
      minDurationHours: 8,
    },
  });
  console.log('✓ Working Hours 2 created:', workingHours2.id);

  // ─── Create Attendance Logs ─────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance1 = await prisma.attendanceLog.create({
    data: {
      studentId: student1.id,
      premiseId: premise1.id,
      date: today,
      checkInTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      checkInLat: 40.7580,
      checkInLng: -73.9855,
      checkInDistanceM: 5.5,
      checkOutTime: new Date(today.getTime() + 17 * 60 * 60 * 1000),
      checkOutLat: 40.7580,
      checkOutLng: -73.9855,
      checkOutDistanceM: 8.2,
      durationHours: 8,
      status: 'PRESENT',
      punctuality: 'ON_TIME',
      isAutoClosed: false,
    },
  });
  console.log('✓ Attendance Log 1 created (PRESENT):', attendance1.id);

  const attendance2 = await prisma.attendanceLog.create({
    data: {
      studentId: student2.id,
      premiseId: premise1.id,
      date: today,
      checkInTime: new Date(today.getTime() + 9.25 * 60 * 60 * 1000), // 15 min late
      checkInLat: 40.7581,
      checkInLng: -73.9854,
      checkInDistanceM: 12.3,
      checkOutTime: new Date(today.getTime() + 17 * 60 * 60 * 1000),
      checkOutLat: 40.7580,
      checkOutLng: -73.9855,
      checkOutDistanceM: 6.1,
      durationHours: 7.75,
      status: 'LATE',
      punctuality: 'LATE',
      isAutoClosed: false,
    },
  });
  console.log('✓ Attendance Log 2 created (LATE):', attendance2.id);

  const attendance3 = await prisma.attendanceLog.create({
    data: {
      studentId: student1.id,
      premiseId: premise2.id,
      date: new Date(today.getTime() - 86400000), // yesterday
      status: 'ABSENT',
    },
  });
  console.log('✓ Attendance Log 3 created (ABSENT):', attendance3.id);

  // ─── Create Sessions ────────────────────────────────────
  const session1 = await prisma.session.create({
    data: {
      userId: student1.id,
      refreshToken: 'refresh_token_' + Date.now() + '_1',
      deviceId: 'device_alice_001',
      ipAddress: '192.168.1.100',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });
  console.log('✓ Session 1 created:', session1.id);

  const session2 = await prisma.session.create({
    data: {
      userId: admin.id,
      refreshToken: 'refresh_token_' + Date.now() + '_2',
      deviceId: 'device_admin_001',
      ipAddress: '192.168.1.101',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('✓ Session 2 created:', session2.id);

  // ─── Create Fraud Logs ──────────────────────────────────
  const fraudLog1 = await prisma.fraudLog.create({
    data: {
      studentId: student2.id,
      type: 'DISTANCE_ANOMALY',
      riskLevel: 'LOW',
      details: {
        checkInDistance: 250,
        threshold: 100,
      },
    },
  });
  console.log('✓ Fraud Log 1 created (LOW risk):', fraudLog1.id);

  const fraudLog2 = await prisma.fraudLog.create({
    data: {
      studentId: student1.id,
      type: 'LOCATION_JUMP',
      riskLevel: 'HIGH',
      details: {
        previousLocation: { lat: 40.7580, lng: -73.9855 },
        currentLocation: { lat: 35.0895, lng: -106.6437 },
        timeDelta: 120000, // 2 minutes
      },
    },
  });
  console.log('✓ Fraud Log 2 created (HIGH risk):', fraudLog2.id);

  // ─── Create Notifications ──────────────────────────────
  const notification1 = await prisma.notification.create({
    data: {
      userId: student2.id,
      type: 'LATE_ALERT',
      title: 'Late Check-in Alert',
      body: 'You checked in 15 minutes late at Main Campus Building A',
      read: false,
    },
  });
  console.log('✓ Notification 1 created (LATE_ALERT):', notification1.id);

  const notification2 = await prisma.notification.create({
    data: {
      userId: student1.id,
      type: 'ABSENT_ALERT',
      title: 'Absence Recorded',
      body: 'You were marked absent on April 29, 2026',
      read: false,
    },
  });
  console.log('✓ Notification 2 created (ABSENT_ALERT):', notification2.id);

  const notification3 = await prisma.notification.create({
    data: {
      userId: admin.id,
      type: 'FRAUD_ALERT',
      title: 'Suspicious Activity Detected',
      body: 'High-risk fraud detected for student Alice Johnson',
      read: false,
    },
  });
  console.log('✓ Notification 3 created (FRAUD_ALERT):', notification3.id);

  // ─── Summary ────────────────────────────────────────────
  console.log('\n✅ Test data created successfully!');
  console.log('\n📊 Summary:');
  console.log('  • Users: 3 (2 students, 1 admin)');
  console.log('  • Premises: 2');
  console.log('  • Working Hours: 2');
  console.log('  • Attendance Logs: 3 (1 present, 1 late, 1 absent)');
  console.log('  • Sessions: 2');
  console.log('  • Fraud Logs: 2 (1 low risk, 1 high risk)');
  console.log('  • Notifications: 3');
  console.log('\n💡 View in Prisma Studio: npm run prisma:studio');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());