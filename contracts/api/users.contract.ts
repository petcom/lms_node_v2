/**
 * Users API Contracts
 * Version: 2.0.0 (BREAKING CHANGES)
 *
 * Phase 1: Core Identity & Organization (Critical Path)
 *
 * These contracts define unified user management endpoints for the LMS API.
 * Provides role-agnostic /users/me endpoints that return appropriate data
 * based on authenticated user's role (global-admin, staff, learner).
 *
 * Both backend and UI teams use these as the source of truth.
 *
 * ⚠️  BREAKING CHANGES in v2.0.0 ⚠️
 * ------------------------------------
 * The person data structure has been refactored from flat fields to a
 * three-layer architecture:
 * 1. IPerson (Basic) - Core contact & identity (GET /users/me/person)
 * 2. IPersonExtended - Role-specific data (GET /users/me/person/extended)
 * 3. IDemographics - Compliance data (GET /users/me/demographics)
 *
 * MIGRATION GUIDE:
 * - OLD: response.data.firstName → NEW: response.data.person.firstName
 * - OLD: response.data.lastName → NEW: response.data.person.lastName
 * - OLD: response.data.phone → NEW: response.data.person.phones[0].number (or use getPrimaryPhone)
 * - OLD: response.data.profileImage → NEW: response.data.person.avatar
 *
 * NEW ENDPOINTS:
 * - GET /api/v2/users/me/person - Get basic person data
 * - PUT /api/v2/users/me/person - Update basic person data
 * - GET /api/v2/users/me/person/extended - Get extended person data (role-specific)
 * - PUT /api/v2/users/me/person/extended - Update extended person data
 * - GET /api/v2/users/me/demographics - Get demographics data
 * - PUT /api/v2/users/me/demographics - Update demographics data
 *
 * See: contracts/api/person.contract.ts
 * See: contracts/api/demographics.contract.ts
 */

