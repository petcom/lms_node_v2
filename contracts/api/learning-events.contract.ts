/**
 * Learning Events API Contracts
 * Version: 1.0.0
 *
 * These contracts define the learning events and activity feed endpoints for the LMS API.
 * Learning events track all learner activities, progress milestones, and system interactions.
 * Both backend and UI teams use these as the source of truth.
 */

export const LearningEventsContract = {
  /**
   * List Learning Events
   */
  list: {
    endpoint: '/api/v2/learning-events',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List learning events with filtering and pagination',

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
          default: 20,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        learner: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by learner ID'
        },
        type: {
          type: 'string',
          required: false,
          enum: [
            'enrollment',
            'content_started',
            'content_completed',
            'assessment_started',
            'assessment_completed',
            'module_completed',
            'course_completed',
            'achievement_earned',
            'login',
            'logout'
          ],
          description: 'Filter by event type'
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
        dateFrom: {
          type: 'Date',
          required: false,
          description: 'Filter events from date (ISO 8601)'
        },
        dateTo: {
          type: 'Date',
          required: false,
          description: 'Filter events to date (ISO 8601)'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
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
            events: [
              {
                id: 'ObjectId',
                type: 'enrollment|content_started|content_completed|assessment_started|assessment_completed|module_completed|course_completed|achievement_earned|login|logout',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string'
                },
                course: {
                  id: 'ObjectId',
                  title: 'string',
                  code: 'string'
                },
                class: {
                  id: 'ObjectId',
                  name: 'string'
                },
                content: {
                  id: 'ObjectId',
                  title: 'string',
                  type: 'string'
                },
                module: {
                  id: 'ObjectId',
                  title: 'string'
                },
                score: 'number | null',
                duration: 'number | null',
                metadata: 'object',
                timestamp: 'Date',
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        page: 1,
        limit: 20,
        learner: '507f1f77bcf86cd799439011',
        type: 'content_completed',
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-01-08T23:59:59.999Z'
      },
      response: {
        success: true,
        data: {
          events: [
            {
              id: '507f1f77bcf86cd799439020',
              type: 'content_completed',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              },
              course: {
                id: '507f1f77bcf86cd799439012',
                title: 'Introduction to Programming',
                code: 'CS101'
              },
              class: {
                id: '507f1f77bcf86cd799439013',
                name: 'CS101 - Spring 2026'
              },
              content: {
                id: '507f1f77bcf86cd799439014',
                title: 'Variables and Data Types',
                type: 'scorm'
              },
              module: {
                id: '507f1f77bcf86cd799439015',
                title: 'Module 1: Basics'
              },
              score: 95.5,
              duration: 1800,
              metadata: {
                attemptId: '507f1f77bcf86cd799439016',
                completionPercentage: 100,
                interactions: 15
              },
              timestamp: '2026-01-08T14:30:00.000Z',
              createdAt: '2026-01-08T14:30:00.000Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:learning-events'],

    notes: `
      - Staff can view events for all learners in their departments
      - Learners can only view their own events
      - Global admins can view all events
      - Supports filtering by date range, learner, course, class, and event type
      - Events are ordered by timestamp (most recent first by default)
      - Duration is in seconds
      - Score is percentage (0-100) or null if not applicable
      - Metadata is a flexible JSON object containing event-specific data
    `
  },

  /**
   * Create Learning Event
   */
  create: {
    endpoint: '/api/v2/learning-events',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new learning event (for manual/offline activities)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        type: {
          type: 'string',
          required: true,
          enum: [
            'enrollment',
            'content_started',
            'content_completed',
            'assessment_started',
            'assessment_completed',
            'module_completed',
            'course_completed',
            'achievement_earned',
            'login',
            'logout'
          ],
          description: 'Type of learning event'
        },
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of the learner'
        },
        courseId: {
          type: 'ObjectId',
          required: false,
          description: 'ID of the course (if applicable)'
        },
        classId: {
          type: 'ObjectId',
          required: false,
          description: 'ID of the class (if applicable)'
        },
        contentId: {
          type: 'ObjectId',
          required: false,
          description: 'ID of the content (if applicable)'
        },
        moduleId: {
          type: 'ObjectId',
          required: false,
          description: 'ID of the module (if applicable)'
        },
        score: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Score as percentage (0-100)'
        },
        duration: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Duration in seconds'
        },
        metadata: {
          type: 'object',
          required: false,
          description: 'Additional event-specific data (flexible JSON)'
        },
        timestamp: {
          type: 'Date',
          required: false,
          description: 'Event timestamp (defaults to now)'
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
            id: 'ObjectId',
            type: 'string',
            learner: {
              id: 'ObjectId',
              firstName: 'string',
              lastName: 'string',
              email: 'string'
            },
            course: {
              id: 'ObjectId',
              title: 'string',
              code: 'string'
            },
            class: {
              id: 'ObjectId',
              name: 'string'
            },
            content: {
              id: 'ObjectId',
              title: 'string',
              type: 'string'
            },
            module: {
              id: 'ObjectId',
              title: 'string'
            },
            score: 'number | null',
            duration: 'number | null',
            metadata: 'object',
            timestamp: 'Date',
            createdAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {
        type: 'content_completed',
        learnerId: '507f1f77bcf86cd799439011',
        courseId: '507f1f77bcf86cd799439012',
        classId: '507f1f77bcf86cd799439013',
        contentId: '507f1f77bcf86cd799439014',
        moduleId: '507f1f77bcf86cd799439015',
        score: 88.5,
        duration: 2400,
        metadata: {
          source: 'manual_entry',
          notes: 'Offline workshop completion'
        },
        timestamp: '2026-01-08T10:00:00.000Z'
      },
      response: {
        success: true,
        message: 'Learning event created successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          type: 'content_completed',
          learner: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          },
          course: {
            id: '507f1f77bcf86cd799439012',
            title: 'Introduction to Programming',
            code: 'CS101'
          },
          class: {
            id: '507f1f77bcf86cd799439013',
            name: 'CS101 - Spring 2026'
          },
          content: {
            id: '507f1f77bcf86cd799439014',
            title: 'Variables and Data Types',
            type: 'custom'
          },
          module: {
            id: '507f1f77bcf86cd799439015',
            title: 'Module 1: Basics'
          },
          score: 88.5,
          duration: 2400,
          metadata: {
            source: 'manual_entry',
            notes: 'Offline workshop completion'
          },
          timestamp: '2026-01-08T10:00:00.000Z',
          createdAt: '2026-01-08T14:30:00.000Z'
        }
      }
    },

    permissions: ['write:learning-events'],

    notes: `
      - Used for manually recording offline or external learning activities
      - Most events are auto-generated by the system (enrollment, content completion, etc.)
      - Staff can create events for learners in their departments
      - Global admins can create events for any learner
      - Learners cannot create their own events
      - Timestamp defaults to current time if not provided
      - Validates that referenced entities (learner, course, etc.) exist
      - Metadata field is flexible and can contain any JSON structure
    `
  },

  /**
   * Create Batch Learning Events
   */
  createBatch: {
    endpoint: '/api/v2/learning-events/batch',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create multiple learning events in a single request',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        events: {
          type: 'array',
          required: true,
          minItems: 1,
          maxItems: 100,
          description: 'Array of learning events to create',
          items: {
            type: {
              type: 'string',
              required: true,
              enum: [
                'enrollment',
                'content_started',
                'content_completed',
                'assessment_started',
                'assessment_completed',
                'module_completed',
                'course_completed',
                'achievement_earned',
                'login',
                'logout'
              ]
            },
            learnerId: { type: 'ObjectId', required: true },
            courseId: { type: 'ObjectId', required: false },
            classId: { type: 'ObjectId', required: false },
            contentId: { type: 'ObjectId', required: false },
            moduleId: { type: 'ObjectId', required: false },
            score: { type: 'number', required: false },
            duration: { type: 'number', required: false },
            metadata: { type: 'object', required: false },
            timestamp: { type: 'Date', required: false }
          }
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
            created: 'number',
            failed: 'number',
            events: [
              {
                id: 'ObjectId',
                type: 'string',
                learner: { id: 'ObjectId', firstName: 'string', lastName: 'string' },
                timestamp: 'Date',
                createdAt: 'Date'
              }
            ],
            errors: [
              {
                index: 'number',
                error: 'string'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        events: [
          {
            type: 'content_completed',
            learnerId: '507f1f77bcf86cd799439011',
            courseId: '507f1f77bcf86cd799439012',
            contentId: '507f1f77bcf86cd799439014',
            score: 95,
            duration: 1800
          },
          {
            type: 'module_completed',
            learnerId: '507f1f77bcf86cd799439011',
            courseId: '507f1f77bcf86cd799439012',
            moduleId: '507f1f77bcf86cd799439015'
          }
        ]
      },
      response: {
        success: true,
        message: 'Batch events created: 2 created, 0 failed',
        data: {
          created: 2,
          failed: 0,
          events: [
            {
              id: '507f1f77bcf86cd799439020',
              type: 'content_completed',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe'
              },
              timestamp: '2026-01-08T14:30:00.000Z',
              createdAt: '2026-01-08T14:30:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439021',
              type: 'module_completed',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe'
              },
              timestamp: '2026-01-08T14:30:01.000Z',
              createdAt: '2026-01-08T14:30:01.000Z'
            }
          ],
          errors: []
        }
      }
    },

    permissions: ['write:learning-events'],

    notes: `
      - Allows bulk creation of learning events
      - Useful for importing historical data or offline activities
      - Maximum 100 events per request
      - Partial success: some events may succeed while others fail
      - Returns array of created events and array of errors
      - Failed events include index number and error message
      - Transaction-safe: all events created or none
    `
  },

  /**
   * Get Learning Event Details
   */
  getById: {
    endpoint: '/api/v2/learning-events/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific learning event',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Learning event ID'
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
            type: 'string',
            learner: {
              id: 'ObjectId',
              firstName: 'string',
              lastName: 'string',
              email: 'string'
            },
            course: {
              id: 'ObjectId',
              title: 'string',
              code: 'string'
            },
            class: {
              id: 'ObjectId',
              name: 'string'
            },
            content: {
              id: 'ObjectId',
              title: 'string',
              type: 'string'
            },
            module: {
              id: 'ObjectId',
              title: 'string',
              order: 'number'
            },
            score: 'number | null',
            duration: 'number | null',
            metadata: 'object',
            timestamp: 'Date',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'EVENT_NOT_FOUND', message: 'Learning event not found' }
      ]
    },

    example: {
      request: {
        id: '507f1f77bcf86cd799439020'
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439020',
          type: 'content_completed',
          learner: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          },
          course: {
            id: '507f1f77bcf86cd799439012',
            title: 'Introduction to Programming',
            code: 'CS101'
          },
          class: {
            id: '507f1f77bcf86cd799439013',
            name: 'CS101 - Spring 2026'
          },
          content: {
            id: '507f1f77bcf86cd799439014',
            title: 'Variables and Data Types',
            type: 'scorm'
          },
          module: {
            id: '507f1f77bcf86cd799439015',
            title: 'Module 1: Basics',
            order: 1
          },
          score: 95.5,
          duration: 1800,
          metadata: {
            attemptId: '507f1f77bcf86cd799439016',
            completionPercentage: 100,
            interactions: 15,
            suspendData: 'encoded_state_data'
          },
          timestamp: '2026-01-08T14:30:00.000Z',
          createdAt: '2026-01-08T14:30:00.000Z',
          updatedAt: '2026-01-08T14:30:00.000Z'
        }
      }
    },

    permissions: ['read:learning-events'],

    notes: `
      - Returns complete event details including all related entities
      - Staff can view events for learners in their departments
      - Learners can only view their own events
      - Global admins can view all events
      - Includes full metadata object with all event-specific data
    `
  },

  /**
   * Get Learner Activity Feed
   */
  getLearnerActivity: {
    endpoint: '/api/v2/learning-events/learner/:learnerId',
    method: 'GET' as const,
    version: '1.0.0',
    description: "Get a learner's activity feed with all learning events",

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
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
          default: 20,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        type: {
          type: 'string',
          required: false,
          enum: [
            'enrollment',
            'content_started',
            'content_completed',
            'assessment_started',
            'assessment_completed',
            'module_completed',
            'course_completed',
            'achievement_earned',
            'login',
            'logout'
          ],
          description: 'Filter by event type'
        },
        dateFrom: {
          type: 'Date',
          required: false,
          description: 'Filter events from date (ISO 8601)'
        },
        dateTo: {
          type: 'Date',
          required: false,
          description: 'Filter events to date (ISO 8601)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            learner: {
              id: 'ObjectId',
              firstName: 'string',
              lastName: 'string',
              email: 'string'
            },
            events: [
              {
                id: 'ObjectId',
                type: 'string',
                course: {
                  id: 'ObjectId',
                  title: 'string',
                  code: 'string'
                },
                content: {
                  id: 'ObjectId',
                  title: 'string'
                },
                score: 'number | null',
                duration: 'number | null',
                timestamp: 'Date'
              }
            ],
            summary: {
              totalEvents: 'number',
              coursesStarted: 'number',
              coursesCompleted: 'number',
              contentCompleted: 'number',
              averageScore: 'number | null',
              totalStudyTime: 'number'
            },
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439011',
        page: 1,
        limit: 20
      },
      response: {
        success: true,
        data: {
          learner: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com'
          },
          events: [
            {
              id: '507f1f77bcf86cd799439020',
              type: 'content_completed',
              course: {
                id: '507f1f77bcf86cd799439012',
                title: 'Introduction to Programming',
                code: 'CS101'
              },
              content: {
                id: '507f1f77bcf86cd799439014',
                title: 'Variables and Data Types'
              },
              score: 95.5,
              duration: 1800,
              timestamp: '2026-01-08T14:30:00.000Z'
            },
            {
              id: '507f1f77bcf86cd799439021',
              type: 'module_completed',
              course: {
                id: '507f1f77bcf86cd799439012',
                title: 'Introduction to Programming',
                code: 'CS101'
              },
              content: null,
              score: null,
              duration: null,
              timestamp: '2026-01-08T14:35:00.000Z'
            }
          ],
          summary: {
            totalEvents: 45,
            coursesStarted: 3,
            coursesCompleted: 1,
            contentCompleted: 28,
            averageScore: 87.3,
            totalStudyTime: 86400
          },
          pagination: {
            page: 1,
            limit: 20,
            total: 45,
            totalPages: 3,
            hasNext: true,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:learning-events'],

    notes: `
      - Returns learner's complete activity feed
      - Includes summary statistics for quick insights
      - Learners can view their own activity feed
      - Staff can view activity for learners in their departments
      - Global admins can view any learner's activity
      - Events are ordered by timestamp (most recent first)
      - Total study time is sum of all duration values in seconds
      - Average score only includes events with scores
    `
  },

  /**
   * Get Course Activity Feed
   */
  getCourseActivity: {
    endpoint: '/api/v2/learning-events/course/:courseId',
    method: 'GET' as const,
    version: '1.0.0',
    description: "Get all learning events for a specific course",

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
          default: 20,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        type: {
          type: 'string',
          required: false,
          enum: [
            'enrollment',
            'content_started',
            'content_completed',
            'assessment_started',
            'assessment_completed',
            'module_completed',
            'course_completed'
          ],
          description: 'Filter by event type'
        },
        learner: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by learner ID'
        },
        dateFrom: {
          type: 'Date',
          required: false,
          description: 'Filter events from date (ISO 8601)'
        },
        dateTo: {
          type: 'Date',
          required: false,
          description: 'Filter events to date (ISO 8601)'
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
            events: [
              {
                id: 'ObjectId',
                type: 'string',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string'
                },
                content: {
                  id: 'ObjectId',
                  title: 'string'
                },
                score: 'number | null',
                duration: 'number | null',
                timestamp: 'Date'
              }
            ],
            summary: {
              totalEvents: 'number',
              totalLearners: 'number',
              enrollments: 'number',
              completions: 'number',
              averageScore: 'number | null',
              averageCompletionTime: 'number | null'
            },
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        courseId: '507f1f77bcf86cd799439012',
        page: 1,
        limit: 20
      },
      response: {
        success: true,
        data: {
          course: {
            id: '507f1f77bcf86cd799439012',
            title: 'Introduction to Programming',
            code: 'CS101'
          },
          events: [
            {
              id: '507f1f77bcf86cd799439020',
              type: 'content_completed',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe'
              },
              content: {
                id: '507f1f77bcf86cd799439014',
                title: 'Variables and Data Types'
              },
              score: 95.5,
              duration: 1800,
              timestamp: '2026-01-08T14:30:00.000Z'
            }
          ],
          summary: {
            totalEvents: 342,
            totalLearners: 45,
            enrollments: 45,
            completions: 12,
            averageScore: 83.7,
            averageCompletionTime: 172800
          },
          pagination: {
            page: 1,
            limit: 20,
            total: 342,
            totalPages: 18,
            hasNext: true,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:learning-events', 'read:courses'],

    notes: `
      - Returns all learning events for a specific course
      - Useful for instructors and administrators to monitor course activity
      - Only staff with access to the course can view events
      - Global admins can view all course events
      - Summary includes course-wide statistics
      - Average completion time is in seconds (from enrollment to completion)
      - Events are ordered by timestamp (most recent first)
    `
  },

  /**
   * Get Class Activity Feed
   */
  getClassActivity: {
    endpoint: '/api/v2/learning-events/class/:classId',
    method: 'GET' as const,
    version: '1.0.0',
    description: "Get all learning events for a specific class",

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
          default: 20,
          min: 1,
          max: 100,
          description: 'Number of results per page'
        },
        type: {
          type: 'string',
          required: false,
          enum: [
            'enrollment',
            'content_started',
            'content_completed',
            'assessment_started',
            'assessment_completed',
            'module_completed',
            'course_completed'
          ],
          description: 'Filter by event type'
        },
        learner: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by learner ID'
        },
        dateFrom: {
          type: 'Date',
          required: false,
          description: 'Filter events from date (ISO 8601)'
        },
        dateTo: {
          type: 'Date',
          required: false,
          description: 'Filter events to date (ISO 8601)'
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
              }
            },
            events: [
              {
                id: 'ObjectId',
                type: 'string',
                learner: {
                  id: 'ObjectId',
                  firstName: 'string',
                  lastName: 'string'
                },
                content: {
                  id: 'ObjectId',
                  title: 'string'
                },
                score: 'number | null',
                duration: 'number | null',
                timestamp: 'Date'
              }
            ],
            summary: {
              totalEvents: 'number',
              totalLearners: 'number',
              enrollments: 'number',
              completions: 'number',
              averageScore: 'number | null',
              averageProgress: 'number'
            },
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' }
      ]
    },

    example: {
      request: {
        classId: '507f1f77bcf86cd799439013',
        page: 1,
        limit: 20
      },
      response: {
        success: true,
        data: {
          class: {
            id: '507f1f77bcf86cd799439013',
            name: 'CS101 - Spring 2026',
            course: {
              id: '507f1f77bcf86cd799439012',
              title: 'Introduction to Programming',
              code: 'CS101'
            }
          },
          events: [
            {
              id: '507f1f77bcf86cd799439020',
              type: 'content_completed',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'John',
                lastName: 'Doe'
              },
              content: {
                id: '507f1f77bcf86cd799439014',
                title: 'Variables and Data Types'
              },
              score: 95.5,
              duration: 1800,
              timestamp: '2026-01-08T14:30:00.000Z'
            }
          ],
          summary: {
            totalEvents: 156,
            totalLearners: 25,
            enrollments: 25,
            completions: 8,
            averageScore: 85.2,
            averageProgress: 42.5
          },
          pagination: {
            page: 1,
            limit: 20,
            total: 156,
            totalPages: 8,
            hasNext: true,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:learning-events', 'read:classes'],

    notes: `
      - Returns all learning events for a specific class instance
      - Useful for class instructors to monitor student progress
      - Only instructors and staff with access to the class can view events
      - Global admins can view all class events
      - Summary includes class-wide statistics
      - Average progress is percentage (0-100) of course completion
      - Events are ordered by timestamp (most recent first)
    `
  },

  /**
   * Get Activity Statistics
   */
  getStats: {
    endpoint: '/api/v2/learning-events/stats',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get aggregated activity statistics and metrics',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        dateFrom: {
          type: 'Date',
          required: false,
          description: 'Start date for statistics (ISO 8601)'
        },
        dateTo: {
          type: 'Date',
          required: false,
          description: 'End date for statistics (ISO 8601)'
        },
        department: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department ID'
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
        groupBy: {
          type: 'string',
          required: false,
          enum: ['day', 'week', 'month'],
          default: 'day',
          description: 'Group statistics by time period'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            period: {
              from: 'Date',
              to: 'Date'
            },
            overall: {
              totalEvents: 'number',
              totalLearners: 'number',
              activeUsers: 'number',
              dailyActiveUsers: 'number',
              weeklyActiveUsers: 'number',
              monthlyActiveUsers: 'number',
              totalStudyTime: 'number',
              averageStudyTime: 'number'
            },
            eventsByType: [
              {
                type: 'string',
                count: 'number',
                percentage: 'number'
              }
            ],
            completionRates: {
              courses: {
                started: 'number',
                completed: 'number',
                rate: 'number'
              },
              content: {
                started: 'number',
                completed: 'number',
                rate: 'number'
              },
              assessments: {
                started: 'number',
                completed: 'number',
                rate: 'number'
              }
            },
            performance: {
              averageScore: 'number | null',
              passRate: 'number | null',
              topPerformers: [
                {
                  learner: {
                    id: 'ObjectId',
                    firstName: 'string',
                    lastName: 'string'
                  },
                  averageScore: 'number',
                  completedCount: 'number'
                }
              ]
            },
            timeline: [
              {
                period: 'string',
                date: 'Date',
                events: 'number',
                activeUsers: 'number',
                completions: 'number'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-01-08T23:59:59.999Z',
        groupBy: 'day'
      },
      response: {
        success: true,
        data: {
          period: {
            from: '2026-01-01T00:00:00.000Z',
            to: '2026-01-08T23:59:59.999Z'
          },
          overall: {
            totalEvents: 1842,
            totalLearners: 156,
            activeUsers: 142,
            dailyActiveUsers: 89,
            weeklyActiveUsers: 142,
            monthlyActiveUsers: 156,
            totalStudyTime: 2592000,
            averageStudyTime: 18254
          },
          eventsByType: [
            { type: 'content_completed', count: 564, percentage: 30.6 },
            { type: 'content_started', count: 612, percentage: 33.2 },
            { type: 'assessment_completed', count: 234, percentage: 12.7 },
            { type: 'login', count: 312, percentage: 16.9 },
            { type: 'module_completed', count: 89, percentage: 4.8 },
            { type: 'course_completed', count: 31, percentage: 1.7 }
          ],
          completionRates: {
            courses: {
              started: 45,
              completed: 31,
              rate: 68.9
            },
            content: {
              started: 612,
              completed: 564,
              rate: 92.2
            },
            assessments: {
              started: 267,
              completed: 234,
              rate: 87.6
            }
          },
          performance: {
            averageScore: 84.3,
            passRate: 91.2,
            topPerformers: [
              {
                learner: {
                  id: '507f1f77bcf86cd799439011',
                  firstName: 'John',
                  lastName: 'Doe'
                },
                averageScore: 96.5,
                completedCount: 28
              },
              {
                learner: {
                  id: '507f1f77bcf86cd799439022',
                  firstName: 'Jane',
                  lastName: 'Smith'
                },
                averageScore: 94.8,
                completedCount: 32
              }
            ]
          },
          timeline: [
            {
              period: '2026-01-08',
              date: '2026-01-08T00:00:00.000Z',
              events: 287,
              activeUsers: 89,
              completions: 78
            },
            {
              period: '2026-01-07',
              date: '2026-01-07T00:00:00.000Z',
              events: 245,
              activeUsers: 82,
              completions: 64
            }
          ]
        }
      }
    },

    permissions: ['read:learning-events', 'read:analytics'],

    notes: `
      - Returns aggregated statistics and metrics for learning activities
      - Staff can view statistics for their departments
      - Global admins can view all statistics
      - Supports filtering by date range, department, course, or class
      - Timeline can be grouped by day, week, or month
      - Daily Active Users (DAU): unique learners active in last 24 hours
      - Weekly Active Users (WAU): unique learners active in last 7 days
      - Monthly Active Users (MAU): unique learners active in last 30 days
      - Study time is in seconds
      - Completion rates are percentages (0-100)
      - Top performers limited to top 10 learners by average score
      - Pass rate calculated as percentage of assessments with score >= 70%
    `
  }
};

// Type exports for consumers
export type LearningEventsContractType = typeof LearningEventsContract;
export type LearningEventType = 'enrollment' | 'content_started' | 'content_completed' |
  'assessment_started' | 'assessment_completed' | 'module_completed' | 'course_completed' |
  'achievement_earned' | 'login' | 'logout';
