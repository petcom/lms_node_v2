import { Request, Response } from 'express';
import { ModuleAccessService } from '@/services/progress/module-access.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Module Access Controller
 * Handles all /api/v2/module-access endpoints
 *
 * Tracks learner access and engagement at the module level
 * for analytics and progress tracking. Used for identifying
 * drop-off points and understanding learner behavior.
 */

/**
 * GET /api/v2/module-access
 * List module access records with filtering options
 */
export const listAccess = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { moduleId, enrollmentId, hasStartedLearningUnit, status, page, limit } = req.query;

  // Validate that at least moduleId or enrollmentId is provided
  if (!moduleId && !enrollmentId) {
    throw ApiError.badRequest('Either moduleId or enrollmentId is required');
  }

  // Parse pagination parameters
  const parsedPage = page ? parseInt(page as string, 10) : 1;
  const parsedLimit = limit ? Math.min(parseInt(limit as string, 10), 100) : 50;

  if (isNaN(parsedPage) || parsedPage < 1) {
    throw ApiError.badRequest('Page must be a positive integer');
  }

  if (isNaN(parsedLimit) || parsedLimit < 1) {
    throw ApiError.badRequest('Limit must be a positive integer');
  }

  // Validate status if provided
  const validStatuses = ['accessed', 'in_progress', 'completed'];
  if (status && !validStatuses.includes(status as string)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Parse hasStartedLearningUnit
  let parsedHasStarted: boolean | undefined;
  if (hasStartedLearningUnit !== undefined) {
    parsedHasStarted = hasStartedLearningUnit === 'true';
  }

  let result;

  if (moduleId) {
    // Get access records by module
    result = await ModuleAccessService.getAccessByModule(moduleId as string, {
      hasStartedLearningUnit: parsedHasStarted,
      status: status as any,
      page: parsedPage,
      limit: parsedLimit
    });
  } else if (enrollmentId) {
    // Get access records by enrollment
    const accessRecords = await ModuleAccessService.getAccessByEnrollment(enrollmentId as string);
    result = {
      accessRecords,
      pagination: {
        page: 1,
        limit: accessRecords.length,
        total: accessRecords.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/module-access/my
 * Get current user's module access records
 */
export const getMyAccess = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { enrollmentId, moduleId } = req.query;

  if (!enrollmentId) {
    throw ApiError.badRequest('Enrollment ID is required');
  }

  // Get access records for the enrollment
  const accessRecords = await ModuleAccessService.getAccessByEnrollment(enrollmentId as string);

  // Filter by moduleId if provided
  let filteredRecords = accessRecords;
  if (moduleId) {
    filteredRecords = accessRecords.filter(
      record => record.moduleId.toString() === moduleId
    );
  }

  // Filter to only show records belonging to the current user
  filteredRecords = filteredRecords.filter(
    record => record.learnerId.toString() === user.userId
  );

  res.status(200).json(ApiResponse.success({
    accessRecords: filteredRecords,
    count: filteredRecords.length
  }));
});

/**
 * POST /api/v2/module-access
 * Record module access for a learner
 */
export const recordAccess = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { moduleId, enrollmentId, courseId } = req.body;

  // Validate required fields
  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  if (!enrollmentId) {
    throw ApiError.badRequest('Enrollment ID is required');
  }

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Use the current user's ID as the learner ID
  const learnerId = user.userId;

  const accessRecord = await ModuleAccessService.recordAccess(
    learnerId,
    moduleId,
    enrollmentId,
    courseId
  );

  // Determine if this was a new access or an update
  const isNewAccess = accessRecord.accessCount === 1;

  res.status(isNewAccess ? 201 : 200).json(ApiResponse.success({
    moduleAccessId: accessRecord._id,
    moduleId: accessRecord.moduleId,
    learnerId: accessRecord.learnerId,
    enrollmentId: accessRecord.enrollmentId,
    courseId: accessRecord.courseId,
    firstAccessedAt: accessRecord.firstAccessedAt,
    lastAccessedAt: accessRecord.lastAccessedAt,
    accessCount: accessRecord.accessCount,
    hasStartedLearningUnit: accessRecord.hasStartedLearningUnit,
    status: accessRecord.status,
    isNewAccess
  }, isNewAccess ? 'Module access recorded' : 'Module access updated'));
});

