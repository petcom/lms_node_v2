/**
 * Analytics Routes
 *
 * Routes for analytics endpoints.
 * Base path: /api/v2/analytics
 *
 * @module routes/analytics
 */

import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as courseSummaryController from '@/controllers/analytics/course-summary.controller';

const router = Router();

/**
 * Analytics Routes
 * Base path: /api/v2/analytics
 *
 * All routes require authentication.
 * Access is scoped to departments where user has department-admin or content-admin role.
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/analytics/courses/summary
 *
 * Get aggregated course analytics across departments.
 * Query params:
 *   - departmentIds: string[] (optional) - Filter to specific departments
 *   - timeRange: string (optional) - 30days|3months|6months|1year|all (default: 6months)
 *   - includeArchived: boolean (optional) - Include archived courses (default: false)
 *
 * Authorization:
 *   - User must have department-admin OR content-admin role in at least one department
 *   - Data is automatically scoped to departments where user has these roles
 *   - Permission: analytics:courses:read
 */
router.get('/courses/summary',
  authorize.anyOf(['analytics:courses:read', 'reports:department:read']),
  courseSummaryController.getCourseSummary
);

/**
 * POST /api/v2/analytics/courses/summary/export
 *
 * Export course summary analytics as PDF, CSV, or Excel.
 * Body:
 *   - format: string (required) - pdf|csv|excel
 *   - departmentIds: string[] (optional) - Filter to specific departments
 *   - timeRange: string (optional) - 30days|3months|6months|1year|all (default: 6months)
 *   - includeArchived: boolean (optional) - Include archived courses (default: false)
 *   - includeDepartmentBreakdown: boolean (optional) - Include per-department breakdown (default: true)
 *   - includeTopCourses: boolean (optional) - Include top courses section (default: true)
 *
 * Authorization:
 *   - User must have department-admin OR content-admin role in at least one department
 *   - Permission: analytics:courses:export
 */
router.post('/courses/summary/export',
  authorize.anyOf(['analytics:courses:export', 'reports:department:export']),
  courseSummaryController.exportCourseSummary
);

export default router;
