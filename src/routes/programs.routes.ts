import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import { requireEscalation } from '@/middlewares/requireEscalation';
import * as programsController from '@/controllers/academic/programs.controller';

const router = Router();

/**
 * Programs Routes
 * Base path: /api/v2/programs
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/programs
 * List all programs with filtering and pagination
 * Access Right: content:programs:manage OR content:courses:read
 * Service Layer: Department-scoped for staff, all published for learners
 */
router.get('/',
  requireAccessRight(['content:programs:manage', 'content:courses:read']),
  programsController.listPrograms
);

/**
 * POST /api/v2/programs
 * Create a new program
 * Access Right: content:programs:manage
 */
router.post('/',
  requireAccessRight('content:programs:manage'),
  programsController.createProgram
);

/**
 * GET /api/v2/programs/:id
 * Get detailed information about a specific program
 * Access Right: content:programs:manage OR content:courses:read
 */
router.get('/:id',
  requireAccessRight(['content:programs:manage', 'content:courses:read']),
  programsController.getProgramById
);

/**
 * PUT /api/v2/programs/:id
 * Update program information
 * Access Right: content:programs:manage
 */
router.put('/:id',
  requireAccessRight('content:programs:manage'),
  programsController.updateProgram
);

/**
 * DELETE /api/v2/programs/:id
 * Delete a program (soft delete)
 * Access Right: content:programs:manage
 * Middleware: requireEscalation
 */
router.delete('/:id',
  requireEscalation,
  requireAccessRight('content:programs:manage'),
  programsController.deleteProgram
);

/**
 * GET /api/v2/programs/:id/levels
 * Get all levels for a specific program
 * Access Right: content:programs:manage OR content:courses:read
 */
router.get('/:id/levels',
  requireAccessRight(['content:programs:manage', 'content:courses:read']),
  programsController.getProgramLevels
);

/**
 * POST /api/v2/programs/:id/levels
 * Create a new level in a program
 * Access Right: content:programs:manage
 */
router.post('/:id/levels',
  requireAccessRight('content:programs:manage'),
  programsController.createProgramLevel
);

/**
 * GET /api/v2/programs/:id/courses
 * Get all courses in a specific program
 * Access Right: content:courses:read
 */
router.get('/:id/courses',
  requireAccessRight('content:courses:read'),
  programsController.getProgramCourses
);

/**
 * GET /api/v2/programs/:id/enrollments
 * Get all enrollments for a specific program
 * Access Right: enrollment:department:read
 */
router.get('/:id/enrollments',
  requireAccessRight('enrollment:department:read'),
  programsController.getProgramEnrollments
);

/**
 * PATCH /api/v2/programs/:id/department
 * Move a program to a different department
 * Access Right: content:programs:manage AND system:department-settings:manage
 * Middleware: requireEscalation
 */
router.patch('/:id/department',
  requireEscalation,
  requireAccessRight('content:programs:manage'),
  programsController.updateProgramDepartment
);

export default router;
