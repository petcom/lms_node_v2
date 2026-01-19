/**
 * Analytics API Contracts
 * Version: 1.0.0
 *
 * These contracts define the analytics endpoints for the LMS API.
 * Includes course summary analytics, department-wide metrics, and aggregated statistics.
 * Both backend and UI teams use these as the source of truth.
 *
 * Note: These endpoints are designed for staff users with department-admin or content-admin roles.
 * Data is automatically scoped to departments where the user has these roles.
 */

export const AnalyticsContract = {
  /**
   * Get Course Summary Analytics
   *
   * Returns aggregated analytics across all courses within specified departments.
   * Default behavior: Returns data for ALL departments where user has department-admin or content-admin role.
   * When departmentIds filter is provided: Returns data only for specified departments (must have access).
   *
   * Required Roles: department-admin OR content-admin (in at least one department)
   * Permission: analytics:view-course-summary
   */
  getCourseSummary: {
    endpoint: '/api/v2/analytics/courses/summary',
    method: 'GET' as const,
    version: '1.0.0',
    description: 'Get aggregated course analytics across departments',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
      },
      query: {
        departmentIds: {
          type: 'string[]',
          required: false,
          description:
            'Array of department IDs to filter by. If omitted, returns data for all accessible departments. User must have department-admin or content-admin role in each specified department.',
        },
        timeRange: {
          type: 'string',
          required: false,
          enum: ['30days', '3months', '6months', '1year', 'all'],
          default: '6months',
          description: 'Time range for trend data and metrics',
        },
        includeArchived: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include archived courses in metrics',
        },
      },
    },

    response: {
      success: {
        statusCode: 200,
        body: {
          data: {
            // Aggregate metrics across all filtered departments
            summary: {
              totalDepartments: {
                type: 'number',
                description: 'Number of departments included in this summary',
              },
              totalCourses: {
                type: 'number',
                description: 'Total courses across all departments',
              },
              publishedCourses: {
                type: 'number',
                description: 'Number of published courses',
              },
              draftCourses: {
                type: 'number',
                description: 'Number of draft courses',
              },
              archivedCourses: {
                type: 'number',
                description: 'Number of archived courses (only if includeArchived=true)',
              },
              totalEnrollments: {
                type: 'number',
                description: 'Total enrollments across all courses',
              },
              totalCompletions: {
                type: 'number',
                description: 'Total completions across all courses',
              },
              overallCompletionRate: {
                type: 'number',
                description: 'Overall completion rate as percentage (0-100)',
              },
              averageScore: {
                type: 'number',
                description: 'Average assessment score as percentage (0-100)',
              },
              totalActiveStudents: {
                type: 'number',
                description: 'Number of students with active (in-progress) enrollments',
              },
            },

            // Per-department breakdown
            departmentBreakdown: {
              type: 'array',
              items: {
                departmentId: { type: 'ObjectId' },
                departmentName: { type: 'string' },
                totalCourses: { type: 'number' },
                publishedCourses: { type: 'number' },
                draftCourses: { type: 'number' },
                totalEnrollments: { type: 'number' },
                completions: { type: 'number' },
                completionRate: { type: 'number', description: 'Percentage 0-100' },
                averageScore: { type: 'number', description: 'Percentage 0-100' },
                activeStudents: { type: 'number' },
              },
            },

            // Enrollment and completion trends over time
            enrollmentTrends: {
              type: 'array',
              description: 'Monthly trend data for the specified time range',
              items: {
                period: { type: 'string', description: 'Month label (e.g., "Jan", "Feb")' },
                enrollments: { type: 'number' },
                completions: { type: 'number' },
              },
            },

            // Course status distribution
            courseStatusDistribution: {
              type: 'array',
              items: {
                status: { type: 'string', enum: ['Published', 'Draft', 'Archived'] },
                count: { type: 'number' },
              },
            },

            // Top performing courses
            topCourses: {
              type: 'array',
              description: 'Top 10 courses by enrollment',
              items: {
                courseId: { type: 'ObjectId' },
                courseName: { type: 'string' },
                departmentId: { type: 'ObjectId' },
                departmentName: { type: 'string' },
                enrollments: { type: 'number' },
                completionRate: { type: 'number', description: 'Percentage 0-100' },
              },
            },
          },
        },
      },

      errors: {
        unauthorized: {
          statusCode: 401,
          body: {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        forbidden: {
          statusCode: 403,
          body: {
            error: 'FORBIDDEN',
            message: 'User does not have department-admin or content-admin role in any department',
          },
        },
        invalidDepartment: {
          statusCode: 403,
          body: {
            error: 'DEPARTMENT_ACCESS_DENIED',
            message: 'User does not have required role in one or more specified departments',
            details: {
              deniedDepartmentIds: { type: 'ObjectId[]' },
            },
          },
        },
      },
    },

    authorization: {
      requiredRoles: ['department-admin', 'content-admin'],
      roleLogic: 'OR',
      scope: 'department',
      description:
        'User must have department-admin OR content-admin role in at least one department. Data is automatically filtered to only departments where user has these roles.',
    },

    examples: {
      // Default request - all accessible departments
      default: {
        request: {
          headers: { Authorization: 'Bearer eyJ...' },
          query: {},
        },
        response: {
          data: {
            summary: {
              totalDepartments: 3,
              totalCourses: 25,
              publishedCourses: 20,
              draftCourses: 5,
              archivedCourses: 0,
              totalEnrollments: 450,
              totalCompletions: 315,
              overallCompletionRate: 70.0,
              averageScore: 78.5,
              totalActiveStudents: 120,
            },
            departmentBreakdown: [
              {
                departmentId: '507f1f77bcf86cd799439011',
                departmentName: 'Computer Science',
                totalCourses: 10,
                publishedCourses: 8,
                draftCourses: 2,
                totalEnrollments: 200,
                completions: 140,
                completionRate: 70.0,
                averageScore: 82.0,
                activeStudents: 45,
              },
            ],
            enrollmentTrends: [
              { period: 'Jan', enrollments: 45, completions: 32 },
              { period: 'Feb', enrollments: 52, completions: 38 },
            ],
            courseStatusDistribution: [
              { status: 'Published', count: 20 },
              { status: 'Draft', count: 5 },
            ],
            topCourses: [
              {
                courseId: '507f1f77bcf86cd799439012',
                courseName: 'Introduction to Programming',
                departmentId: '507f1f77bcf86cd799439011',
                departmentName: 'Computer Science',
                enrollments: 156,
                completionRate: 82.3,
              },
            ],
          },
        },
      },

      // Filtered to specific department
      filteredByDepartment: {
        request: {
          headers: { Authorization: 'Bearer eyJ...' },
          query: {
            departmentIds: ['507f1f77bcf86cd799439011'],
            timeRange: '3months',
          },
        },
        response: {
          data: {
            summary: {
              totalDepartments: 1,
              totalCourses: 10,
              // ... etc
            },
          },
        },
      },
    },
  },

  /**
   * Export Course Summary Report
   *
   * Generates an exportable report file (PDF, CSV, or Excel) of the course summary analytics.
   * Uses the same filtering logic as getCourseSummary.
   *
   * Required Roles: department-admin OR content-admin
   * Permission: analytics:export-course-summary
   */
  exportCourseSummary: {
    endpoint: '/api/v2/analytics/courses/summary/export',
    method: 'POST' as const,
    version: '1.0.0',
    description: 'Export course summary analytics as PDF, CSV, or Excel',

    request: {
      headers: {
        'Authorization': 'Bearer <token>',
        'Content-Type': 'application/json',
      },
      body: {
        format: {
          type: 'string',
          required: true,
          enum: ['pdf', 'csv', 'excel'],
          description: 'Export file format',
        },
        departmentIds: {
          type: 'string[]',
          required: false,
          description: 'Filter by department IDs (same rules as getCourseSummary)',
        },
        timeRange: {
          type: 'string',
          required: false,
          enum: ['30days', '3months', '6months', '1year', 'all'],
          default: '6months',
        },
        includeArchived: {
          type: 'boolean',
          required: false,
          default: false,
        },
        includeDepartmentBreakdown: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include per-department breakdown in export',
        },
        includeTopCourses: {
          type: 'boolean',
          required: false,
          default: true,
          description: 'Include top courses section in export',
        },
      },
    },

    response: {
      success: {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf | text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="course-summary-{timestamp}.{ext}"',
        },
        body: 'Binary file data',
      },

      errors: {
        unauthorized: {
          statusCode: 401,
          body: { error: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        forbidden: {
          statusCode: 403,
          body: { error: 'FORBIDDEN', message: 'Insufficient permissions' },
        },
        invalidFormat: {
          statusCode: 400,
          body: { error: 'INVALID_FORMAT', message: 'Unsupported export format' },
        },
      },
    },

    authorization: {
      requiredRoles: ['department-admin', 'content-admin'],
      roleLogic: 'OR',
      scope: 'department',
      requiredPermission: 'analytics:export-course-summary',
    },
  },
};

/**
 * TypeScript Types derived from contracts
 */
export interface CourseSummaryMetrics {
  summary: {
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
  };
  departmentBreakdown: Array<{
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
  }>;
  enrollmentTrends: Array<{
    period: string;
    enrollments: number;
    completions: number;
  }>;
  courseStatusDistribution: Array<{
    status: 'Published' | 'Draft' | 'Archived';
    count: number;
  }>;
  topCourses: Array<{
    courseId: string;
    courseName: string;
    departmentId: string;
    departmentName: string;
    enrollments: number;
    completionRate: number;
  }>;
}

export interface CourseSummaryRequest {
  departmentIds?: string[];
  timeRange?: '30days' | '3months' | '6months' | '1year' | 'all';
  includeArchived?: boolean;
}

export interface CourseSummaryExportRequest {
  format: 'pdf' | 'csv' | 'excel';
  departmentIds?: string[];
  timeRange?: '30days' | '3months' | '6months' | '1year' | 'all';
  includeArchived?: boolean;
  includeDepartmentBreakdown?: boolean;
  includeTopCourses?: boolean;
}
