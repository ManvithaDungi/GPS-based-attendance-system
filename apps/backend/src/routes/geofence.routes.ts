import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import * as geofenceController from '../controllers/geofence.controller';

const router = Router();

router.get('/validate', authMiddleware, geofenceController.validateGeofence);
router.get('/locations', authMiddleware, geofenceController.getLocations);
router.get('/locations/:locationId', authMiddleware, geofenceController.getLocationById);

// Admin-only location write operations
router.post('/locations', authMiddleware, requireRole('ADMIN'), geofenceController.createLocation);
router.put('/locations/:locationId', authMiddleware, requireRole('ADMIN'), geofenceController.updateLocation);
router.delete('/locations/:locationId', authMiddleware, requireRole('ADMIN'), geofenceController.deleteLocation);

export default router;
