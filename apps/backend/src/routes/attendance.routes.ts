import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';
import { attendanceRateLimiter } from '../middleware/rateLimiter.middleware';
import * as attendanceController from '../controllers/attendance.controller';

const router = Router();

router.post('/checkin', authMiddleware, attendanceRateLimiter, idempotencyMiddleware, attendanceController.checkIn);
router.post('/checkout', authMiddleware, attendanceRateLimiter, idempotencyMiddleware, attendanceController.checkOut);
router.get('/today', authMiddleware, attendanceController.getToday);
router.get('/history', authMiddleware, attendanceController.getHistory);
router.get('/summary', authMiddleware, attendanceController.getSummary);

export default router;
