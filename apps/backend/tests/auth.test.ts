import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cleanDatabase } from './helpers/database';

let adminToken: string;
let studentToken: string;
let adminRefreshToken: string;
let studentId: string;

beforeAll(async () => {
  await cleanDatabase(prisma);
});

afterAll(async () => {
  await cleanDatabase(prisma);
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
      expect(res.body).toEqual({
        error: 'FORBIDDEN',
        message: 'Only ADMIN role can self-register. Students must be added by an admin.',
      });
    });

    it('should fail on missing fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid@example.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
      expect(res.body.details).toBeInstanceOf(Array);
    });

    it('should fail with documented validation response for duplicate email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Test Admin Duplicate',
        email: 'testadmin@example.com',
        password: 'password123',
        role: 'ADMIN',
      });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Validation error', details: [] });
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
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
    });

    it('should fail with documented response for a suspended account', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          name: 'Suspended User',
          email: 'suspended@example.com',
          passwordHash,
          role: 'STUDENT',
          status: 'SUSPENDED',
        },
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'suspended@example.com',
        password: 'password123',
        deviceId: 'device-suspended',
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Contact admin for details.',
      });
    });

    it('should delete previous sessions when a student logs in again', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const student = await prisma.user.create({
        data: {
          name: 'Session Student',
          email: 'session-student@example.com',
          passwordHash,
          role: 'STUDENT',
        },
      });

      await prisma.session.create({
        data: {
          userId: student.id,
          refreshToken: 'old-refresh-token',
          deviceId: 'old-device',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'session-student@example.com',
        password: 'password123',
        deviceId: 'new-device',
      });

      const sessions = await prisma.session.findMany({ where: { userId: student.id } });

      expect(res.status).toBe(200);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].deviceId).toBe('new-device');
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
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' });
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
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'No token provided' });
    });

    it('should fail with 403 for a tampered token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'FORBIDDEN', message: 'Invalid token' });
    });

    it('should fail with 401 for an expired token', async () => {
      const token = jwt.sign(
        { userId: '00000000-0000-0000-0000-000000000000', role: 'STUDENT' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Token expired' });
    });

    it('should fail with 401 for a token whose user no longer exists', async () => {
      const token = jwt.sign(
        { userId: '00000000-0000-0000-0000-000000000000', role: 'STUDENT' },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'User not found' });
    });

    it('should fail with 401 for a suspended user token', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const suspended = await prisma.user.create({
        data: {
          name: 'Suspended Token User',
          email: 'suspended-token@example.com',
          passwordHash,
          role: 'STUDENT',
          status: 'SUSPENDED',
        },
      });
      const token = jwt.sign(
        { userId: suspended.id, role: 'STUDENT' },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Contact admin for details.',
      });
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
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Current password is incorrect' });
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

    it('should not delete another user session when given another user refresh token', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      await prisma.user.createMany({
        data: [
          {
            name: 'Logout Owner',
            email: 'logout-owner@example.com',
            passwordHash,
            role: 'ADMIN',
          },
          {
            name: 'Logout Other',
            email: 'logout-other@example.com',
            passwordHash,
            role: 'ADMIN',
          },
        ],
      });

      const ownerLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'logout-owner@example.com',
        password: 'password123',
        deviceId: 'logout-owner-device',
      });
      const otherLogin = await request(app).post('/api/v1/auth/login').send({
        email: 'logout-other@example.com',
        password: 'password123',
        deviceId: 'logout-other-device',
      });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${ownerLogin.body.accessToken}`)
        .send({ refreshToken: otherLogin.body.refreshToken });
      const otherSession = await prisma.session.findUnique({
        where: { refreshToken: otherLogin.body.refreshToken },
      });

      expect(res.status).toBe(200);
      expect(otherSession).not.toBeNull();
    });
  });
});
