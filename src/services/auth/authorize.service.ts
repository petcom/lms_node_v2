/**
 * Unified Authorization Service
 *
 * Implements the core `authorize()` function per the unified authorization model.
 * This replaces the dual system (access rights + department/role checks) with a
 * single authorization paradigm.
 *
 * Reference: agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md
 * Contract: contracts/api/authorization.contract.ts
 *
 * Key Features:
 * - Single authorize() function for all authorization checks
 * - Supports global rights (scope: '*')
 * - Supports department-scoped rights
 * - Supports department hierarchy (parent dept rights apply to children)
 * - Supports own resource checks
 * - Returns detailed AuthorizeResult with reason and grantedBy info
 *
 * Check Order (per spec):
 * 1. Global rights first (scope: '*')
 * 2. Department-scoped rights (if scope or resource.departmentId provided)
 * 3. Department hierarchy (parent dept rights apply to children)
 * 4. Own resource checks (if resource.createdBy matches user)
 *
 * Usage:
 * ```typescript
 * import { authorize } from '@/services/auth/authorize.service';
 *
 * // Route-level check
 * const result = await authorize(user, 'content:courses:read');
 *
 * // Department-scoped check
 * const result = await authorize(user, 'content:courses:read', { scope: 'dept:123' });
 *
 * // Resource-level check
 * const result = await authorize(user, 'content:courses:read', {
 *   resource: { type: 'course', id: '456', departmentId: '123' }
 * });
 *
 * // Own resource check
 * const result = await authorize(user, 'content:courses:manage', {
 *   resource: { type: 'course', id: '456', createdBy: user.userId }
 * });
 * ```
 *
 * @module services/auth/authorize
 */

import { departmentCacheService } from '@/services/auth/department-cache.service';
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
 * Options for the authorize function
 */
export interface AuthorizeOptions {
  /** Specific scope to check (optional) */
  scope?: PermissionScope;
  /** Resource context for resource-level checks (optional) */
  resource?: ResourceContext;
}

/**
 * Extract department ID from a scope string
 *
 * @param scope - Permission scope (e.g., 'dept:123', '*', 'own')
 * @returns Department ID if scope is department-specific, null otherwise
 */
function extractDepartmentId(scope: PermissionScope): string | null {
  if (scope.startsWith('dept:')) {
    return scope.substring(5); // Remove 'dept:' prefix
  }
  return null;
}

/**
 * Check if user has a specific right as a global right
 *
 * @param user - Authenticated user
 * @param right - Access right to check
 * @returns Permission if granted globally, null otherwise
 */
function checkGlobalRight(
  user: AuthenticatedUser,
  right: string
): Permission | null {
  // Check for exact match or wildcard
  if (user.globalRights?.includes(right)) {
    return {
      right,
      scope: '*',
      source: { role: 'global' }
    };
  }

  // Check for wildcard patterns (e.g., 'system:*' should match 'system:users:read')
  if (user.globalRights?.includes('*')) {
    return {
      right: '*',
      scope: '*',
      source: { role: 'global-admin' }
    };
  }

  // Check domain-level wildcards (e.g., 'content:*' matches 'content:courses:read')
  const rightParts = right.split(':');
  if (rightParts.length >= 2) {
    const domainWildcard = `${rightParts[0]}:*`;
    if (user.globalRights?.includes(domainWildcard)) {
      return {
        right: domainWildcard,
        scope: '*',
        source: { role: 'global' }
      };
    }

    // Check domain:resource:* wildcard (e.g., 'content:courses:*' matches 'content:courses:read')
    if (rightParts.length >= 3) {
      const resourceWildcard = `${rightParts[0]}:${rightParts[1]}:*`;
      if (user.globalRights?.includes(resourceWildcard)) {
        return {
          right: resourceWildcard,
          scope: '*',
          source: { role: 'global' }
        };
      }
    }
  }

  return null;
}

/**
 * Check if user has a specific right in a specific department
 *
 * @param user - Authenticated user
 * @param right - Access right to check
 * @param departmentId - Department ID to check
 * @returns Permission if granted in department, null otherwise
 */
