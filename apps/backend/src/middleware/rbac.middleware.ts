import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware for role-based access control
 * Ensures only users with specified roles can access the route
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}`);
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    next();
  };
};
