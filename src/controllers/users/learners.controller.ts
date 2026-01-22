import { Request, Response } from 'express';
import { LearnersService } from '@/services/users/learners.service';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

/**
 * Learners Controller
 * Handles all /api/v2/users/learners endpoints
 */

/**
 * GET /api/v2/users/learners
 * List all learners with filtering and pagination
 */
export const listLearners = asyncHandler(async (req: Request, res: Response) => {
  // Parse and validate query parameters
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const search = req.query.search as string | undefined;
  const program = req.query.program as string | undefined;
  const status = req.query.status as 'active' | 'withdrawn' | 'completed' | 'suspended' | undefined;
  const department = req.query.department as string | undefined;
  const includeSubdepartments = req.query.includeSubdepartments === 'true';
  const sort = req.query.sort as string | undefined;

  // Validate page
  if (page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  // Validate limit
  if (limit < 1 || limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (status && !['active', 'withdrawn', 'completed', 'suspended'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, withdrawn, completed, suspended');
  }

  // Validate program ObjectId
  if (program && !mongoose.Types.ObjectId.isValid(program)) {
    throw ApiError.badRequest('Invalid program ID');
  }

  // Validate department ObjectId
  if (department && !mongoose.Types.ObjectId.isValid(department)) {
    throw ApiError.badRequest('Invalid department ID');
  }

  const filters = {
    page,
    limit,
    search,
    program,
    status,
    department,
    includeSubdepartments,
    sort
  };

  // Pass authenticated user as viewer for FERPA-compliant data masking
  const result = await LearnersService.listLearners(filters, req.user);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * POST /api/v2/users/learners
 * Register a new learner account
 */
export const registerLearner = asyncHandler(async (req: Request, res: Response) => {
  const {
    email,
    password,
    firstName,
    lastName,
    studentId,
    department,
    phone,
    dateOfBirth,
    address
  } = req.body;

  // Validate required fields
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw ApiError.badRequest('Email is required');
  }

  if (!password || typeof password !== 'string') {
    throw ApiError.badRequest('Password is required');
  }

  if (password.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters');
  }

  if (!firstName || typeof firstName !== 'string' || firstName.length < 1 || firstName.length > 100) {
    throw ApiError.badRequest('First name must be between 1 and 100 characters');
  }

  if (!lastName || typeof lastName !== 'string' || lastName.length < 1 || lastName.length > 100) {
    throw ApiError.badRequest('Last name must be between 1 and 100 characters');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw ApiError.badRequest('Invalid email format');
  }

  // Validate optional studentId
  if (studentId !== undefined) {
    if (typeof studentId !== 'string' || studentId.length < 3 || studentId.length > 50) {
      throw ApiError.badRequest('Student ID must be between 3 and 50 characters');
    }

    const studentIdPattern = /^[A-Z0-9-]+$/;
    if (!studentIdPattern.test(studentId)) {
      throw ApiError.badRequest('Student ID must contain only uppercase letters, numbers, and hyphens');
    }
  }

  // Validate optional department
  if (department !== undefined && !mongoose.Types.ObjectId.isValid(department)) {
    throw ApiError.badRequest('Invalid department ID');
  }

  // Validate optional phone
  if (phone !== undefined && phone !== null && typeof phone === 'string') {
    // Basic phone validation
    if (phone.length > 50) {
      throw ApiError.badRequest('Phone number too long');
    }
  }

  // Validate optional dateOfBirth
  if (dateOfBirth !== undefined && dateOfBirth !== null) {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw ApiError.badRequest('Invalid date of birth');
    }

    // Check if date is not in the future
    if (dob > new Date()) {
      throw ApiError.badRequest('Date of birth cannot be in the future');
    }
  }

  // Validate optional address
  if (address !== undefined && address !== null) {
    if (typeof address !== 'object') {
      throw ApiError.badRequest('Address must be an object');
    }

    if (address.street && typeof address.street !== 'string') {
      throw ApiError.badRequest('Address street must be a string');
    }
    if (address.city && typeof address.city !== 'string') {
      throw ApiError.badRequest('Address city must be a string');
    }
    if (address.state && typeof address.state !== 'string') {
      throw ApiError.badRequest('Address state must be a string');
    }
    if (address.zipCode && typeof address.zipCode !== 'string') {
      throw ApiError.badRequest('Address zipCode must be a string');
    }
    if (address.country && typeof address.country !== 'string') {
      throw ApiError.badRequest('Address country must be a string');
    }
  }

  const input = {
    email,
    password,
    firstName,
    lastName,
    studentId,
    department,
    phone,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    address
  };

  const result = await LearnersService.registerLearner(input);

  res.status(201).json({
    success: true,
    message: 'Learner registered successfully',
    data: result
  });
});

/**
 * GET /api/v2/users/learners/:id
 * Get detailed learner profile by ID
 */
export const getLearnerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid learner ID format');
  }

  // Pass authenticated user as viewer for FERPA-compliant data masking
  const result = await LearnersService.getLearnerById(id, req.user);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * PUT /api/v2/users/learners/:id
 * Update learner profile information
 */
export const updateLearner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    email,
    firstName,
    lastName,
    studentId,
    department,
    phone,
    dateOfBirth,
    address,
    status
  } = req.body;

  if (!id) {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid learner ID format');
  }

  // Validate optional email
  if (email !== undefined) {
    if (typeof email !== 'string' || !email.trim()) {
      throw ApiError.badRequest('Email must be a non-empty string');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ApiError.badRequest('Invalid email format');
    }
  }

  // Validate optional firstName
  if (firstName !== undefined) {
    if (typeof firstName !== 'string' || firstName.length < 1 || firstName.length > 100) {
      throw ApiError.badRequest('First name must be between 1 and 100 characters');
    }
  }

  // Validate optional lastName
  if (lastName !== undefined) {
    if (typeof lastName !== 'string' || lastName.length < 1 || lastName.length > 100) {
      throw ApiError.badRequest('Last name must be between 1 and 100 characters');
    }
  }

  // Validate optional studentId
  if (studentId !== undefined) {
    if (typeof studentId !== 'string' || studentId.length < 3 || studentId.length > 50) {
      throw ApiError.badRequest('Student ID must be between 3 and 50 characters');
    }

    const studentIdPattern = /^[A-Z0-9-]+$/;
    if (!studentIdPattern.test(studentId)) {
      throw ApiError.badRequest('Student ID must contain only uppercase letters, numbers, and hyphens');
    }
  }

  // Validate optional department
  if (department !== undefined && !mongoose.Types.ObjectId.isValid(department)) {
    throw ApiError.badRequest('Invalid department ID');
  }

  // Validate optional phone
  if (phone !== undefined && phone !== null && typeof phone === 'string') {
    if (phone.length > 50) {
      throw ApiError.badRequest('Phone number too long');
    }
  }

  // Validate optional dateOfBirth
  if (dateOfBirth !== undefined && dateOfBirth !== null) {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw ApiError.badRequest('Invalid date of birth');
    }

    if (dob > new Date()) {
      throw ApiError.badRequest('Date of birth cannot be in the future');
    }
  }

  // Validate optional status
  if (status !== undefined) {
    if (!['active', 'suspended'].includes(status)) {
      throw ApiError.badRequest('Status must be one of: active, suspended');
    }
  }

  // Validate optional address
  if (address !== undefined && address !== null) {
    if (typeof address !== 'object') {
      throw ApiError.badRequest('Address must be an object');
    }

    if (address.street !== undefined && typeof address.street !== 'string') {
      throw ApiError.badRequest('Address street must be a string');
    }
    if (address.city !== undefined && typeof address.city !== 'string') {
      throw ApiError.badRequest('Address city must be a string');
    }
    if (address.state !== undefined && typeof address.state !== 'string') {
      throw ApiError.badRequest('Address state must be a string');
    }
    if (address.zipCode !== undefined && typeof address.zipCode !== 'string') {
      throw ApiError.badRequest('Address zipCode must be a string');
    }
    if (address.country !== undefined && typeof address.country !== 'string') {
      throw ApiError.badRequest('Address country must be a string');
    }
  }

  const updateData = {
    email,
    firstName,
    lastName,
    studentId,
    department,
    phone,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    address,
    status
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const result = await LearnersService.updateLearner(id, updateData);

  res.status(200).json({
    success: true,
    message: 'Learner profile updated successfully',
    data: result
  });
});

/**
 * DELETE /api/v2/users/learners/:id
 * Soft delete learner account (sets status to withdrawn)
 */
export const deleteLearner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.query;

  if (!id) {
    throw ApiError.badRequest('Learner ID is required');
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid learner ID format');
  }

  // Validate optional reason
  if (reason !== undefined && typeof reason !== 'string') {
    throw ApiError.badRequest('Reason must be a string');
  }

  const result = await LearnersService.deleteLearner(id, reason as string | undefined);

  res.status(200).json({
    success: true,
    message: 'Learner account withdrawn successfully',
    data: result
  });
});
