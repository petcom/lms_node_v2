/**
 * Course Summary Analytics Service
 *
 * Provides aggregated analytics for courses across departments.
 * Used by department-admin and content-admin for dashboard analytics.
 *
 * @module services/analytics/course-summary.service
 */

import mongoose from 'mongoose';
import Course from '@/models/academic/Course.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import Class from '@/models/academic/Class.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Time range options for analytics queries
 */
export type TimeRange = '30days' | '3months' | '6months' | '1year' | 'all';

/**
 * Input parameters for course summary query
 */
export interface CourseSummaryParams {
  departmentIds?: string[];
  timeRange?: TimeRange;
  includeArchived?: boolean;
}

/**
 * Summary metrics structure
 */
export interface SummaryMetrics {
  totalDepartments: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  archivedCourses: number;
  totalEnrollments: number;
  totalCompletions: number;
  overallCompletionRate: number;
  averageScore: number;
  totalActiveStudents: number;
}

/**
 * Per-department breakdown
 */
export interface DepartmentBreakdown {
  departmentId: string;
  departmentName: string;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  completions: number;
  completionRate: number;
  averageScore: number;
  activeStudents: number;
}

/**
 * Enrollment trend data point
 */
export interface TrendDataPoint {
  period: string;
  enrollments: number;
  completions: number;
}

/**
 * Course status distribution item
 */
export interface StatusDistribution {
  status: 'Published' | 'Draft' | 'Archived';
  count: number;
}

/**
 * Top course item
 */
export interface TopCourse {
  courseId: string;
  courseName: string;
  departmentId: string;
  departmentName: string;
  enrollments: number;
  completionRate: number;
}

/**
 * Full course summary response
 */
export interface CourseSummaryResponse {
  summary: SummaryMetrics;
  departmentBreakdown: DepartmentBreakdown[];
  enrollmentTrends: TrendDataPoint[];
  courseStatusDistribution: StatusDistribution[];
  topCourses: TopCourse[];
}

/**
 * Calculate the start date based on time range
 */
function getStartDate(timeRange: TimeRange): Date | null {
  if (timeRange === 'all') {
    return null;
  }

  const now = new Date();
  switch (timeRange) {
    case '30days':
      return new Date(now.setDate(now.getDate() - 30));
    case '3months':
      return new Date(now.setMonth(now.getMonth() - 3));
    case '6months':
      return new Date(now.setMonth(now.getMonth() - 6));
    case '1year':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setMonth(now.getMonth() - 6)); // Default 6 months
  }
}

/**
 * Get month labels for trend data
 */
function getMonthLabels(timeRange: TimeRange): string[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonth = now.getMonth();

  let numMonths: number;
  switch (timeRange) {
    case '30days':
      numMonths = 1;
      break;
    case '3months':
      numMonths = 3;
      break;
    case '6months':
      numMonths = 6;
      break;
    case '1year':
      numMonths = 12;
      break;
    case 'all':
      numMonths = 12; // Show last 12 months for 'all'
      break;
    default:
      numMonths = 6;
  }

  const labels: string[] = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    labels.push(months[monthIndex]);
  }
  return labels;
}

/**
 * Course Summary Analytics Service
 */
export class CourseSummaryService {
  /**
   * Get course summary analytics
   *
   * @param accessibleDepartmentIds - Department IDs user has access to
   * @param params - Query parameters
   * @returns Course summary analytics data
   */
  async getCourseSummary(
    accessibleDepartmentIds: string[],
    params: CourseSummaryParams
  ): Promise<CourseSummaryResponse> {
    const { departmentIds, timeRange = '6months', includeArchived = false } = params;

    // Validate and filter department IDs
    let targetDepartmentIds: mongoose.Types.ObjectId[];

    if (departmentIds && departmentIds.length > 0) {
      // Check that all requested departments are accessible
      const deniedIds = departmentIds.filter(id => !accessibleDepartmentIds.includes(id));
      if (deniedIds.length > 0) {
        throw ApiError.forbidden(
          'User does not have required role in one or more specified departments'
        );
      }
      targetDepartmentIds = departmentIds.map(id => new mongoose.Types.ObjectId(id));
    } else {
      targetDepartmentIds = accessibleDepartmentIds.map(id => new mongoose.Types.ObjectId(id));
    }

    if (targetDepartmentIds.length === 0) {
      throw ApiError.forbidden(
        'User does not have department-admin or content-admin role in any department',
        'FORBIDDEN'
      );
    }

    const startDate = getStartDate(timeRange);

    // Build course status filter
    const statusFilter = includeArchived
      ? { $in: ['draft', 'published', 'archived'] }
      : { $in: ['draft', 'published'] };

    // Get department info
    const departments = await Department.find({
      _id: { $in: targetDepartmentIds }
    }).lean();

    const departmentMap = new Map(
      departments.map(d => [d._id.toString(), d.name])
    );

    // Get courses
    const courses = await Course.find({
      departmentId: { $in: targetDepartmentIds },
      status: statusFilter
    }).lean();

    // Get all classes for these courses
    const courseIds = courses.map(c => c._id);
    const classes = await Class.find({
      courseId: { $in: courseIds }
    }).lean();

    const classIds = classes.map(c => c._id);

    // Build enrollment date filter
    const enrollmentDateFilter: any = {};
    if (startDate) {
      enrollmentDateFilter.enrollmentDate = { $gte: startDate };
    }

    // Get enrollments
    const enrollments = await ClassEnrollment.find({
      classId: { $in: classIds },
      ...enrollmentDateFilter
    }).lean();

    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(courses, enrollments, targetDepartmentIds.length);

    // Calculate department breakdown
    const departmentBreakdown = await this.calculateDepartmentBreakdown(
      courses,
      classes,
      enrollments,
      departmentMap
    );

    // Calculate enrollment trends
    const enrollmentTrends = this.calculateEnrollmentTrends(enrollments, timeRange);

    // Calculate course status distribution
    const courseStatusDistribution = this.calculateStatusDistribution(courses, includeArchived);

    // Calculate top courses
    const topCourses = await this.calculateTopCourses(
      courses,
      classes,
      enrollments,
      departmentMap
    );

    logger.info('Course summary analytics generated', {
      departmentCount: targetDepartmentIds.length,
      courseCount: courses.length,
      enrollmentCount: enrollments.length,
      timeRange
    });

    return {
      summary,
      departmentBreakdown,
      enrollmentTrends,
      courseStatusDistribution,
      topCourses
    };
  }

