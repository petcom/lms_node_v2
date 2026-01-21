import { Request, Response } from 'express';
import { CoursesService } from '@/services/academic/courses.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Courses Controller
 * Handles all /api/v2/courses endpoints
 */

/**
 * GET /api/v2/courses
 * List courses with optional filtering and pagination
 *
 * Authorization: Applies department scoping and visibility filtering
 */
export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    department: req.query.department as string | undefined,
    program: req.query.program as string | undefined,
    status: req.query.status as 'draft' | 'published' | 'archived' | undefined,
    search: req.query.search as string | undefined,
    instructor: req.query.instructor as string | undefined,
    sort: req.query.sort as string | undefined
  };

  // Validate pagination
  if (filters.page < 1) {
    throw ApiError.badRequest('Page must be at least 1');
  }

  if (filters.limit < 1 || filters.limit > 100) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate status
  if (filters.status && !['draft', 'published', 'archived'].includes(filters.status)) {
    throw ApiError.badRequest('Invalid status. Must be one of: draft, published, archived');
  }

  // Get authenticated user from request
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const result = await CoursesService.listCourses(filters);

  // Apply visibility filtering based on user's roles and department
  if (result.courses && Array.isArray(result.courses)) {
    result.courses = await CoursesService.filterCoursesByVisibility(result.courses, user);
    result.total = result.courses.length;
    result.totalPages = Math.ceil(result.courses.length / filters.limit);
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/courses
 * Create a new course
 */
export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const { title, code, description, department, program, credits, duration, instructors, settings } = req.body;

  // Validate required fields
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw ApiError.badRequest('Course title is required');
  }

  if (title.length > 200) {
    throw ApiError.badRequest('Course title cannot exceed 200 characters');
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw ApiError.badRequest('Course code is required');
  }

  // Validate code pattern (alphanumeric, max 35 chars)
  if (code.length > 35 || !/^[A-Za-z0-9]+$/.test(code)) {
    throw ApiError.badRequest('Course code must contain only letters and numbers (max 35 characters)');
  }

  if (!department || typeof department !== 'string') {
    throw ApiError.badRequest('Department ID is required');
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

  // Validate credits
  if (credits !== undefined && credits !== null) {
    if (typeof credits !== 'number' || credits < 0 || credits > 10) {
      throw ApiError.badRequest('Credits must be a number between 0 and 10');
    }
  }

  // Validate duration
  if (duration !== undefined && duration !== null) {
    if (typeof duration !== 'number' || duration < 0) {
      throw ApiError.badRequest('Duration must be a non-negative number');
    }
  }

  // Validate instructors
  if (instructors !== undefined && instructors !== null) {
    if (!Array.isArray(instructors)) {
      throw ApiError.badRequest('Instructors must be an array');
    }
  }

  // Validate settings
  if (settings !== undefined && settings !== null) {
    if (typeof settings !== 'object') {
      throw ApiError.badRequest('Settings must be an object');
    }
    if (settings.passingScore !== undefined && (typeof settings.passingScore !== 'number' || settings.passingScore < 0 || settings.passingScore > 100)) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
    if (settings.maxAttempts !== undefined && (typeof settings.maxAttempts !== 'number' || settings.maxAttempts < 1)) {
      throw ApiError.badRequest('Max attempts must be at least 1');
    }
  }

  const courseData = {
    title: title.trim(),
    code: code.trim().toUpperCase(),
    description: description?.trim(),
    department,
    program,
    credits,
    duration,
    instructors,
    settings
  };

  // Get createdBy from authenticated user (placeholder - would come from auth middleware)
  const createdBy = (req as any).user?.id;

  const result = await CoursesService.createCourse(courseData, createdBy);
  res.status(201).json(ApiResponse.success(result, 'Course created successfully'));
});

/**
 * GET /api/v2/courses/:id
 * Get course details by ID
 *
 * Authorization: Checks if user can view course (visibility rules)
 */
export const getCourseById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Extract user from request
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const course = await CoursesService.getCourseById(id);

  // Check if user has permission to view this course
  const canView = await CoursesService.canViewCourse(course, user);

  if (!canView) {
    throw ApiError.forbidden('You do not have permission to view this course');
  }

  res.status(200).json(ApiResponse.success(course));
});

/**
 * PUT /api/v2/courses/:id
 * Update course (full replacement)
 *
 * Authorization: Checks if user can edit course (creator/dept-admin rules)
 */
