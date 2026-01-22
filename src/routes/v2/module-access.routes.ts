import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import * as moduleAccessController from '@/controllers/progress/module-access.controller';

const router = Router();

/**
 * Module Access Routes
 * Base path: /api/v2/module-access
 *
 * Tracks learner access and engagement at the module level
 * for analytics and progress tracking. Used for identifying
 * drop-off points and understanding learner behavior.
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/module-access/analytics/drop-off
 * Get drop-off analytics for modules in a course
 * Query params: courseId (required)
 * Access: read:analytics OR reports:department:read
 *
 * Note: This route must be defined before /:accessId to avoid conflict
 */
router.get('/analytics/drop-off',
  requireAccessRight(['read:analytics', 'reports:department:read'], { requireAny: true }),
  moduleAccessController.getDropOffAnalytics
);

/**
 * GET /api/v2/module-access/my
 * Get current user's module access records
 * Query params: enrollmentId (required), moduleId (optional)
 * Access: grades:own:read (learner own access)
 *
 * Note: This route must be defined before /:accessId to avoid conflict
 */
router.get('/my',
  requireAccessRight(['grades:own:read']),
  moduleAccessController.getMyAccess
);

/**
 * GET /api/v2/module-access
 * List module access records with filtering
 * Query params: moduleId OR enrollmentId (one required), hasStartedLearningUnit, status, page, limit
 * Access: read:analytics OR reports:department:read (for module-level), grades:own:read (for own enrollment)
 */
router.get('/',
  requireAccessRight(['read:analytics', 'reports:department:read', 'grades:own:read'], { requireAny: true }),
  moduleAccessController.listAccess
);

/**
 * POST /api/v2/module-access
 * Record module access for the current user
 * Body: moduleId, enrollmentId, courseId
 * Access: read:courses (basic learner access)
 */
router.post('/',
  requireAccessRight(['read:courses']),
  moduleAccessController.recordAccess
);

/**
 * GET /api/v2/module-access/:accessId
 * Get a specific module access record
 * Access: read:analytics OR grades:own:read
 */
router.get('/:accessId',
  requireAccessRight(['read:analytics', 'grades:own:read'], { requireAny: true }),
  moduleAccessController.getAccessRecord
);

/**
 * PUT /api/v2/module-access/:accessId
 * Update a module access record
 * Body: action (mark_learning_unit_started | update_progress | mark_completed), learningUnitsCompleted, learningUnitsTotal
 * Access: read:courses (learner updating own progress)
 */
router.put('/:accessId',
  requireAccessRight(['read:courses']),
  moduleAccessController.updateAccess
);

export default router;
