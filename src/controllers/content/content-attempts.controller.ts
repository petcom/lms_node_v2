import { Request, Response } from 'express';
import { ContentAttemptsService } from '@/services/content/content-attempts.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Content Attempts Controller
 * Handles all content attempt tracking endpoints
 */

/**
 * GET /api/v2/content-attempts
 * List content attempts with filters
 */
export const listAttempts = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const filters = {
    learnerId: req.query.learnerId as string | undefined,
    contentId: req.query.contentId as string | undefined,
    status: req.query.status as string | undefined,
    enrollmentId: req.query.enrollmentId as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate status if provided
  const validStatuses = ['not-started', 'started', 'in-progress', 'completed', 'passed', 'failed', 'suspended', 'abandoned'];
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

  const result = await ContentAttemptsService.listAttempts(filters, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * POST /api/v2/content-attempts
 * Create a new content attempt
 */
export const createAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { contentId, enrollmentId, scormVersion, launchData, metadata } = req.body;

  // Validate required fields
  if (!contentId || typeof contentId !== 'string') {
    throw ApiError.badRequest('contentId is required and must be a string');
  }

  // Validate scormVersion if provided
  if (scormVersion && !['1.2', '2004'].includes(scormVersion)) {
    throw ApiError.badRequest('scormVersion must be either 1.2 or 2004');
  }

  // Validate launchData if provided
  if (launchData !== undefined && typeof launchData !== 'string') {
    throw ApiError.badRequest('launchData must be a string');
  }

  // Validate metadata if provided
  if (metadata !== undefined && typeof metadata !== 'object') {
    throw ApiError.badRequest('metadata must be an object');
  }

  const data = {
    contentId,
    enrollmentId,
    scormVersion: scormVersion as '1.2' | '2004' | undefined,
    launchData,
    metadata
  };

  const result = await ContentAttemptsService.createAttempt(data, user.userId);
  res.status(201).json(
    ApiResponse.success({ data: result }, 'Content attempt created successfully')
  );
});

/**
 * GET /api/v2/content-attempts/:id
 * Get attempt details by ID
 */
export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  // Parse includeCmi query parameter
  const includeCmi = req.query.includeCmi === 'true';

  const result = await ContentAttemptsService.getAttemptById(id, user.userId, includeCmi);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * PATCH /api/v2/content-attempts/:id
 * Update attempt progress
 */
export const updateAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const {
    status,
    progressPercent,
    score,
    scoreRaw,
    scoreMin,
    scoreMax,
    scoreScaled,
    timeSpentSeconds,
    location,
    suspendData,
    metadata
  } = req.body;

  // Validate status if provided
  const validStatuses = ['started', 'in-progress', 'completed', 'passed', 'failed', 'suspended', 'abandoned'];
  if (status && !validStatuses.includes(status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate progressPercent if provided
  if (progressPercent !== undefined) {
    if (typeof progressPercent !== 'number' || progressPercent < 0 || progressPercent > 100) {
      throw ApiError.badRequest('progressPercent must be a number between 0 and 100');
    }
  }

  // Validate score if provided
  if (score !== undefined) {
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw ApiError.badRequest('score must be a number between 0 and 100');
    }
  }

  // Validate scoreRaw if provided
  if (scoreRaw !== undefined && typeof scoreRaw !== 'number') {
    throw ApiError.badRequest('scoreRaw must be a number');
  }

  // Validate scoreMin if provided
  if (scoreMin !== undefined && typeof scoreMin !== 'number') {
    throw ApiError.badRequest('scoreMin must be a number');
  }

  // Validate scoreMax if provided
  if (scoreMax !== undefined && typeof scoreMax !== 'number') {
    throw ApiError.badRequest('scoreMax must be a number');
  }

  // Validate scoreScaled if provided
  if (scoreScaled !== undefined) {
    if (typeof scoreScaled !== 'number' || scoreScaled < -1 || scoreScaled > 1) {
      throw ApiError.badRequest('scoreScaled must be a number between -1 and 1');
    }
  }

  // Validate timeSpentSeconds if provided
  if (timeSpentSeconds !== undefined) {
    if (typeof timeSpentSeconds !== 'number' || timeSpentSeconds < 0) {
      throw ApiError.badRequest('timeSpentSeconds must be a non-negative number');
    }
  }

  // Validate location if provided
  if (location !== undefined && typeof location !== 'string') {
    throw ApiError.badRequest('location must be a string');
  }

  // Validate suspendData if provided
  if (suspendData !== undefined && typeof suspendData !== 'string') {
    throw ApiError.badRequest('suspendData must be a string');
  }

  // Validate metadata if provided
  if (metadata !== undefined && typeof metadata !== 'object') {
    throw ApiError.badRequest('metadata must be an object');
  }

  const updateData = {
    status,
    progressPercent,
    score,
    scoreRaw,
    scoreMin,
    scoreMax,
    scoreScaled,
    timeSpentSeconds,
    location,
    suspendData,
    metadata
  };

  const result = await ContentAttemptsService.updateAttempt(id, updateData, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'Attempt updated successfully')
  );
});