function checkDepartmentRight(
  user: AuthenticatedUser,
  right: string,
  departmentId: string
): Permission | null {
  const deptRights = user.departmentRights?.[departmentId];

  if (!deptRights) {
    return null;
  }

  // Check for exact match
  if (deptRights.includes(right)) {
    return {
      right,
      scope: `dept:${departmentId}`,
      source: { role: 'department', departmentId }
    };
  }

  // Check for wildcard patterns
  if (deptRights.includes('*')) {
    return {
      right: '*',
      scope: `dept:${departmentId}`,
      source: { role: 'department-admin', departmentId }
    };
  }

  // Check domain-level wildcards
  const rightParts = right.split(':');
  if (rightParts.length >= 2) {
    const domainWildcard = `${rightParts[0]}:*`;
    if (deptRights.includes(domainWildcard)) {
      return {
        right: domainWildcard,
        scope: `dept:${departmentId}`,
        source: { role: 'department', departmentId }
      };
    }

    // Check domain:resource:* wildcard
    if (rightParts.length >= 3) {
      const resourceWildcard = `${rightParts[0]}:${rightParts[1]}:*`;
      if (deptRights.includes(resourceWildcard)) {
        return {
          right: resourceWildcard,
          scope: `dept:${departmentId}`,
          source: { role: 'department', departmentId }
        };
      }
    }
  }

  return null;
}

/**
 * Check if user has a specific right through department hierarchy
 * (parent department rights apply to children)
 *
 * @param user - Authenticated user
 * @param right - Access right to check
 * @param resourceDepartmentId - Department ID of the resource
 * @returns Permission if granted through hierarchy, null otherwise
 */
function checkHierarchyRight(
  user: AuthenticatedUser,
  right: string,
  resourceDepartmentId: string
): Permission | null {
  // Get all ancestors of the resource's department
  const ancestors = departmentCacheService.getAncestors(resourceDepartmentId);

  if (ancestors.length === 0) {
    return null;
  }

  // Check each ancestor for the required right
  for (const ancestorId of ancestors) {
    const permission = checkDepartmentRight(user, right, ancestorId);
    if (permission) {
      // Modify the permission to indicate it was inherited through hierarchy
      return {
        ...permission,
        scope: `dept:${ancestorId}`, // Original granting department
        source: {
          ...permission.source,
          departmentId: ancestorId // Clarify which dept granted the permission
        }
      };
    }
  }

  return null;
}

/**
 * Check if user can access the resource because they created it (own resource)
 *
 * For 'own' scope checks, we look for rights that allow the user to manage
 * their own resources. This typically applies when resource.createdBy === user.userId.
 *
 * @param user - Authenticated user
 * @param right - Access right to check
 * @param resource - Resource context with createdBy
 * @returns Permission if granted through own resource ownership, null otherwise
 */
function checkOwnResourceRight(
  user: AuthenticatedUser,
  right: string,
  resource: ResourceContext
): Permission | null {
  // Only check if resource has a creator and it matches the user
  if (!resource.createdBy || resource.createdBy !== user.userId) {
    return null;
  }

  // For own resource checks, user is the creator
  // We need to find if they have a corresponding 'own' scoped permission
  // or if they have a department permission that grants this right

  // First, check if user has global right for this
  const globalPermission = checkGlobalRight(user, right);
  if (globalPermission) {
    return {
      ...globalPermission,
      scope: 'own',
      source: { ...globalPermission.source }
    };
  }

  // If resource has a department, check department rights
  if (resource.departmentId) {
    const deptPermission = checkDepartmentRight(user, right, resource.departmentId);
    if (deptPermission) {
      return {
        ...deptPermission,
        scope: 'own',
        source: { ...deptPermission.source }
      };
    }

    // Check hierarchy for the resource's department
    const hierarchyPermission = checkHierarchyRight(user, right, resource.departmentId);
    if (hierarchyPermission) {
      return {
        ...hierarchyPermission,
        scope: 'own',
        source: { ...hierarchyPermission.source }
      };
    }
  }

  // Check if user has any department membership that grants this right
  // This handles cases where the user is the creator but the resource
  // might not have a departmentId set
  for (const deptId of Object.keys(user.departmentRights || {})) {
    const deptPermission = checkDepartmentRight(user, right, deptId);
    if (deptPermission) {
      return {
        ...deptPermission,
        scope: 'own',
        source: { ...deptPermission.source }
      };
    }
  }

  return null;
}

/**
 * Authorize a user for a specific action
 *
 * This is the core authorization function that implements the unified authorization model.
 * It checks permissions in a specific order and returns a detailed result.
 *
 * Check Order:
 * 1. Global rights first (scope: '*') - if user has the right globally, they're allowed
 * 2. Department-scoped rights - if scope or resource.departmentId provided
 * 3. Department hierarchy - parent department rights apply to children
 * 4. Own resource checks - if resource.createdBy matches user.userId
 *
 * @param user - Authenticated user from request context
 * @param right - Access right to check (e.g., 'content:courses:read')
 * @param options - Optional scope and resource context
 * @returns Promise<AuthorizeResult> with allowed, reason, and grantedBy
 *
 * @example
 * // Simple route-level check
 * const result = await authorize(user, 'content:courses:read');
 * if (!result.allowed) {
 *   throw ApiError.forbidden('Cannot read courses');
 * }
 *
 * @example
 * // Department-scoped check
 * const result = await authorize(user, 'content:courses:read', {
 *   scope: 'dept:123'
 * });
 *
 * @example
 * // Resource-level check with hierarchy support
 * const result = await authorize(user, 'content:courses:read', {
 *   resource: {
 *     type: 'course',
 *     id: course._id.toString(),
 *     departmentId: course.departmentId.toString(),
 *     createdBy: course.createdBy?.toString()
 *   }
 * });
 */
