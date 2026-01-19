import { Request, Response } from 'express';
import { StaffService } from '@/services/users/staff.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

/**
 * Staff Controller
 * Handles all /api/v2/users/staff endpoints
 */

/**
 * GET /api/v2/users/staff
 * List staff users with filtering and pagination
 */
export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const hasGlobalAccess = Array.isArray((req as any).adminRoles) && (req as any).adminRoles.length > 0;

  // Parse query parameters
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const department = req.query.department as string | undefined;
  const role = req.query.role as 'staff' | 'instructor' | 'content-admin' | 'dept-admin' | undefined;
  const status = (req.query.status as 'active' | 'inactive' | 'withdrawn' | undefined) || 'active';
  const search = req.query.search as string | undefined;
  const sort = req.query.sort as string | undefined;

  // Validate pagination
  if (page < 1) {
    throw ApiError.badRequest('Page must be >= 1');
  }
  if (limit < 1 || limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate department if provided
  if (department && !mongoose.Types.ObjectId.isValid(department)) {
    throw ApiError.badRequest('Invalid department ID');
  }

  // Validate role if provided
  if (role && !['staff', 'instructor', 'content-admin', 'dept-admin'].includes(role)) {
    throw ApiError.badRequest('Invalid role. Must be one of: staff, instructor, content-admin, dept-admin');
  }

  // Validate status if provided
  if (status && !['active', 'inactive', 'withdrawn'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, inactive, withdrawn');
  }

  // Validate search length if provided
  if (search && search.length < 2) {
    throw ApiError.badRequest('Search term must be at least 2 characters');
  }

  const filters = {
    page,
    limit,
    department,
    role,
    status,
    search,
    sort
  };

  const result = await StaffService.listStaff(filters, userId, { hasGlobalAccess });
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/users/staff
 * Register a new staff user account
 */
export const registerStaff = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { email, password, firstName, lastName, departmentAssignments, defaultDashboard, isActive } = req.body;

  // Validate required fields
  if (!email || typeof email !== 'string') {
    throw ApiError.badRequest('Email is required and must be a string');
  }

  if (!password || typeof password !== 'string') {
    throw ApiError.badRequest('Password is required and must be a string');
  }

  if (!firstName || typeof firstName !== 'string' || firstName.length < 1 || firstName.length > 100) {
    throw ApiError.badRequest('First name is required and must be between 1 and 100 characters');
  }

  if (!lastName || typeof lastName !== 'string' || lastName.length < 1 || lastName.length > 100) {
    throw ApiError.badRequest('Last name is required and must be between 1 and 100 characters');
  }

  if (!departmentAssignments || !Array.isArray(departmentAssignments) || departmentAssignments.length === 0) {
    throw ApiError.badRequest('At least one department assignment is required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw ApiError.badRequest('Invalid email format');
  }

  // Validate password length
  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  // Validate department assignments
  for (const assignment of departmentAssignments) {
    if (!assignment.departmentId || !mongoose.Types.ObjectId.isValid(assignment.departmentId)) {
      throw ApiError.badRequest('Invalid department ID in assignment');
    }

    if (!assignment.role || !['instructor', 'content-admin', 'dept-admin'].includes(assignment.role)) {
      throw ApiError.badRequest('Invalid role. Must be one of: instructor, content-admin, dept-admin');
    }
  }

  // Validate default dashboard if provided
  if (defaultDashboard && !['content-admin', 'instructor', 'analytics'].includes(defaultDashboard)) {
    throw ApiError.badRequest('Invalid default dashboard. Must be one of: content-admin, instructor, analytics');
  }

  // Validate isActive if provided
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean');
  }

  const staffData = {
    email,
    password,
    firstName,
    lastName,
    departmentAssignments,
    defaultDashboard,
    isActive
  };

  const result = await StaffService.registerStaff(staffData, userId);
  res.status(201).json(ApiResponse.success(result, 'Staff user created successfully'));
});

/**
 * GET /api/v2/users/staff/:id
 * Get detailed information for a specific staff user
 */
