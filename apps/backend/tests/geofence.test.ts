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
  
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin_geo@admin.com', passwordHash, role: 'ADMIN' },
  });
  
  await prisma.user.create({
    data: { name: 'Student', email: 'student_geo@student.com', passwordHash, role: 'STUDENT' },
  });

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin_geo@admin.com',
      password: 'password123',
      deviceId: 'd1',
    });

  adminToken = adminLogin.body.accessToken;

  const studentLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'student_geo@student.com',
      password: 'password123',
      deviceId: 'd2',
    });

  studentToken = studentLogin.body.accessToken;

  const loc = await prisma.location.create({
    data: {
      name: 'Initial Location',
      latitude: 10,
      longitude: 10,
      radiusMeters: 50,
    },
  });

  locationId = loc.id;
});

afterAll(async () => {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
});

describe('Geofence APIs', () => {
  describe('GET /api/v1/geofence/validate', () => {
    it('should validate a coordinate inside the geofence', async () => {
      const res = await request(app)
        .get(`/api/v1/geofence/validate?lat=10&lng=10&locationId=${locationId}&accuracyMeters=10`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isWithinGeofence).toBe(true);
      expect(res.body.distanceM).toBeDefined();
      expect(res.body.allowedRadiusM).toBe(50);
      expect(res.body.location).toEqual({
        id: locationId,
        name: 'Initial Location',
        latitude: 10,
        longitude: 10,
      });
    });

    it('should reject low GPS accuracy', async () => {
      const res = await request(app)
        .get(`/api/v1/geofence/validate?lat=10&lng=10&locationId=${locationId}&accuracyMeters=101`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'LOW_GPS_ACCURACY',
        message: 'Device GPS accuracy is too low; location is untrustworthy',
        statusCode: 400,
      });
    });

    it('should reject invalid query params with documented low accuracy response', async () => {
      const res = await request(app)
        .get(`/api/v1/geofence/validate?lat=invalid&lng=10&locationId=${locationId}&accuracyMeters=10`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'LOW_GPS_ACCURACY',
        message: 'Device GPS accuracy is too low; location is untrustworthy',
        statusCode: 400,
      });
    });

    it('should return LOCATION_NOT_FOUND for an unknown location', async () => {
      const res = await request(app)
        .get('/api/v1/geofence/validate?lat=10&lng=10&locationId=00000000-0000-0000-0000-000000000000&accuracyMeters=10')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'LOCATION_NOT_FOUND' });
    });
  });

  describe('GET /api/v1/geofence/locations', () => {
    it('should list all locations for admin', async () => {
      const res = await request(app)
        .get('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        {
          id: locationId,
          name: 'Initial Location',
          latitude: 10,
          longitude: 10,
          radiusMeters: 50,
        },
      ]);
    });

    it('should list all locations for student', async () => {
      const res = await request(app)
        .get('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(locationId);
    });
  });

  describe('GET /api/v1/geofence/locations/:locationId', () => {
    it('should return a single location with working hours', async () => {
      const res = await request(app)
        .get(`/api/v1/geofence/locations/${locationId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: locationId,
        name: 'Initial Location',
        latitude: 10,
        longitude: 10,
        radiusMeters: 50,
        workingHours: null,
      });
    });

    it('should return LOCATION_NOT_FOUND for an unknown location', async () => {
      const res = await request(app)
        .get('/api/v1/geofence/locations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'LOCATION_NOT_FOUND' });
    });
  });

  describe('Geofence location write operations (Admin only)', () => {
    let createdLocationId: string;

    it('should create a new location (admin)', async () => {
      const res = await request(app)
        .post('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Location', latitude: 20, longitude: 20, radiusMeters: 100 });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Location created successfully');
      expect(res.body.location.name).toBe('New Location');
      expect(res.body.location.latitude).toBe(20);
      expect(res.body.location.radiusMeters).toBe(100);
      expect(res.body.location.id).toBeDefined();
      createdLocationId = res.body.location.id;
    });

    it('should reject location creation by a student (403)', async () => {
      const res = await request(app)
        .post('/api/v1/geofence/locations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Student Location', latitude: 5, longitude: 5, radiusMeters: 50 });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: 'FORBIDDEN' });
    });

    it('should update an existing location (admin)', async () => {
      const res = await request(app)
        .put(`/api/v1/geofence/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Location', radiusMeters: 200 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Location updated successfully');
      expect(res.body.location.name).toBe('Updated Location');
      expect(res.body.location.radiusMeters).toBe(200);
    });

    it('should return LOCATION_NOT_FOUND when updating unknown location', async () => {
      const res = await request(app)
        .put('/api/v1/geofence/locations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'LOCATION_NOT_FOUND' });
    });

    it('should soft-delete a location (admin)', async () => {
      const res = await request(app)
        .delete(`/api/v1/geofence/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Location deleted successfully');
    });

    it('should return LOCATION_NOT_FOUND when deleting already-deleted location', async () => {
      const res = await request(app)
        .delete(`/api/v1/geofence/locations/${createdLocationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'LOCATION_NOT_FOUND' });
    });
  });
});