/**
 * Report Jobs Controller
 *
 * Handles API requests for report job management including creating,
 * listing, viewing, canceling, downloading, and retrying report jobs.
 *
 * @module controllers/reports/report-jobs
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';
import reportJobService from '@/services/reports/report-jobs.service';

// Types inlined from contracts to avoid rootDir issues
interface ReportJobSummary {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  status: string;
  priority: string;
  visibility: string;
  progress?: {
    percentage: number;
    currentStep: string;
    recordsProcessed?: number;
    totalRecords?: number;
  };
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  output?: {
    format: string;
    downloadUrl?: string;
  };
}

interface ReportJobDetail extends ReportJobSummary {
  parameters: {
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    filters?: {
      departmentIds?: string[];
      courseIds?: string[];
      classIds?: string[];
      learnerIds?: string[];
      contentIds?: string[];
      eventTypes?: string[];
      statuses?: string[];
    };
    groupBy?: string[];
    measures?: string[];
    includeInactive?: boolean;
  };
  output: {
    format: string;
    filename?: string;
    storage?: {
      provider: string;
      path?: string;
      bucket?: string;
      key?: string;
      url?: string;
      expiresAt?: string;
    };
  };
  error?: {
    code?: string;
    message: string;
    stack?: string;
    retryCount?: number;
    lastRetryAt?: string;
  };
  scheduledFor?: string;
  templateId?: string;
  scheduleId?: string;
}

interface CreateReportJobResponse {
  success: true;
  data: {
    id: string;
    status: string;
    estimatedWaitTime?: number;
    queuePosition?: number;
  };
  message: string;
}

interface ListReportJobsResponse {
  success: true;
  data: ReportJobSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface GetReportJobResponse {
  success: true;
  data: ReportJobDetail;
}

interface CancelReportJobResponse {
  success: true;
  data: {
    id: string;
    status: string;
    cancelledAt: string;
  };
  message: string;
}

interface RetryReportJobResponse {
  success: true;
  data: {
    id: string;
    status: string;
    retryCount: number;
  };
  message: string;
}

/**
 * POST /api/v2/reports/jobs
 * Create a new report generation job
 */
export const createReportJob = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  // Convert string IDs to ObjectIds in request body
  const input = {
    ...req.body,
    requestedBy: userId,
    departmentId: req.body.departmentId
      ? new mongoose.Types.ObjectId(req.body.departmentId)
      : userDepartmentIds[0],
    templateId: req.body.templateId ? new mongoose.Types.ObjectId(req.body.templateId) : undefined,
    parameters: {
      ...req.body.parameters,
      filters: req.body.parameters?.filters
        ? {
            ...req.body.parameters.filters,
            departmentIds: req.body.parameters.filters.departmentIds?.map(
              (id: string) => new mongoose.Types.ObjectId(id)
            ),
            courseIds: req.body.parameters.filters.courseIds?.map(
              (id: string) => new mongoose.Types.ObjectId(id)
            ),
            classIds: req.body.parameters.filters.classIds?.map(
              (id: string) => new mongoose.Types.ObjectId(id)
            ),
            learnerIds: req.body.parameters.filters.learnerIds?.map(
              (id: string) => new mongoose.Types.ObjectId(id)
            ),
            contentIds: req.body.parameters.filters.contentIds?.map(
              (id: string) => new mongoose.Types.ObjectId(id)
            )
          }
        : undefined,
      dateRange: req.body.parameters?.dateRange
        ? {
            startDate: new Date(req.body.parameters.dateRange.startDate),
            endDate: new Date(req.body.parameters.dateRange.endDate)
          }
        : undefined
    },
    scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
    visibility: req.body.visibility || 'private',
    priority: req.body.priority || 'normal'
  };

  const reportJob = await reportJobService.createReportJob(input);

  // Calculate queue position (rough estimate)
  const pendingCount = await reportJobService.listReportJobs(
    { status: ['pending', 'queued'] },
    userId,
    userDepartmentIds,
    1,
    1
  );

  const response: CreateReportJobResponse = {
    success: true,
    data: {
      id: reportJob._id.toString(),
      status: reportJob.status,
      queuePosition: pendingCount.total + 1,
      estimatedWaitTime: undefined // Can be calculated based on average job time
    },
    message: 'Report job created successfully'
  };

  res.status(201).json(response);
});

