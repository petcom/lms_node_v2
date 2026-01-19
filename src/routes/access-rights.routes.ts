import { Router } from 'express';
import * as accessRightsController from '@/controllers/auth/access-rights.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';

const router = Router();

/**
 * Access Rights Routes
 * Base path: /api/v2/access-rights
 *
 * All routes require authentication.
 * These routes provide read-only access to the access rights catalog
 * and role-to-rights mappings.
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/access-rights
 * List all access rights with optional filtering and pagination
 *
 * Query Parameters:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 50, min: 1, max: 100)
 * - domain: string (optional, filter by domain)
 * - isSensitive: boolean (optional, filter by sensitivity)
 * - isActive: boolean (optional, default: true)
 *
 * Response: Paginated list of access rights
 */
router.get('/', accessRightsController.listAccessRights);

/**
 * GET /api/v2/access-rights/domain/:domain
 * Get all access rights for a specific domain
 *
 * Path Parameters:
 * - domain: string (required, e.g., 'content', 'enrollment', 'staff')
 *
 * Query Parameters:
 * - isActive: boolean (optional, default: true)
 *
 * Response: List of access rights in the specified domain
 */
router.get('/domain/:domain', accessRightsController.getAccessRightsByDomain);

/**
 * GET /api/v2/access-rights/role/:roleName
 * Get all access rights assigned to a specific role
 *
 * Path Parameters:
 * - roleName: string (required, e.g., 'instructor', 'content-admin')
 *
 * Query Parameters:
 * - expandWildcards: boolean (optional, default: true)
 *   If true, wildcards like 'system:*' will be expanded to all matching rights
 *
 * Response: Access rights for the role with optional wildcard expansion
 */
router.get('/role/:roleName', accessRightsController.getAccessRightsForRole);

export default router;
