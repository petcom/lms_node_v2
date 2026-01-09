import mongoose from 'mongoose';
import LearningEvent from '@/models/activity/LearningEvent.model';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import Course from '@/models/academic/Course.model';
import Class from '@/models/academic/Class.model';
import Content from '@/models/content/Content.model';
import { ApiError } from '@/utils/ApiError';

interface ListEventsFilters {
  learner?: string;
  type?: string;
  course?: string;
  class?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: string;
  page?: number;
  limit?: number;
}

interface CreateEventData {
  type: string;
  learnerId: string;
  courseId?: string;
  classId?: string;
  contentId?: string;
  moduleId?: string;
  score?: number;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

interface BatchEventResult {
  created: number;
  failed: number;
  events: any[];
  errors: Array<{ index: number; error: string }>;
}

export class LearningEventsService {
  /**
   * List learning events with filters and pagination
   */
  static async listEvents(filters: ListEventsFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.learner) {
      if (!mongoose.Types.ObjectId.isValid(filters.learner)) {
        throw ApiError.badRequest('Invalid learner ID');
      }
      query.learnerId = filters.learner;
    }

    if (filters.type) {
      // Map contract types to model event types
      const typeMapping: Record<string, string> = {
        'enrollment': 'enrollment',
        'content_started': 'content-started',
        'content_completed': 'content-completed',
        'assessment_started': 'exam-started',
        'assessment_completed': 'exam-submitted',
        'module_completed': 'module-completed',
        'course_completed': 'course-completed',
        'achievement_earned': 'achievement-earned',
        'login': 'login',
        'logout': 'logout'
      };
      query.eventType = typeMapping[filters.type] || filters.type;
    }

    if (filters.class) {
      if (!mongoose.Types.ObjectId.isValid(filters.class)) {
        throw ApiError.badRequest('Invalid class ID');
      }
      query.classId = filters.class;
    }

