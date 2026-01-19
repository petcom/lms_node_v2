/**
 * requireAdminRole Middleware
 *
 * Verifies that the escalated admin user has at least one of the required
 * global admin roles.
 *
 * How it works:
 * 1. Must run after requireEscalation middleware
 * 2. Checks req.adminRoles for required role(s)
 * 3. Returns 403 if user doesn't have any of the required roles
 *
 * Usage:
 * ```typescript
 * router.put('/admin/settings',
 *   authenticate,
 *   requireEscalation,
 *   requireAdminRole(['system-admin', 'theme-admin']),
 *   updateSettings
 * );
 * ```
 *
 * Phase 5, Task 5.4 - Full Implementation
 *
 * @module middlewares/requireAdminRole
 */

import { Request, Response, NextFunction } from 'express';
import { GLOBAL_ADMIN_ROLES } from '@/models/GlobalAdmin.model';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Valid global admin role names
 */
const VALID_ADMIN_ROLES = GLOBAL_ADMIN_ROLES as readonly string[];

/**
 * Middleware factory: Require admin role
 *
 * Creates middleware that checks if the escalated admin user has at least one
 * of the specified global admin roles.
 *
 * Prerequisites:
 * - authenticate middleware must run first
 * - requireEscalation middleware must run first (sets req.adminRoles)
 *
 * The middleware checks req.adminRoles (set by requireEscalation) and verifies
 * the user has at least one role from the allowedRoles array.
 *
 * Valid admin roles:
 * - system-admin: Full system access
 * - enrollment-admin: Enrollment management
 * - course-admin: Course and content management
 * - theme-admin: Theme and branding management
 * - financial-admin: Financial and billing management
 *
 * @param allowedRoles - Array of admin role names required
 * @returns Express middleware function
 *
 * @throws Error if allowedRoles is empty or contains invalid roles
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if user is not escalated (requireEscalation not run)
 * @throws ApiError 403 if user does not have any of the required admin roles
 *
 * @example
 * // Single admin role
 * router.delete('/admin/users/:id',
 *   authenticate,
 *   requireEscalation,
 *   requireAdminRole(['system-admin']),
 *   deleteUser
 * );
 *
 * @example
 * // Multiple admin roles (any one grants access)
 * router.put('/admin/courses/:id',
 *   authenticate,
 *   requireEscalation,
 *   requireAdminRole(['system-admin', 'course-admin']),
 *   updateCourse
 * );
 *
 * @example
 * // Financial operations
 * router.get('/admin/billing/reports',
 *   authenticate,
 *   requireEscalation,
 *   requireAdminRole(['system-admin', 'financial-admin']),
 *   getBillingReports
 * );
 *
 * @example
 * // Theme management
 * router.put('/admin/theme',
 *   authenticate,
 *   requireEscalation,
 *   requireAdminRole(['system-admin', 'theme-admin']),
 *   updateTheme
 * );
 */
export const requireAdminRole = (allowedRoles: string[]) => {
  // Validate input at middleware creation time
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('requireAdminRole: allowedRoles must be a non-empty array');
  }

  // Validate all roles are valid admin roles
  const invalidRoles = allowedRoles.filter(
    (role) => !VALID_ADMIN_ROLES.includes(role as any)
  );

  if (invalidRoles.length > 0) {
    throw new Error(
      `requireAdminRole: Invalid admin role(s): ${invalidRoles.join(', ')}. ` +
        `Valid roles: ${VALID_ADMIN_ROLES.join(', ')}`
    );
  }

  // Normalize role names to lowercase for case-insensitive comparison
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Check escalation (adminRoles should be set by requireEscalation)
      if (!req.adminRoles || req.adminRoles.length === 0) {
        logger.error(
          'requireAdminRole middleware called without admin escalation. ' +
            'Ensure requireEscalation runs before requireAdminRole.'
        );
        throw ApiError.forbidden(
          'Admin escalation required. Please escalate to admin mode first.'
        );
      }

      // Normalize user's admin roles for case-insensitive comparison
      const normalizedUserRoles = req.adminRoles.map((r) => r.toLowerCase());

      // Check if user has at least one required admin role
      const hasRequiredRole = normalizedUserRoles.some((role) =>
        normalizedAllowedRoles.includes(role)
      );

      if (!hasRequiredRole) {
        logger.warn(
          `Admin role authorization failed: User ${req.user.userId} with admin roles [${req.adminRoles.join(', ')}] ` +
            `attempted to access resource requiring [${allowedRoles.join(', ')}]`
        );

        throw ApiError.forbidden(
          `Insufficient admin permissions. Required admin role(s): ${allowedRoles.join(', ')}`
        );
      }

      // Find matching role for logging
      const matchedRole = req.adminRoles.find((role) =>
        normalizedAllowedRoles.includes(role.toLowerCase())
      );

      logger.debug(
        `Admin role authorized: User ${req.user.userId} with admin role '${matchedRole}' ` +
          `accessing ${req.method} ${req.path}`
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Helper: Check if user has specific admin role
 *
 * Utility function to check admin role without throwing errors.
 * Useful for conditional logic in controllers.
 *
 * @param req - Express request with admin context
 * @param roleName - Admin role name to check
 * @returns True if user has the admin role
 *
 * @example
 * if (hasAdminRole(req, 'system-admin')) {
 *   // Show system admin options
 * }
 */
export function hasAdminRole(req: Request, roleName: string): boolean {
  if (!req.adminRoles || req.adminRoles.length === 0) {
    return false;
  }

  const normalizedRoleName = roleName.toLowerCase();
  return req.adminRoles.some((r) => r.toLowerCase() === normalizedRoleName);
}

/**
 * Helper: Check if user has any of the specified admin roles
 *
 * @param req - Express request with admin context
 * @param roleNames - Array of admin role names to check
 * @returns True if user has at least one of the admin roles
 *
 * @example
 * if (hasAnyAdminRole(req, ['system-admin', 'course-admin'])) {
 *   // Show course management features
 * }
 */
export function hasAnyAdminRole(req: Request, roleNames: string[]): boolean {
  if (!req.adminRoles || req.adminRoles.length === 0) {
    return false;
  }

  const normalizedRoleNames = roleNames.map((r) => r.toLowerCase());
  return req.adminRoles.some((r) => normalizedRoleNames.includes(r.toLowerCase()));
}

/**
 * Helper: Check if user has all of the specified admin roles
 *
 * @param req - Express request with admin context
 * @param roleNames - Array of admin role names to check
 * @returns True if user has all of the admin roles
 *
 * @example
 * if (hasAllAdminRoles(req, ['system-admin', 'financial-admin'])) {
 *   // User has both admin roles
 * }
 */
export function hasAllAdminRoles(req: Request, roleNames: string[]): boolean {
  if (!req.adminRoles || req.adminRoles.length === 0) {
    return false;
  }

  const normalizedUserRoles = req.adminRoles.map((r) => r.toLowerCase());
  return roleNames.every((role) => normalizedUserRoles.includes(role.toLowerCase()));
}

/**
 * Helper: Check if user is system admin (highest privilege)
 *
 * @param req - Express request with admin context
 * @returns True if user has system-admin role
 *
 * @example
 * if (isSystemAdmin(req)) {
 *   // Show all admin features
 * }
 */
export function isSystemAdmin(req: Request): boolean {
  return hasAdminRole(req, 'system-admin');
}

/**
 * Export default
 */
export default requireAdminRole;
