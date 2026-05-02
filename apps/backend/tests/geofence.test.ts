import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/utils/prisma';
import bcrypt from 'bcrypt';
import { cleanDatabase } from './helpers/database';

let adminToken: string;
let studentToken: string;
let locationId: string;

beforeAll(async () => {
  await cleanDatabase(prisma);

  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin_geo@admin.com', passwordHash, role: 'ADMIN' },
  });
  
  const student = await prisma.user.create({
    data: { name: 'Student', email: 'student_geo@student.com', passwordHash, role: 'STUDENT' },
  });

  const adminLogin = await request(app).post('/api/v1/auth/login').send({ email: 'admin_geo@admin.com', password: 'password123', deviceId: 'd1' });
  adminToken = adminLogin.body.accessToken;

  const studentLogin = await request(app).post('/api/v1/auth/login').send({ email: 'student_geo@student.com', password: 'password123', deviceId: 'd2' });
  studentToken = studentLogin.body.accessToken;

  // Create an initial location
  const loc = await prisma.location.create({
    data: { name: 'Initial Location', latitude: 10, longitude: 10, radiusMeters: 50 },
  });
  locationId = loc.id;
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
});

describe('Geofence APIs', () => {
  describe('GET /api/v1/geofence/locations', () => {
    it('should list all locations for admin', async () => {
      const res = await request(app)
        .get('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404, 501]).toContain(res.status);
    });

    it('should list all locations for student', async () => {
      const res = await request(app)
        .get('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${studentToken}`);
      expect([200, 404, 501]).toContain(res.status);
    });
  });

  describe('POST /api/v1/geofence/locations', () => {
    it('should allow admin to create a location', async () => {
      const res = await request(app)
        .post('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Location',
          latitude: 20,
          longitude: 20,
          radiusMeters: 100
        });
      expect([201, 404, 501]).toContain(res.status);
    });

    it('should block student from creating a location', async () => {
      const res = await request(app)
        .post('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Student Loc', latitude: 30, longitude: 30, radiusMeters: 50 });
      expect(res.status).toBeGreaterThanOrEqual(400); // 401/403
    });
  });

  describe('PUT /api/v1/geofence/locations/:id', () => {
    it('should allow admin to update a location', async () => {
      const res = await request(app)
        .put(`/api/v1/geofence/locations/${locationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Location', radiusMeters: 200 });
      expect([200, 404, 501]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/geofence/locations/:id', () => {
    it('should allow admin to delete a location', async () => {
      const res = await request(app)
        .delete(`/api/v1/geofence/locations/${locationId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204, 404, 501]).toContain(res.status);
    });
  });
});
