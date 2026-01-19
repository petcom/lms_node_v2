import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import { requireEscalation } from '@/middlewares/requireEscalation';
import { requireAdminRole } from '@/middlewares/requireAdminRole';
import * as adminController from '@/controllers/admin/admin.controller';

const router = Router();

/**
 * Admin Role Management Routes
 * Base path: /api/v2/admin
 *
 * System-admin only endpoints for managing user role assignments,
 * global admin assignments, and role-access right mappings.
 *
 * Authorization:
 * - ALL endpoints require system-admin role
 * - ALL endpoints require escalation (admin token)
 * - Access right: system:*
 *
 * Safety Features:
 * - Cannot remove last system-admin from system
 * - Role compatibility validation (staff vs learner roles)
 * - Complete audit trail of all role changes
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Apply common middleware to all routes: escalation + admin role + access right
router.use(requireEscalation);
router.use(requireAdminRole(['system-admin']));
router.use(requireAccessRight('system:*'));

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * GET /api/v2/admin/users/search
 * Search for users to assign roles
 * Query params:
 *   - query: string (optional) - Search by name or email
 *   - userType: 'staff' | 'learner' | 'all' (optional)
 *   - departmentId: ObjectId (optional) - Filter by department
 *   - hasRole: string (optional) - Filter by role name
 *   - withoutRole: string (optional) - Users without this role
 *   - page: number (optional) - Page number (default: 1)
 *   - limit: number (optional) - Items per page (default: 20)
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.get('/users/search', adminController.searchUsers);

/**
 * GET /api/v2/admin/users/:userId/roles
 * List all role assignments for a user
 * Params:
 *   - userId: ObjectId (required) - User ID
 * Returns:
 *   - User's department memberships with roles
 *   - Calculated access rights from all roles
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.get('/users/:userId/roles', adminController.getUserRoles);

/**
 * POST /api/v2/admin/users/:userId/roles
 * Assign a role to a user in a specific department
 * Params:
 *   - userId: ObjectId (required) - User ID
 * Body:
 *   - departmentId: ObjectId (required) - Department ID
 *   - roleName: string (required) - Role name (instructor, content-admin, etc.)
 *   - isPrimary: boolean (optional) - Primary department (default: false)
 *   - expiresAt: Date (optional) - Role expiration date
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 * Validates: Role compatibility with user type (staff vs learner)
 */
router.post('/users/:userId/roles', adminController.assignUserRole);

