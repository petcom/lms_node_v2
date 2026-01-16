/**
 * ReportTemplate Service
 *
 * Handles business logic for report template management:
 * - CRUD operations for report templates
 * - Template cloning and sharing
 * - Usage tracking
 * - Authorization and visibility checks
 * - Template search and filtering
 *
 * @module services/reports/report-templates
 */

import mongoose from 'mongoose';
import { ReportTemplate, IReportTemplate } from '@/models/reports/ReportTemplate.model';
import { ApiError } from '@/utils/ApiError';

export interface CreateReportTemplateInput {
  name: string;
  description?: string;
  reportType: string;
  parameters: IReportTemplate['parameters'];
  defaultOutput: IReportTemplate['defaultOutput'];
  visibility?: string;
  createdBy: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  sharedWith?: IReportTemplate['sharedWith'];
}

export interface UpdateReportTemplateInput {
  name?: string;
  description?: string;
  parameters?: IReportTemplate['parameters'];
  defaultOutput?: Partial<IReportTemplate['defaultOutput']>;
  visibility?: string;
  sharedWith?: IReportTemplate['sharedWith'];
  isActive?: boolean;
}

export interface ReportTemplateFilters {
  reportType?: string | string[];
  visibility?: string | string[];
  createdBy?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  isActive?: boolean;
  search?: string; // Text search on name/description
}

/**
 * ReportTemplateService
 *
 * Service layer for managing report templates.
 */
export class ReportTemplateService {
  /**
   * Create a new report template
   *
   * @param input - Template creation data
   * @returns Created template document
   */
  async createReportTemplate(input: CreateReportTemplateInput): Promise<IReportTemplate> {
    const template = await ReportTemplate.create(input);
    return template;
  }

  /**
   * Get report template by ID
   *
   * @param id - Template ID
   * @param userId - User ID for authorization check
   * @param userDepartmentIds - User's accessible department IDs
   * @param userRoles - User's role codes
   * @returns Report template document
   * @throws ApiError if not found or access denied
   */
  async getReportTemplateById(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    userRoles: string[] = []
  ): Promise<IReportTemplate> {
    const template = await ReportTemplate.findById(id)
      .populate('createdBy', 'person.firstName person.lastName email')
      .populate('departmentId', 'name code')
      .populate('lastUsedBy', 'person.firstName person.lastName email')
      .exec();

    if (!template) {
      throw new ApiError(404, 'Report template not found');
    }

    // Authorization check
    if (!this.canAccessTemplate(template, userId, userDepartmentIds, userRoles)) {
      throw new ApiError(403, 'Access denied to this report template');
    }

    return template;
  }

  /**
   * List report templates with filters and pagination
   *
   * @param filters - Query filters
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @param userRoles - User's role codes
   * @param page - Page number (1-indexed)
   * @param limit - Results per page
   * @returns Paginated list of templates
   */
  async listReportTemplates(
    filters: ReportTemplateFilters,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    userRoles: string[] = [],
    page: number = 1,
    limit: number = 20
  ): Promise<{
    templates: IReportTemplate[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    // Build query from filters
    if (filters.reportType) {
      query.reportType = Array.isArray(filters.reportType)
        ? { $in: filters.reportType }
        : filters.reportType;
    }

    if (filters.visibility) {
      query.visibility = Array.isArray(filters.visibility)
        ? { $in: filters.visibility }
        : filters.visibility;
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

    // Text search on name/description
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Authorization filter: user can see their own templates + shared templates
    const authFilter: any[] = [
      { createdBy: userId }, // Own templates
      { visibility: 'organization' }, // Organization-wide
      { visibility: 'department', departmentId: { $in: userDepartmentIds } }, // Department visible
      { 'sharedWith.users': userId }, // Explicitly shared with user
      { 'sharedWith.departments': { $in: userDepartmentIds } } // Shared with user's departments
    ];

    // Add role-based sharing
    if (userRoles.length > 0) {
      authFilter.push({ 'sharedWith.roles': { $in: userRoles } });
    }

    query.$or = authFilter;

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      ReportTemplate.find(query)
        .sort({ usageCount: -1, updatedAt: -1 }) // Most used first, then most recent
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'person.firstName person.lastName email')
        .populate('departmentId', 'name code')
        .populate('lastUsedBy', 'person.firstName person.lastName email')
        .exec(),
      ReportTemplate.countDocuments(query)
    ]);

