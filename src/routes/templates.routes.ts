import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as templatesController from '@/controllers/content/templates.controller';

const router = Router();

/**
 * Templates Routes
 * Base path: /api/v2/templates
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/templates
 * List all templates with optional filtering and pagination
 */
router.get('/', templatesController.listTemplates);

/**
 * POST /api/v2/templates
 * Create a new template
 */
router.post('/', templatesController.createTemplate);

/**
 * GET /api/v2/templates/:id/preview
 * Preview template with sample data
 */
router.get('/:id/preview', templatesController.previewTemplate);

/**
 * POST /api/v2/templates/:id/duplicate
 * Duplicate an existing template
 */
router.post('/:id/duplicate', templatesController.duplicateTemplate);

/**
 * GET /api/v2/templates/:id
 * Get detailed information about a specific template
 */
router.get('/:id', templatesController.getTemplateById);

/**
 * PUT /api/v2/templates/:id
 * Update template information
 */
router.put('/:id', templatesController.updateTemplate);

/**
 * DELETE /api/v2/templates/:id
 * Delete a template (soft delete)
 */
router.delete('/:id', templatesController.deleteTemplate);

export default router;
