import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { requireEscalation } from '@/middlewares/requireEscalation';
import { requireAdminRole } from '@/middlewares/requireAdminRole';
import * as staffController from '@/controllers/users/staff.controller';

const router = Router();

/**
 * Staff Routes
 * Base path: /api/v2/users/staff
 *
 * All routes require authentication
 * Authorization enforced via access rights middleware
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/users/staff
 * List staff users with filtering and pagination
 * Access Right: staff:department:read
 * Roles: instructor, department-admin, system-admin
 * Service Layer: Hierarchical scoping - top-level dept members see all subdepartments
 */
router.get('/',
  authorize('staff:department:read'),
  staffController.listStaff
);

/**
 * POST /api/v2/users/staff
 * Register a new staff user account
 * Access Right: staff:department:manage
 * Roles: department-admin, system-admin
 * Security: Requires escalation (FERPA-sensitive)
 */
router.post('/',
  requireEscalation,
  authorize('staff:department:manage'),
  staffController.registerStaff
);

/**
 * GET /api/v2/users/staff/:id
 * Get detailed information for a specific staff user
 * Access Right: staff:department:read
 * Roles: instructor, department-admin, system-admin
 */
router.get('/:id',
  authorize('staff:department:read'),
  staffController.getStaffById
);

/**
 * PUT /api/v2/users/staff/:id
 * Update staff user information
 * Access Right: staff:department:manage
 * Roles: department-admin (own dept), system-admin (all)
 * Security: Requires escalation (FERPA-sensitive)
 */
router.put('/:id',
  requireEscalation,
  authorize('staff:department:manage'),
  staffController.updateStaff
);

/**
 * DELETE /api/v2/users/staff/:id
 * Soft delete a staff user (sets status to withdrawn)
 * Access Right: staff:department:manage
 * Roles: department-admin (own dept), system-admin (all)
 * Security: Requires escalation + admin role check
 */
router.delete('/:id',
  requireEscalation,
  requireAdminRole(['system-admin']),
  authorize('staff:department:manage'),
  staffController.deleteStaff
);

/**
 * PATCH /api/v2/users/staff/:id/departments
 * Update staff user department assignments and roles
 * Access Right: staff:department:manage
 * Roles: department-admin, system-admin
 * Security: Requires escalation (FERPA-sensitive)
 */
router.patch('/:id/departments',
  requireEscalation,
  authorize('staff:department:manage'),
  staffController.updateStaffDepartments
);

export default router;
