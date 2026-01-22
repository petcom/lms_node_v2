/**
 * Program Levels Routes
 *
 * Routes for direct program level access.
 * Base path: /api/v2/program-levels
 *
 * Note: Levels can also be accessed via /api/v2/programs/:programId/levels
 *
 * @module routes/program-levels
 */

import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import * as programLevelsController from '@/controllers/academic/program-levels.controller';

const router = Router();

/**
 * Program Levels Routes
 * Base path: /api/v2/program-levels
 *
 * All routes require authentication.
 * Write operations require content:programs:manage permission.
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/program-levels/:id
 *
 * Get program level details by ID.
 * Authorization:
 *   - Admin: All levels
 *   - Staff: Levels in assigned departments
 *   - Learners: Levels in enrolled programs
 * Permission: content:courses:read (fallback to authenticated)
 */
router.get('/:id',
  authorize.anyOf(['content:courses:read', 'content:programs:read']),
  programLevelsController.getLevel
);

/**
 * PUT /api/v2/program-levels/:id
 *
 * Update program level details.
 * Body:
 *   - name: string (required, 1-200 chars)
 *   - description: string (optional, max 2000 chars)
 *   - requiredCredits: number (optional, >= 0)
 *   - courses: ObjectId[] (optional)
 * Authorization:
 *   - Admin: All levels
 *   - Staff: Levels in assigned departments
 * Permission: content:programs:manage
 */
router.put('/:id',
  authorize('content:programs:manage'),
  programLevelsController.updateLevel
);

/**
 * DELETE /api/v2/program-levels/:id
 *
 * Delete a program level (soft delete).
 * Authorization:
 *   - Admin: All levels
 *   - Staff: Levels in assigned departments
 * Permission: content:programs:manage
 * Constraints:
 *   - Cannot delete if level has active enrollments
 *   - Cannot delete the only level in a program
 */
router.delete('/:id',
  authorize('content:programs:manage'),
  programLevelsController.deleteLevel
);

/**
 * PATCH /api/v2/program-levels/:id/reorder
 *
 * Reorder level within program sequence.
 * Body:
 *   - newOrder: number (required, >= 1)
 * Authorization:
 *   - Admin: All levels
 *   - Staff: Levels in assigned departments
 * Permission: content:programs:manage
 */
router.patch('/:id/reorder',
  authorize('content:programs:manage'),
  programLevelsController.reorderLevel
);

export default router;
