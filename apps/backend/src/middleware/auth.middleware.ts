import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// TODO: Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'STUDENT' | 'ADMIN';
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // TODO: Verify JWT token
    // TODO: Extract user info from token payload
    // TODO: Attach user to req.user
    // TODO: Handle token expiry - return 401
    // TODO: Handle invalid token - return 403

    next();
  } catch (error) {
    logger.error('Auth middleware error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
