import { Request, Response } from 'express';
import { AssessmentAttemptsService } from '@/services/progress/assessment-attempts.service';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiResponse } from '@/utils/ApiResponse';
import { ApiError } from '@/utils/ApiError';

/**
 * Assessment Attempts Controller
 * Handles all assessment attempt endpoints for learner progress tracking
 */

/**
 * GET /api/v2/assessments/:assessmentId/attempts
 * List all attempts for an assessment (learner sees own, staff sees all)
 */
export const listAttempts = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { assessmentId } = req.params;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  const filters = {
    status: req.query.status as 'in_progress' | 'submitted' | 'graded' | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate status if provided
  const validStatuses = ['in_progress', 'submitted', 'graded', 'abandoned'];
  if (filters.status && !validStatuses.includes(filters.status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Staff can filter by learnerId, learners only see their own
  const learnerId = req.query.learnerId as string | undefined;

  const result = await AssessmentAttemptsService.listAttempts(
    assessmentId,
    learnerId || user.userId,
    filters
  );

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/assessments/:assessmentId/attempts/my
 * Get the current user's attempts for an assessment
 */
export const getMyAttempts = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { assessmentId } = req.params;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  const filters = {
    status: req.query.status as 'in_progress' | 'submitted' | 'graded' | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  const result = await AssessmentAttemptsService.listAttempts(
    assessmentId,
    user.userId,
    filters
  );

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/assessments/:assessmentId/attempts/start
 * Start a new attempt on an assessment
 */
export const startAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { assessmentId } = req.params;
  const { enrollmentId, moduleId, learningUnitId } = req.body;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  if (!enrollmentId) {
    throw ApiError.badRequest('enrollmentId is required');
  }

  const attempt = await AssessmentAttemptsService.startAttempt(
    assessmentId,
    user.userId,
    enrollmentId,
    moduleId,
    learningUnitId
  );

  res.status(201).json(ApiResponse.created(attempt, 'Assessment attempt started'));
});

/**
 * GET /api/v2/assessments/:assessmentId/attempts/:attemptId
 * Get a specific attempt by ID
 */
export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { assessmentId, attemptId } = req.params;

  if (!assessmentId) {
    throw ApiError.badRequest('Assessment ID is required');
  }

  if (!attemptId) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  const result = await AssessmentAttemptsService.getAttemptResults(attemptId, user.userId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/assessments/:assessmentId/attempts/:attemptId/save
 * Save progress on an in-progress attempt (auto-save)
 */
export const saveProgress = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { responses } = req.body;

  if (!attemptId) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  if (!responses || !Array.isArray(responses)) {
    throw ApiError.badRequest('responses is required and must be an array');
  }

  const attempt = await AssessmentAttemptsService.saveProgress(attemptId, responses);

  res.status(200).json(ApiResponse.success({
    attemptId: attempt._id,
    savedResponses: responses.length,
    lastActivityAt: attempt.timing.lastActivityAt,
    timeRemainingSeconds: attempt.timing.timeLimitSeconds
      ? Math.max(0, attempt.timing.timeLimitSeconds - attempt.timing.timeSpentSeconds)
      : null
  }, 'Progress saved'));
});

/**
 * POST /api/v2/assessments/:assessmentId/attempts/:attemptId/submit
 * Submit an attempt for grading
 */
export const submitAttempt = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { responses } = req.body;

  if (!attemptId) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  // If final responses are provided, save them first
  if (responses && Array.isArray(responses) && responses.length > 0) {
    await AssessmentAttemptsService.saveProgress(attemptId, responses);
  }

  const attempt = await AssessmentAttemptsService.submitAttempt(attemptId);

  res.status(200).json(ApiResponse.success({
    attemptId: attempt._id,
    status: attempt.status,
    submittedAt: attempt.timing.submittedAt,
    scoring: {
      rawScore: attempt.scoring.rawScore,
      percentageScore: attempt.scoring.percentageScore,
      passed: attempt.scoring.passed,
      gradingComplete: attempt.scoring.gradingComplete,
      requiresManualGrading: attempt.scoring.requiresManualGrading
    },
    timing: {
      startedAt: attempt.timing.startedAt,
      submittedAt: attempt.timing.submittedAt,
      timeSpentSeconds: attempt.timing.timeSpentSeconds
    }
  }, 'Assessment submitted successfully'));
});

/**
 * POST /api/v2/assessments/:assessmentId/attempts/:attemptId/grade
 * Manually grade a question (for essay/short-answer)
 */
export const gradeQuestion = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { attemptId } = req.params;
  const { questionIndex, score, feedback } = req.body;

  if (!attemptId) {
    throw ApiError.badRequest('Attempt ID is required');
  }

  if (questionIndex === undefined || typeof questionIndex !== 'number') {
    throw ApiError.badRequest('questionIndex is required and must be a number');
  }

  if (score === undefined || typeof score !== 'number') {
    throw ApiError.badRequest('score is required and must be a number');
  }

  if (score < 0) {
    throw ApiError.badRequest('score must be at least 0');
  }

  if (feedback !== undefined && typeof feedback !== 'string') {
    throw ApiError.badRequest('feedback must be a string');
  }

  if (feedback && feedback.length > 2000) {
    throw ApiError.badRequest('feedback cannot exceed 2000 characters');
  }

  const attempt = await AssessmentAttemptsService.gradeQuestion(
    attemptId,
    questionIndex,
    score,
    feedback || '',
    user.userId
  );

  const question = attempt.questions[questionIndex];

  res.status(200).json(ApiResponse.success({
    attemptId: attempt._id,
    questionIndex,
    pointsEarned: question.pointsEarned,
    pointsPossible: question.pointsPossible,
    gradedAt: question.gradedAt,
    gradedBy: question.gradedBy,
    updatedScoring: {
      rawScore: attempt.scoring.rawScore,
      percentageScore: attempt.scoring.percentageScore,
      passed: attempt.scoring.passed,
      gradingComplete: attempt.scoring.gradingComplete
    }
  }, 'Question graded successfully'));
});