  /**
   * Calculate summary metrics from raw data
   */
  private calculateSummaryMetrics(
    courses: any[],
    enrollments: any[],
    departmentCount: number
  ): SummaryMetrics {
    const publishedCourses = courses.filter(c => c.status === 'published').length;
    const draftCourses = courses.filter(c => c.status === 'draft').length;
    const archivedCourses = courses.filter(c => c.status === 'archived').length;

    const totalEnrollments = enrollments.length;
    const completions = enrollments.filter(e => e.status === 'completed').length;
    const activeStudents = enrollments.filter(e => e.status === 'active' || e.status === 'enrolled').length;

    // Calculate average score from completed enrollments with grades
    const gradedEnrollments = enrollments.filter(
      e => e.status === 'completed' && e.gradePercentage !== undefined && e.gradePercentage !== null
    );
    const averageScore = gradedEnrollments.length > 0
      ? gradedEnrollments.reduce((sum, e) => sum + (e.gradePercentage || 0), 0) / gradedEnrollments.length
      : 0;

    const completionRate = totalEnrollments > 0
      ? Math.round((completions / totalEnrollments) * 100 * 10) / 10
      : 0;

    return {
      totalDepartments: departmentCount,
      totalCourses: courses.length,
      publishedCourses,
      draftCourses,
      archivedCourses,
      totalEnrollments,
      totalCompletions: completions,
      overallCompletionRate: completionRate,
      averageScore: Math.round(averageScore * 10) / 10,
      totalActiveStudents: activeStudents
    };
  }

  /**
   * Calculate per-department breakdown
   */
  private async calculateDepartmentBreakdown(
    courses: any[],
    classes: any[],
    enrollments: any[],
    departmentMap: Map<string, string>
  ): Promise<DepartmentBreakdown[]> {
    // Create a map of course to department
    const courseToDepMap = new Map(
      courses.map(c => [c._id.toString(), c.departmentId.toString()])
    );

    // Create a map of class to course
    const classToCourseMap = new Map(
      classes.map(c => [c._id.toString(), c.courseId.toString()])
    );

    // Group data by department
    const deptData = new Map<string, {
      courses: any[];
      enrollments: any[];
    }>();

    // Initialize departments
    for (const [deptId] of departmentMap) {
      deptData.set(deptId, { courses: [], enrollments: [] });
    }

    // Assign courses to departments
    for (const course of courses) {
      const deptId = course.departmentId.toString();
      const data = deptData.get(deptId);
      if (data) {
        data.courses.push(course);
      }
    }

    // Assign enrollments to departments via class -> course -> department
    for (const enrollment of enrollments) {
      const classId = enrollment.classId.toString();
      const courseId = classToCourseMap.get(classId);
      if (courseId) {
        const deptId = courseToDepMap.get(courseId);
        if (deptId) {
          const data = deptData.get(deptId);
          if (data) {
            data.enrollments.push(enrollment);
          }
        }
      }
    }

    // Calculate breakdown for each department
    const breakdown: DepartmentBreakdown[] = [];
    for (const [deptId, data] of deptData) {
      const deptName = departmentMap.get(deptId) || 'Unknown';
      const totalCourses = data.courses.length;
      const publishedCourses = data.courses.filter(c => c.status === 'published').length;
      const draftCourses = data.courses.filter(c => c.status === 'draft').length;
      const totalEnrollments = data.enrollments.length;
      const completions = data.enrollments.filter(e => e.status === 'completed').length;
      const activeStudents = data.enrollments.filter(e => e.status === 'active' || e.status === 'enrolled').length;

      const gradedEnrollments = data.enrollments.filter(
        e => e.status === 'completed' && e.gradePercentage !== undefined && e.gradePercentage !== null
      );
      const averageScore = gradedEnrollments.length > 0
        ? gradedEnrollments.reduce((sum, e) => sum + (e.gradePercentage || 0), 0) / gradedEnrollments.length
        : 0;

      const completionRate = totalEnrollments > 0
        ? Math.round((completions / totalEnrollments) * 100 * 10) / 10
        : 0;

      breakdown.push({
        departmentId: deptId,
        departmentName: deptName,
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        completions,
        completionRate,
        averageScore: Math.round(averageScore * 10) / 10,
        activeStudents
      });
    }

    // Sort by total enrollments descending
    breakdown.sort((a, b) => b.totalEnrollments - a.totalEnrollments);

    return breakdown;
  }

