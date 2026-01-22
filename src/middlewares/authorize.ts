/**
 * Unified Authorization Middleware
 *
 * Route-level authorization middleware wrapping the unified authorization system.
 * Provides a consistent API for checking access rights across routes and services.
 *
 * This middleware works alongside the existing `requireAccessRight()` middleware
 * and is designed to eventually replace it as part of the unified authorization model.
 *
 * Features:
 * - Single `authorize(right)` for route protection
 * - `authorize.anyOf(rights)` for checking any of multiple rights
 * - `authorize.allOf(rights)` for checking all of multiple rights
 * - `authorize.check()` for service-level authorization checks
 * - Support for scoped permissions (global, department, own)
 * - Department hierarchy support
 * - Detailed error messages for debugging
 *
 * Architecture Decision: ADR-AUTH-001 (2026-01-22)
 * See: agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md
 *
 * @module middlewares/authorize
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';
import type { AuthenticatedUser } from '@/middlewares/isAuthenticated';

// ============================================================================
// TYPES (inlined from contracts/api/authorization.contract.ts to avoid rootDir issues)
// ============================================================================

/**
 * Permission scope types
 */
export type PermissionScope =
  | '*'                    // Global - applies everywhere
  | `dept:${string}`       // Department-specific
  | 'own';                 // Own resources only

/**
 * A single permission with its scope
 */
export interface Permission {
  /** Access right in domain:resource:action format */
  right: string;
  /** Scope of the permission */
  scope: PermissionScope;
  /** Source of this permission (for auditing) */
  source: {
    role: string;
    departmentId?: string;
  };
}

/**
 * Resource context for authorization checks
 */
export interface ResourceContext {
  /** Resource type (e.g., 'course', 'enrollment') */
  type: string;
  /** Resource ID */
  id: string;
  /** Department the resource belongs to */
  departmentId?: string;
  /** Creator of the resource */
  createdBy?: string;
}

/**
 * Authorization result
 */
export interface AuthorizeResult {
  /** Whether authorization was granted */
  allowed: boolean;
  /** Reason for the decision */
  reason: 'global_right' | 'department_right' | 'hierarchy_right' | 'own_resource' | 'denied';
  /** Which permission granted access (if allowed) */
  grantedBy?: Permission;
}

/**
 * Options for authorization checks
 */
export interface AuthorizeOptions {
  /**
   * Specific scope to check (optional)
   * - '*' for global scope
   * - 'dept:123' for specific department
   * - 'own' for own resources only
   */
  scope?: PermissionScope;

  /**
   * Resource context for resource-level checks (optional)
   */
  resource?: ResourceContext;

  /**
   * Custom error message (optional)
   */
  errorMessage?: string;
}

/**
 * Authorization service for checking user permissions
 *
 * This implements the authorization logic defined in the authorization contract.
 * It checks permissions in the following order:
 * 1. Global rights (exact match or wildcard)
 * 2. Department-scoped rights (if scope or resource specifies department)
 * 3. Department hierarchy (parent department rights apply to children)
 * 4. Own resource rights (if resource.createdBy matches user)
 */
