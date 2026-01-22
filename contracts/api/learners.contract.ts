/**
 * Learners API Contracts
 * Version: 1.0.0
 *
 * These contracts define the learner user management endpoints for the LMS API.
 * Both backend and UI teams use these as the source of truth.
 *
 * Phase 1: Core Identity & Organization (Critical Path)
 * Resource: /users/learners
 */

export const LearnersContract = {
  /**
   * List Learners
   */
  list: {
    endpoint: '/api/v2/users/learners',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all learners with filtering and pagination',

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
        search: {
          type: 'string',
          required: false,
          description: 'Search by firstName, lastName, email, or studentId'
        },
        program: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by program enrollment'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'withdrawn', 'completed', 'suspended'],
          description: 'Filter by learner status'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department association'
        },
        includeSubdepartments: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'When true, includes learners from all subdepartments of the specified department. Only applicable when department filter is provided.'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
          description: 'Sort field (prefix with - for desc). Examples: firstName, -createdAt, lastName'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            learners: [
              {
                id: 'ObjectId',
                email: 'string',
                firstName: 'string',
                lastName: 'string',
                studentId: 'string | null',
                status: 'active|withdrawn|completed|suspended',
                department: {
                  id: 'ObjectId',
                  name: 'string'
                },
                programEnrollments: 'number',
                courseEnrollments: 'number',
                completionRate: 'number',
                lastLogin: 'Date | null',
                createdAt: 'Date',
                updatedAt: 'Date'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view learners' }
      ]
    },

    example: {
      request: {
        query: {
          page: 1,
          limit: 10,
          search: 'john',
          status: 'active',
          sort: 'lastName'
        }
      },
      response: {
        success: true,
        data: {
          learners: [
            {
              id: '507f1f77bcf86cd799439011',
              email: 'john.doe@example.com',
              firstName: 'John',
              lastName: 'Doe',
              studentId: 'STU-2026-001',
              status: 'active',
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science'
              },
              programEnrollments: 2,
              courseEnrollments: 8,
              completionRate: 0.75,
              lastLogin: '2026-01-08T10:30:00.000Z',
              createdAt: '2025-09-01T00:00:00.000Z',
              updatedAt: '2026-01-08T10:30:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439013',
              email: 'john.smith@example.com',
              firstName: 'John',
              lastName: 'Smith',
              studentId: 'STU-2026-002',
              status: 'active',
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science'
              },
              programEnrollments: 1,
              courseEnrollments: 5,
              completionRate: 0.60,
              lastLogin: '2026-01-07T15:20:00.000Z',
              createdAt: '2025-10-15T00:00:00.000Z',
              updatedAt: '2026-01-07T15:20:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:learners', 'admin', 'staff'],

    notes: `
      - Requires staff or admin permissions
      - Search performs case-insensitive partial match on firstName, lastName, email, and studentId
      - Status filter:
        - 'active': Currently enrolled and active
        - 'withdrawn': Withdrawn from all programs
        - 'completed': Completed all enrolled programs
        - 'suspended': Account suspended by admin
      - Department filter includes learners enrolled in programs under that department
      - includeSubdepartments: When true, includes learners from the entire department hierarchy
      - completionRate calculated as completed courses / total enrolled courses
      - Returns empty array if no learners match filters
      - Pagination uses 1-based indexing
      - Department filtering uses optimized aggregation pipeline for improved performance
    `
  },

  /**
   * Register Learner
   */
  register: {
    endpoint: '/api/v2/users/learners',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Register a new learner account',

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
          description: 'Unique email address for learner'
        },
        password: {
          type: 'string',
          required: true,
          minLength: 8,
          description: 'Password (min 8 characters)'
        },
        firstName: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100,
          description: 'Learner first name'
        },
        lastName: {
          type: 'string',
          required: true,
          minLength: 1,
          maxLength: 100,
          description: 'Learner last name'
        },
        studentId: {
          type: 'string',
          required: false,
          minLength: 3,
          maxLength: 50,
          pattern: '^[A-Z0-9-]+$',
          description: 'Optional student ID (alphanumeric with hyphens)'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Primary department association'
        },
        phone: {
          type: 'string',
          required: false,
          description: 'Contact phone number'
        },
        dateOfBirth: {
          type: 'Date',
          required: false,
          description: 'Date of birth'
        },
        address: {
          street: { type: 'string', required: false },
          city: { type: 'string', required: false },
          state: { type: 'string', required: false },
          zipCode: { type: 'string', required: false },
          country: { type: 'string', required: false }
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
            learner: {
              id: 'ObjectId',
              email: 'string',
              firstName: 'string',
              lastName: 'string',
              studentId: 'string | null',
              role: 'learner',
              status: 'active',
              department: {
                id: 'ObjectId',
                name: 'string'
              },
              phone: 'string | null',
              dateOfBirth: 'Date | null',
              address: 'object | null',
              createdAt: 'Date',
              updatedAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to register learners' },
        { status: 409, code: 'EMAIL_EXISTS', message: 'Email already registered' },
        { status: 409, code: 'STUDENT_ID_EXISTS', message: 'Student ID already in use' }
      ]
    },

    example: {
      request: {
        email: 'jane.doe@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Doe',
        studentId: 'STU-2026-100',
        department: '507f1f77bcf86cd799439012',
        phone: '+1-555-0100',
        dateOfBirth: '2000-05-15',
        address: {
          street: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
          country: 'USA'
        }
      },
      response: {
        success: true,
        message: 'Learner registered successfully',
        data: {
          learner: {
            id: '507f1f77bcf86cd799439020',
            email: 'jane.doe@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            studentId: 'STU-2026-100',
            role: 'learner',
            status: 'active',
            department: {
              id: '507f1f77bcf86cd799439012',
              name: 'Computer Science'
            },
            phone: '+1-555-0100',
            dateOfBirth: '2000-05-15T00:00:00.000Z',
            address: {
              street: '123 Main St',
              city: 'Springfield',
              state: 'IL',
              zipCode: '62701',
              country: 'USA'
            },
            createdAt: '2026-01-08T12:00:00.000Z',
            updatedAt: '2026-01-08T12:00:00.000Z'
          }
        }
      }
    },

    permissions: ['write:learners', 'admin', 'staff'],

    notes: `
      - Requires staff or admin permissions
      - Email must be unique across all users (learners, staff, admins)
      - StudentId must be unique if provided (case-insensitive check)
      - Password requirements:
        - Minimum 8 characters
        - Should include mix of uppercase, lowercase, numbers, special chars (enforced by UI)
      - Password is hashed using bcrypt before storage
      - Default status is 'active'
      - Default role is 'learner' (cannot be changed via this endpoint)
      - Department must exist if provided
      - StudentId validation: uppercase letters, numbers, hyphens only
      - Welcome email sent to learner upon registration
      - Audit log entry created for registration
    `
  },

  /**
   * Get Learner Details
   */
  getById: {
    endpoint: '/api/v2/users/learners/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed learner profile by ID',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
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
            email: 'string',
            firstName: 'string',
            lastName: 'string',
            studentId: 'string | null',
            role: 'learner',
            status: 'active|withdrawn|completed|suspended',
            department: {
              id: 'ObjectId',
              name: 'string',
              code: 'string'
            },
            phone: 'string | null',
            dateOfBirth: 'Date | null',
            address: {
              street: 'string',
              city: 'string',
              state: 'string',
              zipCode: 'string',
              country: 'string'
            },
            enrollments: {
              programs: [
                {
                  id: 'ObjectId',
                  programId: 'ObjectId',
                  programName: 'string',
                  enrolledAt: 'Date',
                  status: 'active|completed|withdrawn',
                  progress: 'number'
                }
              ],
              courses: [
                {
                  id: 'ObjectId',
                  courseId: 'ObjectId',
                  courseName: 'string',
                  enrolledAt: 'Date',
                  status: 'active|completed|withdrawn',
                  progress: 'number',
                  score: 'number | null'
                }
              ]
            },
            statistics: {
              totalProgramEnrollments: 'number',
              totalCourseEnrollments: 'number',
              completedCourses: 'number',
              inProgressCourses: 'number',
              completionRate: 'number',
              averageScore: 'number',
              totalTimeSpent: 'number',
              lastActivityAt: 'Date | null'
            },
            lastLogin: 'Date | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view learner details' },
        { status: 404, code: 'NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {},
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439020',
          email: 'jane.doe@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          studentId: 'STU-2026-100',
          role: 'learner',
          status: 'active',
          department: {
            id: '507f1f77bcf86cd799439012',
            name: 'Computer Science',
            code: 'CS'
          },
          phone: '+1-555-0100',
          dateOfBirth: '2000-05-15T00:00:00.000Z',
          address: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62701',
            country: 'USA'
          },
          enrollments: {
            programs: [
              {
                id: '507f1f77bcf86cd799439030',
                programId: '507f1f77bcf86cd799439031',
                programName: 'Computer-Based Training Certificate',
                enrolledAt: '2025-09-01T00:00:00.000Z',
                status: 'active',
                progress: 0.65
              }
            ],
            courses: [
              {
                id: '507f1f77bcf86cd799439040',
                courseId: '507f1f77bcf86cd799439041',
                courseName: 'Introduction to Programming',
                enrolledAt: '2025-09-01T00:00:00.000Z',
                status: 'completed',
                progress: 1.0,
                score: 92
              },
              {
                id: '507f1f77bcf86cd799439042',
                courseId: '507f1f77bcf86cd799439043',
                courseName: 'Data Structures',
                enrolledAt: '2025-10-01T00:00:00.000Z',
                status: 'active',
                progress: 0.45,
                score: 78
              }
            ]
          },
          statistics: {
            totalProgramEnrollments: 1,
            totalCourseEnrollments: 5,
            completedCourses: 2,
            inProgressCourses: 3,
            completionRate: 0.40,
            averageScore: 85,
            totalTimeSpent: 72000,
            lastActivityAt: '2026-01-08T10:30:00.000Z'
          },
          lastLogin: '2026-01-08T10:30:00.000Z',
          createdAt: '2026-01-08T12:00:00.000Z',
          updatedAt: '2026-01-08T12:00:00.000Z'
        }
      }
    },

    permissions: ['read:learners', 'admin', 'staff'],

    notes: `
      - Requires staff or admin permissions
      - Returns comprehensive learner profile including enrollments and statistics
      - Enrollment progress is 0-1 decimal (0 = not started, 1 = completed)
      - Statistics calculated in real-time from enrollment and attempt data
      - totalTimeSpent is in seconds
      - lastActivityAt is the most recent content interaction timestamp
      - Address may be null if not provided during registration
      - Suspended learners have limited access but profile remains accessible to staff
    `
  },

  /**
   * Update Learner
   */
  update: {
    endpoint: '/api/v2/users/learners/:id',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update learner profile information',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        }
      },
      body: {
        email: {
          type: 'string',
          required: false,
          format: 'email',
          description: 'Updated email address'
        },
        firstName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'Updated first name'
        },
        lastName: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 100,
          description: 'Updated last name'
        },
        studentId: {
          type: 'string',
          required: false,
          minLength: 3,
          maxLength: 50,
          pattern: '^[A-Z0-9-]+$',
          description: 'Updated student ID'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Updated department association'
        },
        phone: {
          type: 'string',
          required: false,
          description: 'Updated phone number'
        },
        dateOfBirth: {
          type: 'Date',
          required: false,
          description: 'Updated date of birth'
        },
        address: {
          street: { type: 'string', required: false },
          city: { type: 'string', required: false },
          state: { type: 'string', required: false },
          zipCode: { type: 'string', required: false },
          country: { type: 'string', required: false }
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'suspended'],
          description: 'Updated account status (admin only)'
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
            learner: {
              id: 'ObjectId',
              email: 'string',
              firstName: 'string',
              lastName: 'string',
              studentId: 'string | null',
              role: 'learner',
              status: 'string',
              department: {
                id: 'ObjectId',
                name: 'string'
              },
              phone: 'string | null',
              dateOfBirth: 'Date | null',
              address: 'object | null',
              updatedAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update learner' },
        { status: 404, code: 'NOT_FOUND', message: 'Learner not found' },
        { status: 409, code: 'EMAIL_EXISTS', message: 'Email already in use by another user' },
        { status: 409, code: 'STUDENT_ID_EXISTS', message: 'Student ID already in use by another learner' }
      ]
    },

    example: {
      request: {
        email: 'jane.updated@example.com',
        phone: '+1-555-0200',
        address: {
          street: '456 Oak Ave',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62702',
          country: 'USA'
        }
      },
      response: {
        success: true,
        message: 'Learner profile updated successfully',
        data: {
          learner: {
            id: '507f1f77bcf86cd799439020',
            email: 'jane.updated@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
            studentId: 'STU-2026-100',
            role: 'learner',
            status: 'active',
            department: {
              id: '507f1f77bcf86cd799439012',
              name: 'Computer Science'
            },
            phone: '+1-555-0200',
            dateOfBirth: '2000-05-15T00:00:00.000Z',
            address: {
              street: '456 Oak Ave',
              city: 'Springfield',
              state: 'IL',
              zipCode: '62702',
              country: 'USA'
            },
            updatedAt: '2026-01-08T14:30:00.000Z'
          }
        }
      }
    },

    permissions: ['write:learners', 'admin', 'staff'],

    notes: `
      - Requires staff or admin permissions
      - All fields are optional (partial update supported)
      - Email must be unique if updated
      - StudentId must be unique if updated
      - Cannot change role via this endpoint
      - Status can only be changed to 'active' or 'suspended' by admin
        - 'withdrawn' and 'completed' are set by system via enrollment lifecycle
      - Department must exist if provided
      - Changing email sends confirmation to both old and new addresses
      - Address is merged with existing data (partial updates supported)
      - Audit log entry created for profile changes
      - updatedAt timestamp is automatically updated
    `
  },

  /**
   * Soft Delete Learner
   */
  delete: {
    endpoint: '/api/v2/users/learners/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Soft delete learner account (sets status to withdrawn)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        }
      },
      query: {
        reason: {
          type: 'string',
          required: false,
          description: 'Optional reason for deletion'
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
            id: 'ObjectId',
            status: 'withdrawn',
            deletedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete learner' },
        { status: 404, code: 'NOT_FOUND', message: 'Learner not found' },
        { status: 409, code: 'ALREADY_DELETED', message: 'Learner already withdrawn' }
      ]
    },

    example: {
      request: {
        query: {
          reason: 'Student transferred to another institution'
        }
      },
      response: {
        success: true,
        message: 'Learner account withdrawn successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'withdrawn',
          deletedAt: '2026-01-08T15:00:00.000Z'
        }
      }
    },

    permissions: ['delete:learners', 'admin'],

    notes: `
      - Requires admin permissions only (staff cannot delete learners)
      - Soft delete: sets status to 'withdrawn' instead of removing record
      - Behavior:
        - Sets learner.status = 'withdrawn'
        - Sets learner.deletedAt timestamp
        - Withdraws all active program enrollments
        - Withdraws all active course enrollments
        - Preserves historical enrollment and progress data
        - Disables login access
        - Emails learner about account withdrawal
      - Reason is logged in audit trail if provided
      - Learner data remains in database for reporting/compliance
      - Cannot be undone via API (requires direct database intervention)
      - Consider suspending instead if temporary deactivation needed
      - Data retention follows institutional policies
    `
  }
};

// Type exports for consumers
export type LearnersContractType = typeof LearnersContract;
export type ListLearnersRequest = typeof LearnersContract.list.example.request;
export type ListLearnersResponse = typeof LearnersContract.list.example.response;
export type RegisterLearnerRequest = typeof LearnersContract.register.example.request;
export type RegisterLearnerResponse = typeof LearnersContract.register.example.response;
export type GetLearnerResponse = typeof LearnersContract.getById.example.response;
export type UpdateLearnerRequest = typeof LearnersContract.update.example.request;
export type UpdateLearnerResponse = typeof LearnersContract.update.example.response;
export type DeleteLearnerResponse = typeof LearnersContract.delete.example.response;
