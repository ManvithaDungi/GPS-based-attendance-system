import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getFraudLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const fraudLogs = await prisma.fraudLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true, studentCode: true } }
      }
    });

    const total = await prisma.fraudLog.count();

    res.json({
      data: fraudLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error('[Fraud Controller] getFraudLogs error:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
  }
};
