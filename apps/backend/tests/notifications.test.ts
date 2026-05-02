import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import { cleanDatabase } from './helpers/database';

let token: string;

beforeAll(async () => {
  await cleanDatabase(prisma);
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const student = await prisma.user.create({
    data: { name: 'Student', email: 'student_notif@student.com', passwordHash, role: 'STUDENT' },
  });

  const login = await request(app).post('/api/v1/auth/login').send({ email: 'student_notif@student.com', password: 'password123', deviceId: 'd2' });
  token = login.body.accessToken;
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
});

describe('Notifications APIs', () => {
  describe('GET /api/v1/notifications', () => {
    it('should return 404 because the notifications route group is not mounted', async () => {
      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should return 404 because the notifications route group is not mounted', async () => {
      const res = await request(app)
        .patch('/api/v1/notifications/fake-id/read')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
