/**
 * Content Attempts API Contracts
 * Version: 1.0.0
 *
 * These contracts define the content attempt tracking endpoints for the LMS API.
 * Handles learner content attempts including SCORM CMI data, progress tracking,
 * and attempt lifecycle management.
 * Both backend and UI teams use these as the source of truth.
 */

export const ContentAttemptsContracts = {
  /**
   * List Content Attempts
   * Get list of content attempts with filtering options
   */
  list: {
    endpoint: '/api/v2/content-attempts',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List content attempts with filters for learner, content, and status',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 20, min: 1, max: 100 },
        learnerId: {
          type: 'string',
          required: false,
          description: 'Filter by learner ID (staff only - learners see their own only)'
        },
        contentId: {
          type: 'string',
          required: false,
          description: 'Filter by content ID'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['not-started', 'started', 'in-progress', 'completed', 'passed', 'failed', 'suspended', 'abandoned'],
          description: 'Filter by attempt status'
        },
        enrollmentId: {
          type: 'string',
          required: false,
          description: 'Filter by enrollment ID'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-createdAt',
          description: 'Sort field (prefix with - for desc)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            attempts: [
              {
                id: 'string',
                contentId: 'string',
                content: {
                  id: 'string',
                  title: 'string',
                  type: 'scorm|video|document|quiz|assignment|html'
                },
                learnerId: 'string',
                learner: {
                  id: 'string',
                  firstName: 'string',
                  lastName: 'string',
                  email: 'string'
                },
                enrollmentId: 'string | null',
                attemptNumber: 'number',
                status: 'not-started|started|in-progress|completed|passed|failed|suspended|abandoned',
                progressPercent: 'number | null',
                score: 'number | null',
                scoreRaw: 'number | null',
                scoreMin: 'number | null',
                scoreMax: 'number | null',
                scoreScaled: 'number | null',
                timeSpentSeconds: 'number',
                totalTime: 'number | null',
                sessionTime: 'number | null',
                startedAt: 'Date | null',
                lastAccessedAt: 'Date | null',
                completedAt: 'Date | null',
                scormVersion: '1.2|2004|null',
                hasScormData: 'boolean',
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' }
      ]
    },

    example: {
      request: {
        query: {
          learnerId: '507f1f77bcf86cd799439011',
          status: 'in-progress',
          page: 1,
          limit: 20
        }
      },
      response: {
        success: true,
        data: {
          attempts: [
            {
              id: '507f1f77bcf86cd799439020',
              contentId: '507f1f77bcf86cd799439015',
              content: {
                id: '507f1f77bcf86cd799439015',
                title: 'Safety Training Module 1',
                type: 'scorm'
              },
              learnerId: '507f1f77bcf86cd799439011',
              learner: {
                id: '507f1f77bcf86cd799439011',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com'
              },
              enrollmentId: '507f1f77bcf86cd799439018',
              attemptNumber: 1,
              status: 'in-progress',
              progressPercent: 65,
              score: null,
              scoreRaw: null,
              scoreMin: null,
              scoreMax: null,
              scoreScaled: null,
              timeSpentSeconds: 1820,
              totalTime: 1820,
              sessionTime: 450,
              startedAt: '2026-01-08T10:00:00.000Z',
              lastAccessedAt: '2026-01-08T10:30:00.000Z',
              completedAt: null,
              scormVersion: '1.2',
              hasScormData: true,
              createdAt: '2026-01-08T10:00:00.000Z',
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

    permissions: ['read:attempts', 'authenticated'],

    notes: `
      - Learners can only see their own attempts
      - Staff can see attempts for learners in their departments
      - Global-admin can see all attempts
      - Supports filtering by learner, content, status, and enrollment
      - Includes populated content and learner references
      - hasScormData indicates if CMI data exists for this attempt
    `
  },

  /**
   * Create Content Attempt
   * Start a new attempt for a content item
   */
  create: {
    endpoint: '/api/v2/content-attempts',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Create a new content attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        contentId: {
          type: 'string',
          required: true,
          description: 'Content ID to attempt'
        },
        enrollmentId: {
          type: 'string',
          required: false,
          description: 'Associated enrollment ID (if part of course)'
        },
        scormVersion: {
          type: 'string',
          required: false,
          enum: ['1.2', '2004'],
          description: 'SCORM version (for SCORM content only)'
        },
        launchData: {
          type: 'string',
          required: false,
          description: 'Initial launch data for SCORM'
        },
        metadata: {
          type: 'object',
          required: false,
          description: 'Additional metadata for the attempt'
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
            contentId: 'string',
            learnerId: 'string',
            enrollmentId: 'string | null',
            attemptNumber: 'number',
            status: 'started',
            progressPercent: 'number',
            timeSpentSeconds: 'number',
            startedAt: 'Date',
            lastAccessedAt: 'Date',
            scormVersion: '1.2|2004|null',
            launchUrl: 'string | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not enrolled in this content' },
        { status: 404, code: 'NOT_FOUND', message: 'Content not found' },
        { status: 409, code: 'ATTEMPT_EXISTS', message: 'Active attempt already exists' }
      ]
    },

    example: {
      request: {
        contentId: '507f1f77bcf86cd799439015',
        enrollmentId: '507f1f77bcf86cd799439018',
        scormVersion: '1.2'
      },
      response: {
        success: true,
        message: 'Content attempt created successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          contentId: '507f1f77bcf86cd799439015',
          learnerId: '507f1f77bcf86cd799439011',
          enrollmentId: '507f1f77bcf86cd799439018',
          attemptNumber: 1,
          status: 'started',
          progressPercent: 0,
          timeSpentSeconds: 0,
          startedAt: '2026-01-08T10:00:00.000Z',
          lastAccessedAt: '2026-01-08T10:00:00.000Z',
          scormVersion: '1.2',
          launchUrl: '/scorm/507f1f77bcf86cd799439015/launch?attempt=507f1f77bcf86cd799439020',
          createdAt: '2026-01-08T10:00:00.000Z',
          updatedAt: '2026-01-08T10:00:00.000Z'
        }
      }
    },

    permissions: ['create:attempts', 'authenticated'],

    notes: `
      - Automatically calculates attempt number (increments from previous attempts)
      - Validates that learner is enrolled in the content (if enrollmentId provided)
      - Prevents multiple active attempts for the same content
      - For SCORM content, initializes CMI data structure based on version
      - Returns launch URL for SCORM content
      - Auto-sets status to 'started' and records startedAt timestamp
      - Creates associated LearningEvent for tracking
    `
  },

  /**
   * Get Attempt Details
   * Retrieve detailed information about a specific attempt including CMI data
   */
  getById: {
    endpoint: '/api/v2/content-attempts/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed attempt information with CMI data',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      },
      query: {
        includeCmi: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include full CMI data in response'
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
            contentId: 'string',
            content: {
              id: 'string',
              title: 'string',
              type: 'scorm|video|document|quiz|assignment|html',
              description: 'string | null',
              duration: 'number | null'
            },
            learnerId: 'string',
            learner: {
              id: 'string',
              firstName: 'string',
              lastName: 'string',
              email: 'string'
            },
            enrollmentId: 'string | null',
            enrollment: {
              id: 'string',
              courseId: 'string',
              courseTitle: 'string'
            },
            attemptNumber: 'number',
            status: 'not-started|started|in-progress|completed|passed|failed|suspended|abandoned',
            progressPercent: 'number | null',
            score: 'number | null',
            scoreRaw: 'number | null',
            scoreMin: 'number | null',
            scoreMax: 'number | null',
            scoreScaled: 'number | null',
            completionStatus: 'string | null',
            successStatus: 'string | null',
            timeSpentSeconds: 'number',
            totalTime: 'number | null',
            sessionTime: 'number | null',
            startedAt: 'Date | null',
            lastAccessedAt: 'Date | null',
            completedAt: 'Date | null',
            scormVersion: '1.2|2004|null',
            location: 'string | null',
            suspendData: 'string | null',
            cmiData: 'object | null',
            metadata: 'object | null',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        query: { includeCmi: true }
      },
      response: {
        success: true,
        data: {
          id: '507f1f77bcf86cd799439020',
          contentId: '507f1f77bcf86cd799439015',
          content: {
            id: '507f1f77bcf86cd799439015',
            title: 'Safety Training Module 1',
            type: 'scorm',
            description: 'Introduction to workplace safety',
            duration: 45
          },
          learnerId: '507f1f77bcf86cd799439011',
          learner: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com'
          },
          enrollmentId: '507f1f77bcf86cd799439018',
          enrollment: {
            id: '507f1f77bcf86cd799439018',
            courseId: '507f1f77bcf86cd799439014',
            courseTitle: 'Workplace Safety Fundamentals'
          },
          attemptNumber: 1,
          status: 'in-progress',
          progressPercent: 65,
          score: null,
          scoreRaw: 78,
          scoreMin: 0,
          scoreMax: 100,
          scoreScaled: 0.78,
          completionStatus: 'incomplete',
          successStatus: 'unknown',
          timeSpentSeconds: 1820,
          totalTime: 1820,
          sessionTime: 450,
          startedAt: '2026-01-08T10:00:00.000Z',
          lastAccessedAt: '2026-01-08T10:30:00.000Z',
          completedAt: null,
          scormVersion: '1.2',
          location: 'page-5',
          suspendData: 'bookmark=page5;completed=false',
          cmiData: {
            'cmi.core.lesson_status': 'incomplete',
            'cmi.core.score.raw': '78',
            'cmi.core.score.min': '0',
            'cmi.core.score.max': '100',
            'cmi.core.lesson_location': 'page-5'
          },
          metadata: {
            userAgent: 'Mozilla/5.0...',
            ipAddress: '192.168.1.1'
          },
          createdAt: '2026-01-08T10:00:00.000Z',
          updatedAt: '2026-01-08T10:30:00.000Z'
        }
      }
    },

    permissions: ['read:attempts', 'authenticated'],

    notes: `
      - Learners can only access their own attempts
      - Staff can access attempts for learners in their departments
      - includeCmi=true returns full CMI data object (can be large)
      - Includes populated content, learner, and enrollment references
      - location field stores bookmark/position in content
      - suspendData stores serialized state for resuming
      - For SCORM 1.2: uses cmi.core.* namespace
      - For SCORM 2004: uses cmi.* namespace
    `
  },

  /**
   * Update Attempt Progress
   * Update attempt status, progress, time spent, and other tracking data
   */
  update: {
    endpoint: '/api/v2/content-attempts/:id',
    method: 'PATCH' as const,
    version: '1.0.0',
    description: 'Update attempt progress and tracking data',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      },
      body: {
        status: {
          type: 'string',
          required: false,
          enum: ['started', 'in-progress', 'completed', 'passed', 'failed', 'suspended', 'abandoned'],
          description: 'Update attempt status'
        },
        progressPercent: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Update progress percentage'
        },
        score: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Update overall score'
        },
        scoreRaw: {
          type: 'number',
          required: false,
          description: 'Raw score value'
        },
        scoreMin: {
          type: 'number',
          required: false,
          description: 'Minimum possible score'
        },
        scoreMax: {
          type: 'number',
          required: false,
          description: 'Maximum possible score'
        },
        scoreScaled: {
          type: 'number',
          required: false,
          min: -1,
          max: 1,
          description: 'Scaled score (-1 to 1 for SCORM 2004)'
        },
        timeSpentSeconds: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Add to total time spent'
        },
        location: {
          type: 'string',
          required: false,
          description: 'Bookmark/position in content'
        },
        suspendData: {
          type: 'string',
          required: false,
          description: 'State data for resuming'
        },
        metadata: {
          type: 'object',
          required: false,
          description: 'Additional metadata'
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
            status: 'string',
            progressPercent: 'number | null',
            score: 'number | null',
            timeSpentSeconds: 'number',
            lastAccessedAt: 'Date',
            completedAt: 'Date | null',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot update this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found' },
        { status: 409, code: 'INVALID_STATE', message: 'Cannot update completed attempt' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          status: 'in-progress',
          progressPercent: 75,
          timeSpentSeconds: 300,
          location: 'page-6'
        }
      },
      response: {
        success: true,
        message: 'Attempt updated successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'in-progress',
          progressPercent: 75,
          score: null,
          timeSpentSeconds: 2120,
          lastAccessedAt: '2026-01-08T10:35:00.000Z',
          completedAt: null,
          updatedAt: '2026-01-08T10:35:00.000Z'
        }
      }
    },

    permissions: ['update:attempts', 'authenticated'],

    notes: `
      - Only the attempt owner (learner) can update their attempt
      - Staff cannot directly update learner attempts (read-only)
      - Automatically updates lastAccessedAt on any update
      - timeSpentSeconds is additive (adds to existing time)
      - Cannot update attempts with status 'completed', 'passed', or 'failed'
      - Setting status to 'completed'/'passed'/'failed' sets completedAt timestamp
      - Validates score ranges based on scoreMin/scoreMax if provided
      - Updates associated enrollment progress if applicable
      - Creates LearningEvent for significant status changes
    `
  },

  /**
   * Complete Content Attempt
   * Mark an attempt as complete with final score and status
   */
  complete: {
    endpoint: '/api/v2/content-attempts/:id/complete',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Mark attempt as complete',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      },
      body: {
        score: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Final score'
        },
        scoreRaw: {
          type: 'number',
          required: false,
          description: 'Final raw score'
        },
        scoreScaled: {
          type: 'number',
          required: false,
          min: -1,
          max: 1,
          description: 'Final scaled score'
        },
        passed: {
          type: 'boolean',
          required: false,
          description: 'Whether attempt passed (overrides score-based logic)'
        },
        timeSpentSeconds: {
          type: 'number',
          required: false,
          min: 0,
          description: 'Final session time to add'
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
            status: 'completed|passed|failed',
            progressPercent: 100,
            score: 'number | null',
            scoreRaw: 'number | null',
            scoreScaled: 'number | null',
            passed: 'boolean',
            timeSpentSeconds: 'number',
            completedAt: 'Date',
            certificate: '{ id: string, url: string } | null'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot complete this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found' },
        { status: 409, code: 'ALREADY_COMPLETED', message: 'Attempt already completed' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          score: 92,
          scoreRaw: 92,
          scoreScaled: 0.92,
          passed: true,
          timeSpentSeconds: 180
        }
      },
      response: {
        success: true,
        message: 'Content attempt completed successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'passed',
          progressPercent: 100,
          score: 92,
          scoreRaw: 92,
          scoreScaled: 0.92,
          passed: true,
          timeSpentSeconds: 2300,
          completedAt: '2026-01-08T10:40:00.000Z',
          certificate: null
        }
      }
    },

    permissions: ['update:attempts', 'authenticated'],

    notes: `
      - Sets progressPercent to 100
      - Sets completedAt to current timestamp
      - Status set based on passed flag or score vs. passing threshold
      - If passed=true or score >= passingScore: status = 'passed'
      - If passed=false or score < passingScore: status = 'failed'
      - If no score/passed provided: status = 'completed'
      - Updates associated enrollment progress and completion
      - Creates completion LearningEvent
      - May trigger certificate generation if content has certificate configured
      - Cannot complete already completed attempts
      - Final score must be within scoreMin/scoreMax range if defined
    `
  },

  /**
   * Get SCORM CMI Data
   * Retrieve all SCORM CMI data for an attempt
   */
  getCmiData: {
    endpoint: '/api/v2/content-attempts/:id/cmi',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get SCORM CMI data for an attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            attemptId: 'string',
            scormVersion: '1.2|2004',
            cmiData: {
              'cmi.core.student_id': 'string',
              'cmi.core.student_name': 'string',
              'cmi.core.lesson_status': 'string',
              'cmi.core.lesson_location': 'string',
              'cmi.core.score.raw': 'string',
              'cmi.core.score.min': 'string',
              'cmi.core.score.max': 'string',
              'cmi.core.session_time': 'string',
              'cmi.core.total_time': 'string',
              'cmi.suspend_data': 'string',
              // Additional CMI fields based on SCORM version
            },
            lastUpdated: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot access this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found or no CMI data' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' }
      },
      response: {
        success: true,
        data: {
          attemptId: '507f1f77bcf86cd799439020',
          scormVersion: '1.2',
          cmiData: {
            'cmi.core.student_id': '507f1f77bcf86cd799439011',
            'cmi.core.student_name': 'Smith, Jane',
            'cmi.core.lesson_status': 'incomplete',
            'cmi.core.lesson_location': 'page-6',
            'cmi.core.score.raw': '78',
            'cmi.core.score.min': '0',
            'cmi.core.score.max': '100',
            'cmi.core.session_time': '00:07:30',
            'cmi.core.total_time': '00:30:20',
            'cmi.suspend_data': 'bookmark=page6;completed=false',
            'cmi.launch_data': '',
            'cmi.comments': '',
            'cmi.comments_from_lms': ''
          },
          lastUpdated: '2026-01-08T10:35:00.000Z'
        }
      }
    },

    permissions: ['read:attempts', 'authenticated'],

    notes: `
      - Returns all CMI data for the attempt
      - Only SCORM content has CMI data
      - SCORM 1.2 uses cmi.core.* namespace
      - SCORM 2004 uses cmi.* namespace (flatter structure)
      - Student ID and name auto-populated from learner
      - Time fields formatted per SCORM spec (HH:MM:SS or PTnHnMnS)
      - Learners can only access their own CMI data
      - Staff can access CMI data for reporting purposes
      - Used by SCORM player for Initialize/GetValue calls
    `
  },

  /**
   * Update SCORM CMI Data
   * Update or set SCORM CMI data fields
   */
  updateCmiData: {
    endpoint: '/api/v2/content-attempts/:id/cmi',
    method: 'PUT' as const,
    version: '1.0.0',
    description: 'Update SCORM CMI data',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      },
      body: {
        cmiData: {
          type: 'object',
          required: true,
          description: 'CMI data key-value pairs to update'
        },
        autoCommit: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Auto-commit changes (persist immediately)'
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
            attemptId: 'string',
            updatedFields: 'string[]',
            lastUpdated: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid CMI data format' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot update this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found' },
        { status: 409, code: 'READ_ONLY_FIELD', message: 'Cannot update read-only CMI field' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          cmiData: {
            'cmi.core.lesson_status': 'incomplete',
            'cmi.core.lesson_location': 'page-7',
            'cmi.core.score.raw': '85',
            'cmi.core.session_time': '00:05:00',
            'cmi.suspend_data': 'bookmark=page7;completed=false'
          },
          autoCommit: true
        }
      },
      response: {
        success: true,
        message: 'CMI data updated successfully',
        data: {
          attemptId: '507f1f77bcf86cd799439020',
          updatedFields: [
            'cmi.core.lesson_status',
            'cmi.core.lesson_location',
            'cmi.core.score.raw',
            'cmi.core.session_time',
            'cmi.suspend_data'
          ],
          lastUpdated: '2026-01-08T10:40:00.000Z'
        }
      }
    },

    permissions: ['update:attempts', 'authenticated'],

    notes: `
      - Used by SCORM player for SetValue/Commit calls
      - Validates CMI field names against SCORM specification
      - Read-only fields (e.g., student_id, student_name) cannot be updated
      - Automatically updates attempt status based on lesson_status changes
      - Updates totalTime when session_time is provided
      - Parses and validates time fields (HH:MM:SS format for SCORM 1.2)
      - Updates lastAccessedAt timestamp
      - autoCommit=false for batching multiple SetValue calls
      - Enforces max size limits for suspend_data (4096 chars for SCORM 1.2)
      - Logs significant changes for debugging/auditing
    `
  },

  /**
   * Suspend Content Attempt
   * Suspend an in-progress attempt to resume later
   */
  suspend: {
    endpoint: '/api/v2/content-attempts/:id/suspend',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Suspend an in-progress attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      },
      body: {
        suspendData: {
          type: 'string',
          required: false,
          maxLength: 4096,
          description: 'State data for resuming (SCORM suspend_data)'
        },
        location: {
          type: 'string',
          required: false,
          description: 'Current position/bookmark'
        },
        sessionTime: {
          type: 'number',
          required: false,
          description: 'Time spent in this session (seconds)'
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
            status: 'suspended',
            suspendData: 'string | null',
            location: 'string | null',
            timeSpentSeconds: 'number',
            lastAccessedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid suspend data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot suspend this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found' },
        { status: 409, code: 'INVALID_STATE', message: 'Cannot suspend completed attempt' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          suspendData: 'bookmark=page7;quiz1Complete=true;score=85',
          location: 'page-7',
          sessionTime: 300
        }
      },
      response: {
        success: true,
        message: 'Attempt suspended successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'suspended',
          suspendData: 'bookmark=page7;quiz1Complete=true;score=85',
          location: 'page-7',
          timeSpentSeconds: 2600,
          lastAccessedAt: '2026-01-08T10:45:00.000Z'
        }
      }
    },

    permissions: ['update:attempts', 'authenticated'],

    notes: `
      - Sets attempt status to 'suspended'
      - Stores state data for resuming later
      - Updates totalTime with sessionTime
      - Cannot suspend completed/passed/failed attempts
      - For SCORM: stores cmi.suspend_data
      - For non-SCORM: stores generic state data
      - Learner can resume this attempt later
      - Creates suspend LearningEvent
      - Maximum suspend_data size: 4096 characters (SCORM 1.2 limit)
    `
  },

  /**
   * Resume Content Attempt
   * Resume a suspended attempt
   */
  resume: {
    endpoint: '/api/v2/content-attempts/:id/resume',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Resume a suspended attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      },
      body: {}
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          message: 'string',
          data: {
            id: 'string',
            status: 'in-progress',
            suspendData: 'string | null',
            location: 'string | null',
            cmiData: 'object | null',
            launchUrl: 'string | null',
            lastAccessedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot resume this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found' },
        { status: 409, code: 'INVALID_STATE', message: 'Attempt is not suspended' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' }
      },
      response: {
        success: true,
        message: 'Attempt resumed successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          status: 'in-progress',
          suspendData: 'bookmark=page7;quiz1Complete=true;score=85',
          location: 'page-7',
          cmiData: {
            'cmi.core.lesson_status': 'incomplete',
            'cmi.core.lesson_location': 'page-7',
            'cmi.suspend_data': 'bookmark=page7;quiz1Complete=true;score=85'
          },
          launchUrl: '/scorm/507f1f77bcf86cd799439015/launch?attempt=507f1f77bcf86cd799439020',
          lastAccessedAt: '2026-01-08T11:00:00.000Z'
        }
      }
    },

    permissions: ['update:attempts', 'authenticated'],

    notes: `
      - Changes status from 'suspended' to 'in-progress'
      - Returns suspendData and location for state restoration
      - For SCORM: returns full CMI data including suspend_data
      - Updates lastAccessedAt timestamp
      - Can only resume attempts with status 'suspended'
      - Returns launchUrl for SCORM content
      - Creates resume LearningEvent
      - SCORM player uses this to restore learner state
    `
  },

  /**
   * Delete Content Attempt
   * Delete an attempt (admin only - typically soft delete)
   */
  delete: {
    endpoint: '/api/v2/content-attempts/:id',
    method: 'DELETE' as const,
    version: '1.0.0',
    description: 'Delete a content attempt (admin only)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'string',
          required: true,
          description: 'Attempt ID'
        }
      },
      query: {
        permanent: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Permanently delete (hard delete) - use with caution'
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
            deleted: 'boolean',
            deletedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to delete attempts' },
        { status: 404, code: 'NOT_FOUND', message: 'Attempt not found' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        query: { permanent: false }
      },
      response: {
        success: true,
        message: 'Attempt deleted successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          deleted: true,
          deletedAt: '2026-01-08T11:00:00.000Z'
        }
      }
    },

    permissions: ['delete:attempts', 'admin'],

    notes: `
      - By default performs soft delete (marks as deleted, preserves data)
      - permanent=true performs hard delete (removes from database)
      - Only admins can delete attempts
      - Learners cannot delete their own attempts
      - Soft deleted attempts don't appear in normal queries
      - Hard delete is irreversible - use with caution
      - Creates audit log entry for deletion
      - Does not delete associated LearningEvents (historical record)
      - Updates enrollment progress if needed
    `
  }
};

// Type exports for consumers
export type ContentAttemptsContractType = typeof ContentAttemptsContracts;
export type ContentAttemptListRequest = typeof ContentAttemptsContracts.list.request;
export type ContentAttemptListResponse = typeof ContentAttemptsContracts.list.example.response;
export type ContentAttemptCreateRequest = typeof ContentAttemptsContracts.create.example.request;
export type ContentAttemptCreateResponse = typeof ContentAttemptsContracts.create.example.response;
export type ContentAttemptDetailsResponse = typeof ContentAttemptsContracts.getById.example.response;
export type ContentAttemptUpdateRequest = typeof ContentAttemptsContracts.update.example.request;
export type ContentAttemptCompleteRequest = typeof ContentAttemptsContracts.complete.example.request;
export type CmiDataResponse = typeof ContentAttemptsContracts.getCmiData.example.response;
export type UpdateCmiDataRequest = typeof ContentAttemptsContracts.updateCmiData.example.request;
