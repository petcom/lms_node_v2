/**
 * Audit Logs Service
 *
 * AUTHORIZATION IMPLEMENTATION NOTES (Phase 2 - Agent 5):
 *
 * Business Rules:
 * - ALL audit log access requires escalation (admin token) - enforced by route middleware
 * - System-admin: Full access to all audit logs across all departments
 * - Content-admin: Access to content-related audit logs (entityType: content, courses, modules)
 * - Enrollment-admin: Access to enrollment-related audit logs (entityType: enrollment, classes)
 * - Financial-admin: Access to billing-related audit logs (entityType: billing, payments)
 * - Instructors: NO ACCESS (even for their own content)
 *
 * Implementation Required:
 * 1. All methods receive user with escalation already verified (route middleware)
 * 2. Department-scoping: Non-system-admins filter to their department logs
 * 3. Domain-scoping: Domain-specific admins filter to their domain entity types
 * 4. listAuditLogs(): Apply department/domain filters based on user role
 * 5. getEntityHistory(): Validate user has permission for that entity type
 * 6. getUserActivity(): System-admin only for other users, users can see own
 * 7. exportAuditLogs(): Apply same filtering as listAuditLogs()
 *
 * Escalation Enforcement:
 * - Already enforced at route level via requireEscalation middleware
 * - Service layer does NOT need additional escalation checks
 * - Focus on department and domain scoping based on admin role
 */

import { AuditLog } from '@/models/system/AuditLog.model';
import { User } from '@/models/auth/User.model';
import { Staff } from '@/models/auth/Staff.model';
import { Learner } from '@/models/auth/Learner.model';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

interface ListFilters {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  statusCode?: number;
  success?: boolean;
  search?: string;
  sort?: string;
}

interface UserActivityFilters {
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  includeSystem?: boolean;
  sort?: string;
}

interface EntityHistoryFilters {
  page: number;
  limit: number;
  action?: string;
  userId?: string;
  includeRelated?: boolean;
  sort?: string;
}

interface ExportParams {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  departmentId?: string;
  startDate: Date;
  endDate: Date;
  includeDetails?: boolean;
  includeChanges?: boolean;
  maxRecords?: number;
}

