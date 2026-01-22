/**
 * Unified Authorization System Contract
 * Version: 1.0.0
 *
 * This contract defines the new unified authorization model that replaces
 * the dual system (access rights + department/role checks).
 *
 * KEY CHANGES:
 * - Single `authorize()` paradigm for all authorization
 * - Scoped permissions (global, department, own)
 * - Cached permission resolution
 * - Department hierarchy support built-in
 *
 * ARCHITECTURE DECISION: ADR-AUTH-001 (2026-01-22)
 * See: agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md
 */

// ============================================================================
// CORE TYPES
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
 * User's computed permissions (cached structure)
 */
export interface UserPermissions {
  /** User ID */
  userId: string;

  /** All permissions with scopes (for auditing/debugging) */
  permissions: Permission[];

  /** Global rights (scope: '*') - fast lookup */
  globalRights: string[];

  /** Department-scoped rights - fast lookup by department */
  departmentRights: Record<string, string[]>;

  /** Department hierarchy for inheritance checks */
  departmentHierarchy: Record<string, string[]>;

  /** When permissions were computed */
  computedAt: string;

  /** When cache expires */
  expiresAt: string;

  /** Version for cache invalidation */
  version: number;
}

/**
 * Department membership with roles
 */
export interface DepartmentMembership {
  departmentId: string;
  roles: string[];
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
 * Authorization check parameters
 */
export interface AuthorizeParams {
  /** Required access right */
  right: string;
  /** Specific scope to check (optional) */
  scope?: PermissionScope;
  /** Resource context for resource-level checks (optional) */
  resource?: ResourceContext;
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

// ============================================================================
// ENHANCED USER CONTEXT (replaces AuthenticatedUser)
// ============================================================================

/**
 * Enhanced user context attached to request
 * This replaces the previous AuthenticatedUser interface
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  userTypes: ('learner' | 'staff' | 'global-admin')[];

  /** Global rights (scope: '*') */
  globalRights: string[];

  /** Department-scoped rights */
  departmentRights: Record<string, string[]>;

  /** Department memberships with roles */
  departmentMemberships: DepartmentMembership[];

  /** Department hierarchy (for child lookups) */
  departmentHierarchy: Record<string, string[]>;

  /** Admin escalation status */
  canEscalateToAdmin: boolean;
  defaultDashboard: 'learner' | 'staff';
  lastSelectedDepartment?: string;

  /** Permission version (for cache validation) */
  permissionVersion: number;

  // DEPRECATED - kept for backward compatibility during migration
  /** @deprecated Use globalRights + departmentRights instead */
  allAccessRights?: string[];
  /** @deprecated Use departmentMemberships instead */
  roles?: string[];
}

// ============================================================================
// CACHE STRUCTURES
// ============================================================================

/**
 * Redis cache key patterns
 */
export const CacheKeys = {
  /** User permissions cache */
  userPermissions: (userId: string) => `auth:permissions:${userId}`,
  /** Role definitions version (for invalidation) */
  rolesVersion: 'auth:roles:version',
  /** Department hierarchy version */
  departmentsVersion: 'auth:depts:version',
  /** User permission version */
  userVersion: (userId: string) => `auth:user:${userId}:version`,
} as const;

/**
 * Cache TTL configuration
 */
export const CacheTTL = {
  /** User permissions TTL in seconds */
  userPermissions: 15 * 60, // 15 minutes
  /** Role definitions (in-memory) refresh interval */
  roleDefinitions: 60 * 60, // 1 hour
  /** Department hierarchy refresh interval */
  departmentHierarchy: 60 * 60, // 1 hour
} as const;

// ============================================================================
// API CONTRACTS
// ============================================================================

export const AuthorizationContracts = {
  resource: 'authorization',
  version: '1.0.0',

  // =========================================================================
  // AUTHORIZE CHECK (Internal - not exposed as API endpoint)
  // =========================================================================

  /**
   * Authorization check function signature
   * Used internally by middleware and services
   */
  authorize: {
    description: 'Check if user is authorized for an action',

    signature: `
      authorize(
        user: AuthenticatedUser,
        right: string,
        options?: {
          scope?: PermissionScope,
          resource?: ResourceContext
        }
      ): Promise<AuthorizeResult>
    `,

    examples: [
      {
        name: 'Route-level check',
        code: `authorize(user, 'content:courses:read')`,
        description: 'Check if user can read any course they have access to'
      },
      {
        name: 'Department-scoped check',
        code: `authorize(user, 'content:courses:read', { scope: 'dept:123' })`,
        description: 'Check if user can read courses in specific department'
      },
      {
        name: 'Resource-level check',
        code: `authorize(user, 'content:courses:read', { resource: { type: 'course', id: '456', departmentId: '123' } })`,
        description: 'Check if user can read a specific course'
      },
      {
        name: 'Own resource check',
        code: `authorize(user, 'content:courses:manage', { resource: { type: 'course', id: '456', createdBy: user.userId } })`,
        description: 'Check if user can manage their own course'
      }
    ],

    resolution: {
      order: [
        '1. Check globalRights for exact match or wildcard',
        '2. If scope specified, check departmentRights[scope]',
        '3. If resource provided, check departmentRights[resource.departmentId]',
        '4. Check department hierarchy (parent dept rights apply to children)',
        '5. If resource.createdBy === user.userId, check for "own" scope permission'
      ]
    }
  },

  // =========================================================================
  // PERMISSION REFRESH (Optional API endpoint)
  // =========================================================================

  /**
   * POST /api/v2/auth/permissions/refresh
   * Force refresh of user's cached permissions
   */
  refreshPermissions: {
    endpoint: '/api/v2/auth/permissions/refresh',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Force refresh of cached permissions (use after role changes)',

    request: {
      headers: {
        'Authorization': 'Bearer {accessToken}'
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: true,
          data: {
            globalRights: ['string[]'],
            departmentRights: { 'deptId': ['string[]'] },
            permissionVersion: 'number',
            refreshedAt: 'ISO8601 timestamp'
          }
        }
      }
    }
  },

