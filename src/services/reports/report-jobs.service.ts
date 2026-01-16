/**
 * ReportJob Service
 *
 * Handles business logic for report job management:
 * - CRUD operations for report jobs
 * - Status transition management
 * - Queue processing helpers
 * - Authorization checks
 *
 * @module services/reports/report-jobs
 */

import mongoose from 'mongoose';
import { ReportJob, IReportJob } from '@/models/reports/ReportJob.model';
import { ApiError } from '@/utils/ApiError';

export interface CreateReportJobInput {
  reportType: string;
  name: string;
  description?: string;
  parameters: IReportJob['parameters'];
  output: IReportJob['output'];
  priority?: string;
  visibility?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  requestedBy: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  scheduleId?: mongoose.Types.ObjectId;
}

export interface UpdateReportJobInput {
  name?: string;
  description?: string;
  status?: string;
  progress?: IReportJob['progress'];
  error?: IReportJob['error'];
  output?: Partial<IReportJob['output']>;
}

export interface ReportJobFilters {
  status?: string | string[];
  reportType?: string | string[];
  priority?: string | string[];
  visibility?: string | string[];
  requestedBy?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  scheduleId?: mongoose.Types.ObjectId;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * ReportJobService
 *
 * Service layer for managing report jobs in the queue.
 */
export class ReportJobService {
  /**
   * Create a new report job
   *
   * @param input - Report job creation data
   * @returns Created report job document
   */
  async createReportJob(input: CreateReportJobInput): Promise<IReportJob> {
    // Set default expiration (7 days from now) if not provided
    if (!input.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      input.expiresAt = expiresAt;
    }

    const reportJob = await ReportJob.create({
      ...input,
      status: 'pending'
    });

    return reportJob;
  }

