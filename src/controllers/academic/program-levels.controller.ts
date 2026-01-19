/**
 * Program Levels Controller
 *
 * Handles program level management endpoints.
 *
 * @module controllers/academic/program-levels
 */

import { Request, Response } from 'express';
import { ProgramLevelsService } from '@/services/academic/program-levels.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * GET /api/v2/program-levels/:id
 * Get program level details by ID
 */
export const getLevel = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const level = await ProgramLevelsService.getById(id);

  res.status(200).json(
    ApiResponse.success(level, 'Program level retrieved successfully')
  );
});

/**
 * PUT /api/v2/program-levels/:id
 * Update program level details
 */
export const updateLevel = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, requiredCredits, courses } = req.body;

  // Validate input
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    throw ApiError.badRequest('Name must be a non-empty string');
  }

  if (name && name.length > 200) {
    throw ApiError.badRequest('Name cannot exceed 200 characters');
  }

  if (description !== undefined && description !== null && description.length > 2000) {
    throw ApiError.badRequest('Description cannot exceed 2000 characters');
  }

  if (requiredCredits !== undefined && requiredCredits !== null) {
    if (typeof requiredCredits !== 'number' || requiredCredits < 0) {
      throw ApiError.badRequest('Required credits must be a non-negative number');
    }
  }

  const level = await ProgramLevelsService.update(id, {
    name: name?.trim(),
    description: description?.trim(),
    requiredCredits,
    courses
  });

  res.status(200).json(
    ApiResponse.success(level, 'Program level updated successfully')
  );
});

/**
 * DELETE /api/v2/program-levels/:id
 * Delete program level
 */
export const deleteLevel = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await ProgramLevelsService.delete(id);

  res.status(200).json(
    ApiResponse.success(null, 'Program level deleted successfully')
  );
});

/**
 * PATCH /api/v2/program-levels/:id/reorder
 * Reorder level within program sequence
 */
export const reorderLevel = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newOrder } = req.body;

  // Validate input
  if (newOrder === undefined || newOrder === null) {
    throw ApiError.badRequest('newOrder is required');
  }

  if (typeof newOrder !== 'number' || !Number.isInteger(newOrder) || newOrder < 1) {
    throw ApiError.badRequest('newOrder must be a positive integer');
  }

  const updatedLevels = await ProgramLevelsService.reorder(id, newOrder);

  res.status(200).json(
    ApiResponse.success(
      {
        updatedLevels: updatedLevels.map(l => ({
          id: l.id,
          name: l.name,
          order: l.order
        }))
      },
      'Program level reordered successfully'
    )
  );
});
