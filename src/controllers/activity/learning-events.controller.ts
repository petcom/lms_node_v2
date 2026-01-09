import { Request, Response } from 'express';
import { LearningEventsService } from '@/services/activity/learning-events.service';
import { ApiResponse } from '@/utils/ApiResponse';
import { asyncHandler } from '@/utils/asyncHandler';
import { ApiError } from '@/utils/ApiError';

/**
 * Learning Events Controller
 * Handles all learning event and activity feed endpoints
 */

// Valid event types from contract
const VALID_EVENT_TYPES = [
  'enrollment',
  'content_started',
  'content_completed',
  'assessment_started',
  'assessment_completed',
  'module_completed',
  'course_completed',
  'achievement_earned',
  'login',
  'logout'
];

/**
 * GET /api/v2/learning-events
 * List learning events with filters
 */
export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    learner: req.query.learner as string | undefined,
    type: req.query.type as string | undefined,
    course: req.query.course as string | undefined,
    class: req.query.class as string | undefined,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate event type if provided
  if (filters.type && !VALID_EVENT_TYPES.includes(filters.type)) {
    throw ApiError.badRequest(
      `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
    );
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate dates
  if (filters.dateFrom && isNaN(filters.dateFrom.getTime())) {
    throw ApiError.badRequest('dateFrom must be a valid ISO 8601 date');
  }

  if (filters.dateTo && isNaN(filters.dateTo.getTime())) {
    throw ApiError.badRequest('dateTo must be a valid ISO 8601 date');
  }

  const result = await LearningEventsService.listEvents(filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * POST /api/v2/learning-events
 * Create a new learning event
 */
export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const {
    type,
    learnerId,
    courseId,
    classId,
    contentId,
    moduleId,
    score,
    duration,
    metadata,
    timestamp
  } = req.body;

  // Validate required fields
  if (!type || typeof type !== 'string') {
    throw ApiError.badRequest('Event type is required');
  }

  if (!VALID_EVENT_TYPES.includes(type)) {
    throw ApiError.badRequest(
      `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
    );
  }

  if (!learnerId || typeof learnerId !== 'string') {
    throw ApiError.badRequest('Learner ID is required');
  }

  // Validate optional fields
  if (courseId !== undefined && typeof courseId !== 'string') {
    throw ApiError.badRequest('Course ID must be a string');
  }

  if (classId !== undefined && typeof classId !== 'string') {
    throw ApiError.badRequest('Class ID must be a string');
  }

  if (contentId !== undefined && typeof contentId !== 'string') {
    throw ApiError.badRequest('Content ID must be a string');
  }

  if (moduleId !== undefined && typeof moduleId !== 'string') {
    throw ApiError.badRequest('Module ID must be a string');
  }

  if (score !== undefined) {
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw ApiError.badRequest('Score must be a number between 0 and 100');
    }
  }

  if (duration !== undefined) {
    if (typeof duration !== 'number' || duration < 0) {
      throw ApiError.badRequest('Duration must be a non-negative number');
    }
  }

  if (metadata !== undefined && typeof metadata !== 'object') {
    throw ApiError.badRequest('Metadata must be an object');
  }

  // Validate timestamp if provided
  let timestampObj: Date | undefined;
  if (timestamp !== undefined) {
    timestampObj = new Date(timestamp);
    if (isNaN(timestampObj.getTime())) {
      throw ApiError.badRequest('Timestamp must be a valid ISO 8601 date');
    }
  }

  const eventData = {
    type,
    learnerId,
    courseId,
    classId,
    contentId,
    moduleId,
    score,
    duration,
    metadata,
    timestamp: timestampObj
  };

  const result = await LearningEventsService.createEvent(eventData);
  res.status(201).json(ApiResponse.success(result, 'Learning event created successfully'));
});

/**
 * POST /api/v2/learning-events/batch
 * Create multiple learning events
 */
