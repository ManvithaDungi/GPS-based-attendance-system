import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';

const createStudentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  studentCode: z.string().optional(),
});

const updateStudentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

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

export const getAllAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const attendance = await prisma.attendanceLog.findMany({
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        student: { select: { name: true, studentCode: true } },
        location: { select: { name: true } },
      }
    });

    const total = await prisma.attendanceLog.count();

    return res.status(200).json({
      data: attendance,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getAllStudents = async (req: Request, res: Response): Promise<Response> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const students = await prisma.user.findMany({
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
      }
    });

    const total = await prisma.user.count({ where: { role: 'STUDENT' } });

    return res.status(200).json({
      data: students,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getStudentAttendance = async (req: Request, res: Response): Promise<Response> => {
  try {
    const studentId = req.params.studentId;
    
    const attendance = await prisma.attendanceLog.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      include: {
        location: { select: { name: true } },
      }
    });

    return res.status(200).json({ data: attendance });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getDashboardStats = async (req: Request, res: Response): Promise<Response> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const todayAttendance = await prisma.attendanceLog.count({ where: { date: today } });
    const lateToday = await prisma.attendanceLog.count({ where: { date: today, punctuality: 'LATE' } });
    const totalLocations = await prisma.location.count({ where: { deletedAt: null } });

    return res.status(200).json({
      totalStudents,
      presentToday: todayAttendance,
      lateToday,
      totalLocations
    });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getReports = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Generate a simple report (in a real app, this would trigger a BullMQ job)
    const reportJobs = await prisma.reportJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    return res.status(200).json({ data: reportJobs });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getConfig = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locations = await prisma.location.findMany({
      include: { workingHours: true }
    });
    return res.status(200).json({ data: locations });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

const updateWorkingHoursSchema = z.object({
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  lateThresholdMins: z.number().optional(),
  minDurationHours: z.number().optional(),
});

export const updateWorkingHours = async (req: Request, res: Response): Promise<Response> => {
  try {
    const locationId = req.params.locationId;
    const data = updateWorkingHoursSchema.parse(req.body);

    const updated = await prisma.workingHours.upsert({
      where: { locationId },
      update: data,
      create: {
        locationId,
        startTime: data.startTime || '09:00',
        endTime: data.endTime || '17:00',
        lateThresholdMins: data.lateThresholdMins || 15,
        minDurationHours: data.minDurationHours || 6,
      }
    });

    return res.status(200).json({ message: 'Working hours updated', data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};