export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, code, description, department, program, credits, duration, instructors, settings } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Extract user from request
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  // Get course and check edit permissions
  const course = await CoursesService.getCourseById(id);
  const canEdit = await CoursesService.canEditCourse(course, user);

  if (!canEdit) {
    throw ApiError.forbidden('You do not have permission to edit this course');
  }

  // Validate required fields for full update
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw ApiError.badRequest('Course title is required');
  }

  if (title.length > 200) {
    throw ApiError.badRequest('Course title cannot exceed 200 characters');
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw ApiError.badRequest('Course code is required');
  }

  // Validate code pattern (alphanumeric, max 35 chars)
  if (code.length > 35 || !/^[A-Za-z0-9]+$/.test(code)) {
    throw ApiError.badRequest('Course code must contain only letters and numbers (max 35 characters)');
  }

  if (!department || typeof department !== 'string') {
    throw ApiError.badRequest('Department ID is required');
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

  // Validate credits
  if (credits !== undefined && credits !== null) {
    if (typeof credits !== 'number' || credits < 0 || credits > 10) {
      throw ApiError.badRequest('Credits must be a number between 0 and 10');
    }
  }

  // Validate duration
  if (duration !== undefined && duration !== null) {
    if (typeof duration !== 'number' || duration < 0) {
      throw ApiError.badRequest('Duration must be a non-negative number');
    }
  }

  // Validate instructors
  if (instructors !== undefined && instructors !== null) {
    if (!Array.isArray(instructors)) {
      throw ApiError.badRequest('Instructors must be an array');
    }
  }

  // Validate settings
  if (settings !== undefined && settings !== null) {
    if (typeof settings !== 'object') {
      throw ApiError.badRequest('Settings must be an object');
    }
    if (settings.passingScore !== undefined && (typeof settings.passingScore !== 'number' || settings.passingScore < 0 || settings.passingScore > 100)) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
    if (settings.maxAttempts !== undefined && (typeof settings.maxAttempts !== 'number' || settings.maxAttempts < 1)) {
      throw ApiError.badRequest('Max attempts must be at least 1');
    }
  }

  const updateData = {
    title: title.trim(),
    code: code.trim().toUpperCase(),
    description: description?.trim(),
    department,
    program,
    credits,
    duration,
    instructors,
    settings
  };

  const result = await CoursesService.updateCourse(id, updateData);
  res.status(200).json(ApiResponse.success(result, 'Course updated successfully'));
});

/**
 * PATCH /api/v2/courses/:id
 * Partially update course
 */
export const patchCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, credits, duration, instructors, settings } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw ApiError.badRequest('Course title cannot be empty');
    }
    if (title.length > 200) {
      throw ApiError.badRequest('Course title cannot exceed 200 characters');
    }
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

  // Validate credits if provided
  if (credits !== undefined && credits !== null) {
    if (typeof credits !== 'number' || credits < 0 || credits > 10) {
      throw ApiError.badRequest('Credits must be a number between 0 and 10');
    }
  }

  // Validate duration if provided
  if (duration !== undefined && duration !== null) {
    if (typeof duration !== 'number' || duration < 0) {
      throw ApiError.badRequest('Duration must be a non-negative number');
    }
  }

  // Validate instructors if provided
  if (instructors !== undefined && instructors !== null) {
    if (!Array.isArray(instructors)) {
      throw ApiError.badRequest('Instructors must be an array');
    }
  }

  // Validate settings if provided
  if (settings !== undefined && settings !== null) {
    if (typeof settings !== 'object') {
      throw ApiError.badRequest('Settings must be an object');
    }
    if (settings.passingScore !== undefined && (typeof settings.passingScore !== 'number' || settings.passingScore < 0 || settings.passingScore > 100)) {
      throw ApiError.badRequest('Passing score must be between 0 and 100');
    }
    if (settings.maxAttempts !== undefined && (typeof settings.maxAttempts !== 'number' || settings.maxAttempts < 1)) {
      throw ApiError.badRequest('Max attempts must be at least 1');
    }
  }

  const patchData: any = {};
  if (title !== undefined) patchData.title = title.trim();
  if (description !== undefined) patchData.description = description?.trim();
  if (credits !== undefined) patchData.credits = credits;
  if (duration !== undefined) patchData.duration = duration;
  if (instructors !== undefined) patchData.instructors = instructors;
  if (settings !== undefined) patchData.settings = settings;

  const result = await CoursesService.patchCourse(id, patchData);
  res.status(200).json(ApiResponse.success(result, 'Course updated successfully'));
});

/**
 * DELETE /api/v2/courses/:id
 * Delete course (soft delete)
 */
export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  await CoursesService.deleteCourse(id);
  res.status(200).json(ApiResponse.success(null, 'Course deleted successfully'));
});

/**
 * POST /api/v2/courses/:id/publish
 * Publish a course
 */
