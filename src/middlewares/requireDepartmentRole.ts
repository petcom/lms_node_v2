/**
 * requireDepartmentRole Middleware
 *
 * Verifies that the authenticated user has at least one of the required roles
 * in the current department context.
 *
 * How it works:
 * 1. Checks that req.department exists (set by requireDepartmentMembership)
 * 2. Verifies user has at least one of the allowed roles
 * 3. Supports role cascading through department context
 * 4. Returns 403 if no matching role found
 *
 * Usage:
 * ```typescript
 * router.post('/courses',
 *   authenticate,
 *   requireDepartmentMembership,
 *   requireDepartmentRole(['content-admin', 'department-admin']),
 *   createCourse
 * );
 * ```
 *
 * Phase 5, Task 5.2 - Full Implementation
 *
 * @module middlewares/requireDepartmentRole
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Middleware factory: Require department role
 *
 * Creates middleware that checks if user has at least one of the specified roles
 * in the current department context.
 *
 * Prerequisites:
 * - authenticate middleware must run first
 * - requireDepartmentMembership middleware must run first
 *
 * The middleware checks req.department.roles (set by requireDepartmentMembership)
 * and verifies the user has at least one role from the allowedRoles array.
 *
 * Role cascading is supported automatically through req.department, which includes
 * cascaded roles from parent departments.
 *
 * @param allowedRoles - Array of role names that are allowed (e.g., ['content-admin', 'instructor'])
 * @returns Express middleware function
 *
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if req.department is missing (requireDepartmentMembership not run)
 * @throws ApiError 403 if user does not have any of the required roles
 *
 * @example
 * // Single role
 * router.put('/course/:id',
 *   authenticate,
 *   requireDepartmentMembership,
 *   requireDepartmentRole(['content-admin']),
 *   updateCourse
 * );
 *
 * @example
 * // Multiple roles (any one grants access)
 * router.post('/course',
 *   authenticate,
 *   requireDepartmentMembership,
 *   requireDepartmentRole(['content-admin', 'department-admin', 'instructor']),
 *   createCourse
 * );
 *
 * @example
 * // Staff management
 * router.post('/staff',
 *   authenticate,
 *   requireDepartmentMembership,
 *   requireDepartmentRole(['department-admin']),
 *   addStaff
 * );
 */
export const requireDepartmentRole = (allowedRoles: string[]) => {
  // Validate input
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('requireDepartmentRole: allowedRoles must be a non-empty array');
  }

  // Normalize role names to lowercase for case-insensitive comparison
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Check department context exists
      if (!req.department) {
        logger.error(
          'requireDepartmentRole middleware called without department context. ' +
            'Ensure requireDepartmentMembership runs before requireDepartmentRole.'
        );
        throw ApiError.forbidden(
          'Department context required. Please access this resource through a department.'
        );
      }

      // Get user's roles in current department
      const userRoles = req.department.roles || [];

      // Normalize user roles for case-insensitive comparison
      const normalizedUserRoles = userRoles.map((r) => r.toLowerCase());

      // Check if user has at least one allowed role
      const hasRequiredRole = normalizedUserRoles.some((role) =>
        normalizedAllowedRoles.includes(role)
      );

      if (!hasRequiredRole) {
        logger.warn(
          `Department role authorization failed: User ${req.user.userId} with roles [${userRoles.join(', ')}] ` +
            `attempted to access resource requiring [${allowedRoles.join(', ')}] in department ${req.department.departmentName}`
        );

        throw ApiError.forbidden(
          `Insufficient permissions. Required role(s): ${allowedRoles.join(', ')}`
        );
      }

      // Find matching role for logging
      const matchedRole = userRoles.find((role) =>
        normalizedAllowedRoles.includes(role.toLowerCase())
      );

      logger.debug(
        `Department role authorized: User ${req.user.userId} with role '${matchedRole}' ` +
          `accessing resource in department ${req.department.departmentName}${
            req.department.isCascaded ? ' (cascaded)' : ''
          }`
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper: Check if user has specific role in department
 *
 * Utility function to check role without throwing errors.
 * Useful for conditional logic in controllers.
 *
 * @param req - Express request with department context
 * @param roleName - Role name to check
 * @returns True if user has the role in current department
 *
 * @example
 * if (hasDepartmentRole(req, 'department-admin')) {
 *   // Show admin options
 * }
 */
export function hasDepartmentRole(req: Request, roleName: string): boolean {
  if (!req.department || !req.department.roles) {
    return false;
  }

  const normalizedRoleName = roleName.toLowerCase();
  return req.department.roles.some((r) => r.toLowerCase() === normalizedRoleName);
}

/**
 * Helper: Check if user has any of the specified roles
 *
 * @param req - Express request with department context
 * @param roleNames - Array of role names to check
 * @returns True if user has at least one of the roles
 *
 * @example
 * if (hasAnyDepartmentRole(req, ['content-admin', 'department-admin'])) {
 *   // Show management features
 * }
 */
export function hasAnyDepartmentRole(req: Request, roleNames: string[]): boolean {
  if (!req.department || !req.department.roles) {
    return false;
  }

  const normalizedRoleNames = roleNames.map((r) => r.toLowerCase());
  return req.department.roles.some((r) => normalizedRoleNames.includes(r.toLowerCase()));
}

/**
 * Helper: Check if user has all of the specified roles
 *
 * @param req - Express request with department context
 * @param roleNames - Array of role names to check
 * @returns True if user has all of the roles
 *
 * @example
 * if (hasAllDepartmentRoles(req, ['instructor', 'content-admin'])) {
 *   // User has both roles
 * }
 */
export function hasAllDepartmentRoles(req: Request, roleNames: string[]): boolean {
  if (!req.department || !req.department.roles) {
    return false;
  }

  const normalizedUserRoles = req.department.roles.map((r) => r.toLowerCase());
  return roleNames.every((role) => normalizedUserRoles.includes(role.toLowerCase()));
}

/**
 * Export default
 */
export default requireDepartmentRole;
