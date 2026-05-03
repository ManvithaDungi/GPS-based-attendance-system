import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import * as fraudController from '../controllers/fraud.controller';

const router = Router();

// Fraud logs should be admin only
router.get('/', authMiddleware, requireRole('ADMIN'), fraudController.getFraudLogs);

export default router;
