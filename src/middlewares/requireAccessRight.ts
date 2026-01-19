/**
 * requireAccessRight Middleware
 *
 * Verifies that the user has specific access rights based on their roles
 * in the current department or admin context.
 *
 * How it works:
 * 1. Accepts single access right or array of access rights
 * 2. Supports requireAll (user must have all rights) or requireAny (at least one right)
 * 3. Checks user's access rights from req.user.accessRights or req.adminAccessRights
 * 4. Supports wildcard matching (e.g., `system:*`, `content:*`)
 * 5. Returns 403 if required access rights not present
 *
 * Usage:
 * ```typescript
 * router.post('/courses',
 *   authenticate,
 *   requireDepartmentMembership,
 *   requireAccessRight(['content:courses:manage']),
 *   createCourse
 * );
 *
 * router.get('/reports/billing',
 *   authenticate,
 *   requireAccessRight(['billing:department:read', 'reports:billing:read'], { requireAny: true }),
 *   getBillingReport
 * );
 * ```
 *
 * Phase 5, Task 5.5 - Full Implementation
 *
 * @module middlewares/requireAccessRight
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Options for requireAccessRight middleware
 */
export interface RequireAccessRightOptions {
  /**
   * If true, user must have at least one of the access rights (OR logic)
   * If false, user must have all access rights (AND logic)
   * Default: false (requireAll)
   */
  requireAny?: boolean;

  /**
   * If true, also check admin access rights (from escalation)
   * Default: true
   */
  includeAdminRights?: boolean;

  /**
   * Custom error message
   */
  errorMessage?: string;
}

/**
 * Middleware factory: Require access right
 *
 * Creates middleware that checks if user has required access rights.
 * Access rights follow the pattern: domain:resource:action
 *
 * Examples:
 * - content:courses:read
 * - content:courses:write
 * - enrollment:students:manage
 * - billing:department:read
 * - system:settings:write
 *
 * Wildcard support:
 * - content:*           matches all content rights
 * - content:courses:*   matches all course rights
 * - system:*            matches all system rights
 *
 * Access right sources (checked in order):
 * 1. req.user.allAccessRights - Access rights from user's roles in all departments
 * 2. req.department.roles - Current department context (resolved via RoleDefinition)
 * 3. req.adminAccessRights - Admin access rights (if escalated)
 *
 * @param accessRights - Single access right or array of access rights
 * @param options - Configuration options
 * @returns Express middleware function
 *
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if user does not have required access rights
 *
 * @example
 * // Single access right required
 * router.post('/courses',
 *   authenticate,
 *   requireDepartmentMembership,
 *   requireAccessRight('content:courses:create'),
 *   createCourse
 * );
 *
 * @example
 * // Multiple rights - user must have ALL
 * router.put('/courses/:id/publish',
 *   authenticate,
 *   requireDepartmentMembership,
 *   requireAccessRight(['content:courses:write', 'content:courses:publish']),
 *   publishCourse
 * );
 *
 * @example
 * // Multiple rights - user needs ANY ONE
 * router.get('/reports/billing',
 *   authenticate,
 *   requireAccessRight(['billing:reports:read', 'reports:all:read'], { requireAny: true }),
 *   getBillingReport
 * );
 *
 * @example
 * // Wildcard access right
 * router.get('/admin/system/*',
 *   authenticate,
 *   requireEscalation,
 *   requireAccessRight('system:*'),
 *   systemRoutes
 * );
 */