    return {
      templates,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update report template
   *
   * @param id - Template ID
   * @param input - Update data
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @param userRoles - User's role codes
   * @returns Updated template
   */
  async updateReportTemplate(
    id: string,
    input: UpdateReportTemplateInput,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    userRoles: string[] = []
  ): Promise<IReportTemplate> {
    const template = await this.getReportTemplateById(id, userId, userDepartmentIds, userRoles);

    // Only creator can modify template
    if (!template.createdBy.equals(userId)) {
      throw new ApiError(403, 'Only template creator can modify template');
    }

    // Update fields
    if (input.name) template.name = input.name;
    if (input.description !== undefined) template.description = input.description;
    if (input.parameters) template.parameters = { ...template.parameters, ...input.parameters };
    if (input.defaultOutput) {
      template.defaultOutput = {
        ...template.defaultOutput,
        ...input.defaultOutput
      };
    }
    if (input.visibility) template.visibility = input.visibility;
    if (input.sharedWith !== undefined) template.sharedWith = input.sharedWith;
    if (input.isActive !== undefined) template.isActive = input.isActive;

    await template.save();
    return template;
  }

  /**
   * Delete report template
   *
   * @param id - Template ID
   * @param userId - User ID for authorization
   * @param userDepartmentIds - User's accessible department IDs
   * @param userRoles - User's role codes
   */
  async deleteReportTemplate(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    userRoles: string[] = []
  ): Promise<void> {
    const template = await this.getReportTemplateById(id, userId, userDepartmentIds, userRoles);

    // Only creator can delete template
    if (!template.createdBy.equals(userId)) {
      throw new ApiError(403, 'Only template creator can delete template');
    }

    await ReportTemplate.deleteOne({ _id: id });
  }

  /**
   * Clone report template (create copy)
   *
   * @param id - Template ID to clone
   * @param userId - User ID for new template
   * @param userDepartmentIds - User's accessible department IDs
   * @param userRoles - User's role codes
   * @param newName - Optional new name for cloned template
   * @returns Cloned template
   */
  async cloneReportTemplate(
    id: string,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    userRoles: string[] = [],
    newName?: string
  ): Promise<IReportTemplate> {
    const sourceTemplate = await this.getReportTemplateById(
      id,
      userId,
      userDepartmentIds,
      userRoles
    );

    const clonedTemplate = await ReportTemplate.create({
      name: newName || `${sourceTemplate.name} (Copy)`,
      description: sourceTemplate.description,
      reportType: sourceTemplate.reportType,
      parameters: sourceTemplate.parameters,
      defaultOutput: sourceTemplate.defaultOutput,
      visibility: 'private', // New template is private by default
      createdBy: userId,
      departmentId: userDepartmentIds[0] || sourceTemplate.departmentId,
      isActive: true
    });

    return clonedTemplate;
  }

  /**
   * Record template usage
   *
   * Updates usage statistics when template is used to generate a report.
   *
   * @param id - Template ID
   * @param userId - User who used the template
   */
  async recordTemplateUsage(id: string, userId: mongoose.Types.ObjectId): Promise<void> {
    await ReportTemplate.findByIdAndUpdate(id, {
      $inc: { usageCount: 1 },
      $set: {
        lastUsedAt: new Date(),
        lastUsedBy: userId
      }
    });
  }

  /**
   * Get most used templates for a user
   *
   * @param userId - User ID
   * @param userDepartmentIds - User's accessible department IDs
   * @param userRoles - User's role codes
   * @param limit - Number of templates to return
   * @returns Most used templates
   */
  async getMostUsedTemplates(
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    userRoles: string[] = [],
    limit: number = 10
  ): Promise<IReportTemplate[]> {
    const authFilter: any[] = [
      { createdBy: userId },
      { visibility: 'organization' },
      { visibility: 'department', departmentId: { $in: userDepartmentIds } },
      { 'sharedWith.users': userId },
      { 'sharedWith.departments': { $in: userDepartmentIds } }
    ];

    if (userRoles.length > 0) {
      authFilter.push({ 'sharedWith.roles': { $in: userRoles } });
    }

    const templates = await ReportTemplate.find({
      $or: authFilter,
      isActive: true
    })
      .sort({ usageCount: -1 })
      .limit(limit)
      .populate('createdBy', 'person.firstName person.lastName email')
      .populate('departmentId', 'name code')
      .exec();

    return templates;
  }

  /**
   * Get recently used templates for a user
   *
   * @param userId - User ID
   * @param limit - Number of templates to return
   * @returns Recently used templates
   */
  async getRecentlyUsedTemplates(
    userId: mongoose.Types.ObjectId,
    limit: number = 10
  ): Promise<IReportTemplate[]> {
    const templates = await ReportTemplate.find({
      lastUsedBy: userId,
      isActive: true
    })
      .sort({ lastUsedAt: -1 })
      .limit(limit)
      .populate('createdBy', 'person.firstName person.lastName email')
      .populate('departmentId', 'name code')
      .exec();

    return templates;
  }

  /**
   * Check if user can access template
   *
   * @param template - Template document
   * @param userId - User ID
   * @param userDepartmentIds - User's accessible department IDs
   * @param userRoles - User's role codes
   * @returns True if user can access template
   */
  private canAccessTemplate(
    template: IReportTemplate,
    userId: mongoose.Types.ObjectId,
    userDepartmentIds: mongoose.Types.ObjectId[],
    userRoles: string[] = []
  ): boolean {
    // User is creator
    if (template.createdBy.equals(userId)) {
      return true;
    }

    // Template is organization-wide visible
    if (template.visibility === 'organization') {
      return true;
    }

    // Template is department-visible and user is in that department
    if (
      template.visibility === 'department' &&
      template.departmentId &&
      userDepartmentIds.some((deptId) => deptId.equals(template.departmentId!))
    ) {
      return true;
    }

    // Template is explicitly shared with user
    if (template.sharedWith?.users?.some((sharedUserId) => sharedUserId.equals(userId))) {
      return true;
    }

    // Template is shared with user's department
    if (
      template.sharedWith?.departments?.some((sharedDeptId) =>
        userDepartmentIds.some((deptId) => deptId.equals(sharedDeptId))
      )
    ) {
      return true;
    }

    // Template is shared with user's role
    if (
      userRoles.length > 0 &&
      template.sharedWith?.roles?.some((sharedRole) => userRoles.includes(sharedRole))
    ) {
      return true;
    }

    return false;
  }
}

export default new ReportTemplateService();
