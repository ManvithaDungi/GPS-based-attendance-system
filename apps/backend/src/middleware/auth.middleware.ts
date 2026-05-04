import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { getJwtSecret } from '../utils/env';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'STUDENT' | 'ADMIN';
        status: 'ACTIVE' | 'SUSPENDED';
      };
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'No token provided' });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; role: string };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not found' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(401).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Contact admin for details.'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as 'STUDENT' | 'ADMIN',
      status: user.status as 'ACTIVE' | 'SUSPENDED',
    };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Auth middleware error');
    if (error instanceof jwt.TokenExpiredError) {
       return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token expired' });
    }
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid token' });
  }
};
