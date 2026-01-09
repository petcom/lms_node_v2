/**
 * Reports API Contracts
 * Version: 1.0.0
 *
 * These contracts define the reporting and analytics endpoints for the LMS API.
 * Includes completion reports, performance analytics, transcripts, and exports.
 * Both backend and UI teams use these as the source of truth.
 */

export const ReportsContract = {
  /**
   * Get Completion Report
   */
  getCompletionReport: {
    endpoint: '/api/v2/reports/completion',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get completion report with filtering and aggregation',

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
          description: 'Filter by class instance'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department (defaults to user department for staff)'
        },
        startDate: {
          type: 'Date',
          required: false,
          description: 'Start date for enrollment date range'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'End date for enrollment date range'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['not_started', 'in_progress', 'completed', 'withdrawn'],
          description: 'Filter by enrollment status'
        },
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific learner'
        },
        groupBy: {
          type: 'string',
          required: false,
          enum: ['program', 'course', 'department', 'status', 'month'],
          default: 'course',
          description: 'Group results by dimension'
        },
        includeDetails: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include individual learner details (not just aggregates)'
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
          max: 500
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            summary: {
              totalEnrollments: 'number',
              notStarted: 'number',
              inProgress: 'number',
              completed: 'number',
              withdrawn: 'number',
              completionRate: 'number',
              averageTimeToComplete: 'number',
              generatedAt: 'Date'
            },
            groups: [
              {
                groupKey: 'string',
                groupLabel: 'string',
                totalEnrollments: 'number',
                notStarted: 'number',
                inProgress: 'number',
                completed: 'number',
                withdrawn: 'number',
                completionRate: 'number',
                averageProgress: 'number',
                averageTimeToComplete: 'number',
                details: [
                  {
                    learnerId: 'ObjectId',
                    learnerName: 'string',
                    learnerEmail: 'string',
                    courseId: 'ObjectId',
                    courseName: 'string',
                    courseCode: 'string',
                    programName: 'string | null',
                    departmentName: 'string',
                    status: 'not_started|in_progress|completed|withdrawn',
                    progress: 'number',
                    enrolledAt: 'Date',
                    startedAt: 'Date | null',
                    completedAt: 'Date | null',
                    withdrawnAt: 'Date | null',
                    timeToComplete: 'number | null',
                    lastAccessedAt: 'Date | null'
                  }
                ]
              }
            ],
            filters: {
              programId: 'ObjectId | null',
              courseId: 'ObjectId | null',
              classId: 'ObjectId | null',
              departmentId: 'ObjectId | null',
              startDate: 'Date | null',
              endDate: 'Date | null',
              status: 'string | null',
              learnerId: 'ObjectId | null',
              groupBy: 'string'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view reports' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid filter parameters' }
      ]
    },

    example: {
      request: {
        query: {
          programId: '507f1f77bcf86cd799439015',
          startDate: '2025-01-01',
          endDate: '2026-01-31',
          groupBy: 'course',
          includeDetails: true,
          limit: 10
        }
      },
      response: {
        success: true,
        data: {
          summary: {
            totalEnrollments: 125,
            notStarted: 15,
            inProgress: 62,
            completed: 38,
            withdrawn: 10,
            completionRate: 30.4,
            averageTimeToComplete: 2592000,
            generatedAt: '2026-01-08T10:00:00Z'
          },
          groups: [
            {
              groupKey: '507f1f77bcf86cd799439018',
              groupLabel: 'CBT Fundamentals (CBT101)',
              totalEnrollments: 45,
              notStarted: 5,
              inProgress: 22,
              completed: 15,
              withdrawn: 3,
              completionRate: 33.3,
              averageProgress: 62.5,
              averageTimeToComplete: 1814400,
              details: [
                {
                  learnerId: '507f1f77bcf86cd799439030',
                  learnerName: 'John Doe',
                  learnerEmail: 'john.doe@example.com',
                  courseId: '507f1f77bcf86cd799439018',
                  courseName: 'CBT Fundamentals',
                  courseCode: 'CBT101',
                  programName: 'Cognitive Behavioral Therapy Certificate',
                  departmentName: 'Psychology',
                  status: 'completed',
                  progress: 100,
                  enrolledAt: '2025-10-01T00:00:00Z',
                  startedAt: '2025-10-02T09:00:00Z',
                  completedAt: '2025-11-15T16:30:00Z',
                  withdrawnAt: null,
                  timeToComplete: 3801600,
                  lastAccessedAt: '2025-11-15T16:30:00Z'
                }
              ]
            }
          ],
          filters: {
            programId: '507f1f77bcf86cd799439015',
            courseId: null,
            classId: null,
            departmentId: null,
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2026-01-31T23:59:59Z',
            status: null,
            learnerId: null,
            groupBy: 'course'
          },
          pagination: {
            page: 1,
            limit: 10,
            total: 8,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:reports', 'staff', 'global-admin'],

    notes: `
      - Staff can only view reports for their departments
      - Global admins can view reports across all departments
      - completionRate is percentage (0-100)
      - averageTimeToComplete is in seconds
      - timeToComplete calculated from startedAt to completedAt
      - If includeDetails=false, details array is empty
      - Pagination applies to groups, not individual details
      - groupBy dimensions:
        - program: Group by program
        - course: Group by course
        - department: Group by department
        - status: Group by enrollment status
        - month: Group by enrollment month
      - Date ranges filter on enrollmentDate
      - withdrawn status includes withdrawal date
    `
  },

  /**
   * Get Performance Report
   */
  getPerformanceReport: {
    endpoint: '/api/v2/reports/performance',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get performance report with scores, grades, and analytics',

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
          description: 'Filter by class instance'
        },
        departmentId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by department'
        },
        startDate: {
          type: 'Date',
          required: false,
          description: 'Start date for completion date range'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'End date for completion date range'
        },
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific learner'
        },
        minScore: {
          type: 'number',
          required: false,
          min: 0,
          max: 100,
          description: 'Minimum score filter'
        },
        includeRankings: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include learner rankings (if enabled)'
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
          max: 500
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            summary: {
              totalLearners: 'number',
              totalCourses: 'number',
              averageScore: 'number',
              medianScore: 'number',
              highestScore: 'number',
              lowestScore: 'number',
              passRate: 'number',
              averageGPA: 'number',
              gradeDistribution: {
                A: 'number',
                B: 'number',
                C: 'number',
                D: 'number',
                F: 'number'
              },
              generatedAt: 'Date'
            },
            performanceMetrics: [
              {
                learnerId: 'ObjectId',
                learnerName: 'string',
                learnerEmail: 'string',
                departmentName: 'string',
                coursesCompleted: 'number',
                averageScore: 'number',
                gpa: 'number | null',
                creditsEarned: 'number',
                totalTimeSpent: 'number',
                coursePerformance: [
                  {
                    courseId: 'ObjectId',
                    courseName: 'string',
                    courseCode: 'string',
                    programName: 'string | null',
                    score: 'number',
                    grade: 'string',
                    passed: 'boolean',
                    completedAt: 'Date',
                    timeSpent: 'number',
                    attempts: 'number',
                    assessmentScores: [
                      {
                        assessmentName: 'string',
                        score: 'number',
                        maxScore: 'number',
                        percentage: 'number',
                        passed: 'boolean'
                      }
                    ]
                  }
                ],
                rank: 'number | null',
                percentile: 'number | null'
              }
            ],
            analytics: {
              scoreDistribution: [
                {
                  range: 'string',
                  count: 'number',
                  percentage: 'number'
                }
              ],
              timeToCompletionDistribution: [
                {
                  range: 'string',
                  count: 'number',
                  percentage: 'number'
                }
              ],
              progressDistribution: {
                notStarted: 'number',
                lowProgress: 'number',
                mediumProgress: 'number',
                highProgress: 'number',
                completed: 'number'
              },
              topPerformers: [
                {
                  learnerId: 'ObjectId',
                  learnerName: 'string',
                  averageScore: 'number',
                  gpa: 'number',
                  coursesCompleted: 'number'
                }
              ],
              needsAttention: [
                {
                  learnerId: 'ObjectId',
                  learnerName: 'string',
                  averageScore: 'number',
                  coursesAtRisk: 'number',
                  lastActivityAt: 'Date | null'
                }
              ]
            },
            filters: {
              programId: 'ObjectId | null',
              courseId: 'ObjectId | null',
              classId: 'ObjectId | null',
              departmentId: 'ObjectId | null',
              startDate: 'Date | null',
              endDate: 'Date | null',
              learnerId: 'ObjectId | null',
              minScore: 'number | null'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view reports' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid filter parameters' }
      ]
    },

    example: {
      request: {
        query: {
          courseId: '507f1f77bcf86cd799439018',
          startDate: '2025-01-01',
          endDate: '2026-01-31',
          includeRankings: true
        }
      },
      response: {
        success: true,
        data: {
          summary: {
            totalLearners: 45,
            totalCourses: 1,
            averageScore: 82.5,
            medianScore: 85,
            highestScore: 98,
            lowestScore: 62,
            passRate: 88.9,
            averageGPA: 3.2,
            gradeDistribution: {
              A: 18,
              B: 15,
              C: 7,
              D: 3,
              F: 2
            },
            generatedAt: '2026-01-08T10:00:00Z'
          },
          performanceMetrics: [
            {
              learnerId: '507f1f77bcf86cd799439030',
              learnerName: 'John Doe',
              learnerEmail: 'john.doe@example.com',
              departmentName: 'Psychology',
              coursesCompleted: 4,
              averageScore: 87.5,
              gpa: 3.5,
              creditsEarned: 12,
              totalTimeSpent: 72000,
              coursePerformance: [
                {
                  courseId: '507f1f77bcf86cd799439018',
                  courseName: 'CBT Fundamentals',
                  courseCode: 'CBT101',
                  programName: 'Cognitive Behavioral Therapy Certificate',
                  score: 85,
                  grade: 'B',
                  passed: true,
                  completedAt: '2025-11-15T16:30:00Z',
                  timeSpent: 14400,
                  attempts: 1,
                  assessmentScores: [
                    {
                      assessmentName: 'Module 1 Quiz',
                      score: 18,
                      maxScore: 20,
                      percentage: 90,
                      passed: true
                    },
                    {
                      assessmentName: 'Final Exam',
                      score: 82,
                      maxScore: 100,
                      percentage: 82,
                      passed: true
                    }
                  ]
                }
              ],
              rank: 12,
              percentile: 73.3
            }
          ],
          analytics: {
            scoreDistribution: [
              { range: '90-100', count: 12, percentage: 26.7 },
              { range: '80-89', count: 18, percentage: 40.0 },
              { range: '70-79', count: 10, percentage: 22.2 },
              { range: '60-69', count: 5, percentage: 11.1 }
            ],
            timeToCompletionDistribution: [
              { range: '0-30 days', count: 15, percentage: 33.3 },
              { range: '31-60 days', count: 20, percentage: 44.4 },
              { range: '61-90 days', count: 7, percentage: 15.6 },
              { range: '90+ days', count: 3, percentage: 6.7 }
            ],
            progressDistribution: {
              notStarted: 5,
              lowProgress: 8,
              mediumProgress: 12,
              highProgress: 10,
              completed: 10
            },
            topPerformers: [
              {
                learnerId: '507f1f77bcf86cd799439031',
                learnerName: 'Jane Smith',
                averageScore: 98,
                gpa: 4.0,
                coursesCompleted: 6
              }
            ],
            needsAttention: [
              {
                learnerId: '507f1f77bcf86cd799439032',
                learnerName: 'Bob Wilson',
                averageScore: 65,
                coursesAtRisk: 2,
                lastActivityAt: '2025-12-20T10:00:00Z'
              }
            ]
          },
          filters: {
            programId: null,
            courseId: '507f1f77bcf86cd799439018',
            classId: null,
            departmentId: null,
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2026-01-31T23:59:59Z',
            learnerId: null,
            minScore: null
          },
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

    permissions: ['read:reports', 'staff', 'global-admin'],

    notes: `
      - Staff can only view reports for their departments
      - Global admins can view reports across all departments
      - Scores are percentages (0-100)
      - GPA calculated on 4.0 scale
      - Grade distribution: A (90-100), B (80-89), C (70-79), D (60-69), F (0-59)
      - Rankings only included if includeRankings=true and enabled by admin
      - Percentile shows learner rank relative to all learners (higher is better)
      - passRate is percentage of learners who passed (score >= 60)
      - timeSpent is in seconds
      - Date ranges filter on completion date
      - needsAttention identifies learners with low scores or inactive
      - scoreDistribution groups scores into 10-point ranges
      - progressDistribution ranges:
        - notStarted: 0%
        - lowProgress: 1-33%
        - mediumProgress: 34-66%
        - highProgress: 67-99%
        - completed: 100%
    `
  },

  /**
   * Get Learner Transcript
   */
  getLearnerTranscript: {
    endpoint: '/api/v2/reports/transcript/:learnerId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get official transcript for a learner',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner ID'
        }
      },
      query: {
        programId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific program (default: all programs)'
        },
        includeInProgress: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include courses in progress (not just completed)'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            transcript: {
              learner: {
                id: 'ObjectId',
                firstName: 'string',
                lastName: 'string',
                email: 'string',
                studentId: 'string | null',
                dateOfBirth: 'Date | null'
              },
              institution: {
                name: 'string',
                address: 'string',
                logo: 'string | null',
                registrarName: 'string',
                registrarTitle: 'string'
              },
              generatedAt: 'Date',
              transcriptId: 'string',
              isOfficial: 'boolean',
              programs: [
                {
                  programId: 'ObjectId',
                  programName: 'string',
                  programCode: 'string',
                  departmentName: 'string',
                  enrolledAt: 'Date',
                  status: 'active|completed|withdrawn',
                  completedAt: 'Date | null',
                  withdrawnAt: 'Date | null',
                  cumulativeGPA: 'number | null',
                  creditsEarned: 'number',
                  creditsRequired: 'number',
                  honors: 'string | null',
                  courses: [
                    {
                      courseId: 'ObjectId',
                      courseCode: 'string',
                      courseName: 'string',
                      credits: 'number',
                      term: 'string',
                      completedAt: 'Date',
                      grade: 'string',
                      score: 'number',
                      passed: 'boolean',
                      attempts: 'number'
                    }
                  ]
                }
              ],
              summary: {
                totalPrograms: 'number',
                programsCompleted: 'number',
                totalCredits: 'number',
                overallGPA: 'number | null',
                totalCoursesCompleted: 'number',
                honors: 'string[]'
              },
              signatures: [
                {
                  name: 'string',
                  title: 'string',
                  signedAt: 'Date',
                  signature: 'string | null'
                }
              ],
              officialSeal: 'string | null',
              disclaimers: 'string[]'
            }
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view transcript' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' }
      ]
    },

    example: {
      request: {
        params: {
          learnerId: '507f1f77bcf86cd799439030'
        },
        query: {
          includeInProgress: false
        }
      },
      response: {
        success: true,
        data: {
          transcript: {
            learner: {
              id: '507f1f77bcf86cd799439030',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              studentId: 'STU-2025-001',
              dateOfBirth: '1990-05-15T00:00:00Z'
            },
            institution: {
              name: 'Professional Development Institute',
              address: '123 Learning St, Education City, EC 12345',
              logo: 'https://cdn.example.com/logo.png',
              registrarName: 'Dr. Jane Smith',
              registrarTitle: 'Registrar'
            },
            generatedAt: '2026-01-08T10:00:00Z',
            transcriptId: 'TRN-2026-0108-0001',
            isOfficial: true,
            programs: [
              {
                programId: '507f1f77bcf86cd799439015',
                programName: 'Cognitive Behavioral Therapy Certificate',
                programCode: 'CBT-CERT',
                departmentName: 'Psychology',
                enrolledAt: '2025-01-01T00:00:00Z',
                status: 'active',
                completedAt: null,
                withdrawnAt: null,
                cumulativeGPA: 3.5,
                creditsEarned: 12,
                creditsRequired: 18,
                honors: null,
                courses: [
                  {
                    courseId: '507f1f77bcf86cd799439018',
                    courseCode: 'CBT101',
                    courseName: 'CBT Fundamentals',
                    credits: 3,
                    term: 'Fall 2025',
                    completedAt: '2025-11-15T16:30:00Z',
                    grade: 'B',
                    score: 85,
                    passed: true,
                    attempts: 1
                  },
                  {
                    courseId: '507f1f77bcf86cd799439019',
                    courseCode: 'CBT102',
                    courseName: 'CBT Assessment Methods',
                    credits: 3,
                    term: 'Fall 2025',
                    completedAt: '2025-12-10T14:00:00Z',
                    grade: 'A',
                    score: 92,
                    passed: true,
                    attempts: 1
                  }
                ]
              }
            ],
            summary: {
              totalPrograms: 1,
              programsCompleted: 0,
              totalCredits: 12,
              overallGPA: 3.5,
              totalCoursesCompleted: 4,
              honors: []
            },
            signatures: [
              {
                name: 'Dr. Jane Smith',
                title: 'Registrar',
                signedAt: '2026-01-08T10:00:00Z',
                signature: 'https://cdn.example.com/signatures/registrar.png'
              }
            ],
            officialSeal: 'https://cdn.example.com/seal.png',
            disclaimers: [
              'This is an official transcript issued by the Professional Development Institute.',
              'Grades are final upon completion and cannot be changed without formal appeal.',
              'Courses marked with * indicate transfer credits from other institutions.'
            ]
          }
        }
      }
    },

    permissions: ['read:transcripts', 'learner (own transcript)', 'staff (department learners)', 'global-admin'],

    notes: `
      - Learners can only view their own transcript
      - Staff can view transcripts for learners in their departments
      - Global admins can view any transcript
      - isOfficial=true indicates transcript has official signatures and seals
      - Honors determined by GPA: Summa Cum Laude (3.9+), Magna Cum Laude (3.7-3.89), Cum Laude (3.5-3.69)
      - Only completed courses included by default
      - includeInProgress adds in-progress courses with grade="IP"
      - transcriptId is unique identifier for this transcript generation
      - GPA calculated on 4.0 scale
      - Credits only counted for passed courses
      - Term format: "Fall 2025", "Spring 2026", etc.
      - Signatures and seals configured in system settings
      - Disclaimers configured by institution
    `
  },

  /**
   * Generate PDF Transcript
   */
  generatePDFTranscript: {
    endpoint: '/api/v2/reports/transcript/:learnerId/generate',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Generate PDF transcript for a learner',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        learnerId: {
          type: 'ObjectId',
          required: true,
          description: 'Learner ID'
        }
      },
      body: {
        programId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific program'
        },
        includeInProgress: {
          type: 'boolean',
          required: false,
          default: false
        },
        officialFormat: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include official seals and signatures'
        },
        watermark: {
          type: 'string',
          required: false,
          enum: ['none', 'unofficial', 'draft'],
          default: 'none',
          description: 'Add watermark to transcript'
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
            transcriptId: 'string',
            learnerId: 'ObjectId',
            fileUrl: 'string',
            fileName: 'string',
            fileSizeBytes: 'number',
            format: 'pdf',
            generatedAt: 'Date',
            expiresAt: 'Date',
            isOfficial: 'boolean'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to generate transcript' },
        { status: 404, code: 'LEARNER_NOT_FOUND', message: 'Learner not found' },
        { status: 500, code: 'GENERATION_FAILED', message: 'Failed to generate PDF transcript' }
      ]
    },

    example: {
      request: {
        params: {
          learnerId: '507f1f77bcf86cd799439030'
        },
        body: {
          includeInProgress: false,
          officialFormat: true,
          watermark: 'none'
        }
      },
      response: {
        success: true,
        message: 'Transcript PDF generated successfully',
        data: {
          transcriptId: 'TRN-2026-0108-0001',
          learnerId: '507f1f77bcf86cd799439030',
          fileUrl: 'https://cdn.example.com/transcripts/TRN-2026-0108-0001.pdf',
          fileName: 'transcript-john-doe-2026-01-08.pdf',
          fileSizeBytes: 245678,
          format: 'pdf',
          generatedAt: '2026-01-08T10:00:00Z',
          expiresAt: '2026-02-08T10:00:00Z',
          isOfficial: true
        }
      }
    },

    permissions: ['generate:transcripts', 'learner (own transcript)', 'staff (department learners)', 'global-admin'],

    notes: `
      - Generates PDF version of transcript
      - PDF includes institution letterhead, signatures, and seals
      - officialFormat=true includes all official elements
      - watermark options:
        - none: No watermark (official transcript)
        - unofficial: "UNOFFICIAL COPY" watermark
        - draft: "DRAFT - NOT FOR OFFICIAL USE" watermark
      - Generated PDF stored in secure storage
      - fileUrl expires after 30 days
      - Each generation creates new transcriptId for audit trail
      - PDF format follows official transcript standards
      - Includes QR code for verification (if enabled)
      - Learners can generate their own transcripts
      - Staff must have department access to generate for learners
    `
  },

  /**
   * Get Course Report
   */
  getCourseReport: {
    endpoint: '/api/v2/reports/course/:courseId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get comprehensive course-level report with all learners',

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
        classId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by specific class instance'
        },
        startDate: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments from this date'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments to this date'
        },
        includeModules: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include module-level breakdown'
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
              code: 'string',
              credits: 'number',
              programName: 'string | null',
              departmentName: 'string',
              instructors: 'string[]'
            },
            summary: {
              totalEnrollments: 'number',
              activeEnrollments: 'number',
              completedEnrollments: 'number',
              completionRate: 'number',
              averageScore: 'number',
              averageProgress: 'number',
              averageTimeToComplete: 'number',
              passRate: 'number'
            },
            learners: [
              {
                learnerId: 'ObjectId',
                learnerName: 'string',
                learnerEmail: 'string',
                enrolledAt: 'Date',
                startedAt: 'Date | null',
                completedAt: 'Date | null',
                status: 'not_started|in_progress|completed|withdrawn',
                progress: 'number',
                score: 'number | null',
                grade: 'string | null',
                timeSpent: 'number',
                lastAccessedAt: 'Date | null',
                moduleProgress: [
                  {
                    moduleId: 'ObjectId',
                    moduleName: 'string',
                    moduleOrder: 'number',
                    status: 'not_started|in_progress|completed',
                    progress: 'number',
                    score: 'number | null',
                    timeSpent: 'number',
                    attempts: 'number',
                    completedAt: 'Date | null'
                  }
                ]
              }
            ],
            moduleAnalytics: [
              {
                moduleId: 'ObjectId',
                moduleName: 'string',
                moduleOrder: 'number',
                moduleType: 'scorm|custom|exercise|video|document',
                completionRate: 'number',
                averageScore: 'number',
                averageTimeSpent: 'number',
                averageAttempts: 'number',
                difficultyRating: 'easy|medium|hard'
              }
            ],
            generatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view course report' },
        { status: 404, code: 'COURSE_NOT_FOUND', message: 'Course not found' }
      ]
    },

    example: {
      request: {
        params: {
          courseId: '507f1f77bcf86cd799439018'
        },
        query: {
          includeModules: true
        }
      },
      response: {
        success: true,
        data: {
          course: {
            id: '507f1f77bcf86cd799439018',
            title: 'CBT Fundamentals',
            code: 'CBT101',
            credits: 3,
            programName: 'Cognitive Behavioral Therapy Certificate',
            departmentName: 'Psychology',
            instructors: ['Dr. Sarah Johnson', 'Prof. Michael Brown']
          },
          summary: {
            totalEnrollments: 45,
            activeEnrollments: 27,
            completedEnrollments: 15,
            completionRate: 33.3,
            averageScore: 82.5,
            averageProgress: 62.8,
            averageTimeToComplete: 1814400,
            passRate: 88.9
          },
          learners: [
            {
              learnerId: '507f1f77bcf86cd799439030',
              learnerName: 'John Doe',
              learnerEmail: 'john.doe@example.com',
              enrolledAt: '2025-10-01T00:00:00Z',
              startedAt: '2025-10-02T09:00:00Z',
              completedAt: '2025-11-15T16:30:00Z',
              status: 'completed',
              progress: 100,
              score: 85,
              grade: 'B',
              timeSpent: 14400,
              lastAccessedAt: '2025-11-15T16:30:00Z',
              moduleProgress: [
                {
                  moduleId: '507f1f77bcf86cd799439040',
                  moduleName: 'Introduction to CBT',
                  moduleOrder: 1,
                  status: 'completed',
                  progress: 100,
                  score: 90,
                  timeSpent: 3600,
                  attempts: 1,
                  completedAt: '2025-10-05T14:00:00Z'
                },
                {
                  moduleId: '507f1f77bcf86cd799439041',
                  moduleName: 'CBT Techniques',
                  moduleOrder: 2,
                  status: 'completed',
                  progress: 100,
                  score: 82,
                  timeSpent: 5400,
                  attempts: 2,
                  completedAt: '2025-10-20T16:00:00Z'
                }
              ]
            }
          ],
          moduleAnalytics: [
            {
              moduleId: '507f1f77bcf86cd799439040',
              moduleName: 'Introduction to CBT',
              moduleOrder: 1,
              moduleType: 'scorm',
              completionRate: 95.6,
              averageScore: 88.5,
              averageTimeSpent: 3200,
              averageAttempts: 1.2,
              difficultyRating: 'easy'
            },
            {
              moduleId: '507f1f77bcf86cd799439041',
              moduleName: 'CBT Techniques',
              moduleOrder: 2,
              moduleType: 'custom',
              completionRate: 82.2,
              averageScore: 78.5,
              averageTimeSpent: 5800,
              averageAttempts: 2.1,
              difficultyRating: 'medium'
            }
          ],
          generatedAt: '2026-01-08T10:00:00Z'
        }
      }
    },

    permissions: ['read:reports', 'staff (department courses)', 'global-admin'],

    notes: `
      - Staff can only view reports for courses in their departments
      - Global admins can view any course report
      - completionRate is percentage of enrollments completed
      - passRate is percentage of completions that passed (score >= 60)
      - averageTimeToComplete in seconds (only for completed enrollments)
      - difficultyRating based on average score and attempts:
        - easy: avgScore >= 85 and avgAttempts < 1.5
        - medium: avgScore >= 70 and avgAttempts < 2.5
        - hard: avgScore < 70 or avgAttempts >= 2.5
      - moduleProgress only included if includeModules=true
      - moduleAnalytics aggregates data across all learners
      - timeSpent in seconds
      - Date filters apply to enrollment date
    `
  },

  /**
   * Get Program Report
   */
  getProgramReport: {
    endpoint: '/api/v2/reports/program/:programId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get comprehensive program-level report',

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
        academicYearId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by academic year'
        },
        startDate: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments from this date'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'Filter enrollments to this date'
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
              code: 'string',
              departmentName: 'string',
              totalCredits: 'number',
              totalCourses: 'number',
              levels: 'number'
            },
            summary: {
              totalEnrollments: 'number',
              activeEnrollments: 'number',
              completedEnrollments: 'number',
              graduatedEnrollments: 'number',
              withdrawnEnrollments: 'number',
              completionRate: 'number',
              graduationRate: 'number',
              averageGPA: 'number',
              averageCreditsEarned: 'number',
              averageTimeToComplete: 'number'
            },
            enrollmentTrends: [
              {
                period: 'string',
                newEnrollments: 'number',
                completions: 'number',
                withdrawals: 'number'
              }
            ],
            coursePerformance: [
              {
                courseId: 'ObjectId',
                courseName: 'string',
                courseCode: 'string',
                levelNumber: 'number',
                totalEnrollments: 'number',
                completionRate: 'number',
                averageScore: 'number',
                passRate: 'number'
              }
            ],
            learnerProgress: [
              {
                learnerId: 'ObjectId',
                learnerName: 'string',
                learnerEmail: 'string',
                enrolledAt: 'Date',
                status: 'pending|active|completed|graduated|withdrawn',
                currentLevel: 'number',
                coursesCompleted: 'number',
                creditsEarned: 'number',
                cumulativeGPA: 'number | null',
                progress: 'number',
                lastActivityAt: 'Date | null'
              }
            ],
            generatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view program report' },
        { status: 404, code: 'PROGRAM_NOT_FOUND', message: 'Program not found' }
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
          program: {
            id: '507f1f77bcf86cd799439015',
            name: 'Cognitive Behavioral Therapy Certificate',
            code: 'CBT-CERT',
            departmentName: 'Psychology',
            totalCredits: 18,
            totalCourses: 6,
            levels: 2
          },
          summary: {
            totalEnrollments: 125,
            activeEnrollments: 87,
            completedEnrollments: 28,
            graduatedEnrollments: 25,
            withdrawnEnrollments: 10,
            completionRate: 22.4,
            graduationRate: 20.0,
            averageGPA: 3.2,
            averageCreditsEarned: 9.5,
            averageTimeToComplete: 7776000
          },
          enrollmentTrends: [
            {
              period: '2025-Q1',
              newEnrollments: 35,
              completions: 5,
              withdrawals: 2
            },
            {
              period: '2025-Q2',
              newEnrollments: 42,
              completions: 8,
              withdrawals: 3
            },
            {
              period: '2025-Q3',
              newEnrollments: 28,
              completions: 10,
              withdrawals: 4
            },
            {
              period: '2025-Q4',
              newEnrollments: 20,
              completions: 5,
              withdrawals: 1
            }
          ],
          coursePerformance: [
            {
              courseId: '507f1f77bcf86cd799439018',
              courseName: 'CBT Fundamentals',
              courseCode: 'CBT101',
              levelNumber: 1,
              totalEnrollments: 125,
              completionRate: 68.0,
              averageScore: 82.5,
              passRate: 95.3
            }
          ],
          learnerProgress: [
            {
              learnerId: '507f1f77bcf86cd799439030',
              learnerName: 'John Doe',
              learnerEmail: 'john.doe@example.com',
              enrolledAt: '2025-01-01T00:00:00Z',
              status: 'active',
              currentLevel: 2,
              coursesCompleted: 4,
              creditsEarned: 12,
              cumulativeGPA: 3.5,
              progress: 67,
              lastActivityAt: '2026-01-08T08:30:00Z'
            }
          ],
          generatedAt: '2026-01-08T10:00:00Z'
        }
      }
    },

    permissions: ['read:reports', 'staff (department programs)', 'global-admin'],

    notes: `
      - Staff can only view reports for programs in their departments
      - Global admins can view any program report
      - completionRate is percentage of enrollments completed (not necessarily graduated)
      - graduationRate is percentage of enrollments that graduated
      - averageTimeToComplete in seconds (only for completed enrollments)
      - enrollmentTrends shows quarterly data (Q1, Q2, Q3, Q4)
      - coursePerformance ordered by level then course order
      - progress is percentage toward program completion (0-100)
      - currentLevel is highest level with active enrollment
      - Date filters apply to enrollment date
      - academicYearId filter useful for year-over-year comparisons
    `
  },

  /**
   * Get Department Report
   */
  getDepartmentReport: {
    endpoint: '/api/v2/reports/department/:departmentId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get comprehensive department-level report',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        departmentId: {
          type: 'ObjectId',
          required: true,
          description: 'Department ID'
        }
      },
      query: {
        startDate: {
          type: 'Date',
          required: false,
          description: 'Report start date'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'Report end date'
        },
        includeSubDepartments: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include child departments in report'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            department: {
              id: 'ObjectId',
              name: 'string',
              code: 'string',
              parentDepartment: 'string | null',
              totalPrograms: 'number',
              totalCourses: 'number',
              totalStaff: 'number',
              totalLearners: 'number'
            },
            summary: {
              totalEnrollments: 'number',
              activeEnrollments: 'number',
              completedEnrollments: 'number',
              completionRate: 'number',
              averageGPA: 'number',
              averageScore: 'number',
              totalCreditsEarned: 'number'
            },
            programPerformance: [
              {
                programId: 'ObjectId',
                programName: 'string',
                programCode: 'string',
                totalEnrollments: 'number',
                activeEnrollments: 'number',
                completedEnrollments: 'number',
                completionRate: 'number',
                averageGPA: 'number'
              }
            ],
            coursePerformance: [
              {
                courseId: 'ObjectId',
                courseName: 'string',
                courseCode: 'string',
                programName: 'string | null',
                totalEnrollments: 'number',
                completionRate: 'number',
                averageScore: 'number',
                passRate: 'number'
              }
            ],
            staffActivity: [
              {
                staffId: 'ObjectId',
                staffName: 'string',
                role: 'string',
                coursesManaged: 'number',
                activeEnrollments: 'number',
                lastActivityAt: 'Date | null'
              }
            ],
            learnerEngagement: {
              totalActiveLearners: 'number',
              dailyActiveUsers: 'number',
              weeklyActiveUsers: 'number',
              monthlyActiveUsers: 'number',
              averageSessionDuration: 'number',
              totalTimeSpent: 'number'
            },
            generatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view department report' },
        { status: 404, code: 'DEPARTMENT_NOT_FOUND', message: 'Department not found' }
      ]
    },

    example: {
      request: {
        params: {
          departmentId: '507f1f77bcf86cd799439012'
        },
        query: {
          startDate: '2025-01-01',
          endDate: '2026-01-31',
          includeSubDepartments: false
        }
      },
      response: {
        success: true,
        data: {
          department: {
            id: '507f1f77bcf86cd799439012',
            name: 'Psychology',
            code: 'PSY',
            parentDepartment: null,
            totalPrograms: 5,
            totalCourses: 32,
            totalStaff: 12,
            totalLearners: 245
          },
          summary: {
            totalEnrollments: 582,
            activeEnrollments: 412,
            completedEnrollments: 145,
            completionRate: 24.9,
            averageGPA: 3.3,
            averageScore: 83.2,
            totalCreditsEarned: 1856
          },
          programPerformance: [
            {
              programId: '507f1f77bcf86cd799439015',
              programName: 'Cognitive Behavioral Therapy Certificate',
              programCode: 'CBT-CERT',
              totalEnrollments: 125,
              activeEnrollments: 87,
              completedEnrollments: 28,
              completionRate: 22.4,
              averageGPA: 3.2
            }
          ],
          coursePerformance: [
            {
              courseId: '507f1f77bcf86cd799439018',
              courseName: 'CBT Fundamentals',
              courseCode: 'CBT101',
              programName: 'Cognitive Behavioral Therapy Certificate',
              totalEnrollments: 125,
              completionRate: 68.0,
              averageScore: 82.5,
              passRate: 95.3
            }
          ],
          staffActivity: [
            {
              staffId: '507f1f77bcf86cd799439050',
              staffName: 'Dr. Sarah Johnson',
              role: 'Instructor',
              coursesManaged: 4,
              activeEnrollments: 128,
              lastActivityAt: '2026-01-08T09:15:00Z'
            }
          ],
          learnerEngagement: {
            totalActiveLearners: 245,
            dailyActiveUsers: 87,
            weeklyActiveUsers: 156,
            monthlyActiveUsers: 223,
            averageSessionDuration: 2400,
            totalTimeSpent: 5184000
          },
          generatedAt: '2026-01-08T10:00:00Z'
        }
      }
    },

    permissions: ['read:reports', 'staff (own department)', 'global-admin'],

    notes: `
      - Staff can only view reports for their own departments
      - Global admins can view any department report
      - includeSubDepartments aggregates data from child departments
      - completionRate is percentage of enrollments completed
      - averageSessionDuration in seconds
      - totalTimeSpent is aggregate across all learners in seconds
      - Active user metrics:
        - dailyActiveUsers: active in last 24 hours
        - weeklyActiveUsers: active in last 7 days
        - monthlyActiveUsers: active in last 30 days
      - staffActivity includes instructors and content managers
      - coursesManaged includes courses where staff is instructor or manager
      - Date filters apply to enrollment dates for course data
      - learnerEngagement shows current snapshot (not historical)
    `
  },

  /**
   * Export Report Data
   */
  exportReport: {
    endpoint: '/api/v2/reports/export',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Export report data in multiple formats',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        reportType: {
          type: 'string',
          required: true,
          enum: ['completion', 'performance', 'course', 'program', 'department'],
          description: 'Type of report to export'
        },
        format: {
          type: 'string',
          required: true,
          enum: ['csv', 'xlsx', 'pdf', 'json'],
          description: 'Export format'
        },
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
        startDate: {
          type: 'Date',
          required: false,
          description: 'Start date filter'
        },
        endDate: {
          type: 'Date',
          required: false,
          description: 'End date filter'
        },
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by learner'
        },
        includeDetails: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include detailed data (not just summaries)'
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
            reportType: 'string',
            format: 'string',
            fileUrl: 'string',
            fileName: 'string',
            fileSizeBytes: 'number',
            recordCount: 'number',
            generatedAt: 'Date',
            expiresAt: 'Date',
            filters: 'Record<string, any>'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to export reports' },
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid export parameters' },
        { status: 500, code: 'EXPORT_FAILED', message: 'Failed to generate export file' }
      ]
    },

    example: {
      request: {
        query: {
          reportType: 'completion',
          format: 'xlsx',
          programId: '507f1f77bcf86cd799439015',
          startDate: '2025-01-01',
          endDate: '2026-01-31',
          includeDetails: true
        }
      },
      response: {
        success: true,
        message: 'Report exported successfully',
        data: {
          reportType: 'completion',
          format: 'xlsx',
          fileUrl: 'https://cdn.example.com/exports/completion-report-2026-01-08.xlsx',
          fileName: 'completion-report-2026-01-08.xlsx',
          fileSizeBytes: 458392,
          recordCount: 125,
          generatedAt: '2026-01-08T10:00:00Z',
          expiresAt: '2026-01-15T10:00:00Z',
          filters: {
            programId: '507f1f77bcf86cd799439015',
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2026-01-31T23:59:59Z'
          }
        }
      }
    },

    permissions: ['export:reports', 'staff', 'global-admin'],

    notes: `
      - Staff can only export reports for their departments
      - Global admins can export any reports
      - Export formats:
        - csv: Comma-separated values (flat data)
        - xlsx: Excel spreadsheet (supports multiple sheets)
        - pdf: Formatted PDF report
        - json: JSON data structure
      - fileUrl expires after 7 days
      - Large exports (>10,000 records) may be processed asynchronously
      - includeDetails=false exports only summary data
      - recordCount shows number of primary records (enrollments, learners, etc.)
      - Filters same as respective report endpoints
      - CSV exports flatten nested data structures
      - XLSX exports may have multiple sheets (summary, details, analytics)
      - PDF exports include charts and visualizations
      - JSON exports include full data structure
    `
  }
};

// Type exports for consumers
export type ReportsContractType = typeof ReportsContract;
export type CompletionReportResponse = typeof ReportsContract.getCompletionReport.example.response;
export type PerformanceReportResponse = typeof ReportsContract.getPerformanceReport.example.response;
export type TranscriptResponse = typeof ReportsContract.getLearnerTranscript.example.response;
export type CourseReportResponse = typeof ReportsContract.getCourseReport.example.response;
export type ProgramReportResponse = typeof ReportsContract.getProgramReport.example.response;
export type DepartmentReportResponse = typeof ReportsContract.getDepartmentReport.example.response;
