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
