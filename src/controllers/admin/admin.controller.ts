/**
 * Admin Controller
 *
 * System-admin only controllers for managing user role assignments,
 * global admin assignments, and role-access right mappings.
 *
 * All methods are protected by:
 * - requireEscalation middleware
 * - requireAdminRole(['system-admin']) middleware
 * - requireAccessRight('system:*') middleware
 *
 * @module controllers/admin/admin
 */

import { Request, Response, NextFunction } from 'express';
import * as roleManagementService from '@/services/admin/role-management.service';

// Types inlined from contracts to avoid rootDir issues
interface AssignUserRoleRequest {
  departmentId: string;
  roleName: string;
  isPrimary?: boolean;
  expiresAt?: Date;
}

interface UpdateUserRoleRequest {
  departmentId?: string;
  roles?: string[];
  isPrimary?: boolean;
  expiresAt?: Date | null;
  isActive?: boolean;
}

interface CreateGlobalAdminRequest {
  userId: string;
  roles: string[];
  masterDepartmentId: string;
  isPrimary?: boolean;
}

interface UpdateGlobalAdminRolesRequest {
  roles: string[];
  departmentId?: string;
}

interface UpdateRoleAccessRightsRequest {
  accessRightIds: string[];
}

interface AddRoleAccessRightRequest {
  accessRightId: string;
}

interface BulkAssignRolesRequest {
  assignments: Array<{
    userId: string;
    departmentId: string;
    roleName: string;
    isPrimary?: boolean;
  }>;
}

interface BulkRemoveRolesRequest {
  removals: Array<{
    userId: string;
    membershipId: string;
  }>;
}

interface SearchUsersRequest {
  query?: string;
  userType?: 'staff' | 'learner' | 'all';
  departmentId?: string;
  hasRole?: string;
  withoutRole?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// USER ROLE ASSIGNMENT
// ============================================================================

/**
 * GET /api/v2/admin/users/search
 * Search for users to assign roles
 */
export async function searchUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters: SearchUsersRequest = {
      query: req.query.query as string,
      userType: req.query.userType as 'staff' | 'learner' | 'all',
      departmentId: req.query.departmentId as string,
      hasRole: req.query.hasRole as string,
      withoutRole: req.query.withoutRole as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    };

    const result = await roleManagementService.searchUsers(filters);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v2/admin/users/:userId/roles
 * List all role assignments for a user
 */
export async function getUserRoles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    const result = await roleManagementService.getUserRoles(userId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v2/admin/users/:userId/roles
 * Assign a role to a user in a specific department
 */
export async function assignUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    const { departmentId, roleName, isPrimary, expiresAt }: AssignUserRoleRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.assignUserRole(
      userId,
      departmentId,
      roleName,
      isPrimary,
      expiresAt,
      adminUserId
    );

    res.status(201).json({
      success: true,
      data: result,
      message: `Role '${roleName}' assigned to user successfully`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v2/admin/users/:userId/roles/:membershipId
 * Update a role membership
 */
export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, membershipId } = req.params;
    const updates: UpdateUserRoleRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.updateRoleMembership(
      userId,
      membershipId,
      updates,
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Role membership updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v2/admin/users/:userId/roles/:membershipId
 * Remove a role assignment from a user
 */
export async function removeUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, membershipId } = req.params;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.removeUserRole(
      userId,
      membershipId,
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Role removed from user successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v2/admin/users/:userId/role-history
 * View role assignment history for a user
 */
export async function getUserRoleHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    const result = await roleManagementService.getUserRoleHistory(userId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// GLOBAL ADMIN MANAGEMENT
// ============================================================================

/**
 * GET /api/v2/admin/global-admins
 * List all global admins
 */
export async function listGlobalAdmins(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await roleManagementService.listGlobalAdmins();

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v2/admin/global-admins
 * Create a global admin (or promote existing user)
 */
export async function createGlobalAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      userId,
      roles,
      masterDepartmentId,
      isPrimary
    }: CreateGlobalAdminRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.createGlobalAdmin(
      userId,
      roles,
      masterDepartmentId,
      isPrimary,
      adminUserId
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Global admin created successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v2/admin/global-admins/:userId
 * Remove global admin status from a user
 */
export async function removeGlobalAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.removeGlobalAdmin(userId, adminUserId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Global admin removed successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v2/admin/global-admins/:userId/roles
 * Update global admin roles
 */
export async function updateGlobalAdminRoles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req.params;
    const { roles, departmentId }: UpdateGlobalAdminRolesRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.updateGlobalAdminRoles(
      userId,
      roles,
      departmentId,
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Global admin roles updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// ROLE DEFINITION MANAGEMENT
// ============================================================================

/**
 * GET /api/v2/admin/role-definitions
 * List all role definitions
 */
export async function getRoleDefinitions(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await roleManagementService.getRoleDefinitions();

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v2/admin/role-definitions/:roleName
 * Get detailed information about a specific role
 */
export async function getRoleDefinition(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { roleName } = req.params;

    const result = await roleManagementService.getRoleDefinition(roleName);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/v2/admin/role-definitions/:roleName/access-rights
 * Update access rights for a role (replace entire list)
 */
export async function updateRoleAccessRights(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { roleName } = req.params;
    const { accessRightIds }: UpdateRoleAccessRightsRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.updateRoleAccessRights(
      roleName,
      accessRightIds,
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: `Access rights updated for role '${roleName}'`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v2/admin/role-definitions/:roleName/access-rights
 * Add a single access right to a role
 */
export async function addAccessRightToRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { roleName } = req.params;
    const { accessRightId }: AddRoleAccessRightRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.addAccessRightToRole(
      roleName,
      accessRightId,
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: `Access right added to role '${roleName}'`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/v2/admin/role-definitions/:roleName/access-rights/:rightId
 * Remove a single access right from a role
 */
export async function removeAccessRightFromRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { roleName, rightId } = req.params;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.removeAccessRightFromRole(
      roleName,
      rightId,
      adminUserId
    );

    res.status(200).json({
      success: true,
      data: result,
      message: `Access right removed from role '${roleName}'`
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * POST /api/v2/admin/users/bulk/assign-roles
 * Assign roles to multiple users at once
 */
export async function bulkAssignRoles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { assignments }: BulkAssignRolesRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.bulkAssignRoles(assignments, adminUserId);

    res.status(200).json({
      success: true,
      data: result,
      message: `Bulk role assignment completed: ${result.successful} successful, ${result.failed} failed`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v2/admin/users/bulk/remove-roles
 * Remove roles from multiple users at once
 */
export async function bulkRemoveRoles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { removals }: BulkRemoveRolesRequest = req.body;

    const adminUserId = req.user?.userId;

    const result = await roleManagementService.bulkRemoveRoles(removals, adminUserId);

    res.status(200).json({
      success: true,
      data: result,
      message: `Bulk role removal completed: ${result.successful} successful, ${result.failed} failed`
    });
  } catch (error) {
    next(error);
  }
}
