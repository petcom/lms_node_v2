/**
 * Audit Logs API Contracts
 * Version: 1.0.0
 * Phase: 6 - System & Settings
 *
 * These contracts define audit trail and activity logging endpoints.
 * Provides comprehensive audit logging for compliance (FERPA, GDPR),
 * security monitoring, and activity tracking across the LMS.
 *
 * Both backend and UI teams use these as the source of truth.
 */

export const AuditLogsContract = {
  resource: 'audit-logs',
  version: '1.0.0',

  /**
   * List Audit Logs with Filters
   * GET /api/v2/audit-logs
   */
  list: {
    endpoint: '/api/v2/audit-logs',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List audit logs with advanced filtering and search',

    request: {
      headers: {
        'Authorization': {
          type: 'string',
          required: true,
          description: 'Bearer token'
        }
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
          default: 50,
          min: 1,
          max: 500,
          description: 'Records per page'
        },
        userId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by user who performed action'
        },
        action: {
          type: 'string',
          required: false,
          enum: [
            'create', 'read', 'update', 'delete',
            'login', 'logout', 'login_failed',
            'enroll', 'withdraw', 'complete',
            'grade', 'publish', 'unpublish',
            'archive', 'restore',
            'upload', 'download', 'export',
            'permission_change', 'role_change',
            'password_reset', 'password_change',
            'start_content', 'complete_content',
            'submit_assessment', 'grade_assessment'
          ],
          description: 'Filter by action type'
        },
        entityType: {
          type: 'string',
          required: false,
          enum: [
            'user', 'staff', 'learner',
            'course', 'class', 'program',
            'enrollment', 'class-enrollment',
            'content', 'scorm', 'exercise',
            'assessment', 'exam-result',
            'department', 'academic-year',
            'setting', 'permission'
          ],
          description: 'Filter by entity type affected'
        },
        entityId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific entity ID'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department (for staff with dept scope)'
        },
        startDate: {
          type: 'Date',
          required: false,
          description: 'Filter logs from this date (ISO 8601)'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'Filter logs until this date (ISO 8601)'
        },
        ipAddress: {
          type: 'string',
          required: false,
          description: 'Filter by IP address'
        },
        statusCode: {
          type: 'number',
          required: false,
          description: 'Filter by HTTP status code'
        },
        success: {
          type: 'boolean',
          required: false,
          description: 'Filter by success/failure status'
        },
        search: {
          type: 'string',
          required: false,
          description: 'Search in description, metadata, or error messages'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-timestamp',
          description: 'Sort field (prefix with - for desc). Options: timestamp, action, entityType, userId'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            logs: [
              {
                id: 'ObjectId',
                timestamp: 'Date',
                userId: 'ObjectId | null',
                userName: 'string | null',
                userRole: 'string | null',
                action: 'string',
                entityType: 'string',
                entityId: 'ObjectId | null',
                entityName: 'string | null',
                description: 'string',
                success: 'boolean',
                statusCode: 'number | null',
                ipAddress: 'string',
                userAgent: 'string',
                sessionId: 'string | null',
                departmentId: 'ObjectId | null',
                request: {
                  method: 'string',
                  path: 'string',
                  query: 'object | null',
                  body: 'object | null'
                },
                changes: {
                  before: 'object | null',
                  after: 'object | null'
                },
                metadata: 'object | null',
                errorMessage: 'string | null',
                errorStack: 'string | null',
                geo: 'object | null'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number',
              hasNext: 'boolean',
              hasPrev: 'boolean'
            },
            summary: {
              totalActions: 'number',
              successCount: 'number',
              failureCount: 'number',
              uniqueUsers: 'number',
              dateRange: {
                start: 'Date',
                end: 'Date'
              }
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view audit logs' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters' }
      ]
    },

    example: {
      request: {
        query: {
          page: 1,
          limit: 50,
          userId: '507f1f77bcf86cd799439011',
          action: 'login',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-08T23:59:59Z',
          sort: '-timestamp'
        }
      },
      response: {
        success: true,
        data: {
          logs: [
            {
              id: '507f1f77bcf86cd799439099',
              timestamp: '2026-01-08T14:30:00.000Z',
              userId: '507f1f77bcf86cd799439011',
              userName: 'John Doe',
              userRole: 'staff',
              action: 'login',
              entityType: 'user',
              entityId: '507f1f77bcf86cd799439011',
              entityName: 'john.doe@example.com',
              description: 'User logged in successfully',
              success: true,
              statusCode: 200,
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              sessionId: 'sess_abc123xyz',
              departmentId: '507f1f77bcf86cd799439012',
              request: {
                method: 'POST',
                path: '/api/v2/auth/login',
                query: null,
                body: { email: 'john.doe@example.com' }
              },
              changes: null,
              metadata: {
                loginMethod: 'password',
                mfaUsed: false
              },
              errorMessage: null,
              errorStack: null,
              geo: {
                country: 'US',
                region: 'California',
                city: 'San Francisco'
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 247,
            totalPages: 5,
            hasNext: true,
            hasPrev: false
          },
          summary: {
            totalActions: 247,
            successCount: 245,
            failureCount: 2,
            uniqueUsers: 12,
            dateRange: {
              start: '2026-01-01T00:00:00.000Z',
              end: '2026-01-08T23:59:59.000Z'
            }
          }
        }
      }
    },

    permissions: ['read:audit-logs'],

    notes: `
      - Global admins see all logs across all departments
      - Staff users with audit permissions see logs scoped to their departments
      - Learners cannot access audit logs
      - Immutable: logs cannot be modified or deleted
      - Retention policy: logs retained per compliance requirements (configurable)
      - Sensitive data (passwords, tokens) automatically redacted from request.body
      - IP addresses hashed for privacy if GDPR mode enabled
      - Performance: indexed on timestamp, userId, entityType, entityId
      - Maximum 500 records per page to prevent performance issues
      - Geographic data populated asynchronously (may be null for recent logs)
    `
  },

  /**
   * Get Specific Audit Log Entry
   * GET /api/v2/audit-logs/:id
   */
  getById: {
    endpoint: '/api/v2/audit-logs/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information for a specific audit log entry',

    request: {
      headers: {
        'Authorization': {
          type: 'string',
          required: true,
          description: 'Bearer token'
        }
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Audit log entry ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            id: 'ObjectId',
            timestamp: 'Date',
            userId: 'ObjectId | null',
            userName: 'string | null',
            userEmail: 'string | null',
            userRole: 'string | null',
            action: 'string',
            entityType: 'string',
            entityId: 'ObjectId | null',
            entityName: 'string | null',
            description: 'string',
            success: 'boolean',
            statusCode: 'number | null',
            ipAddress: 'string',
            userAgent: 'string',
            sessionId: 'string | null',
            departmentId: 'ObjectId | null',
            departmentName: 'string | null',
            request: {
              method: 'string',
              path: 'string',
              query: 'object | null',
              body: 'object | null',
              headers: 'object | null'
            },
            changes: {
              before: 'object | null',
              after: 'object | null',
              diff: 'array | null'
            },
            metadata: 'object | null',
            errorMessage: 'string | null',
            errorStack: 'string | null',
            geo: 'object | null',
            relatedLogs: [
              {
                id: 'ObjectId',
                timestamp: 'Date',
                action: 'string',
                description: 'string'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this audit log' },
        { status: 404, code: 'NOT_FOUND', message: 'Audit log entry not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439099' }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439099',
          timestamp: '2026-01-08T14:30:00.000Z',
          userId: '507f1f77bcf86cd799439011',
          userName: 'John Doe',
          userEmail: 'john.doe@example.com',
          userRole: 'staff',
          action: 'update',
          entityType: 'course',
          entityId: '507f1f77bcf86cd799439020',
          entityName: 'Introduction to Programming',
          description: 'Updated course details',
          success: true,
          statusCode: 200,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionId: 'sess_abc123xyz',
          departmentId: '507f1f77bcf86cd799439012',
          departmentName: 'Computer Science',
          request: {
            method: 'PUT',
            path: '/api/v2/courses/507f1f77bcf86cd799439020',
            query: null,
            body: {
              title: 'Introduction to Programming - Updated',
              description: 'Updated description'
            },
            headers: {
              'content-type': 'application/json'
            }
          },
          changes: {
            before: {
              title: 'Introduction to Programming',
              description: 'Original description'
            },
            after: {
              title: 'Introduction to Programming - Updated',
              description: 'Updated description'
            },
            diff: [
              { field: 'title', old: 'Introduction to Programming', new: 'Introduction to Programming - Updated' },
              { field: 'description', old: 'Original description', new: 'Updated description' }
            ]
          },
          metadata: {
            previousVersion: 2,
            currentVersion: 3,
            changeReason: 'Content update request'
          },
          errorMessage: null,
          errorStack: null,
          geo: {
            country: 'US',
            region: 'California',
            city: 'San Francisco',
            latitude: 37.7749,
            longitude: -122.4194,
            timezone: 'America/Los_Angeles'
          },
          relatedLogs: [
            {
              id: '507f1f77bcf86cd799439098',
              timestamp: '2026-01-08T14:25:00.000Z',
              action: 'read',
              description: 'Viewed course details'
            }
          ]
        }
      }
    },

    permissions: ['read:audit-logs'],

    notes: `
      - Includes full request details including headers (sensitive headers redacted)
      - Changes diff provides field-by-field comparison for update actions
      - Related logs show actions on same entity or by same user in time window
      - Geographic data includes coordinates for mapping (if available)
      - Department-scoped access enforced: staff can only view logs for their departments
    `
  },

  /**
   * Get User's Activity Audit Trail
   * GET /api/v2/audit-logs/user/:userId
   */
  getUserActivity: {
    endpoint: '/api/v2/audit-logs/user/:userId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get comprehensive activity audit trail for a specific user',

    request: {
      headers: {
        'Authorization': {
          type: 'string',
          required: true,
          description: 'Bearer token'
        }
      },
      params: {
        userId: {
          type: 'ObjectId',
          required: true,
          description: 'User ID to retrieve activity for'
        }
      },
      query: {
        page: {
          type: 'number',
          required: false,
          default: 1,
          min: 1
        },
        limit: {
          type: 'number',
          required: false,
          default: 50,
          min: 1,
          max: 200
        },
        action: {
          type: 'string',
          required: false,
          description: 'Filter by specific action type'
        },
        entityType: {
          type: 'string',
          required: false,
          description: 'Filter by entity type'
        },
        startDate: {
          type: 'Date',
          required: false,
          description: 'Filter logs from this date'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'Filter logs until this date'
        },
        includeSystem: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include system-generated actions (e.g., auto-enrollment)'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-timestamp'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            user: {
              id: 'ObjectId',
              name: 'string',
              email: 'string',
              role: 'string'
            },
            logs: [
              {
                id: 'ObjectId',
                timestamp: 'Date',
                action: 'string',
                entityType: 'string',
                entityId: 'ObjectId | null',
                entityName: 'string | null',
                description: 'string',
                success: 'boolean',
                ipAddress: 'string',
                sessionId: 'string | null',
                metadata: 'object | null'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number',
              hasNext: 'boolean',
              hasPrev: 'boolean'
            },
            analytics: {
              totalActions: 'number',
              actionBreakdown: {
                login: 'number',
                logout: 'number',
                create: 'number',
                update: 'number',
                delete: 'number',
                other: 'number'
              },
              activeHours: {
                morning: 'number',
                afternoon: 'number',
                evening: 'number',
                night: 'number'
              },
              lastActivity: 'Date',
              averageSessionDuration: 'number',
              mostAccessedEntities: [
                {
                  entityType: 'string',
                  entityId: 'ObjectId',
                  entityName: 'string',
                  accessCount: 'number'
                }
              ]
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view user activity' },
        { status: 404, code: 'NOT_FOUND', message: 'User not found' }
      ]
    },

    example: {
      request: {
        params: { userId: '507f1f77bcf86cd799439011' },
        query: { page: 1, limit: 50, startDate: '2026-01-01T00:00:00Z' }
      },
      response: {
        success: true,
        data: {
          user: {
            id: '507f1f77bcf86cd799439011',
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: 'staff'
          },
          logs: [
            {
              id: '507f1f77bcf86cd799439099',
              timestamp: '2026-01-08T14:30:00.000Z',
              action: 'login',
              entityType: 'user',
              entityId: '507f1f77bcf86cd799439011',
              entityName: 'john.doe@example.com',
              description: 'User logged in successfully',
              success: true,
              ipAddress: '192.168.1.100',
              sessionId: 'sess_abc123xyz',
              metadata: { loginMethod: 'password' }
            },
            {
              id: '507f1f77bcf86cd799439100',
              timestamp: '2026-01-08T14:35:00.000Z',
              action: 'update',
              entityType: 'course',
              entityId: '507f1f77bcf86cd799439020',
              entityName: 'Introduction to Programming',
              description: 'Updated course details',
              success: true,
              ipAddress: '192.168.1.100',
              sessionId: 'sess_abc123xyz',
              metadata: null
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 312,
            totalPages: 7,
            hasNext: true,
            hasPrev: false
          },
          analytics: {
            totalActions: 312,
            actionBreakdown: {
              login: 45,
              logout: 43,
              create: 23,
              update: 156,
              delete: 8,
              other: 37
            },
            activeHours: {
              morning: 78,
              afternoon: 145,
              evening: 67,
              night: 22
            },
            lastActivity: '2026-01-08T14:35:00.000Z',
            averageSessionDuration: 3600,
            mostAccessedEntities: [
              {
                entityType: 'course',
                entityId: '507f1f77bcf86cd799439020',
                entityName: 'Introduction to Programming',
                accessCount: 45
              },
              {
                entityType: 'content',
                entityId: '507f1f77bcf86cd799439021',
                entityName: 'Week 1 Lecture',
                accessCount: 32
              }
            ]
          }
        }
      }
    },

    permissions: ['read:audit-logs', 'read:user-activity'],

    notes: `
      - Users can view their own activity trail without special permissions
      - Staff can view activity for users in their departments
      - Global admins can view all user activity
      - Analytics provides behavioral insights for compliance and monitoring
      - Session duration calculated from login to logout events
      - Active hours categorized: morning (6-12), afternoon (12-18), evening (18-24), night (0-6)
      - System-generated actions excluded by default (enable with includeSystem=true)
    `
  },

  /**
   * Get Entity Audit Trail
   * GET /api/v2/audit-logs/entity/:entityType/:entityId
   */
  getEntityHistory: {
    endpoint: '/api/v2/audit-logs/entity/:entityType/:entityId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get complete audit history for a specific entity (course, user, enrollment, etc.)',

    request: {
      headers: {
        'Authorization': {
          type: 'string',
          required: true,
          description: 'Bearer token'
        }
      },
      params: {
        entityType: {
          type: 'string',
          required: true,
          enum: [
            'user', 'staff', 'learner',
            'course', 'class', 'program',
            'enrollment', 'class-enrollment',
            'content', 'scorm', 'exercise',
            'assessment', 'exam-result',
            'department', 'academic-year'
          ],
          description: 'Type of entity'
        },
        entityId: {
          type: 'ObjectId',
          required: true,
          description: 'Entity ID'
        }
      },
      query: {
        page: {
          type: 'number',
          required: false,
          default: 1,
          min: 1
        },
        limit: {
          type: 'number',
          required: false,
          default: 50,
          min: 1,
          max: 200
        },
        action: {
          type: 'string',
          required: false,
          description: 'Filter by specific action'
        },
        userId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by user who performed actions'
        },
        includeRelated: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include actions on related entities (e.g., modules for a course)'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-timestamp'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            entity: {
              type: 'string',
              id: 'ObjectId',
              name: 'string',
              status: 'string | null',
              currentVersion: 'number | null'
            },
            logs: [
              {
                id: 'ObjectId',
                timestamp: 'Date',
                userId: 'ObjectId | null',
                userName: 'string | null',
                action: 'string',
                description: 'string',
                success: 'boolean',
                changes: {
                  before: 'object | null',
                  after: 'object | null',
                  diff: 'array | null'
                },
                metadata: 'object | null',
                version: 'number | null'
              }
            ],
            pagination: {
              page: 'number',
              limit: 'number',
              total: 'number',
              totalPages: 'number',
              hasNext: 'boolean',
              hasPrev: 'boolean'
            },
            timeline: {
              created: {
                timestamp: 'Date',
                userId: 'ObjectId',
                userName: 'string'
              },
              published: {
                timestamp: 'Date | null',
                userId: 'ObjectId | null',
                userName: 'string | null'
              },
              lastModified: {
                timestamp: 'Date',
                userId: 'ObjectId',
                userName: 'string'
              },
              archived: {
                timestamp: 'Date | null',
                userId: 'ObjectId | null',
                userName: 'string | null'
              }
            },
            statistics: {
              totalChanges: 'number',
              uniqueContributors: 'number',
              versions: 'number',
              lastActivity: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view entity history' },
        { status: 404, code: 'NOT_FOUND', message: 'Entity not found' },
        { status: 400, code: 'INVALID_ENTITY_TYPE', message: 'Invalid entity type specified' }
      ]
    },

    example: {
      request: {
        params: {
          entityType: 'course',
          entityId: '507f1f77bcf86cd799439020'
        },
        query: { page: 1, limit: 50 }
      },
      response: {
        success: true,
        data: {
          entity: {
            type: 'course',
            id: '507f1f77bcf86cd799439020',
            name: 'Introduction to Programming',
            status: 'published',
            currentVersion: 5
          },
          logs: [
            {
              id: '507f1f77bcf86cd799439105',
              timestamp: '2026-01-08T14:30:00.000Z',
              userId: '507f1f77bcf86cd799439011',
              userName: 'John Doe',
              action: 'update',
              description: 'Updated course details',
              success: true,
              changes: {
                before: { title: 'Intro to Programming' },
                after: { title: 'Introduction to Programming' },
                diff: [
                  { field: 'title', old: 'Intro to Programming', new: 'Introduction to Programming' }
                ]
              },
              metadata: { changeReason: 'Title standardization' },
              version: 5
            },
            {
              id: '507f1f77bcf86cd799439104',
              timestamp: '2026-01-05T10:00:00.000Z',
              userId: '507f1f77bcf86cd799439011',
              userName: 'John Doe',
              action: 'publish',
              description: 'Published course',
              success: true,
              changes: {
                before: { status: 'draft' },
                after: { status: 'published' },
                diff: [
                  { field: 'status', old: 'draft', new: 'published' }
                ]
              },
              metadata: null,
              version: 4
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 28,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          },
          timeline: {
            created: {
              timestamp: '2026-01-01T08:00:00.000Z',
              userId: '507f1f77bcf86cd799439011',
              userName: 'John Doe'
            },
            published: {
              timestamp: '2026-01-05T10:00:00.000Z',
              userId: '507f1f77bcf86cd799439011',
              userName: 'John Doe'
            },
            lastModified: {
              timestamp: '2026-01-08T14:30:00.000Z',
              userId: '507f1f77bcf86cd799439011',
              userName: 'John Doe'
            },
            archived: null
          },
          statistics: {
            totalChanges: 28,
            uniqueContributors: 3,
            versions: 5,
            lastActivity: '2026-01-08T14:30:00.000Z'
          }
        }
      }
    },

    permissions: ['read:audit-logs'],

    notes: `
      - Provides complete lifecycle history of an entity
      - Timeline shows key milestones (created, published, archived)
      - Version tracking for entities that support versioning
      - includeRelated=true includes actions on child/related entities
      - Useful for compliance audits and dispute resolution
      - Changes diff shows what was modified in each action
      - Department-scoped: staff see history for entities in their departments
    `
  },

  /**
   * Export Audit Logs
   * GET /api/v2/audit-logs/export
   */
  export: {
    endpoint: '/api/v2/audit-logs/export',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Export audit logs in various formats for compliance reporting',

    request: {
      headers: {
        'Authorization': {
          type: 'string',
          required: true,
          description: 'Bearer token'
        }
      },
      query: {
        format: {
          type: 'string',
          required: false,
          default: 'json',
          enum: ['json', 'csv', 'xlsx', 'pdf'],
          description: 'Export format'
        },
        userId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by user'
        },
        action: {
          type: 'string',
          required: false,
          description: 'Filter by action type'
        },
        entityType: {
          type: 'string',
          required: false,
          description: 'Filter by entity type'
        },
        entityId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific entity'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        },
        startDate: {
          type: 'Date',
          required: true,
          description: 'Export logs from this date (required for exports)'
        },
        endDate: {
          type: 'Date',
          required: true,
          description: 'Export logs until this date (required for exports)'
        },
        includeDetails: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include full request/response details'
        },
        includeChanges: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include before/after changes'
        },
        maxRecords: {
          type: 'number',
          required: false,
          default: 10000,
          max: 50000,
          description: 'Maximum records to export'
        }
      }
    },

    response: {
      success: {
        status: 200,
        headers: {
          'Content-Type': 'string',
          'Content-Disposition': 'string'
        },
        body: 'File download stream'
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to export audit logs' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid export parameters' },
        { status: 400, code: 'DATE_RANGE_REQUIRED', message: 'Start and end dates required for exports' },
        { status: 400, code: 'DATE_RANGE_TOO_LARGE', message: 'Date range exceeds maximum allowed (365 days)' },
        { status: 413, code: 'TOO_MANY_RECORDS', message: 'Export would exceed maximum record limit' }
      ]
    },

    example: {
      request: {
        query: {
          format: 'csv',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-31T23:59:59Z',
          departmentId: '507f1f77bcf86cd799439012',
          includeDetails: false,
          includeChanges: true
        }
      },
      response: {
        success: true,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs-2026-01-01-to-2026-01-31.csv"'
        },
        body: 'CSV file stream with audit log data'
      }
    },

    permissions: ['read:audit-logs', 'export:audit-logs'],

    notes: `
      - Requires both start and end dates for all exports
      - Maximum date range: 365 days per export
      - Maximum records: 50,000 per export (configurable)
      - Large exports processed asynchronously (returns job ID if >10k records)
      - CSV format recommended for spreadsheet analysis
      - JSON format preserves full data structure
      - PDF format includes summary and formatted tables
      - XLSX format supports multiple sheets for different entity types
      - Sensitive data redacted even in exports
      - Export activity itself logged in audit trail
      - Department-scoped: staff can only export logs from their departments
      - Global admins can export all logs
      - Compliance preset filters available: FERPA, GDPR, SOC2
    `
  }
};

// Type exports for consumers
export type AuditLogsContractType = typeof AuditLogsContract;
export type AuditLogEntry = typeof AuditLogsContract.list.example.response.data.logs[0];
export type AuditLogListRequest = typeof AuditLogsContract.list.request.query;
export type AuditLogListResponse = typeof AuditLogsContract.list.example.response;
export type UserActivityResponse = typeof AuditLogsContract.getUserActivity.example.response;
export type EntityHistoryResponse = typeof AuditLogsContract.getEntityHistory.example.response;