export async function authorize(
  user: AuthenticatedUser,
  right: string,
  options?: AuthorizeOptions
): Promise<AuthorizeResult> {
  const startTime = Date.now();
  const scope = options?.scope;
  const resource = options?.resource;

  logger.debug(
    `authorize: Checking right "${right}" for user ${user.userId}` +
    (scope ? ` with scope "${scope}"` : '') +
    (resource ? ` for resource ${resource.type}:${resource.id}` : '')
  );

  // Step 1: Check global rights (scope: '*')
  const globalPermission = checkGlobalRight(user, right);
  if (globalPermission) {
    const duration = Date.now() - startTime;
    logger.debug(
      `authorize: ALLOWED via global right for user ${user.userId} ` +
      `(right: ${right}, duration: ${duration}ms)`
    );
    return {
      allowed: true,
      reason: 'global_right',
      grantedBy: globalPermission
    };
  }

  // Step 2: If specific department scope requested, check that department
  if (scope && scope !== '*' && scope !== 'own') {
    const scopeDeptId = extractDepartmentId(scope);
    if (scopeDeptId) {
      // Check direct department permission
      const deptPermission = checkDepartmentRight(user, right, scopeDeptId);
      if (deptPermission) {
        const duration = Date.now() - startTime;
        logger.debug(
          `authorize: ALLOWED via department right for user ${user.userId} ` +
          `(right: ${right}, dept: ${scopeDeptId}, duration: ${duration}ms)`
        );
        return {
          allowed: true,
          reason: 'department_right',
          grantedBy: deptPermission
        };
      }

      // Check hierarchy (user may have rights in a parent department)
      const hierarchyPermission = checkHierarchyRight(user, right, scopeDeptId);
      if (hierarchyPermission) {
        const duration = Date.now() - startTime;
        logger.debug(
          `authorize: ALLOWED via hierarchy right for user ${user.userId} ` +
          `(right: ${right}, resource dept: ${scopeDeptId}, duration: ${duration}ms)`
        );
        return {
          allowed: true,
          reason: 'hierarchy_right',
          grantedBy: hierarchyPermission
        };
      }
    }
  }

  // Step 3: If resource provided, check resource's department
  if (resource?.departmentId) {
    // Check direct department permission for resource's department
    const deptPermission = checkDepartmentRight(user, right, resource.departmentId);
    if (deptPermission) {
      const duration = Date.now() - startTime;
      logger.debug(
        `authorize: ALLOWED via department right for user ${user.userId} ` +
        `(right: ${right}, resource dept: ${resource.departmentId}, duration: ${duration}ms)`
      );
      return {
        allowed: true,
        reason: 'department_right',
        grantedBy: deptPermission
      };
    }

    // Check hierarchy (user may have rights in a parent department of the resource)
    const hierarchyPermission = checkHierarchyRight(user, right, resource.departmentId);
    if (hierarchyPermission) {
      const duration = Date.now() - startTime;
      logger.debug(
        `authorize: ALLOWED via hierarchy right for user ${user.userId} ` +
        `(right: ${right}, resource dept: ${resource.departmentId}, duration: ${duration}ms)`
      );
      return {
        allowed: true,
        reason: 'hierarchy_right',
        grantedBy: hierarchyPermission
      };
    }
  }

  // Step 4: Check own resource (if resource has createdBy that matches user)
  if (resource?.createdBy && resource.createdBy === user.userId) {
    const ownPermission = checkOwnResourceRight(user, right, resource);
    if (ownPermission) {
      const duration = Date.now() - startTime;
      logger.debug(
        `authorize: ALLOWED via own resource for user ${user.userId} ` +
        `(right: ${right}, resource: ${resource.type}:${resource.id}, duration: ${duration}ms)`
      );
      return {
        allowed: true,
        reason: 'own_resource',
        grantedBy: ownPermission
      };
    }
  }

  // Step 5: No scope/resource specified - check if user has the right in ANY department
  // This is for route-level checks where we just need to know if user can do this anywhere
  if (!scope && !resource) {
    // Check all departments the user has rights in
    for (const deptId of Object.keys(user.departmentRights || {})) {
      const deptPermission = checkDepartmentRight(user, right, deptId);
      if (deptPermission) {
        const duration = Date.now() - startTime;
        logger.debug(
          `authorize: ALLOWED via department right (any dept) for user ${user.userId} ` +
          `(right: ${right}, dept: ${deptId}, duration: ${duration}ms)`
        );
        return {
          allowed: true,
          reason: 'department_right',
          grantedBy: deptPermission
        };
      }
    }
  }

  // Denied - no permission found
  const duration = Date.now() - startTime;
  logger.debug(
    `authorize: DENIED for user ${user.userId} ` +
    `(right: ${right}` +
    (scope ? `, scope: ${scope}` : '') +
    (resource ? `, resource: ${resource.type}:${resource.id}` : '') +
    `, duration: ${duration}ms)`
  );

  return {
    allowed: false,
    reason: 'denied'
  };
}

