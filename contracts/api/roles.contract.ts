/**
 * Role System API Contracts
 * Version: 2.0.0
 * 
 * These contracts define the role and authorization system for the LMS.
 * 
 * KEY CONCEPTS:
 * - UserTypes: 'learner' | 'staff' | 'global-admin' - determines dashboard access
 * - Roles: Department-scoped capabilities within a userType
 * - AccessRights: GNAP-compatible permission strings (domain:resource:action)
 * - Master Department: Special system department for GlobalAdmin roles (ID: 000000000000000000000001)
 * 
 * IMPORTANT FOR UI TEAM:
 * - Login returns userTypes, not a single role
 * - Roles are loaded per-department, not globally
 * - Admin Dashboard requires escalation (separate password)
 * - UI components should check accessRights, not role names
 */

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export const RoleSystemTypes = {
  /**
   * User Types - Determines which dashboard a user can access
   */
  UserType: {
    values: ['learner', 'staff', 'global-admin'] as const,
    description: 'Stored on User model. Determines dashboard access.',
  },
  
  /**
   * Learner Roles - Department-scoped
   */
  LearnerRoles: {
    values: ['course-taker', 'auditor', 'learner-supervisor'] as const,
    descriptions: {
      'course-taker': 'Standard learner who enrolls in and completes courses',
      'auditor': 'View-only access, cannot earn credit or complete exams',
      'learner-supervisor': 'Elevated permissions for TAs, peer mentors'
    }
  },
  
  /**
   * Staff Roles - Department-scoped
   */
  StaffRoles: {
    values: ['instructor', 'department-admin', 'content-admin', 'billing-admin'] as const,
    descriptions: {
      'instructor': 'Teaches classes, grades student work',
      'department-admin': 'Manages department operations, staff, settings',
      'content-admin': 'Creates and manages courses, programs',
      'billing-admin': 'Department-level billing operations'
    }
  },
  
  /**
   * GlobalAdmin Roles - Master Department ONLY
   */
  GlobalAdminRoles: {
    values: ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin'] as const,
    descriptions: {
      'system-admin': 'Full system access - highest privilege',
      'enrollment-admin': 'Manages enrollment system globally',
      'course-admin': 'Manages course system globally',
      'theme-admin': 'Manages themes, branding, UI',
      'financial-admin': 'System-wide financial operations'
    }
  },
  
  /**
   * Access Right Domains
   */
  AccessRightDomains: {
    values: ['content', 'enrollment', 'staff', 'learner', 'reports', 'system', 'billing', 'audit', 'grades'] as const
  },
  
  /**
   * Sensitive Data Categories
   */
  SensitiveCategories: {
    values: ['ferpa', 'billing', 'pii', 'audit'] as const
  }
};

export type UserType = typeof RoleSystemTypes.UserType.values[number];
export type LearnerRole = typeof RoleSystemTypes.LearnerRoles.values[number];
export type StaffRole = typeof RoleSystemTypes.StaffRoles.values[number];
export type GlobalAdminRole = typeof RoleSystemTypes.GlobalAdminRoles.values[number];
export type AnyRole = LearnerRole | StaffRole | GlobalAdminRole;

// ============================================================================
// SHARED RESPONSE TYPES
// ============================================================================

export interface DepartmentMembership {
  departmentId: string;
  departmentName: string;
  departmentSlug: string;
  roles: string[];
  accessRights: string[];
  isPrimary: boolean;
  isActive: boolean;
  joinedAt: string; // ISO date
  /** Child departments (if role cascading enabled) */
  childDepartments?: {
    departmentId: string;
    departmentName: string;
    roles: string[];  // Same as parent (cascaded)
  }[];
}

