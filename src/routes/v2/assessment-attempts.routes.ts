import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as assessmentAttemptsController from '@/controllers/progress/assessment-attempts.controller';
import {
  validateStartAttempt,
  validateSaveProgress,
  validateGradeQuestion
} from '@/validators/assessment-attempt.validator';

const router = Router();

/**
 * Assessment Attempts Routes
 * Base path: /api/v2/assessments/:assessmentId/attempts
 *
 * All routes require authentication
 * Handles assessment attempt lifecycle: start, save, submit, grade, and results
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/assessments/:assessmentId/attempts
 * List all attempts for an assessment
 * Permissions: take:assessments, read:assessments
 * Query params: learnerId (staff only), status, page, limit
 */
router.get('/', assessmentAttemptsController.listAttempts);

/**
 * GET /api/v2/assessments/:assessmentId/attempts/my
 * Get current user's attempts for an assessment
 * Permissions: take:assessments
 * Query params: status, page, limit
 */
router.get('/my', assessmentAttemptsController.getMyAttempts);

/**
 * POST /api/v2/assessments/:assessmentId/attempts/start
 * Start a new attempt on an assessment
 * Permissions: take:assessments
 * Body: { enrollmentId: string, moduleId?: string, learningUnitId?: string }
 */
router.post('/start', validateStartAttempt, assessmentAttemptsController.startAttempt);

/**
 * GET /api/v2/assessments/:assessmentId/attempts/:attemptId
 * Get detailed attempt information
 * Permissions: take:assessments, read:assessments
 */
router.get('/:attemptId', assessmentAttemptsController.getAttempt);

/**
 * PUT /api/v2/assessments/:assessmentId/attempts/:attemptId/save
 * Save progress on an in-progress attempt (auto-save)
 * Permissions: take:assessments (own attempts only)
 * Body: { responses: [{ questionId: string, response: any }] }
 */
router.put('/:attemptId/save', validateSaveProgress, assessmentAttemptsController.saveProgress);

/**
 * POST /api/v2/assessments/:assessmentId/attempts/:attemptId/submit
 * Submit an attempt for grading
 * Permissions: take:assessments (own attempts only)
 * Body: { responses?: [{ questionId: string, response: any }] }
 */
router.post('/:attemptId/submit', assessmentAttemptsController.submitAttempt);

/**
 * POST /api/v2/assessments/:assessmentId/attempts/:attemptId/grade
 * Manually grade a question (essay, short-answer)
 * Permissions: grade:assessments
 * Body: { questionIndex: number, score: number, feedback?: string }
 */
router.post('/:attemptId/grade', validateGradeQuestion, assessmentAttemptsController.gradeQuestion);

export default router;