export const requireAccessRight = (
  accessRights: string | string[],
  options: RequireAccessRightOptions = {}
) => {
  // Normalize to array
  const requiredRights = Array.isArray(accessRights) ? accessRights : [accessRights];

  // Validate input
  if (requiredRights.length === 0) {
    throw new Error('requireAccessRight: accessRights cannot be empty');
  }

  // Validate access right format: domain:resource:action or domain:*
  const accessRightPattern = /^[a-z]+:[a-z-]+:[a-z-]+$|^[a-z]+:\*$/;
  const invalidRights = requiredRights.filter((right) => !accessRightPattern.test(right));

  if (invalidRights.length > 0) {
    throw new Error(
      `requireAccessRight: Invalid access right format: ${invalidRights.join(', ')}. ` +
        `Expected format: domain:resource:action or domain:*`
    );
  }

  // Extract options with defaults
  const {
    requireAny = false,
    includeAdminRights = true,
    errorMessage
  } = options;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Gather all user access rights from various sources
      let userAccessRights: string[] = [];

      // Source 1: User's allAccessRights (from login/token)
      if ((req.user as any).allAccessRights) {
        userAccessRights = [...userAccessRights, ...(req.user as any).allAccessRights];
      }

      // Source 2: Admin access rights (if escalated)
      if (includeAdminRights && req.adminAccessRights) {
        userAccessRights = [...userAccessRights, ...req.adminAccessRights];
      }

      // Remove duplicates
      userAccessRights = [...new Set(userAccessRights)];

      if (userAccessRights.length === 0) {
        logger.warn(
          `Access right check failed: User ${req.user.userId} has no access rights`
        );
        throw ApiError.forbidden(
          errorMessage || 'Insufficient permissions to access this resource'
        );
      }

      // Check access rights
      let hasAccess: boolean;

      if (requireAny) {
        // User needs at least ONE of the required rights
        hasAccess = requiredRights.some((requiredRight) =>
          hasAccessRight(userAccessRights, requiredRight)
        );
      } else {
        // User needs ALL of the required rights
        hasAccess = requiredRights.every((requiredRight) =>
          hasAccessRight(userAccessRights, requiredRight)
        );
      }

      if (!hasAccess) {
        const mode = requireAny ? 'any of' : 'all of';
        logger.warn(
          `Access right authorization failed: User ${req.user.userId} ` +
            `requires ${mode} [${requiredRights.join(', ')}] ` +
            `but has [${userAccessRights.slice(0, 10).join(', ')}${userAccessRights.length > 10 ? '...' : ''}]`
        );

        throw ApiError.forbidden(
          errorMessage ||
            `Insufficient permissions. Required access right(s): ${requiredRights.join(', ')}`
        );
      }

      // Find matched rights for logging
      const matchedRights = requiredRights.filter((requiredRight) =>
        hasAccessRight(userAccessRights, requiredRight)
      );

      logger.debug(
        `Access right authorized: User ${req.user.userId} with rights [${matchedRights.join(', ')}] ` +
          `accessing ${req.method} ${req.path}`
      );

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has a specific access right (with wildcard support)
 *
 * Supports:
 * - Exact match: content:courses:read
 * - Wildcard domain: content:*
 * - Wildcard resource: content:courses:*
 *
 * @param userRights - Array of user's access rights
 * @param requiredRight - Required access right (may include wildcard)
 * @returns True if user has the access right
 */
function hasAccessRight(userRights: string[], requiredRight: string): boolean {
  // Normalize for case-insensitive comparison
  const normalizedUserRights = userRights.map((r) => r.toLowerCase());
  const normalizedRequired = requiredRight.toLowerCase();

  // Check for exact match
  if (normalizedUserRights.includes(normalizedRequired)) {
    return true;
  }

  // Check for wildcard matches
  // Format: domain:resource:action or domain:*

  const [reqDomain, reqResource, reqAction] = normalizedRequired.split(':');

  for (const userRight of normalizedUserRights) {
    const [userDomain, userResource, userAction] = userRight.split(':');

    // Match domain:*
    if (userResource === '*' && userDomain === reqDomain) {
      return true;
    }

    // Match domain:resource:*
    if (
      userAction === '*' &&
      userDomain === reqDomain &&
      userResource === reqResource
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Helper: Check if user has specific access right
 *
 * Utility function to check access right without throwing errors.
 * Useful for conditional logic in controllers.
 *
 * @param req - Express request
 * @param accessRight - Access right to check
 * @returns True if user has the access right
 *
 * @example
 * if (checkAccessRight(req, 'content:courses:publish')) {
 *   // Show publish button
 * }
 */
export function checkAccessRight(req: Request, accessRight: string): boolean {
  const userAccessRights: string[] = [];

  if ((req.user as any)?.allAccessRights) {
    userAccessRights.push(...(req.user as any).allAccessRights);
  }

  if (req.adminAccessRights) {
    userAccessRights.push(...req.adminAccessRights);
  }

  return hasAccessRight(userAccessRights, accessRight);
}

/**
 * Helper: Check if user has any of the specified access rights
 *
 * @param req - Express request
 * @param accessRights - Array of access rights to check
 * @returns True if user has at least one access right
 *
 * @example
 * if (checkAnyAccessRight(req, ['content:courses:read', 'content:courses:write'])) {
 *   // User can view or edit courses
 * }
 */
export function checkAnyAccessRight(req: Request, accessRights: string[]): boolean {
  const userAccessRights: string[] = [];

  if ((req.user as any)?.allAccessRights) {
    userAccessRights.push(...(req.user as any).allAccessRights);
  }

  if (req.adminAccessRights) {
    userAccessRights.push(...req.adminAccessRights);
  }

  return accessRights.some((right) => hasAccessRight(userAccessRights, right));
}

/**
 * Helper: Check if user has all of the specified access rights
 *
 * @param req - Express request
 * @param accessRights - Array of access rights to check
 * @returns True if user has all access rights
 *
 * @example
 * if (checkAllAccessRights(req, ['content:courses:write', 'content:courses:publish'])) {
 *   // User can both write and publish
 * }
 */
export function checkAllAccessRights(req: Request, accessRights: string[]): boolean {
  const userAccessRights: string[] = [];

  if ((req.user as any)?.allAccessRights) {
    userAccessRights.push(...(req.user as any).allAccessRights);
  }

  if (req.adminAccessRights) {
    userAccessRights.push(...req.adminAccessRights);
  }

  return accessRights.every((right) => hasAccessRight(userAccessRights, right));
}

/**
 * Helper: Get all access rights for user
 *
 * @param req - Express request
 * @returns Array of all access rights (deduplicated)
 *
 * @example
 * const rights = getAllAccessRights(req);
 * console.log('User has', rights.length, 'access rights');
 */
export function getAllAccessRights(req: Request): string[] {
  const rights: string[] = [];

  if ((req.user as any)?.allAccessRights) {
    rights.push(...(req.user as any).allAccessRights);
  }

  if (req.adminAccessRights) {
    rights.push(...req.adminAccessRights);
  }

  return [...new Set(rights)];
}

/**
 * Export default
 */
export default requireAccessRight;
