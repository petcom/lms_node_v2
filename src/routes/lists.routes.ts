/**
 * Lists Routes (Convenience Endpoints)
 *
 * Provides convenience endpoints for common lookup queries.
 * These are simplified endpoints optimized for UI consumption.
 *
 * Part of the LookupValues migration (Stream C - API Layer)
 *
 * Routes:
 * - GET /api/v2/lists/user-types - Get all user types
 * - GET /api/v2/lists/roles/:userType - Get roles for a user type
 *
 * @module routes/lists
 */

import { Router } from 'express';
import { LookupValuesController } from '@/controllers/lookup-values.controller';

const router = Router();

/**
 * GET /api/v2/lists/user-types
 *
 * Get all active user types as UserTypeObject[].
 * This is a public endpoint (no authentication required).
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     { _id: 'learner', displayAs: 'Learner' },
 *     { _id: 'staff', displayAs: 'Staff' },
 *     { _id: 'global-admin', displayAs: 'System Admin' }
 *   ]
 * }
 */
router.get('/user-types', LookupValuesController.listUserTypes);

/**
 * GET /api/v2/lists/roles/:userType
 *
 * Get all valid roles for a specific user type.
 * Returns roles as RoleObject[] with displayAs values.
 *
 * Path parameters:
 * - userType: The user type ('learner', 'staff', 'global-admin')
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     { _id: 'instructor', displayAs: 'Instructor' },
 *     { _id: 'department-admin', displayAs: 'Department Admin' },
 *     ...
 *   ]
 * }
 *
 * Errors:
 * - 400: Invalid user type
 */
router.get('/roles/:userType', LookupValuesController.listRolesForUserType);

/**
 * Export the router
 */
export default router;
