/**
 * ReportSchedule Service
 *
 * Handles business logic for report schedule management:
 * - CRUD operations for report schedules
 * - Pause/resume functionality
 * - Schedule execution and job creation
 * - Next run time calculation
 * - Authorization checks
 *
 * @module services/reports/report-schedules
 */

import mongoose from 'mongoose';
import { ReportSchedule, IReportSchedule } from '@/models/reports/ReportSchedule.model';
import { ReportTemplate } from '@/models/reports/ReportTemplate.model';
import { ReportJob } from '@/models/reports/ReportJob.model';
import { ApiError } from '@/utils/ApiError';

export interface CreateReportScheduleInput {
  name: string;
  description?: string;
  templateId: mongoose.Types.ObjectId;
  schedule: IReportSchedule['schedule'];
  dateRangeType?: string;
  customDateRange?: IReportSchedule['customDateRange'];
  output: IReportSchedule['output'];
  delivery: IReportSchedule['delivery'];
  createdBy: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
}

export interface UpdateReportScheduleInput {
  name?: string;
  description?: string;
  schedule?: Partial<IReportSchedule['schedule']>;
  dateRangeType?: string;
  customDateRange?: IReportSchedule['customDateRange'];
  output?: Partial<IReportSchedule['output']>;
  delivery?: Partial<IReportSchedule['delivery']>;
  isActive?: boolean;
}

export interface ReportScheduleFilters {
  templateId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  isActive?: boolean;
  isPaused?: boolean;
  frequency?: string | string[];
}

/**
 * ReportScheduleService
 *
 * Service layer for managing report schedules.
 */
export class ReportScheduleService {
  /**
   * Create a new report schedule
   *
   * @param input - Schedule creation data
   * @returns Created schedule document
   */
  async createReportSchedule(input: CreateReportScheduleInput): Promise<IReportSchedule> {
    // Verify template exists and user has access
    const template = await ReportTemplate.findById(input.templateId);
    if (!template) {
      throw new ApiError(404, 'Report template not found');
    }

    const schedule = await ReportSchedule.create(input);
    return schedule;
  }

