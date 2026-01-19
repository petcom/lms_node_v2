import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import * as exercisesController from '@/controllers/content/exercises.controller';

const router = Router();

/**
 * Exercises Routes
 * Base path: /api/v2/content/exercises
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/content/exercises
 * List all exercises with optional filtering and pagination
 */
router.get('/', exercisesController.listExercises);

/**
 * POST /api/v2/content/exercises
 * Create a new exercise
 */
router.post('/', exercisesController.createExercise);

/**
 * GET /api/v2/content/exercises/:id/questions
 * Get all questions in an exercise
 */
router.get('/:id/questions', exercisesController.getExerciseQuestions);

/**
 * POST /api/v2/content/exercises/:id/questions
 * Add a question to an exercise
 */
router.post('/:id/questions', exercisesController.addQuestionToExercise);

/**
 * POST /api/v2/content/exercises/:id/questions/bulk
 * Bulk add questions to an exercise
 */
router.post('/:id/questions/bulk', exercisesController.bulkAddQuestions);

/**
 * PATCH /api/v2/content/exercises/:id/questions/reorder
 * Reorder questions in an exercise
 */
router.patch('/:id/questions/reorder', exercisesController.reorderExerciseQuestions);

/**
 * DELETE /api/v2/content/exercises/:id/questions/:questionId
 * Remove a question from an exercise
 */
router.delete('/:id/questions/:questionId', exercisesController.removeQuestionFromExercise);

/**
 * GET /api/v2/content/exercises/:id
 * Get detailed information about a specific exercise
 */
router.get('/:id', exercisesController.getExerciseById);

/**
 * PUT /api/v2/content/exercises/:id
 * Update exercise information
 */
router.put('/:id', exercisesController.updateExercise);

/**
 * DELETE /api/v2/content/exercises/:id
 * Delete an exercise (soft delete)
 */
router.delete('/:id', exercisesController.deleteExercise);

export default router;
