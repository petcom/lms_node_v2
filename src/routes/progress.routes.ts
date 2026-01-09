import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
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
 */
router.get('/reports/summary', progressController.getProgressSummary);

/**
 * GET /api/v2/progress/reports/detailed
 * Get detailed progress report with module-level breakdown
 * Supports export to JSON, CSV, or XLSX formats
 */
router.get('/reports/detailed', progressController.getDetailedProgressReport);

/**
 * POST /api/v2/progress/update
 * Manually update learner progress (instructor/admin override)
 * Allows marking complete/incomplete, overriding scores, resetting progress
 */
router.post('/update', progressController.updateProgress);

/**
 * GET /api/v2/progress/learner/:learnerId/program/:programId
 * Get detailed progress for a specific learner in a specific program
 * Staff endpoint for advisor/counselor dashboards
 */
router.get('/learner/:learnerId/program/:programId', progressController.getLearnerProgramProgress);

/**
 * GET /api/v2/progress/learner/:learnerId
 * Get comprehensive progress overview for a learner across all enrollments
 * Shows programs, courses, recent activity, achievements
 */
router.get('/learner/:learnerId', progressController.getLearnerProgress);

/**
 * GET /api/v2/progress/program/:programId
 * Get learner progress for a specific program
 * Includes level progress, course progress, milestones, estimated completion
 */
router.get('/program/:programId', progressController.getProgramProgress);

/**
 * GET /api/v2/progress/course/:courseId
 * Get detailed progress for a specific course
 * Shows module-by-module breakdown, assessments, activity log
 */
router.get('/course/:courseId', progressController.getCourseProgress);

/**
 * GET /api/v2/progress/class/:classId
 * Get progress for a specific class with attendance tracking
 * Includes course progress, attendance records, assignments
 */
router.get('/class/:classId', progressController.getClassProgress);

export default router;
