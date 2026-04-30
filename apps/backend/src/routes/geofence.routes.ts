import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/geofence/nearby
 * Get nearby premises for given coordinates
 */
router.get('/nearby', authMiddleware, async (req: Request, res: Response) => {
  // TODO: Validate input query params (latitude, longitude, maxDistance)
  // TODO: Call geofence service to find nearby premises
  // TODO: Return array of nearby premises within range

  res.json({ message: 'Get nearby premises endpoint - TODO: implement' });
});

/**
 * GET /api/geofence/:premiseId
 * Get details of specific premise
 */
router.get('/:premiseId', authMiddleware, async (req: Request, res: Response) => {
  // TODO: Validate premiseId parameter
  // TODO: Query premise from database
  // TODO: Return premise details (location, radius, etc.)

  res.json({ message: 'Get premise endpoint - TODO: implement' });
});

export default router;
