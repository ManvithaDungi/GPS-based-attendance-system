import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's attendance
    const todayAttendance = await prisma.attendanceLog.findFirst({
      where: {
        studentId,
        date: today,
        deletedAt: null,
      },
      include: {
        location: {
          select: { name: true }
        }
      }
    });

    // Get recent notifications (unread)
    const unreadNotificationsCount = await prisma.notification.count({
      where: {
        userId: studentId,
        read: false,
      }
    });

    // Get summary stats
    const totalAttendance = await prisma.attendanceLog.count({
      where: { studentId, deletedAt: null }
    });

    const presentDays = await prisma.attendanceLog.count({
      where: {
        studentId,
        status: { in: ['PRESENT', 'LATE'] },
        deletedAt: null,
      }
    });

    res.json({
      todayAttendance: todayAttendance ? {
        id: todayAttendance.id,
        locationName: todayAttendance.location.name,
        status: todayAttendance.status,
        checkInTime: todayAttendance.checkInTime,
        checkOutTime: todayAttendance.checkOutTime,
      } : null,
      stats: {
        totalDays: totalAttendance,
        presentDays: presentDays,
        attendancePercentage: totalAttendance > 0 ? (presentDays / totalAttendance) * 100 : 0
      },
      unreadNotificationsCount
    });
  } catch (error) {
    console.error('[Student Controller] getDashboard error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  }
};