class AuthorizeService {
  /**
   * Check if user is authorized for an action
   *
   * @param user - Authenticated user context
   * @param right - Required access right in domain:resource:action format
   * @param options - Optional scope and resource context
   * @returns Authorization result with reason
   *
   * @example
   * // Route-level check
   * const result = await AuthorizeService.authorize(user, 'content:courses:read');
   *
   * @example
   * // Department-scoped check
   * const result = await AuthorizeService.authorize(user, 'content:courses:read', {
   *   scope: 'dept:123'
   * });
   *
   * @example
   * // Resource-level check
   * const result = await AuthorizeService.authorize(user, 'content:courses:read', {
   *   resource: { type: 'course', id: '456', departmentId: '123' }
   * });
   */
  static async authorize(
    user: AuthenticatedUser,
    right: string,
    options: AuthorizeOptions = {}
  ): Promise<AuthorizeResult> {
    const { scope, resource } = options;

    // Step 1: Check globalRights for exact match or wildcard
    if (this.hasGlobalRight(user, right)) {
      return {
        allowed: true,
        reason: 'global_right',
        grantedBy: {
          right,
          scope: '*',
          source: { role: 'global' }
        }
      };
    }

    // Step 2: If scope specified, check departmentRights[scope]
    if (scope && scope !== '*' && scope !== 'own') {
      const deptId = scope.startsWith('dept:') ? scope.substring(5) : scope;
      if (this.hasDepartmentRight(user, right, deptId)) {
        return {
          allowed: true,
          reason: 'department_right',
          grantedBy: {
            right,
            scope: `dept:${deptId}`,
            source: { role: 'department', departmentId: deptId }
          }
        };
      }

      // Check department hierarchy for the specified scope
      if (this.hasHierarchyRight(user, right, deptId)) {
        return {
          allowed: true,
          reason: 'hierarchy_right',
          grantedBy: {
            right,
            scope: `dept:${deptId}`,
            source: { role: 'hierarchy', departmentId: deptId }
          }
        };
      }
    }

    // Step 3: If resource provided, check departmentRights[resource.departmentId]
    if (resource?.departmentId) {
      if (this.hasDepartmentRight(user, right, resource.departmentId)) {
        return {
          allowed: true,
          reason: 'department_right',
          grantedBy: {
            right,
            scope: `dept:${resource.departmentId}`,
            source: { role: 'department', departmentId: resource.departmentId }
          }
        };
      }

      // Check department hierarchy
      if (this.hasHierarchyRight(user, right, resource.departmentId)) {
        return {
          allowed: true,
          reason: 'hierarchy_right',
          grantedBy: {
            right,
            scope: `dept:${resource.departmentId}`,
            source: { role: 'hierarchy', departmentId: resource.departmentId }
          }
        };
      }
    }

    // Step 4: If resource.createdBy === user.userId, check for "own" scope permission
    if (resource?.createdBy && resource.createdBy === user.userId) {
      // User always has access to their own resources if they have any right at all
      // This is for "own" scope permissions
      if (this.hasAnyRight(user, right)) {
        return {
          allowed: true,
          reason: 'own_resource',
          grantedBy: {
            right,
            scope: 'own',
            source: { role: 'owner' }
          }
        };
      }
    }

    // Step 5: If no specific scope, check if user has the right in ANY department
    if (!scope && !resource) {
      if (this.hasRightInAnyDepartment(user, right)) {
        return {
          allowed: true,
          reason: 'department_right',
          grantedBy: {
            right,
            scope: '*',
            source: { role: 'any_department' }
          }
        };
      }
    }

    // Authorization denied
    return {
      allowed: false,
      reason: 'denied'
    };
  }

  /**
   * Check if user has a global right (exact match or wildcard)
   */
  private static hasGlobalRight(user: AuthenticatedUser, right: string): boolean {
    const globalRights = user.globalRights || user.allAccessRights || [];
    return this.matchRight(globalRights, right);
  }

  /**
   * Check if user has a right in a specific department
   */
  private static hasDepartmentRight(
    user: AuthenticatedUser,
    right: string,
    departmentId: string
  ): boolean {
    const deptRights = user.departmentRights?.[departmentId] || [];
    return this.matchRight(deptRights, right);
  }

