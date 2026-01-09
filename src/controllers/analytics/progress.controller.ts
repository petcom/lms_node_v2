import { Request, Response } from 'express';
import { ProgressService } from '@/services/analytics/progress.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Progress Tracking Controller
 * Handles all /api/v2/progress endpoints
 */

/**
 * GET /api/v2/progress/program/:programId
 * Get learner progress for a specific program
 */
export const getProgramProgress = asyncHandler(async (req: Request, res: Response) => {
  const { programId } = req.params;
  const { learnerId } = req.query;

  // Validate programId
  if (!programId) {
    throw ApiError.badRequest('Program ID is required');
  }

  // Determine learner ID (from query or current user)
  const targetLearnerId = (learnerId as string) || (req as any).user?.id;
  if (!targetLearnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // TODO: Add permission checks
  // - Learners can only view their own progress
  // - Staff can view progress for learners in their departments
  // - Global admins can view any learner's progress

  const result = await ProgressService.getProgramProgress({
    programId,
    learnerId: targetLearnerId
  });

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/progress/course/:courseId
 * Get detailed progress for a specific course
 */
export const getCourseProgress = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { learnerId } = req.query;

  // Validate courseId
  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Determine learner ID (from query or current user)
  const targetLearnerId = (learnerId as string) || (req as any).user?.id;
  if (!targetLearnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // TODO: Add permission checks
  // - Learners can only view their own course progress
  // - Instructors can view progress for their assigned courses
  // - Staff can view progress for courses in their departments

  const result = await ProgressService.getCourseProgress({
    courseId,
    learnerId: targetLearnerId
  });

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/progress/class/:classId
 * Get progress for a specific class with attendance tracking
 */
export const getClassProgress = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;
  const { learnerId } = req.query;

  // Validate classId
  if (!classId) {
    throw ApiError.badRequest('Class ID is required');
  }

  // Determine learner ID (from query or current user)
  const targetLearnerId = (learnerId as string) || (req as any).user?.id;
  if (!targetLearnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // TODO: Add permission checks
  // - Learners can view their own class progress
  // - Instructors can view progress for their assigned classes
  // - Staff can view progress for classes in their departments

  const result = await ProgressService.getClassProgress({
    classId,
    learnerId: targetLearnerId
  });

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/progress/learner/:learnerId
 * Get comprehensive progress overview for a learner across all enrollments
 */
export const getLearnerProgress = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId } = req.params;

  // Validate learnerId
  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // TODO: Add permission checks
  // - Learners can view their own overall progress
  // - Staff can view learners in their departments
  // - Global admins can view any learner

  const result = await ProgressService.getLearnerProgress(learnerId);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/progress/learner/:learnerId/program/:programId
 * Get detailed progress for a specific learner in a specific program
 */
export const getLearnerProgramProgress = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId, programId } = req.params;

  // Validate params
  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }
  if (!programId) {
    throw ApiError.badRequest('Program ID is required');
  }

  // TODO: Add permission checks
  // - Staff can view learners in their departments
  // - Instructors can view progress for their assigned courses within the program
  // - Global admins can view any learner's progress

  const result = await ProgressService.getProgramProgress({
    programId,
    learnerId
  });

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/progress/update
 * Manually update learner progress (instructor/admin override)
 */
export const updateProgress = asyncHandler(async (req: Request, res: Response) => {
  const {
    learnerId,
    enrollmentId,
    moduleId,
    action,
    score,
    reason,
  } = req.body;

  // Validate required fields
  if (!learnerId || typeof learnerId !== 'string') {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!enrollmentId || typeof enrollmentId !== 'string') {
    throw ApiError.badRequest('Enrollment ID is required');
  }

  if (!action || typeof action !== 'string') {
    throw ApiError.badRequest('Action is required');
  }

  // Validate action
  const validActions = ['mark_complete', 'mark_incomplete', 'override_score', 'reset_progress'];
  if (!validActions.includes(action)) {
    throw ApiError.badRequest(
      `Invalid action. Must be one of: ${validActions.join(', ')}`
    );
  }

  // Validate score if action is override_score
  if (action === 'override_score') {
    if (score === undefined || score === null) {
      throw ApiError.badRequest('Score is required for override_score action');
    }
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw ApiError.badRequest('Score must be a number between 0 and 100');
    }
  }

  // Validate reason
  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    throw ApiError.badRequest('Reason is required and must be at least 10 characters');
  }

  if (reason.length > 500) {
    throw ApiError.badRequest('Reason cannot exceed 500 characters');
  }

  // Validate moduleId if provided
  if (moduleId !== undefined && moduleId !== null && typeof moduleId !== 'string') {
    throw ApiError.badRequest('Module ID must be a string');
  }

  // TODO: Implement the actual update logic
  // TODO: Add permission checks
  // - Instructors can only update progress for their assigned courses
  // - Staff can update progress for courses in their departments
  // - Global admins can update any progress

  // Placeholder response
  const result = {
    enrollmentId,
    moduleId: moduleId || null,
    action,
    previousProgress: 60,
    newProgress: action === 'mark_complete' ? 100 : 0,
    previousScore: null,
    newScore: action === 'override_score' ? score : null,
    updatedAt: new Date(),
    updatedBy: {
      id: (req as any).user?.id || 'unknown',
      name: (req as any).user?.name || 'Unknown User',
      role: (req as any).user?.role || 'unknown'
    }
  };

  res.status(200).json(
    ApiResponse.success(result, 'Progress updated successfully')
  );
});

