import { Request, Response } from 'express';
import { ReportsService } from '@/services/reporting/reports.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Reports Controller
 * Handles all /api/v2/reports endpoints
 */

/**
 * GET /api/v2/reports/completion
 * Get completion report with filtering and aggregation
 */
export const getCompletionReport = asyncHandler(async (req: Request, res: Response) => {
  const {
    programId,
    courseId,
    classId,
    departmentId,
    startDate,
    endDate,
    status,
    learnerId,
    groupBy,
    includeDetails,
    page,
    limit
  } = req.query;

  // Validate status
  if (status && !['not_started', 'in_progress', 'completed', 'withdrawn'].includes(status as string)) {
    throw ApiError.badRequest(
      'Invalid status. Must be one of: not_started, in_progress, completed, withdrawn'
    );
  }

  // Validate groupBy
  const validGroupBy = ['program', 'course', 'department', 'status', 'month'];
  if (groupBy && !validGroupBy.includes(groupBy as string)) {
    throw ApiError.badRequest(
      `Invalid groupBy. Must be one of: ${validGroupBy.join(', ')}`
    );
  }

  // Validate dates
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (startDate) {
    parsedStartDate = new Date(startDate as string);
    if (isNaN(parsedStartDate.getTime())) {
      throw ApiError.badRequest('Invalid startDate format');
    }
  }

  if (endDate) {
    parsedEndDate = new Date(endDate as string);
    if (isNaN(parsedEndDate.getTime())) {
      throw ApiError.badRequest('Invalid endDate format');
    }
  }

  // Validate pagination
  let parsedPage = 1;
  let parsedLimit = 50;

  if (page !== undefined) {
    parsedPage = parseInt(page as string, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      throw ApiError.badRequest('Page must be at least 1');
    }
  }

  if (limit !== undefined) {
    parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      throw ApiError.badRequest('Limit must be between 1 and 500');
    }
  }

  // Parse boolean
  const parsedIncludeDetails = includeDetails === 'true' || typeof includeDetails === 'boolean' && includeDetails;

  // Authorization: Apply instructor and department scoping
  const user = (req as any).user;

  let filters: any = {
    programId: programId as string | undefined,
    courseId: courseId as string | undefined,
    classId: classId as string | undefined,
    departmentId: departmentId as string | undefined,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    status: status as string | undefined,
    learnerId: learnerId as string | undefined,
    groupBy: (groupBy as string) || 'course',
    includeDetails: parsedIncludeDetails,
    page: parsedPage,
    limit: parsedLimit
  };

  // Apply authorization scoping to filters
  filters = await ReportsService.applyAuthorizationScoping(filters, user);

  const result = await ReportsService.getCompletionReport(filters);

  // Apply data masking to learner information (FERPA compliance)
  if (result.data && Array.isArray(result.data)) {
    result.data = ReportsService.applyDataMaskingToList(result.data, user);
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/reports/performance
 * Get performance report with scores, grades, and analytics
 */
export const getPerformanceReport = asyncHandler(async (req: Request, res: Response) => {
  const {
    programId,
    courseId,
    classId,
    departmentId,
    startDate,
    endDate,
    learnerId,
    minScore,
    includeRankings,
    page,
    limit
  } = req.query;

  // Validate dates
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (startDate) {
    parsedStartDate = new Date(startDate as string);
    if (isNaN(parsedStartDate.getTime())) {
      throw ApiError.badRequest('Invalid startDate format');
    }
  }

  if (endDate) {
    parsedEndDate = new Date(endDate as string);
    if (isNaN(parsedEndDate.getTime())) {
      throw ApiError.badRequest('Invalid endDate format');
    }
  }

  // Validate minScore
  let parsedMinScore: number | undefined;
  if (minScore !== undefined) {
    parsedMinScore = parseFloat(minScore as string);
    if (isNaN(parsedMinScore) || parsedMinScore < 0 || parsedMinScore > 100) {
      throw ApiError.badRequest('minScore must be a number between 0 and 100');
    }
  }

  // Validate pagination
  let parsedPage = 1;
  let parsedLimit = 50;

  if (page !== undefined) {
    parsedPage = parseInt(page as string, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      throw ApiError.badRequest('Page must be at least 1');
    }
  }

  if (limit !== undefined) {
    parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      throw ApiError.badRequest('Limit must be between 1 and 500');
    }
  }

  // Parse boolean
  const parsedIncludeRankings = includeRankings === 'true';

  // Extract user context
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  let filters = {
    programId: programId as string | undefined,
    courseId: courseId as string | undefined,
    classId: classId as string | undefined,
    departmentId: departmentId as string | undefined,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    learnerId: learnerId as string | undefined,
    minScore: parsedMinScore,
    includeRankings: parsedIncludeRankings,
    page: parsedPage,
    limit: parsedLimit
  };

  // Apply authorization scoping to filters
  filters = await ReportsService.applyAuthorizationScoping(filters, user);

  const result = await ReportsService.getPerformanceReport(filters);

  // Apply data masking
  if (result.performanceMetrics && Array.isArray(result.performanceMetrics)) {
    result.performanceMetrics = ReportsService.applyDataMaskingToList(result.performanceMetrics, user);
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/reports/transcript/:learnerId
 * Get official transcript for a learner
 */
export const getLearnerTranscript = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId } = req.params;
  const { programId, includeInProgress } = req.query;

  // Validate learnerId
  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // Parse boolean
  const parsedIncludeInProgress = includeInProgress === 'true';

  // Authorization: Filter transcript by department for department-admin
  const user = (req as any).user;

  let result = await ReportsService.getLearnerTranscript(
    learnerId,
    programId as string | undefined,
    parsedIncludeInProgress
  );

  // Apply transcript filtering based on user's department (Phase 2 integration)
  result.transcript = await ReportsService.filterTranscriptByDepartment(result.transcript, user);

  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/reports/transcript/:learnerId/generate
 * Generate PDF transcript for a learner
 */
export const generatePDFTranscript = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId } = req.params;
  const { programId, includeInProgress, officialFormat, watermark } = req.body;

  // Validate learnerId
  if (!learnerId) {
    throw ApiError.badRequest('Learner ID is required');
  }

  // Extract user context
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  // Authorization: Learners can generate own, staff must have access
  const isOwnTranscript = learnerId === user.userId;
  const hasAccess = isOwnTranscript ||
                    user.allAccessRights?.includes('learner:transcripts:read') ||
                    user.roles?.includes('system-admin');

  if (!hasAccess) {
    throw ApiError.forbidden('You do not have permission to generate this transcript');
  }

  // Validate watermark
  const validWatermarks = ['none', 'unofficial', 'draft'];
  const parsedWatermark = watermark || 'none';
  if (!validWatermarks.includes(parsedWatermark)) {
    throw ApiError.badRequest(
      `Invalid watermark. Must be one of: ${validWatermarks.join(', ')}`
    );
  }

  // Parse booleans
  const parsedIncludeInProgress = includeInProgress === true || includeInProgress === 'true';
  const parsedOfficialFormat = officialFormat !== false && officialFormat !== 'false';

  const result = await ReportsService.generatePDFTranscript(
    learnerId,
    programId,
    parsedIncludeInProgress,
    parsedOfficialFormat,
    parsedWatermark
  );

  res.status(200).json(
    ApiResponse.success(result, 'Transcript PDF generated successfully')
  );
});

