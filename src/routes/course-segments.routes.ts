import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import * as courseSegmentsController from '@/controllers/academic/course-segments.controller';

const router = Router();

/**
 * Course Segments (Modules) Routes
 * Base: /api/v2/courses/:courseId/modules
 *
 * All routes require authentication
 * Write operations (POST, PUT, DELETE, PATCH) require staff permissions
 * Read operations (GET) available to enrolled learners and staff
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/courses/:courseId/modules
 * List all modules in a course
 * Access Right: content:lessons:read
 * Roles: instructor, content-admin, department-admin, course-taker, auditor
 * Service Layer: Department members see all. Learners see published only.
 */
router.get('/:courseId/modules',
  requireAccessRight('content:lessons:read'),
  courseSegmentsController.listModules
);

/**
 * POST /api/v2/courses/:courseId/modules
 * Create a new module in a course
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Create module (owned by creator)
 */
router.post('/:courseId/modules',
  requireAccessRight('content:lessons:manage'),
  courseSegmentsController.createModule
);

/**
 * GET /api/v2/courses/:courseId/modules/:moduleId
 * Get details of a specific module
 * Access Right: content:lessons:read
 * Roles: instructor, content-admin, department-admin, course-taker, auditor
 * Service Layer: Department members see all. Learners see published only.
 */
router.get('/:courseId/modules/:moduleId',
  requireAccessRight('content:lessons:read'),
  courseSegmentsController.getModule
);

/**
 * PUT /api/v2/courses/:courseId/modules/:moduleId
 * Update an existing module
 * Access Right: content:lessons:manage
 * Roles: instructor (unpublished, own), department-admin (all)
 * Service Layer: creator-only for unpublished
 */
router.put('/:courseId/modules/:moduleId',
  requireAccessRight('content:lessons:manage'),
  courseSegmentsController.updateModule
);

/**
 * DELETE /api/v2/courses/:courseId/modules/:moduleId
 * Delete a module from a course
 * Access Right: content:lessons:manage
 * Roles: instructor (unpublished, own), department-admin (all)
 * Service Layer: creator-only for unpublished
 */
router.delete('/:courseId/modules/:moduleId',
  requireAccessRight('content:lessons:manage'),
  courseSegmentsController.deleteModule
);

/**
 * PATCH /api/v2/courses/:courseId/modules/reorder
 * Reorder modules within a course
 * Access Right: content:lessons:manage
 * Roles: instructor (unpublished, own), department-admin (all)
 * Service Layer: creator-only for unpublished
 */
router.patch('/:courseId/modules/reorder',
  requireAccessRight('content:lessons:manage'),
  courseSegmentsController.reorderModules
);

export default router;
