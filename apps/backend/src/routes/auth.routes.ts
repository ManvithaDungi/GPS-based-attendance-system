import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { authRateLimiter, loginRateLimiter } from '../middleware/rateLimiter.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/register', authRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', authMiddleware, authController.logout);

router.get('/me', authMiddleware, authController.getMe);
router.patch('/me/fcm-token', authMiddleware, authController.updateFcmToken);
router.patch('/me/password', authMiddleware, authController.changePassword);

export default router;
