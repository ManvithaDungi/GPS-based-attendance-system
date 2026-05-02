import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';

let adminToken: string;
let studentToken: string;
let adminRefreshToken: string;
let studentId: string;

beforeAll(async () => {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe('Auth APIs', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new admin', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: 'password123',
        role: 'ADMIN',
      });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Admin registered successfully');
    });

    it('should fail if role is not ADMIN', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test Student',
        email: 'teststudent@example.com',
        password: 'password123',
        role: 'STUDENT',
      });
      expect(res.status).toBe(403);
    });

    it('should fail on missing fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid@example.com',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login the admin', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'testadmin@example.com',
        password: 'password123',
        deviceId: 'device-admin',
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      adminToken = res.body.accessToken;
      adminRefreshToken = res.body.refreshToken;
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'testadmin@example.com',
        password: 'wrongpassword',
        deviceId: 'device-admin',
      });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should issue a new token given a valid refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: adminRefreshToken,
      });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      adminToken = res.body.accessToken; // Update with new valid access token
      adminRefreshToken = res.body.refreshToken;
    });

    it('should fail on invalid refresh token', async () => {
      const res = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid_token',
      });
     expect([401, 403]).toContain(res.status);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('testadmin@example.com');
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/auth/me/fcm-token', () => {
    it('should update FCM token', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me/fcm-token')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fcmToken: 'new_token_123' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('FCM token updated');
    });
  });

  describe('PATCH /api/v1/auth/me/password', () => {
    it('should change password successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        });
      expect(res.status).toBe(200);
    });

    it('should fail to change password with wrong current password', async () => {
      const res = await request(app)
        .patch('/api/v1/auth/me/password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newerpassword123',
        });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ refreshToken: adminRefreshToken });
      expect(res.status).toBe(200);
    });
  });
});