/**
 * POST /api/v2/content-attempts/:id/complete
 * Mark attempt as complete
 */
export const completeAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { score, scoreRaw, scoreScaled, passed, timeSpentSeconds } = req.body;

  // Validate score if provided
  if (score !== undefined) {
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw ApiError.badRequest('score must be a number between 0 and 100');
    }
  }

  // Validate scoreRaw if provided
  if (scoreRaw !== undefined && typeof scoreRaw !== 'number') {
    throw ApiError.badRequest('scoreRaw must be a number');
  }

  // Validate scoreScaled if provided
  if (scoreScaled !== undefined) {
    if (typeof scoreScaled !== 'number' || scoreScaled < -1 || scoreScaled > 1) {
      throw ApiError.badRequest('scoreScaled must be a number between -1 and 1');
    }
  }

  // Validate passed if provided
  if (passed !== undefined && typeof passed !== 'boolean') {
    throw ApiError.badRequest('passed must be a boolean');
  }

  // Validate timeSpentSeconds if provided
  if (timeSpentSeconds !== undefined) {
    if (typeof timeSpentSeconds !== 'number' || timeSpentSeconds < 0) {
      throw ApiError.badRequest('timeSpentSeconds must be a non-negative number');
    }
  }

  const data = {
    score,
    scoreRaw,
    scoreScaled,
    passed,
    timeSpentSeconds
  };

  const result = await ContentAttemptsService.completeAttempt(id, data, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'Content attempt completed successfully')
  );
});

/**
 * GET /api/v2/content-attempts/:id/cmi
 * Get SCORM CMI data
 */
export const getCmiData = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const result = await ContentAttemptsService.getCmiData(id, user.userId);
  res.status(200).json(ApiResponse.success({ data: result }));
});

/**
 * PUT /api/v2/content-attempts/:id/cmi
 * Update SCORM CMI data
 */
export const updateCmiData = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { cmiData, autoCommit } = req.body;

  // Validate required fields
  if (!cmiData || typeof cmiData !== 'object') {
    throw ApiError.badRequest('cmiData is required and must be an object');
  }

  // Validate autoCommit if provided
  if (autoCommit !== undefined && typeof autoCommit !== 'boolean') {
    throw ApiError.badRequest('autoCommit must be a boolean');
  }

  const data = {
    cmiData,
    autoCommit: autoCommit !== undefined ? autoCommit : true
  };

  const result = await ContentAttemptsService.updateCmiData(id, data, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'CMI data updated successfully')
  );
});

/**
 * POST /api/v2/content-attempts/:id/suspend
 * Suspend an in-progress attempt
 */
export const suspendAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { suspendData, location, sessionTime } = req.body;

  // Validate suspendData if provided
  if (suspendData !== undefined) {
    if (typeof suspendData !== 'string') {
      throw ApiError.badRequest('suspendData must be a string');
    }
    if (suspendData.length > 4096) {
      throw ApiError.badRequest('suspendData cannot exceed 4096 characters');
    }
  }

  // Validate location if provided
  if (location !== undefined && typeof location !== 'string') {
    throw ApiError.badRequest('location must be a string');
  }

  // Validate sessionTime if provided
  if (sessionTime !== undefined) {
    if (typeof sessionTime !== 'number' || sessionTime < 0) {
      throw ApiError.badRequest('sessionTime must be a non-negative number');
    }
  }

  const data = {
    suspendData,
    location,
    sessionTime
  };

  const result = await ContentAttemptsService.suspendAttempt(id, data, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'Attempt suspended successfully')
  );
});

/**
 * POST /api/v2/content-attempts/:id/resume
 * Resume a suspended attempt
 */
export const resumeAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  const result = await ContentAttemptsService.resumeAttempt(id, user.userId);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'Attempt resumed successfully')
  );
});

/**
 * DELETE /api/v2/content-attempts/:id
 * Delete a content attempt (admin only)
 */
export const deleteAttempt = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  // Parse permanent query parameter
  const permanent = req.query.permanent === 'true';

  const result = await ContentAttemptsService.deleteAttempt(id, user.userId, permanent);
  res.status(200).json(
    ApiResponse.success({ data: result }, 'Attempt deleted successfully')
  );
});
