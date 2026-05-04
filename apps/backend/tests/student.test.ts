import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import { cleanDatabase } from './helpers/database';

let studentToken: string;

beforeAll(async () => {
  await cleanDatabase(prisma);
  const passwordHash = await bcrypt.hash('password123', 10);
  
  await prisma.user.create({
    data: { name: 'Student', email: 'student_dash@student.com', passwordHash, role: 'STUDENT' },
  });

  const studentLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'student_dash@student.com',
      password: 'password123',
      deviceId: 'd2',
    });

  studentToken = studentLogin.body.accessToken;
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
});

describe('Student APIs', () => {
  describe('GET /api/v1/student/dashboard', () => {
    it('should return 200 and the student dashboard data', async () => {
      const res = await request(app)
        .get('/api/v1/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todayAttendance');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('unreadNotificationsCount');
    });
  });
});