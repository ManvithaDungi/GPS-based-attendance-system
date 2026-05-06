import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import { closeRedis } from '../src/utils/redis';
import bcrypt from 'bcrypt';
import { cleanDatabase } from './helpers/database';

let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  await cleanDatabase(prisma);

  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@admin.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  await prisma.user.create({
    data: {
      name: 'Student',
      email: 'student@student.com',
      passwordHash,
      role: 'STUDENT',
    },
  });

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin@admin.com',
      password: 'password123',
      deviceId: 'd1',
    });

  adminToken = adminLogin.body.accessToken;

  const studentLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'student@student.com',
      password: 'password123',
      deviceId: 'd2',
    });

  studentToken = studentLogin.body.accessToken;
});

afterAll(async () => {
  await closeRedis();
  await prisma.$disconnect();
});

describe('Admin APIs', () => {
  describe('Admin dashboard and lists', () => {
    it('GET /api/v1/admin/attendance should return 200 and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/attendance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/admin/students should return 200 and pagination', async () => {
      const res = await request(app)
        .get('/api/v1/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/admin/students/:studentId/attendance should return 200', async () => {
      const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });

      if (!student) throw new Error('Test setup failed: student not found');

      const res = await request(app)
        .get(`/api/v1/admin/students/${student.id}/attendance`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/admin/dashboard should return 200 and stats', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalStudents');
    });

    it('GET /api/v1/admin/config should return 200', async () => {
      const res = await request(app)
        .get('/api/v1/admin/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should return 403 for students accessing admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Admin student-management routes', () => {
    it('should create a new student successfully as admin', async () => {
      const res = await request(app)
        .post('/api/v1/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Student',
          email: 'newstudent@example.com',
          studentCode: 'STU001',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Student created successfully');
      expect(res.body.student.name).toBe('New Student');
      expect(res.body.student.email).toBe('newstudent@example.com');
      expect(res.body.student.role).toBe('STUDENT');
      expect(res.body.student.status).toBe('ACTIVE');
      expect(res.body.student.studentCode).toBe('STU001');
    });

    it('should fail to create student with duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Student',
          email: 'newstudent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject student creation by a student (403)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Sneaky Student',
          email: 'sneaky@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('FORBIDDEN');
    });

    it('should update student status', async () => {
      const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });

      if (!student) throw new Error('Test setup failed: student not found');

      const res = await request(app)
        .patch(`/api/v1/admin/students/${student.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Student status updated');
      expect(res.body.student.status).toBe('SUSPENDED');
    });

    it('should return NOT_FOUND for non-existent student status update', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/students/00000000-0000-0000-0000-000000000000/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });
  });

  describe('Admin location-management routes', () => {
    let createdLocationId: string;

    it('should create a location with default working hours', async () => {
      const res = await request(app)
        .post('/api/v1/admin/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Campus A',
          latitude: 17.7324,
          longitude: 83.3213,
          radiusMeters: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Location created successfully');
      expect(res.body.location).toMatchObject({
        name: 'Campus A',
        latitude: 17.7324,
        longitude: 83.3213,
        radiusMeters: 100,
      });
      expect(res.body.location.id).toBeDefined();
      expect(res.body.location.createdAt).toBeDefined();

      createdLocationId = res.body.location.id;

      const workingHours = await prisma.workingHours.findUnique({
        where: { locationId: createdLocationId },
      });

      expect(workingHours).toMatchObject({
        startTime: '09:00',
        endTime: '17:00',
        lateThresholdMins: 15,
        minDurationHours: 6,
      });
    });

    it('should reject invalid location creation input', async () => {
      const res = await request(app)
        .post('/api/v1/admin/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          latitude: 91,
          longitude: 83.3213,
          radiusMeters: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.details).toBeDefined();
    });

    it('should update an active location', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Campus A Updated',
          radiusMeters: 150,
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Location updated successfully');
      expect(res.body.location).toMatchObject({
        id: createdLocationId,
        name: 'Campus A Updated',
        latitude: 17.7324,
        longitude: 83.3213,
        radiusMeters: 150,
      });
      expect(res.body.location.updatedAt).toBeDefined();
    });

    it('should reject location updates with no updatable fields', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should soft-delete a location', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Location deleted successfully');

      const location = await prisma.location.findUnique({ where: { id: createdLocationId } });
      expect(location?.deletedAt).not.toBeNull();
    });

    it('should return LOCATION_NOT_FOUND for soft-deleted locations', async () => {
      const updateRes = await request(app)
        .patch(`/api/v1/admin/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ radiusMeters: 200 });

      expect(updateRes.status).toBe(404);
      expect(updateRes.body.error).toBe('LOCATION_NOT_FOUND');

      const deleteRes = await request(app)
        .delete(`/api/v1/admin/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(404);
      expect(deleteRes.body.error).toBe('LOCATION_NOT_FOUND');
    });
  });
});
