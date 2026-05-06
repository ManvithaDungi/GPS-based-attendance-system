import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

/**
 * GET /api/v1/admin/attendance
 * Get all students' attendance summary
 * Admin only
 */
router.get('/attendance', authMiddleware, requireRole('ADMIN'), adminController.getAllAttendance);

/**
 * GET /api/v1/admin/students
 * Get list of all students with basic info
 * Admin only
 */
router.get('/students', authMiddleware, requireRole('ADMIN'), adminController.getAllStudents);

/**
 * GET /api/v1/admin/students/:studentId/attendance
 * Get attendance history for specific student
 * Admin only
 */
router.get(
  '/students/:studentId/attendance',
  authMiddleware,
  requireRole('ADMIN'),
  adminController.getStudentAttendance
);

/**
 * GET /api/v1/admin/dashboard
 */
router.get('/dashboard', authMiddleware, requireRole('ADMIN'), adminController.getDashboardStats);

/**
 * GET /api/v1/admin/reports
 */
router.get('/reports', authMiddleware, requireRole('ADMIN'), adminController.getReports);

/**
 * GET /api/v1/admin/config
 */
router.get('/config', authMiddleware, requireRole('ADMIN'), adminController.getConfig);

/**
 * POST /api/v1/admin/locations
 */
router.post('/locations', authMiddleware, requireRole('ADMIN'), adminController.createLocation);

/**
 * PATCH /api/v1/admin/locations/:locationId
 */
router.patch('/locations/:locationId', authMiddleware, requireRole('ADMIN'), adminController.updateLocation);

/**
 * DELETE /api/v1/admin/locations/:locationId
 */
router.delete('/locations/:locationId', authMiddleware, requireRole('ADMIN'), adminController.deleteLocation);

/**
 * PATCH /api/v1/admin/config/working-hours/:locationId
 */
router.patch('/config/working-hours/:locationId', authMiddleware, requireRole('ADMIN'), adminController.updateWorkingHours);

/**
 * POST /api/admin/students
 * Create a new student
 * Admin only
 */
router.post('/students', authMiddleware, requireRole('ADMIN'), adminController.createStudent);

/**
 * PATCH /api/admin/students/:id/status
 * Update student status (ACTIVE / SUSPENDED)
 * Admin only
 */
router.patch('/students/:id/status', authMiddleware, requireRole('ADMIN'), adminController.updateStudentStatus);

export default router;
