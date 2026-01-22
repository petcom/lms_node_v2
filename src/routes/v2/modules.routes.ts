import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import {
  validateCreateModule,
  validateUpdateModule,
  validateReorderModules
} from '@/validators/module.validator';
import * as modulesController from '@/controllers/academic/modules.controller';

const router = Router();

/**
 * Modules Routes
 * Base path: /api/v2/courses/:courseId/modules
 *
 * Modules are logical groupings of learning units within a course.
 * They organize course content into chapters/sections with completion criteria
 * and presentation rules.
 *
 * All routes require authentication.
 * Write operations require staff permissions (content:lessons:manage).
 * Read operations are available to enrolled learners and staff (content:lessons:read).
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/courses/:courseId/modules
 * List all modules in a course
 *
 * Access Right: content:lessons:read
 * Roles: instructor, content-admin, department-admin, course-taker, auditor
 *
 * Query Parameters:
 * - isPublished: boolean - Filter by publish status
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 10, max: 100)
 * - sort: string - Sort field (default: 'order')
 *
 * Service Layer: Department members see all. Learners see published only.
 */
router.get(
  '/:courseId/modules',
  authorize('content:lessons:read'),
  modulesController.listModules
);

/**
 * POST /api/v2/courses/:courseId/modules
 * Create a new module in a course
 *
 * Access Right: content:lessons:manage
 * Roles: instructor, content-admin, department-admin
 *
 * Body:
 * - title: string (required, 1-200 chars)
 * - description: string (optional, max 2000 chars)
 * - prerequisites: ObjectId[] (optional)
 * - completionCriteria: object (optional)
 * - presentationRules: object (optional)
 * - isPublished: boolean (optional, default: false)
 * - availableFrom: Date (optional)
 * - availableUntil: Date (optional)
 * - estimatedDuration: number (optional, in minutes)
 * - objectives: string[] (optional)
 */
router.post(
  '/:courseId/modules',
  authorize('content:lessons:manage'),
  validateCreateModule,
  modulesController.createModule
);

/**
 * GET /api/v2/courses/:courseId/modules/:moduleId
 * Get detailed information about a specific module
 *
 * Access Right: content:lessons:read
 * Roles: instructor, content-admin, department-admin, course-taker, auditor
 *
 * Service Layer: Department members see all. Learners see published only.
 */
router.get(
  '/:courseId/modules/:moduleId',
  authorize('content:lessons:read'),
  modulesController.getModule
);

/**
 * PUT /api/v2/courses/:courseId/modules/:moduleId
 * Update an existing module
 *
 * Access Right: content:lessons:manage
 * Roles: instructor (unpublished, own), department-admin (all)
 *
 * Body: Same as POST but all fields optional
 *
 * Note: Order cannot be changed via PUT - use the reorder endpoint instead.
 */
router.put(
  '/:courseId/modules/:moduleId',
  authorize('content:lessons:manage'),
  validateUpdateModule,
  modulesController.updateModule
);

/**
 * DELETE /api/v2/courses/:courseId/modules/:moduleId
 * Delete a module from a course
 *
 * Access Right: content:lessons:manage
 * Roles: instructor (unpublished, own), department-admin (all)
 *
 * Query Parameters:
 * - force: boolean - Force delete even with learner progress
 *
 * Note: Cascades to soft-delete all learning units in the module.
 */
router.delete(
  '/:courseId/modules/:moduleId',
  authorize('content:lessons:manage'),
  modulesController.deleteModule
);

/**
 * PATCH /api/v2/courses/:courseId/modules/reorder
 * Reorder modules within a course
 *
 * Access Right: content:lessons:manage
 * Roles: instructor (unpublished, own), department-admin (all)
 *
 * Body:
 * - moduleIds: ObjectId[] (required) - Array of all module IDs in desired order
 *
 * Note: Must include ALL modules in the course.
 * Array order determines new order (1-indexed).
 * Prerequisites are not affected by reordering.
 */
router.patch(
  '/:courseId/modules/reorder',
  authorize('content:lessons:manage'),
  validateReorderModules,
  modulesController.reorderModules
);

export default router;
