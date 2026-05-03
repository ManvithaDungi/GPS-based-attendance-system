import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { cleanDatabase } from './helpers/database';

let studentToken: string;
let studentId: string;
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

const requestHash = (body: unknown) => crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

const waitForIdempotencyResponse = async (key: string, userId: string) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const record = await prisma.idempotencyRecord.findUnique({
      where: { key_userId: { key, userId } },
    });
    if (record?.responseData) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const waitForIdempotencyDeletion = async (key: string, userId: string) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const record = await prisma.idempotencyRecord.findUnique({
      where: { key_userId: { key, userId } },
    });
    if (!record) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

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
      expect(res.body).toEqual({
        error: 'STALE_TIMESTAMP',
        message: 'Timestamp is older than 30 seconds',
      });
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
      expect(res.body).toEqual({
        error: 'LOW_GPS_ACCURACY',
        message: 'Device GPS accuracy is too low; location is untrustworthy',
        statusCode: 400,
      });
    });

    it('should return LOCATION_NOT_FOUND for missing location', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          lat: 19.076,
          lng: 72.8777,
          timestamp: new Date().toISOString(),
          locationId: '00000000-0000-0000-0000-000000000000',
          accuracyMeters: 10,
        });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'LOCATION_NOT_FOUND' });
    });

    it('should reject unauthenticated checkin', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .send({
          lat: 19.076,
          lng: 72.8777,
          timestamp: new Date().toISOString(),
          locationId,
          accuracyMeters: 10,
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'No token provided' });
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
      expect(res.body).toEqual({ error: 'DUPLICATE_ATTENDANCE' });
    });

    it('should return NOT_FOUND when checking out before checking in', async () => {
      const { token } = await createStudentAndLogin();
      const loc = await createLocation();

      const res = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'NOT_FOUND' });
    });

    it('should reject checkout outside geofence', async () => {
      const { token } = await createStudentAndLogin();
      const loc = await createLocation();

      await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      const res = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: 19,
          lng: 72,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('OUTSIDE_GEOFENCE');
      expect(res.body.distanceM).toBeDefined();
      expect(res.body.allowedRadiusM).toBe(loc.radiusMeters);
    });

    it('should reject low GPS accuracy on checkout', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/checkout')
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

    it('should calculate PRESENT and ON_TIME from working hours', async () => {
      const { token } = await createStudentAndLogin();
      const loc = await createLocation({
        startTime: timeStringMinutesFromNow(0),
        lateThresholdMins: 15,
        minDurationHours: 0,
      });

      await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      const res = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.attendance.status).toBe('PRESENT');
      expect(res.body.attendance.punctuality).toBe('ON_TIME');
    });

    it('should calculate LATE status and punctuality from working hours', async () => {
      const { token } = await createStudentAndLogin();
      const loc = await createLocation({
        startTime: timeStringMinutesFromNow(-30),
        lateThresholdMins: 1,
        minDurationHours: 0,
      });

      await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      const res = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.attendance.status).toBe('LATE');
      expect(res.body.attendance.punctuality).toBe('LATE');
    });

    it('should calculate ABSENT when duration is below minimum hours', async () => {
      const { token } = await createStudentAndLogin();
      const loc = await createLocation({
        startTime: timeStringMinutesFromNow(0),
        lateThresholdMins: 15,
        minDurationHours: 1,
      });

      await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      const res = await request(app)
        .post('/api/v1/attendance/checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({
          lat: loc.latitude,
          lng: loc.longitude,
          timestamp: new Date().toISOString(),
          locationId: loc.id,
          accuracyMeters: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.attendance.status).toBe('ABSENT');
      expect(res.body.attendance.punctuality).toBe('ON_TIME');
    });
  });

  describe('Idempotency middleware', () => {
    it('should replay the stored response for the same key and payload', async () => {
      const { user, token } = await createStudentAndLogin();
      const loc = await createLocation();
      const body = {
        lat: loc.latitude,
        lng: loc.longitude,
        timestamp: new Date().toISOString(),
        locationId: loc.id,
        accuracyMeters: 10,
      };
      const key = 'replay-key';

      const first = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(body);
      await waitForIdempotencyResponse(key, user.id);
      const second = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(body);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body).toEqual(first.body);
    });

    it('should reject the same key with a different payload', async () => {
      const { user, token } = await createStudentAndLogin();
      const loc = await createLocation();
      const key = 'different-payload-key';
      const body = {
        lat: loc.latitude,
        lng: loc.longitude,
        timestamp: new Date().toISOString(),
        locationId: loc.id,
        accuracyMeters: 10,
      };

      const first = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(body);
      await waitForIdempotencyResponse(key, user.id);
      const second = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send({ ...body, accuracyMeters: 11 });

      expect(first.status).toBe(200);
      expect(second.status).toBe(400);
      expect(second.body).toEqual({ error: 'Idempotency key reused with different payload' });
    });

    it('should return 409 when the same key is already in-flight', async () => {
      const { user, token } = await createStudentAndLogin();
      const loc = await createLocation();
      const key = 'in-flight-key';
      const body = {
        lat: loc.latitude,
        lng: loc.longitude,
        timestamp: new Date().toISOString(),
        locationId: loc.id,
        accuracyMeters: 10,
      };
      await prisma.idempotencyRecord.create({
        data: {
          key,
          userId: user.id,
          endpoint: '/api/v1/attendance/checkin',
          requestHash: requestHash(body),
        },
      });

      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(body);

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Request is already being processed' });
    });

    it('should delete failed idempotency records so failed requests can be retried', async () => {
      const { user, token } = await createStudentAndLogin();
      const loc = await createLocation();
      const key = 'failed-cleanup-key';
      const body = {
        lat: 19,
        lng: 72,
        timestamp: new Date().toISOString(),
        locationId: loc.id,
        accuracyMeters: 10,
      };

      const res = await request(app)
        .post('/api/v1/attendance/checkin')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(body);
      await waitForIdempotencyDeletion(key, user.id);
      const record = await prisma.idempotencyRecord.findUnique({
        where: { key_userId: { key, userId: user.id } },
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('OUTSIDE_GEOFENCE');
      expect(record).toBeNull();
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

    it('should reject invalid date filters with VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/history?from=not-a-date')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeInstanceOf(Array);
    });

    it('should reject invalid pagination params with VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/history?page=0&limit=not-a-number')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeInstanceOf(Array);
    });
  });
});
