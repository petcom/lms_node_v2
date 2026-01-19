import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import { requireEscalation } from '@/middlewares/requireEscalation';
import { requireAdminRole } from '@/middlewares/requireAdminRole';
import * as learnersController from '@/controllers/users/learners.controller';

const router = Router();

/**
 * Learners Routes
 * Base path: /api/v2/users/learners
 *
 * All routes require authentication and staff/admin permissions
 * FERPA COMPLIANCE: All learner operations require escalation
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/users/learners
 * List all learners with filtering and pagination
 * Access Right: learner:pii:read
 * Roles: instructor (enrolled only), department-admin, enrollment-admin
 * Service Layer:
 * - Data masking: "FirstName L." for instructors & dept-admin
 * - Instructor scoping: Enrolled learners only
 * - Enrollment-admin: Full names visible
 */
router.get('/',
  requireAccessRight('learner:pii:read'),
  learnersController.listLearners
);

/**
 * POST /api/v2/users/learners
 * Register a new learner account
 * Access Right: learner:pii:read
 * Roles: department-admin, enrollment-admin
 * Security: Requires escalation (FERPA-sensitive PII)
 */
router.post('/',
  requireEscalation,
  requireAccessRight('learner:pii:read'),
  learnersController.registerLearner
);

/**
 * GET /api/v2/users/learners/:id
 * Get detailed learner profile by ID
 * Access Right: learner:pii:read
 * Roles: instructor (enrolled only), department-admin, enrollment-admin
 * Service Layer: Data masking applied, FERPA-sensitive
 */
router.get('/:id',
  requireAccessRight('learner:pii:read'),
  learnersController.getLearnerById
);

/**
 * PUT /api/v2/users/learners/:id
 * Update learner profile information
 * Access Right: learner:pii:read
 * Roles: department-admin, enrollment-admin
 * Security: Requires escalation (FERPA-sensitive PII)
 */
router.put('/:id',
  requireEscalation,
  requireAccessRight('learner:pii:read'),
  learnersController.updateLearner
);

/**
 * DELETE /api/v2/users/learners/:id
 * Soft delete learner account (sets status to withdrawn)
 * Access Right: learner:pii:read
 * Roles: department-admin, enrollment-admin, system-admin
 * Security: Requires escalation + admin role check (FERPA-sensitive)
 */
router.delete('/:id',
  requireEscalation,
  requireAdminRole(['system-admin', 'enrollment-admin']),
  requireAccessRight('learner:pii:read'),
  learnersController.deleteLearner
);

export default router;
