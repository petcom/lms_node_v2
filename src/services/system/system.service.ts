import mongoose from 'mongoose';
import * as os from 'os';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import Department from '@/models/organization/Department.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';
import Content from '@/models/content/Content.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import Exercise from '@/models/assessment/Exercise.model';
import ExamResult from '@/models/activity/ExamResult.model';
import SystemHealth from '@/models/system/SystemHealth.model';
import { ApiError } from '@/utils/ApiError';
import { roleCache } from '@/services/auth/role-cache.service';
import { departmentCacheService } from '@/services/auth/department-cache.service';

// Cache for metrics and stats
let metricsCache: { data: any; timestamp: number } | null = null;
let statsCache: { data: any; timestamp: number; period: string } | null = null;
const CACHE_DURATION = 60000; // 1 minute

interface ToggleMaintenanceInput {
  enabled: boolean;
  message?: string;
  allowedIPs?: string[];
  scheduledEnd?: Date;
}

export class SystemService {
  /**
   * GET /api/v2/system/health
   * Basic health check (PUBLIC - no auth)
   */
  static async getHealth(): Promise<any> {
    const _startTime = Date.now();

    // Check maintenance mode
    const maintenanceStatus = await this.getMaintenanceMode();
    if (maintenanceStatus.maintenanceMode) {
      return {
        success: false,
        status: 'unhealthy',
        timestamp: new Date(),
        reason: maintenanceStatus.message || 'System is in maintenance mode'
      };
    }

    // Check database connection
    const dbStatus = mongoose.connection.readyState;
    const isDbHealthy = dbStatus === 1; // 1 = connected

    if (!isDbHealthy) {
      return {
        success: false,
        status: 'unhealthy',
        timestamp: new Date(),
        reason: 'Database connection unavailable'
      };
    }

    // Quick DB ping test
    try {
      await mongoose.connection.db?.admin().ping();
    } catch (error) {
      return {
        success: false,
        status: 'unhealthy',
        timestamp: new Date(),
        reason: 'Database ping failed'
      };
    }

    const responseTime = Date.now() - _startTime;

    // Determine status based on response time
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (responseTime > 1000) {
      status = 'degraded';
    }

    return {
      success: true,
      status,
      timestamp: new Date(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '2.0.0'
    };
  }

  /**
   * GET /api/v2/system/status
   * Detailed system status (admin only)
   */
  static async getStatus(): Promise<any> {
    const maintenanceStatus = await this.getMaintenanceMode();

    // Overall status
    const overall = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date(),
      uptime: Math.floor(process.uptime()),
      maintenanceMode: maintenanceStatus.maintenanceMode
    };

    // Database component
    const dbComponent = await this.checkDatabaseHealth();

    // Cache component
    const cacheComponent = await this.checkCacheHealth();

    // Storage component
    const storageComponent = await this.checkStorageHealth();

    // Email component
    const emailComponent = await this.checkEmailHealth();

    // SCORM component
    const scormComponent = await this.checkScormHealth();

    // API component
    const apiComponent = await this.checkApiHealth();

    // Determine overall status based on components
    const components = [dbComponent, cacheComponent, storageComponent, emailComponent, scormComponent, apiComponent];
    const unhealthyComponents = components.filter(c => c.status === 'unhealthy');
    const degradedComponents = components.filter(c => c.status === 'degraded');

    if (unhealthyComponents.length > 0) {
      overall.status = 'unhealthy';
    } else if (degradedComponents.length > 0) {
      overall.status = 'degraded';
    }

    return {
      overall,
      components: {
        database: dbComponent,
        cache: cacheComponent,
        storage: storageComponent,
        email: emailComponent,
        scorm: scormComponent,
        api: apiComponent
      }
    };
  }

