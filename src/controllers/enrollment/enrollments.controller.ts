import { Request, Response } from 'express';
import { EnrollmentsService } from '@/services/enrollment/enrollments.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

/**
 * Enrollments Controller
 * Handles all /api/v2/enrollments endpoints
 */

/**
 * GET /api/v2/enrollments
 * List all enrollments with comprehensive filtering
 */
export const listEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    learner: req.query.learner as string,
    program: req.query.program as string,
    course: req.query.course as string,
    class: req.query.class as string,
    status: req.query.status as 'active' | 'completed' | 'withdrawn' | 'suspended' | 'expired' | undefined,
    type: req.query.type as 'program' | 'course' | 'class' | undefined,
    department: req.query.department as string,
    enrolledAfter: req.query.enrolledAfter ? new Date(req.query.enrolledAfter as string) : undefined,
    enrolledBefore: req.query.enrolledBefore ? new Date(req.query.enrolledBefore as string) : undefined,
    sort: req.query.sort as string
  };

  // Validate page and limit
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }
  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate ObjectId parameters
  if (filters.learner && !mongoose.Types.ObjectId.isValid(filters.learner)) {
    throw ApiError.badRequest('Invalid learner ID');
  }
  if (filters.program && !mongoose.Types.ObjectId.isValid(filters.program)) {
    throw ApiError.badRequest('Invalid program ID');
  }
  if (filters.course && !mongoose.Types.ObjectId.isValid(filters.course)) {
    throw ApiError.badRequest('Invalid course ID');
  }
  if (filters.class && !mongoose.Types.ObjectId.isValid(filters.class)) {
    throw ApiError.badRequest('Invalid class ID');
  }
  if (filters.department && !mongoose.Types.ObjectId.isValid(filters.department)) {
    throw ApiError.badRequest('Invalid department ID');
  }

  // Validate status
  if (filters.status && !['active', 'completed', 'withdrawn', 'suspended', 'expired'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, completed, withdrawn, suspended, expired');
  }

  // Validate type
  if (filters.type && !['program', 'course', 'class'].includes(filters.type)) {
    throw ApiError.badRequest('Invalid type. Must be one of: program, course, class');
  }

  // Validate dates
  if (filters.enrolledAfter && isNaN(filters.enrolledAfter.getTime())) {
    throw ApiError.badRequest('Invalid enrolledAfter date');
  }
  if (filters.enrolledBefore && isNaN(filters.enrolledBefore.getTime())) {
    throw ApiError.badRequest('Invalid enrolledBefore date');
  }

  const result = await EnrollmentsService.listEnrollments(filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/enrollments/program
 * Enroll a learner in a program
 */
export const enrollProgram = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const { learnerId, programId, enrolledAt, expiresAt } = req.body;

  // Validate required fields
  if (!learnerId || typeof learnerId !== 'string') {
    throw ApiError.badRequest('learnerId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(learnerId)) {
    throw ApiError.badRequest('Invalid learner ID');
  }

  if (!programId || typeof programId !== 'string') {
    throw ApiError.badRequest('programId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(programId)) {
    throw ApiError.badRequest('Invalid program ID');
  }

  // Validate optional dates
  if (enrolledAt !== undefined) {
    const date = new Date(enrolledAt);
    if (isNaN(date.getTime())) {
      throw ApiError.badRequest('Invalid enrolledAt date');
    }
  }

  if (expiresAt !== undefined) {
    const date = new Date(expiresAt);
    if (isNaN(date.getTime())) {
      throw ApiError.badRequest('Invalid expiresAt date');
    }
  }

  const data = {
    learnerId,
    programId,
    enrolledAt: enrolledAt ? new Date(enrolledAt) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  };

  const result = await EnrollmentsService.enrollProgram(data, userId);
  res.status(201).json(ApiResponse.success(result, 'Successfully enrolled in program'));
});

/**
 * POST /api/v2/enrollments/course
 * Enroll a learner in a course
 */
export const enrollCourse = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const { learnerId, courseId, enrolledAt, expiresAt } = req.body;

  // Validate required fields
  if (!learnerId || typeof learnerId !== 'string') {
    throw ApiError.badRequest('learnerId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(learnerId)) {
    throw ApiError.badRequest('Invalid learner ID');
  }

  if (!courseId || typeof courseId !== 'string') {
    throw ApiError.badRequest('courseId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw ApiError.badRequest('Invalid course ID');
  }

  // Validate optional dates
  if (enrolledAt !== undefined) {
    const date = new Date(enrolledAt);
    if (isNaN(date.getTime())) {
      throw ApiError.badRequest('Invalid enrolledAt date');
    }
  }

  if (expiresAt !== undefined) {
    const date = new Date(expiresAt);
    if (isNaN(date.getTime())) {
      throw ApiError.badRequest('Invalid expiresAt date');
    }
  }

  const data = {
    learnerId,
    courseId,
    enrolledAt: enrolledAt ? new Date(enrolledAt) : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined
  };

  const result = await EnrollmentsService.enrollCourse(data, userId);
  res.status(201).json(ApiResponse.success(result, 'Successfully enrolled in course'));
});

/**
 * POST /api/v2/enrollments/class
 * Enroll a learner in a class
 */
export const enrollClass = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  const { learnerId, classId, enrolledAt } = req.body;

  // Validate required fields
  if (!learnerId || typeof learnerId !== 'string') {
    throw ApiError.badRequest('learnerId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(learnerId)) {
    throw ApiError.badRequest('Invalid learner ID');
  }

  if (!classId || typeof classId !== 'string') {
    throw ApiError.badRequest('classId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw ApiError.badRequest('Invalid class ID');
  }

  // Validate optional date
  if (enrolledAt !== undefined) {
    const date = new Date(enrolledAt);
    if (isNaN(date.getTime())) {
      throw ApiError.badRequest('Invalid enrolledAt date');
    }
  }

  const data = {
    learnerId,
    classId,
    enrolledAt: enrolledAt ? new Date(enrolledAt) : undefined
  };

  const result = await EnrollmentsService.enrollClass(data, userId);
  res.status(201).json(ApiResponse.success(result, 'Successfully enrolled in class'));
});

/**
 * GET /api/v2/enrollments/:id
 * Get detailed enrollment information
 */
export const getEnrollmentById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid enrollment ID');
  }

  const result = await EnrollmentsService.getEnrollmentById(id, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * PATCH /api/v2/enrollments/:id/status
 * Update enrollment status
 */
export const updateEnrollmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid enrollment ID');
  }

  const { status, reason, grade } = req.body;

  // Validate required field
  if (!status || typeof status !== 'string') {
    throw ApiError.badRequest('status is required');
  }

  if (!['active', 'completed', 'withdrawn', 'suspended'].includes(status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, completed, withdrawn, suspended');
  }

  // Validate reason if provided
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
    throw ApiError.badRequest('reason must be a string and not exceed 500 characters');
  }

  // Validate grade if provided
  if (grade !== undefined) {
    if (typeof grade !== 'object' || grade === null) {
      throw ApiError.badRequest('grade must be an object');
    }

    if (grade.score !== undefined) {
      if (typeof grade.score !== 'number' || grade.score < 0 || grade.score > 100) {
        throw ApiError.badRequest('grade.score must be a number between 0 and 100');
      }
    }

    if (grade.letter !== undefined && typeof grade.letter !== 'string') {
      throw ApiError.badRequest('grade.letter must be a string');
    }

    if (grade.passed !== undefined && typeof grade.passed !== 'boolean') {
      throw ApiError.badRequest('grade.passed must be a boolean');
    }
  }

  const data = {
    status: status as 'active' | 'completed' | 'withdrawn' | 'suspended',
    reason,
    grade
  };

  const result = await EnrollmentsService.updateEnrollmentStatus(id, data, userId);
  res.status(200).json(ApiResponse.success(result, 'Enrollment status updated successfully'));
});

