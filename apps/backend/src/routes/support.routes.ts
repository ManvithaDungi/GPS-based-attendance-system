import express from 'express';
import { reportIssue } from '../controllers/support.controller';

const router = express.Router();

// POST /api/support/report-issue
router.post('/report-issue', reportIssue);

export default router;
