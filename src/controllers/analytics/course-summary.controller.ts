/**
 * Course Summary Analytics Controller
 *
 * Handles /api/v2/analytics/courses endpoints
 *
 * @module controllers/analytics/course-summary.controller
 */

import { Request, Response } from 'express';
import { courseSummaryService, TimeRange } from '@/services/analytics/course-summary.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';
import { Staff } from '@/models/auth/Staff.model';

// Valid time range values
const VALID_TIME_RANGES = ['30days', '3months', '6months', '1year', 'all'];

// Valid export formats
const VALID_EXPORT_FORMATS = ['pdf', 'csv', 'excel'];

/**
 * Helper to extract department IDs where user has analytics access
 * User must have department-admin or content-admin role
 * Fetches from Staff model to get department memberships with roles
 */
async function getAccessibleDepartmentIds(userId: string): Promise<string[]> {
  const staff = await Staff.findById(userId);
  
  if (!staff || !staff.isActive || !staff.departmentMemberships) {
    return [];
  }

  const accessibleIds: string[] = [];
  const analyticsRoles = ['department-admin', 'content-admin'];

  for (const membership of staff.departmentMemberships) {
    if (!membership.isActive) continue;
    
    // Check if user has any of the required roles in this department
    const hasAnalyticsRole = membership.roles?.some((role: string) =>
      analyticsRoles.includes(role)
    );
    if (hasAnalyticsRole) {
      accessibleIds.push(membership.departmentId.toString());
    }
  }

  return accessibleIds;
}

/**
 * GET /api/v2/analytics/courses/summary
 *
 * Get aggregated course analytics across departments.
 * Data is scoped to departments where user has department-admin or content-admin role.
 */
export const getCourseSummary = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  // Get departments where user has analytics access
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(user.userId);

  if (accessibleDepartmentIds.length === 0) {
    throw ApiError.forbidden(
      'User does not have department-admin or content-admin role in any department',
      'FORBIDDEN'
    );
  }

  // Parse query parameters
  const { departmentIds, timeRange, includeArchived } = req.query;

  // Validate timeRange
  if (timeRange && !VALID_TIME_RANGES.includes(timeRange as string)) {
    throw ApiError.badRequest(
      `Invalid timeRange. Must be one of: ${VALID_TIME_RANGES.join(', ')}`
    );
  }

  // Parse departmentIds (can be comma-separated or array)
  let parsedDepartmentIds: string[] | undefined;
  if (departmentIds) {
    if (Array.isArray(departmentIds)) {
      parsedDepartmentIds = departmentIds as string[];
    } else if (typeof departmentIds === 'string') {
      parsedDepartmentIds = departmentIds.split(',').map(id => id.trim());
    }
  }

  // Parse includeArchived boolean
  const parsedIncludeArchived = includeArchived === 'true';

  logger.info('Course summary analytics requested', {
    userId: user._id,
    accessibleDepartments: accessibleDepartmentIds.length,
    requestedDepartments: parsedDepartmentIds?.length || 'all',
    timeRange: timeRange || '6months'
  });

  const data = await courseSummaryService.getCourseSummary(accessibleDepartmentIds, {
    departmentIds: parsedDepartmentIds,
    timeRange: (timeRange as TimeRange) || '6months',
    includeArchived: parsedIncludeArchived
  });

  res.status(200).json(
    ApiResponse.success(data, 'Course summary analytics retrieved successfully')
  );
});

/**
 * POST /api/v2/analytics/courses/summary/export
 *
 * Export course summary analytics as PDF, CSV, or Excel.
 * Currently returns JSON with export metadata - actual file generation
 * can be implemented with libraries like PDFKit, csv-stringify, or exceljs.
 */