/**
 * DELETE /api/v2/enrollments/:id
 * Withdraw from enrollment
 */
export const withdrawEnrollment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid enrollment ID');
  }

  const { reason } = req.body;

  // Validate reason if provided
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 500)) {
    throw ApiError.badRequest('reason must be a string and not exceed 500 characters');
  }

  const data = {
    reason
  };

  const result = await EnrollmentsService.withdrawEnrollment(id, data, userId);
  res.status(200).json(ApiResponse.success(result, 'Successfully withdrawn from enrollment'));
});

/**
 * GET /api/v2/enrollments/program/:programId
 * List all enrollments for a specific program
 */
export const listProgramEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { programId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(programId)) {
    throw ApiError.badRequest('Invalid program ID');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    status: req.query.status as 'active' | 'completed' | 'withdrawn' | 'suspended' | 'expired' | undefined,
    sort: req.query.sort as string
  };

  // Validate page and limit
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }
  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (filters.status && !['active', 'completed', 'withdrawn', 'suspended', 'expired'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, completed, withdrawn, suspended, expired');
  }

  const result = await EnrollmentsService.listProgramEnrollments(programId, filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/enrollments/course/:courseId
 * List all enrollments for a specific course
 */
export const listCourseEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { courseId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw ApiError.badRequest('Invalid course ID');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    status: req.query.status as 'active' | 'completed' | 'withdrawn' | 'suspended' | 'expired' | undefined,
    sort: req.query.sort as string
  };

  // Validate page and limit
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }
  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (filters.status && !['active', 'completed', 'withdrawn', 'suspended', 'expired'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, completed, withdrawn, suspended, expired');
  }

  const result = await EnrollmentsService.listCourseEnrollments(courseId, filters, userId);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/enrollments/class/:classId
 * List all enrollments for a specific class
 */
export const listClassEnrollments = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { classId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    throw ApiError.badRequest('Invalid class ID');
  }

  const filters = {
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    status: req.query.status as 'active' | 'completed' | 'withdrawn' | 'suspended' | 'expired' | undefined,
    sort: req.query.sort as string
  };

  // Validate page and limit
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }
  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (filters.status && !['active', 'completed', 'withdrawn', 'suspended', 'expired'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: active, completed, withdrawn, suspended, expired');
  }

  const result = await EnrollmentsService.listClassEnrollments(classId, filters, userId);
  res.status(200).json(ApiResponse.success(result));
});