export const getStaffById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const staffId = req.params.id;

  // Validate staff ID
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw ApiError.badRequest('Invalid staff user ID');
  }

  const result = await StaffService.getStaffById(staffId, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PUT /api/v2/users/staff/:id
 * Update staff user information
 */
export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const staffId = req.params.id;
  const { email, firstName, lastName, defaultDashboard, isActive, profileImage } = req.body;

  // Validate staff ID
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw ApiError.badRequest('Invalid staff user ID');
  }

  // Validate email if provided
  if (email !== undefined) {
    if (typeof email !== 'string') {
      throw ApiError.badRequest('Email must be a string');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ApiError.badRequest('Invalid email format');
    }
  }

  // Validate firstName if provided
  if (firstName !== undefined) {
    if (typeof firstName !== 'string' || firstName.length < 1 || firstName.length > 100) {
      throw ApiError.badRequest('First name must be between 1 and 100 characters');
    }
  }

  // Validate lastName if provided
  if (lastName !== undefined) {
    if (typeof lastName !== 'string' || lastName.length < 1 || lastName.length > 100) {
      throw ApiError.badRequest('Last name must be between 1 and 100 characters');
    }
  }

  // Validate defaultDashboard if provided
  if (defaultDashboard !== undefined && !['content-admin', 'instructor', 'analytics'].includes(defaultDashboard)) {
    throw ApiError.badRequest('Invalid default dashboard. Must be one of: content-admin, instructor, analytics');
  }

  // Validate isActive if provided
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean');
  }

  // Validate profileImage if provided
  if (profileImage !== undefined && profileImage !== null && typeof profileImage === 'string') {
    try {
      new URL(profileImage);
    } catch {
      throw ApiError.badRequest('Profile image must be a valid URL');
    }
  }

  const updateData = {
    email,
    firstName,
    lastName,
    defaultDashboard,
    isActive,
    profileImage
  };

  // Remove undefined values
  Object.keys(updateData).forEach((key) => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const result = await StaffService.updateStaff(staffId, updateData, userId);
  res.status(200).json(ApiResponse.success(result, 'Staff user updated successfully'));
});

/**
 * DELETE /api/v2/users/staff/:id
 * Soft delete a staff user (sets status to withdrawn)
 */
export const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const staffId = req.params.id;
  const reason = req.query.reason as string | undefined;

  // Validate staff ID
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw ApiError.badRequest('Invalid staff user ID');
  }

  const result = await StaffService.deleteStaff(staffId, userId, reason);
  res.status(200).json(ApiResponse.success(result, 'Staff user deleted successfully'));
});

/**
 * PATCH /api/v2/users/staff/:id/departments
 * Update staff user department assignments and roles
 */
export const updateStaffDepartments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const staffId = req.params.id;
  const { action, departmentAssignments } = req.body;

  // Validate staff ID
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw ApiError.badRequest('Invalid staff user ID');
  }

  // Validate action
  if (!action || !['add', 'remove', 'update', 'replace'].includes(action)) {
    throw ApiError.badRequest('Invalid action. Must be one of: add, remove, update, replace');
  }

  // Validate departmentAssignments
  if (!departmentAssignments || !Array.isArray(departmentAssignments) || departmentAssignments.length === 0) {
    throw ApiError.badRequest('At least one department assignment is required');
  }

  // Validate each assignment
  for (const assignment of departmentAssignments) {
    if (!assignment.departmentId || !mongoose.Types.ObjectId.isValid(assignment.departmentId)) {
      throw ApiError.badRequest('Invalid department ID in assignment');
    }

    if (!assignment.role || !['instructor', 'content-admin', 'dept-admin'].includes(assignment.role)) {
      throw ApiError.badRequest('Invalid role. Must be one of: instructor, content-admin, dept-admin');
    }
  }

  const updateData = {
    action,
    departmentAssignments
  };

  const result = await StaffService.updateStaffDepartments(staffId, updateData, userId);
  res.status(200).json(ApiResponse.success(result, 'Department assignments updated successfully'));
});