export const exportCourseSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;

  // Get departments where user has analytics access
  const accessibleDepartmentIds = await getAccessibleDepartmentIds(user.userId);

  if (accessibleDepartmentIds.length === 0) {
    throw ApiError.forbidden(
      'User does not have department-admin or content-admin role in any department',
      'FORBIDDEN'
    );
  }

  // Parse request body
  const {
    format,
    departmentIds,
    timeRange,
    includeArchived,
    includeDepartmentBreakdown = true,
    includeTopCourses = true
  } = req.body;

  // Validate format
  if (!format) {
    throw ApiError.badRequest('Export format is required');
  }
  if (!VALID_EXPORT_FORMATS.includes(format)) {
    throw ApiError.badRequest(
      `Invalid format. Must be one of: ${VALID_EXPORT_FORMATS.join(', ')}`
    );
  }

  // Validate timeRange
  if (timeRange && !VALID_TIME_RANGES.includes(timeRange)) {
    throw ApiError.badRequest(
      `Invalid timeRange. Must be one of: ${VALID_TIME_RANGES.join(', ')}`
    );
  }

  logger.info('Course summary export requested', {
    userId: user._id,
    format,
    accessibleDepartments: accessibleDepartmentIds.length,
    requestedDepartments: departmentIds?.length || 'all',
    timeRange: timeRange || '6months'
  });

  // Get the analytics data
  const data = await courseSummaryService.getCourseSummary(accessibleDepartmentIds, {
    departmentIds,
    timeRange: timeRange || '6months',
    includeArchived: includeArchived || false
  });

  // Filter data based on export options
  const exportData: any = {
    summary: data.summary,
    enrollmentTrends: data.enrollmentTrends,
    courseStatusDistribution: data.courseStatusDistribution
  };

  if (includeDepartmentBreakdown) {
    exportData.departmentBreakdown = data.departmentBreakdown;
  }

  if (includeTopCourses) {
    exportData.topCourses = data.topCourses;
  }

  // Generate filename
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const extension = format === 'excel' ? 'xlsx' : format;
  const filename = `course-summary-${timestamp}.${extension}`;

  // For now, return JSON with metadata
  // TODO: Implement actual file generation with PDFKit/exceljs/csv-stringify
  if (format === 'csv') {
    // Generate CSV
    const csvRows: string[] = [];
    
    // Summary section
    csvRows.push('Course Summary Analytics Report');
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push('');
    csvRows.push('Summary Metrics');
    csvRows.push(`Total Departments,${data.summary.totalDepartments}`);
    csvRows.push(`Total Courses,${data.summary.totalCourses}`);
    csvRows.push(`Published Courses,${data.summary.publishedCourses}`);
    csvRows.push(`Draft Courses,${data.summary.draftCourses}`);
    csvRows.push(`Total Enrollments,${data.summary.totalEnrollments}`);
    csvRows.push(`Total Completions,${data.summary.totalCompletions}`);
    csvRows.push(`Completion Rate (%),${data.summary.overallCompletionRate}`);
    csvRows.push(`Average Score (%),${data.summary.averageScore}`);
    csvRows.push(`Active Students,${data.summary.totalActiveStudents}`);
    csvRows.push('');

    if (includeDepartmentBreakdown && data.departmentBreakdown.length > 0) {
      csvRows.push('Department Breakdown');
      csvRows.push('Department,Total Courses,Published,Draft,Enrollments,Completions,Completion Rate,Avg Score,Active Students');
      for (const dept of data.departmentBreakdown) {
        csvRows.push(`"${dept.departmentName}",${dept.totalCourses},${dept.publishedCourses},${dept.draftCourses},${dept.totalEnrollments},${dept.completions},${dept.completionRate},${dept.averageScore},${dept.activeStudents}`);
      }
      csvRows.push('');
    }

    if (includeTopCourses && data.topCourses.length > 0) {
      csvRows.push('Top Courses');
      csvRows.push('Course,Department,Enrollments,Completion Rate');
      for (const course of data.topCourses) {
        csvRows.push(`"${course.courseName}","${course.departmentName}",${course.enrollments},${course.completionRate}`);
      }
    }

    const csvContent = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
    return;
  }

  // For PDF and Excel, return JSON with a note about implementation
  // In production, integrate PDFKit or exceljs for actual file generation
  res.status(200).json(
    ApiResponse.success({
      message: `Export format '${format}' requested. File generation pending implementation.`,
      filename,
      format,
      data: exportData,
      generatedAt: new Date().toISOString()
    }, 'Export data prepared successfully')
  );
});