  // =========================================================================
  // PERMISSION DEBUG (Admin only)
  // =========================================================================

  /**
   * GET /api/v2/admin/users/:userId/permissions
   * Get detailed permission breakdown for a user (admin debugging)
   */
  getUserPermissions: {
    endpoint: '/api/v2/admin/users/:userId/permissions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed permission breakdown for debugging (admin only)',
    requiredRight: 'system:users:read',

    response: {
      success: {
        status: 200,
        body: {
          success: true,
          data: {
            userId: 'string',
            permissions: 'Permission[]',
            globalRights: ['string[]'],
            departmentRights: { 'deptId': ['string[]'] },
            departmentMemberships: 'DepartmentMembership[]',
            computedAt: 'ISO8601 timestamp',
            cacheStatus: 'hit | miss | expired'
          }
        }
      }
    }
  }
};

// ============================================================================
// MIDDLEWARE CONTRACTS
// ============================================================================

/**
 * Route middleware usage examples
 */
export const MiddlewareExamples = {
  /**
   * Basic route protection
   */
  basic: `
    router.get('/courses',
      isAuthenticated,
      authorize('content:courses:read'),
      listCourses
    );
  `,

  /**
   * Multiple rights (any)
   */
  anyOf: `
    router.get('/reports',
      isAuthenticated,
      authorize(['reports:department:read', 'reports:*'], { requireAny: true }),
      getReports
    );
  `,

  /**
   * Admin escalation required
   */
  adminOnly: `
    router.delete('/users/:id',
      isAuthenticated,
      requireEscalation,
      authorize('system:users:delete'),
      deleteUser
    );
  `,

  /**
   * Service-level check
   */
  serviceLevel: `
    async function getCourse(req, res) {
      const course = await Course.findById(req.params.id);

      const result = await authorize(req.user, 'content:courses:read', {
        resource: {
          type: 'course',
          id: course.id,
          departmentId: course.departmentId,
          createdBy: course.createdBy
        }
      });

      if (!result.allowed) {
        throw ApiError.forbidden('Cannot access this course');
      }

      res.json(course);
    }
  `
};

// ============================================================================
// ROLE DEFINITIONS (Reference)
// ============================================================================

/**
 * Standard role definitions with their rights
 * Rights are applied to the department where the role is assigned
 */
export const StandardRoles = {
  // Staff roles
  instructor: {
    userType: 'staff',
    rights: [
      'content:courses:read',
      'content:lessons:read',
      'content:lessons:manage',
      'grades:own-classes:read',
      'grades:own-classes:manage',
      'reports:own-classes:read'
    ],
    inheritToSubdepartments: true
  },

  'content-admin': {
    userType: 'staff',
    rights: [
      'content:courses:read',
      'content:courses:manage',
      'content:lessons:read',
      'content:lessons:manage',
      'content:programs:read',
      'content:programs:manage'
    ],
    inheritToSubdepartments: true
  },

  'department-admin': {
    userType: 'staff',
    rights: [
      'content:courses:read',
      'content:courses:manage',
      'content:lessons:read',
      'content:lessons:manage',
      'content:programs:read',
      'content:programs:manage',
      'staff:department:read',
      'staff:department:manage',
      'reports:department:read',
      'enrollment:department:read',
      'enrollment:department:manage'
    ],
    inheritToSubdepartments: true
  },

  'billing-admin': {
    userType: 'staff',
    rights: [
      'content:courses:read',
      'billing:department:read',
      'billing:department:manage',
      'reports:billing:read'
    ],
    inheritToSubdepartments: false
  },

  // Learner roles
  'course-taker': {
    userType: 'learner',
    rights: [
      'content:courses:read',
      'content:lessons:read',
      'enrollment:own:read',
      'enrollment:own:manage',
      'grades:own:read'
    ],
    inheritToSubdepartments: false
  },

  auditor: {
    userType: 'learner',
    rights: [
      'content:courses:read',
      'content:lessons:read',
      'enrollment:own:read'
    ],
    inheritToSubdepartments: false
  },

  // Global admin roles (applied globally, not department-scoped)
  'system-admin': {
    userType: 'global-admin',
    rights: ['*'],
    inheritToSubdepartments: true
  }
};

// ============================================================================
// MIGRATION NOTES
// ============================================================================

/**
 * Migration from old system
 *
 * OLD: requireAccessRight('content:courses:read')
 * NEW: authorize('content:courses:read')
 *
 * OLD: canViewCourse(course, user) with manual dept checks
 * NEW: authorize(user, 'content:courses:read', { resource: course })
 *
 * OLD: user.allAccessRights.includes('x')
 * NEW: user.globalRights.includes('x') || user.departmentRights[deptId]?.includes('x')
 *
 * Deprecation timeline:
 * - Phase 2: Old functions still work, new functions available
 * - Phase 3: Old functions emit deprecation warnings
 * - Phase 4: Old functions removed
 */
export const MigrationGuide = {
  phase1: 'Add caching layer - no API changes',
  phase2: 'Add new authorize() alongside old requireAccessRight()',
  phase3: 'Migrate all authorization to authorize()',
  phase4: 'Remove deprecated functions'
};
