import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import { cleanDatabase } from './helpers/database';

let studentToken: string;
let studentId: string;
let locationId: string;

beforeAll(async () => {
  await cleanDatabase(prisma);

  // Create student user
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'student@example.com',
      passwordHash,
      role: 'STUDENT',
    },
  });
  studentId = user.id;

  // Login to get token
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'student@example.com',
    password: 'password123',
    deviceId: 'device1',
  });
  studentToken = loginRes.body.accessToken;

  // Create Location
  const loc = await prisma.location.create({
    data: {
      name: 'Campus Main',
      latitude: 19.076,
      longitude: 72.8777,
      radiusMeters: 100,
      workingHours: {
        create: {
          startTime: '09:00',
          endTime: '17:00',
          lateThresholdMins: 15,
          minDurationHours: 6,
        },
      },
    },
  });
  locationId = loc.id;
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
});

describe('Attendance APIs', () => {
  describe('POST /api/v1/attendance/checkin', () => {
    it('should reject checkin outside geofence', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('Idempotency-Key', 'chk-out-1')
        .send({
          lat: 19.0, // Far away
          lng: 72.8,
          timestamp: new Date().toISOString(),
          locationId,
          accuracyMeters: 10,
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('OUTSIDE_GEOFENCE');
    });

    it('should checkin successfully within geofence', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('Idempotency-Key', 'chk-in-1')
        .send({
          lat: 19.076, // Exact match
          lng: 72.8777,
          timestamp: new Date().toISOString(),
          locationId,
          accuracyMeters: 10,
        });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Check-in successful');
      expect(res.body.attendance.status).toBe('PENDING');
      expect(res.body.attendance.checkInDistanceM).toBeDefined();
    });

    it('should reject duplicate checkin on same day', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('Idempotency-Key', 'chk-in-2')
        .send({
          lat: 19.076,
          lng: 72.8777,
          timestamp: new Date().toISOString(),
          locationId,
          accuracyMeters: 10,
        });
      expect(res.status).toBe(409); // Conflict - already checked in
    });
  });

  describe('GET /api/v1/attendance/today', () => {
    it('should get todays attendance log', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/today')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.locationId).toBe(locationId);
    });
  });

  describe('POST /api/v1/attendance/checkout', () => {
    it('should checkout successfully', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('Idempotency-Key', 'chk-out-final')
        .send({
          lat: 19.076,
          lng: 72.8777,
          timestamp: new Date().toISOString(),
          locationId,
          accuracyMeters: 10,
        });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Check-out successful');
      expect(res.body.attendance.checkOutTime).toBeDefined();
    });

    it('should fail checkout if already checked out', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('Idempotency-Key', 'chk-out-duplicate')
        .send({
          lat: 19.076,
          lng: 72.8777,
          timestamp: new Date().toISOString(),
          locationId,
          accuracyMeters: 10,
        });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/attendance/summary', () => {
    it('should return attendance summary', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/summary')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.totalDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/attendance/history', () => {
    it('should return paginated history', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/history?page=1&limit=10')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });
  });
});
