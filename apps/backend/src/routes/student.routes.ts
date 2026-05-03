import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as studentController from '../controllers/student.controller';

const router = Router();

router.get('/dashboard', authMiddleware, studentController.getDashboard);

export default router;
