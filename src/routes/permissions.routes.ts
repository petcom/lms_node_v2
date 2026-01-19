import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as permissionsController from '@/controllers/auth/permissions.controller';

const router = Router();

/**
 * Permissions & Role Management Routes
 * Base path: /api/v2/permissions
 *
 * All routes require authentication
 * Most routes require system:read or permissions:read permissions
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/permissions
 * List all available permissions grouped by category
 *
 * Query params:
 * - category: Filter by permission category (users, courses, content, etc.)
 *
 * Permissions required: system:read or permissions:read
 */
router.get('/', permissionsController.listPermissions);

/**
 * GET /api/v2/permissions/roles
 * List all roles with their permissions and metadata
 *
 * Query params:
 * - includeBuiltIn: Include built-in system roles (default: true)
 * - includeCustom: Include custom roles (default: true)
 * - departmentId: Filter roles by department scope
 *
 * Permissions required: permissions:read or users:read
 */
router.get('/roles', permissionsController.listRoles);

/**
 * POST /api/v2/permissions/roles
 * Create a new custom role with specific permissions
 *
 * Body:
 * - name: Role name (lowercase, hyphen-separated)
 * - description: Role description (10-500 chars)
 * - level: Role level (11-99 for custom roles)
 * - permissions: Array of permission keys
 * - departmentId: Department scope (optional, null for global)
 * - inheritsFrom: Parent role to inherit permissions from (optional)
 *
 * Permissions required: permissions:write or system:manage
 */
router.post('/roles', permissionsController.createRole);

/**
 * GET /api/v2/permissions/roles/:roleId
 * Get detailed information about a specific role
 *
 * Params:
 * - roleId: Role ID or built-in role name (e.g., "system-admin")
 *
 * Query params:
 * - includeUsers: Include list of users with this role (default: false)
 *
 * Permissions required: permissions:read or users:read
 */
router.get('/roles/:roleId', permissionsController.getRoleDetails);

/**
 * PUT /api/v2/permissions/roles/:roleId
 * Update custom role permissions and metadata
 *
 * Params:
 * - roleId: Role ID
 *
 * Body:
 * - description: Role description (optional)
 * - level: Role level 11-99 (optional)
 * - permissions: Complete list of permissions (optional, replaces existing)
 * - isActive: Enable or disable role (optional)
 *
 * Permissions required: permissions:write or system:manage
 * Note: Cannot modify built-in roles
 */
router.put('/roles/:roleId', permissionsController.updateRole);

/**
 * DELETE /api/v2/permissions/roles/:roleId
 * Delete a custom role
 *
 * Params:
 * - roleId: Role ID
 *
 * Query params:
 * - reassignTo: Role ID to reassign users to (required if role has users)
 *
 * Permissions required: permissions:delete or system:manage
 * Note: Cannot delete built-in roles
 */
router.delete('/roles/:roleId', permissionsController.deleteRole);

/**
 * GET /api/v2/permissions/user/:userId
 * Get effective permissions for a specific user
 *
 * Params:
 * - userId: User ID (use "me" for current user)
 *
 * Query params:
 * - departmentId: Calculate permissions for specific department context (optional)
 *
 * Permissions required: permissions:read or users:read (or own user)
 */
router.get('/user/:userId', permissionsController.getUserPermissions);

/**
 * POST /api/v2/permissions/check
 * Check if current user has specific permission(s)
 *
 * Body:
 * - permission: Single permission to check (optional)
 * - permissions: Multiple permissions to check (optional)
 * - requireAll: If true, user must have ALL permissions (default: false)
 * - departmentId: Check permission within specific department context (optional)
 * - resourceId: Check permission on specific resource (optional)
 *
 * Permissions required: authenticated (any authenticated user can check their own permissions)
 */
router.post('/check', permissionsController.checkPermission);

export default router;
