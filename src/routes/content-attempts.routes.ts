import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as contentAttemptsController from '@/controllers/content/content-attempts.controller';

const router = Router();

/**
 * Content Attempts Routes
 * Base path: /api/v2/content-attempts
 *
 * All routes require authentication
 * Handles content attempt tracking, SCORM CMI data, and progress management
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/v2/content-attempts
 * List content attempts with filtering options
 * Permissions: read:attempts, authenticated
 * Query params: page, limit, learnerId, contentId, status, enrollmentId, sort
 */
router.get('/', contentAttemptsController.listAttempts);

/**
 * POST /api/v2/content-attempts
 * Create a new content attempt
 * Permissions: create:attempts, authenticated
 * Body: { contentId, enrollmentId?, scormVersion?, launchData?, metadata? }
 */
router.post('/', contentAttemptsController.createAttempt);

/**
 * GET /api/v2/content-attempts/:id
 * Get detailed attempt information
 * Permissions: read:attempts, authenticated
 * Query params: includeCmi (boolean)
 */
router.get('/:id', contentAttemptsController.getAttempt);

/**
 * PATCH /api/v2/content-attempts/:id
 * Update attempt progress and tracking data
 * Permissions: update:attempts, authenticated (own attempts only)
 * Body: { status?, progressPercent?, score?, scoreRaw?, scoreMin?, scoreMax?,
 *         scoreScaled?, timeSpentSeconds?, location?, suspendData?, metadata? }
 */
router.patch('/:id', contentAttemptsController.updateAttempt);

/**
 * POST /api/v2/content-attempts/:id/complete
 * Mark an attempt as complete with final score
 * Permissions: update:attempts, authenticated (own attempts only)
 * Body: { score?, scoreRaw?, scoreScaled?, passed?, timeSpentSeconds? }
 */
router.post('/:id/complete', contentAttemptsController.completeAttempt);

/**
 * GET /api/v2/content-attempts/:id/cmi
 * Get SCORM CMI data for an attempt
 * Permissions: read:attempts, authenticated
 */
router.get('/:id/cmi', contentAttemptsController.getCmiData);

/**
 * PUT /api/v2/content-attempts/:id/cmi
 * Update SCORM CMI data fields
 * Permissions: update:attempts, authenticated (own attempts only)
 * Body: { cmiData: {}, autoCommit?: boolean }
 */
router.put('/:id/cmi', contentAttemptsController.updateCmiData);

/**
 * POST /api/v2/content-attempts/:id/suspend
 * Suspend an in-progress attempt to resume later
 * Permissions: update:attempts, authenticated (own attempts only)
 * Body: { suspendData?, location?, sessionTime? }
 */
router.post('/:id/suspend', contentAttemptsController.suspendAttempt);

/**
 * POST /api/v2/content-attempts/:id/resume
 * Resume a suspended attempt
 * Permissions: update:attempts, authenticated (own attempts only)
 */
router.post('/:id/resume', contentAttemptsController.resumeAttempt);

/**
 * DELETE /api/v2/content-attempts/:id
 * Delete a content attempt (admin only)
 * Permissions: delete:attempts, admin
 * Query params: permanent (boolean) - default false for soft delete
 */
router.delete('/:id', contentAttemptsController.deleteAttempt);

export default router;
