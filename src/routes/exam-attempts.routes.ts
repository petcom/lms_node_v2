import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as examAttemptsController from '@/controllers/assessment/exam-attempts.controller';

const router = Router();

/**
 * Exam Attempts Routes
 * Base path: /api/v2/exam-attempts
 *
 * All routes require authentication
 * Handles exam attempt lifecycle: start, submit answers, grading, and results
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/exam-attempts
 * List exam attempts with filtering options
 * Permissions: read:exam-attempts, authenticated
 * Query params: page, limit, learnerId, examId, status, sort
 */
router.get('/', examAttemptsController.listAttempts);

/**
 * POST /api/v2/exam-attempts
 * Start a new exam attempt
 * Permissions: create:exam-attempts, authenticated
 * Body: { examId: string }
 */
router.post('/', examAttemptsController.createAttempt);

/**
 * GET /api/v2/exam-attempts/exam/:examId
 * List all attempts for a specific exam (instructor view)
 * Permissions: read:exam-attempts, write:exam-attempts, staff
 * Query params: page, limit, status, passed, sort
 */
router.get('/exam/:examId', examAttemptsController.listByExam);

/**
 * GET /api/v2/exam-attempts/:id
 * Get detailed exam attempt information
 * Permissions: read:exam-attempts, authenticated
 */
router.get('/:id', examAttemptsController.getAttempt);

/**
 * POST /api/v2/exam-attempts/:id/answers
 * Submit or update answer(s) for one or more questions
 * Permissions: create:exam-attempts, authenticated (own attempts only)
 * Body: { answers: [{ questionId: string, answer: string | string[] }] }
 */
router.post('/:id/answers', examAttemptsController.submitAnswers);

/**
 * POST /api/v2/exam-attempts/:id/submit
 * Submit exam attempt for grading (final submission)
 * Permissions: create:exam-attempts, authenticated (own attempts only)
 * Body: { confirmSubmit?: boolean }
 */
router.post('/:id/submit', examAttemptsController.submitExam);

/**
 * GET /api/v2/exam-attempts/:id/results
 * Get graded results with detailed feedback
 * Permissions: read:exam-attempts, authenticated
 */
router.get('/:id/results', examAttemptsController.getResults);

/**
 * POST /api/v2/exam-attempts/:id/grade
 * Manually grade or update grades for an exam attempt
 * Permissions: write:exam-attempts, grade:exams, staff
 * Body: {
 *   questionGrades: [{ questionId: string, scoreEarned: number, feedback?: string }],
 *   overallFeedback?: string,
 *   notifyLearner?: boolean
 * }
 */
router.post('/:id/grade', examAttemptsController.gradeExam);

export default router;