/**
 * PUT /api/v2/admin/users/:userId/roles/:membershipId
 * Update a role membership (change department, roles, expiration, etc.)
 * Params:
 *   - userId: ObjectId (required) - User ID
 *   - membershipId: ObjectId (required) - Membership ID
 * Body:
 *   - departmentId: ObjectId (optional) - Move to different department
 *   - roles: string[] (optional) - Replace roles array
 *   - isPrimary: boolean (optional) - Change primary status
 *   - expiresAt: Date | null (optional) - Update or remove expiration
 *   - isActive: boolean (optional) - Activate/deactivate membership
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.put('/users/:userId/roles/:membershipId', adminController.updateUserRole);

/**
 * DELETE /api/v2/admin/users/:userId/roles/:membershipId
 * Remove a role assignment from a user
 * Params:
 *   - userId: ObjectId (required) - User ID
 *   - membershipId: ObjectId (required) - Membership ID
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.delete('/users/:userId/roles/:membershipId', adminController.removeUserRole);

/**
 * GET /api/v2/admin/users/:userId/role-history
 * View complete role assignment history for a user
 * Params:
 *   - userId: ObjectId (required) - User ID
 * Returns:
 *   - Complete audit trail of role assignments, removals, and updates
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.get('/users/:userId/role-history', adminController.getUserRoleHistory);

// ============================================================================
// GLOBAL ADMIN MANAGEMENT
// ============================================================================

/**
 * GET /api/v2/admin/global-admins
 * List all global admins
 * Returns:
 *   - All users with global admin roles (system-admin, enrollment-admin, etc.)
 *   - Their role memberships and calculated access rights
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.get('/global-admins', adminController.listGlobalAdmins);

/**
 * POST /api/v2/admin/global-admins
 * Create a global admin (or promote existing user)
 * Body:
 *   - userId: ObjectId (required) - User to promote
 *   - roles: string[] (required) - Global admin roles (system-admin, enrollment-admin, etc.)
 *   - masterDepartmentId: ObjectId (required) - Master department for the admin
 *   - isPrimary: boolean (optional) - Primary department (default: true)
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.post('/global-admins', adminController.createGlobalAdmin);

/**
 * DELETE /api/v2/admin/global-admins/:userId
 * Remove global admin status from a user (demote to regular user)
 * Params:
 *   - userId: ObjectId (required) - User ID
 * Safety:
 *   - CANNOT remove last system-admin from system
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.delete('/global-admins/:userId', adminController.removeGlobalAdmin);

/**
 * PUT /api/v2/admin/global-admins/:userId/roles
 * Update global admin roles
 * Params:
 *   - userId: ObjectId (required) - User ID
 * Body:
 *   - roles: string[] (required) - Replace entire roles array
 *   - departmentId: ObjectId (optional) - Change master department
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.put('/global-admins/:userId/roles', adminController.updateGlobalAdminRoles);

// ============================================================================
// ROLE DEFINITION MANAGEMENT
// ============================================================================

/**
 * GET /api/v2/admin/role-definitions
 * List all role definitions with their access rights
 * Returns:
 *   - All role definitions (instructor, content-admin, department-admin, etc.)
 *   - Access rights granted by each role
 *   - Role metadata (isGlobalRole, isDepartmentRole, etc.)
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.get('/role-definitions', adminController.getRoleDefinitions);

/**
 * GET /api/v2/admin/role-definitions/:roleName
 * Get detailed information about a specific role
 * Params:
 *   - roleName: string (required) - Role name (e.g., 'instructor', 'system-admin')
 * Returns:
 *   - Role definition with full access rights details
 *   - User count (how many users have this role)
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.get('/role-definitions/:roleName', adminController.getRoleDefinition);

/**
 * PUT /api/v2/admin/role-definitions/:roleName/access-rights
 * Update access rights for a role (replace entire list)
 * Params:
 *   - roleName: string (required) - Role name
 * Body:
 *   - accessRightIds: ObjectId[] (required) - Array of AccessRight IDs
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 * Note: Replaces ALL access rights for the role
 */
router.put('/role-definitions/:roleName/access-rights', adminController.updateRoleAccessRights);

/**
 * POST /api/v2/admin/role-definitions/:roleName/access-rights
 * Add a single access right to a role
 * Params:
 *   - roleName: string (required) - Role name
 * Body:
 *   - accessRightId: ObjectId (required) - AccessRight ID to add
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.post('/role-definitions/:roleName/access-rights', adminController.addAccessRightToRole);

/**
 * DELETE /api/v2/admin/role-definitions/:roleName/access-rights/:rightId
 * Remove a single access right from a role
 * Params:
 *   - roleName: string (required) - Role name
 *   - rightId: ObjectId (required) - AccessRight ID to remove
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.delete('/role-definitions/:roleName/access-rights/:rightId', adminController.removeAccessRightFromRole);

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/v2/admin/users/bulk/assign-roles
 * Assign roles to multiple users at once
 * Body:
 *   - assignments: Array<{userId, departmentId, roleName, isPrimary?}> (required)
 * Returns:
 *   - Successful count
 *   - Failed count
 *   - Detailed results per user
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.post('/users/bulk/assign-roles', adminController.bulkAssignRoles);

/**
 * POST /api/v2/admin/users/bulk/remove-roles
 * Remove roles from multiple users at once
 * Body:
 *   - removals: Array<{userId, membershipId}> (required)
 * Returns:
 *   - Successful count
 *   - Failed count
 *   - Detailed results per user
 * Access Rights: system:*
 * Roles: system-admin
 * Requires: Escalation + Admin Role
 */
router.post('/users/bulk/remove-roles', adminController.bulkRemoveRoles);

export default router;
