import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import * as enrollmentsController from '@/controllers/enrollment/enrollments.controller';

const router = Router();

/**
 * Enrollments Routes
 * Base path: /api/v2/enrollments
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/enrollments
 * List all enrollments with comprehensive filtering
 * Access Right: enrollment:department:read OR enrollment:own:read
 * Service Layer: Staff see department enrollments, learners see own
 */
router.get('/',
  requireAccessRight(['enrollment:department:read', 'enrollment:own:read']),
  enrollmentsController.listEnrollments
);

/**
 * POST /api/v2/enrollments/program
 * Enroll a learner in a program
 * Access Right: enrollment:own:manage OR enrollment:department:manage
 * Service Layer: Check allowSelfEnrollment setting for learner self-enrollment
 */
router.post('/program',
  requireAccessRight(['enrollment:own:manage', 'enrollment:department:manage']),
  enrollmentsController.enrollProgram
);

/**
 * POST /api/v2/enrollments/course
 * Enroll a learner in a course
 * Access Right: enrollment:own:manage OR enrollment:department:manage
 * Service Layer: Check allowSelfEnrollment setting for learner self-enrollment
 */
router.post('/course',
  requireAccessRight(['enrollment:own:manage', 'enrollment:department:manage']),
  enrollmentsController.enrollCourse
);

/**
 * POST /api/v2/enrollments/class
 * Enroll a learner in a class (course instance)
 * Access Right: enrollment:own:manage OR enrollment:department:manage
 * Service Layer: Check allowSelfEnrollment setting for learner self-enrollment
 */
router.post('/class',
  requireAccessRight(['enrollment:own:manage', 'enrollment:department:manage']),
  enrollmentsController.enrollClass
);

/**
 * GET /api/v2/enrollments/program/:programId
 * List all enrollments for a specific program
 * Access Right: enrollment:department:read
 */
router.get('/program/:programId',
  requireAccessRight('enrollment:department:read'),
  enrollmentsController.listProgramEnrollments
);

/**
 * GET /api/v2/enrollments/course/:courseId
 * List all enrollments for a specific course
 * Access Right: enrollment:department:read
 */
router.get('/course/:courseId',
  requireAccessRight('enrollment:department:read'),
  enrollmentsController.listCourseEnrollments
);

/**
 * GET /api/v2/enrollments/class/:classId
 * List all enrollments for a specific class
 * Access Right: enrollment:department:read
 */
router.get('/class/:classId',
  requireAccessRight('enrollment:department:read'),
  enrollmentsController.listClassEnrollments
);

/**
 * GET /api/v2/enrollments/:id
 * Get detailed enrollment information
 * Access Right: enrollment:department:read OR enrollment:own:read
 */
router.get('/:id',
  requireAccessRight(['enrollment:department:read', 'enrollment:own:read']),
  enrollmentsController.getEnrollmentById
);

/**
 * PATCH /api/v2/enrollments/:id/status
 * Update enrollment status
 * Access Right: enrollment:department:manage
 */
router.patch('/:id/status',
  requireAccessRight('enrollment:department:manage'),
  enrollmentsController.updateEnrollmentStatus
);

/**
 * DELETE /api/v2/enrollments/:id
 * Withdraw from enrollment (soft delete)
 * Access Right: enrollment:own:manage OR enrollment:department:manage
 */
router.delete('/:id',
  requireAccessRight(['enrollment:own:manage', 'enrollment:department:manage']),
  enrollmentsController.withdrawEnrollment
);

export default router;