  /**
   * GET /api/v2/system/metrics
   * Performance metrics (admin only)
   */
  static async getMetrics(period: string = '24h'): Promise<any> {
    // Check cache
    const now = Date.now();
    if (metricsCache && (now - metricsCache.timestamp) < CACHE_DURATION) {
      return metricsCache.data;
    }

    // Calculate time range based on period
    const periodMs = this.parsePeriod(period);
    const _startTime = new Date(Date.now() - periodMs);

    // Get resource usage
    const cpuUsage = process.cpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // Get database metrics
    const dbMetrics = await this.getDatabaseMetrics(_startTime);

    // Get cache metrics
    const cacheMetrics = await this.getCacheMetrics();

    // Mock performance metrics (in production, these would come from actual monitoring)
    const performanceMetrics = {
      avgResponseTime: 150,
      p50ResponseTime: 120,
      p95ResponseTime: 280,
      p99ResponseTime: 450,
      requestsPerSecond: 125.5,
      totalRequests: Math.floor(periodMs / 1000) * 125 // Estimated
    };

    // Mock error metrics
    const errorMetrics = {
      errorRate: 0.8,
      totalErrors: Math.floor(performanceMetrics.totalRequests * 0.008),
      errorsByType: {
        '4xx': Math.floor(performanceMetrics.totalRequests * 0.006),
        '5xx': Math.floor(performanceMetrics.totalRequests * 0.002)
      },
      topErrors: [
        { code: 'NOT_FOUND', count: Math.floor(performanceMetrics.totalRequests * 0.004), percentage: 50 },
        { code: 'VALIDATION_ERROR', count: Math.floor(performanceMetrics.totalRequests * 0.001), percentage: 12.5 },
        { code: 'INTERNAL_ERROR', count: Math.floor(performanceMetrics.totalRequests * 0.001), percentage: 12.5 }
      ]
    };

    const data = {
      period,
      timestamp: new Date(),
      performance: performanceMetrics,
      errors: errorMetrics,
      resources: {
        cpu: {
          usage: Math.round((cpuUsage.system + cpuUsage.user) / 1000000 / process.uptime() / os.cpus().length * 100 * 100) / 100,
          loadAverage: os.loadavg()
        },
        memory: {
          used: usedMem,
          free: freeMem,
          total: totalMem,
          percentage: Math.round((usedMem / totalMem) * 100 * 100) / 100
        },
        disk: {
          used: 0, // Would need fs stats in production
          free: 0,
          total: 0,
          percentage: 0,
          iops: 0
        },
        network: {
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0
        }
      },
      database: dbMetrics,
      cache: cacheMetrics
    };

    // Cache the result
    metricsCache = { data, timestamp: now };

    return data;
  }

  /**
   * GET /api/v2/system/version
   * Version information (PUBLIC - no auth)
   */
  static async getVersion(): Promise<any> {
    const buildDate = new Date(process.env.BUILD_DATE || Date.now());
    const buildNumber = process.env.BUILD_NUMBER || new Date().toISOString().split('T')[0].replace(/-/g, '.') + '.1';

    return {
      version: process.env.npm_package_version || '2.0.0',
      apiVersion: 'v2',
      buildNumber,
      buildDate,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      features: {
        scormSupport: true,
        exerciseBuilder: true,
        advancedReporting: true,
        ssoIntegration: false,
        mobileApp: false
      },
      deprecations: []
    };
  }

