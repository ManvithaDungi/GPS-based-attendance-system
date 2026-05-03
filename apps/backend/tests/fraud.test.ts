import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import { cleanDatabase } from './helpers/database';

let adminToken: string;

beforeAll(async () => {
  await cleanDatabase(prisma);
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin_fraud@admin.com', passwordHash, role: 'ADMIN' },
  });

  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin_fraud@admin.com', password: 'password123', deviceId: 'd1' });
  adminToken = adminLogin.body.accessToken;
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
});

describe('Fraud Log APIs', () => {
  describe('GET /api/v1/fraud', () => {
    it('should return 404 because the fraud route group is not mounted', async () => {
      const res = await request(app)
        .get('/api/v1/fraud')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
