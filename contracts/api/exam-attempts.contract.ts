/**
 * Exam Attempts API Contracts
 * Version: 1.0.0
 *
 * These contracts define the exam/assessment attempt and submission endpoints for the LMS API.
 * Covers starting exams, submitting answers, grading, and viewing results.
 * Both backend and UI teams use these as the source of truth.
 */

export const ExamAttemptsContracts = {
  /**
   * List Exam Attempts
   */
  list: {
    endpoint: '/api/v2/exam-attempts',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List exam attempts with filtering and pagination',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 10, min: 1, max: 100 },
        learnerId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by learner ID (staff only)'
        },
        examId: {
          type: 'ObjectId',
          required: false,
          description: 'Filter by exam/exercise ID'
        },
        status: {
          type: 'string',
          required: false,
          enum: ['started', 'in_progress', 'submitted', 'grading', 'graded'],
          description: 'Filter by attempt status'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-startedAt',
          description: 'Sort field (prefix with - for desc). Examples: startedAt, -submittedAt, score'
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
                examId: 'ObjectId',
                examTitle: 'string',
                learnerId: 'ObjectId',
                learnerName: 'string',
                attemptNumber: 'number',
                status: 'started|in_progress|submitted|grading|graded',
                score: 'number',
                maxScore: 'number',
                percentage: 'number',
                passed: 'boolean',
                gradeLetter: 'string',
                startedAt: 'Date',
                submittedAt: 'Date | null',
                gradedAt: 'Date | null',
                timeSpent: 'number',
                remainingTime: 'number | null',
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view exam attempts' }
      ]
    },

    example: {
      request: {
        query: {
          examId: '507f1f77bcf86cd799439013',
          status: 'graded',
          page: 1,
          limit: 20,
          sort: '-submittedAt'
        }
      },
      response: {
        success: true,
        data: {
          attempts: [
            {
              id: '507f1f77bcf86cd799439020',
              examId: '507f1f77bcf86cd799439013',
              examTitle: 'Introduction to CBT - Module 1 Quiz',
              learnerId: '507f1f77bcf86cd799439015',
              learnerName: 'Jane Smith',
              attemptNumber: 2,
              status: 'graded',
              score: 85,
              maxScore: 100,
              percentage: 85,
              passed: true,
              gradeLetter: 'B',
              startedAt: '2026-01-08T09:00:00.000Z',
              submittedAt: '2026-01-08T09:25:00.000Z',
              gradedAt: '2026-01-08T09:30:00.000Z',
              timeSpent: 1500,
              remainingTime: null,
              createdAt: '2026-01-08T09:00:00.000Z',
              updatedAt: '2026-01-08T09:30:00.000Z'
            }
          ],
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

    permissions: ['read:exam-attempts'],

    notes: `
      - Learners only see their own attempts
      - Staff see attempts for exams in their departments
      - Global admins see all attempts
      - remainingTime is null for completed attempts
      - timeSpent is in seconds
      - Percentage calculated as (score / maxScore) * 100
      - gradeLetter assigned based on organization grading scale
    `
  },

  /**
   * Start New Exam Attempt
   */
  create: {
    endpoint: '/api/v2/exam-attempts',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Start a new exam attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      body: {
        examId: {
          type: 'ObjectId',
          required: true,
          description: 'ID of the exam/exercise to attempt'
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
            examId: 'ObjectId',
            examTitle: 'string',
            learnerId: 'ObjectId',
            attemptNumber: 'number',
            status: 'started',
            score: 'number',
            maxScore: 'number',
            timeLimit: 'number',
            remainingTime: 'number',
            shuffleQuestions: 'boolean',
            questions: [
              {
                id: 'string',
                questionText: 'string',
                questionType: 'multiple_choice|true_false|short_answer|essay|matching',
                order: 'number',
                points: 'number',
                options: ['array of strings'],
                hasAnswer: 'boolean'
              }
            ],
            instructions: 'string',
            allowReview: 'boolean',
            startedAt: 'Date',
            createdAt: 'Date'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid exam ID' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Not enrolled in course or exam not available' },
        { status: 404, code: 'EXAM_NOT_FOUND', message: 'Exam not found' },
        { status: 409, code: 'ACTIVE_ATTEMPT_EXISTS', message: 'Cannot start new attempt while another is in progress' },
        { status: 409, code: 'MAX_ATTEMPTS_REACHED', message: 'Maximum number of attempts reached' },
        { status: 409, code: 'EXAM_CLOSED', message: 'Exam is no longer available for attempts' }
      ]
    },

    example: {
      request: {
        examId: '507f1f77bcf86cd799439013'
      },
      response: {
        success: true,
        message: 'Exam attempt started successfully',
        data: {
          id: '507f1f77bcf86cd799439020',
          examId: '507f1f77bcf86cd799439013',
          examTitle: 'Introduction to CBT - Module 1 Quiz',
          learnerId: '507f1f77bcf86cd799439015',
          attemptNumber: 2,
          status: 'started',
          score: 0,
          maxScore: 100,
          timeLimit: 1800,
          remainingTime: 1800,
          shuffleQuestions: true,
          questions: [
            {
              id: '507f1f77bcf86cd799439014',
              questionText: 'What does CBT stand for?',
              questionType: 'multiple_choice',
              order: 1,
              points: 10,
              options: [
                'Computer-Based Training',
                'Cognitive Behavioral Therapy',
                'Core Business Technology',
                'Certified Business Trainer'
              ],
              hasAnswer: false
            }
          ],
          instructions: 'Read each question carefully. You have 30 minutes to complete this quiz.',
          allowReview: true,
          startedAt: '2026-01-08T09:00:00.000Z',
          createdAt: '2026-01-08T09:00:00.000Z'
        }
      }
    },

    permissions: ['create:exam-attempts'],

    notes: `
      - Validates learner is enrolled in course containing exam
      - Checks exam availability (published, not archived)
      - Prevents multiple active attempts (status: started or in_progress)
      - Enforces max attempts limit if configured on exam
      - Questions shuffled if exam.shuffleQuestions is true
      - Questions returned WITHOUT correct answers
      - timeLimit is in seconds (0 = unlimited)
      - remainingTime starts at timeLimit value
      - Status automatically set to 'started'
      - Timer starts immediately upon creation
      - Late submissions tracked if submitted after due date
    `
  },

  /**
   * Get Exam Attempt Details
   */
  getById: {
    endpoint: '/api/v2/exam-attempts/:id',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get detailed information about a specific exam attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exam attempt ID'
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
            examId: 'ObjectId',
            examTitle: 'string',
            examType: 'quiz|exam|practice|assessment',
            learnerId: 'ObjectId',
            learnerName: 'string',
            attemptNumber: 'number',
            status: 'started|in_progress|submitted|grading|graded',
            score: 'number',
            maxScore: 'number',
            percentage: 'number',
            passed: 'boolean',
            gradeLetter: 'string',
            timeLimit: 'number',
            remainingTime: 'number | null',
            timeSpent: 'number',
            questions: [
              {
                id: 'string',
                questionText: 'string',
                questionType: 'string',
                order: 'number',
                points: 'number',
                options: ['array'],
                userAnswer: 'string | string[] | null',
                correctAnswer: 'string | string[] | null',
                isCorrect: 'boolean | null',
                scoreEarned: 'number',
                feedback: 'string | null',
                explanation: 'string'
              }
            ],
            instructions: 'string',
            allowReview: 'boolean',
            showFeedback: 'boolean',
            startedAt: 'Date',
            submittedAt: 'Date | null',
            gradedAt: 'Date | null',
            gradedBy: 'object | null',
            feedback: 'string | null',
            metadata: 'object',
            createdAt: 'Date',
            updatedAt: 'Date'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot view this exam attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Exam attempt not found' }
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
          examId: '507f1f77bcf86cd799439013',
          examTitle: 'Introduction to CBT - Module 1 Quiz',
          examType: 'quiz',
          learnerId: '507f1f77bcf86cd799439015',
          learnerName: 'Jane Smith',
          attemptNumber: 2,
          status: 'graded',
          score: 85,
          maxScore: 100,
          percentage: 85,
          passed: true,
          gradeLetter: 'B',
          timeLimit: 1800,
          remainingTime: null,
          timeSpent: 1500,
          questions: [
            {
              id: '507f1f77bcf86cd799439014',
              questionText: 'What does CBT stand for?',
              questionType: 'multiple_choice',
              order: 1,
              points: 10,
              options: [
                'Computer-Based Training',
                'Cognitive Behavioral Therapy',
                'Core Business Technology',
                'Certified Business Trainer'
              ],
              userAnswer: 'Computer-Based Training',
              correctAnswer: 'Computer-Based Training',
              isCorrect: true,
              scoreEarned: 10,
              feedback: null,
              explanation: 'CBT stands for Computer-Based Training in the context of educational technology.'
            }
          ],
          instructions: 'Read each question carefully. You have 30 minutes to complete this quiz.',
          allowReview: true,
          showFeedback: true,
          startedAt: '2026-01-08T09:00:00.000Z',
          submittedAt: '2026-01-08T09:25:00.000Z',
          gradedAt: '2026-01-08T09:30:00.000Z',
          gradedBy: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe'
          },
          feedback: 'Great job! You demonstrated a solid understanding of the material.',
          metadata: {
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0...',
            proctoring: {
              sessionId: 'proc_12345',
              violations: []
            }
          },
          createdAt: '2026-01-08T09:00:00.000Z',
          updatedAt: '2026-01-08T09:30:00.000Z'
        }
      }
    },

    permissions: ['read:exam-attempts'],

    notes: `
      - Learners can only view their own attempts
      - Staff can view attempts for exams in their departments
      - correctAnswer only shown if:
        - Attempt is graded AND exam.allowReview is true, OR
        - User is staff with write:exam-attempts permission
      - remainingTime calculated in real-time for active attempts
      - remainingTime is null for submitted/graded attempts
      - isCorrect is null for essay/short_answer questions before grading
      - feedback per question only shown if exam.showFeedback is true
      - Proctoring metadata included if proctoring was enabled
      - gradedBy is null for auto-graded attempts
    `
  },

  /**
   * Submit Answer(s) for Questions
   */
  submitAnswers: {
    endpoint: '/api/v2/exam-attempts/:id/answers',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Submit or update answer(s) for one or more questions',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exam attempt ID'
        }
      },
      body: {
        answers: {
          type: 'array',
          required: true,
          minItems: 1,
          description: 'Array of answer objects',
          items: {
            questionId: {
              type: 'ObjectId',
              required: true,
              description: 'Question ID'
            },
            answer: {
              type: 'string | string[]',
              required: true,
              description: 'Answer value (string for single, array for multiple)'
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
            attemptId: 'string',
            status: 'in_progress',
            answeredCount: 'number',
            totalQuestions: 'number',
            remainingTime: 'number | null',
            updatedAnswers: [
              {
                questionId: 'string',
                answer: 'string | string[]',
                savedAt: 'Date'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid answer format' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot modify this exam attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Exam attempt or question not found' },
        { status: 409, code: 'ATTEMPT_CLOSED', message: 'Cannot submit answers to completed attempt' },
        { status: 409, code: 'TIME_EXPIRED', message: 'Time limit exceeded, attempt auto-submitted' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          answers: [
            {
              questionId: '507f1f77bcf86cd799439014',
              answer: 'Computer-Based Training'
            },
            {
              questionId: '507f1f77bcf86cd799439016',
              answer: 'true'
            }
          ]
        }
      },
      response: {
        success: true,
        message: 'Answers saved successfully',
        data: {
          attemptId: '507f1f77bcf86cd799439020',
          status: 'in_progress',
          answeredCount: 8,
          totalQuestions: 10,
          remainingTime: 1200,
          updatedAnswers: [
            {
              questionId: '507f1f77bcf86cd799439014',
              answer: 'Computer-Based Training',
              savedAt: '2026-01-08T09:15:00.000Z'
            },
            {
              questionId: '507f1f77bcf86cd799439016',
              answer: 'true',
              savedAt: '2026-01-08T09:15:00.000Z'
            }
          ]
        }
      }
    },

    permissions: ['create:exam-attempts'],

    notes: `
      - Learners can only submit answers to their own attempts
      - Can submit multiple answers in single request
      - Answers can be updated multiple times before final submission
      - Status changes from 'started' to 'in_progress' after first answer
      - Validates answer format based on question type
      - Multiple choice: single string matching one option
      - True/false: 'true' or 'false' string
      - Short answer/essay: string (freeform text)
      - Matching: array of paired strings
      - Validates time limit - auto-submits if time expired
      - remainingTime updated in real-time
      - Answers auto-saved (no explicit save button needed)
      - Cannot modify answers after attempt submitted
    `
  },

  /**
   * Submit Exam for Grading
   */
  submit: {
    endpoint: '/api/v2/exam-attempts/:id/submit',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Submit exam attempt for grading (final submission)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exam attempt ID'
        }
      },
      body: {
        confirmSubmit: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Confirmation flag (prevents accidental submission)'
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
            status: 'submitted|graded',
            score: 'number',
            maxScore: 'number',
            percentage: 'number',
            passed: 'boolean',
            gradeLetter: 'string | null',
            autoGraded: 'boolean',
            requiresManualGrading: 'boolean',
            submittedAt: 'Date',
            gradedAt: 'Date | null',
            timeSpent: 'number',
            answeredCount: 'number',
            totalQuestions: 'number',
            correctCount: 'number',
            incorrectCount: 'number',
            unansweredCount: 'number'
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Attempt already submitted' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot submit this exam attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Exam attempt not found' },
        { status: 409, code: 'ALREADY_SUBMITTED', message: 'Exam attempt already submitted' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          confirmSubmit: true
        }
      },
      response: {
        success: true,
        message: 'Exam submitted successfully',
        data: {
          attemptId: '507f1f77bcf86cd799439020',
          status: 'graded',
          score: 85,
          maxScore: 100,
          percentage: 85,
          passed: true,
          gradeLetter: 'B',
          autoGraded: true,
          requiresManualGrading: false,
          submittedAt: '2026-01-08T09:25:00.000Z',
          gradedAt: '2026-01-08T09:25:00.000Z',
          timeSpent: 1500,
          answeredCount: 10,
          totalQuestions: 10,
          correctCount: 9,
          incorrectCount: 1,
          unansweredCount: 0
        }
      }
    },

    permissions: ['create:exam-attempts'],

    notes: `
      - Learners can only submit their own attempts
      - Status changes from 'in_progress' to 'submitted' or 'graded'
      - Auto-grading performed immediately for objective questions:
        - Multiple choice: exact match with correct answer
        - True/false: exact match with correct answer
      - Manual grading required for subjective questions:
        - Short answer: requires instructor review
        - Essay: requires instructor review
        - Status set to 'submitted' if manual grading needed
        - Status set to 'graded' if all auto-graded
      - Unanswered questions scored as 0 points
      - timeSpent calculated from startedAt to submittedAt
      - Late submission tracked if submitted after due date
      - Passing determined by comparing percentage to exam.passingScore
      - gradeLetter assigned based on organization grading scale
      - Cannot be undone once submitted
      - Triggers notifications if configured (learner, instructor)
      - Updates course progress and completion status
    `
  },

  /**
   * Get Exam Results with Feedback
   */
  getResults: {
    endpoint: '/api/v2/exam-attempts/:id/results',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get graded results with detailed feedback',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exam attempt ID'
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
            examTitle: 'string',
            learnerName: 'string',
            attemptNumber: 'number',
            status: 'graded',
            score: 'number',
            maxScore: 'number',
            percentage: 'number',
            passed: 'boolean',
            gradeLetter: 'string',
            passingScore: 'number',
            submittedAt: 'Date',
            gradedAt: 'Date',
            timeSpent: 'number',
            timeLimit: 'number',
            summary: {
              totalQuestions: 'number',
              answeredCount: 'number',
              unansweredCount: 'number',
              correctCount: 'number',
              incorrectCount: 'number',
              partialCreditCount: 'number'
            },
            questionResults: [
              {
                questionId: 'string',
                questionNumber: 'number',
                questionText: 'string',
                questionType: 'string',
                points: 'number',
                scoreEarned: 'number',
                userAnswer: 'string | string[] | null',
                correctAnswer: 'string | string[] | null',
                isCorrect: 'boolean',
                feedback: 'string | null',
                explanation: 'string'
              }
            ],
            overallFeedback: 'string | null',
            gradedBy: 'object | null',
            allowReview: 'boolean',
            showCorrectAnswers: 'boolean'
          }
        }
      },
      errors: [
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Cannot view results for this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Exam attempt not found' },
        { status: 409, code: 'NOT_GRADED', message: 'Attempt has not been graded yet' },
        { status: 409, code: 'REVIEW_NOT_ALLOWED', message: 'Review not allowed for this exam' }
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
          examTitle: 'Introduction to CBT - Module 1 Quiz',
          learnerName: 'Jane Smith',
          attemptNumber: 2,
          status: 'graded',
          score: 85,
          maxScore: 100,
          percentage: 85,
          passed: true,
          gradeLetter: 'B',
          passingScore: 70,
          submittedAt: '2026-01-08T09:25:00.000Z',
          gradedAt: '2026-01-08T09:30:00.000Z',
          timeSpent: 1500,
          timeLimit: 1800,
          summary: {
            totalQuestions: 10,
            answeredCount: 10,
            unansweredCount: 0,
            correctCount: 9,
            incorrectCount: 1,
            partialCreditCount: 0
          },
          questionResults: [
            {
              questionId: '507f1f77bcf86cd799439014',
              questionNumber: 1,
              questionText: 'What does CBT stand for?',
              questionType: 'multiple_choice',
              points: 10,
              scoreEarned: 10,
              userAnswer: 'Computer-Based Training',
              correctAnswer: 'Computer-Based Training',
              isCorrect: true,
              feedback: null,
              explanation: 'CBT stands for Computer-Based Training in the context of educational technology.'
            }
          ],
          overallFeedback: 'Great job! You demonstrated a solid understanding of the material.',
          gradedBy: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe'
          },
          allowReview: true,
          showCorrectAnswers: true
        }
      }
    },

    permissions: ['read:exam-attempts'],

    notes: `
      - Learners can only view their own results
      - Staff can view results for attempts in their departments
      - Only available for graded attempts (status: 'graded')
      - correctAnswer only shown if exam.allowReview is true
      - Question feedback shown if exam.showFeedback is true
      - showCorrectAnswers reflects exam configuration
      - If allowReview is false, endpoint returns 409 error
      - gradedBy is null for fully auto-graded attempts
      - partialCreditCount for manually graded partial credit
      - timeSpent in seconds, timeLimit for reference
      - questionResults ordered by questionNumber
    `
  },

  /**
   * Manual Grading (Instructor)
   */
  grade: {
    endpoint: '/api/v2/exam-attempts/:id/grade',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Manually grade or update grades for an exam attempt',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json'
      },
      params: {
        id: {
          type: 'ObjectId',
          required: true,
          description: 'Exam attempt ID'
        }
      },
      body: {
        questionGrades: {
          type: 'array',
          required: true,
          minItems: 1,
          description: 'Array of question grades',
          items: {
            questionId: {
              type: 'ObjectId',
              required: true,
              description: 'Question ID'
            },
            scoreEarned: {
              type: 'number',
              required: true,
              min: 0,
              description: 'Points awarded (0 to question.points)'
            },
            feedback: {
              type: 'string',
              required: false,
              maxLength: 2000,
              description: 'Feedback for this specific question'
            }
          }
        },
        overallFeedback: {
          type: 'string',
          required: false,
          maxLength: 5000,
          description: 'Overall feedback for the entire attempt'
        },
        notifyLearner: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Send notification to learner when grading complete'
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
            status: 'graded',
            score: 'number',
            maxScore: 'number',
            percentage: 'number',
            passed: 'boolean',
            gradeLetter: 'string',
            gradedAt: 'Date',
            gradedBy: {
              id: 'string',
              firstName: 'string',
              lastName: 'string'
            },
            questionGrades: [
              {
                questionId: 'string',
                scoreEarned: 'number',
                maxPoints: 'number',
                feedback: 'string | null'
              }
            ]
          }
        }
      },
      errors: [
        { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid grading data' },
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to grade this attempt' },
        { status: 404, code: 'NOT_FOUND', message: 'Exam attempt or question not found' },
        { status: 409, code: 'NOT_SUBMITTED', message: 'Cannot grade attempt that has not been submitted' }
      ]
    },

    example: {
      request: {
        params: { id: '507f1f77bcf86cd799439020' },
        body: {
          questionGrades: [
            {
              questionId: '507f1f77bcf86cd799439018',
              scoreEarned: 8,
              feedback: 'Good answer, but could have included more detail about the implementation process.'
            },
            {
              questionId: '507f1f77bcf86cd799439019',
              scoreEarned: 15,
              feedback: 'Excellent response! You demonstrated a thorough understanding of the concept.'
            }
          ],
          overallFeedback: 'Great job overall! Your understanding of the core concepts is solid. Focus on providing more implementation details in future exams.',
          notifyLearner: true
        }
      },
      response: {
        success: true,
        message: 'Exam attempt graded successfully',
        data: {
          attemptId: '507f1f77bcf86cd799439020',
          status: 'graded',
          score: 88,
          maxScore: 100,
          percentage: 88,
          passed: true,
          gradeLetter: 'B+',
          gradedAt: '2026-01-08T10:30:00.000Z',
          gradedBy: {
            id: '507f1f77bcf86cd799439011',
            firstName: 'John',
            lastName: 'Doe'
          },
          questionGrades: [
            {
              questionId: '507f1f77bcf86cd799439018',
              scoreEarned: 8,
              maxPoints: 10,
              feedback: 'Good answer, but could have included more detail about the implementation process.'
            },
            {
              questionId: '507f1f77bcf86cd799439019',
              scoreEarned: 15,
              maxPoints: 15,
              feedback: 'Excellent response! You demonstrated a thorough understanding of the concept.'
            }
          ]
        }
      }
    },

    permissions: ['write:exam-attempts', 'grade:exams'],

    notes: `
      - Only staff with grading permissions can grade attempts
      - Staff can only grade attempts for exams in their departments
      - Attempt must be in 'submitted' or 'grading' status
      - Can grade all questions or subset of questions
      - Previously auto-graded questions can be overridden
      - scoreEarned validated: 0 <= scoreEarned <= question.points
      - Total score recalculated from all question scores
      - Percentage recalculated: (totalScore / maxScore) * 100
      - Passing status updated based on new percentage
      - gradeLetter assigned based on organization grading scale
      - Status changed to 'graded' after grading complete
      - gradedBy set to current user
      - gradedAt timestamp updated
      - Notification sent to learner if notifyLearner is true
      - Course progress updated based on passing status
      - Audit log created for grading action
    `
  },

  /**
   * List All Attempts for Exam
   */
  listByExam: {
    endpoint: '/api/v2/exam-attempts/exam/:examId',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'List all attempts for a specific exam (instructor view)',

    request: {
      headers: {
        'Authorization': 'Bearer <token>'
      },
      params: {
        examId: {
          type: 'ObjectId',
          required: true,
          description: 'Exam/exercise ID'
        }
      },
      query: {
        page: { type: 'number', required: false, default: 1, min: 1 },
        limit: { type: 'number', required: false, default: 20, min: 1, max: 100 },
        status: {
          type: 'string',
          required: false,
          enum: ['started', 'in_progress', 'submitted', 'grading', 'graded'],
          description: 'Filter by status'
        },
        passed: {
          type: 'boolean',
          required: false,
          description: 'Filter by passed status'
        },
        sort: {
          type: 'string',
          required: false,
          default: '-submittedAt',
          description: 'Sort field'
        }
      }
    },

    response: {
      success: {
        status: 200,
        body: {
          success: 'boolean',
          data: {
            examId: 'string',
            examTitle: 'string',
            statistics: {
              totalAttempts: 'number',
              completedAttempts: 'number',
              inProgressAttempts: 'number',
              averageScore: 'number',
              averagePercentage: 'number',
              passRate: 'number',
              averageTimeSpent: 'number'
            },
            attempts: [
              {
                id: 'string',
                learnerId: 'ObjectId',
                learnerName: 'string',
                learnerEmail: 'string',
                attemptNumber: 'number',
                status: 'string',
                score: 'number',
                maxScore: 'number',
                percentage: 'number',
                passed: 'boolean',
                startedAt: 'Date',
                submittedAt: 'Date | null',
                gradedAt: 'Date | null',
                timeSpent: 'number',
                requiresGrading: 'boolean'
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
        { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions to view exam attempts' },
        { status: 404, code: 'EXAM_NOT_FOUND', message: 'Exam not found' }
      ]
    },

    example: {
      request: {
        params: { examId: '507f1f77bcf86cd799439013' },
        query: {
          status: 'submitted',
          page: 1,
          limit: 20,
          sort: '-submittedAt'
        }
      },
      response: {
        success: true,
        data: {
          examId: '507f1f77bcf86cd799439013',
          examTitle: 'Introduction to CBT - Module 1 Quiz',
          statistics: {
            totalAttempts: 125,
            completedAttempts: 120,
            inProgressAttempts: 5,
            averageScore: 82.5,
            averagePercentage: 82.5,
            passRate: 0.89,
            averageTimeSpent: 1450
          },
          attempts: [
            {
              id: '507f1f77bcf86cd799439020',
              learnerId: '507f1f77bcf86cd799439015',
              learnerName: 'Jane Smith',
              learnerEmail: 'jane.smith@example.com',
              attemptNumber: 2,
              status: 'submitted',
              score: 0,
              maxScore: 100,
              percentage: 0,
              passed: false,
              startedAt: '2026-01-08T09:00:00.000Z',
              submittedAt: '2026-01-08T09:25:00.000Z',
              gradedAt: null,
              timeSpent: 1500,
              requiresGrading: true
            }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 15,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    },

    permissions: ['read:exam-attempts', 'write:exam-attempts'],

    notes: `
      - Only staff with appropriate permissions can access
      - Staff see attempts for exams in their departments only
      - Global admins see all attempts for all exams
      - Statistics calculated from completed attempts only
      - averageTimeSpent in seconds
      - passRate is decimal (0.89 = 89%)
      - requiresGrading true if status is 'submitted' or 'grading'
      - Useful for instructors to monitor exam progress
      - Can filter by status to find attempts needing grading
      - learnerEmail included for instructor convenience
      - Sort by submittedAt to prioritize grading queue
    `
  }
};

// Type exports for consumers
export type ExamAttemptsContractType = typeof ExamAttemptsContracts;
export type ExamAttemptListRequest = typeof ExamAttemptsContracts.list.example.request;
export type ExamAttemptListResponse = typeof ExamAttemptsContracts.list.example.response;
export type CreateExamAttemptRequest = typeof ExamAttemptsContracts.create.example.request;
export type CreateExamAttemptResponse = typeof ExamAttemptsContracts.create.example.response;
export type ExamAttemptDetailsResponse = typeof ExamAttemptsContracts.getById.example.response;
export type SubmitAnswersRequest = typeof ExamAttemptsContracts.submitAnswers.example.request;
export type SubmitAnswersResponse = typeof ExamAttemptsContracts.submitAnswers.example.response;
export type SubmitExamResponse = typeof ExamAttemptsContracts.submit.example.response;
export type ExamResultsResponse = typeof ExamAttemptsContracts.getResults.example.response;
export type GradeExamRequest = typeof ExamAttemptsContracts.grade.example.request;
export type GradeExamResponse = typeof ExamAttemptsContracts.grade.example.response;
export type ExamAttemptsByExamResponse = typeof ExamAttemptsContracts.listByExam.example.response;
