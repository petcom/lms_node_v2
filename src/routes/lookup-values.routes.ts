/**
 * LookupValues Routes
 *
 * Defines routes for centralized lookup values (constants) API.
 *
 * Part of the LookupValues migration (Stream C - API Layer)
 *
 * Routes:
 * - GET /api/v2/lookup-values - List all lookup values with filters
 * - GET /api/v2/lookup-values/:lookupId - Get single lookup by ID
 * - GET /api/v2/lists/user-types - Get all user types (public)
 * - GET /api/v2/lists/roles/:userType - Get roles for a user type
 *
 * @module routes/lookup-values
 */

import { Router } from 'express';
import { LookupValuesController } from '@/controllers/lookup-values.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';

const router = Router();

/**
 * GET /api/v2/lookup-values
 *
 * List all lookup values with optional filtering.
 * Requires authentication.
 *
 * Query parameters:
 * - category: Filter by category (userType, role)
 * - parentLookupId: Filter by parent (e.g., 'userType.staff')
 * - isActive: Filter by active status (default: true)
 *
 * Response:
 * {
 *   success: true,
 *   data: LookupValue[],
 *   count: number
 * }
 */
router.get('/', isAuthenticated, LookupValuesController.list);

/**
 * GET /api/v2/lookup-values/:lookupId
 *
 * Get a single lookup value by its lookupId.
 * Requires authentication.
 *
 * Path parameters:
 * - lookupId: The unique lookupId (e.g., 'userType.staff', 'role.instructor')
 *
 * Response:
 * {
 *   success: true,
 *   data: LookupValue
 * }
 *
 * Errors:
 * - 400: Invalid lookupId format
 * - 404: Lookup value not found
 */
router.get('/:lookupId', isAuthenticated, LookupValuesController.getByLookupId);

/**
 * Export the router
 */
export default router;