  /**
   * GET /api/v2/system/stats
   * Platform statistics (admin only)
   */
  static async getStats(period: string = 'all'): Promise<any> {
    // Check cache
    const now = Date.now();
    if (statsCache && statsCache.period === period && (now - statsCache.timestamp) < CACHE_DURATION) {
      return statsCache.data;
    }

    const periodMs = period === 'all' ? 0 : this.parsePeriod(period);
    const _startTime = periodMs > 0 ? new Date(Date.now() - periodMs) : null;

    // Build time filter for period-based queries
    const timeFilter = _startTime ? { createdAt: { $gte: _startTime } } : {};

    // Users statistics
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      User.countDocuments({ isActive: true }),
      _startTime ? User.countDocuments({ ...timeFilter, isActive: true }) : User.countDocuments({ isActive: true }),
      User.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$roles' },
        { $group: { _id: '$roles', count: { $sum: 1 } } }
      ])
    ]);

    const roleMap: any = {
      'system-admin': 0,
      'staff': 0,
      'learner': 0
    };
    usersByRole.forEach((r: any) => {
      if (r._id === 'learner') roleMap['learner'] = r.count;
      else if (r._id === 'system-admin') roleMap['global-admin'] = r.count;
      else roleMap['staff'] = (roleMap['staff'] || 0) + r.count;
    });

    const newUsers = _startTime ? await User.countDocuments(timeFilter) : 0;
    const loginCount = _startTime ? Math.floor(activeUsers * 3.5) : 0; // Estimated

    // Departments
    const [totalDepartments, activeDepartments] = await Promise.all([
      Department.countDocuments(),
      Department.countDocuments({ isActive: true })
    ]);

    // Programs
    const [totalPrograms, publishedPrograms, draftPrograms] = await Promise.all([
      Program.countDocuments(),
      Program.countDocuments({ 'metadata.status': 'published' }),
      Program.countDocuments({ 'metadata.status': { $ne: 'published' } })
    ]);

    // Courses
    const [totalCourses, publishedCourses, draftCourses, archivedCourses] = await Promise.all([
      Course.countDocuments(),
      Course.countDocuments({ isActive: true, 'metadata.status': 'published' }),
      Course.countDocuments({ isActive: true, 'metadata.status': { $ne: 'published' } }),
      Course.countDocuments({ isActive: false })
    ]);

    const avgModulesPerCourse = 8.5; // Would calculate from CourseContent in production

    // Classes
    const currentDate = new Date();
    const [totalClasses, activeClasses, upcomingClasses, completedClasses] = await Promise.all([
      Class.countDocuments(),
      Class.countDocuments({ startDate: { $lte: currentDate }, endDate: { $gte: currentDate } }),
      Class.countDocuments({ startDate: { $gt: currentDate } }),
      Class.countDocuments({ endDate: { $lt: currentDate } })
    ]);

    // Content
    const [totalContent, scormContent, exerciseContent] = await Promise.all([
      Content.countDocuments(),
      Content.countDocuments({ contentType: 'scorm' }),
      Exercise.countDocuments()
    ]);

    const customContent = totalContent - scormContent;
    const totalSizeMB = 15360; // Would calculate from actual file sizes in production

    // Enrollments
    const [totalEnrollments, activeEnrollments, completedEnrollments, withdrawnEnrollments, programEnrollments, courseEnrollments] = await Promise.all([
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'active' }),
      Enrollment.countDocuments({ status: 'completed' }),
      Enrollment.countDocuments({ status: 'withdrawn' }),
      Enrollment.countDocuments({ entityType: 'program' }),
      Enrollment.countDocuments({ entityType: 'course' })
    ]);

    // Activity
    const activeLearners = _startTime ? await Learner.countDocuments({ ...timeFilter }) : activeUsers;
    const contentAttempts = _startTime ? await ContentAttempt.countDocuments({ ...timeFilter }) : await ContentAttempt.countDocuments();
    const completions = _startTime ? await ContentAttempt.countDocuments({ ...timeFilter, completionStatus: 'completed' }) : await ContentAttempt.countDocuments({ completionStatus: 'completed' });

    const avgProgress = completions > 0 ? Math.round((completions / contentAttempts) * 100 * 10) / 10 : 0;
    const totalLearningHours = Math.floor(contentAttempts * 0.75); // Estimated

    // Assessments
    const exercisesCreated = _startTime ? await Exercise.countDocuments(timeFilter) : await Exercise.countDocuments();
    const assessmentsTaken = _startTime ? await ExamResult.countDocuments(timeFilter) : await ExamResult.countDocuments();

    const avgScore = 78.5; // Would calculate from actual scores in production
    const passRate = 82.3; // Would calculate from pass/fail data in production

    const data = {
      timestamp: new Date(),
      period,
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: roleMap,
        newInPeriod: newUsers,
        loginCount
      },
      departments: {
        total: totalDepartments,
        active: activeDepartments
      },
      programs: {
        total: totalPrograms,
        published: publishedPrograms,
        draft: draftPrograms
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: draftCourses,
        archived: archivedCourses,
        avgModulesPerCourse
      },
      classes: {
        total: totalClasses,
        active: activeClasses,
        upcoming: upcomingClasses,
        completed: completedClasses
      },
      content: {
        total: totalContent,
        scorm: scormContent,
        exercises: exerciseContent,
        custom: customContent,
        totalSizeMB
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        withdrawn: withdrawnEnrollments,
        programEnrollments,
        courseEnrollments
      },
      activity: {
        activeLearners,
        contentAttempts,
        completions,
        avgProgressPercentage: avgProgress,
        totalLearningHours
      },
      assessments: {
        exercisesCreated,
        assessmentsTaken,
        avgScore,
        passRate
      }
    };

    // Cache the result
    statsCache = { data, timestamp: now, period };

    return data;
  }

  /**
   * POST /api/v2/system/maintenance
   * Toggle maintenance mode (admin only)
   */
  static async toggleMaintenance(input: ToggleMaintenanceInput, userId?: string): Promise<any> {
    // Validate input
    if (typeof input.enabled !== 'boolean') {
      throw ApiError.badRequest('enabled field is required and must be a boolean');
    }

    if (input.message && input.message.length > 500) {
      throw ApiError.badRequest('Message cannot exceed 500 characters');
    }

    if (input.allowedIPs && !Array.isArray(input.allowedIPs)) {
      throw ApiError.badRequest('allowedIPs must be an array');
    }

    // Get or create system health record
    let systemHealth = await SystemHealth.findOne();

    if (!systemHealth) {
      systemHealth = new SystemHealth({
        maintenanceMode: false,
        allowedIPs: [],
      });
    }

    // Update maintenance mode
    systemHealth.maintenanceMode = input.enabled;
    systemHealth.message = input.message;
    systemHealth.allowedIPs = input.allowedIPs || [];
    systemHealth.scheduledEnd = input.scheduledEnd;

    if (input.enabled) {
      systemHealth.enabledAt = new Date();
      systemHealth.enabledBy = userId ? new mongoose.Types.ObjectId(userId) : undefined;
    } else {
      systemHealth.enabledAt = undefined;
      systemHealth.enabledBy = undefined;
    }

    await systemHealth.save();

    return {
      maintenanceMode: systemHealth.maintenanceMode,
      message: systemHealth.message || null,
      allowedIPs: systemHealth.allowedIPs,
      scheduledEnd: systemHealth.scheduledEnd || null,
      enabledAt: systemHealth.enabledAt || null,
      enabledBy: systemHealth.enabledBy?.toString() || null
    };
  }

  /**
   * Helper: Get maintenance mode status
   */
  private static async getMaintenanceMode(): Promise<any> {
    const systemHealth = await SystemHealth.findOne();
    return {
      maintenanceMode: systemHealth?.maintenanceMode || false,
      message: systemHealth?.message,
      allowedIPs: systemHealth?.allowedIPs || []
    };
  }

  /**
   * Helper: Check database health
   */
  private static async checkDatabaseHealth(): Promise<any> {
    const _startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message: string | null = null;

    try {
      // Check connection state
      const dbState = mongoose.connection.readyState;
      if (dbState !== 1) {
        status = 'unhealthy';
        message = 'Database not connected';
        return {
          status,
          responseTime: Date.now() - _startTime,
          connections: { active: 0, available: 0, max: 0 },
          message
        };
      }

      // Ping database
      await mongoose.connection.db?.admin().ping();
      const responseTime = Date.now() - _startTime;

      // Determine status based on response time
      if (responseTime > 100) {
        status = 'degraded';
        message = 'Slow response time';
      }

      // Get connection pool info (simplified)
      const poolSize = mongoose.connection.getClient()?.options?.maxPoolSize || 100;

      return {
        status,
        responseTime,
        connections: {
          active: 10, // Would get from actual pool in production
          available: poolSize - 10,
          max: poolSize
        },
        message
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - _startTime,
        connections: { active: 0, available: 0, max: 0 },
        message: 'Database ping failed'
      };
    }
  }

  /**
   * Helper: Check cache health
   */
  private static async checkCacheHealth(): Promise<any> {
    const roleCacheStats = roleCache.getStats();
    const deptCacheStats = departmentCacheService.getStats();

    // Determine overall cache status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message: string | null = null;

    if (!roleCacheStats.initialized && !deptCacheStats.isInitialized) {
      status = 'degraded';
      message = 'Authorization caches not initialized - using database fallback';
    } else if (!roleCacheStats.initialized || !deptCacheStats.isInitialized) {
      status = 'degraded';
      message = !roleCacheStats.initialized
        ? 'Role cache not initialized'
        : 'Department cache not initialized';
    } else if (roleCacheStats.isRefreshing || deptCacheStats.isLoading) {
      status = 'degraded';
      message = 'Cache refresh in progress';
    }

    return {
      status,
      responseTime: 1, // In-memory caches are fast
      roleCache: {
        initialized: roleCacheStats.initialized,
        size: roleCacheStats.size,
        lastRefreshAt: roleCacheStats.lastRefreshAt,
        isRefreshing: roleCacheStats.isRefreshing
      },
      departmentCache: {
        initialized: deptCacheStats.isInitialized,
        parentToChildrenCount: deptCacheStats.parentToChildrenCount,
        childToParentCount: deptCacheStats.childToParentCount,
        lastRefreshAt: deptCacheStats.lastRefreshTime,
        isLoading: deptCacheStats.isLoading
      },
      message
    };
  }

  /**
   * Helper: Check storage health
   */
  private static async checkStorageHealth(): Promise<any> {
    // In production, this would check actual disk space
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      disk: {
        used: usedMem,
        available: freeMem,
        total: totalMem,
        percentUsed: Math.round((usedMem / totalMem) * 100)
      },
      message: null
    };
  }

  /**
   * Helper: Check email health
   */
  private static async checkEmailHealth(): Promise<any> {
    // In production, this would check email service (SendGrid, etc.)
    return {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      provider: process.env.EMAIL_PROVIDER || 'SendGrid',
      lastSent: new Date(Date.now() - 120000), // 2 minutes ago
      queueSize: 0,
      message: null
    };
  }

  /**
   * Helper: Check SCORM health
   */
  private static async checkScormHealth(): Promise<any> {
    try {
      const scormCount = await Content.countDocuments({ contentType: 'scorm' });
      const activeSessions = 0; // Would track active SCORM sessions in production

      return {
        status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
        packagesCount: scormCount,
        activeSessions,
        message: null
      };
    } catch (error) {
      return {
        status: 'degraded' as 'healthy' | 'degraded' | 'unhealthy',
        packagesCount: 0,
        activeSessions: 0,
        message: 'Unable to fetch SCORM data'
      };
    }
  }

  /**
   * Helper: Check API health
   */
  private static async checkApiHealth(): Promise<any> {
    return {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      version: process.env.npm_package_version || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      avgResponseTime: 150,
      errorRate: 0.5
    };
  }

  /**
   * Helper: Get database metrics
   */
  private static async getDatabaseMetrics(_startTime: Date): Promise<any> {
    // In production, these would come from actual database monitoring
    return {
      queries: {
        total: 5421600,
        slow: 124,
        avgDuration: 25,
        p95Duration: 85
      },
      connections: {
        current: 45,
        peak: 78,
        max: mongoose.connection.getClient()?.options?.maxPoolSize || 100
      }
    };
  }

  /**
   * Helper: Get cache metrics
   */
  private static async getCacheMetrics(): Promise<any> {
    // In production, these would come from actual cache monitoring
    return {
      hitRate: 94.5,
      hits: 9523456,
      misses: 553210,
      evictions: 12345
    };
  }

  /**
   * Helper: Parse period string to milliseconds
   */
  private static parsePeriod(period: string): number {
    const periodMap: { [key: string]: number } = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      'today': 86400000,
      'week': 604800000,
      'month': 2592000000,
      'year': 31536000000
    };

    return periodMap[period] || periodMap['24h'];
  }
}
