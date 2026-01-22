import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as questionsController from '@/controllers/content/questions.controller';

const router = Router();

/**
 * Questions Routes
 * Base path: /api/v2/questions
 *
 * All routes require authentication
 * Permissions: read:questions, write:questions
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/questions
 * List questions with filtering and pagination
 * Access Rights: content:assessments:manage, content:lessons:read
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Department-scoped question bank
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 100)
 * - questionType: string (multiple_choice, true_false, short_answer, essay, fill_blank)
 * - tag: string
 * - difficulty: string (easy, medium, hard)
 * - search: string
 * - department: ObjectId
 * - sort: string (default: -createdAt)
 */
router.get('/',
  authorize.anyOf(['content:assessments:manage', 'content:lessons:read']),
  questionsController.listQuestions
);

/**
 * POST /api/v2/questions/bulk
 * Bulk import questions (must be before /:id to avoid route conflict)
 * Access Right: content:assessments:manage
 * Roles: content-admin, department-admin
 * Service Layer: Bulk import questions
 *
 * Body:
 * - format: string (json, csv)
 * - questions: array
 * - department: ObjectId (optional)
 * - overwriteExisting: boolean (optional, default: false)
 */
router.post('/bulk',
  authorize('content:assessments:manage'),
  questionsController.bulkImportQuestions
);

/**
 * POST /api/v2/questions
 * Create a new question
 * Access Right: content:assessments:manage
 * Roles: instructor, content-admin, department-admin
 * Service Layer: Create question (owned by creator)
 *
 * Body:
 * - questionText: string (required, max 2000 chars)
 * - questionType: string (required)
 * - options: array (required for multiple_choice and true_false)
 * - correctAnswer: string | string[] (required for some types)
 * - points: number (required, min 0.1)
 * - difficulty: string (optional, default: medium)
 * - tags: string[] (optional)
 * - explanation: string (optional, max 1000 chars)
 * - department: ObjectId (optional)
 */
router.post('/',
  authorize('content:assessments:manage'),
  questionsController.createQuestion
);

/**
 * GET /api/v2/questions/:id
 * Get details of a specific question
 * Access Rights: content:assessments:manage, content:lessons:read
 * Roles: instructor, content-admin, department-admin
 * Service Layer: View question details
 *
 * Response includes:
 * - All question details
 * - usageCount: number of question banks using this question
 * - lastUsed: date when question was last included in an assessment
 */
router.get('/:id',
  authorize.anyOf(['content:assessments:manage', 'content:lessons:read']),
  questionsController.getQuestionById
);

/**
 * PUT /api/v2/questions/:id
 * Update an existing question
 * Access Right: content:assessments:manage
 * Roles: instructor (unused, own), content-admin, department-admin
 * Service Layer: Cannot edit questions in use
 *
 * Body: (all fields optional)
 * - questionText: string
 * - questionType: string
 * - options: array
 * - correctAnswer: string | string[]
 * - points: number
 * - difficulty: string
 * - tags: string[]
 * - explanation: string
 * - department: ObjectId
 *
 * Note: Cannot update questions in use in active assessments
 */
router.put('/:id',
  authorize('content:assessments:manage'),
  questionsController.updateQuestion
);

/**
 * DELETE /api/v2/questions/:id
 * Delete a question (soft delete)
 * Access Right: content:assessments:manage
 * Roles: instructor (unused, own), department-admin (unused)
 * Service Layer: Cannot delete questions in use
 *
 * Note: Cannot delete questions in use in assessments
 */
router.delete('/:id',
  authorize('content:assessments:manage'),
  questionsController.deleteQuestion
);

export default router;
