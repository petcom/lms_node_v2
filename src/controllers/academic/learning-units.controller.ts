import { Request, Response } from 'express';
import { LearningUnitsService } from '@/services/academic/learning-units.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Learning Units Controller
 * Handles all /api/v2/modules/:moduleId/learning-units endpoints
 */

/**
 * GET /api/v2/modules/:moduleId/learning-units
 * List learning units in a module with optional filtering and pagination
 */
export const listLearningUnits = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const filters = {
    category: req.query.category as 'exposition' | 'practice' | 'assessment' | undefined,
    isRequired: req.query.isRequired !== undefined
      ? req.query.isRequired === 'true'
      : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    sort: req.query.sort as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate category
  if (filters.category && !['exposition', 'practice', 'assessment'].includes(filters.category)) {
    throw ApiError.badRequest('Invalid category. Must be one of: exposition, practice, assessment');
  }

  const result = await LearningUnitsService.listLearningUnits(moduleId, filters);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/modules/:moduleId/learning-units/:learningUnitId
 * Get learning unit details by ID
 */
export const getLearningUnit = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId, learningUnitId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  const learningUnit = await LearningUnitsService.getLearningUnit(learningUnitId);

  // Verify the learning unit belongs to the specified module
  if (learningUnit.moduleId !== moduleId) {
    throw ApiError.notFound('Learning unit not found in this module');
  }

  res.status(200).json(ApiResponse.success(learningUnit));
});

/**
 * POST /api/v2/modules/:moduleId/learning-units
 * Create a new learning unit in a module
 */
export const createLearningUnit = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const { title, description, category, contentType, contentId, isRequired, isReplayable, weight, estimatedDuration } = req.body;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw ApiError.badRequest('Learning unit title is required');
  }

  if (title.length > 200) {
    throw ApiError.badRequest('Learning unit title cannot exceed 200 characters');
  }

  if (!category || !['exposition', 'practice', 'assessment'].includes(category)) {
    throw ApiError.badRequest('Category is required and must be one of: exposition, practice, assessment');
  }

  if (!contentType || typeof contentType !== 'string') {
    throw ApiError.badRequest('Content type is required');
  }

  // Validate description length
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  // Validate weight
  if (weight !== undefined && weight !== null) {
    if (typeof weight !== 'number' || weight < 0 || weight > 100) {
      throw ApiError.badRequest('Weight must be a number between 0 and 100');
    }
  }

  // Validate estimatedDuration
  if (estimatedDuration !== undefined && estimatedDuration !== null) {
    if (typeof estimatedDuration !== 'number' || estimatedDuration < 0) {
      throw ApiError.badRequest('Estimated duration must be a non-negative number');
    }
  }

  const learningUnitData = {
    title: title.trim(),
    description: description?.trim(),
    category,
    contentType,
    contentId,
    isRequired,
    isReplayable,
    weight,
    estimatedDuration
  };

  // Get createdBy from authenticated user
  const createdBy = (req as any).user?.id;
  if (!createdBy) {
    throw ApiError.unauthorized('User context not found');
  }

  const result = await LearningUnitsService.createLearningUnit(moduleId, learningUnitData, createdBy);
  res.status(201).json(ApiResponse.success(result, 'Learning unit created successfully'));
});

/**
 * PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId
 * Update a learning unit
 */
export const updateLearningUnit = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId, learningUnitId } = req.params;
  const { title, description, category, contentType, contentId, isRequired, isReplayable, weight, estimatedDuration } = req.body;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  // Verify the learning unit belongs to the specified module
  const existingUnit = await LearningUnitsService.getLearningUnit(learningUnitId);
  if (existingUnit.moduleId !== moduleId) {
    throw ApiError.notFound('Learning unit not found in this module');
  }

  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw ApiError.badRequest('Learning unit title cannot be empty');
    }
    if (title.length > 200) {
      throw ApiError.badRequest('Learning unit title cannot exceed 200 characters');
    }
  }

  // Validate category if provided
  if (category !== undefined && !['exposition', 'practice', 'assessment'].includes(category)) {
    throw ApiError.badRequest('Category must be one of: exposition, practice, assessment');
  }

  // Validate description if provided
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      throw ApiError.badRequest('Description must be a string');
    }
    if (description.length > 2000) {
      throw ApiError.badRequest('Description cannot exceed 2000 characters');
    }
  }

  // Validate weight if provided
  if (weight !== undefined && weight !== null) {
    if (typeof weight !== 'number' || weight < 0 || weight > 100) {
      throw ApiError.badRequest('Weight must be a number between 0 and 100');
    }
  }

  // Validate estimatedDuration if provided
  if (estimatedDuration !== undefined && estimatedDuration !== null) {
    if (typeof estimatedDuration !== 'number' || estimatedDuration < 0) {
      throw ApiError.badRequest('Estimated duration must be a non-negative number');
    }
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim();
  if (category !== undefined) updateData.category = category;
  if (contentType !== undefined) updateData.contentType = contentType;
  if (contentId !== undefined) updateData.contentId = contentId;
  if (isRequired !== undefined) updateData.isRequired = isRequired;
  if (isReplayable !== undefined) updateData.isReplayable = isReplayable;
  if (weight !== undefined) updateData.weight = weight;
  if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;

  const result = await LearningUnitsService.updateLearningUnit(learningUnitId, updateData);
  res.status(200).json(ApiResponse.success(result, 'Learning unit updated successfully'));
});

/**
 * DELETE /api/v2/modules/:moduleId/learning-units/:learningUnitId
 * Delete a learning unit (soft delete)
 */
export const deleteLearningUnit = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId, learningUnitId } = req.params;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  // Verify the learning unit belongs to the specified module
  const existingUnit = await LearningUnitsService.getLearningUnit(learningUnitId);
  if (existingUnit.moduleId !== moduleId) {
    throw ApiError.notFound('Learning unit not found in this module');
  }

  await LearningUnitsService.deleteLearningUnit(learningUnitId);
  res.status(200).json(ApiResponse.success(null, 'Learning unit deleted successfully'));
});

/**
 * PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId/reorder
 * Reorder learning units within a module
 */
export const reorderLearningUnits = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId } = req.params;
  const { learningUnitIds } = req.body;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  if (!learningUnitIds || !Array.isArray(learningUnitIds)) {
    throw ApiError.badRequest('learningUnitIds must be an array');
  }

  await LearningUnitsService.reorderLearningUnits(moduleId, learningUnitIds);
  res.status(200).json(ApiResponse.success(null, 'Learning units reordered successfully'));
});

/**
 * PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId/move
 * Move a learning unit to another module
 */
export const moveLearningUnit = asyncHandler(async (req: Request, res: Response) => {
  const { moduleId, learningUnitId } = req.params;
  const { targetModuleId } = req.body;

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  if (!learningUnitId) {
    throw ApiError.badRequest('Learning unit ID is required');
  }

  if (!targetModuleId || typeof targetModuleId !== 'string') {
    throw ApiError.badRequest('Target module ID is required');
  }

  // Verify the learning unit belongs to the specified source module
  const existingUnit = await LearningUnitsService.getLearningUnit(learningUnitId);
  if (existingUnit.moduleId !== moduleId) {
    throw ApiError.notFound('Learning unit not found in this module');
  }

  const result = await LearningUnitsService.moveLearningUnit(learningUnitId, targetModuleId);
  res.status(200).json(ApiResponse.success(result, 'Learning unit moved successfully'));
});