/**
 * GET /api/v2/progress/reports/summary
 * Get progress summary report with filtering options
 */
export const getProgressSummary = asyncHandler(async (req: Request, res: Response) => {
  // Extract and validate query parameters
  const {
    programId,
    courseId,
    classId,
    departmentId,
    status,
    startDate,
    endDate,
    minProgress,
    maxProgress,
    page,
    limit
  } = req.query;

  // Validate status
  if (status && !['not_started', 'in_progress', 'completed'].includes(status as string)) {
    throw ApiError.badRequest(
      'Invalid status. Must be one of: not_started, in_progress, completed'
    );
  }

  // Validate dates
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (startDate) {
    parsedStartDate = new Date(startDate as string);
    if (isNaN(parsedStartDate.getTime())) {
      throw ApiError.badRequest('Invalid startDate format');
    }
  }

  if (endDate) {
    parsedEndDate = new Date(endDate as string);
    if (isNaN(parsedEndDate.getTime())) {
      throw ApiError.badRequest('Invalid endDate format');
    }
  }

  // Validate progress range
  let parsedMinProgress: number | undefined;
  let parsedMaxProgress: number | undefined;

  if (minProgress !== undefined) {
    parsedMinProgress = parseInt(minProgress as string, 10);
    if (isNaN(parsedMinProgress) || parsedMinProgress < 0 || parsedMinProgress > 100) {
      throw ApiError.badRequest('minProgress must be a number between 0 and 100');
    }
  }

  if (maxProgress !== undefined) {
    parsedMaxProgress = parseInt(maxProgress as string, 10);
    if (isNaN(parsedMaxProgress) || parsedMaxProgress < 0 || parsedMaxProgress > 100) {
      throw ApiError.badRequest('maxProgress must be a number between 0 and 100');
    }
  }

  if (parsedMinProgress !== undefined && parsedMaxProgress !== undefined) {
    if (parsedMinProgress > parsedMaxProgress) {
      throw ApiError.badRequest('minProgress cannot be greater than maxProgress');
    }
  }

  // Validate pagination
  let parsedPage = 1;
  let parsedLimit = 50;

  if (page !== undefined) {
    parsedPage = parseInt(page as string, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      throw ApiError.badRequest('Page must be at least 1');
    }
  }

  if (limit !== undefined) {
    parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
      throw ApiError.badRequest('Limit must be between 1 and 200');
    }
  }

  // TODO: Add permission checks
  // - Staff can only see learners in their departments
  // - Instructors can see learners in their assigned courses/classes

  const filters = {
    programId: programId as string | undefined,
    courseId: courseId as string | undefined,
    classId: classId as string | undefined,
    departmentId: departmentId as string | undefined,
    status: status as string | undefined,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    minProgress: parsedMinProgress,
    maxProgress: parsedMaxProgress,
    page: parsedPage,
    limit: parsedLimit
  };

  const result = await ProgressService.getProgressSummary(filters);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/progress/reports/detailed
 * Get detailed progress report with module-level breakdown
 */
export const getDetailedProgressReport = asyncHandler(async (req: Request, res: Response) => {
  // Extract and validate query parameters
  const {
    programId,
    courseId,
    classId,
    departmentId,
    learnerIds,
    format,
    includeModules,
    includeAssessments,
    includeAttendance
  } = req.query;

  // Validate format
  const validFormats = ['json', 'csv', 'xlsx'];
  const reportFormat = (format as string) || 'json';

  if (!validFormats.includes(reportFormat)) {
    throw ApiError.badRequest(
      `Invalid format. Must be one of: ${validFormats.join(', ')}`
    );
  }

  // Parse learnerIds if provided
  let parsedLearnerIds: string[] | undefined;
  if (learnerIds) {
    if (typeof learnerIds === 'string') {
      parsedLearnerIds = learnerIds.split(',').map(id => id.trim()).filter(Boolean);
    } else if (Array.isArray(learnerIds)) {
      parsedLearnerIds = learnerIds.map(id => String(id).trim()).filter(Boolean);
    }
  }

  // Parse boolean flags
  const shouldIncludeModules = includeModules !== 'false';
  const shouldIncludeAssessments = includeAssessments !== 'false';
  const shouldIncludeAttendance = includeAttendance === 'true';

  // TODO: Add permission checks
  // - Staff can only generate reports for their departments
  // - Instructors can generate reports for their assigned courses

  const filters = {
    programId: programId as string | undefined,
    courseId: courseId as string | undefined,
    classId: classId as string | undefined,
    departmentId: departmentId as string | undefined,
    learnerIds: parsedLearnerIds,
    includeModules: shouldIncludeModules,
    includeAssessments: shouldIncludeAssessments,
    includeAttendance: shouldIncludeAttendance
  };

  const result = await ProgressService.getDetailedProgressReport(filters);

  // For CSV/XLSX formats, would need to generate file and return download URL
  if (reportFormat !== 'json') {
    // TODO: Implement file generation
    result.downloadUrl = `https://storage.example.com/reports/${result.reportId}.${reportFormat}`;
  }

  res.status(200).json(ApiResponse.success(result));
});