export interface RoleDefinition {
  id: string;
  name: string;
  userType: UserType;
  displayName: string;
  description: string;
  accessRights: string[];
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface AccessRight {
  id: string;
  name: string;            // e.g., 'content:courses:read'
  domain: string;          // e.g., 'content'
  resource: string;        // e.g., 'courses'
  action: string;          // e.g., 'read'
  description: string;
  isSensitive: boolean;
  sensitiveCategory?: 'ferpa' | 'billing' | 'pii' | 'audit';
  isActive: boolean;
}

// ============================================================================
// API CONTRACTS
// ============================================================================

export const RolesContract = {
  resource: 'roles',
  version: '2.0.0',

  // =========================================================================
  // ROLE DEFINITIONS
  // =========================================================================

  /**
   * List All Role Definitions
   * GET /api/v2/roles
   */
  listRoles: {
    endpoint: '/api/v2/roles',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'List all role definitions, optionally filtered by userType',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        userType: {
          type: 'string',
          required: false,
          enum: ['learner', 'staff', 'global-admin'],
          description: 'Filter by userType'
        },
        includeInactive: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include inactive roles'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            roles: 'RoleDefinition[]',
            byUserType: {
              learner: 'RoleDefinition[]',
              staff: 'RoleDefinition[]',
              'global-admin': 'RoleDefinition[]'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    example: {
      request: { userType: 'staff' },
      response: {
        success: true,
        data: {
          roles: [
            {
              id: '507f1f77bcf86cd799439011',
              name: 'instructor',
              userType: 'staff',
              displayName: 'Instructor',
              description: 'Teaches classes, grades student work',
              accessRights: ['content:courses:read', 'grades:own-classes:manage'],
              isDefault: false,
              sortOrder: 1,
              isActive: true
            },
            {
              id: '507f1f77bcf86cd799439012',
              name: 'content-admin',
              userType: 'staff',
              displayName: 'Content Administrator',
              description: 'Creates and manages courses, programs',
              accessRights: ['content:courses:manage', 'content:programs:manage'],
              isDefault: false,
              sortOrder: 2,
              isActive: true
            }
          ],
          byUserType: {
            learner: [],
            staff: [/* same as roles array when filtered */],
            'global-admin': []
          }
        }
      }
    },

    notes: `
      - Any authenticated user can list role definitions
      - Use userType filter to get roles for a specific dashboard
      - accessRights array shows what permissions the role grants
      - sortOrder determines display order in UI dropdowns
    `
  },

  /**
   * Get Single Role Definition
   * GET /api/v2/roles/:name
   */
  getRole: {
    endpoint: '/api/v2/roles/:name',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Get a single role definition by name',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        name: {
          type: 'string',
          required: true,
          description: 'Role name (e.g., "instructor", "content-admin")'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'RoleDefinition'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'ROLE_NOT_FOUND', message: 'Role not found' }
      ]
    }
  },

  /**
   * Update Role Access Rights
   * PUT /api/v2/roles/:name/access-rights
   * 
   * REQUIRES: system-admin role
   */
  updateRoleAccessRights: {
    endpoint: '/api/v2/roles/:name/access-rights',
    method: 'PUT' as const,
    version: '2.0.0',
    description: 'Update which access rights a role grants (system-admin only)',

    request: {
      headers: {
        'Authorization': 'Bearer <admin-token>'  // Must be escalated admin token
      },
      params: {
        name: {
          type: 'string',
          required: true,
          description: 'Role name to update'
        }
      },
      body: {
        accessRights: {
          type: 'string[]',
          required: true,
          description: 'Full list of access rights for this role'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: 'RoleDefinition',
          message: 'string'
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Requires system-admin role' },
        { status: 404, code: 'ROLE_NOT_FOUND', message: 'Role not found' },
        { status: 400, code: 'INVALID_ACCESS_RIGHTS', message: 'One or more access rights are invalid' }
      ]
    },

    notes: `
      - Only system-admin can modify role access rights
      - Requires escalated admin token (not regular auth token)
      - Changes take effect immediately for all users with this role
      - Consider using continuation endpoint to refresh tokens after changes
    `
  },

  // =========================================================================
  // ACCESS RIGHTS
  // =========================================================================

  /**
   * List All Access Rights
   * GET /api/v2/access-rights
   */
  listAccessRights: {
    endpoint: '/api/v2/access-rights',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'List all available access rights, optionally filtered by domain',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        domain: {
          type: 'string',
          required: false,
          enum: ['content', 'enrollment', 'staff', 'learner', 'reports', 'system', 'billing', 'audit', 'grades'],
          description: 'Filter by domain'
        },
        sensitiveOnly: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Only return sensitive rights (FERPA, billing, etc.)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            accessRights: 'AccessRight[]',
            byDomain: {
              content: 'AccessRight[]',
              enrollment: 'AccessRight[]',
              staff: 'AccessRight[]',
              learner: 'AccessRight[]',
              reports: 'AccessRight[]',
              system: 'AccessRight[]',
              billing: 'AccessRight[]',
              audit: 'AccessRight[]',
              grades: 'AccessRight[]'
            },
            sensitive: {
              ferpa: 'AccessRight[]',
              billing: 'AccessRight[]',
              pii: 'AccessRight[]',
              audit: 'AccessRight[]'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    example: {
      request: { domain: 'content' },
      response: {
        success: true,
        data: {
          accessRights: [
            {
              id: '507f1f77bcf86cd799439020',
              name: 'content:courses:read',
              domain: 'content',
              resource: 'courses',
              action: 'read',
              description: 'View course details and content',
              isSensitive: false,
              isActive: true
            },
            {
              id: '507f1f77bcf86cd799439021',
              name: 'content:courses:manage',
              domain: 'content',
              resource: 'courses',
              action: 'manage',
              description: 'Full control over courses (create, update, delete)',
              isSensitive: false,
              isActive: true
            }
          ],
          byDomain: { /* grouped by domain */ },
          sensitive: { /* grouped by sensitivity category */ }
        }
      }
    },

    notes: `
      - Access rights follow pattern: domain:resource:action
      - Sensitive rights are flagged for FERPA/billing compliance
      - Wildcard rights (e.g., 'system:*') grant all rights in that domain
      - UI should display sensitive rights with appropriate warnings
    `
  },

  /**
   * Get Access Rights for Role
   * GET /api/v2/access-rights/role/:roleName
   */
  getAccessRightsForRole: {
    endpoint: '/api/v2/access-rights/role/:roleName',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Get all access rights granted by a specific role',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        roleName: {
          type: 'string',
          required: true,
          description: 'Role name (e.g., "instructor")'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            role: 'RoleDefinition',
            accessRights: 'AccessRight[]',
            effectiveRights: 'string[]'  // Expanded from wildcards
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'ROLE_NOT_FOUND', message: 'Role not found' }
      ]
    },

    notes: `
      - effectiveRights expands wildcards (e.g., 'system:*' → all system rights)
      - Use this to determine exact permissions for a role
    `
  },

  // =========================================================================
  // MY ROLES & PERMISSIONS
  // =========================================================================

  /**
   * Get My Roles (Current User)
   * GET /api/v2/roles/me
   */
  getMyRoles: {
    endpoint: '/api/v2/roles/me',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Get all roles and access rights for the current user',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            userTypes: 'UserType[]',
            defaultDashboard: 'learner | staff',
            canEscalateToAdmin: 'boolean',
            
            /** Department memberships with roles */
            departmentMemberships: 'DepartmentMembership[]',
            
            /** Aggregated access rights across all departments */
            allAccessRights: 'string[]',
            
            /** Last selected department (for UI state) */
            lastSelectedDepartment: 'string | null',
            
            /** Admin roles (only if global-admin userType) */
            adminRoles: 'string[] | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          userTypes: ['staff', 'global-admin'],
          defaultDashboard: 'staff',
          canEscalateToAdmin: true,
          departmentMemberships: [
            {
              departmentId: '507f1f77bcf86cd799439100',
              departmentName: 'Cognitive Therapy',
              departmentSlug: 'cognitive-therapy',
              roles: ['instructor', 'content-admin'],
              accessRights: ['content:courses:read', 'content:courses:manage', 'grades:own-classes:manage'],
              isPrimary: true,
              isActive: true,
              joinedAt: '2025-06-15T00:00:00.000Z',
              childDepartments: [
                {
                  departmentId: '507f1f77bcf86cd799439101',
                  departmentName: 'CBT Advanced',
                  roles: ['instructor', 'content-admin']
                }
              ]
            }
          ],
          allAccessRights: ['content:courses:read', 'content:courses:manage', 'grades:own-classes:manage'],
          lastSelectedDepartment: '507f1f77bcf86cd799439100',
          adminRoles: ['system-admin']
        }
      }
    },

    notes: `
      - This is the primary endpoint for UI to determine what to show
      - departmentMemberships includes child departments (role cascading)
      - allAccessRights is the union of rights from all departments
      - Check canEscalateToAdmin to show/hide "Login as Admin" button
      - lastSelectedDepartment helps restore UI state on page load
    `
  },

  /**
   * Get My Roles for Department
   * GET /api/v2/roles/me/department/:departmentId
   */
  getMyRolesForDepartment: {
    endpoint: '/api/v2/roles/me/department/:departmentId',
    method: 'GET' as const,
    version: '2.0.0',
    description: 'Get roles and access rights for current user in a specific department',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: {
          type: 'string',
          required: true,
          description: 'Department ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            departmentId: 'string',
            departmentName: 'string',
            roles: 'string[]',
            accessRights: 'string[]',
            effectiveRights: 'string[]',  // Expanded wildcards
            isDirectMember: 'boolean',    // vs. inherited from parent
            inheritedFrom: 'string | null'  // Parent department ID if inherited
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'NOT_A_MEMBER', message: 'User is not a member of this department' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    notes: `
      - Use this when user selects a department in the UI
      - isDirectMember indicates whether roles come from direct membership or parent
      - effectiveRights is what the UI should use for permission checks
    `
  }
};

