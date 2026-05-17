import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { calculateHaversineDistance } from '../utils/haversine';
import { logger } from '../utils/logger';

/**
 * Fraud detection worker.
 * Runs after every check-in and check-out event.
 * Checks: velocity anomaly, device mismatch, distance anomaly.
 * Writes results to FraudLog table. Never crashes the main process.
 */
export const createFraudWorker = () => {
  const worker = new Worker(
    'attendance-events',
    async (job: Job) => {
      const { logId, studentId, locationId, latitude, longitude, distanceM, timestamp } = job.data;

      const riskFactors: string[] = [];
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

      // 1. Velocity check — compare with last attendance log
      const lastLog = await prisma.attendanceLog.findFirst({
        where: {
          studentId,
          id: { not: logId },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      const lastLat = lastLog?.checkOutLat ?? lastLog?.checkInLat ?? null;
      const lastLng = lastLog?.checkOutLng ?? lastLog?.checkInLng ?? null;

      if (lastLog && lastLat != null && lastLng != null) {
        const lastTime = lastLog.checkOutTime || lastLog.checkInTime;
        if (lastTime) {
          const distanceKm = calculateHaversineDistance(
            latitude, longitude,
            lastLat, lastLng
          ) / 1000;
          const hoursDiff = (new Date(timestamp).getTime() - lastTime.getTime()) / 3600000;

          if (hoursDiff > 0) {
            const velocityKmh = distanceKm / hoursDiff;
            if (velocityKmh > 200) {
              riskFactors.push(`Impossible velocity: ${velocityKmh.toFixed(1)} km/h`);
              riskLevel = 'HIGH';
            }
          }
        }
      }

      // 2. Device mismatch check
      const user = await prisma.user.findUnique({
        where: { id: studentId },
        select: { deviceId: true },
      });
      const session = await prisma.session.findFirst({
        where: { userId: studentId },
        orderBy: { createdAt: 'desc' },
        select: { deviceId: true },
      });

      if (user?.deviceId && session?.deviceId && user.deviceId !== session.deviceId) {
        riskFactors.push(`Device mismatch: user=${user.deviceId}, session=${session.deviceId}`);
        riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
      }

      // 3. Distance anomaly — close to boundary
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { radiusMeters: true },
      });

      if (location && distanceM > location.radiusMeters * 0.8) {
        riskFactors.push(`Near boundary: ${distanceM.toFixed(1)}m / ${location.radiusMeters}m`);
        if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
      }

      // Only write if there are risk factors
      if (riskFactors.length > 0) {
        await prisma.fraudLog.create({
          data: {
            studentId,
            type: job.name, // 'checkin' or 'checkout'
            riskLevel,
            details: { factors: riskFactors, logId },
          },
        });
        logger.warn({ studentId, riskLevel, riskFactors }, 'Fraud risk detected');
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Fraud worker job failed');
  });

  return worker;
};
