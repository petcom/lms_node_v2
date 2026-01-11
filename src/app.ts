import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import { stream } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Phase 1 routes
import authRoutes from './routes/auth.routes';
import permissionsRoutes from './routes/permissions.routes';
import accessRightsRoutes from './routes/access-rights.routes';
import usersRoutes from './routes/users.routes';
import staffRoutes from './routes/staff.routes';
import learnersRoutes from './routes/learners.routes';
import departmentsRoutes from './routes/departments.routes';
import academicYearsRoutes from './routes/academic-years.routes';
import lookupValuesRoutes from './routes/lookup-values.routes';
import listsRoutes from './routes/lists.routes';

// Phase 2 routes
import programsRoutes from './routes/programs.routes';
import coursesRoutes from './routes/courses.routes';
import courseSegmentsRoutes from './routes/course-segments.routes';
import classesRoutes from './routes/classes.routes';

// Phase 3 routes
import contentRoutes from './routes/content.routes';
import exercisesRoutes from './routes/exercises.routes';
import questionsRoutes from './routes/questions.routes';
import templatesRoutes from './routes/templates.routes';

// Phase 4 routes
import enrollmentsRoutes from './routes/enrollments.routes';
import progressRoutes from './routes/progress.routes';
import contentAttemptsRoutes from './routes/content-attempts.routes';
import learningEventsRoutes from './routes/learning-events.routes';

// Phase 5 routes
import examAttemptsRoutes from './routes/exam-attempts.routes';
import reportsRoutes from './routes/reports.routes';

// Phase 6 routes
import settingsRoutes from './routes/settings.routes';
import auditLogsRoutes from './routes/audit-logs.routes';
import systemRoutes from './routes/system.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan('combined', { stream }));
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes - Phase 1
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/permissions', permissionsRoutes);
app.use('/api/v2/access-rights', accessRightsRoutes);
app.use('/api/v2/users', usersRoutes);
app.use('/api/v2/users/staff', staffRoutes);
app.use('/api/v2/users/learners', learnersRoutes);
app.use('/api/v2/departments', departmentsRoutes);
app.use('/api/v2/calendar', academicYearsRoutes);
app.use('/api/v2/lookup-values', lookupValuesRoutes);
app.use('/api/v2/lists', listsRoutes);

// API routes - Phase 2
app.use('/api/v2/programs', programsRoutes);
app.use('/api/v2/courses', coursesRoutes); // Main courses routes
app.use('/api/v2/courses', courseSegmentsRoutes); // Nested module routes under /courses/:courseId/modules
app.use('/api/v2/classes', classesRoutes);

// API routes - Phase 3
app.use('/api/v2/content', contentRoutes);
app.use('/api/v2/content/exercises', exercisesRoutes);
app.use('/api/v2/questions', questionsRoutes);
app.use('/api/v2/templates', templatesRoutes);

// API routes - Phase 4
app.use('/api/v2/enrollments', enrollmentsRoutes);
app.use('/api/v2/progress', progressRoutes);
app.use('/api/v2/content-attempts', contentAttemptsRoutes);
app.use('/api/v2/learning-events', learningEventsRoutes);

// API routes - Phase 5
app.use('/api/v2/exam-attempts', examAttemptsRoutes);
app.use('/api/v2/reports', reportsRoutes);

// API routes - Phase 6
app.use('/api/v2/settings', settingsRoutes);
app.use('/api/v2/audit-logs', auditLogsRoutes);
app.use('/api/v2/system', systemRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