export const createBatchEvents = asyncHandler(async (req: Request, res: Response) => {
  const { events } = req.body;

  // Validate events array
  if (!events || !Array.isArray(events)) {
    throw ApiError.badRequest('Events array is required');
  }

  if (events.length === 0) {
    throw ApiError.badRequest('At least one event is required');
  }

  if (events.length > 100) {
    throw ApiError.badRequest('Maximum 100 events allowed per batch');
  }

  // Validate each event
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (!event.type || typeof event.type !== 'string') {
      throw ApiError.badRequest(`Event ${i}: type is required`);
    }

    if (!VALID_EVENT_TYPES.includes(event.type)) {
      throw ApiError.badRequest(
        `Event ${i}: Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
      );
    }

    if (!event.learnerId || typeof event.learnerId !== 'string') {
      throw ApiError.badRequest(`Event ${i}: learnerId is required`);
    }

    if (event.score !== undefined) {
      if (typeof event.score !== 'number' || event.score < 0 || event.score > 100) {
        throw ApiError.badRequest(`Event ${i}: score must be a number between 0 and 100`);
      }
    }

    if (event.duration !== undefined) {
      if (typeof event.duration !== 'number' || event.duration < 0) {
        throw ApiError.badRequest(`Event ${i}: duration must be a non-negative number`);
      }
    }

    // Validate timestamp if provided
    if (event.timestamp !== undefined) {
      const timestampObj = new Date(event.timestamp);
      if (isNaN(timestampObj.getTime())) {
        throw ApiError.badRequest(`Event ${i}: timestamp must be a valid ISO 8601 date`);
      }
      event.timestamp = timestampObj;
    }
  }

  const result = await LearningEventsService.createBatchEvents(events);

  const message = result.failed === 0
    ? `Batch events created: ${result.created} created`
    : `Batch events created: ${result.created} created, ${result.failed} failed`;

  res.status(201).json(ApiResponse.success(result, message));
});

/**
 * GET /api/v2/learning-events/:id
 * Get learning event by ID
 */
export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await LearningEventsService.getEventById(id);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/learning-events/learner/:learnerId
 * Get learner activity feed
 */
export const getLearnerActivity = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId } = req.params;

  const filters = {
    type: req.query.type as string | undefined,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate event type if provided
  if (filters.type && !VALID_EVENT_TYPES.includes(filters.type)) {
    throw ApiError.badRequest(
      `Invalid event type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`
    );
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate dates
  if (filters.dateFrom && isNaN(filters.dateFrom.getTime())) {
    throw ApiError.badRequest('dateFrom must be a valid ISO 8601 date');
  }

  if (filters.dateTo && isNaN(filters.dateTo.getTime())) {
    throw ApiError.badRequest('dateTo must be a valid ISO 8601 date');
  }

  const result = await LearningEventsService.getLearnerActivity(learnerId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/learning-events/course/:courseId
 * Get course activity feed
 */
export const getCourseActivity = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params;

  const filters = {
    type: req.query.type as string | undefined,
    learner: req.query.learner as string | undefined,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate event type if provided (limited types for course activity)
  const validCourseEventTypes = [
    'enrollment',
    'content_started',
    'content_completed',
    'assessment_started',
    'assessment_completed',
    'module_completed',
    'course_completed'
  ];

  if (filters.type && !validCourseEventTypes.includes(filters.type)) {
    throw ApiError.badRequest(
      `Invalid event type for course activity. Must be one of: ${validCourseEventTypes.join(', ')}`
    );
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate dates
  if (filters.dateFrom && isNaN(filters.dateFrom.getTime())) {
    throw ApiError.badRequest('dateFrom must be a valid ISO 8601 date');
  }

  if (filters.dateTo && isNaN(filters.dateTo.getTime())) {
    throw ApiError.badRequest('dateTo must be a valid ISO 8601 date');
  }

  const result = await LearningEventsService.getCourseActivity(courseId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/learning-events/class/:classId
 * Get class activity feed
 */
export const getClassActivity = asyncHandler(async (req: Request, res: Response) => {
  const { classId } = req.params;

  const filters = {
    type: req.query.type as string | undefined,
    learner: req.query.learner as string | undefined,
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
  };

  // Validate event type if provided (limited types for class activity)
  const validClassEventTypes = [
    'enrollment',
    'content_started',
    'content_completed',
    'assessment_started',
    'assessment_completed',
    'module_completed',
    'course_completed'
  ];

  if (filters.type && !validClassEventTypes.includes(filters.type)) {
    throw ApiError.badRequest(
      `Invalid event type for class activity. Must be one of: ${validClassEventTypes.join(', ')}`
    );
  }

  // Validate page and limit
  if (filters.page !== undefined && (isNaN(filters.page) || filters.page < 1)) {
    throw ApiError.badRequest('Page must be a positive number');
  }

  if (filters.limit !== undefined && (isNaN(filters.limit) || filters.limit < 1 || filters.limit > 100)) {
    throw ApiError.badRequest('Limit must be between 1 and 100');
  }

  // Validate dates
  if (filters.dateFrom && isNaN(filters.dateFrom.getTime())) {
    throw ApiError.badRequest('dateFrom must be a valid ISO 8601 date');
  }

  if (filters.dateTo && isNaN(filters.dateTo.getTime())) {
    throw ApiError.badRequest('dateTo must be a valid ISO 8601 date');
  }

  const result = await LearningEventsService.getClassActivity(classId, filters);
  res.status(200).json(ApiResponse.success(result));
});

/**
 * GET /api/v2/learning-events/stats
 * Get activity statistics
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    department: req.query.department as string | undefined,
    course: req.query.course as string | undefined,
    class: req.query.class as string | undefined,
    groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'day'
  };

  // Validate groupBy
  if (!['day', 'week', 'month'].includes(filters.groupBy)) {
    throw ApiError.badRequest('groupBy must be one of: day, week, month');
  }

  // Validate dates
  if (filters.dateFrom && isNaN(filters.dateFrom.getTime())) {
    throw ApiError.badRequest('dateFrom must be a valid ISO 8601 date');
  }

  if (filters.dateTo && isNaN(filters.dateTo.getTime())) {
    throw ApiError.badRequest('dateTo must be a valid ISO 8601 date');
  }

  const result = await LearningEventsService.getStats(filters);
  res.status(200).json(ApiResponse.success(result));
});