    // Date range filtering
    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) {
        query.timestamp.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.timestamp.$lte = filters.dateTo;
      }
    }

    // Parse sort
    const sortField = filters.sort || '-timestamp';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');
    const sortObj: any = { [sortKey === 'createdAt' ? 'timestamp' : sortKey]: sortDirection };

    // Execute query
    const [events, total] = await Promise.all([
      LearningEvent.find(query)
        .populate('learnerId', 'firstName lastName email')
        .populate('contentId', 'title contentType')
        .populate('classId', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
      LearningEvent.countDocuments(query)
    ]);

    // Format events
    const formattedEvents = await Promise.all(
      events.map(async (event) => {
        return this.formatEvent(event);
      })
    );

    return {
      events: formattedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Create a new learning event
   */
  static async createEvent(eventData: CreateEventData): Promise<any> {
    // Validate learner exists
    if (!mongoose.Types.ObjectId.isValid(eventData.learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const learner = await User.findById(eventData.learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner not found');
    }

    // Validate optional references
    let course = null;
    let classDoc = null;
    let content = null;

    if (eventData.courseId) {
      if (!mongoose.Types.ObjectId.isValid(eventData.courseId)) {
        throw ApiError.badRequest('Invalid course ID');
      }
      course = await Course.findById(eventData.courseId);
      if (!course) {
        throw ApiError.notFound('Course not found');
      }
    }

    if (eventData.classId) {
      if (!mongoose.Types.ObjectId.isValid(eventData.classId)) {
        throw ApiError.badRequest('Invalid class ID');
      }
      classDoc = await Class.findById(eventData.classId);
      if (!classDoc) {
        throw ApiError.notFound('Class not found');
      }
    }

    if (eventData.contentId) {
      if (!mongoose.Types.ObjectId.isValid(eventData.contentId)) {
        throw ApiError.badRequest('Invalid content ID');
      }
      content = await Content.findById(eventData.contentId);
      if (!content) {
        throw ApiError.notFound('Content not found');
      }
    }

    // Map contract type to model event type
    const typeMapping: Record<string, string> = {
      'enrollment': 'enrollment',
      'content_started': 'content-started',
      'content_completed': 'content-completed',
      'assessment_started': 'exam-started',
      'assessment_completed': 'exam-submitted',
      'module_completed': 'module-completed',
      'course_completed': 'course-completed',
      'achievement_earned': 'achievement-earned',
      'login': 'login',
      'logout': 'logout'
    };

    const eventType = typeMapping[eventData.type] || eventData.type;

    // Create event
    const event = await LearningEvent.create({
      learnerId: eventData.learnerId,
      eventType,
      contentId: eventData.contentId || undefined,
      classId: eventData.classId || undefined,
      timestamp: eventData.timestamp || new Date(),
      duration: eventData.duration,
      data: eventData.score !== undefined ? { score: eventData.score } : undefined,
      metadata: {
        ...eventData.metadata,
        courseId: eventData.courseId,
        moduleId: eventData.moduleId,
        score: eventData.score
      }
    });

    // Fetch populated event
    const populatedEvent = await LearningEvent.findById(event._id)
      .populate('learnerId', 'firstName lastName email')
      .populate('contentId', 'title contentType')
      .populate('classId', 'name')
      .lean();

    return this.formatEvent(populatedEvent!, course, classDoc);
  }

  /**
   * Create batch learning events
   */
  static async createBatchEvents(eventsData: CreateEventData[]): Promise<BatchEventResult> {
    const createdEvents: any[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < eventsData.length; i++) {
      try {
        const event = await this.createEvent(eventsData[i]);
        createdEvents.push({
          id: event.id,
          type: event.type,
          learner: {
            id: event.learner.id,
            firstName: event.learner.firstName,
            lastName: event.learner.lastName
          },
          timestamp: event.timestamp,
          createdAt: event.createdAt
        });
      } catch (error: any) {
        errors.push({
          index: i,
          error: error.message || 'Failed to create event'
        });
      }
    }

    return {
      created: createdEvents.length,
      failed: errors.length,
      events: createdEvents,
      errors
    };
  }

  /**
   * Get learning event by ID
   */
  static async getEventById(eventId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      throw ApiError.notFound('Learning event not found');
    }

    const event = await LearningEvent.findById(eventId)
      .populate('learnerId', 'firstName lastName email')
      .populate('contentId', 'title contentType')
      .populate('classId', 'name')
      .lean();

    if (!event) {
      throw ApiError.notFound('Learning event not found');
    }

    // Get additional info from metadata
    let course = null;
    if (event.metadata?.courseId) {
      course = await Course.findById(event.metadata.courseId).lean();
    }

    return this.formatEvent(event, course);
  }

  /**
   * Get learner activity feed
   */
  static async getLearnerActivity(
    learnerId: string,
    filters: { type?: string; dateFrom?: Date; dateTo?: Date; page?: number; limit?: number }
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.notFound('Learner not found');
    }

    const learner = await Learner.findById(learnerId).lean();
    if (!learner) {
      throw ApiError.notFound('Learner not found');
    }

    const user = await User.findById(learnerId).lean();
    const email = user?.email || '';

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { learnerId };

    if (filters.type) {
      const typeMapping: Record<string, string> = {
        'enrollment': 'enrollment',
        'content_started': 'content-started',
        'content_completed': 'content-completed',
        'assessment_started': 'exam-started',
        'assessment_completed': 'exam-submitted',
        'module_completed': 'module-completed',
        'course_completed': 'course-completed',
        'achievement_earned': 'achievement-earned',
        'login': 'login',
        'logout': 'logout'
      };
      query.eventType = typeMapping[filters.type] || filters.type;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) {
        query.timestamp.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.timestamp.$lte = filters.dateTo;
      }
    }

    // Get events and total
    const [events, total] = await Promise.all([
      LearningEvent.find(query)
        .populate('contentId', 'title')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LearningEvent.countDocuments(query)
    ]);

    // Calculate summary statistics
    const summary = await this.calculateLearnerSummary(learnerId);

    // Format events for activity feed
    const formattedEvents = await Promise.all(
      events.map(async (event) => {
        let course = null;
        if (event.metadata?.courseId) {
          course = await Course.findById(event.metadata.courseId).lean();
        }

        const content = event.contentId as any;

        return {
          id: event._id.toString(),
          type: this.mapEventTypeToContract(event.eventType),
          course: course ? {
            id: course._id.toString(),
            title: course.name,
            code: course.code
          } : null,
          content: content ? {
            id: content._id.toString(),
            title: content.title
          } : null,
          score: event.metadata?.score || event.data?.score || null,
          duration: event.duration || null,
          timestamp: event.timestamp
        };
      })
    );

    return {
      learner: {
        id: learner._id.toString(),
        firstName: learner.firstName || '',
        lastName: learner.lastName || '',
        email: email
      },
      events: formattedEvents,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get course activity feed
   */
  static async getCourseActivity(
    courseId: string,
    filters: { type?: string; learner?: string; dateFrom?: Date; dateTo?: Date; page?: number; limit?: number }
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.notFound('Course not found');
    }

    const course = await Course.findById(courseId).lean();
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query - find events with this courseId in metadata
    const query: any = { 'metadata.courseId': courseId };

    if (filters.type) {
      const typeMapping: Record<string, string> = {
        'enrollment': 'enrollment',
        'content_started': 'content-started',
        'content_completed': 'content-completed',
        'assessment_started': 'exam-started',
        'assessment_completed': 'exam-submitted',
        'module_completed': 'module-completed',
        'course_completed': 'course-completed'
      };
      query.eventType = typeMapping[filters.type] || filters.type;
    }

    if (filters.learner) {
      if (!mongoose.Types.ObjectId.isValid(filters.learner)) {
        throw ApiError.badRequest('Invalid learner ID');
      }
      query.learnerId = filters.learner;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) {
        query.timestamp.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.timestamp.$lte = filters.dateTo;
      }
    }

    // Get events and total
    const [events, total] = await Promise.all([
      LearningEvent.find(query)
        .populate('learnerId', 'firstName lastName')
        .populate('contentId', 'title')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LearningEvent.countDocuments(query)
    ]);

    // Calculate summary statistics
    const summary = await this.calculateCourseSummary(courseId);

    // Format events
    const formattedEvents = events.map((event) => {
      const learner = event.learnerId as any;
      const content = event.contentId as any;

      return {
        id: event._id.toString(),
        type: this.mapEventTypeToContract(event.eventType),
        learner: learner ? {
          id: learner._id.toString(),
          firstName: learner.firstName || '',
          lastName: learner.lastName || ''
        } : null,
        content: content ? {
          id: content._id.toString(),
          title: content.title
        } : null,
        score: event.metadata?.score || event.data?.score || null,
        duration: event.duration || null,
        timestamp: event.timestamp
      };
    });

    return {
      course: {
        id: course._id.toString(),
        title: course.name,
        code: course.code
      },
      events: formattedEvents,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get class activity feed
   */
  static async getClassActivity(
    classId: string,
    filters: { type?: string; learner?: string; dateFrom?: Date; dateTo?: Date; page?: number; limit?: number }
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.notFound('Class not found');
    }

    const classDoc = await Class.findById(classId).populate('courseId').lean();
    if (!classDoc) {
      throw ApiError.notFound('Class not found');
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { classId };

    if (filters.type) {
      const typeMapping: Record<string, string> = {
        'enrollment': 'enrollment',
        'content_started': 'content-started',
        'content_completed': 'content-completed',
        'assessment_started': 'exam-started',
        'assessment_completed': 'exam-submitted',
        'module_completed': 'module-completed',
        'course_completed': 'course-completed'
      };
      query.eventType = typeMapping[filters.type] || filters.type;
    }

    if (filters.learner) {
      if (!mongoose.Types.ObjectId.isValid(filters.learner)) {
        throw ApiError.badRequest('Invalid learner ID');
      }
      query.learnerId = filters.learner;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) {
        query.timestamp.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.timestamp.$lte = filters.dateTo;
      }
    }

    // Get events and total
    const [events, total] = await Promise.all([
      LearningEvent.find(query)
        .populate('learnerId', 'firstName lastName')
        .populate('contentId', 'title')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LearningEvent.countDocuments(query)
    ]);

    // Calculate summary statistics
    const summary = await this.calculateClassSummary(classId);

    // Format events
    const formattedEvents = events.map((event) => {
      const learner = event.learnerId as any;
      const content = event.contentId as any;

      return {
        id: event._id.toString(),
        type: this.mapEventTypeToContract(event.eventType),
        learner: learner ? {
          id: learner._id.toString(),
          firstName: learner.firstName || '',
          lastName: learner.lastName || ''
        } : null,
        content: content ? {
          id: content._id.toString(),
          title: content.title
        } : null,
        score: event.metadata?.score || event.data?.score || null,
        duration: event.duration || null,
        timestamp: event.timestamp
      };
    });

    const course = classDoc.courseId as any;

    return {
      class: {
        id: classDoc._id.toString(),
        name: classDoc.name,
        course: course ? {
          id: course._id.toString(),
          title: course.name,
          code: course.code
        } : null
      },
      events: formattedEvents,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get activity statistics
   */
  static async getStats(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    department?: string;
    course?: string;
    class?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<any> {
    const groupBy = filters.groupBy || 'day';

    // Build base query
    const query: any = {};

    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) {
        query.timestamp.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.timestamp.$lte = filters.dateTo;
      }
    }

    if (filters.course) {
      if (!mongoose.Types.ObjectId.isValid(filters.course)) {
        throw ApiError.badRequest('Invalid course ID');
      }
      query['metadata.courseId'] = filters.course;
    }

    if (filters.class) {
      if (!mongoose.Types.ObjectId.isValid(filters.class)) {
        throw ApiError.badRequest('Invalid class ID');
      }
      query.classId = filters.class;
    }

    // Get overall statistics
    const totalEvents = await LearningEvent.countDocuments(query);

    // Get unique learners
    const uniqueLearners = await LearningEvent.distinct('learnerId', query);
    const totalLearners = uniqueLearners.length;

    // Calculate DAU, WAU, MAU
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau] = await Promise.all([
      LearningEvent.distinct('learnerId', { ...query, timestamp: { $gte: oneDayAgo } }),
      LearningEvent.distinct('learnerId', { ...query, timestamp: { $gte: oneWeekAgo } }),
      LearningEvent.distinct('learnerId', { ...query, timestamp: { $gte: oneMonthAgo } })
    ]);

    // Get total study time
    const studyTimeResult = await LearningEvent.aggregate([
      { $match: query },
      { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
    ]);
    const totalStudyTime = studyTimeResult[0]?.totalDuration || 0;

    // Get events by type
    const eventsByType = await LearningEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedEventsByType = eventsByType.map((item) => ({
      type: this.mapEventTypeToContract(item._id),
      count: item.count,
      percentage: Math.round((item.count / totalEvents) * 1000) / 10
    }));

    // Calculate completion rates
    const completionRates = await this.calculateCompletionRates(query);

    // Calculate performance metrics
    const performance = await this.calculatePerformanceMetrics(query);

    // Generate timeline
    const timeline = await this.generateTimeline(query, groupBy);

    return {
      period: {
        from: filters.dateFrom || null,
        to: filters.dateTo || null
      },
      overall: {
        totalEvents,
        totalLearners,
        activeUsers: wau.length,
        dailyActiveUsers: dau.length,
        weeklyActiveUsers: wau.length,
        monthlyActiveUsers: mau.length,
        totalStudyTime,
        averageStudyTime: totalLearners > 0 ? Math.round(totalStudyTime / totalLearners) : 0
      },
      eventsByType: formattedEventsByType,
      completionRates,
      performance,
      timeline
    };
  }

  /**
   * Helper: Format event for response
   */
  private static formatEvent(event: any, course?: any, classDoc?: any): any {
    const learner = event.learnerId;
    const content = event.contentId;
    const classInfo = event.classId || classDoc;

    // Get course from metadata if not provided
    if (!course && event.metadata?.courseId) {
      // Course will need to be fetched separately in the caller
    }

    return {
      id: event._id.toString(),
      type: this.mapEventTypeToContract(event.eventType),
      learner: learner ? {
        id: learner._id?.toString() || learner.toString(),
        firstName: learner.firstName || '',
        lastName: learner.lastName || '',
        email: learner.email || ''
      } : null,
      course: course ? {
        id: course._id.toString(),
        title: course.name,
        code: course.code
      } : null,
      class: classInfo ? {
        id: classInfo._id?.toString() || classInfo.toString(),
        name: classInfo.name || ''
      } : null,
      content: content ? {
        id: content._id?.toString() || content.toString(),
        title: content.title || '',
        type: content.contentType || ''
      } : null,
      module: event.metadata?.moduleId ? {
        id: event.metadata.moduleId,
        title: event.metadata.moduleName || ''
      } : null,
      score: event.metadata?.score || event.data?.score || null,
      duration: event.duration || null,
      metadata: event.metadata || {},
      timestamp: event.timestamp,
      createdAt: event.createdAt || event.timestamp,
      updatedAt: event.updatedAt || event.timestamp
    };
  }

  /**
   * Helper: Map model event type to contract type
   */
  private static mapEventTypeToContract(eventType: string): string {
    const mapping: Record<string, string> = {
      'enrollment': 'enrollment',
      'content-started': 'content_started',
      'content-completed': 'content_completed',
      'exam-started': 'assessment_started',
      'exam-submitted': 'assessment_completed',
      'module-completed': 'module_completed',
      'course-completed': 'course_completed',
      'achievement-earned': 'achievement_earned',
      'login': 'login',
      'logout': 'logout'
    };
    return mapping[eventType] || eventType;
  }

  /**
   * Helper: Calculate learner summary statistics
   */
  private static async calculateLearnerSummary(learnerId: string): Promise<any> {
    const events = await LearningEvent.find({ learnerId }).lean();

    const totalEvents = events.length;
    const coursesStarted = events.filter((e) => e.eventType === 'enrollment').length;
    const coursesCompleted = events.filter((e) => e.eventType === 'course-completed').length;
    const contentCompleted = events.filter((e) => e.eventType === 'content-completed').length;

    // Calculate average score
    const eventsWithScores = events.filter((e) => e.metadata?.score || e.data?.score);
    const totalScore = eventsWithScores.reduce((sum, e) => sum + (e.metadata?.score || e.data?.score || 0), 0);
    const averageScore = eventsWithScores.length > 0 ? Math.round((totalScore / eventsWithScores.length) * 10) / 10 : null;

    // Calculate total study time
    const totalStudyTime = events.reduce((sum, e) => sum + (e.duration || 0), 0);

    return {
      totalEvents,
      coursesStarted,
      coursesCompleted,
      contentCompleted,
      averageScore,
      totalStudyTime
    };
  }

  /**
   * Helper: Calculate course summary statistics
   */
  private static async calculateCourseSummary(courseId: string): Promise<any> {
    const events = await LearningEvent.find({ 'metadata.courseId': courseId }).lean();

    const totalEvents = events.length;
    const uniqueLearners = [...new Set(events.map((e) => e.learnerId.toString()))];
    const totalLearners = uniqueLearners.length;

    const enrollments = events.filter((e) => e.eventType === 'enrollment').length;
    const completions = events.filter((e) => e.eventType === 'course-completed').length;

    // Calculate average score
    const eventsWithScores = events.filter((e) => e.metadata?.score || e.data?.score);
    const totalScore = eventsWithScores.reduce((sum, e) => sum + (e.metadata?.score || e.data?.score || 0), 0);
    const averageScore = eventsWithScores.length > 0 ? Math.round((totalScore / eventsWithScores.length) * 10) / 10 : null;

    // Calculate average completion time (simplified)
    const averageCompletionTime = null; // Would need enrollment to completion tracking

    return {
      totalEvents,
      totalLearners,
      enrollments,
      completions,
      averageScore,
      averageCompletionTime
    };
  }

  /**
   * Helper: Calculate class summary statistics
   */
  private static async calculateClassSummary(classId: string): Promise<any> {
    const events = await LearningEvent.find({ classId }).lean();

    const totalEvents = events.length;
    const uniqueLearners = [...new Set(events.map((e) => e.learnerId.toString()))];
    const totalLearners = uniqueLearners.length;

    const enrollments = events.filter((e) => e.eventType === 'enrollment').length;
    const completions = events.filter((e) => e.eventType === 'course-completed').length;

    // Calculate average score
    const eventsWithScores = events.filter((e) => e.metadata?.score || e.data?.score);
    const totalScore = eventsWithScores.reduce((sum, e) => sum + (e.metadata?.score || e.data?.score || 0), 0);
    const averageScore = eventsWithScores.length > 0 ? Math.round((totalScore / eventsWithScores.length) * 10) / 10 : null;

    // Calculate average progress (simplified)
    const averageProgress = completions > 0 && enrollments > 0
      ? Math.round((completions / enrollments) * 1000) / 10
      : 0;

    return {
      totalEvents,
      totalLearners,
      enrollments,
      completions,
      averageScore,
      averageProgress
    };
  }

  /**
   * Helper: Calculate completion rates
   */
  private static async calculateCompletionRates(query: any): Promise<any> {
    const events = await LearningEvent.find(query).lean();

    const coursesStarted = events.filter((e) => e.eventType === 'enrollment').length;
    const coursesCompleted = events.filter((e) => e.eventType === 'course-completed').length;

    const contentStarted = events.filter((e) => e.eventType === 'content-started').length;
    const contentCompleted = events.filter((e) => e.eventType === 'content-completed').length;

    const assessmentsStarted = events.filter((e) => e.eventType === 'exam-started').length;
    const assessmentsCompleted = events.filter((e) => e.eventType === 'exam-submitted').length;

    return {
      courses: {
        started: coursesStarted,
        completed: coursesCompleted,
        rate: coursesStarted > 0 ? Math.round((coursesCompleted / coursesStarted) * 1000) / 10 : 0
      },
      content: {
        started: contentStarted,
        completed: contentCompleted,
        rate: contentStarted > 0 ? Math.round((contentCompleted / contentStarted) * 1000) / 10 : 0
      },
      assessments: {
        started: assessmentsStarted,
        completed: assessmentsCompleted,
        rate: assessmentsStarted > 0 ? Math.round((assessmentsCompleted / assessmentsStarted) * 1000) / 10 : 0
      }
    };
  }

  /**
   * Helper: Calculate performance metrics
   */
  private static async calculatePerformanceMetrics(query: any): Promise<any> {
    const events = await LearningEvent.find(query)
      .populate('learnerId', 'firstName lastName')
      .lean();

    // Calculate average score
    const eventsWithScores = events.filter((e) => e.metadata?.score || e.data?.score);
    const totalScore = eventsWithScores.reduce((sum, e) => sum + (e.metadata?.score || e.data?.score || 0), 0);
    const averageScore = eventsWithScores.length > 0 ? Math.round((totalScore / eventsWithScores.length) * 10) / 10 : null;

    // Calculate pass rate (>= 70%)
    const passedCount = eventsWithScores.filter((e) => {
      const score = e.metadata?.score || e.data?.score || 0;
      return score >= 70;
    }).length;
    const passRate = eventsWithScores.length > 0
      ? Math.round((passedCount / eventsWithScores.length) * 1000) / 10
      : null;

    // Get top performers
    const learnerScores: Record<string, { total: number; count: number; learner: any }> = {};

    eventsWithScores.forEach((event) => {
      const learnerId = event.learnerId._id?.toString() || event.learnerId.toString();
      const score = event.metadata?.score || event.data?.score || 0;

      if (!learnerScores[learnerId]) {
        learnerScores[learnerId] = {
          total: 0,
          count: 0,
          learner: event.learnerId
        };
      }

      learnerScores[learnerId].total += score;
      learnerScores[learnerId].count += 1;
    });

    const topPerformers = Object.entries(learnerScores)
      .map(([learnerId, data]) => ({
        learner: {
          id: learnerId,
          firstName: data.learner.firstName || '',
          lastName: data.learner.lastName || ''
        },
        averageScore: Math.round((data.total / data.count) * 10) / 10,
        completedCount: data.count
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    return {
      averageScore,
      passRate,
      topPerformers
    };
  }

  /**
   * Helper: Generate timeline data
   */
  private static async generateTimeline(query: any, groupBy: 'day' | 'week' | 'month'): Promise<any[]> {
    // Determine date format based on groupBy
    const dateFormat = groupBy === 'day' ? '%Y-%m-%d'
      : groupBy === 'week' ? '%Y-W%V'
      : '%Y-%m';

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: dateFormat, date: '$timestamp' }
          },
          events: { $sum: 1 },
          activeUsers: { $addToSet: '$learnerId' },
          completions: {
            $sum: {
              $cond: [
                { $in: ['$eventType', ['content-completed', 'exam-submitted', 'course-completed']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          period: '$_id',
          events: 1,
          activeUsers: { $size: '$activeUsers' },
          completions: 1
        }
      },
      { $sort: { _id: -1 } as any },
      { $limit: 30 }
    ];

    const results = await LearningEvent.aggregate(pipeline as any);

    return results.map((item) => ({
      period: item.period,
      date: new Date(item.period),
      events: item.events,
      activeUsers: item.activeUsers,
      completions: item.completions
    }));
  }
}
