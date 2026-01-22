/**
 * Report Jobs Routes
 *
 * Defines routes for report job management including creation, listing,
 * viewing, canceling, downloading, and retrying report jobs.
 *
 * @module routes/reports/report-jobs
 */

import { Router } from 'express';
import { z } from 'zod';
import * as controller from '@/controllers/reports/report-jobs.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validateRequest';

// Inlined schemas from @contracts/api/report-jobs.contract to avoid rootDir issues
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
const isoDateSchema = z.string().datetime();

const reportParametersSchema = z.object({
  dateRange: z
    .object({
      startDate: isoDateSchema,
      endDate: isoDateSchema
    })
    .optional(),
  filters: z
    .object({
      departmentIds: z.array(objectIdSchema).optional(),
      courseIds: z.array(objectIdSchema).optional(),
      classIds: z.array(objectIdSchema).optional(),
      learnerIds: z.array(objectIdSchema).optional(),
      contentIds: z.array(objectIdSchema).optional(),
      eventTypes: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional()
    })
    .optional(),
  groupBy: z.array(z.string()).optional(),
  measures: z.array(z.string()).optional(),
  includeInactive: z.boolean().optional()
});

const outputConfigSchema = z.object({
  format: z.string().min(1, 'Output format is required'),
  filename: z.string().optional()
});

const createReportJobSchema = z.object({
  body: z.object({
    reportType: z.string().min(1, 'Report type is required'),
    name: z.string().min(1, 'Name is required').max(200, 'Name cannot exceed 200 characters'),
    description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
    parameters: reportParametersSchema,
    output: outputConfigSchema,
    priority: z.string().optional(),
    visibility: z.string().optional(),
    scheduledFor: isoDateSchema.optional(),
    templateId: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional()
  })
});

const listReportJobsSchema = z.object({
  query: z.object({
    status: z.union([z.string(), z.array(z.string())]).optional(),
    reportType: z.union([z.string(), z.array(z.string())]).optional(),
    requestedBy: objectIdSchema.optional(),
    departmentId: objectIdSchema.optional(),
    fromDate: isoDateSchema.optional(),
    toDate: isoDateSchema.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.enum(['createdAt', 'status', 'priority', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});

const getReportJobSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  })
});

const cancelReportJobSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  }),
  body: z.object({
    reason: z.string().max(500).optional()
  })
});

const retryReportJobSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  })
});

const downloadReportSchema = z.object({
  params: z.object({
    jobId: objectIdSchema
  })
});

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

/**
 * POST /api/v2/reports/jobs
 * Create a new report generation job
 * Requires: reports:jobs:create permission
 */
router.post(
  '/',
  authorize('reports:jobs:create'),
  validateRequest(createReportJobSchema),
  controller.createReportJob
);

/**
 * GET /api/v2/reports/jobs
 * List report jobs with filters and pagination
 * Requires: reports:jobs:read permission
 */
router.get(
  '/',
  authorize('reports:jobs:read'),
  validateRequest(listReportJobsSchema),
  controller.listReportJobs
);

/**
 * GET /api/v2/reports/jobs/:jobId
 * Get detailed information about a specific job
 * Requires: reports:jobs:read permission
 */
router.get(
  '/:jobId',
  authorize('reports:jobs:read'),
  validateRequest(getReportJobSchema),
  controller.getReportJob
);

/**
 * POST /api/v2/reports/jobs/:jobId/cancel
 * Cancel a pending or running job
 * Requires: reports:jobs:cancel permission OR be the job owner
 */
router.post(
  '/:jobId/cancel',
  authorize('reports:jobs:cancel'),
  validateRequest(cancelReportJobSchema),
  controller.cancelReportJob
);

/**
 * GET /api/v2/reports/jobs/:jobId/download
 * Download the generated report file
 * Requires: reports:jobs:read permission
 */
router.get(
  '/:jobId/download',
  authorize('reports:jobs:read'),
  validateRequest(downloadReportSchema),
  controller.downloadReport
);

/**
 * POST /api/v2/reports/jobs/:jobId/retry
 * Retry a failed job
 * Requires: reports:jobs:create permission OR be the job owner
 */
router.post(
  '/:jobId/retry',
  authorize('reports:jobs:create'),
  validateRequest(retryReportJobSchema),
  controller.retryReportJob
);

export default router;