  /**
   * Calculate enrollment trends over time
   */
  private calculateEnrollmentTrends(
    enrollments: any[],
    timeRange: TimeRange
  ): TrendDataPoint[] {
    const labels = getMonthLabels(timeRange);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Initialize trend data
    const trendData = new Map<string, { enrollments: number; completions: number }>();
    for (const label of labels) {
      trendData.set(label, { enrollments: 0, completions: 0 });
    }

    // Count enrollments and completions by month
    for (const enrollment of enrollments) {
      const enrollmentDate = new Date(enrollment.enrollmentDate);
      const monthIndex = enrollmentDate.getMonth();
      const year = enrollmentDate.getFullYear();
      
      // Only include enrollments within the time range
      const monthsAgo = (currentYear - year) * 12 + (currentMonth - monthIndex);
      if (monthsAgo >= 0 && monthsAgo < labels.length) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = months[monthIndex];
        const data = trendData.get(label);
        if (data) {
          data.enrollments++;
        }
      }

      // Count completions
      if (enrollment.status === 'completed' && enrollment.completionDate) {
        const completedAt = new Date(enrollment.completionDate);
        const compMonthIndex = completedAt.getMonth();
        const compYear = completedAt.getFullYear();
        const compMonthsAgo = (currentYear - compYear) * 12 + (currentMonth - compMonthIndex);
        if (compMonthsAgo >= 0 && compMonthsAgo < labels.length) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const label = months[compMonthIndex];
          const data = trendData.get(label);
          if (data) {
            data.completions++;
          }
        }
      }
    }

    // Convert to array
    return labels.map(label => ({
      period: label,
      enrollments: trendData.get(label)?.enrollments || 0,
      completions: trendData.get(label)?.completions || 0
    }));
  }

  /**
   * Calculate course status distribution
   */
  private calculateStatusDistribution(
    courses: any[],
    includeArchived: boolean
  ): StatusDistribution[] {
    const publishedCount = courses.filter(c => c.status === 'published').length;
    const draftCount = courses.filter(c => c.status === 'draft').length;
    const archivedCount = courses.filter(c => c.status === 'archived').length;

    const distribution: StatusDistribution[] = [
      { status: 'Published', count: publishedCount },
      { status: 'Draft', count: draftCount }
    ];

    if (includeArchived) {
      distribution.push({ status: 'Archived', count: archivedCount });
    }

    return distribution;
  }

  /**
   * Calculate top courses by enrollment
   */
  private async calculateTopCourses(
    courses: any[],
    classes: any[],
    enrollments: any[],
    departmentMap: Map<string, string>
  ): Promise<TopCourse[]> {
    // Map class to course
    const classToCourseMap = new Map(
      classes.map(c => [c._id.toString(), c.courseId.toString()])
    );

    // Count enrollments per course
    const courseEnrollments = new Map<string, { total: number; completed: number }>();

    for (const enrollment of enrollments) {
      const classId = enrollment.classId.toString();
      const courseId = classToCourseMap.get(classId);
      if (courseId) {
        const data = courseEnrollments.get(courseId) || { total: 0, completed: 0 };
        data.total++;
        if (enrollment.status === 'completed') {
          data.completed++;
        }
        courseEnrollments.set(courseId, data);
      }
    }

    // Create course info map
    const courseMap = new Map(
      courses.map(c => [c._id.toString(), c])
    );

    // Build top courses list
    const topCoursesList: TopCourse[] = [];
    for (const [courseId, data] of courseEnrollments) {
      const course = courseMap.get(courseId);
      if (course) {
        const deptId = course.departmentId.toString();
        const deptName = departmentMap.get(deptId) || 'Unknown';
        const completionRate = data.total > 0
          ? Math.round((data.completed / data.total) * 100 * 10) / 10
          : 0;

        topCoursesList.push({
          courseId,
          courseName: course.name,
          departmentId: deptId,
          departmentName: deptName,
          enrollments: data.total,
          completionRate
        });
      }
    }

    // Sort by enrollments descending and take top 10
    topCoursesList.sort((a, b) => b.enrollments - a.enrollments);
    return topCoursesList.slice(0, 10);
  }
}

// Export singleton instance
export const courseSummaryService = new CourseSummaryService();