export const UsersContract = {
  /**
   * GET /users/me - Get Current User Profile
   *
   * Unified endpoint that returns user profile for any authenticated user.
   * Response shape adapts based on user role:
   * - global-admin: Full admin permissions
   * - staff: Department assignments, content permissions
   * - learner: Enrollment information
   */
  me: {
    endpoint: '/api/v2/users/me',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get current authenticated user profile (unified for all roles)',

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
            id: 'string',
            email: 'string',
            role: 'global-admin | staff | learner',
            status: 'active | inactive | withdrawn',
            isActive: 'boolean',

            // ⚠️  BREAKING CHANGE: Person data now nested ⚠️
            // OLD: firstName, lastName, phone, profileImage (removed)
            // NEW: person object (IPerson)
            person: {
              firstName: 'string',
              lastName: 'string',
              middleName: 'string | null',
              preferredFirstName: 'string | null',
              preferredLastName: 'string | null',
              pronouns: 'string | null',
              emails: '[{ email, type, isPrimary, verified }]',
              phones: '[{ number, type, isPrimary, verified }]',
              addresses: '[{ street1, city, state, postalCode, country }]',
              avatar: 'string | null',
              bio: 'string | null',
              timezone: 'string',
              languagePreference: 'string'
              // ... see GET /users/me/person for full structure
            },

            // Staff-only fields (present when role === 'staff')
            departments: 'ObjectId[] | undefined',
            permissions: 'string[] | undefined',
            departmentRoles: '[{ departmentId: ObjectId, role: string }] | undefined',

            // Learner-only fields (present when role === 'learner')
            studentId: 'string | undefined',
            programEnrollments: 'ObjectId[] | undefined',
            courseEnrollments: 'ObjectId[] | undefined',

            // Metadata
            createdAt: 'Date',
            lastLoginAt: 'Date | null',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'USER_NOT_FOUND', message: 'User account not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'john.instructor@example.com',
          role: 'staff',
          status: 'active',
          isActive: true,
          // ⚠️ BREAKING CHANGE: Person data now nested
          person: {
            firstName: 'John',
            lastName: 'Doe',
            middleName: null,
            preferredFirstName: null,
            preferredLastName: null,
            pronouns: 'he/him',
            emails: [
              {
                email: 'john.instructor@example.com',
                type: 'institutional',
                isPrimary: true,
                verified: true,
                allowNotifications: true
              }
            ],
            phones: [
              {
                number: '+1-555-0123',
                type: 'mobile',
                isPrimary: true,
                verified: true,
                allowSMS: true
              }
            ],
            addresses: [],
            avatar: 'https://cdn.example.com/profiles/john.jpg',
            bio: 'Computer Science instructor',
            timezone: 'America/New_York',
            languagePreference: 'en'
          },
          departments: ['507f1f77bcf86cd799439012'],
          permissions: ['content:read', 'content:write', 'courses:manage', 'learners:view'],
          departmentRoles: [
            { departmentId: '507f1f77bcf86cd799439012', role: 'instructor' }
          ],
          createdAt: '2025-01-01T00:00:00.000Z',
          lastLoginAt: '2026-01-08T10:30:00.000Z',
          updatedAt: '2026-01-08T10:30:00.000Z'
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      ⚠️ BREAKING CHANGES in v2.0.0 ⚠️
      - Person data now nested in person object (was flat)
      - Migration required for UI:
        * data.firstName → data.person.firstName
        * data.lastName → data.person.lastName
        * data.phone → data.person.phones[0].number
        * data.profileImage → data.person.avatar
      - New fields available:
        * pronouns, preferredFirstName, preferredLastName
        * Multiple emails, phones, addresses (array)
        * timezone, languagePreference (required)
        * Communication preferences, legal consent

      - Returns unified user profile regardless of role (global-admin, staff, learner)
      - Role-specific fields included based on user type:
        * Staff: departments, permissions, departmentRoles
        * Learner: studentId, programEnrollments, courseEnrollments
      - Always requires valid authentication token
      - Token user ID must match requested profile (enforced by /me endpoint)

      - For detailed person data, use new endpoints:
        * GET /users/me/person - Full IPerson (Basic) data
        * GET /users/me/person/extended - IPersonExtended (role-specific)
        * GET /users/me/demographics - IDemographics (compliance)

      - Frontend should use this as primary profile endpoint instead of legacy:
        * /staff/profile (deprecated)
        * /learners/profile (deprecated)
        * /staff/admins/profile (deprecated)
    `
  },

  /**
   * PUT /users/me - Update Current User Profile
   *
   * Allows authenticated users to update their own profile information.
   * Users can only modify specific fields (not role, permissions, or department assignments).
   */
  updateMe: {
    endpoint: '/api/v2/users/me',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update current authenticated user profile',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        firstName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'User first name'
        },
        lastName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'User last name'
        },
        phone: {
          type: 'string',
          required: false,
          pattern: '^\\+?[1-9]\\d{1,14}$',
          description: 'Phone number in E.164 format (e.g., +1-555-0123)'
        },
        profileImage: {
          type: 'string',
          required: false,
          format: 'url',
          description: 'URL to profile image (or null to remove)'
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
            /* Same structure as GET /users/me */
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data', errors: '[{ field, message }]' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 404, code: 'USER_NOT_FOUND', message: 'User account not found' }
      ]
    },

    example: {
      request: {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1-555-9876',
        profileImage: 'https://cdn.example.com/profiles/jane-new.jpg'
      },
      response: {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: '507f1f77bcf86cd799439011',
          email: 'john.instructor@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'staff',
          status: 'active',
          isActive: true,
          departments: ['507f1f77bcf86cd799439012'],
          permissions: ['content:read', 'content:write', 'courses:manage'],
          departmentRoles: [
            { departmentId: '507f1f77bcf86cd799439012', role: 'instructor' }
          ],
          profileImage: 'https://cdn.example.com/profiles/jane-new.jpg',
          phone: '+1-555-9876',
          createdAt: '2025-01-01T00:00:00.000Z',
          lastLoginAt: '2026-01-08T10:30:00.000Z',
          updatedAt: '2026-01-08T11:15:00.000Z'
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Users can only update their own profile (enforced by /me endpoint)
      - Email and role cannot be changed via this endpoint (admin-only operations)
      - Department assignments can only be changed by admins
      - Validation rules:
        * firstName/lastName: 1-100 characters, required if provided
        * phone: E.164 format (+1-555-0123), optional
        * profileImage: valid URL or null to remove image
      - Partial updates supported (only send fields to change)
      - Returns complete updated profile on success
      - Frontend should replace legacy endpoints:
        * PUT /staff/:id/update (deprecated)
        * PUT /learners/:id/update (deprecated)
    `
  },

  /**
   * GET /users/me/departments - Get My Department Assignments
   *
   * Returns full department details for all departments the current user is assigned to.
   * Staff-only endpoint.
   */
  myDepartments: {
    endpoint: '/api/v2/users/me/departments',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get departments assigned to current user (staff only)',

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
            departments: [
              {
                id: 'string',
                name: 'string',
                code: 'string',
                description: 'string | null',
                parentDepartment: 'ObjectId | null',
                userRole: 'string',
                assignedAt: 'Date',
                permissions: 'string[]',
                isActive: 'boolean',
                stats: {
                  totalPrograms: 'number',
                  totalCourses: 'number',
                  activeEnrollments: 'number'
                }
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Only staff users can access this endpoint' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          departments: [
            {
              id: '507f1f77bcf86cd799439012',
              name: 'Computer Science',
              code: 'CS',
              description: 'Computer Science and Software Engineering',
              parentDepartment: null,
              userRole: 'instructor',
              assignedAt: '2025-01-15T00:00:00.000Z',
              permissions: ['content:read', 'content:write', 'courses:manage', 'learners:view'],
              isActive: true,
              stats: {
                totalPrograms: 3,
                totalCourses: 45,
                activeEnrollments: 234
              }
            },
            {
              id: '507f1f77bcf86cd799439013',
              name: 'Mathematics',
              code: 'MATH',
              description: 'Applied and Pure Mathematics',
              parentDepartment: null,
              userRole: 'content-creator',
              assignedAt: '2025-06-01T00:00:00.000Z',
              permissions: ['content:read', 'content:write'],
              isActive: true,
              stats: {
                totalPrograms: 2,
                totalCourses: 28,
                activeEnrollments: 156
              }
            }
          ]
        }
      }
    },

    permissions: ['authenticated', 'role:staff'],

    notes: `
      - Staff-only endpoint (returns 403 for learners)
      - Returns full department details with user's specific role and permissions
      - Includes department statistics (programs, courses, enrollments)
      - userRole indicates the staff member's role within that department:
        * instructor: Can manage courses and view learners
        * content-creator: Can create/edit content
        * department-admin: Full department management
      - Permissions array shows granted permissions for that department
      - Stats provide quick overview of department activity
      - Use this instead of parsing departments array from /users/me
    `
  },

  /**
   * GET /users/me/courses - Get My Assigned Courses (Instructor)
   *
   * Returns all courses where the current user is assigned as an instructor.
   * Staff-only endpoint.
   */
  myCourses: {
    endpoint: '/api/v2/users/me/courses',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get courses assigned to current user as instructor (staff only)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        status: {
          type: 'string',
          required: false,
          enum: ['draft', 'published', 'archived'],
          description: 'Filter by course status'
        },
        departmentId: {
          type: 'string',
          required: false,
          description: 'Filter by department'
        },
        includeStats: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include enrollment and progress statistics'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            courses: [
              {
                id: 'string',
                title: 'string',
                code: 'string',
                description: 'string | null',
                status: 'draft | published | archived',
                role: 'primary | secondary',
                department: {
                  id: 'string',
                  name: 'string',
                  code: 'string'
                },
                program: {
                  id: 'string',
                  name: 'string'
                },
                level: {
                  id: 'string',
                  name: 'string'
                },
                assignedAt: 'Date',
                stats: {
                  activeEnrollments: 'number',
                  totalModules: 'number',
                  completionRate: 'number',
                  averageProgress: 'number'
                },
                createdAt: 'Date',
                updatedAt: 'Date'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Only staff users can access this endpoint' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          courses: [
            {
              id: '507f1f77bcf86cd799439020',
              title: 'Introduction to Programming',
              code: 'CS101',
              description: 'Fundamentals of programming using Python',
              status: 'published',
              role: 'primary',
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science',
                code: 'CS'
              },
              program: {
                id: '507f1f77bcf86cd799439015',
                name: 'Computer Science BSc'
              },
              level: {
                id: '507f1f77bcf86cd799439016',
                name: 'Year 1'
              },
              assignedAt: '2025-01-15T00:00:00.000Z',
              stats: {
                activeEnrollments: 45,
                totalModules: 8,
                completionRate: 0.68,
                averageProgress: 0.72
              },
              createdAt: '2024-08-01T00:00:00.000Z',
              updatedAt: '2026-01-05T14:30:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439021',
              title: 'Data Structures',
              code: 'CS201',
              description: 'Advanced data structures and algorithms',
              status: 'published',
              role: 'secondary',
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science',
                code: 'CS'
              },
              program: {
                id: '507f1f77bcf86cd799439015',
                name: 'Computer Science BSc'
              },
              level: {
                id: '507f1f77bcf86cd799439017',
                name: 'Year 2'
              },
              assignedAt: '2025-09-01T00:00:00.000Z',
              stats: {
                activeEnrollments: 32,
                totalModules: 12,
                completionRate: 0.56,
                averageProgress: 0.61
              },
              createdAt: '2024-08-15T00:00:00.000Z',
              updatedAt: '2026-01-07T09:15:00.000Z'
            }
          ]
        }
      }
    },

    permissions: ['authenticated', 'role:staff'],

    notes: `
      - Staff-only endpoint (returns 403 for learners)
      - Returns all courses where user is assigned as instructor
      - role field indicates instructor assignment:
        * primary: Primary/lead instructor for the course
        * secondary: Assistant/co-instructor
      - Query parameters for filtering:
        * status: Filter by course publication status
        * departmentId: Show only courses from specific department
        * includeStats: Add enrollment and progress statistics (default: false)
      - Stats included when includeStats=true:
        * activeEnrollments: Current number of enrolled learners
        * totalModules: Number of modules in course
        * completionRate: Percentage of learners who completed (0-1)
        * averageProgress: Average progress across all enrollments (0-1)
      - Use this for instructor dashboard "My Courses" view
      - Addresses missing functionality from current system
    `
  },

  /**
   * GET /users/me/enrollments - Get My Program/Course Enrollments (Learner)
   *
   * Returns all program and course enrollments for the current user.
   * Learner-focused endpoint.
   */
  myEnrollments: {
    endpoint: '/api/v2/users/me/enrollments',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get all enrollments for current user (learner)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        type: {
          type: 'string',
          required: false,
          enum: ['program', 'course'],
          description: 'Filter by enrollment type'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['enrolled', 'in_progress', 'completed', 'withdrawn'],
          description: 'Filter by enrollment status'
        },
        includeProgress: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include progress information'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            programs: [
              {
                enrollmentId: 'string',
                enrollmentType: 'program',
                program: {
                  id: 'string',
                  name: 'string',
                  code: 'string',
                  department: { id: 'string', name: 'string' }
                },
                level: {
                  id: 'string',
                  name: 'string'
                },
                credentialGoal: 'certificate | diploma | degree',
                status: 'enrolled | in_progress | completed | withdrawn',
                enrolledAt: 'Date',
                startedAt: 'Date | null',
                completedAt: 'Date | null',
                progress: {
                  completionPercent: 'number',
                  coursesCompleted: 'number',
                  coursesTotal: 'number',
                  currentCourses: 'string[]'
                }
              }
            ],
            courses: [
              {
                enrollmentId: 'string',
                enrollmentType: 'course',
                course: {
                  id: 'string',
                  title: 'string',
                  code: 'string',
                  department: { id: 'string', name: 'string' }
                },
                program: {
                  id: 'string',
                  name: 'string'
                },
                status: 'enrolled | in_progress | completed | withdrawn',
                enrolledAt: 'Date',
                startedAt: 'Date | null',
                completedAt: 'Date | null',
                progress: {
                  progressPercent: 'number',
                  modulesCompleted: 'number',
                  modulesTotal: 'number',
                  currentScore: 'number | null',
                  lastAccessedAt: 'Date | null'
                }
              }
            ]
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
          programs: [
            {
              enrollmentId: '507f1f77bcf86cd799439030',
              enrollmentType: 'program',
              program: {
                id: '507f1f77bcf86cd799439015',
                name: 'Computer Science BSc',
                code: 'CS-BSC',
                department: {
                  id: '507f1f77bcf86cd799439012',
                  name: 'Computer Science'
                }
              },
              level: {
                id: '507f1f77bcf86cd799439016',
                name: 'Year 1'
              },
              credentialGoal: 'degree',
              status: 'in_progress',
              enrolledAt: '2025-09-01T00:00:00.000Z',
              startedAt: '2025-09-05T00:00:00.000Z',
              completedAt: null,
              progress: {
                completionPercent: 0.42,
                coursesCompleted: 5,
                coursesTotal: 12,
                currentCourses: ['507f1f77bcf86cd799439020', '507f1f77bcf86cd799439021']
              }
            }
          ],
          courses: [
            {
              enrollmentId: '507f1f77bcf86cd799439031',
              enrollmentType: 'course',
              course: {
                id: '507f1f77bcf86cd799439020',
                title: 'Introduction to Programming',
                code: 'CS101',
                department: {
                  id: '507f1f77bcf86cd799439012',
                  name: 'Computer Science'
                }
              },
              program: {
                id: '507f1f77bcf86cd799439015',
                name: 'Computer Science BSc'
              },
              status: 'in_progress',
              enrolledAt: '2025-09-01T00:00:00.000Z',
              startedAt: '2025-09-05T00:00:00.000Z',
              completedAt: null,
              progress: {
                progressPercent: 0.62,
                modulesCompleted: 5,
                modulesTotal: 8,
                currentScore: 78.5,
                lastAccessedAt: '2026-01-08T09:30:00.000Z'
              }
            },
            {
              enrollmentId: '507f1f77bcf86cd799439032',
              enrollmentType: 'course',
              course: {
                id: '507f1f77bcf86cd799439022',
                title: 'Discrete Mathematics',
                code: 'MATH151',
                department: {
                  id: '507f1f77bcf86cd799439013',
                  name: 'Mathematics'
                }
              },
              program: {
                id: '507f1f77bcf86cd799439015',
                name: 'Computer Science BSc'
              },
              status: 'completed',
              enrolledAt: '2025-09-01T00:00:00.000Z',
              startedAt: '2025-09-10T00:00:00.000Z',
              completedAt: '2025-12-15T00:00:00.000Z',
              progress: {
                progressPercent: 1.0,
                modulesCompleted: 6,
                modulesTotal: 6,
                currentScore: 92.0,
                lastAccessedAt: '2025-12-15T14:30:00.000Z'
              }
            }
          ]
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Returns both program and course enrollments
      - Learners see their own enrollments (staff can also use this for their learner enrollments)
      - Query parameters for filtering:
        * type: Show only programs or courses
        * status: Filter by enrollment status
        * includeProgress: Add detailed progress info (default: true)
      - Progress information included by default:
        * Programs: Overall completion %, courses completed/total, current courses
        * Courses: Module completion %, modules completed/total, current score, last access
      - Status values:
        * enrolled: Enrolled but not yet started
        * in_progress: Actively working on content
        * completed: Successfully completed
        * withdrawn: Enrollment withdrawn/cancelled
      - Maps to current endpoints:
        * GET /program-enrollments?learner=me
        * GET /course-enrollments?learner=me
      - Use this for learner dashboard "My Learning" view
    `
  },

  /**
   * GET /users/me/progress - Get My Learning Progress Summary
   *
   * Returns comprehensive progress summary across all learning activities.
   * High-level overview for dashboard.
   */
  myProgress: {
    endpoint: '/api/v2/users/me/progress',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get comprehensive progress summary for current user',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        timeframe: {
          type: 'string',
          required: false,
          enum: ['week', 'month', 'quarter', 'year', 'all'],
          default: 'all',
          description: 'Time period for activity statistics'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            overview: {
              totalEnrollments: 'number',
              activeEnrollments: 'number',
              completedCourses: 'number',
              overallProgress: 'number',
              averageScore: 'number | null'
            },
            programs: {
              total: 'number',
              inProgress: 'number',
              completed: 'number',
              details: [
                {
                  programId: 'string',
                  programName: 'string',
                  progress: 'number',
                  status: 'string'
                }
              ]
            },
            courses: {
              total: 'number',
              inProgress: 'number',
              completed: 'number',
              notStarted: 'number'
            },
            recentActivity: [
              {
                activityType: 'completion | attempt | enrollment | assessment',
                contentId: 'string',
                contentTitle: 'string',
                contentType: 'course | module | assessment',
                timestamp: 'Date',
                score: 'number | null',
                status: 'string'
              }
            ],
            stats: {
              totalTimeSpent: 'number',
              totalAttempts: 'number',
              assessmentsPassed: 'number',
              currentStreak: 'number',
              lastActivityAt: 'Date | null'
            }
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
          overview: {
            totalEnrollments: 8,
            activeEnrollments: 3,
            completedCourses: 5,
            overallProgress: 0.68,
            averageScore: 82.5
          },
          programs: {
            total: 1,
            inProgress: 1,
            completed: 0,
            details: [
              {
                programId: '507f1f77bcf86cd799439015',
                programName: 'Computer Science BSc',
                progress: 0.42,
                status: 'in_progress'
              }
            ]
          },
          courses: {
            total: 8,
            inProgress: 3,
            completed: 5,
            notStarted: 0
          },
          recentActivity: [
            {
              activityType: 'completion',
              contentId: '507f1f77bcf86cd799439040',
              contentTitle: 'Module 5: Advanced Functions',
              contentType: 'module',
              timestamp: '2026-01-08T09:30:00.000Z',
              score: 85,
              status: 'completed'
            },
            {
              activityType: 'assessment',
              contentId: '507f1f77bcf86cd799439041',
              contentTitle: 'Midterm Exam - Programming Fundamentals',
              contentType: 'assessment',
              timestamp: '2026-01-07T14:00:00.000Z',
              score: 78,
              status: 'passed'
            },
            {
              activityType: 'attempt',
              contentId: '507f1f77bcf86cd799439042',
              contentTitle: 'Module 6: Data Structures',
              contentType: 'module',
              timestamp: '2026-01-07T10:15:00.000Z',
              score: null,
              status: 'in_progress'
            }
          ],
          stats: {
            totalTimeSpent: 86400,
            totalAttempts: 45,
            assessmentsPassed: 12,
            currentStreak: 5,
            lastActivityAt: '2026-01-08T09:30:00.000Z'
          }
        }
      }
    },

    permissions: ['authenticated'],

    notes: `
      - Comprehensive dashboard summary for learner's progress
      - Overview provides high-level metrics:
        * totalEnrollments: All program + course enrollments
        * activeEnrollments: Currently in-progress enrollments
        * completedCourses: Successfully completed courses
        * overallProgress: Weighted average progress (0-1)
        * averageScore: Average score across all completed assessments
      - Programs section shows program-level progress
      - Courses section breaks down course enrollment statuses
      - recentActivity shows last 10 learning activities (configurable via timeframe)
      - Stats include:
        * totalTimeSpent: Total seconds spent in learning activities
        * totalAttempts: Number of content attempts
        * assessmentsPassed: Successfully passed assessments
        * currentStreak: Consecutive days with activity
        * lastActivityAt: Most recent learning activity timestamp
      - Query parameter timeframe filters recentActivity:
        * week: Last 7 days
        * month: Last 30 days
        * quarter: Last 90 days
        * year: Last 365 days
        * all: All time (default)
      - Maps to current endpoint:
        * GET /content/reports/learner/:id
      - Use this for learner dashboard main view
      - Staff can use this to view their own learning progress if they have learner enrollments
    `
  }
};

// Type exports for consumers
export type UsersContractType = typeof UsersContract;
export type UserMeResponse = typeof UsersContract.me.example.response;
export type UserUpdateMeRequest = typeof UsersContract.updateMe.example.request;
export type UserDepartmentsResponse = typeof UsersContract.myDepartments.example.response;
export type UserCoursesResponse = typeof UsersContract.myCourses.example.response;
export type UserEnrollmentsResponse = typeof UsersContract.myEnrollments.example.response;
export type UserProgressResponse = typeof UsersContract.myProgress.example.response;
