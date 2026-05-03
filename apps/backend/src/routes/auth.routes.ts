import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authMiddleware, authController.logout);

router.get('/me', authMiddleware, authController.getMe);
router.patch('/me/fcm-token', authMiddleware, authController.updateFcmToken);
router.patch('/me/password', authMiddleware, authController.changePassword);

export default router;
