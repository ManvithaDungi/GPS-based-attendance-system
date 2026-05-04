import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { getRedisClient } from '../src/utils/redis'; // ✅ FIX ADDED
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { cleanDatabase } from './helpers/database';

let studentToken: string;
let locationId: string;
let userCounter = 0;

const createStudentAndLogin = async () => {
  userCounter += 1;
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: `Student ${userCounter}`,
      email: `student-${userCounter}@example.com`,
      passwordHash,
      role: 'STUDENT',
    },
  });

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: user.email,
    password: 'password123',
    deviceId: `device-${userCounter}`,
  });

  return { user, token: loginRes.body.accessToken as string };
};

const createLocation = async (overrides: {
  name?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  startTime?: string;
  lateThresholdMins?: number;
  minDurationHours?: number;
} = {}) => {
  return prisma.location.create({
    data: {
      name: overrides.name ?? `Location ${Date.now()}`,
      latitude: overrides.latitude ?? 19.076,
      longitude: overrides.longitude ?? 72.8777,
      radiusMeters: overrides.radiusMeters ?? 100,
      workingHours: {
        create: {
          startTime: overrides.startTime ?? '00:00',
          endTime: '23:59',
          lateThresholdMins: overrides.lateThresholdMins ?? 15,
          minDurationHours: overrides.minDurationHours ?? 0,
        },
      },
    },
  });
};

const timeStringMinutesFromNow = (offsetMinutes: number) => {
  const date = new Date(Date.now() + offsetMinutes * 60 * 1000);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const requestHash = (body: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

const waitForIdempotencyResponse = async (key: string, userId: string) => {
  const redis = getRedisClient();
  const redisKey = `idempotency:${userId}:${key}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const data = await redis.hget(redisKey, 'responseData');
    if (data) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const waitForIdempotencyDeletion = async (key: string, userId: string) => {
  const redis = getRedisClient();
  const redisKey = `idempotency:${userId}:${key}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const exists = await redis.exists(redisKey);
    if (!exists) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

beforeAll(async () => {
  await cleanDatabase(prisma);

  const passwordHash = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'student@example.com',
      passwordHash,
      role: 'STUDENT',
    },
  });

  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'student@example.com',
    password: 'password123',
    deviceId: 'device1',
  });

  studentToken = loginRes.body.accessToken;

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
          lat: 19.0,
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
          lat: 19.076,
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

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'ALREADY_CHECKED_IN' });
    });

    it('should reject stale timestamp with STALE_TIMESTAMP', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          lat: 19.076,
          lng: 72.8777,
          timestamp: new Date(Date.now() - 31_000).toISOString(),
          locationId,
          accuracyMeters: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('STALE_TIMESTAMP');
    });

    it('should reject low GPS accuracy with LOW_GPS_ACCURACY', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          lat: 19.076,
          lng: 72.8777,
          timestamp: new Date().toISOString(),
          locationId,
          accuracyMeters: 101,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('LOW_GPS_ACCURACY');
    });
  });
});