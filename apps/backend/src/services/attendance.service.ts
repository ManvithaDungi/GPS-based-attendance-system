import { prisma } from '../utils/prisma';
import { calculateHaversineDistance } from '../utils/haversine';
import { AttendanceStatus, Prisma, PunctualityStatus } from '@prisma/client';
import { getCachedLocation } from '../cache/geofence.cache';

export class AttendanceServiceError extends Error {
  constructor(
    message: string,
    public readonly distanceM?: number,
    public readonly allowedRadiusM?: number
  ) {
    super(message);
  }
}

interface CheckInParams {
  studentId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: Date;
}

interface CheckOutParams {
  studentId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: Date;
}

export const recordCheckIn = async ({
  studentId,
  locationId,
  latitude,
  longitude,
  accuracyMeters,
  timestamp,
}: CheckInParams) => {
  const location = await getCachedLocation(locationId);
  if (!location) throw new AttendanceServiceError('LOCATION_NOT_FOUND');

  const distance = calculateHaversineDistance(latitude, longitude, location.latitude, location.longitude);
  
  if (distance > location.radiusMeters) {
    throw new AttendanceServiceError('OUTSIDE_GEOFENCE', distance, location.radiusMeters);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingLog = await prisma.attendanceLog.findFirst({
    where: { studentId, date: today, deletedAt: null }
  });

  if (existingLog) {
    throw new AttendanceServiceError('ALREADY_CHECKED_IN');
  }

  return prisma.attendanceLog.create({
    data: {
      studentId,
      locationId,
      date: today,
      checkInTime: timestamp,
      checkInLat: latitude,
      checkInLng: longitude,
      checkInDistanceM: distance,
      checkInAccuracyM: accuracyMeters,
      status: 'PENDING',
    }
  });
};

export const recordCheckOut = async ({
  studentId,
  locationId,
  latitude,
  longitude,
  accuracyMeters,
  timestamp,
}: CheckOutParams) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const log = await prisma.attendanceLog.findFirst({
    where: { studentId, date: today, deletedAt: null }
  });

  if (!log) throw new AttendanceServiceError('NOT_CHECKED_IN');
  if (log.checkOutTime) throw new AttendanceServiceError('ALREADY_CHECKED_OUT');

  const location = await getCachedLocation(locationId);
  if (!location) throw new AttendanceServiceError('LOCATION_NOT_FOUND');

  const distance = calculateHaversineDistance(latitude, longitude, location.latitude, location.longitude);
  
  if (distance > location.radiusMeters) {
    throw new AttendanceServiceError('OUTSIDE_GEOFENCE', distance, location.radiusMeters);
  }

  const durationHours = (timestamp.getTime() - log.checkInTime!.getTime()) / (1000 * 60 * 60);

  let status: AttendanceStatus = 'PRESENT';
  let punctuality: PunctualityStatus = 'ON_TIME';

  if (location.workingHours) {
    const [startHour, startMinute] = location.workingHours.startTime.split(':').map(Number);
    const checkInDate = new Date(log.checkInTime!);
    const expectedStart = new Date(checkInDate);
    expectedStart.setHours(startHour, startMinute, 0, 0);

    const minutesLate = (checkInDate.getTime() - expectedStart.getTime()) / (1000 * 60);

    if (minutesLate > location.workingHours.lateThresholdMins) {
      punctuality = 'LATE';
      status = 'LATE';
    }

    if (durationHours < location.workingHours.minDurationHours) {
      status = 'ABSENT';
    }
  }

  return prisma.attendanceLog.update({
    where: { id: log.id },
    data: {
      checkOutTime: timestamp,
      checkOutLat: latitude,
      checkOutLng: longitude,
      checkOutDistanceM: distance,
      checkOutAccuracyM: accuracyMeters,
      durationHours,
      status,
      punctuality
    }
  });
};

export const getTodayAttendance = async (studentId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.attendanceLog.findFirst({
    where: { studentId, date: today, deletedAt: null },
    include: { location: true }
  });
};

export const getAttendanceHistory = async (studentId: string, page: number, limit: number, from?: Date, to?: Date) => {
  const where: Prisma.AttendanceLogWhereInput = { studentId, deletedAt: null };

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  const [data, total] = await Promise.all([
    prisma.attendanceLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        locationId: true,
        date: true,
        status: true,
        punctuality: true,
        checkInTime: true,
        checkOutTime: true,
        durationHours: true,
        isAutoClosed: true,
        createdAt: true,
        updatedAt: true,
      }
    }),
    prisma.attendanceLog.count({ where })
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
  };
};

export const getStudentAttendanceSummary = async (studentId: string) => {
  const logs = await prisma.attendanceLog.findMany({
    where: { studentId, deletedAt: null }
  });

  const totalDays = logs.length;
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;

  logs.forEach(log => {
    if (log.status === 'PRESENT') presentDays++;
    else if (log.status === 'ABSENT') absentDays++;
    else if (log.status === 'LATE') {
      presentDays++; // late counts as present typically
      lateDays++;
    }
  });

  const attendancePercentage = totalDays > 0 ? Number(((presentDays / totalDays) * 100).toFixed(2)) : 0;

  return { totalDays, presentDays, absentDays, lateDays, attendancePercentage };
};

export const getAllStudentsAttendance = async (date?: Date) => {
  // admin specific
};
