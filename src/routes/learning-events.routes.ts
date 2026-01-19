import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as learningEventsController from '@/controllers/activity/learning-events.controller';

const router = Router();

/**
 * Learning Events Routes
 * Base path: /api/v2/learning-events
 *
 * All routes require authentication
 * Tracks learner activities, progress milestones, and system interactions
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * =====================
 * LEARNING EVENTS MANAGEMENT
 * =====================
 */

/**
 * GET /api/v2/learning-events
 * List learning events with filtering and pagination
 * Permissions: admin, staff (for their departments), learners (own events only)
 * Query params:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 20, min: 1, max: 100)
 * - learner: ObjectId (filter by learner ID)
 * - type: string (enrollment|content_started|content_completed|assessment_started|assessment_completed|module_completed|course_completed|achievement_earned|login|logout)
 * - course: ObjectId (filter by course ID)
 * - class: ObjectId (filter by class ID)
 * - dateFrom: Date (ISO 8601) (filter events from date)
 * - dateTo: Date (ISO 8601) (filter events to date)
 * - sort: string (default: '-createdAt', prefix with - for descending)
 */
router.get('/', learningEventsController.listEvents);

/**
 * POST /api/v2/learning-events
 * Create a new learning event (for manual/offline activities)
 * Permissions: admin, staff (for learners in their departments)
 * Body:
 * - type: string (required) - enrollment|content_started|content_completed|assessment_started|assessment_completed|module_completed|course_completed|achievement_earned|login|logout
 * - learnerId: ObjectId (required)
 * - courseId: ObjectId (optional)
 * - classId: ObjectId (optional)
 * - contentId: ObjectId (optional)
 * - moduleId: ObjectId (optional)
 * - score: number (optional, 0-100)
 * - duration: number (optional, in seconds)
 * - metadata: object (optional, flexible JSON)
 * - timestamp: Date (optional, ISO 8601, defaults to now)
 */
router.post('/', learningEventsController.createEvent);

/**
 * POST /api/v2/learning-events/batch
 * Create multiple learning events in a single request
 * Permissions: admin, staff (for learners in their departments)
 * Body:
 * - events: Array of event objects (required, min: 1, max: 100)
 *   Each event has same structure as single event creation
 *
 * Returns partial success with details on which events succeeded/failed
 */
router.post('/batch', learningEventsController.createBatchEvents);

/**
 * =====================
 * STATISTICS & ANALYTICS
 * =====================
 */

/**
 * GET /api/v2/learning-events/stats
 * Get aggregated activity statistics and metrics
 * Permissions: admin, staff (for their departments)
 * Query params:
 * - dateFrom: Date (ISO 8601) (optional, start date for statistics)
 * - dateTo: Date (ISO 8601) (optional, end date for statistics)
 * - department: ObjectId (optional, filter by department)
 * - course: ObjectId (optional, filter by course)
 * - class: ObjectId (optional, filter by class)
 * - groupBy: string (optional, default: 'day', values: day|week|month)
 *
 * Returns:
 * - DAU/WAU/MAU (Daily/Weekly/Monthly Active Users)
 * - Event breakdown by type
 * - Completion rates (courses, content, assessments)
 * - Performance metrics (average scores, pass rates, top performers)
 * - Timeline data grouped by specified period
 */
router.get('/stats', learningEventsController.getStats);

/**
 * =====================
 * ACTIVITY FEEDS
 * =====================
 */

/**
 * GET /api/v2/learning-events/learner/:learnerId
 * Get a learner's activity feed with all learning events
 * Permissions: admin, staff (for learners in their departments), learner (own feed only)
 * Query params:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 20, min: 1, max: 100)
 * - type: string (filter by event type)
 * - dateFrom: Date (ISO 8601)
 * - dateTo: Date (ISO 8601)
 *
 * Returns:
 * - Learner info
 * - Array of events with pagination
 * - Summary statistics (total events, courses started/completed, content completed, average score, total study time)
 */
router.get('/learner/:learnerId', learningEventsController.getLearnerActivity);

/**
 * GET /api/v2/learning-events/course/:courseId
 * Get all learning events for a specific course
 * Permissions: admin, staff (with course access), course instructors
 * Query params:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 20, min: 1, max: 100)
 * - type: string (enrollment|content_started|content_completed|assessment_started|assessment_completed|module_completed|course_completed)
 * - learner: ObjectId (filter by learner)
 * - dateFrom: Date (ISO 8601)
 * - dateTo: Date (ISO 8601)
 *
 * Returns:
 * - Course info
 * - Array of events with pagination
 * - Summary statistics (total events, learners, enrollments, completions, average score, average completion time)
 */
router.get('/course/:courseId', learningEventsController.getCourseActivity);

/**
 * GET /api/v2/learning-events/class/:classId
 * Get all learning events for a specific class instance
 * Permissions: admin, staff (with class access), class instructors
 * Query params:
 * - page: number (default: 1, min: 1)
 * - limit: number (default: 20, min: 1, max: 100)
 * - type: string (enrollment|content_started|content_completed|assessment_started|assessment_completed|module_completed|course_completed)
 * - learner: ObjectId (filter by learner)
 * - dateFrom: Date (ISO 8601)
 * - dateTo: Date (ISO 8601)
 *
 * Returns:
 * - Class info (including course)
 * - Array of events with pagination
 * - Summary statistics (total events, learners, enrollments, completions, average score, average progress)
 */
router.get('/class/:classId', learningEventsController.getClassActivity);

/**
 * =====================
 * INDIVIDUAL EVENT DETAILS
 * =====================
 */

/**
 * GET /api/v2/learning-events/:id
 * Get detailed information about a specific learning event
 * Permissions: admin, staff (for learners in their departments), learner (own events only)
 *
 * Returns complete event details including all related entities and full metadata
 */
router.get('/:id', learningEventsController.getEventById);

export default router;
