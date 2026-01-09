/**
 * Enrollments API Contracts
 * Version: 1.0.0
 *
 * These contracts define enrollment management endpoints for the LMS API.
 * Handles program, course, and class enrollments with status tracking and progress.
 * Both backend and UI teams use these as the source of truth.
 */

export const EnrollmentsContract = {
  /**
   * List All Enrollments
   */
  list: {
    endpoint: '/api/v2/enrollments',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all enrollments with comprehensive filtering',

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
          description: 'Number of results per page'
        },
        learner: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by learner ID'
        },
        program: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by program ID'
        },
        course: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by course ID'
        },
        class: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by class ID'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'completed', 'withdrawn', 'suspended', 'expired'],
          description: 'Filter by enrollment status'
        },
        type: {
          type: 'string',
          required: false,
          enum: ['program', 'course', 'class'],
          description: 'Filter by enrollment type'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department ID (staff only)'
        },
        enrolledAfter: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments after this date'
        },
        enrolledBefore: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments before this date'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-enrolledAt',
          description: 'Sort field (prefix with - for descending)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            enrollments: [
              {
                id: 'ObjectId',
                type: 'program | course | class',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string'
                },
                target: {
                  id: 'ObjectId',
                  name: 'string',
                  code: 'string',
                  type: 'program | course | class'
                },
                status: 'active | completed | withdrawn | suspended | expired',
                enrolledAt: 'Date',
                completedAt: 'Date | null',
                withdrawnAt: 'Date | null',
                expiresAt: 'Date | null',
                progress: {
                  percentage: 'number',
                  completedItems: 'number',
                  totalItems: 'number'
                },
                grade: {
                  score: 'number | null',
                  letter: 'string | null',
                  passed: 'boolean | null'
                },
                department: {
                  id: 'ObjectId',
                  name: 'string'
                },
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
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid query parameters' }
      ]
    },

    example: {
      request: {
        query: {
          learner: '507f1f77bcf86cd799439011',
          status: 'active',
          sort: '-enrolledAt',
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          enrollments: [
            {
              id: '507f1f77bcf86cd799439020',
              type: 'course',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              },
              target: {
                id: '507f1f77bcf86cd799439015',
                name: 'Advanced JavaScript Programming',
                code: 'CS301',
                type: 'course'
              },
              status: 'active',
              enrolledAt: '2026-01-01T00:00:00.000Z',
              completedAt: null,
              withdrawnAt: null,
              expiresAt: '2026-12-31T23:59:59.000Z',
              progress: {
                percentage: 65,
                completedItems: 13,
                totalItems: 20
              },
              grade: {
                score: 87.5,
                letter: 'B+',
                passed: null
              },
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science'
              },
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-08T10:30:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 5,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:enrollments'],

    notes: `
      - Learners only see their own enrollments
      - Staff see enrollments in their departments
      - Global admins see all enrollments
      - Progress is calculated in real-time
      - Grade includes current score even if not completed
      - Expired status set automatically based on expiresAt date
    `
  },

  /**
   * Enroll in Program
   */
  enrollProgram: {
    endpoint: '/api/v2/enrollments/program',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Enroll a learner in a program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of learner to enroll (omit for self-enrollment)'
        },
        programId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of program to enroll in'
        },
        enrolledAt: {
          type: 'Date',
          required: false,
          description: 'Enrollment date (defaults to now)'
        },
        expiresAt: {
          type: 'Date',
          required: false,
          description: 'Expiration date (optional)'
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
            enrollment: {
              id: 'ObjectId',
              type: 'program',
              learner: {
                id: 'ObjectId',
                firstName: 'string',
                lastName: 'string',
                email: 'string'
              },
              program: {
                id: 'ObjectId',
                name: 'string',
                code: 'string',
                levels: 'number',
                department: {
                  id: 'ObjectId',
                  name: 'string'
                }
              },
              status: 'active',
              enrolledAt: 'Date',
              completedAt: 'null',
              withdrawnAt: 'null',
              expiresAt: 'Date | null',
              progress: {
                percentage: 'number',
                completedItems: 'number',
                totalItems: 'number'
              },
              createdAt: 'Date',
              updatedAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid enrollment data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot enroll in this program' },
        { status: 404, code: 'NOT_FOUND', message: 'Program or learner not found' },
        { status: 409, code: 'ALREADY_ENROLLED', message: 'Learner already enrolled in this program' },
        { status: 422, code: 'PREREQUISITES_NOT_MET', message: 'Prerequisites not completed' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439011',
        programId: '507f1f77bcf86cd799439013',
        expiresAt: '2027-12-31T23:59:59.000Z'
      },
      response: {
        success: true,
        message: 'Successfully enrolled in program',
        data: {
          enrollment: {
            id: '507f1f77bcf86cd799439025',
            type: 'program',
            learner: {
              id: '507f1f77bcf86cd799439011',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com'
            },
            program: {
              id: '507f1f77bcf86cd799439013',
              name: 'Computer Science Degree',
              code: 'CS-BSCS',
              levels: 4,
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science'
              }
            },
            status: 'active',
            enrolledAt: '2026-01-08T00:00:00.000Z',
            completedAt: null,
            withdrawnAt: null,
            expiresAt: '2027-12-31T23:59:59.000Z',
            progress: {
              percentage: 0,
              completedItems: 0,
              totalItems: 40
            },
            createdAt: '2026-01-08T00:00:00.000Z',
            updatedAt: '2026-01-08T00:00:00.000Z'
          }
        }
      }
    },

    permissions: ['write:enrollments'],

    notes: `
      - Staff can enroll learners in their department
      - Learners can self-enroll if program allows public enrollment
      - Validates prerequisites before enrollment
      - Cannot enroll in archived or unpublished programs
      - Duplicate enrollments return 409 conflict
      - Program enrollment may auto-enroll in required courses
    `
  },

  /**
   * Enroll in Course
   */
  enrollCourse: {
    endpoint: '/api/v2/enrollments/course',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Enroll a learner in a course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of learner to enroll (omit for self-enrollment)'
        },
        courseId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of course to enroll in'
        },
        enrolledAt: {
          type: 'Date',
          required: false,
          description: 'Enrollment date (defaults to now)'
        },
        expiresAt: {
          type: 'Date',
          required: false,
          description: 'Expiration date (optional)'
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
            enrollment: {
              id: 'ObjectId',
              type: 'course',
              learner: {
                id: 'ObjectId',
                firstName: 'string',
                lastName: 'string',
                email: 'string'
              },
              course: {
                id: 'ObjectId',
                title: 'string',
                code: 'string',
                modules: 'number',
                department: {
                  id: 'ObjectId',
                  name: 'string'
                }
              },
              status: 'active',
              enrolledAt: 'Date',
              completedAt: 'null',
              withdrawnAt: 'null',
              expiresAt: 'Date | null',
              progress: {
                percentage: 'number',
                completedItems: 'number',
                totalItems: 'number'
              },
              createdAt: 'Date',
              updatedAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid enrollment data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot enroll in this course' },
        { status: 404, code: 'NOT_FOUND', message: 'Course or learner not found' },
        { status: 409, code: 'ALREADY_ENROLLED', message: 'Learner already enrolled in this course' },
        { status: 422, code: 'PREREQUISITES_NOT_MET', message: 'Course prerequisites not completed' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439011',
        courseId: '507f1f77bcf86cd799439015',
        expiresAt: '2026-12-31T23:59:59.000Z'
      },
      response: {
        success: true,
        message: 'Successfully enrolled in course',
        data: {
          enrollment: {
            id: '507f1f77bcf86cd799439026',
            type: 'course',
            learner: {
              id: '507f1f77bcf86cd799439011',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com'
            },
            course: {
              id: '507f1f77bcf86cd799439015',
              title: 'Advanced JavaScript Programming',
              code: 'CS301',
              modules: 12,
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science'
              }
            },
            status: 'active',
            enrolledAt: '2026-01-08T00:00:00.000Z',
            completedAt: null,
            withdrawnAt: null,
            expiresAt: '2026-12-31T23:59:59.000Z',
            progress: {
              percentage: 0,
              completedItems: 0,
              totalItems: 12
            },
            createdAt: '2026-01-08T00:00:00.000Z',
            updatedAt: '2026-01-08T00:00:00.000Z'
          }
        }
      }
    },

    permissions: ['write:enrollments'],

    notes: `
      - Staff can enroll learners in department courses
      - Learners can self-enroll if course allows public enrollment
      - Validates course prerequisites before enrollment
      - Cannot enroll in draft, archived, or unpublished courses
      - Course enrollment independent of class enrollment
      - Duplicate enrollments return 409 conflict
    `
  },

  /**
   * Enroll in Class
   */
  enrollClass: {
    endpoint: '/api/v2/enrollments/class',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Enroll a learner in a class (course instance)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of learner to enroll (omit for self-enrollment)'
        },
        classId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of class to enroll in'
        },
        enrolledAt: {
          type: 'Date',
          required: false,
          description: 'Enrollment date (defaults to now)'
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
            enrollment: {
              id: 'ObjectId',
              type: 'class',
              learner: {
                id: 'ObjectId',
                firstName: 'string',
                lastName: 'string',
                email: 'string'
              },
              class: {
                id: 'ObjectId',
                name: 'string',
                course: {
                  id: 'ObjectId',
                  title: 'string',
                  code: 'string'
                },
                instructor: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string'
                },
                schedule: {
                  startDate: 'Date',
                  endDate: 'Date',
                  capacity: 'number',
                  enrolled: 'number'
                },
                department: {
                  id: 'ObjectId',
                  name: 'string'
                }
              },
              status: 'active',
              enrolledAt: 'Date',
              completedAt: 'null',
              withdrawnAt: 'null',
              expiresAt: 'Date',
              progress: {
                percentage: 'number',
                completedItems: 'number',
                totalItems: 'number'
              },
              createdAt: 'Date',
              updatedAt: 'Date'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid enrollment data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot enroll in this class' },
        { status: 404, code: 'NOT_FOUND', message: 'Class or learner not found' },
        { status: 409, code: 'ALREADY_ENROLLED', message: 'Learner already enrolled in this class' },
        { status: 422, code: 'CLASS_FULL', message: 'Class has reached maximum capacity' },
        { status: 422, code: 'CLASS_STARTED', message: 'Class has already started' },
        { status: 422, code: 'PREREQUISITES_NOT_MET', message: 'Course prerequisites not completed' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439011',
        classId: '507f1f77bcf86cd799439018'
      },
      response: {
        success: true,
        message: 'Successfully enrolled in class',
        data: {
          enrollment: {
            id: '507f1f77bcf86cd799439027',
            type: 'class',
            learner: {
              id: '507f1f77bcf86cd799439011',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com'
            },
            class: {
              id: '507f1f77bcf86cd799439018',
              name: 'JavaScript - Spring 2026',
              course: {
                id: '507f1f77bcf86cd799439015',
                title: 'Advanced JavaScript Programming',
                code: 'CS301'
              },
              instructor: {
                id: '507f1f77bcf86cd799439014',
                firstName: 'Jane',
                lastName: 'Smith'
              },
              schedule: {
                startDate: '2026-01-15T00:00:00.000Z',
                endDate: '2026-05-15T23:59:59.000Z',
                capacity: 30,
                enrolled: 15
              },
              department: {
                id: '507f1f77bcf86cd799439012',
                name: 'Computer Science'
              }
            },
            status: 'active',
            enrolledAt: '2026-01-08T00:00:00.000Z',
            completedAt: null,
            withdrawnAt: null,
            expiresAt: '2026-05-15T23:59:59.000Z',
            progress: {
              percentage: 0,
              completedItems: 0,
              totalItems: 12
            },
            createdAt: '2026-01-08T00:00:00.000Z',
            updatedAt: '2026-01-08T00:00:00.000Z'
          }
        }
      }
    },

    permissions: ['write:enrollments'],

    notes: `
      - Staff can enroll learners in department classes
      - Learners can self-enroll if class allows open enrollment
      - Validates class capacity before enrollment
      - Cannot enroll after class start date (configurable)
      - Validates course prerequisites
      - Class enrollment may auto-enroll in base course
      - expiresAt set automatically to class end date
      - Duplicate enrollments return 409 conflict
    `
  },

  /**
   * Get Enrollment Details
   */
  getById: {
    endpoint: '/api/v2/enrollments/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed enrollment information',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Enrollment ID'
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
            type: 'program | course | class',
            learner: {
              id: 'ObjectId',
              firstName: 'string',
              lastName: 'string',
              email: 'string',
              profileImage: 'string | null'
            },
            target: {
              id: 'ObjectId',
              name: 'string',
              code: 'string',
              description: 'string',
              type: 'program | course | class'
            },
            status: 'active | completed | withdrawn | suspended | expired',
            enrolledAt: 'Date',
            completedAt: 'Date | null',
            withdrawnAt: 'Date | null',
            expiresAt: 'Date | null',
            progress: {
              percentage: 'number',
              completedItems: 'number',
              totalItems: 'number',
              lastActivityAt: 'Date | null',
              moduleProgress: [
                {
                  moduleId: 'ObjectId',
                  moduleName: 'string',
                  status: 'not-started | in-progress | completed',
                  percentage: 'number',
                  completedAt: 'Date | null'
                }
              ]
            },
            grade: {
              score: 'number | null',
              letter: 'string | null',
              passed: 'boolean | null',
              gradedAt: 'Date | null',
              gradedBy: '{id: ObjectId, firstName: string, lastName: string} | null'
            },
            department: {
              id: 'ObjectId',
              name: 'string',
              code: 'string'
            },
            notes: 'string | null',
            metadata: 'object',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access this enrollment' },
        { status: 404, code: 'NOT_FOUND', message: 'Enrollment not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439020',
          type: 'course',
          learner: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            profileImage: 'https://cdn.example.com/profiles/john.jpg'
          },
          target: {
            id: '507f1f77bcf86cd799439015',
            name: 'Advanced JavaScript Programming',
            code: 'CS301',
            description: 'Deep dive into modern JavaScript features and patterns',
            type: 'course'
          },
          status: 'active',
          enrolledAt: '2026-01-01T00:00:00.000Z',
          completedAt: null,
          withdrawnAt: null,
          expiresAt: '2026-12-31T23:59:59.000Z',
          progress: {
            percentage: 65,
            completedItems: 8,
            totalItems: 12,
            lastActivityAt: '2026-01-08T10:30:00.000Z',
            moduleProgress: [
              {
                moduleId: '507f1f77bcf86cd799439030',
                moduleName: 'Introduction to ES6+',
                status: 'completed',
                percentage: 100,
                completedAt: '2026-01-02T14:30:00.000Z'
              },
              {
                moduleId: '507f1f77bcf86cd799439031',
                moduleName: 'Async Programming',
                status: 'in-progress',
                percentage: 60,
                completedAt: null
              }
            ]
          },
          grade: {
            score: 87.5,
            letter: 'B+',
            passed: null,
            gradedAt: null,
            gradedBy: null
          },
          department: {
            id: '507f1f77bcf86cd799439012',
            name: 'Computer Science',
            code: 'CS'
          },
          notes: 'Accelerated track student',
          metadata: {
            source: 'self-enrollment',
            paymentStatus: 'paid'
          },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-08T10:30:00.000Z'
        }
      }
    },

    permissions: ['read:enrollments'],

    notes: `
      - Learners can only view their own enrollments
      - Staff can view enrollments in their departments
      - Global admins can view all enrollments
      - Progress includes detailed module-level breakdown
      - Grade shows current score even if not completed
      - moduleProgress only included for course/class enrollments
    `
  },

  /**
   * Update Enrollment Status
   */
  updateStatus: {
    endpoint: '/api/v2/enrollments/:id/status',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Update enrollment status',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Enrollment ID'
        }
      },
      body: {
        status: {
          type: 'string',
          required: true,
          enum: ['active', 'completed', 'withdrawn', 'suspended'],
          description: 'New enrollment status'
        },
        reason: {
          type: 'string',
          required: false,
          maxLength: 500,
          description: 'Reason for status change'
        },
        grade: {
          type: 'object',
          required: false,
          description: 'Final grade (for completed status)',
          properties: {
            score: { type: 'number', min: 0, max: 100 },
            letter: { type: 'string' },
            passed: { type: 'boolean' }
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
            id: 'ObjectId',
            status: 'active | completed | withdrawn | suspended',
            completedAt: 'Date | null',
            withdrawnAt: 'Date | null',
            grade: {
              score: 'number | null',
              letter: 'string | null',
              passed: 'boolean | null',
              gradedAt: 'Date | null',
              gradedBy: '{id: ObjectId, firstName: string, lastName: string} | null'
            },
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid status or data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot update this enrollment' },
        { status: 404, code: 'NOT_FOUND', message: 'Enrollment not found' },
        { status: 422, code: 'INVALID_TRANSITION', message: 'Invalid status transition' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          status: 'completed',
          grade: {
            score: 92.5,
            letter: 'A-',
            passed: true
          },
          reason: 'Course completed successfully'
        }
      },
      response: {
        success: true,
        message: 'Enrollment status updated successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'completed',
          completedAt: '2026-01-08T15:30:00.000Z',
          withdrawnAt: null,
          grade: {
            score: 92.5,
            letter: 'A-',
            passed: true,
            gradedAt: '2026-01-08T15:30:00.000Z',
            gradedBy: {
              id: '507f1f77bcf86cd799439014',
              firstName: 'Jane',
              lastName: 'Smith'
            }
          },
          updatedAt: '2026-01-08T15:30:00.000Z'
        }
      }
    },

    permissions: ['write:enrollments'],

    notes: `
      - Only staff can update enrollment status
      - Learners cannot change their own status
      - Valid transitions:
        - active -> completed, withdrawn, suspended
        - suspended -> active, withdrawn
        - completed -> (cannot change)
        - withdrawn -> (cannot change)
      - Completing requires grade if course has assessments
      - Suspension requires reason
      - Status changes trigger notifications
      - Audit log records all status changes
    `
  },

  /**
   * Withdraw from Enrollment
   */
  withdraw: {
    endpoint: '/api/v2/enrollments/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Withdraw from enrollment (soft delete)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Enrollment ID'
        }
      },
      body: {
        reason: {
          type: 'string',
          required: false,
          maxLength: 500,
          description: 'Reason for withdrawal'
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
            withdrawnAt: 'Date',
            finalGrade: {
              score: 'number | null',
              letter: 'string | null'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot withdraw from this enrollment' },
        { status: 404, code: 'NOT_FOUND', message: 'Enrollment not found' },
        { status: 422, code: 'ALREADY_COMPLETED', message: 'Cannot withdraw from completed enrollment' },
        { status: 422, code: 'ALREADY_WITHDRAWN', message: 'Enrollment already withdrawn' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          reason: 'Schedule conflict'
        }
      },
      response: {
        success: true,
        message: 'Successfully withdrawn from enrollment',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'withdrawn',
          withdrawnAt: '2026-01-08T16:00:00.000Z',
          finalGrade: {
            score: 65.0,
            letter: 'D'
          }
        }
      }
    },

    permissions: ['write:enrollments'],

    notes: `
      - Learners can withdraw from their own enrollments (within withdrawal period)
      - Staff can withdraw learners from department enrollments
      - Cannot withdraw from completed enrollments
      - Cannot withdraw after withdrawal deadline (configurable per course/program)
      - Withdrawal records final grade at time of withdrawal
      - Triggers notifications to learner and instructors
      - For classes, frees up seat for other learners
      - Refund eligibility determined by withdrawal date
    `
  },

  /**
   * List Program Enrollments
   */
  listProgramEnrollments: {
    endpoint: '/api/v2/enrollments/program/:programId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all enrollments for a specific program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        programId: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
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
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'completed', 'withdrawn', 'suspended', 'expired'],
          description: 'Filter by status'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-enrolledAt',
          description: 'Sort field (prefix with - for descending)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            program: {
              id: 'ObjectId',
              name: 'string',
              code: 'string'
            },
            enrollments: [
              {
                id: 'ObjectId',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string'
                },
                status: 'active | completed | withdrawn | suspended | expired',
                enrolledAt: 'Date',
                completedAt: 'Date | null',
                progress: {
                  percentage: 'number',
                  completedItems: 'number',
                  totalItems: 'number'
                },
                grade: {
                  score: 'number | null',
                  letter: 'string | null',
                  passed: 'boolean | null'
                }
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
            stats: {
              total: 'number',
              active: 'number',
              completed: 'number',
              withdrawn: 'number',
              averageProgress: 'number',
              completionRate: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access program enrollments' },
        { status: 404, code: 'NOT_FOUND', message: 'Program not found' }
      ]
    },

    example: {
      request: {
        params: { programId: '507f1f77bcf86cd799439013' },
        query: { status: 'active', limit: 20 }
      },
      response: {
        success: true,
        data: {
          program: {
            id: '507f1f77bcf86cd799439013',
            name: 'Computer Science Degree',
            code: 'CS-BSCS'
          },
          enrollments: [
            {
              id: '507f1f77bcf86cd799439025',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              },
              status: 'active',
              enrolledAt: '2026-01-01T00:00:00.000Z',
              completedAt: null,
              progress: {
                percentage: 35,
                completedItems: 14,
                totalItems: 40
              },
              grade: {
                score: 88.5,
                letter: 'B+',
                passed: null
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 45,
            totalPages: 3,
            hasNext: true,
            hasPrev: false
          },
          stats: {
            total: 50,
            active: 45,
            completed: 3,
            withdrawn: 2,
            averageProgress: 42.5,
            completionRate: 6.0
          }
        }
      }
    },

    permissions: ['read:enrollments'],

    notes: `
      - Staff can view enrollments in their department programs
      - Global admins can view all program enrollments
      - Includes program-level statistics
      - Stats calculated across all enrollments (not just current page)
      - Useful for program coordinators and administrators
    `
  },

  /**
   * List Course Enrollments
   */
  listCourseEnrollments: {
    endpoint: '/api/v2/enrollments/course/:courseId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all enrollments for a specific course',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        courseId: {
          type: 'ObjectId',
          required: true,
          description: 'Course ID'
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
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'completed', 'withdrawn', 'suspended', 'expired'],
          description: 'Filter by status'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-enrolledAt',
          description: 'Sort field (prefix with - for descending)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            course: {
              id: 'ObjectId',
              title: 'string',
              code: 'string'
            },
            enrollments: [
              {
                id: 'ObjectId',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string'
                },
                status: 'active | completed | withdrawn | suspended | expired',
                enrolledAt: 'Date',
                completedAt: 'Date | null',
                progress: {
                  percentage: 'number',
                  completedItems: 'number',
                  totalItems: 'number',
                  lastActivityAt: 'Date | null'
                },
                grade: {
                  score: 'number | null',
                  letter: 'string | null',
                  passed: 'boolean | null'
                }
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
            stats: {
              total: 'number',
              active: 'number',
              completed: 'number',
              withdrawn: 'number',
              averageProgress: 'number',
              completionRate: 'number',
              averageScore: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access course enrollments' },
        { status: 404, code: 'NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: { courseId: '507f1f77bcf86cd799439015' },
        query: { status: 'active', limit: 20 }
      },
      response: {
        success: true,
        data: {
          course: {
            id: '507f1f77bcf86cd799439015',
            title: 'Advanced JavaScript Programming',
            code: 'CS301'
          },
          enrollments: [
            {
              id: '507f1f77bcf86cd799439026',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              },
              status: 'active',
              enrolledAt: '2026-01-01T00:00:00.000Z',
              completedAt: null,
              progress: {
                percentage: 65,
                completedItems: 8,
                totalItems: 12,
                lastActivityAt: '2026-01-08T10:30:00.000Z'
              },
              grade: {
                score: 87.5,
                letter: 'B+',
                passed: null
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 32,
            totalPages: 2,
            hasNext: true,
            hasPrev: false
          },
          stats: {
            total: 35,
            active: 32,
            completed: 2,
            withdrawn: 1,
            averageProgress: 58.5,
            completionRate: 5.7,
            averageScore: 82.3
          }
        }
      }
    },

    permissions: ['read:enrollments'],

    notes: `
      - Staff can view enrollments in their department courses
      - Course instructors can view their course enrollments
      - Global admins can view all course enrollments
      - Includes course-level statistics
      - Stats calculated across all enrollments (not just current page)
      - lastActivityAt shows most recent progress update
    `
  },

  /**
   * List Class Enrollments
   */
  listClassEnrollments: {
    endpoint: '/api/v2/enrollments/class/:classId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all enrollments for a specific class',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        classId: {
          type: 'ObjectId',
          required: true,
          description: 'Class ID'
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
          default: 10,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['active', 'completed', 'withdrawn', 'suspended', 'expired'],
          description: 'Filter by status'
        },
        sort: {
          type: 'string',
          required: false,
          default: 'learner.lastName',
          description: 'Sort field (prefix with - for descending)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            class: {
              id: 'ObjectId',
              name: 'string',
              course: {
                id: 'ObjectId',
                title: 'string',
                code: 'string'
              },
              schedule: {
                startDate: 'Date',
                endDate: 'Date',
                capacity: 'number'
              }
            },
            enrollments: [
              {
                id: 'ObjectId',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string'
                },
                status: 'active | completed | withdrawn | suspended',
                enrolledAt: 'Date',
                completedAt: 'Date | null',
                progress: {
                  percentage: 'number',
                  completedItems: 'number',
                  totalItems: 'number',
                  lastActivityAt: 'Date | null'
                },
                grade: {
                  score: 'number | null',
                  letter: 'string | null',
                  passed: 'boolean | null'
                },
                attendance: {
                  sessionsAttended: 'number',
                  totalSessions: 'number',
                  attendanceRate: 'number'
                }
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
            stats: {
              total: 'number',
              active: 'number',
              completed: 'number',
              withdrawn: 'number',
              capacity: 'number',
              seatsAvailable: 'number',
              averageProgress: 'number',
              completionRate: 'number',
              averageScore: 'number',
              averageAttendance: 'number'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access class enrollments' },
        { status: 404, code: 'NOT_FOUND', message: 'Class not found' }
      ]
    },

    example: {
      request: {
        params: { classId: '507f1f77bcf86cd799439018' },
        query: { status: 'active', limit: 30 }
      },
      response: {
        success: true,
        data: {
          class: {
            id: '507f1f77bcf86cd799439018',
            name: 'JavaScript - Spring 2026',
            course: {
              id: '507f1f77bcf86cd799439015',
              title: 'Advanced JavaScript Programming',
              code: 'CS301'
            },
            schedule: {
              startDate: '2026-01-15T00:00:00.000Z',
              endDate: '2026-05-15T23:59:59.000Z',
              capacity: 30
            }
          },
          enrollments: [
            {
              id: '507f1f77bcf86cd799439027',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              },
              status: 'active',
              enrolledAt: '2026-01-08T00:00:00.000Z',
              completedAt: null,
              progress: {
                percentage: 45,
                completedItems: 5,
                totalItems: 12,
                lastActivityAt: '2026-01-08T10:30:00.000Z'
              },
              grade: {
                score: 85.0,
                letter: 'B',
                passed: null
              },
              attendance: {
                sessionsAttended: 8,
                totalSessions: 10,
                attendanceRate: 80.0
              }
            }
          ],
          pagination: {
            page: 1,
            limit: 30,
            total: 25,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          },
          stats: {
            total: 25,
            active: 25,
            completed: 0,
            withdrawn: 0,
            capacity: 30,
            seatsAvailable: 5,
            averageProgress: 52.3,
            completionRate: 0,
            averageScore: 83.5,
            averageAttendance: 85.2
          }
        }
      }
    },

    permissions: ['read:enrollments'],

    notes: `
      - Class instructors can view enrollments in their classes
      - Staff can view enrollments in department classes
      - Global admins can view all class enrollments
      - Includes class roster with attendance data
      - Stats include capacity and availability information
      - Default sort by learner last name (roster order)
      - Useful for instructors managing class rosters
      - Attendance data included if class has sessions
    `
  }
};

// Type exports for consumers
export type EnrollmentsContractType = typeof EnrollmentsContract;
