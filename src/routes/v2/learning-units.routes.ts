import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import * as learningUnitsController from '@/controllers/academic/learning-units.controller';
import {
  validateCreateLearningUnit,
  validateUpdateLearningUnit,
  validateReorderLearningUnits,
  validateMoveLearningUnit
} from '@/validators/learning-unit.validator';

const router = Router({ mergeParams: true });

/**
 * Learning Units Routes
 * Base path: /api/v2/modules/:moduleId/learning-units
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/modules/:moduleId/learning-units
 * List all learning units in a module with optional filtering
 * Access Right: content:courses:read
 */
router.get('/',
  requireAccessRight('content:courses:read'),
  learningUnitsController.listLearningUnits
);

/**
 * POST /api/v2/modules/:moduleId/learning-units
 * Create a new learning unit in a module
 * Access Right: content:lessons:manage
 */
router.post('/',
  requireAccessRight('content:lessons:manage'),
  validateCreateLearningUnit,
  learningUnitsController.createLearningUnit
);

/**
 * PUT /api/v2/modules/:moduleId/learning-units/reorder
 * Reorder learning units within a module
 * Access Right: content:lessons:manage
 */
router.put('/reorder',
  requireAccessRight('content:lessons:manage'),
  validateReorderLearningUnits,
  learningUnitsController.reorderLearningUnits
);

/**
 * GET /api/v2/modules/:moduleId/learning-units/:learningUnitId
 * Get learning unit details
 * Access Right: content:courses:read
 */
router.get('/:learningUnitId',
  requireAccessRight('content:courses:read'),
  learningUnitsController.getLearningUnit
);

/**
 * PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId
 * Update a learning unit
 * Access Right: content:lessons:manage
 */
router.put('/:learningUnitId',
  requireAccessRight('content:lessons:manage'),
  validateUpdateLearningUnit,
  learningUnitsController.updateLearningUnit
);

/**
 * DELETE /api/v2/modules/:moduleId/learning-units/:learningUnitId
 * Delete a learning unit (soft delete)
 * Access Right: content:lessons:manage
 */
router.delete('/:learningUnitId',
  requireAccessRight('content:lessons:manage'),
  learningUnitsController.deleteLearningUnit
);

/**
 * PUT /api/v2/modules/:moduleId/learning-units/:learningUnitId/move
 * Move a learning unit to another module
 * Access Right: content:lessons:manage
 */
router.put('/:learningUnitId/move',
  requireAccessRight('content:lessons:manage'),
  validateMoveLearningUnit,
  learningUnitsController.moveLearningUnit
);

export default router;
