/**
 * Staff Management API Contracts
 * Version: 1.0.0
 *
 * These contracts define the staff user management endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 *
 * Phase 1: Core Identity & Organization (Critical Path)
 * Contract-first approach: Define contract before implementation
 */

export const StaffContracts = {
  /**
   * List Staff Users
   *
   * Permissions:
   * - global-admin: View all staff across departments
   * - staff (dept-scoped): View only staff in their assigned departments
   */
  list: {
    endpoint: '/api/v2/users/staff',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List staff users with filtering and pagination',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: {
          type: 'number',
          required: false,
          default: 1,
          min: 1,
          description: 'Page number for pagination'
        },
        limit: {
          type: 'number',
          required: false,
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of items per page'
        },
        department: {
          type: 'string',
          required: false,
          description: 'Filter by department ID (ObjectId)'
        },
        role: {
          type: 'string',
          required: false,
          enum: ['staff', 'instructor', 'content-admin', 'dept-admin'],
          description: 'Filter by staff role'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'inactive', 'withdrawn'],
          default: 'active',
          description: 'Filter by account status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search by name or email'
        },
        sort: {
          type: 'string',
          required: false,
          default: 'lastName',
          description: 'Sort field (prefix with - for desc, e.g., -createdAt)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            staff: [
              {
                id: 'string',
                email: 'string',
                firstName: 'string',
                lastName: 'string',
                role: 'string',
                departments: [
                  {
                    departmentId: 'string',
                    departmentName: 'string',
                    rolesInDepartment: 'string[]'
                  }
                ],
                permissions: 'string[]',
                isActive: 'boolean',
                status: 'string',
                lastLogin: 'Date | null',
                createdAt: 'Date'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number',
              hasNext: 'boolean',
              hasPrev: 'boolean'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view staff' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters' }
      ]
    },

    example: {
      request: {
        query: {
          department: '507f1f77bcf86cd799439012',
          status: 'active',
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          staff: [
            {
              id: '507f1f77bcf86cd799439011',
              email: 'john.instructor@example.com',
              firstName: 'John',
              lastName: 'Smith',
              role: 'staff',
              departments: [
                {
                  departmentId: '507f1f77bcf86cd799439012',
                  departmentName: 'Computer Science',
                  rolesInDepartment: ['instructor']
                }
              ],
              permissions: ['content:read', 'content:write', 'courses:manage'],
              isActive: true,
              status: 'active',
              lastLogin: '2026-01-08T10:30:00.000Z',
              createdAt: '2025-06-15T00:00:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439013',
              email: 'sarah.admin@example.com',
              firstName: 'Sarah',
              lastName: 'Johnson',
              role: 'staff',
              departments: [
                {
                  departmentId: '507f1f77bcf86cd799439012',
                  departmentName: 'Computer Science',
                  rolesInDepartment: ['dept-admin']
                }
              ],
              permissions: ['content:read', 'content:write', 'content:admin', 'courses:manage', 'dept:manage'],
              isActive: true,
              status: 'active',
              lastLogin: '2026-01-08T09:15:00.000Z',
              createdAt: '2025-05-20T00:00:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['global-admin', 'dept-admin'],

    notes: `
      - global-admin: Can view all staff across all departments
      - dept-admin: Can only view staff in departments they manage
      - staff: Can only view staff in their assigned departments (limited view)
      - Department scoping is enforced at the service layer
      - Search performs case-insensitive match on firstName, lastName, and email
      - Status filtering:
        - active: User can log in and perform tasks (default)
        - inactive: User account exists but login is disabled
        - withdrawn: Soft-deleted user (hidden from default views)
      - Validation rules:
        - page: Must be >= 1
        - limit: Must be 1-100
        - department: Must be valid ObjectId
        - role: Must be one of the enum values
        - search: Minimum 2 characters for search term
    `
  },

  /**
   * Register New Staff User
   *
   * Permissions:
   * - global-admin: Can create staff in any department
   * - dept-admin: Can create staff only in their managed departments
   */
  register: {
    endpoint: '/api/v2/users/staff',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Register a new staff user account',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        email: {
          type: 'string',
          required: true,
          format: 'email',
          description: 'Unique email address for staff user'
        },
        password: {
          type: 'string',
          required: true,
          minLength: 8,
          description: 'Password (min 8 characters, requires uppercase, lowercase, number)'
        },
        firstName: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100,
          description: 'First name'
        },
        lastName: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100,
          description: 'Last name'
        },
        departmentAssignments: {
          type: 'array',
          required: true,
          minItems: 1,
          description: 'Array of department assignments',
          items: {
            departmentId: {
              type: 'string',
              required: true,
              description: 'Department ObjectId'
            },
            role: {
              type: 'string',
              required: true,
              enum: ['instructor', 'content-admin', 'dept-admin'],
              description: 'Role within the department'
            }
          }
        },
        defaultDashboard: {
          type: 'string',
          required: false,
          enum: ['content-admin', 'instructor', 'analytics'],
          default: 'content-admin',
          description: 'Default dashboard view on login'
        },
        isActive: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Whether account is active (can login)'
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
            id: 'string',
            email: 'string',
            firstName: 'string',
            lastName: 'string',
            role: 'staff',
            departments: [
              {
                departmentId: 'string',
                departmentName: 'string',
                rolesInDepartment: 'string[]'
              }
            ],
            permissions: 'string[]',
            defaultDashboard: 'string',
            isActive: 'boolean',
            status: 'string',
            createdAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to create staff' },
        { status: 409, code: 'EMAIL_EXISTS', message: 'Email already registered' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'One or more departments not found' }
      ]
    },

    example: {
      request: {
        email: 'new.instructor@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe',
        departmentAssignments: [
          {
            departmentId: '507f1f77bcf86cd799439012',
            role: 'instructor'
          }
        ],
        defaultDashboard: 'instructor'
      },
      response: {
        success: true,
        message: 'Staff user created successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          email: 'new.instructor@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          role: 'staff',
          departments: [
            {
              departmentId: '507f1f77bcf86cd799439012',
              departmentName: 'Computer Science',
              rolesInDepartment: ['instructor']
            }
          ],
          permissions: ['content:read', 'content:write', 'courses:manage'],
          defaultDashboard: 'instructor',
          isActive: true,
          status: 'active',
          createdAt: '2026-01-08T00:00:00.000Z'
        }
      }
    },

    permissions: ['global-admin', 'dept-admin'],

    notes: `
      - Email must be unique across all users (staff and learners)
      - Password requirements:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one number
        - Special characters recommended but not required
      - Department assignments:
        - Must assign at least one department
        - dept-admin can only assign to departments they manage
        - global-admin can assign to any department
        - Multiple departments allowed with different roles per department
      - Role types:
        - instructor: Can create/manage courses, view assigned learners
        - content-admin: Can create/manage content library items
        - dept-admin: Can manage department settings and staff assignments
      - Permissions are auto-generated based on department roles
      - User receives email with account details and initial password
      - Forces password change on first login (future enhancement)
    `
  },

  /**
   * Get Staff User Details
   *
   * Permissions:
   * - global-admin: Can view any staff user
   * - dept-admin: Can view staff in their managed departments
   * - staff: Can view staff in their assigned departments
   */
  getById: {
    endpoint: '/api/v2/users/staff/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information for a specific staff user',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Staff user ID (ObjectId)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'string',
            email: 'string',
            firstName: 'string',
            lastName: 'string',
            role: 'staff',
            departments: [
              {
                departmentId: 'string',
                departmentName: 'string',
                rolesInDepartment: 'string[]'
              }
            ],
            permissions: 'string[]',
            defaultDashboard: 'string',
            isActive: 'boolean',
            status: 'string',
            profileImage: 'string | null',
            lastLogin: 'Date | null',
            createdAt: 'Date',
            updatedAt: 'Date',
            metadata: {
              coursesCreated: 'number',
              coursesManaged: 'number',
              contentCreated: 'number',
              lastActivityAt: 'Date | null'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this staff user' },
        { status: 404, code: 'NOT_FOUND', message: 'Staff user not found' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'john.instructor@example.com',
          firstName: 'John',
          lastName: 'Smith',
          role: 'staff',
          departments: [
            {
              departmentId: '507f1f77bcf86cd799439012',
              departmentName: 'Computer Science',
              rolesInDepartment: ['instructor']
            },
            {
              departmentId: '507f1f77bcf86cd799439014',
              departmentName: 'Mathematics',
              rolesInDepartment: ['content-admin']
            }
          ],
          permissions: ['content:read', 'content:write', 'content:admin', 'courses:manage'],
          defaultDashboard: 'instructor',
          isActive: true,
          status: 'active',
          profileImage: 'https://cdn.example.com/profiles/john-smith.jpg',
          lastLogin: '2026-01-08T10:30:00.000Z',
          createdAt: '2025-06-15T00:00:00.000Z',
          updatedAt: '2026-01-07T14:20:00.000Z',
          metadata: {
            coursesCreated: 15,
            coursesManaged: 22,
            contentCreated: 48,
            lastActivityAt: '2026-01-08T10:35:00.000Z'
          }
        }
      }
    },

    permissions: ['global-admin', 'dept-admin', 'staff'],

    notes: `
      - Department scoping applies:
        - global-admin: Access to any staff user
        - dept-admin: Access to staff in managed departments only
        - staff: Access to staff in same departments only
      - Returns 404 if user not found OR insufficient permissions (security)
      - Metadata includes aggregate statistics for admin view
      - Profile image URL points to CDN or storage service
      - lastLogin is null if user has never logged in
      - lastActivityAt tracks recent content/course interactions
    `
  },

  /**
   * Update Staff User
   *
   * Permissions:
   * - global-admin: Can update any staff user
   * - dept-admin: Can update staff in their managed departments (limited fields)
   */
  update: {
    endpoint: '/api/v2/users/staff/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update staff user information',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Staff user ID (ObjectId)'
        }
      },
      body: {
        email: {
          type: 'string',
          required: false,
          format: 'email',
          description: 'Update email address'
        },
        firstName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'Update first name'
        },
        lastName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'Update last name'
        },
        defaultDashboard: {
          type: 'string',
          required: false,
          enum: ['content-admin', 'instructor', 'analytics'],
          description: 'Update default dashboard'
        },
        isActive: {
          type: 'boolean',
          required: false,
          description: 'Activate/deactivate account (global-admin only)'
        },
        profileImage: {
          type: 'string',
          required: false,
          description: 'URL to profile image or null to remove'
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
            id: 'string',
            email: 'string',
            firstName: 'string',
            lastName: 'string',
            role: 'staff',
            departments: 'array',
            permissions: 'string[]',
            defaultDashboard: 'string',
            isActive: 'boolean',
            status: 'string',
            profileImage: 'string | null',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update this staff user' },
        { status: 404, code: 'NOT_FOUND', message: 'Staff user not found' },
        { status: 409, code: 'EMAIL_EXISTS', message: 'Email already in use by another user' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        body: {
          firstName: 'Jonathan',
          defaultDashboard: 'analytics',
          profileImage: 'https://cdn.example.com/profiles/jonathan-smith-new.jpg'
        }
      },
      response: {
        success: true,
        message: 'Staff user updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'john.instructor@example.com',
          firstName: 'Jonathan',
          lastName: 'Smith',
          role: 'staff',
          departments: [
            {
              departmentId: '507f1f77bcf86cd799439012',
              departmentName: 'Computer Science',
              rolesInDepartment: ['instructor']
            }
          ],
          permissions: ['content:read', 'content:write', 'courses:manage'],
          defaultDashboard: 'analytics',
          isActive: true,
          status: 'active',
          profileImage: 'https://cdn.example.com/profiles/jonathan-smith-new.jpg',
          updatedAt: '2026-01-08T11:45:00.000Z'
        }
      }
    },

    permissions: ['global-admin', 'dept-admin'],

    notes: `
      - All fields are optional (partial update)
      - Only provided fields are updated
      - Email uniqueness validated across all users
      - Department scoping:
        - global-admin: Can update any staff, including isActive status
        - dept-admin: Can update staff in managed departments, but cannot change isActive
      - Password cannot be updated via this endpoint (use separate password reset flow)
      - Department assignments cannot be updated here (use PATCH /users/staff/:id/departments)
      - Changing email triggers verification email (future enhancement)
      - Returns updated user object with all current data
      - Audit log entry created for significant changes
    `
  },

  /**
   * Soft Delete Staff User
   *
   * Permissions:
   * - global-admin: Can delete any staff user
   * - dept-admin: Can delete staff in their managed departments (with restrictions)
   */
  delete: {
    endpoint: '/api/v2/users/staff/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Soft delete a staff user (sets status to withdrawn)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Staff user ID (ObjectId)'
        }
      },
      query: {
        reason: {
          type: 'string',
          required: false,
          description: 'Reason for deletion (for audit log)'
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
            id: 'string',
            status: 'withdrawn',
            deletedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete this staff user' },
        { status: 404, code: 'NOT_FOUND', message: 'Staff user not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot delete staff user with active assignments' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        query: {
          reason: 'Staff member left organization'
        }
      },
      response: {
        success: true,
        message: 'Staff user deleted successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          status: 'withdrawn',
          deletedAt: '2026-01-08T12:00:00.000Z'
        }
      }
    },

    permissions: ['global-admin', 'dept-admin'],

    notes: `
      - Soft delete only: Sets status to 'withdrawn', does not remove from database
      - User login immediately disabled
      - User hidden from default staff lists (requires status=withdrawn query to see)
      - Department scoping:
        - global-admin: Can delete any staff user
        - dept-admin: Can delete staff only in managed departments
      - Validation checks before deletion:
        - Cannot delete staff with active course assignments (must reassign first)
        - Cannot delete staff with active class assignments (must reassign first)
        - Cannot delete last dept-admin in a department (must assign replacement first)
      - Returns 409 CONFLICT if validation checks fail
      - Audit log entry created with reason
      - Deleted staff users can be reactivated by global-admin if needed
      - Related data handling:
        - Course ownership: Retained (courses remain, ownership preserved)
        - Content creation: Retained (created content remains)
        - Activity logs: Retained (historical data preserved)
        - Assignments: Must be manually reassigned or removed before deletion
    `
  },

  /**
   * Update Department Assignments
   *
   * Permissions:
   * - global-admin: Can update any staff user's departments
   * - dept-admin: Can add/remove their managed departments only
   */
  updateDepartments: {
    endpoint: '/api/v2/users/staff/:id/departments',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Update staff user department assignments and roles',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Staff user ID (ObjectId)'
        }
      },
      body: {
        action: {
          type: 'string',
          required: true,
          enum: ['add', 'remove', 'update', 'replace'],
          description: 'Action to perform on department assignments'
        },
        departmentAssignments: {
          type: 'array',
          required: true,
          description: 'Department assignments to add/remove/update',
          items: {
            departmentId: {
              type: 'string',
              required: true,
              description: 'Department ObjectId'
            },
            role: {
              type: 'string',
              required: true,
              enum: ['instructor', 'content-admin', 'dept-admin'],
              description: 'Role within the department'
            }
          }
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
            id: 'string',
            departments: [
              {
                departmentId: 'string',
                departmentName: 'string',
                rolesInDepartment: 'string[]'
              }
            ],
            permissions: 'string[]',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update departments' },
        { status: 404, code: 'NOT_FOUND', message: 'Staff user or department not found' },
        { status: 409, code: 'CONFLICT', message: 'Cannot remove last dept-admin from department' }
      ]
    },

    example: {
      request: {
        params: {
          id: '507f1f77bcf86cd799439011'
        },
        body: {
          action: 'add',
          departmentAssignments: [
            {
              departmentId: '507f1f77bcf86cd799439014',
              role: 'content-admin'
            }
          ]
        }
      },
      response: {
        success: true,
        message: 'Department assignments updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          departments: [
            {
              departmentId: '507f1f77bcf86cd799439012',
              departmentName: 'Computer Science',
              rolesInDepartment: ['instructor']
            },
            {
              departmentId: '507f1f77bcf86cd799439014',
              departmentName: 'Mathematics',
              rolesInDepartment: ['content-admin']
            }
          ],
          permissions: ['content:read', 'content:write', 'content:admin', 'courses:manage'],
          updatedAt: '2026-01-08T13:15:00.000Z'
        }
      }
    },

    permissions: ['global-admin', 'dept-admin'],

    notes: `
      - Action types:
        - add: Add new department assignments (append to existing)
        - remove: Remove specified department assignments
        - update: Update role for existing department assignment
        - replace: Replace all department assignments with provided list
      - Department scoping:
        - global-admin: Can modify any department assignments
        - dept-admin: Can only add/remove/update their managed departments
      - Validation rules:
        - Staff must have at least one department assignment
        - Cannot remove last dept-admin from a department
        - Cannot assign to non-existent departments
        - Cannot duplicate department assignments (same dept with different roles)
      - Permissions are automatically recalculated based on new department roles
      - Role hierarchy per department:
        - instructor: Basic teaching permissions
        - content-admin: Content creation + instructor permissions
        - dept-admin: Department management + content-admin + instructor permissions
      - Audit log entry created for department changes
      - Existing course/content assignments retained (not affected by dept changes)
      - Email notification sent to user about department changes
    `
  }
};

// Type exports for consumers
export type StaffContractType = typeof StaffContracts;
export type StaffListRequest = typeof StaffContracts.list.example.request;
export type StaffListResponse = typeof StaffContracts.list.example.response;
export type StaffRegisterRequest = typeof StaffContracts.register.example.request;
export type StaffRegisterResponse = typeof StaffContracts.register.example.response;
export type StaffGetByIdResponse = typeof StaffContracts.getById.example.response;
export type StaffUpdateRequest = typeof StaffContracts.update.example.request;
export type StaffUpdateResponse = typeof StaffContracts.update.example.response;
export type StaffDeleteResponse = typeof StaffContracts.delete.example.response;
export type StaffUpdateDepartmentsRequest = typeof StaffContracts.updateDepartments.example.request;
export type StaffUpdateDepartmentsResponse = typeof StaffContracts.updateDepartments.example.response;
