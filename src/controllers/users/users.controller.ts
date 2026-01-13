import { Request, Response } from 'express';
import { UsersService } from '@/services/users/users.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Users Controller
 * Handles all /api/v2/users endpoints
 */

/**
 * GET /api/v2/users/me
 * Get current authenticated user profile (unified for all roles)
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await UsersService.getMe(userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/users/me
 * Update current authenticated user profile
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { firstName, lastName, phone, profileImage } = req.body;

  // Validate input
  if (firstName !== undefined && (typeof firstName !== 'string' || firstName.length < 1 || firstName.length > 100)) {
    throw ApiError.badRequest('First name must be between 1 and 100 characters');
  }

  if (lastName !== undefined && (typeof lastName !== 'string' || lastName.length < 1 || lastName.length > 100)) {
    throw ApiError.badRequest('Last name must be between 1 and 100 characters');
  }

  if (phone !== undefined && phone !== null && typeof phone === 'string') {
    // Validate E.164 format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      throw ApiError.badRequest('Phone number must be in E.164 format (e.g., +1-555-0123)');
    }
  }

  if (profileImage !== undefined && profileImage !== null && typeof profileImage === 'string') {
    // Basic URL validation
    try {
      new URL(profileImage);
    } catch {
      throw ApiError.badRequest('Profile image must be a valid URL');
    }
  }

  const updateData = {
    firstName,
    lastName,
    phone,
    profileImage
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const result = await UsersService.updateMe(userId, updateData);
  res.status(200).json(ApiResponse.success(result, 'Profile updated successfully'));
});

/**
 * POST /api/v2/users/me/password
 * Change current user's password
 * Requires current password for verification (ISS-001)
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate required fields
  if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.length === 0) {
    throw ApiError.badRequest('Current password is required');
  }

  if (!newPassword || typeof newPassword !== 'string') {
    throw ApiError.badRequest('New password is required');
  }

  if (!confirmPassword || typeof confirmPassword !== 'string') {
    throw ApiError.badRequest('Password confirmation is required');
  }

  // Validate new password length first
  if (newPassword.length < 8) {
    throw ApiError.badRequest('New password must be at least 8 characters');
  }

  if (newPassword.length > 128) {
    throw ApiError.badRequest('New password must not exceed 128 characters');
  }

  // Then validate complexity
  if (!/(?=.*[a-z])/.test(newPassword)) {
    throw ApiError.badRequest('New password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  if (!/(?=.*[A-Z])/.test(newPassword)) {
    throw ApiError.badRequest('New password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  if (!/(?=.*\d)/.test(newPassword)) {
    throw ApiError.badRequest('New password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  // Validate passwords match
  if (newPassword !== confirmPassword) {
    throw ApiError.badRequest('Passwords do not match');
  }

  // Validate new password is different from current
  if (newPassword === currentPassword) {
    throw ApiError.badRequest('New password must be different from current password');
  }

  await UsersService.changePassword(userId, { currentPassword, newPassword });
  res.status(200).json(ApiResponse.success(null, 'Password changed successfully'));
});

/**
 * GET /api/v2/users/me/departments
 * Get departments assigned to current user (staff only)
 */
export const getMyDepartments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await UsersService.getMyDepartments(userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/users/me/courses
 * Get courses assigned to current user as instructor (staff only)
 */
export const getMyCourses = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    status: req.query.status as 'draft' | 'published' | 'archived' | undefined,
    departmentId: req.query.departmentId as string | undefined,
    includeStats: req.query.includeStats === 'true'
  };

  // Validate status if provided
  if (filters.status && !['draft', 'published', 'archived'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: draft, published, archived');
  }

  const result = await UsersService.getMyCourses(userId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/users/me/enrollments
 * Get all enrollments for current user (learner)
 */
export const getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    type: req.query.type as 'program' | 'course' | undefined,
    status: req.query.status as 'enrolled' | 'in_progress' | 'completed' | 'withdrawn' | undefined,
    includeProgress: req.query.includeProgress !== 'false' // Default to true
  };

  // Validate type if provided
  if (filters.type && !['program', 'course'].includes(filters.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: program, course');
  }

  // Validate status if provided
  if (filters.status && !['enrolled', 'in_progress', 'completed', 'withdrawn'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: enrolled, in_progress, completed, withdrawn');
  }

  const result = await UsersService.getMyEnrollments(userId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/users/me/progress
 * Get comprehensive progress summary for current user
 */
export const getMyProgress = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const timeframe = (req.query.timeframe as string) || 'all';

  // Validate timeframe
  if (!['week', 'month', 'quarter', 'year', 'all'].includes(timeframe)) {
    throw ApiError.badRequest('Invalid timeframe. Must be one of: week, month, quarter, year, all');
  }

  const result = await UsersService.getMyProgress(userId, { timeframe: timeframe as any });
  res.status(200).json(ApiResponse.success(result));
});

// ============================================================================
// NEW v2.0.0: Person & Demographics Endpoints
// ============================================================================

/**
 * GET /api/v2/users/me/person
 * Get current user's person data (IPerson Basic)
 */
export const getMyPerson = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await UsersService.getMyPerson(userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/users/me/person
 * Update current user's person data
 */
export const updateMyPerson = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const personData = req.body;

  // TODO: Add comprehensive validation using Zod validator
  // For now, service layer handles basic validation

  const result = await UsersService.updateMyPerson(userId, personData);
  res.status(200).json(ApiResponse.success(result, 'Person data updated successfully'));
});

/**
 * GET /api/v2/users/me/person/extended
 * Get current user's extended person data (role-specific)
 */
export const getMyPersonExtended = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await UsersService.getMyPersonExtended(userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/users/me/person/extended
 * Update current user's extended person data
 */
export const updateMyPersonExtended = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const extendedData = req.body;

  // TODO: Add comprehensive validation using Zod validator
  // For now, service layer handles basic validation

  const result = await UsersService.updateMyPersonExtended(userId, extendedData);
  res.status(200).json(ApiResponse.success(result, 'Extended person data updated successfully'));
});

/**
 * GET /api/v2/users/me/demographics
 * Get current user's demographics data
 */
export const getMyDemographics = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const result = await UsersService.getMyDemographics(userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/users/me/demographics
 * Update current user's demographics data
 */
export const updateMyDemographics = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const demographicsData = req.body;

  // TODO: Add comprehensive validation using Zod validator
  // For now, service layer handles basic validation

  const result = await UsersService.updateMyDemographics(userId, demographicsData);
  res.status(200).json(ApiResponse.success(result, 'Demographics data updated successfully'));
});
