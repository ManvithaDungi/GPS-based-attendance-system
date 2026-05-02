import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import * as attendanceController from '../controllers/attendance.controller';

const router = Router();

router.post('/checkin', authMiddleware, idempotencyMiddleware, attendanceController.checkIn);
router.post('/checkout', authMiddleware, idempotencyMiddleware, attendanceController.checkOut);
router.get('/today', authMiddleware, attendanceController.getToday);
router.get('/history', authMiddleware, attendanceController.getHistory);
router.get('/summary', authMiddleware, attendanceController.getSummary);

export default router;
