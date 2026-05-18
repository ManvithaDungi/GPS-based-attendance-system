import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { getRedisClient } from '../utils/redis';
import {
  createAdminLocationSchema,
  updateAdminLocationSchema,
} from '../schemas/admin-location.schemas';
import { invalidateLocationCache } from '../cache/geofence.cache';
// FIX: Import getDashboardStats from the service — do NOT define it here again.
// The old local version used prisma.location (wrong model name), counted all
// check-ins as "present" without filtering by status, and omitted absentToday
// and pendingToday entirely.
import { getDashboardStats } from '../services/attendance.service';
import { parseDateOnly } from '../utils/date';

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboard = async (req: Request, res: Response): Promise<Response> => {
  try {
    const stats = await getDashboardStats();
    return res.status(200).json(stats);
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  studentCode: z.string().optional(),
});

const updateStudentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

const updateWorkingHoursSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  lateThresholdMins: z.number().optional(),
  minDurationHours: z.number().optional(),
});

// ─── Cache helpers ────────────────────────────────────────────────────────────

const invalidateGeofenceCache = async (locationId?: string): Promise<void> => {
  try {
    if (locationId) {
      await invalidateLocationCache(locationId);
    }
  } catch {
    // Cache invalidation is best-effort; database write already succeeded.
  }
};

// ─── Students ─────────────────────────────────────────────────────────────────

export const createStudent = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = createStudentSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Validation error', details: [] });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const student = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: 'STUDENT',
        studentCode: data.studentCode ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        studentCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({ message: 'Student created successfully', student });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const updateStudentStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const studentId = z.string().min(1).parse(req.params.id);
    const data = updateStudentStatusSchema.parse(req.body);

    const student = await prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
    });

    if (!student) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Student not found' });
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: { status: data.status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        studentCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ message: 'Student status updated', student: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getAllStudents = async (req: Request, res: Response): Promise<Response> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          studentCode: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
    ]);

    return res.status(200).json({
      data: students,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getStudentAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const studentId = req.params.studentId;
    const querySchema = z.object({
      page: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.coerce.number().int().positive().optional()),
      limit: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.coerce.number().int().positive().optional()),
    });
    const query = querySchema.parse(req.query);
    const page = query.page ?? 1;
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const skip = (page - 1) * limit;

    const [attendance, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: { studentId, deletedAt: null }, // FIX: was missing deletedAt filter
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          location: { select: { name: true } },
        },
      }),
      prisma.attendanceLog.count({ where: { studentId, deletedAt: null } }),
    ]);

    return res.status(200).json({
      data: attendance,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export const getAllAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const querySchema = z.object({
      page: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.coerce.number().int().positive().optional()),
      limit: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.coerce.number().int().positive().optional()),
      from: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().min(1).optional()),
      to: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().min(1).optional()),
      status: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.enum(['PRESENT', 'ABSENT', 'LATE', 'PENDING']).optional()),
      studentId: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.string().uuid().optional()),
    });

    const query = querySchema.parse(req.query);

    const page = query.page ?? 1;
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    const normalizeDateOnly = (value: string): Date => parseDateOnly(value);

    const dateFilter =
      query.from || query.to
        ? {
            ...(query.from ? { gte: normalizeDateOnly(query.from) } : {}),
            ...(query.to ? { lte: normalizeDateOnly(query.to) } : {}),
          }
        : undefined;

    const where = {
      deletedAt: null as Date | null,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
    };

    const [attendance, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where, // supports deletedAt + optional from/to date filtering
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          student: { select: { name: true, studentCode: true } },
          location: { select: { name: true } },
        },
      }),
      prisma.attendanceLog.count({ where }), // count must match query filter
    ]);

    return res.status(200).json({
      data: attendance,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    if (error instanceof Error && error.message === 'INVALID_DATE') {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: [{ message: 'Invalid from/to date' }] });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const getReports = async (req: Request, res: Response): Promise<Response> => {
  try {
    const reportJobs = await prisma.reportJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return res.status(200).json({ data: reportJobs });
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

// ─── Config / Locations ───────────────────────────────────────────────────────

export const getConfig = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locations = await prisma.location.findMany({
      where: { deletedAt: null }, // FIX: was returning soft-deleted locations
      include: { workingHours: true },
    });
    return res.status(200).json({ data: locations });
  } catch {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const createLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = createAdminLocationSchema.parse(req.body);

    const location = await prisma.location.create({
      data: {
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        radiusMeters: data.radiusMeters,
        workingHours: {
          create: {
            startTime: '09:00',
            endTime: '17:00',
            lateThresholdMins: 15,
            minDurationHours: 6,
          },
        },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        createdAt: true,
      },
    });

    await invalidateGeofenceCache();

    return res.status(201).json({ message: 'Location created successfully', location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const updateLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locationId = z.string().min(1).parse(req.params.locationId);
    const data = updateAdminLocationSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'At least one location field must be provided',
      });
    }

    const existing = await prisma.location.findFirst({
      where: { id: locationId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }

    const location = await prisma.location.update({
      where: { id: locationId },
      data,
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        updatedAt: true,
      },
    });

    await invalidateGeofenceCache(locationId);

    return res.status(200).json({ message: 'Location updated successfully', location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const deleteLocation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locationId = z.string().min(1).parse(req.params.locationId);

    const existing = await prisma.location.findFirst({
      where: { id: locationId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }

    await prisma.location.update({
      where: { id: locationId },
      data: { deletedAt: new Date() },
    });

    await invalidateGeofenceCache(locationId);

    return res.status(200).json({ message: 'Location deleted successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const updateWorkingHours = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locationId = req.params.locationId;
    const data = updateWorkingHoursSchema.parse(req.body);

    const location = await prisma.location.findFirst({
      where: { id: locationId, deletedAt: null },
      select: { id: true },
    });
    if (!location) {
      return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
    }

    const updated = await prisma.workingHours.upsert({
      where: { locationId },
      update: data,
      create: {
        locationId,
        startTime: data.startTime ?? '09:00',
        endTime: data.endTime ?? '17:00',
        lateThresholdMins: data.lateThresholdMins ?? 15,
        minDurationHours: data.minDurationHours ?? 6,
      },
    });

    await invalidateGeofenceCache(locationId);

    return res.status(200).json({ message: 'Working hours updated', data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};