/**
 * Quick sync check for authorization (for use in middleware)
 *
 * This is a simplified version that only checks global and department rights
 * without hierarchy lookups. Use this for fast route-level checks.
 *
 * Note: This does NOT check hierarchy - use the full authorize() for that.
 *
 * @param user - Authenticated user
 * @param right - Access right to check
 * @param departmentId - Optional specific department to check
 * @returns boolean - true if authorized, false otherwise
 */
export function authorizeSync(
  user: AuthenticatedUser,
  right: string,
  departmentId?: string
): boolean {
  // Check global rights
  if (checkGlobalRight(user, right)) {
    return true;
  }

  // Check specific department if provided
  if (departmentId && checkDepartmentRight(user, right, departmentId)) {
    return true;
  }

  // Check any department (route-level check)
  if (!departmentId) {
    for (const deptId of Object.keys(user.departmentRights || {})) {
      if (checkDepartmentRight(user, right, deptId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if user has any of the specified rights
 *
 * Useful for route-level checks where multiple rights are acceptable.
 *
 * @param user - Authenticated user
 * @param rights - Array of access rights (any match is sufficient)
 * @param options - Optional scope and resource context
 * @returns Promise<AuthorizeResult> - result from first matching right
 */
export async function authorizeAny(
  user: AuthenticatedUser,
  rights: string[],
  options?: AuthorizeOptions
): Promise<AuthorizeResult> {
  for (const right of rights) {
    const result = await authorize(user, right, options);
    if (result.allowed) {
      return result;
    }
  }

  return {
    allowed: false,
    reason: 'denied'
  };
}

/**
 * Check if user has all of the specified rights
 *
 * Useful when multiple rights are required for an action.
 *
 * @param user - Authenticated user
 * @param rights - Array of access rights (all must match)
 * @param options - Optional scope and resource context
 * @returns Promise<AuthorizeResult> - denied if any right is missing
 */
export async function authorizeAll(
  user: AuthenticatedUser,
  rights: string[],
  options?: AuthorizeOptions
): Promise<AuthorizeResult> {
  const grantedPermissions: Permission[] = [];

  for (const right of rights) {
    const result = await authorize(user, right, options);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: 'denied'
      };
    }
    if (result.grantedBy) {
      grantedPermissions.push(result.grantedBy);
    }
  }

  // Return success with the first granting permission
  return {
    allowed: true,
    reason: grantedPermissions[0]?.scope === '*' ? 'global_right' : 'department_right',
    grantedBy: grantedPermissions[0]
  };
}

/**
 * Get all departments where user has a specific right
 *
 * Useful for filtering resources by departments user can access.
 *
 * @param user - Authenticated user
 * @param right - Access right to check
 * @param includeDescendants - Whether to include descendant departments
 * @returns string[] - Array of department IDs where user has the right
 */
export function getDepartmentsWithRight(
  user: AuthenticatedUser,
  right: string,
  includeDescendants: boolean = true
): string[] {
  const departmentIds: Set<string> = new Set();

  // Check if user has global right - return all departments they're a member of
  if (checkGlobalRight(user, right)) {
    // User has global access - return all their department memberships
    for (const deptId of Object.keys(user.departmentRights || {})) {
      departmentIds.add(deptId);
      if (includeDescendants) {
        const descendants = departmentCacheService.getAllDescendants(deptId);
        descendants.forEach((d) => departmentIds.add(d));
      }
    }
    return Array.from(departmentIds);
  }

  // Check each department for the right
  for (const deptId of Object.keys(user.departmentRights || {})) {
    if (checkDepartmentRight(user, right, deptId)) {
      departmentIds.add(deptId);
      if (includeDescendants) {
        const descendants = departmentCacheService.getAllDescendants(deptId);
        descendants.forEach((d) => departmentIds.add(d));
      }
    }
  }

  return Array.from(departmentIds);
}

// Re-export AuthenticatedUser for convenience (originally from isAuthenticated.ts)
export type { AuthenticatedUser };

export default authorize;
