import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { requireEscalation } from '@/middlewares/requireEscalation';
import * as coursesController from '@/controllers/academic/courses.controller';

const router = Router();

/**
 * Courses Routes
 * Base path: /api/v2/courses
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/courses
 * List all courses with optional filtering and pagination
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin, course-taker, auditor
 * Service Layer: Department members see all (including drafts). Learners see published courses across ALL departments.
 */
router.get('/',
  authorize('content:courses:read'),
  coursesController.listCourses
);

/**
 * POST /api/v2/courses
 * Create a new course
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Creates draft course (editable by creator only)
 */
router.post('/',
  authorize('content:lessons:manage'),
  coursesController.createCourse
);

/**
 * GET /api/v2/courses/:id/export
 * Export course package in various formats
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin
 */
router.get('/:id/export',
  authorize('content:courses:read'),
  coursesController.exportCourse
);

/**
 * POST /api/v2/courses/:id/publish
 * Publish a course to make it available to learners
 * Access Right: content:courses:manage
 * Roles: department-admin
 * Service Layer: Admin-only, makes course available to learners
 */
router.post('/:id/publish',
  authorize('content:courses:manage'),
  coursesController.publishCourse
);

/**
 * POST /api/v2/courses/:id/unpublish
 * Unpublish a course to make it unavailable to new learners
 * Access Right: content:courses:manage
 * Roles: department-admin
 * Service Layer: Admin-only, reverts to draft
 */
router.post('/:id/unpublish',
  authorize('content:courses:manage'),
  coursesController.unpublishCourse
);

/**
 * POST /api/v2/courses/:id/archive
 * Archive a course to remove it from active use
 * Access Right: content:courses:manage
 * Roles: department-admin
 * Service Layer: Admin-only, removes from active use
 */
router.post('/:id/archive',
  authorize('content:courses:manage'),
  coursesController.archiveCourse
);

/**
 * POST /api/v2/courses/:id/unarchive
 * Unarchive a course to restore it to draft status
 * Access Right: content:courses:manage
 * Roles: department-admin
 * Service Layer: Admin-only, restores from archive
 */
router.post('/:id/unarchive',
  authorize('content:courses:manage'),
  coursesController.unarchiveCourse
);

/**
 * POST /api/v2/courses/:id/duplicate
 * Create a copy of a course with optional modifications
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Creates copy as draft (owned by requester)
 */
router.post('/:id/duplicate',
  authorize('content:lessons:manage'),
  coursesController.duplicateCourse
);

/**
 * PATCH /api/v2/courses/:id/department
 * Move course to a different department
 * Access Rights: content:courses:manage + system:department-settings:manage
 * Roles: department-admin, system-admin
 * Requires: Escalation
 */
router.patch('/:id/department',
  requireEscalation,
  authorize.anyOf(['content:courses:manage', 'system:department-settings:manage']),
  coursesController.updateCourseDepartment
);

/**
 * PATCH /api/v2/courses/:id/program
 * Assign or change course program
 * Access Right: content:lessons:manage
 * Roles: instructor (drafts, own), department-admin (all)
 * Service Layer: Assign/change course program
 */
router.patch('/:id/program',
  authorize('content:lessons:manage'),
  coursesController.updateCourseProgram
);

/**
 * GET /api/v2/courses/:id
 * Get detailed information about a specific course
 * Access Right: content:courses:read
 * Roles: instructor, content-admin, department-admin, course-taker, auditor
 * Service Layer: Department members see all statuses. Learners see published only.
 */
router.get('/:id',
  authorize('content:courses:read'),
  coursesController.getCourseById
);

/**
 * PUT /api/v2/courses/:id
 * Replace entire course resource (full update)
 * Access Right: content:courses:manage
 * Roles: instructor (drafts, own), department-admin (all)
 * Service Layer: creator-only for drafts, admin-only for published
 */
router.put('/:id',
  authorize('content:courses:manage'),
  coursesController.updateCourse
);

/**
 * PATCH /api/v2/courses/:id
 * Partially update course fields
 * Access Right: content:lessons:manage
 * Roles: instructor (drafts, own), department-admin (all)
 * Service Layer: creator-only for drafts, admin-only for published
 */
router.patch('/:id',
  authorize('content:lessons:manage'),
  coursesController.patchCourse
);

/**
 * DELETE /api/v2/courses/:id
 * Delete a course (soft delete)
 * Access Right: content:courses:manage
 * Roles: department-admin
 * Requires: Escalation
 */
router.delete('/:id',
  requireEscalation,
  authorize('content:courses:manage'),
  coursesController.deleteCourse
);

export default router;
