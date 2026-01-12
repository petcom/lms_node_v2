import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { requireAccessRight } from '@/middlewares/require-access-right';
import * as progressController from '@/controllers/analytics/progress.controller';

const router = Router();

/**
 * Progress Tracking Routes
 * Base path: /api/v2/progress
 *
 * All routes require authentication
 * This is the #1 PRIORITY analytics feature for learner engagement
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/progress/reports/summary
 * Get progress summary report with filtering options
 * Staff can filter by program, course, class, department, status, date range, progress range
 * Access: reports:department:read, reports:own-classes:read (instructors see own classes only)
 */
router.get('/reports/summary',
  requireAccessRight(['reports:department:read', 'reports:own-classes:read']),
  progressController.getProgressSummary
);

/**
 * GET /api/v2/progress/reports/detailed
 * Get detailed progress report with module-level breakdown
 * Supports export to JSON, CSV, or XLSX formats
 * Access: reports:department:read, reports:own-classes:read (instructors see own classes only)
 */
router.get('/reports/detailed',
  requireAccessRight(['reports:department:read', 'reports:own-classes:read']),
  progressController.getDetailedProgressReport
);

/**
 * POST /api/v2/progress/update
 * Manually update learner progress (instructor/admin override)
 * Allows marking complete/incomplete, overriding scores, resetting progress
 * Access: grades:own-classes:manage (instructors), grades:department:read (department-admin)
 */
router.post('/update',
  requireAccessRight(['grades:own-classes:manage', 'grades:department:read']),
  progressController.updateProgress
);

/**
 * GET /api/v2/progress/learner/:learnerId/program/:programId
 * Get detailed progress for a specific learner in a specific program
 * Staff endpoint for advisor/counselor dashboards
 * Access: learner:grades:read (learner own), grades:own:read (learner own)
 */
router.get('/learner/:learnerId/program/:programId',
  requireAccessRight(['learner:grades:read', 'grades:own:read']),
  progressController.getLearnerProgramProgress
);

/**
 * GET /api/v2/progress/learner/:learnerId
 * Get comprehensive progress overview for a learner across all enrollments
 * Shows programs, courses, recent activity, achievements
 * Access: learner:grades:read (instructor enrolled only, own classes), grades:own:read (learner own)
 * Service layer: Instructors filter to show ONLY their classes
 */
router.get('/learner/:learnerId',
  requireAccessRight(['learner:grades:read', 'grades:own:read']),
  progressController.getLearnerProgress
);

/**
 * GET /api/v2/progress/program/:programId
 * Get learner progress for a specific program
 * Includes level progress, course progress, milestones, estimated completion
 * Access: grades:own:read (learner enrolled), reports:department:read (department-admin)
 */
router.get('/program/:programId',
  requireAccessRight(['grades:own:read', 'reports:department:read']),
  progressController.getProgramProgress
);

/**
 * GET /api/v2/progress/course/:courseId
 * Get detailed progress for a specific course
 * Shows module-by-module breakdown, assessments, activity log
 * Access: grades:own:read (learner enrolled), reports:own-classes:read (instructor own classes)
 */
router.get('/course/:courseId',
  requireAccessRight(['grades:own:read', 'reports:own-classes:read']),
  progressController.getCourseProgress
);

/**
 * GET /api/v2/progress/class/:classId
 * Get progress for a specific class with attendance tracking
 * Includes course progress, attendance records, assignments
 * Access: grades:own:read (learner enrolled), reports:own-classes:read (instructor own classes)
 */
router.get('/class/:classId',
  requireAccessRight(['grades:own:read', 'reports:own-classes:read']),
  progressController.getClassProgress
);

export default router;