export const publishCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { publishedAt } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Validate publishedAt if provided
  let publishDate: Date | undefined;
  if (publishedAt) {
    publishDate = new Date(publishedAt);
    if (isNaN(publishDate.getTime())) {
      throw ApiError.badRequest('Invalid publishedAt date format');
    }
  }

  const result = await CoursesService.publishCourse(id, publishDate);
  res.status(200).json(ApiResponse.success(result, 'Course published successfully'));
});

/**
 * POST /api/v2/courses/:id/unpublish
 * Unpublish a course
 */
export const unpublishCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  const result = await CoursesService.unpublishCourse(id, reason);
  res.status(200).json(ApiResponse.success(result, 'Course unpublished successfully'));
});

/**
 * POST /api/v2/courses/:id/archive
 * Archive a course
 */
export const archiveCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, archivedAt } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Validate archivedAt if provided
  let archiveDate: Date | undefined;
  if (archivedAt) {
    archiveDate = new Date(archivedAt);
    if (isNaN(archiveDate.getTime())) {
      throw ApiError.badRequest('Invalid archivedAt date format');
    }
  }

  const result = await CoursesService.archiveCourse(id, reason, archiveDate);
  res.status(200).json(ApiResponse.success(result, 'Course archived successfully'));
});

/**
 * POST /api/v2/courses/:id/unarchive
 * Unarchive a course
 */
export const unarchiveCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  const result = await CoursesService.unarchiveCourse(id);
  res.status(200).json(ApiResponse.success(result, 'Course unarchived successfully'));
});

/**
 * POST /api/v2/courses/:id/duplicate
 * Duplicate a course
 */
export const duplicateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newTitle, newCode, includeModules, includeSettings, targetProgram, targetDepartment } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  if (!newCode || typeof newCode !== 'string') {
    throw ApiError.badRequest('New course code is required');
  }

  // Validate new code pattern (alphanumeric, max 35 chars)
  if (newCode.length > 35 || !/^[A-Za-z0-9]+$/.test(newCode)) {
    throw ApiError.badRequest('Course code must contain only letters and numbers (max 35 characters)');
  }

  // Validate newTitle if provided
  if (newTitle !== undefined && newTitle !== null) {
    if (typeof newTitle !== 'string' || newTitle.trim().length === 0) {
      throw ApiError.badRequest('New title cannot be empty');
    }
    if (newTitle.length > 200) {
      throw ApiError.badRequest('New title cannot exceed 200 characters');
    }
  }

  const options = {
    newTitle: newTitle?.trim(),
    newCode: newCode.trim().toUpperCase(),
    includeModules: includeModules !== false,
    includeSettings: includeSettings !== false,
    targetProgram,
    targetDepartment
  };

  // Get createdBy from authenticated user (placeholder - would come from auth middleware)
  const createdBy = (req as any).user?.id;

  const result = await CoursesService.duplicateCourse(id, options, createdBy);
  res.status(201).json(ApiResponse.success(result, 'Course duplicated successfully'));
});

/**
 * GET /api/v2/courses/:id/export
 * Export a course
 */
export const exportCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const format = (req.query.format as string) || 'scorm2004';
  const includeModules = req.query.includeModules !== 'false';
  const includeAssessments = req.query.includeAssessments !== 'false';

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Validate format
  const validFormats = ['scorm1.2', 'scorm2004', 'xapi', 'pdf', 'json'];
  if (!validFormats.includes(format)) {
    throw ApiError.badRequest('Invalid format. Must be one of: scorm1.2, scorm2004, xapi, pdf, json');
  }

  const result = await CoursesService.exportCourse(id, format, includeModules, includeAssessments);
  res.status(200).json(ApiResponse.success(result, 'Course export generated successfully'));
});

/**
 * PATCH /api/v2/courses/:id/department
 * Update course department
 */
export const updateCourseDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { department } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  if (!department || typeof department !== 'string') {
    throw ApiError.badRequest('Department ID is required');
  }

  const result = await CoursesService.updateCourseDepartment(id, department);
  res.status(200).json(ApiResponse.success(result, 'Course moved to new department successfully'));
});

/**
 * PATCH /api/v2/courses/:id/program
 * Update course program
 */
export const updateCourseProgram = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { program } = req.body;

  if (!id) {
    throw ApiError.badRequest('Course ID is required');
  }

  if (program === undefined) {
    throw ApiError.badRequest('Program ID is required (use null to remove assignment)');
  }

  const result = await CoursesService.updateCourseProgram(id, program);
  res.status(200).json(ApiResponse.success(result, program ? 'Course assigned to program successfully' : 'Program assignment removed successfully'));
});
