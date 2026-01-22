import express from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { overrideGrade, getGradeHistory } from '@/controllers/grades/grade-override.controller';
import { validateGradeOverride } from '@/validators/grade-override.validator';

const router = express.Router();

/**
 * Grade Override Routes
 * Base path: /api/v2/enrollments (mounted on enrollments routes)
 *
 * All routes require authentication and grades:override access right
 */

/**
 * PUT /api/v2/enrollments/:enrollmentId/grades/override
 * Override grade for an enrollment (dept-admin only)
 *
 * Access Right: academic:grades:override
 * Roles: dept-admin (in course's department)
 *
 * Security:
 * - Requires grades:override permission
 * - Validates dept-admin role in course's department
 * - Creates immutable audit log entry
 * - Mandatory reason field (10-1000 chars)
 */
router.put(
  '/:enrollmentId/grades/override',
  isAuthenticated,
  authorize('academic:grades:override'),
  validateGradeOverride,
  overrideGrade
);

/**
 * GET /api/v2/enrollments/:enrollmentId/grades/history
 * Get grade change history for an enrollment
 *
 * Access Right: academic:grades:override
 * Roles: dept-admin
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get(
  '/:enrollmentId/grades/history',
  isAuthenticated,
  authorize('academic:grades:override'),
  getGradeHistory
);

export default router;
