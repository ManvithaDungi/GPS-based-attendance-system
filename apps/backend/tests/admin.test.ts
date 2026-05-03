import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import { cleanDatabase } from './helpers/database';

let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  await cleanDatabase(prisma);
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin@admin.com', passwordHash, role: 'ADMIN' },
  });
  
  const student = await prisma.user.create({
    data: { name: 'Student', email: 'student@student.com', passwordHash, role: 'STUDENT' },
  });

  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin@admin.com', password: 'password123', deviceId: 'd1' });
  adminToken = adminLogin.body.accessToken;

  const studentLogin = await request(app).post('/api/v1/auth/login').send({ email: 'student@student.com', password: 'password123', deviceId: 'd2' });
  studentToken = studentLogin.body.accessToken;
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
});

describe('Admin APIs', () => {
  const adminStubs = [
    {
      method: 'get',
      path: '/api/v1/admin/attendance',
      message: 'Get all attendance endpoint - TODO: implement',
    },
    {
      method: 'get',
      path: '/api/v1/admin/students',
      message: 'Get students endpoint - TODO: implement',
    },
    {
      method: 'get',
      path: '/api/v1/admin/students/fake-student-id/attendance',
      message: 'Get student attendance endpoint - TODO: implement',
    },
    {
      method: 'post',
      path: '/api/v1/admin/premises',
      message: 'Create premise endpoint - TODO: implement',
    },
    {
      method: 'get',
      path: '/api/v1/admin/premises',
      message: 'Get premises endpoint - TODO: implement',
    },
  ] as const;

  describe('Mounted admin stubs', () => {
    it.each(adminStubs)('$method $path should return the documented stub for admins', async ({ method, path, message }) => {
      const res = await request(app)
        [method](path)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message });
    });

    it.each(adminStubs)('$method $path should return 403 for students', async ({ method, path }) => {
      const res = await request(app)
        [method](path)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'FORBIDDEN' });
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
          password: 'password123'
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
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Validation error', details: [] });
    });

    it('should reject student creation by a student (403)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Sneaky Student',
          email: 'sneaky@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'FORBIDDEN' });
    });

    it('should update student status', async () => {
      const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
      const res = await request(app)
        .patch(`/api/v1/admin/students/${student?.id}/status`)
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
});