export class AuditLogsService {
  /**
   * List audit logs with advanced filtering
   */
  static async listAuditLogs(filters: ListFilters, requestingUserId: string): Promise<any> {
    // Build query
    const query: any = {};

    if (filters.userId) {
      query.userId = new mongoose.Types.ObjectId(filters.userId);
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.entityId) {
      query.entityId = new mongoose.Types.ObjectId(filters.entityId);
    }

    if (filters.departmentId) {
      query.departmentId = new mongoose.Types.ObjectId(filters.departmentId);
    }

    if (filters.ipAddress) {
      query.ipAddress = filters.ipAddress;
    }

    if (filters.statusCode) {
      query.statusCode = filters.statusCode;
    }

    if (filters.success !== undefined) {
      query.success = filters.success;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    if (filters.search) {
      query.$or = [
        { description: { $regex: filters.search, $options: 'i' } },
        { 'metadata': { $regex: filters.search, $options: 'i' } },
        { errorMessage: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Apply department scoping for non-admin users
    await this.applyDepartmentScope(query, requestingUserId);

    // Sorting
    const sortField = filters.sort || '-timestamp';
    const sortObj: any = {};
    if (sortField.startsWith('-')) {
      sortObj[sortField.substring(1)] = -1;
    } else {
      sortObj[sortField] = 1;
    }

    // Pagination
    const page = Math.max(1, filters.page);
    const limit = Math.min(500, Math.max(1, filters.limit));
    const skip = (page - 1) * limit;

    // Execute query
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Calculate summary analytics
    const summary = await this.calculateSummary(query);

    // Format logs
    const formattedLogs = logs.map(log => this.formatAuditLog(log));

    return {
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      summary
    };
  }

  /**
   * Get specific audit log entry by ID
   */
  static async getAuditLogById(logId: string, requestingUserId: string): Promise<any> {
    const log = await AuditLog.findById(logId).lean();

    if (!log) {
      throw ApiError.notFound('Audit log entry not found');
    }

    // Check department scope
    await this.checkDepartmentAccess(log, requestingUserId);

    // Get related logs (same entity or same user in time window)
    const relatedLogs = await this.getRelatedLogs(log);

    // Calculate diff for changes
    const diff = this.calculateDiff(log.changes.before, log.changes.after);

    return {
      ...this.formatAuditLog(log, true),
      changes: {
        before: log.changes.before,
        after: log.changes.after,
        diff
      },
      relatedLogs: relatedLogs.map(rl => ({
        id: rl._id.toString(),
        timestamp: rl.timestamp,
        action: rl.action,
        description: rl.description
      }))
    };
  }

  /**
   * Get user activity audit trail
   */
  static async getUserActivity(userId: string, filters: UserActivityFilters, requestingUserId: string): Promise<any> {
    // Check if requesting user can view this user's activity
    await this.checkUserActivityAccess(userId, requestingUserId);

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    let userName = 'Unknown User';
    let userEmail = user.email;
    let userRole = 'learner';

    if (user.roles.includes('learner')) {
      const learner = await Learner.findById(userId);
      if (learner) {
        userName = `${learner.person.firstName} ${learner.person.lastName}`;
      }
    } else {
      const staff = await Staff.findById(userId);
      if (staff) {
        userName = `${staff.person.firstName} ${staff.person.lastName}`;
      }
      userRole = user.roles[0] || 'staff';
    }

    // Build query
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    // Exclude system-generated actions by default
    if (!filters.includeSystem) {
      query.userId = { $ne: null };
    }

    // Sorting
    const sortField = filters.sort || '-timestamp';
    const sortObj: any = {};
    if (sortField.startsWith('-')) {
      sortObj[sortField.substring(1)] = -1;
    } else {
      sortObj[sortField] = 1;
    }

    // Pagination
    const page = Math.max(1, filters.page);
    const limit = Math.min(200, Math.max(1, filters.limit));
    const skip = (page - 1) * limit;

    // Execute query
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Calculate analytics
    const analytics = await this.calculateUserAnalytics(userId, filters.startDate, filters.endDate);

    return {
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        role: userRole
      },
      logs: logs.map(log => ({
        id: log._id.toString(),
        timestamp: log.timestamp,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ? log.entityId.toString() : null,
        entityName: log.entityName,
        description: log.description,
        success: log.success,
        ipAddress: log.ipAddress,
        sessionId: log.sessionId,
        metadata: log.metadata
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      analytics
    };
  }

  /**
   * Get entity audit history
   */
  static async getEntityHistory(
    entityType: string,
    entityId: string,
    filters: EntityHistoryFilters,
    requestingUserId: string
  ): Promise<any> {
    // Build query
    const query: any = {
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId)
    };

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.userId) {
      query.userId = new mongoose.Types.ObjectId(filters.userId);
    }

    // Apply department scope
    await this.applyDepartmentScope(query, requestingUserId);

    // Sorting
    const sortField = filters.sort || '-timestamp';
    const sortObj: any = {};
    if (sortField.startsWith('-')) {
      sortObj[sortField.substring(1)] = -1;
    } else {
      sortObj[sortField] = 1;
    }

    // Pagination
    const page = Math.max(1, filters.page);
    const limit = Math.min(200, Math.max(1, filters.limit));
    const skip = (page - 1) * limit;

    // Execute query
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Calculate timeline and statistics
    const timeline = await this.calculateEntityTimeline(entityType, entityId);
    const statistics = await this.calculateEntityStatistics(entityType, entityId);

    // Get entity current state
    const entity = await this.getEntityInfo(entityType, entityId);

    return {
      entity,
      logs: logs.map(log => ({
        id: log._id.toString(),
        timestamp: log.timestamp,
        userId: log.userId ? log.userId.toString() : null,
        userName: log.userName,
        action: log.action,
        description: log.description,
        success: log.success,
        changes: {
          before: log.changes.before,
          after: log.changes.after,
          diff: this.calculateDiff(log.changes.before, log.changes.after)
        },
        metadata: log.metadata,
        version: log.metadata?.version || null
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      timeline,
      statistics
    };
  }

  /**
   * Export audit logs in various formats
   */
  static async exportAuditLogs(params: ExportParams, requestingUserId: string): Promise<any> {
    // Validate date range
    const daysDiff = Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      throw ApiError.badRequest('Date range exceeds maximum allowed (365 days)');
    }

    // Build query
    const query: any = {
      timestamp: {
        $gte: params.startDate,
        $lte: params.endDate
      }
    };

    if (params.userId) {
      query.userId = new mongoose.Types.ObjectId(params.userId);
    }

    if (params.action) {
      query.action = params.action;
    }

    if (params.entityType) {
      query.entityType = params.entityType;
    }

    if (params.entityId) {
      query.entityId = new mongoose.Types.ObjectId(params.entityId);
    }

    if (params.departmentId) {
      query.departmentId = new mongoose.Types.ObjectId(params.departmentId);
    }

    // Apply department scope
    await this.applyDepartmentScope(query, requestingUserId);

    // Check total records
    const total = await AuditLog.countDocuments(query);
    const maxRecords = params.maxRecords || 10000;

    if (total > maxRecords) {
      throw ApiError.badRequest(`Export would exceed maximum record limit (${maxRecords} records)`);
    }

    // Fetch logs
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(maxRecords)
      .lean();

    // Format based on export type
    const exportData = logs.map(log => {
      const data: any = {
        id: log._id.toString(),
        timestamp: log.timestamp,
        userId: log.userId ? log.userId.toString() : null,
        userName: log.userName,
        userRole: log.userRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId ? log.entityId.toString() : null,
        entityName: log.entityName,
        description: log.description,
        success: log.success,
        statusCode: log.statusCode,
        ipAddress: log.ipAddress,
        sessionId: log.sessionId,
        departmentId: log.departmentId ? log.departmentId.toString() : null
      };

      if (params.includeDetails) {
        data.userAgent = log.userAgent;
        data.requestMethod = log.request.method;
        data.requestPath = log.request.path;
        data.errorMessage = log.errorMessage;
      }

      if (params.includeChanges) {
        data.changesBefore = log.changes.before;
        data.changesAfter = log.changes.after;
      }

      return data;
    });

    return {
      format: params.format,
      data: exportData,
      metadata: {
        exportedAt: new Date(),
        totalRecords: logs.length,
        dateRange: {
          start: params.startDate,
          end: params.endDate
        },
        filters: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          departmentId: params.departmentId
        }
      }
    };
  }

  // Helper methods

  /**
   * Apply department scope for staff users
   */
  private static async applyDepartmentScope(query: any, userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.unauthorized('Invalid user');
    }

    // Global admins see all logs
    if (user.roles.includes('system-admin')) {
      return;
    }

    // Staff see logs scoped to their departments
    if (user.roles.some((r) => ['instructor', 'content-admin', 'department-admin'].includes(r))) {
      const staff = await Staff.findById(userId);
      if (staff) {
        const departmentIds = staff.departmentMemberships.map((dm) => dm.departmentId);
        query.departmentId = { $in: departmentIds };
      }
    } else {
      // Learners cannot access audit logs
      throw ApiError.forbidden('Insufficient permissions to view audit logs');
    }
  }

  /**
   * Check department access for specific log
   */
  private static async checkDepartmentAccess(log: any, userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.unauthorized('Invalid user');
    }

    if (user.roles.includes('system-admin')) {
      return;
    }

    if (log.departmentId) {
      const staff = await Staff.findById(userId);
      if (staff) {
        const hasAccess = staff.departmentMemberships.some(
          (dm) => dm.departmentId.toString() === log.departmentId.toString()
        );
        if (!hasAccess) {
          throw ApiError.forbidden('Insufficient permissions to view this audit log');
        }
      } else {
        throw ApiError.forbidden('Insufficient permissions to view this audit log');
      }
    }
  }

  /**
   * Check if user can view another user's activity
   */
  private static async checkUserActivityAccess(targetUserId: string, requestingUserId: string): Promise<void> {
    // Users can view their own activity
    if (targetUserId === requestingUserId) {
      return;
    }

    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      throw ApiError.unauthorized('Invalid user');
    }

    // Global admins can view all activity
    if (requestingUser.roles.includes('system-admin')) {
      return;
    }

    // Staff can view activity for users in their departments
    if (requestingUser.roles.some((r) => ['instructor', 'content-admin', 'department-admin'].includes(r))) {
      const staff = await Staff.findById(requestingUserId);
      if (staff) {
        const targetUser = await User.findById(targetUserId);
        if (targetUser && targetUser.roles.includes('learner')) {
          // For simplicity, allow staff to view learner activity
          // In production, would check enrollment/department relationships
          return;
        }
      }
    }

    throw ApiError.forbidden('Insufficient permissions to view user activity');
  }

  /**
   * Calculate summary analytics
   */
  private static async calculateSummary(query: any): Promise<any> {
    const [successCount, failureCount, uniqueUsersResult, dateRange] = await Promise.all([
      AuditLog.countDocuments({ ...query, success: true }),
      AuditLog.countDocuments({ ...query, success: false }),
      AuditLog.distinct('userId', query),
      AuditLog.find(query).sort({ timestamp: 1 }).limit(1).select('timestamp').lean()
    ]);

    const endDateResult = await AuditLog.find(query).sort({ timestamp: -1 }).limit(1).select('timestamp').lean();

    return {
      totalActions: successCount + failureCount,
      successCount,
      failureCount,
      uniqueUsers: uniqueUsersResult.filter((id) => id !== null).length,
      dateRange: {
        start: dateRange[0]?.timestamp || new Date(),
        end: endDateResult[0]?.timestamp || new Date()
      }
    };
  }

  /**
   * Calculate user analytics
   */
  private static async calculateUserAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const logs = await AuditLog.find(query).lean();

    // Action breakdown
    const actionBreakdown: any = {
      login: 0,
      logout: 0,
      create: 0,
      update: 0,
      delete: 0,
      other: 0
    };

    logs.forEach(log => {
      if (actionBreakdown.hasOwnProperty(log.action)) {
        actionBreakdown[log.action]++;
      } else {
        actionBreakdown.other++;
      }
    });

    // Active hours (morning: 6-12, afternoon: 12-18, evening: 18-24, night: 0-6)
    const activeHours = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };

    logs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      if (hour >= 6 && hour < 12) activeHours.morning++;
      else if (hour >= 12 && hour < 18) activeHours.afternoon++;
      else if (hour >= 18 && hour < 24) activeHours.evening++;
      else activeHours.night++;
    });

    // Last activity
    const lastActivity = logs.length > 0 ? logs[logs.length - 1].timestamp : null;

    // Most accessed entities
    const entityMap = new Map<string, { type: string; id: string; name: string; count: number }>();
    logs.forEach(log => {
      if (log.entityId && log.entityName) {
        const key = `${log.entityType}-${log.entityId.toString()}`;
        if (entityMap.has(key)) {
          entityMap.get(key)!.count++;
        } else {
          entityMap.set(key, {
            type: log.entityType,
            id: log.entityId.toString(),
            name: log.entityName,
            count: 1
          });
        }
      }
    });

    const mostAccessedEntities = Array.from(entityMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(entity => ({
        entityType: entity.type,
        entityId: entity.id,
        entityName: entity.name,
        accessCount: entity.count
      }));

    // Calculate average session duration
    const sessions = new Map<string, { start: Date; end: Date }>();
    logs.forEach(log => {
      if (log.sessionId) {
        if (!sessions.has(log.sessionId)) {
          sessions.set(log.sessionId, { start: log.timestamp, end: log.timestamp });
        } else {
          sessions.get(log.sessionId)!.end = log.timestamp;
        }
      }
    });

    let totalDuration = 0;
    sessions.forEach(session => {
      totalDuration += (session.end.getTime() - session.start.getTime()) / 1000;
    });
    const averageSessionDuration = sessions.size > 0 ? Math.round(totalDuration / sessions.size) : 0;

    return {
      totalActions: logs.length,
      actionBreakdown,
      activeHours,
      lastActivity,
      averageSessionDuration,
      mostAccessedEntities
    };
  }

  /**
   * Calculate entity timeline
   */
  private static async calculateEntityTimeline(entityType: string, entityId: string): Promise<any> {
    const logs = await AuditLog.find({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId)
    }).sort({ timestamp: 1 }).lean();

    const timeline: any = {
      created: null,
      published: null,
      lastModified: null,
      archived: null
    };

    logs.forEach(log => {
      if (log.action === 'create' && !timeline.created) {
        timeline.created = {
          timestamp: log.timestamp,
          userId: log.userId ? log.userId.toString() : null,
          userName: log.userName
        };
      }
      if (log.action === 'publish' && !timeline.published) {
        timeline.published = {
          timestamp: log.timestamp,
          userId: log.userId ? log.userId.toString() : null,
          userName: log.userName
        };
      }
      if (log.action === 'archive' && !timeline.archived) {
        timeline.archived = {
          timestamp: log.timestamp,
          userId: log.userId ? log.userId.toString() : null,
          userName: log.userName
        };
      }
      timeline.lastModified = {
        timestamp: log.timestamp,
        userId: log.userId ? log.userId.toString() : null,
        userName: log.userName
      };
    });

    return timeline;
  }

  /**
   * Calculate entity statistics
   */
  private static async calculateEntityStatistics(entityType: string, entityId: string): Promise<any> {
    const logs = await AuditLog.find({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId)
    }).lean();

    const uniqueContributors = new Set<string>();
    let versions = 0;

    logs.forEach(log => {
      if (log.userId) {
        uniqueContributors.add(log.userId.toString());
      }
      if (log.metadata?.version) {
        versions = Math.max(versions, log.metadata.version);
      }
    });

    return {
      totalChanges: logs.length,
      uniqueContributors: uniqueContributors.size,
      versions: versions || logs.filter(l => ['create', 'update'].includes(l.action)).length,
      lastActivity: logs.length > 0 ? logs[logs.length - 1].timestamp : null
    };
  }

  /**
   * Get entity info
   */
  private static async getEntityInfo(entityType: string, entityId: string): Promise<any> {
    // This would query the actual entity from its model
    // For now, return basic info
    return {
      type: entityType,
      id: entityId,
      name: 'Entity Name', // Would fetch from actual model
      status: 'active', // Would fetch from actual model
      currentVersion: null // Would fetch from actual model
    };
  }

  /**
   * Get related logs
   */
  private static async getRelatedLogs(log: any): Promise<any[]> {
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const startTime = new Date(log.timestamp.getTime() - timeWindow);
    const endTime = new Date(log.timestamp.getTime() + timeWindow);

    const relatedLogs = await AuditLog.find({
      _id: { $ne: log._id },
      $or: [
        { entityType: log.entityType, entityId: log.entityId },
        { userId: log.userId, sessionId: log.sessionId }
      ],
      timestamp: { $gte: startTime, $lte: endTime }
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    return relatedLogs;
  }

  /**
   * Calculate diff between before and after
   */
  private static calculateDiff(before: any, after: any): any[] {
    if (!before || !after) return [];

    const diff: any[] = [];
    const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

    allKeys.forEach(key => {
      const oldValue = before?.[key];
      const newValue = after?.[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diff.push({
          field: key,
          old: oldValue,
          new: newValue
        });
      }
    });

    return diff;
  }

  /**
   * Format audit log for response
   */
  private static formatAuditLog(log: any, includeDetails: boolean = false): any {
    const formatted: any = {
      id: log._id.toString(),
      timestamp: log.timestamp,
      userId: log.userId ? log.userId.toString() : null,
      userName: log.userName,
      userRole: log.userRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId ? log.entityId.toString() : null,
      entityName: log.entityName,
      description: log.description,
      success: log.success,
      statusCode: log.statusCode,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      sessionId: log.sessionId,
      departmentId: log.departmentId ? log.departmentId.toString() : null,
      request: {
        method: log.request.method,
        path: log.request.path,
        query: log.request.query,
        body: this.redactSensitiveData(log.request.body)
      },
      changes: {
        before: log.changes.before,
        after: log.changes.after
      },
      metadata: log.metadata,
      errorMessage: log.errorMessage,
      errorStack: includeDetails ? log.errorStack : null,
      geo: log.geo
    };

    if (includeDetails) {
      formatted.userEmail = log.userEmail;
      formatted.departmentName = log.departmentName;
      formatted.request.headers = this.redactSensitiveHeaders(log.request.headers);
    }

    return formatted;
  }

  /**
   * Redact sensitive data from request body
   */
  private static redactSensitiveData(body: any): any {
    if (!body) return null;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    const redacted = { ...body };

    sensitiveFields.forEach(field => {
      if (redacted[field]) {
        redacted[field] = '[REDACTED]';
      }
    });

    return redacted;
  }

  /**
   * Redact sensitive headers
   */
  private static redactSensitiveHeaders(headers: any): any {
    if (!headers) return null;

    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const redacted = { ...headers };

    sensitiveHeaders.forEach(header => {
      if (redacted[header]) {
        redacted[header] = '[REDACTED]';
      }
    });

    return redacted;
  }
}