  /**
   * Check if user has a right via department hierarchy
   */
  private static hasHierarchyRight(
    user: AuthenticatedUser,
    right: string,
    departmentId: string
  ): boolean {
    const hierarchy = user.departmentHierarchy || {};

    // Find parent departments that have the child department
    for (const [parentDeptId, childDepts] of Object.entries(hierarchy)) {
      if (childDepts.includes(departmentId)) {
        // Check if user has the right in the parent department
        const parentRights = user.departmentRights?.[parentDeptId] || [];
        if (this.matchRight(parentRights, right)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user has a right in any department
   */
  private static hasRightInAnyDepartment(user: AuthenticatedUser, right: string): boolean {
    const deptRights = user.departmentRights || {};
    for (const rights of Object.values(deptRights)) {
      if (this.matchRight(rights, right)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has any form of the right (for own resource checks)
   */
  private static hasAnyRight(user: AuthenticatedUser, right: string): boolean {
    // Check global rights
    if (this.hasGlobalRight(user, right)) {
      return true;
    }

    // Check any department rights
    return this.hasRightInAnyDepartment(user, right);
  }

  /**
   * Match a right against a list of rights (supports wildcards)
   */
  private static matchRight(userRights: string[], requiredRight: string): boolean {
    const normalizedRequired = requiredRight.toLowerCase();

    for (const userRight of userRights) {
      const normalizedUserRight = userRight.toLowerCase();

      // Exact match
      if (normalizedUserRight === normalizedRequired) {
        return true;
      }

      // Super admin wildcard (*)
      if (normalizedUserRight === '*') {
        return true;
      }

      // Domain wildcard (e.g., 'content:*' matches 'content:courses:read')
      if (normalizedUserRight.endsWith(':*')) {
        const domain = normalizedUserRight.slice(0, -2);
        if (normalizedRequired.startsWith(`${domain}:`)) {
          return true;
        }
      }

      // Resource wildcard (e.g., 'content:courses:*' matches 'content:courses:read')
      const userParts = normalizedUserRight.split(':');
      const requiredParts = normalizedRequired.split(':');

      if (
        userParts.length === 3 &&
        userParts[2] === '*' &&
        requiredParts.length === 3 &&
        userParts[0] === requiredParts[0] &&
        userParts[1] === requiredParts[1]
      ) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Authorization middleware factory
 *
 * Creates Express middleware that checks if the authenticated user has
 * the required access right.
 *
 * @param right - Required access right in domain:resource:action format
 * @param options - Optional scope and resource context
 * @returns Express middleware function
 *
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if user does not have the required right
 *
 * @example
 * // Basic route protection
 * router.get('/courses',
 *   isAuthenticated,
 *   authorize('content:courses:read'),
 *   listCourses
 * );
 *
 * @example
 * // Department-scoped protection
 * router.get('/departments/:deptId/courses',
 *   isAuthenticated,
 *   authorize('content:courses:read', { scope: 'dept:${req.params.deptId}' }),
 *   listDepartmentCourses
 * );
 */
function authorizeMiddleware(
  right: string,
  options: AuthorizeOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  // Validate access right format at middleware creation time
  validateAccessRight(right);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Resolve dynamic scope if needed (e.g., from route params)
      const resolvedOptions = resolveOptions(req, options);

      // Perform authorization check
      const result = await AuthorizeService.authorize(
        req.user as AuthenticatedUser,
        right,
        resolvedOptions
      );

      if (!result.allowed) {
        logger.warn(
          `Authorization denied: User ${req.user.userId} ` +
          `requires '${right}' but was denied (reason: ${result.reason})`
        );

        const message = options.errorMessage ||
          `Insufficient permissions. Required: ${right}. Reason: ${result.reason}`;

        throw ApiError.forbidden(message, 'AUTHORIZATION_DENIED');
      }

      logger.debug(
        `Authorization granted: User ${req.user.userId} ` +
        `authorized for '${right}' (reason: ${result.reason})`
      );

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has any of the specified access rights
 *
 * Creates Express middleware that checks if the authenticated user has
 * at least one of the required access rights.
 *
 * @param rights - Array of access rights (user needs at least one)
 * @param options - Optional scope and resource context
 * @returns Express middleware function
 *
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if user does not have any of the required rights
 *
 * @example
 * router.get('/reports',
 *   isAuthenticated,
 *   authorize.anyOf(['reports:department:read', 'reports:*']),
 *   getReports
 * );
 */
function anyOf(
  rights: string[],
  options: AuthorizeOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  // Validate all access rights at middleware creation time
  if (!rights || rights.length === 0) {
    throw new Error('authorize.anyOf: rights array cannot be empty');
  }
  rights.forEach(validateAccessRight);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Resolve dynamic scope if needed
      const resolvedOptions = resolveOptions(req, options);

      // Check each right until one is authorized
      for (const right of rights) {
        const result = await AuthorizeService.authorize(
          req.user as AuthenticatedUser,
          right,
          resolvedOptions
        );

        if (result.allowed) {
          logger.debug(
            `Authorization granted (anyOf): User ${req.user.userId} ` +
            `authorized for '${right}' (reason: ${result.reason})`
          );
          return next();
        }
      }

      // None of the rights matched
      logger.warn(
        `Authorization denied (anyOf): User ${req.user.userId} ` +
        `requires any of [${rights.join(', ')}] but has none`
      );

      const message = options.errorMessage ||
        `Insufficient permissions. Required any of: ${rights.join(', ')}. Reason: denied`;

      throw ApiError.forbidden(message, 'AUTHORIZATION_DENIED');
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has all of the specified access rights
 *
 * Creates Express middleware that checks if the authenticated user has
 * all of the required access rights.
 *
 * @param rights - Array of access rights (user needs all of them)
 * @param options - Optional scope and resource context
 * @returns Express middleware function
 *
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if user does not have all of the required rights
 *
 * @example
 * router.post('/bulk-update',
 *   isAuthenticated,
 *   authorize.allOf(['content:courses:manage', 'content:lessons:manage']),
 *   bulkUpdate
 * );
 */
function allOf(
  rights: string[],
  options: AuthorizeOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  // Validate all access rights at middleware creation time
  if (!rights || rights.length === 0) {
    throw new Error('authorize.allOf: rights array cannot be empty');
  }
  rights.forEach(validateAccessRight);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check authentication
      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Resolve dynamic scope if needed
      const resolvedOptions = resolveOptions(req, options);

      // Check all rights - all must be authorized
      const missingRights: string[] = [];

      for (const right of rights) {
        const result = await AuthorizeService.authorize(
          req.user as AuthenticatedUser,
          right,
          resolvedOptions
        );

        if (!result.allowed) {
          missingRights.push(right);
        }
      }

      if (missingRights.length === 0) {
        logger.debug(
          `Authorization granted (allOf): User ${req.user.userId} ` +
          `authorized for all of [${rights.join(', ')}]`
        );
        return next();
      }

      // Not all rights were granted
      logger.warn(
        `Authorization denied (allOf): User ${req.user.userId} ` +
        `requires all of [${rights.join(', ')}] but missing [${missingRights.join(', ')}]`
      );

      const message = options.errorMessage ||
        `Insufficient permissions. Required all of: ${rights.join(', ')}. Missing: ${missingRights.join(', ')}`;

      throw ApiError.forbidden(message, 'AUTHORIZATION_DENIED');
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Service-level authorization check
 *
 * Performs an authorization check without being tied to Express middleware.
 * Useful for conditional logic in controllers and services.
 *
 * @param user - Authenticated user context
 * @param right - Required access right
 * @param options - Optional scope and resource context
 * @returns Promise<boolean> - True if authorized
 *
 * @example
 * // In a controller or service
 * const course = await Course.findById(req.params.id);
 *
 * if (!await authorize.check(req.user, 'content:courses:read', {
 *   resource: {
 *     type: 'course',
 *     id: course.id,
 *     departmentId: course.departmentId
 *   }
 * })) {
 *   throw ApiError.forbidden('Cannot access this course');
 * }
 */
async function check(
  user: AuthenticatedUser,
  right: string,
  options: AuthorizeOptions = {}
): Promise<boolean> {
  try {
    const result = await AuthorizeService.authorize(user, right, options);
    return result.allowed;
  } catch (error) {
    logger.error(`Authorization check error: ${error}`);
    return false;
  }
}

/**
 * Service-level authorization check with full result
 *
 * Same as check() but returns the full AuthorizeResult for detailed information.
 *
 * @param user - Authenticated user context
 * @param right - Required access right
 * @param options - Optional scope and resource context
 * @returns Promise<AuthorizeResult> - Full authorization result with reason
 *
 * @example
 * const result = await authorize.checkWithResult(req.user, 'content:courses:manage', {
 *   resource: course
 * });
 *
 * if (!result.allowed) {
 *   throw ApiError.forbidden(`Access denied: ${result.reason}`);
 * }
 */
async function checkWithResult(
  user: AuthenticatedUser,
  right: string,
  options: AuthorizeOptions = {}
): Promise<AuthorizeResult> {
  return AuthorizeService.authorize(user, right, options);
}

/**
 * Validate access right format
 *
 * Access rights should follow the pattern: domain:resource:action or domain:*
 *
 * @param right - Access right to validate
 * @throws Error if format is invalid
 */
function validateAccessRight(right: string): void {
  // Allow wildcard patterns
  if (right === '*') {
    return;
  }

  // Pattern: domain:resource:action or domain:*
  const accessRightPattern = /^[a-z]+:[a-z*-]+:[a-z*-]+$|^[a-z]+:\*$/;

  if (!accessRightPattern.test(right)) {
    throw new Error(
      `authorize: Invalid access right format: '${right}'. ` +
      `Expected format: domain:resource:action or domain:*`
    );
  }
}

/**
 * Resolve dynamic options from request
 *
 * Allows scope to reference request parameters for dynamic authorization.
 *
 * @param req - Express request
 * @param options - Original options
 * @returns Resolved options
 */
function resolveOptions(req: Request, options: AuthorizeOptions): AuthorizeOptions {
  const resolved = { ...options };

  // If scope references a route parameter, resolve it
  if (resolved.scope && typeof resolved.scope === 'string') {
    // Handle 'dept:${req.params.deptId}' style patterns
    const paramMatch = resolved.scope.match(/\$\{req\.params\.(\w+)\}/);
    if (paramMatch && req.params[paramMatch[1]]) {
      resolved.scope = resolved.scope.replace(
        paramMatch[0],
        req.params[paramMatch[1]]
      ) as PermissionScope;
    }
  }

  return resolved;
}

/**
 * Authorize middleware with attached utility methods
 *
 * Primary export for route-level authorization.
 *
 * @example
 * // Single right
 * router.get('/courses',
 *   isAuthenticated,
 *   authorize('content:courses:read'),
 *   listCourses
 * );
 *
 * // Multiple rights (any)
 * router.get('/reports',
 *   isAuthenticated,
 *   authorize.anyOf(['reports:department:read', 'reports:*']),
 *   getReports
 * );
 *
 * // Multiple rights (all required)
 * router.post('/bulk-update',
 *   isAuthenticated,
 *   authorize.allOf(['content:courses:manage', 'content:lessons:manage']),
 *   bulkUpdate
 * );
 *
 * // Service-level check
 * if (!await authorize.check(req.user, 'content:courses:read', { resource: course })) {
 *   throw ApiError.forbidden();
 * }
 */
export const authorize = Object.assign(authorizeMiddleware, {
  /**
   * Check if user has any of the specified access rights
   */
  anyOf,

  /**
   * Check if user has all of the specified access rights
   */
  allOf,

  /**
   * Service-level authorization check (returns boolean)
   */
  check,

  /**
   * Service-level authorization check with full result
   */
  checkWithResult
});

/**
 * Export the authorize service for advanced use cases
 */
export { AuthorizeService };

/**
 * Default export
 */
export default authorize;