/**
 * GET /api/v2/reports/jobs
 * List report jobs with filters and pagination
 */
export const listReportJobs = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  const filters = {
    status: req.query.status as string | string[] | undefined,
    reportType: req.query.reportType as string | string[] | undefined,
    requestedBy: req.query.requestedBy
      ? new mongoose.Types.ObjectId(req.query.requestedBy as string)
      : undefined,
    departmentId: req.query.departmentId
      ? new mongoose.Types.ObjectId(req.query.departmentId as string)
      : undefined,
    dateFrom: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
    dateTo: req.query.toDate ? new Date(req.query.toDate as string) : undefined
  };

  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  const result = await reportJobService.listReportJobs(
    filters,
    userId,
    userDepartmentIds,
    page,
    limit
  );

  const jobSummaries: ReportJobSummary[] = result.jobs.map((job) => ({
    id: job._id.toString(),
    name: job.name,
    description: job.description,
    reportType: job.reportType,
    status: job.status,
    priority: job.priority,
    visibility: job.visibility,
    progress: job.progress
      ? {
          percentage: job.progress.percentage || 0,
          currentStep: job.progress.currentStep || '',
          recordsProcessed: job.progress.recordsProcessed,
          totalRecords: job.progress.totalRecords
        }
      : undefined,
    requestedBy: {
      id: (job.requestedBy as any)._id?.toString() || job.requestedBy.toString(),
      name:
        (job.requestedBy as any).person?.firstName || (job.requestedBy as any).person?.lastName
          ? `${(job.requestedBy as any).person?.firstName} ${(job.requestedBy as any).person?.lastName}`.trim()
          : 'Unknown User',
      email: (job.requestedBy as any).email || ''
    },
    departmentId: job.departmentId?.toString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    expiresAt: job.expiresAt?.toISOString(),
    output:
      job.status === 'ready'
        ? {
            format: job.output.format,
            downloadUrl: `/api/v2/reports/jobs/${job._id}/download`
          }
        : undefined
  }));

  const response: ListReportJobsResponse = {
    success: true,
    data: jobSummaries,
    pagination: {
      page: result.page,
      limit,
      total: result.total,
      totalPages: result.totalPages
    }
  };

  res.status(200).json(response);
});

/**
 * GET /api/v2/reports/jobs/:jobId
 * Get detailed information about a specific job
 */