/**
 * GET /api/v2/module-access/:accessId
 * Get a specific module access record
 */
export const getAccessRecord = asyncHandler(async (req: Request, _res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { accessId } = req.params;

  if (!accessId) {
    throw ApiError.badRequest('Access ID is required');
  }

  // Note: ModuleAccessService doesn't have a getById method yet
  // This would need to be added to the service layer
  // For now, return 501 Not Implemented
  throw new ApiError(501, 'Get access record by ID not yet implemented');
});

/**
 * PUT /api/v2/module-access/:accessId
 * Update a module access record
 */
export const updateAccess = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { accessId } = req.params;
  const { action, learningUnitsCompleted, learningUnitsTotal } = req.body;

  if (!accessId) {
    throw ApiError.badRequest('Access ID is required');
  }

  if (!action) {
    throw ApiError.badRequest('Action is required');
  }

  const validActions = ['mark_learning_unit_started', 'update_progress', 'mark_completed'];
  if (!validActions.includes(action)) {
    throw ApiError.badRequest(`Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  let result;

  switch (action) {
    case 'mark_learning_unit_started':
      result = await ModuleAccessService.markLearningUnitStarted(accessId);
      break;

    case 'update_progress':
      if (learningUnitsCompleted === undefined || learningUnitsTotal === undefined) {
        throw ApiError.badRequest('learningUnitsCompleted and learningUnitsTotal are required for update_progress action');
      }

      if (typeof learningUnitsCompleted !== 'number' || learningUnitsCompleted < 0) {
        throw ApiError.badRequest('learningUnitsCompleted must be a non-negative number');
      }

      if (typeof learningUnitsTotal !== 'number' || learningUnitsTotal < 0) {
        throw ApiError.badRequest('learningUnitsTotal must be a non-negative number');
      }

      result = await ModuleAccessService.updateProgress(accessId, learningUnitsCompleted, learningUnitsTotal);
      break;

    case 'mark_completed':
      result = await ModuleAccessService.markCompleted(accessId);
      break;

    default:
      throw ApiError.badRequest('Invalid action');
  }

  res.status(200).json(ApiResponse.success({
    moduleAccessId: result._id,
    moduleId: result.moduleId,
    learnerId: result.learnerId,
    hasStartedLearningUnit: result.hasStartedLearningUnit,
    firstLearningUnitStartedAt: result.firstLearningUnitStartedAt,
    learningUnitsCompleted: result.learningUnitsCompleted,
    learningUnitsTotal: result.learningUnitsTotal,
    status: result.status,
    completedAt: result.completedAt
  }, `Module access ${action.replace(/_/g, ' ')}`));
});

/**
 * GET /api/v2/module-access/analytics/drop-off
 * Get drop-off analytics for modules
 */
export const getDropOffAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const { courseId } = req.query;

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Check permissions - only staff with analytics access should see this
  const hasAnalyticsAccess = user.allAccessRights?.includes('read:analytics') ||
                             user.allAccessRights?.includes('reports:department:read') ||
                             user.roles?.includes('system-admin');

  if (!hasAnalyticsAccess) {
    throw ApiError.forbidden('You do not have permission to view analytics');
  }

  const summary = await ModuleAccessService.getAccessSummary(courseId as string);

  res.status(200).json(ApiResponse.success({
    courseId,
    metrics: {
      totalModules: summary.totalModules,
      totalAccess: summary.totalAccess,
      accessedOnly: summary.accessedOnly,
      inProgress: summary.inProgress,
      completed: summary.completed,
      dropOffRate: summary.dropOffRate,
      dropOffPercentage: Math.round(summary.dropOffRate * 100)
    },
    insights: {
      learnersNotStartingContent: summary.accessedOnly,
      learnersStuckInProgress: summary.inProgress,
      completionRate: summary.totalAccess > 0
        ? Math.round((summary.completed / summary.totalAccess) * 100)
        : 0
    }
  }));
});
