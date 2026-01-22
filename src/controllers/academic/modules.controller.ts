import { Request, Response } from 'express';
import { ModulesService } from '@/services/academic/modules.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Modules Controller
 * Handles all /api/v2/courses/:courseId/modules endpoints
 *
 * Modules are logical groupings of learning units within a course.
 * They organize course content into chapters/sections with completion criteria
 * and presentation rules.
 */

/**
 * GET /api/v2/courses/:courseId/modules
 * List all modules in a course with optional filtering and pagination
 *
 * Query Parameters:
 * - isPublished: boolean - Filter by publish status
 * - page: number - Page number (default: 1)
 * - limit: number - Items per page (default: 10, max: 100)
 * - sort: string - Sort field (default: 'order')
 */
export const listModules = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  const filters = {
    isPublished: req.query.isPublished !== undefined
      ? req.query.isPublished === 'true'
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

  const result = await ModulesService.listModules(courseId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/courses/:courseId/modules/:moduleId
 * Get detailed information about a specific module
 *
 * Returns module with populated learning units
 */
export const getModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  const result = await ModulesService.getModule(moduleId);

  // Verify module belongs to the specified course
  if (result.courseId !== courseId) {
    throw ApiError.notFound('Module not found in this course');
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/courses/:courseId/modules
 * Create a new module in a course
 *
 * Body Parameters:
 * - title: string (required) - Module title (1-200 chars)
 * - description: string (optional) - Module description (max 2000 chars)
 * - prerequisites: ObjectId[] (optional) - Module IDs that must be completed first
 * - completionCriteria: object (optional) - Completion requirements
 * - presentationRules: object (optional) - Presentation configuration
 * - isPublished: boolean (optional) - Published status (default: false)
 * - availableFrom: Date (optional) - Start availability date
 * - availableUntil: Date (optional) - End availability date
 * - estimatedDuration: number (optional) - Duration in minutes
 * - objectives: string[] (optional) - Learning objectives
 */
export const createModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const {
    title,
    description,
    prerequisites,
    completionCriteria,
    presentationRules,
    isPublished,
    availableFrom,
    availableUntil,
    estimatedDuration,
    objectives
  } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Get createdBy from authenticated user
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const moduleData = {
    title,
    description,
    prerequisites,
    completionCriteria,
    presentationRules,
    isPublished,
    availableFrom: availableFrom ? new Date(availableFrom) : undefined,
    availableUntil: availableUntil ? new Date(availableUntil) : undefined,
    estimatedDuration,
    objectives
  };

  const result = await ModulesService.createModule(courseId, moduleData, user.id);
  res.status(201).json(ApiResponse.success(result, 'Module created successfully'));
});

/**
 * PUT /api/v2/courses/:courseId/modules/:moduleId
 * Update an existing module
 *
 * All fields are optional for partial updates.
 * Order cannot be changed via PUT - use the reorder endpoint instead.
 */
export const updateModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;
  const {
    title,
    description,
    prerequisites,
    completionCriteria,
    presentationRules,
    isPublished,
    availableFrom,
    availableUntil,
    estimatedDuration,
    objectives
  } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  // First verify the module belongs to this course
  const existingModule = await ModulesService.getModule(moduleId);
  if (existingModule.courseId !== courseId) {
    throw ApiError.notFound('Module not found in this course');
  }

  const updateData: any = {};

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (prerequisites !== undefined) updateData.prerequisites = prerequisites;
  if (completionCriteria !== undefined) updateData.completionCriteria = completionCriteria;
  if (presentationRules !== undefined) updateData.presentationRules = presentationRules;
  if (isPublished !== undefined) updateData.isPublished = isPublished;
  if (availableFrom !== undefined) {
    updateData.availableFrom = availableFrom ? new Date(availableFrom) : null;
  }
  if (availableUntil !== undefined) {
    updateData.availableUntil = availableUntil ? new Date(availableUntil) : null;
  }
  if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
  if (objectives !== undefined) updateData.objectives = objectives;

  const result = await ModulesService.updateModule(moduleId, updateData);
  res.status(200).json(ApiResponse.success(result, 'Module updated successfully'));
});

/**
 * DELETE /api/v2/courses/:courseId/modules/:moduleId
 * Delete a module from a course
 *
 * Query Parameters:
 * - force: boolean - Force delete even with learner progress
 *
 * Note: This cascades to soft-delete all learning units in the module
 */
export const deleteModule = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, moduleId } = req.params;

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  if (!moduleId) {
    throw ApiError.badRequest('Module ID is required');
  }

  // First verify the module belongs to this course
  const existingModule = await ModulesService.getModule(moduleId);
  if (existingModule.courseId !== courseId) {
    throw ApiError.notFound('Module not found in this course');
  }

  await ModulesService.deleteModule(moduleId);
  res.status(200).json(ApiResponse.success(null, 'Module deleted successfully'));
});

/**
 * PATCH /api/v2/courses/:courseId/modules/reorder
 * Reorder modules within a course
 *
 * Body Parameters:
 * - moduleIds: ObjectId[] (required) - Array of all module IDs in desired order
 *
 * Note: Must include ALL modules in the course.
 * Array order determines new order (1-indexed).
 */
export const reorderModules = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { moduleIds } = req.body;

  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  if (!moduleIds || !Array.isArray(moduleIds)) {
    throw ApiError.badRequest('moduleIds must be an array');
  }

  if (moduleIds.length === 0) {
    throw ApiError.badRequest('moduleIds array cannot be empty');
  }

  // Validate each ID is a string
  for (const id of moduleIds) {
    if (typeof id !== 'string') {
      throw ApiError.badRequest('All module IDs must be strings');
    }
  }

  await ModulesService.reorderModules(courseId, moduleIds);
  res.status(200).json(ApiResponse.success(null, 'Modules reordered successfully'));
});
