import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as geofenceController from '../controllers/geofence.controller';

const router = Router();

router.get('/validate', authMiddleware, geofenceController.validateGeofence);
router.get('/locations', authMiddleware, geofenceController.getLocations);
router.get('/locations/:locationId', authMiddleware, geofenceController.getLocationById);

export default router;
