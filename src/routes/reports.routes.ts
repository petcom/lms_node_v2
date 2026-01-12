import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { requireAccessRight } from '@/middlewares/require-access-right';
import { requireEscalation } from '@/middlewares/require-escalation';
import * as reportsController from '@/controllers/reporting/reports.controller';

const router = Router();

/**
 * Reports Routes
 * Base path: /api/v2/reports
 *
 * All routes require authentication
 * Comprehensive reporting and analytics for completion, performance, and transcripts
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/reports/completion
 * Get completion report with filtering and aggregation
 * Query params:
 *   - programId: ObjectId (optional)
 *   - courseId: ObjectId (optional)
 *   - classId: ObjectId (optional)
 *   - departmentId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - status: string (optional) - not_started|in_progress|completed|withdrawn
 *   - learnerId: ObjectId (optional)
 *   - groupBy: string (optional) - program|course|department|status|month
 *   - includeDetails: boolean (optional)
 *   - page: number (optional)
 *   - limit: number (optional)
 * Access: reports:department:read OR reports:enrollment:read OR reports:own-classes:read (department-admin OR enrollment-admin OR instructor), instructor scoped
 */
router.get('/completion',
  requireAccessRight(['reports:department:read', 'reports:enrollment:read', 'reports:own-classes:read'], { requireAny: true }),
  reportsController.getCompletionReport
);

/**
 * GET /api/v2/reports/performance
 * Get performance report with scores, grades, and analytics
 * Query params:
 *   - programId: ObjectId (optional)
 *   - courseId: ObjectId (optional)
 *   - classId: ObjectId (optional)
 *   - departmentId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - learnerId: ObjectId (optional)
 *   - minScore: number (optional) - 0-100
 *   - includeRankings: boolean (optional)
 *   - page: number (optional)
 *   - limit: number (optional)
 * Access: reports:department:read (department-admin, instructor scoped to own classes)
 */
router.get('/performance',
  requireAccessRight('reports:department:read'),
  reportsController.getPerformanceReport
);

/**
 * GET /api/v2/reports/transcript/:learnerId
 * Get official transcript for a learner
 * Params:
 *   - learnerId: ObjectId (required)
 * Query params:
 *   - programId: ObjectId (optional) - filter by specific program
 *   - includeInProgress: boolean (optional) - include in-progress courses
 * Access: learner:transcripts:read OR grades:own:read (dept-admin sees only their dept courses OR learner sees own)
 * Service layer: Department-admin filter to show ONLY their department courses
 */
router.get('/transcript/:learnerId',
  requireAccessRight(['learner:transcripts:read', 'grades:own:read'], { requireAny: true }),
  reportsController.getLearnerTranscript
);

/**
 * POST /api/v2/reports/transcript/:learnerId/generate
 * Generate PDF transcript for a learner
 * Params:
 *   - learnerId: ObjectId (required)
 * Body:
 *   - programId: ObjectId (optional)
 *   - includeInProgress: boolean (optional)
 *   - officialFormat: boolean (optional)
 *   - watermark: string (optional) - none|unofficial|draft
 * Access: learner:transcripts:read (enrollment-admin, system-admin only for PDF generation)
 * Requires escalation (sensitive operation)
 */
router.post('/transcript/:learnerId/generate',
  requireEscalation,
  requireAccessRight('learner:transcripts:read'),
  reportsController.generatePDFTranscript
);

/**
 * GET /api/v2/reports/course/:courseId
 * Get comprehensive course-level report with all learners
 * Params:
 *   - courseId: ObjectId (required)
 * Query params:
 *   - classId: ObjectId (optional) - filter by specific class instance
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - includeModules: boolean (optional) - include module-level breakdown
 * Access: reports:own-classes:read OR reports:content:read OR reports:department:read (instructor own classes OR content-admin OR dept-admin)
 */
router.get('/course/:courseId',
  requireAccessRight(['reports:own-classes:read', 'reports:department:read', 'reports:content:read'], { requireAny: true }),
  reportsController.getCourseReport
);

/**
 * GET /api/v2/reports/program/:programId
 * Get comprehensive program-level report
 * Params:
 *   - programId: ObjectId (required)
 * Query params:
 *   - academicYearId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 * Access: reports:department:read OR reports:enrollment:read (department-admin OR enrollment-admin)
 */
router.get('/program/:programId',
  requireAccessRight(['reports:department:read', 'reports:enrollment:read'], { requireAny: true }),
  reportsController.getProgramReport
);

/**
 * GET /api/v2/reports/department/:departmentId
 * Get comprehensive department-level report
 * Params:
 *   - departmentId: ObjectId (required)
 * Query params:
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - includeSubDepartments: boolean (optional)
 * Access: reports:department:read (department-admin own dept, system-admin all)
 */
router.get('/department/:departmentId',
  requireAccessRight('reports:department:read'),
  reportsController.getDepartmentReport
);

/**
 * GET /api/v2/reports/export
 * Export report data in multiple formats
 * Query params:
 *   - reportType: string (required) - completion|performance|course|program|department
 *   - format: string (required) - csv|xlsx|pdf|json
 *   - programId: ObjectId (optional)
 *   - courseId: ObjectId (optional)
 *   - classId: ObjectId (optional)
 *   - departmentId: ObjectId (optional)
 *   - startDate: Date (optional)
 *   - endDate: Date (optional)
 *   - learnerId: ObjectId (optional)
 *   - includeDetails: boolean (optional)
 * Access: reports:department:read OR reports:own-classes:read (instructor scoped to own classes)
 */
router.get('/export',
  requireAccessRight(['reports:department:read', 'reports:own-classes:read'], { requireAny: true }),
  reportsController.exportReport
);

export default router;
