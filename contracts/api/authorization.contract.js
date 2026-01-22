"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationGuide = exports.StandardRoles = exports.MiddlewareExamples = exports.AuthorizationContracts = exports.CacheTTL = exports.CacheKeys = void 0;
exports.CacheKeys = {
    userPermissions: (userId) => `auth:permissions:${userId}`,
    rolesVersion: 'auth:roles:version',
    departmentsVersion: 'auth:depts:version',
    userVersion: (userId) => `auth:user:${userId}:version`,
};
exports.CacheTTL = {
    userPermissions: 15 * 60,
    roleDefinitions: 60 * 60,
    departmentHierarchy: 60 * 60,
};
exports.AuthorizationContracts = {
    resource: 'authorization',
    version: '1.0.0',
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
    refreshPermissions: {
        endpoint: '/api/v2/auth/permissions/refresh',
        method: 'POST',
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
    getUserPermissions: {
        endpoint: '/api/v2/admin/users/:userId/permissions',
        method: 'GET',
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
exports.MiddlewareExamples = {
    basic: `
    router.get('/courses',
      isAuthenticated,
      authorize('content:courses:read'),
      listCourses
    );
  `,
    anyOf: `
    router.get('/reports',
      isAuthenticated,
      authorize(['reports:department:read', 'reports:*'], { requireAny: true }),
      getReports
    );
  `,
    adminOnly: `
    router.delete('/users/:id',
      isAuthenticated,
      requireEscalation,
      authorize('system:users:delete'),
      deleteUser
    );
  `,
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
exports.StandardRoles = {
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
    'system-admin': {
        userType: 'global-admin',
        rights: ['*'],
        inheritToSubdepartments: true
    }
};
exports.MigrationGuide = {
    phase1: 'Add caching layer - no API changes',
    phase2: 'Add new authorize() alongside old requireAccessRight()',
    phase3: 'Migrate all authorization to authorize()',
    phase4: 'Remove deprecated functions'
};