// ============================================================================
// UI HELPER FUNCTIONS (Reference Implementation)
// ============================================================================

/**
 * These are suggested helper functions for the UI team.
 * They are NOT part of the API contract but demonstrate how to use the data.
 */
export const UIHelpers = {
  /**
   * Check if user has a specific access right
   * @param userRights - Array of user's access rights
   * @param requiredRight - The right to check for
   * @returns boolean
   */
  hasAccessRight: (userRights: string[], requiredRight: string): boolean => {
    // Direct match
    if (userRights.includes(requiredRight)) return true;
    
    // Check wildcards
    const [domain] = requiredRight.split(':');
    if (userRights.includes(`${domain}:*`)) return true;
    
    return false;
  },

  /**
   * Check if user has ANY of the required rights
   */
  hasAnyAccessRight: (userRights: string[], requiredRights: string[]): boolean => {
    return requiredRights.some(right => 
      UIHelpers.hasAccessRight(userRights, right)
    );
  },

  /**
   * Check if user has ALL of the required rights
   */
  hasAllAccessRights: (userRights: string[], requiredRights: string[]): boolean => {
    return requiredRights.every(right => 
      UIHelpers.hasAccessRight(userRights, right)
    );
  },

  /**
   * Determine which dashboard to show on login
   */
  getDefaultDashboard: (userTypes: UserType[]): 'learner' | 'staff' => {
    if (userTypes.length === 1 && userTypes[0] === 'learner') {
      return 'learner';
    }
    return 'staff';
  },

  /**
   * Check if user can escalate to admin dashboard
   */
  canEscalateToAdmin: (userTypes: UserType[]): boolean => {
    return userTypes.includes('global-admin');
  }
};

export default RolesContract;