export const getReportJob = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  const job = await reportJobService.getReportJobById(jobId, userId, userDepartmentIds);

  const jobDetail: ReportJobDetail = {
    id: job._id.toString(),
    name: job.name,
    description: job.description,
    reportType: job.reportType,
    status: job.status,
    priority: job.priority,
    visibility: job.visibility,
    parameters: {
      dateRange: job.parameters.dateRange ? {
        startDate: job.parameters.dateRange.startDate instanceof Date
          ? job.parameters.dateRange.startDate.toISOString()
          : job.parameters.dateRange.startDate,
        endDate: job.parameters.dateRange.endDate instanceof Date
          ? job.parameters.dateRange.endDate.toISOString()
          : job.parameters.dateRange.endDate
      } : undefined,
      filters: job.parameters.filters ? {
        departmentIds: job.parameters.filters.departmentIds?.map((id: any) => id.toString()),
        courseIds: job.parameters.filters.courseIds?.map((id: any) => id.toString()),
        classIds: job.parameters.filters.classIds?.map((id: any) => id.toString()),
        learnerIds: job.parameters.filters.learnerIds?.map((id: any) => id.toString()),
        contentIds: job.parameters.filters.contentIds?.map((id: any) => id.toString()),
        eventTypes: job.parameters.filters.eventTypes,
        statuses: job.parameters.filters.statuses
      } : undefined,
      groupBy: job.parameters.groupBy,
      measures: job.parameters.measures,
      includeInactive: job.parameters.includeInactive
    },
    output: {
      format: job.output.format,
      filename: job.output.filename,
      storage: job.output.storage
        ? {
            provider: job.output.storage.provider,
            path: job.output.storage.path,
            bucket: job.output.storage.bucket,
            key: job.output.storage.key,
            url: job.output.storage.url,
            expiresAt: job.output.storage.expiresAt?.toISOString()
          }
        : undefined
    },
    progress: job.progress
      ? {
          percentage: job.progress.percentage || 0,
          currentStep: job.progress.currentStep || '',
          recordsProcessed: job.progress.recordsProcessed,
          totalRecords: job.progress.totalRecords
        }
      : undefined,
    requestedBy: {
      id: (job.requestedBy as any)._id?.toString() || job.requestedBy.toString(),
      name:
        (job.requestedBy as any).person?.firstName || (job.requestedBy as any).person?.lastName
          ? `${(job.requestedBy as any).person?.firstName} ${(job.requestedBy as any).person?.lastName}`.trim()
          : 'Unknown User',
      email: (job.requestedBy as any).email || ''
    },
    departmentId: job.departmentId?.toString(),
    error: job.error
      ? {
          code: job.error.code,
          message: job.error.message || '',
          stack: job.error.stack,
          retryCount: job.error.retryCount,
          lastRetryAt: job.error.lastRetryAt?.toISOString()
        }
      : undefined,
    scheduledFor: job.scheduledFor?.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    completedAt: job.completedAt?.toISOString(),
    expiresAt: job.expiresAt?.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    templateId: job.templateId?.toString(),
    scheduleId: job.scheduleId?.toString()
  };

  const response: GetReportJobResponse = {
    success: true,
    data: jobDetail
  };

  res.status(200).json(response);
});

/**
 * POST /api/v2/reports/jobs/:jobId/cancel
 * Cancel a pending or running job
 */
export const cancelReportJob = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  const job = await reportJobService.cancelReportJob(jobId, userId, userDepartmentIds);

  const response: CancelReportJobResponse = {
    success: true,
    data: {
      id: job._id.toString(),
      status: job.status,
      cancelledAt: job.updatedAt.toISOString()
    },
    message: 'Report job cancelled successfully'
  };

  res.status(200).json(response);
});

/**
 * GET /api/v2/reports/jobs/:jobId/download
 * Download the generated report file
 */
export const downloadReport = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  const job = await reportJobService.getReportJobById(jobId, userId, userDepartmentIds);

  if (job.status !== 'ready') {
    throw new ApiError(400, 'Report is not ready for download');
  }

  if (!job.output.storage || !job.output.storage.url) {
    throw new ApiError(404, 'Report file not found');
  }

  // For now, redirect to the file URL
  // In production, you might want to stream from S3 or serve from local storage
  res.redirect(job.output.storage.url);
});

/**
 * POST /api/v2/reports/jobs/:jobId/retry
 * Retry a failed job
 */
export const retryReportJob = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const userDepartmentIds = (req.user!.departmentMemberships?.map(m => m.departmentId) || []).map(
    (id: string) => new mongoose.Types.ObjectId(id)
  );

  const job = await reportJobService.getReportJobById(jobId, userId, userDepartmentIds);

  if (job.status !== 'failed') {
    throw new ApiError(400, 'Only failed jobs can be retried');
  }

  const maxRetries = 3;
  if (job.error && job.error.retryCount && job.error.retryCount >= maxRetries) {
    throw new ApiError(400, `Maximum retry count (${maxRetries}) exceeded`);
  }

  // Reset job to pending status
  const updatedJob = await reportJobService.updateReportJob(
    jobId,
    {
      status: 'pending',
      error: undefined,
      progress: undefined
    },
    userId,
    userDepartmentIds
  );

  const response: RetryReportJobResponse = {
    success: true,
    data: {
      id: updatedJob._id.toString(),
      status: updatedJob.status,
      retryCount: (job.error?.retryCount || 0) + 1
    },
    message: 'Report job queued for retry'
  };

  res.status(200).json(response);
});
