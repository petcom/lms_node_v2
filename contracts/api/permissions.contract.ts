/**
 * Permissions & Role Management API Contracts
 * Version: 1.0.0
 *
 * These contracts define the role and permission management endpoints for the LMS API.
 * Supports built-in roles, custom roles, department-scoped permissions, role hierarchy,
 * and permission inheritance.
 */

export const PermissionsContract = {
  resource: 'permissions',
  version: '1.0.0',

  /**
   * List All Available Permissions
   * GET /api/v2/permissions
   */
  listPermissions: {
    endpoint: '/api/v2/permissions',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all available permissions grouped by category',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        category: {
          type: 'string',
          required: false,
          enum: ['users', 'courses', 'content', 'enrollments', 'assessments', 'reports', 'settings', 'system'],
          description: 'Filter by permission category'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            permissions: [
              {
                id: 'string',
                name: 'string',
                description: 'string',
                category: 'users|courses|content|enrollments|assessments|reports|settings|system',
                level: 'read|write|delete|manage',
                key: 'string',
                isSystemPermission: 'boolean'
              }
            ],
            categorized: {
              users: 'Permission[]',
              courses: 'Permission[]',
              content: 'Permission[]',
              enrollments: 'Permission[]',
              assessments: 'Permission[]',
              reports: 'Permission[]',
              settings: 'Permission[]',
              system: 'Permission[]'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view permissions' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          permissions: [
            {
              id: '507f1f77bcf86cd799439011',
              name: 'Read Users',
              description: 'View user profiles and lists',
              category: 'users',
              level: 'read',
              key: 'users:read',
              isSystemPermission: true
            },
            {
              id: '507f1f77bcf86cd799439012',
              name: 'Write Users',
              description: 'Create and update user accounts',
              category: 'users',
              level: 'write',
              key: 'users:write',
              isSystemPermission: true
            },
            {
              id: '507f1f77bcf86cd799439013',
              name: 'Manage Courses',
              description: 'Full control over courses including publish and archive',
              category: 'courses',
              level: 'manage',
              key: 'courses:manage',
              isSystemPermission: true
            }
          ],
          categorized: {
            users: [
              { id: '507f1f77bcf86cd799439011', name: 'Read Users', key: 'users:read', level: 'read', category: 'users', description: 'View user profiles and lists', isSystemPermission: true },
              { id: '507f1f77bcf86cd799439012', name: 'Write Users', key: 'users:write', level: 'write', category: 'users', description: 'Create and update user accounts', isSystemPermission: true },
              { id: '507f1f77bcf86cd799439014', name: 'Delete Users', key: 'users:delete', level: 'delete', category: 'users', description: 'Delete user accounts', isSystemPermission: true }
            ],
            courses: [
              { id: '507f1f77bcf86cd799439013', name: 'Manage Courses', key: 'courses:manage', level: 'manage', category: 'courses', description: 'Full control over courses', isSystemPermission: true }
            ],
            content: [],
            enrollments: [],
            assessments: [],
            reports: [],
            settings: [],
            system: []
          }
        }
      }
    },

    permissions: ['system:read', 'permissions:read'],

    notes: `
      - Returns all available permissions in the system
      - Permissions are grouped by category for easier management
      - System permissions cannot be deleted or modified
      - Custom permissions can be created for specific use cases
      - Permission levels: read < write < delete < manage
      - Each permission has a unique key format: category:level
      - Available categories:
        * users - User account management
        * courses - Course and class management
        * content - Content library and SCORM management
        * enrollments - Program and course enrollment
        * assessments - Assessments and grading
        * reports - Analytics and reporting
        * settings - System configuration
        * system - System-wide administration
    `
  },

  /**
   * List All Roles with Permissions
   * GET /api/v2/permissions/roles
   */
  listRoles: {
    endpoint: '/api/v2/permissions/roles',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all roles with their permissions and metadata',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        includeBuiltIn: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include built-in system roles'
        },
        includeCustom: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include custom roles'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter roles by department scope'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            roles: [
              {
                id: 'ObjectId',
                name: 'string',
                description: 'string',
                type: 'built-in|custom',
                level: 'number',
                permissions: 'string[]',
                departmentId: 'ObjectId | null',
                inheritsFrom: 'ObjectId | null',
                isActive: 'boolean',
                userCount: 'number',
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view roles' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          roles: [
            {
              id: '507f1f77bcf86cd799439020',
              name: 'system-admin',
              description: 'Full system administrator with unrestricted access',
              type: 'built-in',
              level: 100,
              permissions: [
                'users:read', 'users:write', 'users:delete', 'users:manage',
                'courses:read', 'courses:write', 'courses:delete', 'courses:manage',
                'content:read', 'content:write', 'content:delete', 'content:manage',
                'enrollments:read', 'enrollments:write', 'enrollments:delete', 'enrollments:manage',
                'assessments:read', 'assessments:write', 'assessments:delete', 'assessments:manage',
                'reports:read', 'reports:write', 'reports:manage',
                'settings:read', 'settings:write', 'settings:manage',
                'system:read', 'system:write', 'system:manage'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 3,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439021',
              name: 'department-admin',
              description: 'Department administrator with department-scoped permissions',
              type: 'built-in',
              level: 80,
              permissions: [
                'users:read', 'users:write',
                'courses:read', 'courses:write', 'courses:manage',
                'content:read', 'content:write', 'content:manage',
                'enrollments:read', 'enrollments:write', 'enrollments:manage',
                'assessments:read', 'assessments:write',
                'reports:read', 'reports:write'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 12,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439022',
              name: 'instructor',
              description: 'Course instructor with teaching and grading capabilities',
              type: 'built-in',
              level: 60,
              permissions: [
                'users:read',
                'courses:read', 'courses:write',
                'content:read', 'content:write',
                'enrollments:read', 'enrollments:write',
                'assessments:read', 'assessments:write',
                'reports:read'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 45,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439023',
              name: 'content-admin',
              description: 'Content library administrator',
              type: 'built-in',
              level: 70,
              permissions: [
                'content:read', 'content:write', 'content:delete', 'content:manage',
                'courses:read', 'courses:write',
                'reports:read'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 8,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439024',
              name: 'billing-admin',
              description: 'Billing and payment administrator',
              type: 'built-in',
              level: 50,
              permissions: [
                'users:read',
                'enrollments:read',
                'reports:read', 'reports:write'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 2,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439025',
              name: 'learner',
              description: 'Standard learner account',
              type: 'built-in',
              level: 10,
              permissions: [
                'courses:read',
                'content:read',
                'enrollments:read',
                'assessments:read'
              ],
              departmentId: null,
              inheritsFrom: null,
              isActive: true,
              userCount: 1523,
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439026',
              name: 'custom-course-reviewer',
              description: 'Custom role for course review and approval',
              type: 'custom',
              level: 55,
              permissions: [
                'courses:read', 'courses:write',
                'content:read',
                'reports:read'
              ],
              departmentId: '507f1f77bcf86cd799439030',
              inheritsFrom: '507f1f77bcf86cd799439022',
              isActive: true,
              userCount: 5,
              createdAt: '2026-01-05T10:30:00.000Z',
              updatedAt: '2026-01-06T14:20:00.000Z'
            }
          ]
        }
      }
    },

    permissions: ['permissions:read', 'users:read'],

    notes: `
      - Returns all roles in the system (built-in and custom)
      - Built-in roles:
        * system-admin (level 100) - Full system access
        * department-admin (level 80) - Department-scoped admin
        * instructor (level 60) - Teaching and grading
        * content-admin (level 70) - Content management
        * billing-admin (level 50) - Billing only
        * learner (level 10) - Basic learner access
      - Custom roles can be created with specific permission sets
      - Role level determines hierarchy (higher level = more authority)
      - Department-scoped roles only apply within specific departments
      - Roles can inherit permissions from other roles
      - Built-in roles cannot be deleted or have their core permissions changed
      - userCount shows how many users currently have this role
      - Permissions are stored as keys (e.g., 'courses:manage')
    `
  },

  /**
   * Get Role Details with Permissions
   * GET /api/v2/permissions/roles/:roleId
   */
  getRoleDetails: {
    endpoint: '/api/v2/permissions/roles/:roleId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific role including permissions and users',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        roleId: {
          type: 'ObjectId',
          required: true,
          description: 'Role ID or built-in role name (e.g., "system-admin")'
        }
      },
      query: {
        includeUsers: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include list of users with this role'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            role: {
              id: 'ObjectId',
              name: 'string',
              description: 'string',
              type: 'built-in|custom',
              level: 'number',
              permissions: [
                {
                  id: 'string',
                  key: 'string',
                  name: 'string',
                  description: 'string',
                  category: 'string',
                  level: 'string',
                  inherited: 'boolean'
                }
              ],
              departmentId: 'ObjectId | null',
              department: {
                id: 'ObjectId',
                name: 'string'
              },
              inheritsFrom: 'ObjectId | null',
              parentRole: {
                id: 'ObjectId',
                name: 'string'
              },
              inheritedPermissions: 'string[]',
              ownPermissions: 'string[]',
              effectivePermissions: 'string[]',
              isActive: 'boolean',
              canDelete: 'boolean',
              canEdit: 'boolean',
              userCount: 'number',
              users: [
                {
                  id: 'ObjectId',
                  email: 'string',
                  firstName: 'string',
                  lastName: 'string',
                  assignedAt: 'Date'
                }
              ],
              createdBy: 'ObjectId | null',
              createdAt: 'Date',
              updatedAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view role details' },
        { status: 404, code: 'NOT_FOUND', message: 'Role not found' }
      ]
    },

    example: {
      request: {
        roleId: '507f1f77bcf86cd799439022'
      },
      response: {
        success: true,
        data: {
          role: {
            id: '507f1f77bcf86cd799439022',
            name: 'instructor',
            description: 'Course instructor with teaching and grading capabilities',
            type: 'built-in',
            level: 60,
            permissions: [
              {
                id: '507f1f77bcf86cd799439011',
                key: 'users:read',
                name: 'Read Users',
                description: 'View user profiles and lists',
                category: 'users',
                level: 'read',
                inherited: false
              },
              {
                id: '507f1f77bcf86cd799439012',
                key: 'courses:read',
                name: 'Read Courses',
                description: 'View course information',
                category: 'courses',
                level: 'read',
                inherited: false
              },
              {
                id: '507f1f77bcf86cd799439013',
                key: 'courses:write',
                name: 'Write Courses',
                description: 'Create and update courses',
                category: 'courses',
                level: 'write',
                inherited: false
              }
            ],
            departmentId: null,
            department: null,
            inheritsFrom: null,
            parentRole: null,
            inheritedPermissions: [],
            ownPermissions: [
              'users:read',
              'courses:read',
              'courses:write',
              'content:read',
              'content:write',
              'enrollments:read',
              'enrollments:write',
              'assessments:read',
              'assessments:write',
              'reports:read'
            ],
            effectivePermissions: [
              'users:read',
              'courses:read',
              'courses:write',
              'content:read',
              'content:write',
              'enrollments:read',
              'enrollments:write',
              'assessments:read',
              'assessments:write',
              'reports:read'
            ],
            isActive: true,
            canDelete: false,
            canEdit: false,
            userCount: 45,
            users: [],
            createdBy: null,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z'
          }
        }
      }
    },

    permissions: ['permissions:read', 'users:read'],

    notes: `
      - Returns detailed role information including all permissions
      - Permissions marked as "inherited" come from parent roles
      - effectivePermissions = ownPermissions + inheritedPermissions
      - canDelete = false for built-in roles
      - canEdit = false for built-in roles (can't change core permissions)
      - includeUsers=true returns list of users with this role (admin only)
      - Department-scoped roles only visible to users in that department
      - Role hierarchy enforced: can't view roles with higher level
    `
  },

  /**
   * Create Custom Role
   * POST /api/v2/permissions/roles
   */
  createRole: {
    endpoint: '/api/v2/permissions/roles',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new custom role with specific permissions',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        name: {
          type: 'string',
          required: true,
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-z0-9-]+$',
          description: 'Role name (lowercase, hyphen-separated)'
        },
        description: {
          type: 'string',
          required: true,
          minLength: 10,
          maxLength: 500
        },
        level: {
          type: 'number',
          required: false,
          min: 11,
          max: 99,
          default: 50,
          description: 'Role level (11-99, cannot overlap built-in roles)'
        },
        permissions: {
          type: 'string[]',
          required: true,
          minItems: 1,
          description: 'Array of permission keys'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Department scope (null for global)'
        },
        inheritsFrom: {
          type: 'ObjectId',
          required: false,
          description: 'Parent role to inherit permissions from'
        }
      }
    },

    response: {
      success: {
        status: 201,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            role: {
              id: 'ObjectId',
              name: 'string',
              description: 'string',
              type: 'custom',
              level: 'number',
              permissions: 'string[]',
              departmentId: 'ObjectId | null',
              inheritsFrom: 'ObjectId | null',
              isActive: 'boolean',
              createdBy: 'ObjectId',
              createdAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid role data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create roles' },
        { status: 409, code: 'ROLE_EXISTS', message: 'Role with this name already exists' }
      ]
    },

    example: {
      request: {
        name: 'course-reviewer',
        description: 'Reviews and approves course content before publication',
        level: 55,
        permissions: [
          'courses:read',
          'courses:write',
          'content:read',
          'reports:read'
        ],
        departmentId: '507f1f77bcf86cd799439030',
        inheritsFrom: null
      },
      response: {
        success: true,
        message: 'Custom role created successfully',
        data: {
          role: {
            id: '507f1f77bcf86cd799439040',
            name: 'course-reviewer',
            description: 'Reviews and approves course content before publication',
            type: 'custom',
            level: 55,
            permissions: [
              'courses:read',
              'courses:write',
              'content:read',
              'reports:read'
            ],
            departmentId: '507f1f77bcf86cd799439030',
            inheritsFrom: null,
            isActive: true,
            createdBy: '507f1f77bcf86cd799439001',
            createdAt: '2026-01-08T10:30:00.000Z'
          }
        }
      }
    },

    permissions: ['permissions:write', 'system:manage'],

    notes: `
      - Only system-admin and department-admin can create custom roles
      - Department admins can only create roles within their departments
      - Role names must be unique within their scope (global or department)
      - Role names must be lowercase with hyphens (e.g., 'course-reviewer')
      - Custom role levels must be 11-99 (built-in roles use 10, 50, 60, 70, 80, 100)
      - All permissions must exist in the system
      - Cannot grant permissions higher than your own level
      - Department-scoped roles only apply to users in that department
      - Role inheritance copies all permissions from parent role
      - Cannot inherit from higher-level role than you have access to
      - Validation:
        * name: 3-50 chars, lowercase with hyphens
        * description: 10-500 chars
        * permissions: must be valid permission keys
        * level: 11-99 for custom roles
    `
  },

  /**
   * Update Role Permissions
   * PUT /api/v2/permissions/roles/:roleId
   */
  updateRole: {
    endpoint: '/api/v2/permissions/roles/:roleId',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update custom role permissions and metadata',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        roleId: {
          type: 'ObjectId',
          required: true
        }
      },
      body: {
        description: {
          type: 'string',
          required: false,
          minLength: 10,
          maxLength: 500
        },
        level: {
          type: 'number',
          required: false,
          min: 11,
          max: 99
        },
        permissions: {
          type: 'string[]',
          required: false,
          description: 'Complete list of permissions (replaces existing)'
        },
        isActive: {
          type: 'boolean',
          required: false,
          description: 'Enable or disable role'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            role: {
              id: 'ObjectId',
              name: 'string',
              description: 'string',
              type: 'custom',
              level: 'number',
              permissions: 'string[]',
              departmentId: 'ObjectId | null',
              inheritsFrom: 'ObjectId | null',
              isActive: 'boolean',
              updatedBy: 'ObjectId',
              updatedAt: 'Date'
            },
            affectedUsers: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid update data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot modify built-in roles' },
        { status: 404, code: 'NOT_FOUND', message: 'Role not found' }
      ]
    },

    example: {
      request: {
        roleId: '507f1f77bcf86cd799439040',
        description: 'Reviews and approves course content with additional reporting access',
        permissions: [
          'courses:read',
          'courses:write',
          'content:read',
          'content:write',
          'reports:read',
          'reports:write'
        ]
      },
      response: {
        success: true,
        message: 'Role updated successfully',
        data: {
          role: {
            id: '507f1f77bcf86cd799439040',
            name: 'course-reviewer',
            description: 'Reviews and approves course content with additional reporting access',
            type: 'custom',
            level: 55,
            permissions: [
              'courses:read',
              'courses:write',
              'content:read',
              'content:write',
              'reports:read',
              'reports:write'
            ],
            departmentId: '507f1f77bcf86cd799439030',
            inheritsFrom: null,
            isActive: true,
            updatedBy: '507f1f77bcf86cd799439001',
            updatedAt: '2026-01-08T11:45:00.000Z'
          },
          affectedUsers: 5
        }
      }
    },

    permissions: ['permissions:write', 'system:manage'],

    notes: `
      - Only custom roles can be modified
      - Built-in roles cannot be edited (returns 403)
      - Cannot change role name (create new role instead)
      - Cannot change role scope (departmentId)
      - Permissions array replaces all existing permissions
      - Cannot grant permissions higher than your own level
      - Department admins can only modify roles in their departments
      - Disabling role (isActive=false) revokes access for all users with that role
      - affectedUsers shows how many users are impacted by the change
      - System tracks who made changes and when
      - Validation same as create endpoint
    `
  },

  /**
   * Delete Custom Role
   * DELETE /api/v2/permissions/roles/:roleId
   */
  deleteRole: {
    endpoint: '/api/v2/permissions/roles/:roleId',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a custom role',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        roleId: {
          type: 'ObjectId',
          required: true
        }
      },
      query: {
        reassignTo: {
          type: 'ObjectId',
          required: false,
          description: 'Role ID to reassign users to (required if role has users)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            deletedRole: {
              id: 'ObjectId',
              name: 'string'
            },
            affectedUsers: 'number',
            reassignedTo: {
              id: 'ObjectId',
              name: 'string'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'ROLE_HAS_USERS', message: 'Cannot delete role with active users. Specify reassignTo role.' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot delete built-in roles' },
        { status: 404, code: 'NOT_FOUND', message: 'Role not found' }
      ]
    },

    example: {
      request: {
        roleId: '507f1f77bcf86cd799439040',
        reassignTo: '507f1f77bcf86cd799439022'
      },
      response: {
        success: true,
        message: 'Role deleted successfully',
        data: {
          deletedRole: {
            id: '507f1f77bcf86cd799439040',
            name: 'course-reviewer'
          },
          affectedUsers: 5,
          reassignedTo: {
            id: '507f1f77bcf86cd799439022',
            name: 'instructor'
          }
        }
      }
    },

    permissions: ['permissions:delete', 'system:manage'],

    notes: `
      - Only custom roles can be deleted
      - Built-in roles cannot be deleted (returns 403)
      - Cannot delete role if users currently have it (unless reassignTo provided)
      - reassignTo must be a valid role ID
      - All users with deleted role are reassigned to specified role
      - Department admins can only delete roles in their departments
      - Deletion is permanent (not soft delete)
      - Audit log tracks role deletion and user reassignment
    `
  },

  /**
   * Get User's Effective Permissions
   * GET /api/v2/permissions/user/:userId
   */
  getUserPermissions: {
    endpoint: '/api/v2/permissions/user/:userId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get effective permissions for a specific user (combining all roles)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        userId: {
          type: 'ObjectId',
          required: true,
          description: 'User ID (use "me" for current user)'
        }
      },
      query: {
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Calculate permissions for specific department context'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            userId: 'ObjectId',
            roles: [
              {
                id: 'ObjectId',
                name: 'string',
                type: 'built-in|custom',
                departmentId: 'ObjectId | null'
              }
            ],
            permissions: {
              all: 'string[]',
              byCategory: {
                users: 'string[]',
                courses: 'string[]',
                content: 'string[]',
                enrollments: 'string[]',
                assessments: 'string[]',
                reports: 'string[]',
                settings: 'string[]',
                system: 'string[]'
              },
              byRole: [
                {
                  roleId: 'ObjectId',
                  roleName: 'string',
                  permissions: 'string[]'
                }
              ]
            },
            departments: [
              {
                id: 'ObjectId',
                name: 'string',
                permissions: 'string[]'
              }
            ],
            effectiveLevel: 'number',
            isAdmin: 'boolean',
            isSuperAdmin: 'boolean'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot view permissions of other users' },
        { status: 404, code: 'NOT_FOUND', message: 'User not found' }
      ]
    },

    example: {
      request: {
        userId: '507f1f77bcf86cd799439050'
      },
      response: {
        success: true,
        data: {
          userId: '507f1f77bcf86cd799439050',
          roles: [
            {
              id: '507f1f77bcf86cd799439021',
              name: 'department-admin',
              type: 'built-in',
              departmentId: null
            },
            {
              id: '507f1f77bcf86cd799439040',
              name: 'course-reviewer',
              type: 'custom',
              departmentId: '507f1f77bcf86cd799439030'
            }
          ],
          permissions: {
            all: [
              'users:read', 'users:write',
              'courses:read', 'courses:write', 'courses:manage',
              'content:read', 'content:write', 'content:manage',
              'enrollments:read', 'enrollments:write', 'enrollments:manage',
              'assessments:read', 'assessments:write',
              'reports:read', 'reports:write'
            ],
            byCategory: {
              users: ['users:read', 'users:write'],
              courses: ['courses:read', 'courses:write', 'courses:manage'],
              content: ['content:read', 'content:write', 'content:manage'],
              enrollments: ['enrollments:read', 'enrollments:write', 'enrollments:manage'],
              assessments: ['assessments:read', 'assessments:write'],
              reports: ['reports:read', 'reports:write'],
              settings: [],
              system: []
            },
            byRole: [
              {
                roleId: '507f1f77bcf86cd799439021',
                roleName: 'department-admin',
                permissions: [
                  'users:read', 'users:write',
                  'courses:read', 'courses:write', 'courses:manage',
                  'content:read', 'content:write', 'content:manage',
                  'enrollments:read', 'enrollments:write', 'enrollments:manage',
                  'assessments:read', 'assessments:write',
                  'reports:read', 'reports:write'
                ]
              },
              {
                roleId: '507f1f77bcf86cd799439040',
                roleName: 'course-reviewer',
                permissions: [
                  'courses:read', 'courses:write',
                  'content:read', 'content:write',
                  'reports:read', 'reports:write'
                ]
              }
            ]
          },
          departments: [
            {
              id: '507f1f77bcf86cd799439030',
              name: 'Engineering Department',
              permissions: [
                'courses:read', 'courses:write',
                'content:read', 'content:write',
                'reports:read', 'reports:write'
              ]
            }
          ],
          effectiveLevel: 80,
          isAdmin: true,
          isSuperAdmin: false
        }
      }
    },

    permissions: ['permissions:read', 'users:read'],

    notes: `
      - Returns combined permissions from all user's roles
      - Effective permissions = union of all role permissions
      - Department-scoped permissions only apply within that department
      - effectiveLevel = highest role level user has
      - isAdmin = true if user has any admin role (level >= 50)
      - isSuperAdmin = true if user has system-admin role (level 100)
      - Use userId="me" to get current user's permissions
      - Non-admin users can only view their own permissions
      - Admins can view permissions of users in their departments
      - System admins can view any user's permissions
      - departmentId filter shows permissions specific to that department
      - Useful for frontend to determine what UI elements to show
    `
  },

  /**
   * Check User Permission
   * POST /api/v2/permissions/check
   */
  checkPermission: {
    endpoint: '/api/v2/permissions/check',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Check if current user has specific permission(s)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        permission: {
          type: 'string',
          required: false,
          description: 'Single permission to check'
        },
        permissions: {
          type: 'string[]',
          required: false,
          description: 'Multiple permissions to check (OR logic)'
        },
        requireAll: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'If true, user must have ALL permissions (AND logic)'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Check permission within specific department context'
        },
        resourceId: {
          type: 'ObjectId',
          required: false,
          description: 'Check permission on specific resource (e.g., course ID)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            hasPermission: 'boolean',
            checkedPermissions: 'string[]',
            grantedPermissions: 'string[]',
            deniedPermissions: 'string[]',
            reason: 'string | null',
            context: {
              userId: 'ObjectId',
              departmentId: 'ObjectId | null',
              resourceId: 'ObjectId | null',
              userLevel: 'number'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Must provide permission or permissions array' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      ]
    },

    example: {
      request: {
        permissions: ['courses:write', 'courses:manage'],
        requireAll: false,
        departmentId: '507f1f77bcf86cd799439030'
      },
      response: {
        success: true,
        data: {
          hasPermission: true,
          checkedPermissions: ['courses:write', 'courses:manage'],
          grantedPermissions: ['courses:write', 'courses:manage'],
          deniedPermissions: [],
          reason: null,
          context: {
            userId: '507f1f77bcf86cd799439050',
            departmentId: '507f1f77bcf86cd799439030',
            resourceId: null,
            userLevel: 80
          }
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Fast permission checking for frontend authorization
      - Can check single permission or multiple permissions
      - requireAll=false (default): returns true if user has ANY permission (OR logic)
      - requireAll=true: returns true only if user has ALL permissions (AND logic)
      - Department context restricts check to department-scoped permissions
      - Resource context checks ownership/association (e.g., user can edit their own courses)
      - Returns detailed breakdown of granted vs denied permissions
      - Useful for showing/hiding UI elements
      - Frontend should cache results for performance
      - Example use cases:
        * Check if user can create courses: { permission: 'courses:write' }
        * Check if user can publish OR archive: { permissions: ['courses:publish', 'courses:archive'] }
        * Check if user can grade AND report: { permissions: ['assessments:write', 'reports:read'], requireAll: true }
      - reason field explains why permission was denied (if applicable)
      - Extremely fast endpoint (< 10ms) for repeated checks
    `
  }
};

// Type exports for consumers
export type PermissionsContractType = typeof PermissionsContract;

// Request/Response types
export type ListPermissionsResponse = typeof PermissionsContract.listPermissions.example.response;
export type ListRolesResponse = typeof PermissionsContract.listRoles.example.response;
export type GetRoleDetailsResponse = typeof PermissionsContract.getRoleDetails.example.response;
export type CreateRoleRequest = typeof PermissionsContract.createRole.example.request;
export type CreateRoleResponse = typeof PermissionsContract.createRole.example.response;
export type UpdateRoleRequest = typeof PermissionsContract.updateRole.example.request;
export type UpdateRoleResponse = typeof PermissionsContract.updateRole.example.response;
export type DeleteRoleResponse = typeof PermissionsContract.deleteRole.example.response;
export type GetUserPermissionsResponse = typeof PermissionsContract.getUserPermissions.example.response;
export type CheckPermissionRequest = typeof PermissionsContract.checkPermission.example.request;
export type CheckPermissionResponse = typeof PermissionsContract.checkPermission.example.response;

/**
 * Built-in Roles Reference
 */
export const BUILT_IN_ROLES = {
  SYSTEM_ADMIN: {
    name: 'system-admin',
    level: 100,
    description: 'Full system administrator with unrestricted access'
  },
  DEPARTMENT_ADMIN: {
    name: 'department-admin',
    level: 80,
    description: 'Department administrator with department-scoped permissions'
  },
  CONTENT_ADMIN: {
    name: 'content-admin',
    level: 70,
    description: 'Content library administrator'
  },
  INSTRUCTOR: {
    name: 'instructor',
    level: 60,
    description: 'Course instructor with teaching and grading capabilities'
  },
  BILLING_ADMIN: {
    name: 'billing-admin',
    level: 50,
    description: 'Billing and payment administrator'
  },
  LEARNER: {
    name: 'learner',
    level: 10,
    description: 'Standard learner account'
  }
} as const;

/**
 * Permission Categories Reference
 */
export const PERMISSION_CATEGORIES = {
  USERS: 'users',
  COURSES: 'courses',
  CONTENT: 'content',
  ENROLLMENTS: 'enrollments',
  ASSESSMENTS: 'assessments',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  SYSTEM: 'system'
} as const;

/**
 * Permission Levels Reference
 */
export const PERMISSION_LEVELS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MANAGE: 'manage'
} as const;