/**
 * GET /api/v2/reports/course/:courseId
 * Get comprehensive course-level report with all learners
 */
export const getCourseReport = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { classId, startDate, endDate, includeModules } = req.query;

  // Validate courseId
  if (!courseId) {
    throw ApiError.badRequest('Course ID is required');
  }

  // Extract user context
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  // Validate dates
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (startDate) {
    parsedStartDate = new Date(startDate as string);
    if (isNaN(parsedStartDate.getTime())) {
      throw ApiError.badRequest('Invalid startDate format');
    }
  }

  if (endDate) {
    parsedEndDate = new Date(endDate as string);
    if (isNaN(parsedEndDate.getTime())) {
      throw ApiError.badRequest('Invalid endDate format');
    }
  }

  // Parse boolean
  const parsedIncludeModules = includeModules !== 'false';

  let filters = {
    courseId,
    classId: classId as string | undefined,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    includeModules: parsedIncludeModules
  };

  // Apply authorization scoping
  filters = await ReportsService.applyAuthorizationScoping(filters, user);

  const result = await ReportsService.getCourseReport(filters);

  // Apply data masking
  if (result.data && Array.isArray(result.data)) {
    result.data = ReportsService.applyDataMaskingToList(result.data, user);
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/reports/program/:programId
 * Get comprehensive program-level report
 */
export const getProgramReport = asyncHandler(async (req: Request, res: Response) => {
  const { programId } = req.params;
  const { academicYearId, startDate, endDate } = req.query;

  // Validate programId
  if (!programId) {
    throw ApiError.badRequest('Program ID is required');
  }

  // Extract user context
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  // Validate dates
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (startDate) {
    parsedStartDate = new Date(startDate as string);
    if (isNaN(parsedStartDate.getTime())) {
      throw ApiError.badRequest('Invalid startDate format');
    }
  }

  if (endDate) {
    parsedEndDate = new Date(endDate as string);
    if (isNaN(parsedEndDate.getTime())) {
      throw ApiError.badRequest('Invalid endDate format');
    }
  }

  let filters = {
    programId,
    academicYearId: academicYearId as string | undefined,
    startDate: parsedStartDate,
    endDate: parsedEndDate
  };

  // Apply authorization scoping
  filters = await ReportsService.applyAuthorizationScoping(filters, user);

  const result = await ReportsService.getProgramReport(filters);

  // Apply data masking
  if (result.data && Array.isArray(result.data)) {
    result.data = ReportsService.applyDataMaskingToList(result.data, user);
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/reports/department/:departmentId
 * Get comprehensive department-level report
 */
export const getDepartmentReport = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.params;
  const { startDate, endDate, includeSubDepartments } = req.query;

  // Validate departmentId
  if (!departmentId) {
    throw ApiError.badRequest('Department ID is required');
  }

  // Extract user context
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  // Validate dates
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (startDate) {
    parsedStartDate = new Date(startDate as string);
    if (isNaN(parsedStartDate.getTime())) {
      throw ApiError.badRequest('Invalid startDate format');
    }
  }

  if (endDate) {
    parsedEndDate = new Date(endDate as string);
    if (isNaN(parsedEndDate.getTime())) {
      throw ApiError.badRequest('Invalid endDate format');
    }
  }

  // Parse boolean
  const parsedIncludeSubDepartments = includeSubDepartments === 'true';

  let filters = {
    departmentId,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    includeSubDepartments: parsedIncludeSubDepartments
  };

  // Apply authorization scoping (department admin can only see own department)
  filters = await ReportsService.applyAuthorizationScoping(filters, user);

  const result = await ReportsService.getDepartmentReport(filters);

  // Apply data masking
  if (result.data && Array.isArray(result.data)) {
    result.data = ReportsService.applyDataMaskingToList(result.data, user);
  }

  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/reports/export
 * Export report data in multiple formats
 */
export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const {
    reportType,
    format,
    programId,
    courseId,
    classId,
    departmentId,
    startDate,
    endDate,
    learnerId,
    includeDetails
  } = req.query;

  // Validate reportType
  const validReportTypes = ['completion', 'performance', 'course', 'program', 'department'];
  if (!reportType || !validReportTypes.includes(reportType as string)) {
    throw ApiError.badRequest(
      `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}`
    );
  }

  // Validate format
  const validFormats = ['csv', 'xlsx', 'pdf', 'json'];
  if (!format || !validFormats.includes(format as string)) {
    throw ApiError.badRequest(
      `Invalid format. Must be one of: ${validFormats.join(', ')}`
    );
  }

  // Validate dates
  let parsedStartDate: Date | undefined;
  let parsedEndDate: Date | undefined;

  if (startDate) {
    parsedStartDate = new Date(startDate as string);
    if (isNaN(parsedStartDate.getTime())) {
      throw ApiError.badRequest('Invalid startDate format');
    }
  }

  if (endDate) {
    parsedEndDate = new Date(endDate as string);
    if (isNaN(parsedEndDate.getTime())) {
      throw ApiError.badRequest('Invalid endDate format');
    }
  }

  // Parse boolean
  const parsedIncludeDetails = includeDetails !== 'false';

  // Extract user context
  const user = (req as any).user;
  if (!user) {
    throw ApiError.unauthorized('User context not found');
  }

  const filters = {
    reportType: reportType as string,
    format: format as string,
    programId: programId as string | undefined,
    courseId: courseId as string | undefined,
    classId: classId as string | undefined,
    departmentId: departmentId as string | undefined,
    startDate: parsedStartDate,
    endDate: parsedEndDate,
    learnerId: learnerId as string | undefined,
    includeDetails: parsedIncludeDetails
  };

  const result = await ReportsService.exportReport(filters);

  res.status(200).json(
    ApiResponse.success(result, 'Report exported successfully')
  );
});
