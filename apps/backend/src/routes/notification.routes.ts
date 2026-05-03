import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

router.get('/', authMiddleware, notificationController.getNotifications);
router.patch('/:id/read', authMiddleware, notificationController.markAsRead);

export default router;
