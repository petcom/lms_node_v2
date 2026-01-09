/**
 * Progress Tracking API Contracts
 * Version: 1.0.0
 *
 * These contracts define the progress tracking endpoints for the LMS API.
 * Progress tracking is the #1 PRIORITY feature for learner engagement.
 * Both backend and UI teams use these as the source of truth.
 */

export const ProgressContract = {
  /**
   * Get Program Progress
   */
  getProgramProgress: {
    endpoint: '/api/v2/progress/program/:programId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get learner progress for a specific program',

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
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Specific learner ID (staff only, defaults to current user for learners)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            programId: 'ObjectId',
            programName: 'string',
            programCode: 'string',
            learnerId: 'ObjectId',
            learnerName: 'string',
            enrolledAt: 'Date',
            status: 'not_started|in_progress|completed',
            overallProgress: {
              completionPercent: 'number',
              creditsEarned: 'number',
              creditsRequired: 'number',
              coursesCompleted: 'number',
              coursesTotal: 'number',
              timeSpent: 'number',
              lastActivityAt: 'Date | null',
              estimatedCompletionDate: 'Date | null'
            },
            levelProgress: [
              {
                levelId: 'ObjectId',
                levelName: 'string',
                levelNumber: 'number',
                status: 'not_started|in_progress|completed',
                coursesCompleted: 'number',
                coursesTotal: 'number',
                completionPercent: 'number'
              }
            ],
            courseProgress: [
              {
                courseId: 'ObjectId',
                courseTitle: 'string',
                courseCode: 'string',
                levelId: 'ObjectId',
                levelNumber: 'number',
                status: 'not_started|in_progress|completed',
                completionPercent: 'number',
                score: 'number | null',
                creditsEarned: 'number',
                timeSpent: 'number',
                enrolledAt: 'Date',
                startedAt: 'Date | null',
                completedAt: 'Date | null',
                lastAccessedAt: 'Date | null'
              }
            ],
            milestones: [
              {
                id: 'string',
                name: 'string',
                description: 'string',
                achieved: 'boolean',
                achievedAt: 'Date | null',
                progress: 'number'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this progress' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Learner not enrolled in this program' }
      ]
    },

    example: {
      request: {
        params: {
          programId: '507f1f77bcf86cd799439015'
        }
      },
      response: {
        success: true,
        data: {
          programId: '507f1f77bcf86cd799439015',
          programName: 'Cognitive Behavioral Therapy Certificate',
          programCode: 'CBT-CERT',
          learnerId: '507f1f77bcf86cd799439030',
          learnerName: 'John Doe',
          enrolledAt: '2026-01-01T00:00:00Z',
          status: 'in_progress',
          overallProgress: {
            completionPercent: 65,
            creditsEarned: 12,
            creditsRequired: 18,
            coursesCompleted: 4,
            coursesTotal: 6,
            timeSpent: 86400,
            lastActivityAt: '2026-01-08T08:30:00Z',
            estimatedCompletionDate: '2026-05-15T00:00:00Z'
          },
          levelProgress: [
            {
              levelId: '507f1f77bcf86cd799439016',
              levelName: 'Level 1 - Foundations',
              levelNumber: 1,
              status: 'completed',
              coursesCompleted: 3,
              coursesTotal: 3,
              completionPercent: 100
            },
            {
              levelId: '507f1f77bcf86cd799439017',
              levelName: 'Level 2 - Advanced',
              levelNumber: 2,
              status: 'in_progress',
              coursesCompleted: 1,
              coursesTotal: 3,
              completionPercent: 33
            }
          ],
          courseProgress: [
            {
              courseId: '507f1f77bcf86cd799439018',
              courseTitle: 'CBT Fundamentals',
              courseCode: 'CBT101',
              levelId: '507f1f77bcf86cd799439016',
              levelNumber: 1,
              status: 'completed',
              completionPercent: 100,
              score: 85,
              creditsEarned: 3,
              timeSpent: 14400,
              enrolledAt: '2026-01-01T00:00:00Z',
              startedAt: '2026-01-02T09:00:00Z',
              completedAt: '2026-01-15T16:30:00Z',
              lastAccessedAt: '2026-01-15T16:30:00Z'
            },
            {
              courseId: '507f1f77bcf86cd799439019',
              courseTitle: 'Advanced CBT Techniques',
              courseCode: 'CBT201',
              levelId: '507f1f77bcf86cd799439017',
              levelNumber: 2,
              status: 'in_progress',
              completionPercent: 45,
              score: 78,
              creditsEarned: 0,
              timeSpent: 7200,
              enrolledAt: '2026-01-16T00:00:00Z',
              startedAt: '2026-01-17T10:00:00Z',
              completedAt: null,
              lastAccessedAt: '2026-01-08T08:30:00Z'
            }
          ],
          milestones: [
            {
              id: 'level_1_complete',
              name: 'Level 1 Complete',
              description: 'Complete all Level 1 courses',
              achieved: true,
              achievedAt: '2026-01-15T16:30:00Z',
              progress: 100
            },
            {
              id: 'halfway_point',
              name: 'Halfway There',
              description: 'Complete 50% of program',
              achieved: true,
              achievedAt: '2026-01-05T12:00:00Z',
              progress: 100
            },
            {
              id: 'full_completion',
              name: 'Certificate Completion',
              description: 'Complete all program courses',
              achieved: false,
              achievedAt: null,
              progress: 65
            }
          ]
        }
      }
    },

    permissions: ['read:progress', 'learner (own progress)', 'staff (any learner in department)'],

    notes: `
      - Learners can only view their own progress
      - Staff can view progress for learners in their departments
      - Global admins can view any learner's progress
      - completionPercent is 0-100 (integer percentage)
      - timeSpent is in seconds
      - estimatedCompletionDate calculated based on current pace and remaining work
      - status automatically derived from progress:
        - not_started: 0% progress
        - in_progress: >0% and <100% progress
        - completed: 100% progress
      - creditsEarned only counted from completed courses
      - Milestones are program-defined achievements
      - lastActivityAt tracks most recent content access across all courses
    `
  },

  /**
   * Get Course Progress
   */
  getCourseProgress: {
    endpoint: '/api/v2/progress/course/:courseId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed progress for a specific course',

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
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Specific learner ID (staff only, defaults to current user)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            courseId: 'ObjectId',
            courseTitle: 'string',
            courseCode: 'string',
            learnerId: 'ObjectId',
            learnerName: 'string',
            enrolledAt: 'Date',
            startedAt: 'Date | null',
            completedAt: 'Date | null',
            status: 'not_started|in_progress|completed',
            overallProgress: {
              completionPercent: 'number',
              modulesCompleted: 'number',
              modulesTotal: 'number',
              score: 'number | null',
              timeSpent: 'number',
              lastAccessedAt: 'Date | null',
              daysActive: 'number',
              streak: 'number'
            },
            moduleProgress: [
              {
                moduleId: 'ObjectId',
                moduleTitle: 'string',
                moduleType: 'scorm|custom|exercise|video|document',
                order: 'number',
                status: 'not_started|in_progress|completed',
                completionPercent: 'number',
                score: 'number | null',
                timeSpent: 'number',
                attempts: 'number',
                bestAttemptScore: 'number | null',
                lastAttemptScore: 'number | null',
                startedAt: 'Date | null',
                completedAt: 'Date | null',
                lastAccessedAt: 'Date | null',
                isRequired: 'boolean',
                passingScore: 'number | null',
                passed: 'boolean | null'
              }
            ],
            assessments: [
              {
                assessmentId: 'ObjectId',
                title: 'string',
                type: 'quiz|exam|assignment',
                status: 'not_started|in_progress|completed|grading',
                score: 'number | null',
                maxScore: 'number',
                passingScore: 'number',
                passed: 'boolean | null',
                attempts: 'number',
                maxAttempts: 'number | null',
                lastAttemptAt: 'Date | null',
                submittedAt: 'Date | null',
                gradedAt: 'Date | null'
              }
            ],
            activityLog: [
              {
                timestamp: 'Date',
                eventType: 'started|accessed|progress|completed',
                moduleId: 'ObjectId | null',
                moduleTitle: 'string | null',
                details: 'string'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this progress' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Learner not enrolled in this course' }
      ]
    },

    example: {
      request: {
        params: {
          courseId: '507f1f77bcf86cd799439018'
        }
      },
      response: {
        success: true,
        data: {
          courseId: '507f1f77bcf86cd799439018',
          courseTitle: 'CBT Fundamentals',
          courseCode: 'CBT101',
          learnerId: '507f1f77bcf86cd799439030',
          learnerName: 'John Doe',
          enrolledAt: '2026-01-01T00:00:00Z',
          startedAt: '2026-01-02T09:00:00Z',
          completedAt: null,
          status: 'in_progress',
          overallProgress: {
            completionPercent: 65,
            modulesCompleted: 3,
            modulesTotal: 5,
            score: 82,
            timeSpent: 14400,
            lastAccessedAt: '2026-01-08T08:30:00Z',
            daysActive: 7,
            streak: 3
          },
          moduleProgress: [
            {
              moduleId: '507f1f77bcf86cd799439040',
              moduleTitle: 'Introduction to CBT',
              moduleType: 'scorm',
              order: 1,
              status: 'completed',
              completionPercent: 100,
              score: 95,
              timeSpent: 3600,
              attempts: 1,
              bestAttemptScore: 95,
              lastAttemptScore: 95,
              startedAt: '2026-01-02T09:00:00Z',
              completedAt: '2026-01-02T10:30:00Z',
              lastAccessedAt: '2026-01-02T10:30:00Z',
              isRequired: true,
              passingScore: 70,
              passed: true
            },
            {
              moduleId: '507f1f77bcf86cd799439041',
              moduleTitle: 'Cognitive Techniques',
              moduleType: 'custom',
              order: 2,
              status: 'completed',
              completionPercent: 100,
              score: 88,
              timeSpent: 4200,
              attempts: 2,
              bestAttemptScore: 88,
              lastAttemptScore: 88,
              startedAt: '2026-01-03T10:00:00Z',
              completedAt: '2026-01-03T14:30:00Z',
              lastAccessedAt: '2026-01-03T14:30:00Z',
              isRequired: true,
              passingScore: 70,
              passed: true
            },
            {
              moduleId: '507f1f77bcf86cd799439042',
              moduleTitle: 'Behavioral Interventions',
              moduleType: 'video',
              order: 3,
              status: 'in_progress',
              completionPercent: 60,
              score: null,
              timeSpent: 2400,
              attempts: 1,
              bestAttemptScore: null,
              lastAttemptScore: null,
              startedAt: '2026-01-08T08:00:00Z',
              completedAt: null,
              lastAccessedAt: '2026-01-08T08:30:00Z',
              isRequired: true,
              passingScore: null,
              passed: null
            },
            {
              moduleId: '507f1f77bcf86cd799439043',
              moduleTitle: 'Case Studies',
              moduleType: 'document',
              order: 4,
              status: 'not_started',
              completionPercent: 0,
              score: null,
              timeSpent: 0,
              attempts: 0,
              bestAttemptScore: null,
              lastAttemptScore: null,
              startedAt: null,
              completedAt: null,
              lastAccessedAt: null,
              isRequired: true,
              passingScore: null,
              passed: null
            },
            {
              moduleId: '507f1f77bcf86cd799439044',
              moduleTitle: 'Final Assessment',
              moduleType: 'exercise',
              order: 5,
              status: 'not_started',
              completionPercent: 0,
              score: null,
              timeSpent: 0,
              attempts: 0,
              bestAttemptScore: null,
              lastAttemptScore: null,
              startedAt: null,
              completedAt: null,
              lastAccessedAt: null,
              isRequired: true,
              passingScore: 80,
              passed: null
            }
          ],
          assessments: [
            {
              assessmentId: '507f1f77bcf86cd799439050',
              title: 'Module 1 Quiz',
              type: 'quiz',
              status: 'completed',
              score: 95,
              maxScore: 100,
              passingScore: 70,
              passed: true,
              attempts: 1,
              maxAttempts: 3,
              lastAttemptAt: '2026-01-02T10:30:00Z',
              submittedAt: '2026-01-02T10:30:00Z',
              gradedAt: '2026-01-02T10:30:00Z'
            },
            {
              assessmentId: '507f1f77bcf86cd799439051',
              title: 'Module 2 Quiz',
              type: 'quiz',
              status: 'completed',
              score: 88,
              maxScore: 100,
              passingScore: 70,
              passed: true,
              attempts: 2,
              maxAttempts: 3,
              lastAttemptAt: '2026-01-03T14:30:00Z',
              submittedAt: '2026-01-03T14:30:00Z',
              gradedAt: '2026-01-03T14:30:00Z'
            },
            {
              assessmentId: '507f1f77bcf86cd799439052',
              title: 'Final Exam',
              type: 'exam',
              status: 'not_started',
              score: null,
              maxScore: 100,
              passingScore: 80,
              passed: null,
              attempts: 0,
              maxAttempts: 2,
              lastAttemptAt: null,
              submittedAt: null,
              gradedAt: null
            }
          ],
          activityLog: [
            {
              timestamp: '2026-01-08T08:30:00Z',
              eventType: 'progress',
              moduleId: '507f1f77bcf86cd799439042',
              moduleTitle: 'Behavioral Interventions',
              details: 'Progress updated to 60%'
            },
            {
              timestamp: '2026-01-08T08:00:00Z',
              eventType: 'accessed',
              moduleId: '507f1f77bcf86cd799439042',
              moduleTitle: 'Behavioral Interventions',
              details: 'Module accessed'
            },
            {
              timestamp: '2026-01-03T14:30:00Z',
              eventType: 'completed',
              moduleId: '507f1f77bcf86cd799439041',
              moduleTitle: 'Cognitive Techniques',
              details: 'Module completed with score 88'
            }
          ]
        }
      }
    },

    permissions: ['read:progress', 'learner (own progress)', 'staff (enrolled as instructor or department access)'],

    notes: `
      - Returns detailed module-by-module breakdown
      - Learners can only view their own course progress
      - Instructors can view progress for their assigned courses
      - Staff can view progress for courses in their departments
      - completionPercent calculated from required modules only
      - score is weighted average of all scored assessments
      - timeSpent aggregated from all module attempts
      - daysActive counts unique days with any course activity
      - streak counts consecutive days with activity (resets if day missed)
      - passed is true if score >= passingScore, null if not yet graded
      - activityLog shows recent 10 events (use separate endpoint for full log)
      - Module types: scorm, custom, exercise, video, document
    `
  },

  /**
   * Get Class Progress
   */
  getClassProgress: {
    endpoint: '/api/v2/progress/class/:classId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get progress for a specific class with attendance tracking',

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
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Specific learner ID (staff only, defaults to current user)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            classId: 'ObjectId',
            className: 'string',
            courseId: 'ObjectId',
            courseTitle: 'string',
            learnerId: 'ObjectId',
            learnerName: 'string',
            enrolledAt: 'Date',
            status: 'not_started|in_progress|completed',
            courseProgress: {
              completionPercent: 'number',
              modulesCompleted: 'number',
              modulesTotal: 'number',
              score: 'number | null',
              timeSpent: 'number',
              lastAccessedAt: 'Date | null'
            },
            attendance: {
              sessionsAttended: 'number',
              totalSessions: 'number',
              attendanceRate: 'number',
              sessions: [
                {
                  sessionId: 'ObjectId',
                  sessionDate: 'Date',
                  sessionTitle: 'string',
                  attended: 'boolean',
                  markedAt: 'Date | null',
                  markedBy: 'ObjectId | null',
                  notes: 'string | null'
                }
              ]
            },
            assignments: [
              {
                assignmentId: 'ObjectId',
                title: 'string',
                dueDate: 'Date',
                status: 'not_submitted|submitted|graded|late',
                submittedAt: 'Date | null',
                grade: 'number | null',
                maxGrade: 'number',
                feedback: 'string | null',
                isLate: 'boolean'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this progress' },
        { status: 404, code: 'CLASS_NOT_FOUND', message: 'Class not found' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Learner not enrolled in this class' }
      ]
    },

    example: {
      request: {
        params: {
          classId: '507f1f77bcf86cd799439020'
        }
      },
      response: {
        success: true,
        data: {
          classId: '507f1f77bcf86cd799439020',
          className: 'CBT Fundamentals - Spring 2026',
          courseId: '507f1f77bcf86cd799439018',
          courseTitle: 'CBT Fundamentals',
          learnerId: '507f1f77bcf86cd799439030',
          learnerName: 'John Doe',
          enrolledAt: '2026-01-05T09:00:00Z',
          status: 'in_progress',
          courseProgress: {
            completionPercent: 65,
            modulesCompleted: 3,
            modulesTotal: 5,
            score: 85,
            timeSpent: 14400,
            lastAccessedAt: '2026-01-08T08:30:00Z'
          },
          attendance: {
            sessionsAttended: 8,
            totalSessions: 10,
            attendanceRate: 0.8,
            sessions: [
              {
                sessionId: '507f1f77bcf86cd799439060',
                sessionDate: '2026-02-01T10:00:00Z',
                sessionTitle: 'Session 1: Introduction',
                attended: true,
                markedAt: '2026-02-01T10:05:00Z',
                markedBy: '507f1f77bcf86cd799439012',
                notes: null
              },
              {
                sessionId: '507f1f77bcf86cd799439061',
                sessionDate: '2026-02-08T10:00:00Z',
                sessionTitle: 'Session 2: Core Concepts',
                attended: true,
                markedAt: '2026-02-08T10:05:00Z',
                markedBy: '507f1f77bcf86cd799439012',
                notes: null
              },
              {
                sessionId: '507f1f77bcf86cd799439062',
                sessionDate: '2026-02-15T10:00:00Z',
                sessionTitle: 'Session 3: Practical Applications',
                attended: false,
                markedAt: '2026-02-15T10:05:00Z',
                markedBy: '507f1f77bcf86cd799439012',
                notes: 'Excused absence - medical'
              }
            ]
          },
          assignments: [
            {
              assignmentId: '507f1f77bcf86cd799439070',
              title: 'Case Study Analysis',
              dueDate: '2026-02-20T23:59:59Z',
              status: 'graded',
              submittedAt: '2026-02-19T15:30:00Z',
              grade: 92,
              maxGrade: 100,
              feedback: 'Excellent analysis of CBT techniques applied to the case.',
              isLate: false
            },
            {
              assignmentId: '507f1f77bcf86cd799439071',
              title: 'Treatment Plan Development',
              dueDate: '2026-03-15T23:59:59Z',
              status: 'not_submitted',
              submittedAt: null,
              grade: null,
              maxGrade: 100,
              feedback: null,
              isLate: false
            }
          ]
        }
      }
    },

    permissions: ['read:progress', 'learner (own progress)', 'instructor of class', 'staff with department access'],

    notes: `
      - Class progress includes both online course progress and classroom attendance
      - Attendance tracking only available for classroom/hybrid delivery methods
      - attendanceRate is decimal (0.0 to 1.0) representing percentage attended
      - Sessions can be marked attended/absent by instructor
      - Assignments are class-specific (different from course-level assessments)
      - isLate flag indicates submission after due date
      - Learners can view their own class progress
      - Instructors can view progress for their assigned classes
      - Staff can view progress for classes in their departments
    `
  },

  /**
   * Get Learner Overall Progress
   */
  getLearnerProgress: {
    endpoint: '/api/v2/progress/learner/:learnerId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get comprehensive progress overview for a learner across all enrollments',

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
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            learnerId: 'ObjectId',
            learnerName: 'string',
            learnerEmail: 'string',
            summary: {
              programsEnrolled: 'number',
              programsCompleted: 'number',
              coursesEnrolled: 'number',
              coursesCompleted: 'number',
              classesEnrolled: 'number',
              totalCreditsEarned: 'number',
              totalTimeSpent: 'number',
              averageScore: 'number',
              currentStreak: 'number',
              longestStreak: 'number',
              lastActivityAt: 'Date | null',
              joinedAt: 'Date'
            },
            programProgress: [
              {
                programId: 'ObjectId',
                programName: 'string',
                programCode: 'string',
                status: 'not_started|in_progress|completed',
                completionPercent: 'number',
                creditsEarned: 'number',
                creditsRequired: 'number',
                enrolledAt: 'Date',
                completedAt: 'Date | null',
                lastAccessedAt: 'Date | null'
              }
            ],
            courseProgress: [
              {
                courseId: 'ObjectId',
                courseTitle: 'string',
                courseCode: 'string',
                programId: 'ObjectId | null',
                programName: 'string | null',
                status: 'not_started|in_progress|completed',
                completionPercent: 'number',
                score: 'number | null',
                creditsEarned: 'number',
                enrolledAt: 'Date',
                completedAt: 'Date | null',
                lastAccessedAt: 'Date | null'
              }
            ],
            recentActivity: [
              {
                timestamp: 'Date',
                activityType: 'course_started|module_completed|assessment_submitted|program_completed',
                resourceId: 'ObjectId',
                resourceType: 'course|module|assessment|program',
                resourceTitle: 'string',
                details: 'string'
              }
            ],
            achievements: [
              {
                id: 'string',
                type: 'program_completion|course_completion|perfect_score|streak|milestone',
                title: 'string',
                description: 'string',
                earnedAt: 'Date',
                badge: 'string | null'
              }
            ]
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this learner progress' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {
        params: {
          learnerId: '507f1f77bcf86cd799439030'
        }
      },
      response: {
        success: true,
        data: {
          learnerId: '507f1f77bcf86cd799439030',
          learnerName: 'John Doe',
          learnerEmail: 'john.doe@example.com',
          summary: {
            programsEnrolled: 2,
            programsCompleted: 0,
            coursesEnrolled: 8,
            coursesCompleted: 4,
            classesEnrolled: 3,
            totalCreditsEarned: 12,
            totalTimeSpent: 172800,
            averageScore: 82,
            currentStreak: 5,
            longestStreak: 12,
            lastActivityAt: '2026-01-08T08:30:00Z',
            joinedAt: '2025-09-01T00:00:00Z'
          },
          programProgress: [
            {
              programId: '507f1f77bcf86cd799439015',
              programName: 'Cognitive Behavioral Therapy Certificate',
              programCode: 'CBT-CERT',
              status: 'in_progress',
              completionPercent: 65,
              creditsEarned: 12,
              creditsRequired: 18,
              enrolledAt: '2026-01-01T00:00:00Z',
              completedAt: null,
              lastAccessedAt: '2026-01-08T08:30:00Z'
            },
            {
              programId: '507f1f77bcf86cd799439080',
              programName: 'Mental Health First Aid',
              programCode: 'MHFA',
              status: 'not_started',
              completionPercent: 0,
              creditsEarned: 0,
              creditsRequired: 6,
              enrolledAt: '2026-01-07T00:00:00Z',
              completedAt: null,
              lastAccessedAt: null
            }
          ],
          courseProgress: [
            {
              courseId: '507f1f77bcf86cd799439018',
              courseTitle: 'CBT Fundamentals',
              courseCode: 'CBT101',
              programId: '507f1f77bcf86cd799439015',
              programName: 'Cognitive Behavioral Therapy Certificate',
              status: 'in_progress',
              completionPercent: 65,
              score: 82,
              creditsEarned: 0,
              enrolledAt: '2026-01-01T00:00:00Z',
              completedAt: null,
              lastAccessedAt: '2026-01-08T08:30:00Z'
            },
            {
              courseId: '507f1f77bcf86cd799439081',
              courseTitle: 'Introduction to Psychology',
              courseCode: 'PSY101',
              programId: '507f1f77bcf86cd799439015',
              programName: 'Cognitive Behavioral Therapy Certificate',
              status: 'completed',
              completionPercent: 100,
              score: 88,
              creditsEarned: 3,
              enrolledAt: '2025-09-01T00:00:00Z',
              completedAt: '2025-10-15T16:30:00Z',
              lastAccessedAt: '2025-10-15T16:30:00Z'
            }
          ],
          recentActivity: [
            {
              timestamp: '2026-01-08T08:30:00Z',
              activityType: 'module_completed',
              resourceId: '507f1f77bcf86cd799439042',
              resourceType: 'module',
              resourceTitle: 'Behavioral Interventions',
              details: 'Completed with 60% progress'
            },
            {
              timestamp: '2026-01-07T15:20:00Z',
              activityType: 'assessment_submitted',
              resourceId: '507f1f77bcf86cd799439051',
              resourceType: 'assessment',
              resourceTitle: 'Module 2 Quiz',
              details: 'Score: 88/100'
            },
            {
              timestamp: '2026-01-05T12:00:00Z',
              activityType: 'course_started',
              resourceId: '507f1f77bcf86cd799439018',
              resourceType: 'course',
              resourceTitle: 'CBT Fundamentals',
              details: 'Enrolled in course'
            }
          ],
          achievements: [
            {
              id: 'first_course_complete',
              type: 'course_completion',
              title: 'First Course Complete',
              description: 'Complete your first course',
              earnedAt: '2025-10-15T16:30:00Z',
              badge: 'https://cdn.example.com/badges/first-course.png'
            },
            {
              id: 'perfect_score',
              type: 'perfect_score',
              title: 'Perfect Score',
              description: 'Score 100% on an assessment',
              earnedAt: '2025-11-20T10:00:00Z',
              badge: 'https://cdn.example.com/badges/perfect-score.png'
            },
            {
              id: 'week_streak',
              type: 'streak',
              title: '7 Day Streak',
              description: 'Learn for 7 consecutive days',
              earnedAt: '2026-01-08T00:00:00Z',
              badge: 'https://cdn.example.com/badges/7-day-streak.png'
            }
          ]
        }
      }
    },

    permissions: ['read:progress', 'learner (own progress)', 'staff with department access', 'global-admin'],

    notes: `
      - Provides comprehensive overview of learner's entire learning journey
      - Learners can view their own overall progress
      - Staff can view learners in their departments
      - Global admins can view any learner
      - summary.currentStreak counts consecutive days with activity
      - summary.longestStreak is the all-time record
      - totalTimeSpent aggregated across all courses (in seconds)
      - averageScore calculated from all completed assessments across all courses
      - recentActivity shows last 20 activities
      - achievements are system-generated based on milestones
      - programProgress only includes programs learner is enrolled in
      - courseProgress includes both program courses and standalone enrollments
    `
  },

  /**
   * Get Learner Progress in Specific Program
   */
  getLearnerProgramProgress: {
    endpoint: '/api/v2/progress/learner/:learnerId/program/:programId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed progress for a specific learner in a specific program',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        },
        programId: {
          type: 'ObjectId',
          required: true,
          description: 'Program ID'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            /* Same structure as getProgramProgress response */
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view this progress' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Learner not enrolled in this program' }
      ]
    },

    example: {
      request: {
        params: {
          learnerId: '507f1f77bcf86cd799439030',
          programId: '507f1f77bcf86cd799439015'
        }
      },
      response: {
        /* Same as getProgramProgress example */
      }
    },

    permissions: ['read:progress', 'staff with department access', 'instructor for program courses', 'global-admin'],

    notes: `
      - Staff endpoint to view specific learner's progress in a program
      - Returns same data structure as GET /progress/program/:programId
      - Staff can view learners in their departments
      - Instructors can view progress for their assigned courses within the program
      - Global admins can view any learner's progress
      - Useful for advisor/counselor dashboards
    `
  },

  /**
   * Manual Progress Update
   */
  updateProgress: {
    endpoint: '/api/v2/progress/update',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Manually update learner progress (instructor/admin override)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner user ID'
        },
        enrollmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Course enrollment ID'
        },
        moduleId: {
          type: 'ObjectId',
          required: false,
          description: 'Specific module ID (optional)'
        },
        action: {
          type: 'string',
          required: true,
          enum: ['mark_complete', 'mark_incomplete', 'override_score', 'reset_progress'],
          description: 'Progress action to perform'
        },
        score: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Score override (required for override_score action)'
        },
        reason: {
          type: 'string',
          required: true,
          minLength: 10,
          maxLength: 500,
          description: 'Reason for manual override (audit trail)'
        },
        notifyLearner: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Send notification to learner about the change'
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
            enrollmentId: 'ObjectId',
            moduleId: 'ObjectId | null',
            action: 'string',
            previousProgress: 'number',
            newProgress: 'number',
            previousScore: 'number | null',
            newScore: 'number | null',
            updatedAt: 'Date',
            updatedBy: {
              id: 'ObjectId',
              name: 'string',
              role: 'string'
            }
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to update progress' },
        { status: 404, code: 'ENROLLMENT_NOT_FOUND', message: 'Enrollment not found' },
        { status: 404, code: 'MODULE_NOT_FOUND', message: 'Module not found' }
      ]
    },

    example: {
      request: {
        learnerId: '507f1f77bcf86cd799439030',
        enrollmentId: '507f1f77bcf86cd799439090',
        moduleId: '507f1f77bcf86cd799439042',
        action: 'mark_complete',
        reason: 'Student completed work offline, manually verified by instructor'
      },
      response: {
        success: true,
        message: 'Progress updated successfully',
        data: {
          enrollmentId: '507f1f77bcf86cd799439090',
          moduleId: '507f1f77bcf86cd799439042',
          action: 'mark_complete',
          previousProgress: 60,
          newProgress: 100,
          previousScore: null,
          newScore: null,
          updatedAt: '2026-01-08T10:30:00Z',
          updatedBy: {
            id: '507f1f77bcf86cd799439012',
            name: 'Dr. Sarah Johnson',
            role: 'instructor'
          }
        }
      }
    },

    permissions: ['write:progress', 'instructor for course', 'staff with department access', 'global-admin'],

    notes: `
      - Allows instructors to manually override progress tracking
      - All manual updates are logged in audit trail
      - reason field is required for accountability
      - Actions:
        - mark_complete: Set module/course to 100% complete
        - mark_incomplete: Reset module/course to incomplete
        - override_score: Manually set score (requires score parameter)
        - reset_progress: Reset all progress for enrollment (destructive)
      - Instructors can only update progress for their assigned courses
      - Staff can update progress for courses in their departments
      - Global admins can update any progress
      - notifyLearner sends email notification about the change
      - Use with caution - manual overrides can affect completion tracking
    `
  },

  /**
   * Progress Summary Report
   */
  getProgressSummary: {
    endpoint: '/api/v2/progress/reports/summary',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get progress summary report with filtering options',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        programId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by program'
        },
        courseId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by course'
        },
        classId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by class'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['not_started', 'in_progress', 'completed'],
          description: 'Filter by progress status'
        },
        startDate: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments after this date'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments before this date'
        },
        minProgress: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Minimum completion percentage'
        },
        maxProgress: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Maximum completion percentage'
        },
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
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            filters: {
              programId: 'ObjectId | null',
              courseId: 'ObjectId | null',
              classId: 'ObjectId | null',
              departmentId: 'ObjectId | null',
              status: 'string | null',
              dateRange: {
                start: 'Date | null',
                end: 'Date | null'
              }
            },
            summary: {
              totalLearners: 'number',
              averageProgress: 'number',
              averageScore: 'number',
              completedCount: 'number',
              inProgressCount: 'number',
              notStartedCount: 'number',
              totalTimeSpent: 'number'
            },
            learners: [
              {
                learnerId: 'ObjectId',
                learnerName: 'string',
                learnerEmail: 'string',
                enrolledAt: 'Date',
                status: 'not_started|in_progress|completed',
                completionPercent: 'number',
                score: 'number | null',
                timeSpent: 'number',
                lastAccessedAt: 'Date | null',
                completedAt: 'Date | null'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view reports' }
      ]
    },

    example: {
      request: {
        query: {
          programId: '507f1f77bcf86cd799439015',
          status: 'in_progress',
          minProgress: 50,
          page: 1,
          limit: 50
        }
      },
      response: {
        success: true,
        data: {
          filters: {
            programId: '507f1f77bcf86cd799439015',
            courseId: null,
            classId: null,
            departmentId: null,
            status: 'in_progress',
            dateRange: {
              start: null,
              end: null
            }
          },
          summary: {
            totalLearners: 45,
            averageProgress: 68,
            averageScore: 78,
            completedCount: 0,
            inProgressCount: 45,
            notStartedCount: 0,
            totalTimeSpent: 648000
          },
          learners: [
            {
              learnerId: '507f1f77bcf86cd799439030',
              learnerName: 'John Doe',
              learnerEmail: 'john.doe@example.com',
              enrolledAt: '2026-01-01T00:00:00Z',
              status: 'in_progress',
              completionPercent: 65,
              score: 82,
              timeSpent: 14400,
              lastAccessedAt: '2026-01-08T08:30:00Z',
              completedAt: null
            },
            {
              learnerId: '507f1f77bcf86cd799439031',
              learnerName: 'Jane Smith',
              learnerEmail: 'jane.smith@example.com',
              enrolledAt: '2026-01-02T00:00:00Z',
              status: 'in_progress',
              completionPercent: 72,
              score: 85,
              timeSpent: 16200,
              lastAccessedAt: '2026-01-08T09:15:00Z',
              completedAt: null
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 45,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:reports', 'staff with department access', 'instructor', 'global-admin'],

    notes: `
      - Provides filterable progress report for administrators and staff
      - Staff can only see learners in their departments
      - Instructors can see learners in their assigned courses/classes
      - Multiple filters can be combined
      - Results are paginated (default 50, max 200 per page)
      - Sorted by completionPercent descending by default
      - averageProgress and averageScore calculated from filtered results
      - totalTimeSpent aggregated across all filtered learners
      - Use for dashboard analytics and progress monitoring
    `
  },

  /**
   * Detailed Progress Report
   */
  getDetailedProgressReport: {
    endpoint: '/api/v2/progress/reports/detailed',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed progress report with module-level breakdown',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        programId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by program'
        },
        courseId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by course'
        },
        classId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by class'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        },
        learnerIds: {
          type: 'ObjectId[]',
          required: false,
          description: 'Specific learner IDs (comma-separated)'
        },
        format: {
          type: 'string',
          required: false,
          default: 'json',
          enum: ['json', 'csv', 'xlsx'],
          description: 'Report format'
        },
        includeModules: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include module-level breakdown'
        },
        includeAssessments: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include assessment results'
        },
        includeAttendance: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include attendance records (class-based only)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            reportId: 'string',
            generatedAt: 'Date',
            generatedBy: {
              id: 'ObjectId',
              name: 'string'
            },
            filters: {
              programId: 'ObjectId | null',
              courseId: 'ObjectId | null',
              classId: 'ObjectId | null',
              departmentId: 'ObjectId | null',
              learnerIds: 'ObjectId[]'
            },
            learnerDetails: [
              {
                learnerId: 'ObjectId',
                learnerName: 'string',
                learnerEmail: 'string',
                studentId: 'string | null',
                department: {
                  id: 'ObjectId',
                  name: 'string'
                },
                enrolledAt: 'Date',
                overallProgress: {
                  completionPercent: 'number',
                  score: 'number | null',
                  timeSpent: 'number',
                  status: 'not_started|in_progress|completed'
                },
                moduleProgress: [
                  {
                    moduleId: 'ObjectId',
                    moduleTitle: 'string',
                    moduleType: 'string',
                    order: 'number',
                    status: 'not_started|in_progress|completed',
                    completionPercent: 'number',
                    score: 'number | null',
                    timeSpent: 'number',
                    attempts: 'number',
                    startedAt: 'Date | null',
                    completedAt: 'Date | null',
                    lastAccessedAt: 'Date | null'
                  }
                ],
                assessmentResults: [
                  {
                    assessmentId: 'ObjectId',
                    title: 'string',
                    type: 'string',
                    score: 'number | null',
                    maxScore: 'number',
                    passed: 'boolean | null',
                    attempts: 'number',
                    submittedAt: 'Date | null',
                    gradedAt: 'Date | null'
                  }
                ],
                attendance: {
                  sessionsAttended: 'number',
                  totalSessions: 'number',
                  attendanceRate: 'number'
                }
              }
            ],
            downloadUrl: 'string | null'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to generate reports' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid filter parameters' }
      ]
    },

    example: {
      request: {
        query: {
          courseId: '507f1f77bcf86cd799439018',
          format: 'json',
          includeModules: true,
          includeAssessments: true
        }
      },
      response: {
        success: true,
        data: {
          reportId: 'RPT-2026-01-08-123456',
          generatedAt: '2026-01-08T10:30:00Z',
          generatedBy: {
            id: '507f1f77bcf86cd799439012',
            name: 'Dr. Sarah Johnson'
          },
          filters: {
            programId: null,
            courseId: '507f1f77bcf86cd799439018',
            classId: null,
            departmentId: null,
            learnerIds: []
          },
          learnerDetails: [
            {
              learnerId: '507f1f77bcf86cd799439030',
              learnerName: 'John Doe',
              learnerEmail: 'john.doe@example.com',
              studentId: 'STU-2026-001',
              department: {
                id: '507f1f77bcf86cd799439013',
                name: 'Clinical Psychology'
              },
              enrolledAt: '2026-01-01T00:00:00Z',
              overallProgress: {
                completionPercent: 65,
                score: 82,
                timeSpent: 14400,
                status: 'in_progress'
              },
              moduleProgress: [
                {
                  moduleId: '507f1f77bcf86cd799439040',
                  moduleTitle: 'Introduction to CBT',
                  moduleType: 'scorm',
                  order: 1,
                  status: 'completed',
                  completionPercent: 100,
                  score: 95,
                  timeSpent: 3600,
                  attempts: 1,
                  startedAt: '2026-01-02T09:00:00Z',
                  completedAt: '2026-01-02T10:30:00Z',
                  lastAccessedAt: '2026-01-02T10:30:00Z'
                },
                {
                  moduleId: '507f1f77bcf86cd799439041',
                  moduleTitle: 'Cognitive Techniques',
                  moduleType: 'custom',
                  order: 2,
                  status: 'in_progress',
                  completionPercent: 60,
                  score: null,
                  timeSpent: 2400,
                  attempts: 1,
                  startedAt: '2026-01-08T08:00:00Z',
                  completedAt: null,
                  lastAccessedAt: '2026-01-08T08:30:00Z'
                }
              ],
              assessmentResults: [
                {
                  assessmentId: '507f1f77bcf86cd799439050',
                  title: 'Module 1 Quiz',
                  type: 'quiz',
                  score: 95,
                  maxScore: 100,
                  passed: true,
                  attempts: 1,
                  submittedAt: '2026-01-02T10:30:00Z',
                  gradedAt: '2026-01-02T10:30:00Z'
                }
              ],
              attendance: {
                sessionsAttended: 0,
                totalSessions: 0,
                attendanceRate: 0
              }
            }
          ],
          downloadUrl: null
        }
      }
    },

    permissions: ['read:reports', 'staff with department access', 'instructor', 'global-admin'],

    notes: `
      - Provides comprehensive report with full module and assessment breakdown
      - Staff can only generate reports for their departments
      - Instructors can generate reports for their assigned courses
      - format parameter supports JSON (inline), CSV, and XLSX (download)
      - For CSV/XLSX formats, downloadUrl is provided to download the file
      - Report generation is async for large datasets
      - includeModules and includeAssessments can be disabled for performance
      - includeAttendance only applicable for classroom/hybrid courses
      - reportId can be used to retrieve cached report within 24 hours
      - Useful for grading, academic advising, and compliance reporting
    `
  }
};

// Type exports for consumers
export type ProgressContractType = typeof ProgressContract;
export type ProgramProgressResponse = typeof ProgressContract.getProgramProgress.example.response;
export type CourseProgressResponse = typeof ProgressContract.getCourseProgress.example.response;
export type ClassProgressResponse = typeof ProgressContract.getClassProgress.example.response;
export type LearnerProgressResponse = typeof ProgressContract.getLearnerProgress.example.response;
export type UpdateProgressRequest = typeof ProgressContract.updateProgress.example.request;
export type UpdateProgressResponse = typeof ProgressContract.updateProgress.example.response;
export type ProgressSummaryResponse = typeof ProgressContract.getProgressSummary.example.response;
export type DetailedProgressReportResponse = typeof ProgressContract.getDetailedProgressReport.example.response;
