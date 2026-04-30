import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware for role-based access control
 * Ensures only users with specified roles can access the route
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // TODO: Check if user role is in allowed roles
    // TODO: Return 403 if not allowed
    // TODO: Call next() if allowed

    next();
  };
};
