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
    where: { studentId, date: today, deletedAt: null },
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
    },
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
    where: { studentId, date: today, deletedAt: null },
  });

  if (!log) throw new AttendanceServiceError('NOT_CHECKED_IN');
  if (log.checkOutTime) throw new AttendanceServiceError('ALREADY_CHECKED_OUT');

  const location = await getCachedLocation(locationId);
  if (!location) throw new AttendanceServiceError('LOCATION_NOT_FOUND');

  const distance = calculateHaversineDistance(latitude, longitude, location.latitude, location.longitude);

  if (distance > location.radiusMeters) {
    throw new AttendanceServiceError('OUTSIDE_GEOFENCE', distance, location.radiusMeters);
  }

  if (!log.checkInTime) {
    throw new AttendanceServiceError('INVALID_STATE');
  }

  if (timestamp.getTime() <= log.checkInTime.getTime()) {
    throw new AttendanceServiceError('INVALID_TIMESTAMP');
  }

  const durationHours = (timestamp.getTime() - log.checkInTime.getTime()) / (1000 * 60 * 60);

  // Default to ABSENT, only upgrade to PRESENT/LATE if duration is sufficient
  let status: AttendanceStatus = 'ABSENT';
  let punctuality: PunctualityStatus = 'ON_TIME';

  if (location.workingHours) {
    const [startHour, startMinute] = location.workingHours.startTime.split(':').map(Number);
    const checkInDate = new Date(log.checkInTime!);
    const expectedStart = new Date(checkInDate);
    expectedStart.setHours(startHour, startMinute, 0, 0);

    const minutesLate = (checkInDate.getTime() - expectedStart.getTime()) / (1000 * 60);

    if (durationHours < location.workingHours.minDurationHours) {
      status = 'ABSENT';
    } else if (minutesLate > location.workingHours.lateThresholdMins) {
      punctuality = 'LATE';
      status = 'LATE';
    } else {
      status = 'PRESENT';
    }
  } else {
    // No working hours configured — require a sensible fallback minimum
    status = durationHours >= 6 ? 'PRESENT' : 'ABSENT';
  }

  return prisma.attendanceLog.update({
    where: { id: log.id },
    data: {
      locationId,
      checkOutTime: timestamp,
      checkOutLat: latitude,
      checkOutLng: longitude,
      checkOutDistanceM: distance,
      checkOutAccuracyM: accuracyMeters,
      durationHours,
      status,
      punctuality,
    },
  });
};

export const getTodayAttendance = async (studentId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.attendanceLog.findFirst({
    where: { studentId, date: today, deletedAt: null },
    include: { location: true },
  });
};

export const getAttendanceHistory = async (
  studentId: string,
  page: number,
  limit: number,
  from?: Date,
  to?: Date
) => {
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
      },
    }),
    prisma.attendanceLog.count({ where }),
  ]);

  return {
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};

export const getStudentAttendanceSummary = async (studentId: string) => {
  const logs = await prisma.attendanceLog.findMany({
    where: { studentId, deletedAt: null },
  });

  // FIX: Exclude PENDING records from the denominator.
  // A student who checked in today but hasn't checked out yet should not
  // have their attendance percentage diluted by an unresolved record.
  const resolved = logs.filter(log => log.status !== 'PENDING');
  const totalDays = resolved.length;

  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;

  resolved.forEach(log => {
    if (log.status === 'PRESENT') {
      presentDays++;
    } else if (log.status === 'ABSENT') {
      absentDays++;
    } else if (log.status === 'LATE') {
      presentDays++; // LATE counts as present for percentage
      lateDays++;
    }
  });

  const attendancePercentage =
    totalDays > 0 ? Number(((presentDays / totalDays) * 100).toFixed(2)) : 0;

  return { totalDays, presentDays, absentDays, lateDays, attendancePercentage };
};

export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalStudents,
    presentToday,
    lateToday,
    absentToday,
    pendingToday,
    totalLocations,
  ] = await Promise.all([
    // Exclude soft-deleted users
    prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
    // Each status counted independently — never derived from one another
    prisma.attendanceLog.count({ where: { date: today, status: 'PRESENT', deletedAt: null } }),
    prisma.attendanceLog.count({ where: { date: today, status: 'LATE',    deletedAt: null } }),
    prisma.attendanceLog.count({ where: { date: today, status: 'ABSENT',  deletedAt: null } }),
    // PENDING = checked in but not yet checked out
    prisma.attendanceLog.count({ where: { date: today, status: 'PENDING', deletedAt: null } }),
    prisma.location.count({ where: { deletedAt: null } }),
  ]);

  return {
    totalStudents,
    presentToday,  // only PRESENT
    lateToday,     // only LATE
    absentToday,   // only ABSENT — never totalStudents - presentToday
    pendingToday,  // checked in, awaiting checkout
    totalLocations,
  };
};