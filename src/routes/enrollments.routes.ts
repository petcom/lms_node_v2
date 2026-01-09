import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as enrollmentsController from '@/controllers/enrollment/enrollments.controller';

const router = Router();

/**
 * Enrollments Routes
 * Base path: /api/v2/enrollments
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/enrollments
 * List all enrollments with comprehensive filtering
 */
router.get('/', enrollmentsController.listEnrollments);

/**
 * POST /api/v2/enrollments/program
 * Enroll a learner in a program
 */
router.post('/program', enrollmentsController.enrollProgram);

/**
 * POST /api/v2/enrollments/course
 * Enroll a learner in a course
 */
router.post('/course', enrollmentsController.enrollCourse);

/**
 * POST /api/v2/enrollments/class
 * Enroll a learner in a class (course instance)
 */
router.post('/class', enrollmentsController.enrollClass);

/**
 * GET /api/v2/enrollments/program/:programId
 * List all enrollments for a specific program
 */
router.get('/program/:programId', enrollmentsController.listProgramEnrollments);

/**
 * GET /api/v2/enrollments/course/:courseId
 * List all enrollments for a specific course
 */
router.get('/course/:courseId', enrollmentsController.listCourseEnrollments);

/**
 * GET /api/v2/enrollments/class/:classId
 * List all enrollments for a specific class
 */
router.get('/class/:classId', enrollmentsController.listClassEnrollments);

/**
 * GET /api/v2/enrollments/:id
 * Get detailed enrollment information
 */
router.get('/:id', enrollmentsController.getEnrollmentById);

/**
 * PATCH /api/v2/enrollments/:id/status
 * Update enrollment status
 */
router.patch('/:id/status', enrollmentsController.updateEnrollmentStatus);

/**
 * DELETE /api/v2/enrollments/:id
 * Withdraw from enrollment (soft delete)
 */
router.delete('/:id', enrollmentsController.withdrawEnrollment);

export default router;