  /**
   * Get report schedule by ID
   *
   * @param id - Schedule ID
   * @param userId - User ID for authorization check
   * @param userDepartmentIds - User's accessible department IDs
   * @returns Report schedule document
   * @throws ApiError if not found or access denied
   */
  async getReportScheduleById(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<IReportSchedule> {
    const schedule = await ReportSchedule.findById(id)
      .populate('templateId', 'name reportType')
      .populate('createdBy', 'person.firstName person.lastName email')
      .populate('departmentId', 'name code')
      .populate('pausedBy', 'person.firstName person.lastName email')
      .populate('lastRunJobId', 'status completedAt')
      .exec();

    if (!schedule) {
      throw new ApiError(404, 'Report schedule not found');
    }

    // Authorization check
    if (!this.canAccessSchedule(schedule, userId, userDepartmentIds)) {
      throw new ApiError(403, 'Access denied to this report schedule');
    }

    return schedule;
  }

  /**
   * List report schedules with filters and pagination
   *
   * @param filters - Query filters
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @param page - Page number (1-indexed)
   * @param limit - Results per page
   * @returns Paginated list of schedules
   */
  async listReportSchedules(
    filters: ReportScheduleFilters,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    page: number = 1,
    limit: number = 20
  ): Promise<{
    schedules: IReportSchedule[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    // Build query from filters
    if (filters.templateId) {
      query.templateId = filters.templateId;
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters.departmentId) {
      query.departmentId = filters.departmentId;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.isPaused !== undefined) {
      query.isPaused = filters.isPaused;
    }

    if (filters.frequency) {
      query['schedule.frequency'] = Array.isArray(filters.frequency)
        ? { $in: filters.frequency }
        : filters.frequency;
    }

    // Authorization filter: user can see their own schedules + schedules in their departments
    query.$or = [
      { createdBy: userId },
      { departmentId: { $in: userDepartmentIds } }
    ];

    const skip = (page - 1) * limit;

    const [schedules, total] = await Promise.all([
      ReportSchedule.find(query)
        .sort({ nextRunAt: 1, createdAt: -1 }) // Next to run first
        .skip(skip)
        .limit(limit)
        .populate('templateId', 'name reportType')
        .populate('createdBy', 'person.firstName person.lastName email')
        .populate('departmentId', 'name code')
        .populate('lastRunJobId', 'status completedAt')
        .exec(),
      ReportSchedule.countDocuments(query)
    ]);

    return {
      schedules,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update report schedule
   *
   * @param id - Schedule ID
   * @param input - Update data
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @returns Updated schedule
   */
  async updateReportSchedule(
    id: string,
    input: UpdateReportScheduleInput,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<IReportSchedule> {
    const schedule = await this.getReportScheduleById(id, userId, userDepartmentIds);

    // Only creator can modify schedule
    if (!schedule.createdBy.equals(userId)) {
      throw new ApiError(403, 'Only schedule creator can modify schedule');
    }

    // Update fields
    if (input.name) schedule.name = input.name;
    if (input.description !== undefined) schedule.description = input.description;
    if (input.schedule) {
      schedule.schedule = { ...schedule.schedule, ...input.schedule };
    }
    if (input.dateRangeType) schedule.dateRangeType = input.dateRangeType;
    if (input.customDateRange !== undefined) schedule.customDateRange = input.customDateRange;
    if (input.output) {
      schedule.output = {
        ...schedule.output,
        ...input.output
      };
    }
    if (input.delivery) {
      schedule.delivery = {
        ...schedule.delivery,
        ...input.delivery
      };
    }
    if (input.isActive !== undefined) schedule.isActive = input.isActive;

    await schedule.save();
    return schedule;
  }

  /**
   * Delete report schedule
   *
   * @param id - Schedule ID
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   */
  async deleteReportSchedule(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<void> {
    const schedule = await this.getReportScheduleById(id, userId, userDepartmentIds);

    // Only creator can delete schedule
    if (!schedule.createdBy.equals(userId)) {
      throw new ApiError(403, 'Only schedule creator can delete schedule');
    }

    await ReportSchedule.deleteOne({ _id: id });
  }

  /**
   * Pause report schedule
   *
   * @param id - Schedule ID
   * @param userId - User ID performing the pause
   * @param userDepartmentIds - User's accessible department IDs
   * @param reason - Optional reason for pausing
   * @returns Updated schedule
   */
  async pauseReportSchedule(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    reason?: string
  ): Promise<IReportSchedule> {
    const schedule = await this.getReportScheduleById(id, userId, userDepartmentIds);

    // Only creator can pause schedule
    if (!schedule.createdBy.equals(userId)) {
      throw new ApiError(403, 'Only schedule creator can pause schedule');
    }

    if (schedule.isPaused) {
      throw new ApiError(400, 'Schedule is already paused');
    }

    schedule.isPaused = true;
    schedule.pausedAt = new Date();
    schedule.pausedBy = userId;
    schedule.pausedReason = reason;
    schedule.nextRunAt = undefined; // Clear next run time

    await schedule.save();
    return schedule;
  }

  /**
   * Resume report schedule
   *
   * @param id - Schedule ID
   * @param userId - User ID performing the resume
   * @param userDepartmentIds - User's accessible department IDs
   * @returns Updated schedule
   */
  async resumeReportSchedule(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): Promise<IReportSchedule> {
    const schedule = await this.getReportScheduleById(id, userId, userDepartmentIds);

    // Only creator can resume schedule
    if (!schedule.createdBy.equals(userId)) {
      throw new ApiError(403, 'Only schedule creator can resume schedule');
    }

    if (!schedule.isPaused) {
      throw new ApiError(400, 'Schedule is not paused');
    }

    schedule.isPaused = false;
    schedule.pausedAt = undefined;
    schedule.pausedBy = undefined;
    schedule.pausedReason = undefined;

    await schedule.save(); // Pre-save hook will recalculate nextRunAt
    return schedule;
  }

  /**
   * Get schedules due for execution
   *
   * Worker method to find schedules that should run now.
   *
   * @param limit - Maximum number of schedules to return
   * @returns Schedules due for execution
   */
  async getSchedulesDueForExecution(limit: number = 10): Promise<IReportSchedule[]> {
    const schedules = await ReportSchedule.find({
      isActive: true,
      isPaused: false,
      nextRunAt: { $lte: new Date() }
    })
      .sort({ nextRunAt: 1 })
      .limit(limit)
      .populate('templateId')
      .exec();

    return schedules;
  }

  /**
   * Execute schedule by creating a report job
   *
   * @param scheduleId - Schedule ID to execute
   * @returns Created report job
   */
  async executeSchedule(scheduleId: string): Promise<any> {
    const schedule = await ReportSchedule.findById(scheduleId).populate('templateId').exec();

    if (!schedule) {
      throw new ApiError(404, 'Report schedule not found');
    }

    if (!schedule.isActive || schedule.isPaused) {
      throw new ApiError(400, 'Schedule is not active or is paused');
    }

    const template: any = schedule.templateId;
    if (!template) {
      throw new ApiError(404, 'Report template not found');
    }

    // Calculate date range based on dateRangeType
    let dateRange = template.parameters.dateRange;
    if (schedule.dateRangeType === 'custom' && schedule.customDateRange) {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + schedule.customDateRange.startDaysOffset);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + schedule.customDateRange.endDaysOffset);
      dateRange = { startDate, endDate };
    } else if (schedule.dateRangeType === 'previous-period') {
      // Calculate based on frequency
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now);

      switch (schedule.schedule.frequency) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarterly':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
      }

      dateRange = { startDate, endDate };
    }

    // Create report job from template and schedule
    const reportJob = await ReportJob.create({
      reportType: template.reportType,
      name: schedule.name,
      description: schedule.description,
      parameters: {
        ...template.parameters,
        dateRange
      },
      output: {
        format: schedule.output.format,
        filename: schedule.output.filenameTemplate
          ? schedule.output.filenameTemplate.replace('{date}', new Date().toISOString().split('T')[0])
          : undefined
      },
      priority: 'normal',
      visibility: 'private',
      requestedBy: schedule.createdBy,
      departmentId: schedule.departmentId,
      templateId: template._id,
      scheduleId: schedule._id
    });

    // Update schedule execution tracking
    schedule.lastRunAt = new Date();
    schedule.lastRunJobId = reportJob._id;
    schedule.runCount += 1;
    schedule.nextRunAt = schedule.calculateNextRunTime();

    await schedule.save();

    return reportJob;
  }

  /**
   * Record schedule execution result
   *
   * @param scheduleId - Schedule ID
   * @param status - Execution status (success/failed)
   */
  async recordScheduleExecution(scheduleId: string, status: 'success' | 'failed'): Promise<void> {
    const schedule = await ReportSchedule.findById(scheduleId);
    if (!schedule) return;

    schedule.lastRunStatus = status;

    if (status === 'failed') {
      schedule.failureCount += 1;
      schedule.consecutiveFailures += 1;

      // Auto-pause after 5 consecutive failures
      if (schedule.consecutiveFailures >= 5) {
        schedule.isPaused = true;
        schedule.pausedAt = new Date();
        schedule.pausedReason = 'Auto-paused due to 5 consecutive failures';
      }
    } else {
      schedule.consecutiveFailures = 0;
    }

    await schedule.save();
  }

  /**
   * Check if user can access schedule
   *
   * @param schedule - Schedule document
   * @param userId - User ID
   * @param userDepartmentIds - User's accessible department IDs
   * @returns True if user can access schedule
   */
  private canAccessSchedule(
    schedule: IReportSchedule,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[]
  ): boolean {
    // User is creator
    if (schedule.createdBy.equals(userId)) {
      return true;
    }

    // Schedule is in user's department
    if (
      schedule.departmentId &&
      userDepartmentIds.some((deptId) => deptId.equals(schedule.departmentId!))
    ) {
      return true;
    }

    return false;
  }
}

export default new ReportScheduleService();
