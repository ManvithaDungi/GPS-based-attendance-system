import { Request, Response } from 'express';
import { z } from 'zod';
import * as attendanceService from '../services/attendance.service';
import { AttendanceStatus, PunctualityStatus } from '@prisma/client';
import { emitCheckIn, emitCheckOut } from '../queues/emitter';

const checkInSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string().datetime(),
  locationId: z.string().uuid(),
  accuracyMeters: z.number(),
});

const checkOutSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string().datetime(),
  locationId: z.string().uuid(),
  accuracyMeters: z.number(),
});

const positiveIntegerQueryParam = z.preprocess((value) => {
  if (Array.isArray(value)) return value[0];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') return value;
  return Number(value);
}, z.number().int().positive().optional());

const dateQueryParam = z.preprocess((value) => {
  if (Array.isArray(value)) return value[0];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date;
}, z.date().optional());

const historyQuerySchema = z.object({
  page: positiveIntegerQueryParam.default(1),
  limit: positiveIntegerQueryParam.default(10),
  from: dateQueryParam,
  to: dateQueryParam,
});

interface AttendanceRecordResponse {
  id: string;
  locationId: string;
  date: Date;
  status: AttendanceStatus;
  punctuality: PunctualityStatus | null;
  checkInTime: Date | null;
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkInDistanceM?: number | null;
  checkInAccuracyM?: number | null;
  checkOutTime?: Date | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkOutDistanceM?: number | null;
  checkOutAccuracyM?: number | null;
  durationHours?: number | null;
  isAutoClosed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const formatCheckInAttendance = (log: AttendanceRecordResponse) => ({
  id: log.id,
  locationId: log.locationId,
  date: formatDateOnly(log.date),
  checkInTime: log.checkInTime,
  checkInLat: log.checkInLat ?? null,
  checkInLng: log.checkInLng ?? null,
  checkInDistanceM: log.checkInDistanceM ?? null,
  checkInAccuracyM: log.checkInAccuracyM ?? null,
  status: log.status,
  punctuality: log.punctuality,
});

const formatCheckOutAttendance = (log: AttendanceRecordResponse) => ({
  id: log.id,
  locationId: log.locationId,
  date: formatDateOnly(log.date),
  checkInTime: log.checkInTime,
  checkInLat: log.checkInLat ?? null,
  checkInLng: log.checkInLng ?? null,
  checkInDistanceM: log.checkInDistanceM ?? null,
  checkInAccuracyM: log.checkInAccuracyM ?? null,
  checkOutTime: log.checkOutTime ?? null,
  checkOutLat: log.checkOutLat ?? null,
  checkOutLng: log.checkOutLng ?? null,
  checkOutDistanceM: log.checkOutDistanceM ?? null,
  checkOutAccuracyM: log.checkOutAccuracyM ?? null,
  durationHours: log.durationHours ?? null,
  status: log.status,
  punctuality: log.punctuality,
  isAutoClosed: log.isAutoClosed ?? false,
});

const formatTodayAttendance = (log: AttendanceRecordResponse) => ({
  id: log.id,
  locationId: log.locationId,
  date: formatDateOnly(log.date),
  status: log.status,
  punctuality: log.punctuality,
  checkInTime: log.checkInTime,
  checkInLat: log.checkInLat ?? null,
  checkInLng: log.checkInLng ?? null,
  checkInAccuracyM: log.checkInAccuracyM ?? null,
  checkOutTime: log.checkOutTime ?? null,
  checkOutLat: log.checkOutLat ?? null,
  checkOutLng: log.checkOutLng ?? null,
  checkOutAccuracyM: log.checkOutAccuracyM ?? null,
  durationHours: log.durationHours ?? null,
  isAutoClosed: log.isAutoClosed ?? false,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

const formatHistoryAttendance = (log: AttendanceRecordResponse) => ({
  id: log.id,
  locationId: log.locationId,
  date: formatDateOnly(log.date),
  status: log.status,
  punctuality: log.punctuality,
  checkInTime: log.checkInTime,
  checkOutTime: log.checkOutTime ?? null,
  durationHours: log.durationHours ?? null,
  isAutoClosed: log.isAutoClosed ?? false,
  createdAt: log.createdAt,
  updatedAt: log.updatedAt,
});

export const checkIn = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = checkInSchema.parse(req.body);
    const reqTimestamp = new Date(data.timestamp);
    const now = new Date();
    
    if (now.getTime() - reqTimestamp.getTime() > 30000) {
      return res.status(400).json({
        error: 'STALE_TIMESTAMP',
        message: 'Timestamp is older than 30 seconds'
      });
    }

    if (data.accuracyMeters > 100) { 
      return res.status(400).json({
        error: 'LOW_GPS_ACCURACY',
        message: 'Device GPS accuracy is too low; location is untrustworthy',
        statusCode: 400
      });
    }

    const log = await attendanceService.recordCheckIn({
      studentId: req.user!.id,
      locationId: data.locationId,
      latitude: data.lat,
      longitude: data.lng,
      accuracyMeters: data.accuracyMeters,
      timestamp: reqTimestamp,
    });

    // Emit async event for fraud detection and notifications (never blocks response)
    emitCheckIn({
      logId: log.id,
      studentId: req.user!.id,
      locationId: data.locationId,
      latitude: data.lat,
      longitude: data.lng,
      distanceM: log.checkInDistanceM ?? 0,
      accuracyMeters: data.accuracyMeters,
      timestamp: data.timestamp,
    });

    return res.status(200).json({
      message: 'Check-in successful',
      attendance: formatCheckInAttendance(log),
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error instanceof attendanceService.AttendanceServiceError) {
      if (error.message === 'LOCATION_NOT_FOUND') return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
      if (error.message === 'OUTSIDE_GEOFENCE') {
        return res.status(403).json({
          error: 'OUTSIDE_GEOFENCE',
          distanceM: error.distanceM,
          allowedRadiusM: error.allowedRadiusM,
        });
      }
      if (error.message === 'ALREADY_CHECKED_IN') return res.status(409).json({ error: 'ALREADY_CHECKED_IN' });
    }
    
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const checkOut = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = checkOutSchema.parse(req.body);
    const reqTimestamp = new Date(data.timestamp);
    const now = new Date();
    
    if (now.getTime() - reqTimestamp.getTime() > 30000) {
      return res.status(400).json({
        error: 'STALE_TIMESTAMP',
        message: 'Timestamp is older than 30 seconds'
      });
    }

    if (data.accuracyMeters > 100) {
      return res.status(400).json({
        error: 'LOW_GPS_ACCURACY',
        message: 'Device GPS accuracy is too low; location is untrustworthy',
        statusCode: 400
      });
    }

    const log = await attendanceService.recordCheckOut({
      studentId: req.user!.id,
      locationId: data.locationId,
      latitude: data.lat,
      longitude: data.lng,
      accuracyMeters: data.accuracyMeters,
      timestamp: reqTimestamp,
    });

    // Emit async event for fraud detection, stats update, and notifications
    emitCheckOut({
      logId: log.id,
      studentId: req.user!.id,
      locationId: data.locationId,
      latitude: data.lat,
      longitude: data.lng,
      distanceM: log.checkOutDistanceM ?? 0,
      accuracyMeters: data.accuracyMeters,
      durationHours: log.durationHours ?? 0,
      status: log.status,
      punctuality: log.punctuality,
      timestamp: data.timestamp,
    });

    return res.status(200).json({
      message: 'Check-out successful',
      attendance: formatCheckOutAttendance(log),
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error instanceof attendanceService.AttendanceServiceError) {
      if (error.message === 'NOT_CHECKED_IN') return res.status(404).json({ error: 'NOT_FOUND' });
      if (error.message === 'ALREADY_CHECKED_OUT') return res.status(409).json({ error: 'DUPLICATE_ATTENDANCE' });
      if (error.message === 'LOCATION_NOT_FOUND') return res.status(404).json({ error: 'LOCATION_NOT_FOUND' });
      if (error.message === 'OUTSIDE_GEOFENCE') {
        return res.status(403).json({
          error: 'OUTSIDE_GEOFENCE',
          distanceM: error.distanceM,
          allowedRadiusM: error.allowedRadiusM,
        });
      }
    }
    
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getToday = async (req: Request, res: Response): Promise<Response> => {
  try {
    const log = await attendanceService.getTodayAttendance(req.user!.id);
    if (!log) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    return res.status(200).json(formatTodayAttendance(log));
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { page, limit, from, to } = historyQuerySchema.parse(req.query);

    const result = await attendanceService.getAttendanceHistory(req.user!.id, page, limit, from, to);
    return res.status(200).json({
      data: result.data.map(formatHistoryAttendance),
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const summary = await attendanceService.getStudentAttendanceSummary(req.user!.id);
    return res.status(200).json(summary);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};