  /**
   * Get report job by ID
   *
   * @param id - Report job ID
   * @param userId - User ID for authorization check
   * @param userDepartmentIds - User's accessible department IDs
   * @returns Report job document
   * @throws ApiError if not found or access denied
   */
  async getReportJobById(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<IReportJob> {
    const reportJob = await ReportJob.findById(id)
      .populate('requestedBy', 'person.firstName person.lastName email')
      .populate('departmentId', 'name code')
      .populate('templateId', 'name')
      .exec();

    if (!reportJob) {
      throw new ApiError(404, 'Report job not found');
    }

    // Authorization check
    if (!this.canAccessReportJob(reportJob, userId, userDepartmentIds)) {
      throw new ApiError(403, 'Access denied to this report job');
    }

    return reportJob;
  }

  /**
   * List report jobs with filters and pagination
   *
   * @param filters - Query filters
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @param page - Page number (1-indexed)
   * @param limit - Results per page
   * @returns Paginated list of report jobs
   */
  async listReportJobs(
    filters: ReportJobFilters,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    page: number = 1,
    limit: number = 20
  ): Promise<{ jobs: IReportJob[]; total: number; page: number; totalPages: number }> {
    const query: any = {};

    // Build query from filters
    if (filters.status) {
      query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    }

    if (filters.reportType) {
      query.reportType = Array.isArray(filters.reportType)
        ? { $in: filters.reportType }
        : filters.reportType;
    }

    if (filters.priority) {
      query.priority = Array.isArray(filters.priority)
        ? { $in: filters.priority }
        : filters.priority;
    }

    if (filters.visibility) {
      query.visibility = Array.isArray(filters.visibility)
        ? { $in: filters.visibility }
        : filters.visibility;
    }

    if (filters.requestedBy) {
      query.requestedBy = filters.requestedBy;
    }

    if (filters.departmentId) {
      query.departmentId = filters.departmentId;
    }

    if (filters.templateId) {
      query.templateId = filters.templateId;
    }

    if (filters.scheduleId) {
      query.scheduleId = filters.scheduleId;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    // Authorization filter: user can see their own jobs + visible jobs in their departments
    query.$or = [
      { requestedBy: userId },
      { visibility: 'organization' },
      { visibility: 'department', departmentId: { $in: userDepartmentIds } },
      { visibility: 'team', requestedBy: userId } // Simplified - should check team membership
    ];

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ReportJob.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('requestedBy', 'person.firstName person.lastName email')
        .populate('departmentId', 'name code')
        .populate('templateId', 'name')
        .exec(),
      ReportJob.countDocuments(query)
    ]);

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update report job
   *
   * @param id - Report job ID
   * @param input - Update data
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @returns Updated report job
   */
  async updateReportJob(
    id: string,
    input: UpdateReportJobInput,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<IReportJob> {
    const reportJob = await this.getReportJobById(id, userId, userDepartmentIds);

    // Update fields
    if (input.name) reportJob.name = input.name;
    if (input.description !== undefined) reportJob.description = input.description;
    if (input.status) reportJob.status = input.status;
    if (input.progress) reportJob.progress = { ...reportJob.progress, ...input.progress };
    if (input.error) reportJob.error = { ...reportJob.error, ...input.error };
    if (input.output) {
      reportJob.output = {
        ...reportJob.output,
        ...input.output
      };
    }

    await reportJob.save();
    return reportJob;
  }

  /**
   * Delete report job
   *
   * @param id - Report job ID
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   */
  async deleteReportJob(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<void> {
    const reportJob = await this.getReportJobById(id, userId, userDepartmentIds);

    // Only allow deletion of own jobs or jobs in pending/failed state
    if (
      !reportJob.requestedBy.equals(userId) &&
      !['pending', 'failed', 'cancelled'].includes(reportJob.status)
    ) {
      throw new ApiError(403, 'Cannot delete report job in current status');
    }

    await ReportJob.deleteOne({ _id: id });
  }

  /**
   * Cancel report job
   *
   * @param id - Report job ID
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @returns Updated report job
   */
  async cancelReportJob(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<IReportJob> {
    const reportJob = await this.getReportJobById(id, userId, userDepartmentIds);

    // Only allow cancellation of pending/queued/processing jobs
    if (!['pending', 'queued', 'processing'].includes(reportJob.status)) {
      throw new ApiError(400, `Cannot cancel job with status: ${reportJob.status}`);
    }

    reportJob.status = 'cancelled';
    await reportJob.save();

    return reportJob;
  }

  /**
   * Get next queued job for processing
   *
   * Worker method to claim the next job from the queue.
   *
   * @returns Next report job to process, or null if queue is empty
   */
  async getNextQueuedJob(): Promise<IReportJob | null> {
    // Find highest priority pending/queued job scheduled for now or past
    const job = await ReportJob.findOneAndUpdate(
      {
        status: { $in: ['pending', 'queued'] },
        $or: [{ scheduledFor: { $lte: new Date() } }, { scheduledFor: { $exists: false } }]
      },
      {
        $set: {
          status: 'processing',
          startedAt: new Date()
        }
      },
      {
        sort: { priority: -1, createdAt: 1 }, // High priority first, then FIFO
        new: true
      }
    );

    return job;
  }

  /**
   * Mark job as completed
   *
   * @param id - Report job ID
   * @param storage - Storage information for generated file
   */
  async markJobCompleted(id: string, storage: IReportJob['output']['storage']): Promise<void> {
    await ReportJob.findByIdAndUpdate(id, {
      $set: {
        status: 'ready',
        completedAt: new Date(),
        'output.storage': storage,
        'progress.percentage': 100
      }
    });
  }

  /**
   * Mark job as failed
   *
   * @param id - Report job ID
   * @param error - Error information
   */
  async markJobFailed(
    id: string,
    error: { code?: string; message: string; stack?: string }
  ): Promise<void> {
    const job = await ReportJob.findById(id);
    if (!job) return;

    const retryCount = (job.error?.retryCount || 0) + 1;

    await ReportJob.findByIdAndUpdate(id, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        error: {
          ...error,
          retryCount,
          lastRetryAt: new Date()
        }
      }
    });
  }

  /**
   * Update job progress
   *
   * @param id - Report job ID
   * @param progress - Progress information
   */
  async updateJobProgress(id: string, progress: IReportJob['progress']): Promise<void> {
    await ReportJob.findByIdAndUpdate(id, {
      $set: { progress }
    });
  }

  /**
   * Check if user can access report job
   *
   * @param job - Report job document
   * @param userId - User ID
   * @param userDepartmentIds - User's accessible department IDs
   * @returns True if user can access job
   */
  private canAccessReportJob(
    job: IReportJob,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): boolean {
    // User is owner
    if (job.requestedBy.equals(userId)) {
      return true;
    }

    // Job is organization-wide visible
    if (job.visibility === 'organization') {
      return true;
    }

    // Job is department-visible and user is in that department
    if (
      job.visibility === 'department' &&
      job.departmentId &&
      userDepartmentIds.some((deptId) => deptId.equals(job.departmentId!))
    ) {
      return true;
    }

    // TODO: Check team visibility when team membership is implemented

    return false;
  }
}

export default new ReportJobService();
