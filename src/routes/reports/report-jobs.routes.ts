/**
 * Report Jobs Routes
 *
 * Defines routes for report job management including creation, listing,
 * viewing, canceling, downloading, and retrying report jobs.
 *
 * @module routes/reports/report-jobs
 */

import { Router } from 'express';
import * as controller from '@/controllers/reports/report-jobs.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import { validateRequest } from '@/middlewares/validateRequest';
import {
  createReportJobSchema,
  listReportJobsSchema,
  getReportJobSchema,
  cancelReportJobSchema,
  retryReportJobSchema,
  downloadReportSchema
} from '@contracts/api/report-jobs.contract';

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
  requireAccessRight('reports:jobs:create'),
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
  requireAccessRight('reports:jobs:read'),
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
  requireAccessRight('reports:jobs:read'),
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
  requireAccessRight('reports:jobs:cancel'),
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
  requireAccessRight('reports:jobs:read'),
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
  requireAccessRight('reports:jobs:create'),
  validateRequest(retryReportJobSchema),
  controller.retryReportJob
);

export default router;
