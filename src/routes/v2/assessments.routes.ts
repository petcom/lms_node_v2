import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import * as assessmentsController from '@/controllers/content/assessments.controller';
import {
  validateCreateAssessment,
  validateUpdateAssessment
} from '@/validators/assessment.validator';

const router = Router();

/**
 * Assessments Routes
 * Base path: /api/v2/assessments
 *
 * All routes require authentication
 * Permissions: content:assessments:manage, content:assessments:read
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/assessments
 * List assessments with filtering and pagination
 * Access Rights: content:assessments:manage, content:assessments:read
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Department-scoped assessment list
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - departmentId: ObjectId
 * - style: string (quiz, exam)
 * - isPublished: boolean
 * - sort: string (default: -createdAt)
 */
router.get('/',
  requireAccessRight(['content:assessments:manage', 'content:assessments:read']),
  assessmentsController.listAssessments
);

/**
 * POST /api/v2/assessments
 * Create a new assessment
 * Access Right: content:assessments:manage
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Create assessment (owned by creator)
 *
 * Body:
 * - departmentId: ObjectId (required)
 * - title: string (required, max 200 chars)
 * - description: string (optional, max 2000 chars)
 * - style: string (required, 'quiz' or 'exam')
 * - questionSelection: object (required)
 * - timing: object (optional)
 * - attempts: object (optional)
 * - scoring: object (required)
 * - feedback: object (optional)
 */
router.post('/',
  requireAccessRight('content:assessments:manage'),
  validateCreateAssessment,
  assessmentsController.createAssessment
);

/**
 * GET /api/v2/assessments/:assessmentId
 * Get details of a specific assessment
 * Access Rights: content:assessments:manage, content:assessments:read
 * Roles: instructor, content-admin, department-admin
 * Service Layer: View assessment details
 *
 * Response includes:
 * - All assessment configuration details
 * - Question count
 * - Statistics (for staff users)
 */
router.get('/:assessmentId',
  requireAccessRight(['content:assessments:manage', 'content:assessments:read']),
  assessmentsController.getAssessment
);

/**
 * PUT /api/v2/assessments/:assessmentId
 * Update an existing assessment
 * Access Right: content:assessments:manage
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Cannot change style on published assessments
 *
 * Body: (all fields optional)
 * - title: string
 * - description: string
 * - style: string ('quiz' or 'exam')
 * - questionSelection: object
 * - timing: object
 * - attempts: object
 * - scoring: object
 * - feedback: object
 *
 * Note: Cannot change style on published assessments
 */
router.put('/:assessmentId',
  requireAccessRight('content:assessments:manage'),
  validateUpdateAssessment,
  assessmentsController.updateAssessment
);

/**
 * DELETE /api/v2/assessments/:assessmentId
 * Delete an assessment (soft delete via archive)
 * Access Right: content:assessments:manage
 * Roles: content-admin, department-admin
 * Service Layer: Cannot delete published assessments
 *
 * Note: Cannot delete published assessments
 */
router.delete('/:assessmentId',
  requireAccessRight('content:assessments:manage'),
  assessmentsController.deleteAssessment
);

/**
 * POST /api/v2/assessments/:assessmentId/publish
 * Publish an assessment to make it available
 * Access Right: content:assessments:manage
 * Roles: content-admin, department-admin
 * Service Layer: Validates question banks have sufficient questions
 *
 * Note: After publishing, some fields become read-only
 */
router.post('/:assessmentId/publish',
  requireAccessRight('content:assessments:manage'),
  assessmentsController.publishAssessment
);

/**
 * POST /api/v2/assessments/:assessmentId/archive
 * Archive an assessment (soft delete)
 * Access Right: content:assessments:manage
 * Roles: content-admin, department-admin
 * Service Layer: Soft delete - assessment data is preserved
 *
 * Note: Cannot be used in new learning units after archiving
 */
router.post('/:assessmentId/archive',
  requireAccessRight('content:assessments:manage'),
  assessmentsController.archiveAssessment
);

export default router;
