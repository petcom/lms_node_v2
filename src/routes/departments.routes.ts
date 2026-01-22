import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { requireEscalation } from '@/middlewares/requireEscalation';
import { requireAdminRole } from '@/middlewares/requireAdminRole';
import * as departmentsController from '@/controllers/departments/departments.controller';

const router = Router();

/**
 * Departments Routes
 * Base path: /api/v2/departments
 *
 * Some routes are public (no access right required)
 * Others require specific access rights
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/departments
 * List all departments with optional filtering and pagination
 * Access Right: None (Public - all authenticated users)
 */
router.get('/', departmentsController.listDepartments);

/**
 * POST /api/v2/departments
 * Create a new department
 * Access Right: system:department-settings:manage
 * Middleware: requireEscalation + requireAdminRole(['system-admin'])
 */
router.post('/',
  requireEscalation,
  requireAdminRole(['system-admin']),
  authorize('system:department-settings:manage'),
  departmentsController.createDepartment
);

/**
 * GET /api/v2/departments/:id/hierarchy
 * Get department tree structure including ancestors and descendants
 * Access Right: None (Public - all authenticated users)
 */
router.get('/:id/hierarchy', departmentsController.getDepartmentHierarchy);

/**
 * GET /api/v2/departments/:id/programs
 * Get all programs in a department
 * Access Right: content:programs:manage OR content:courses:read
 */
router.get('/:id/programs',
  authorize.anyOf(['content:programs:manage', 'content:courses:read']),
  departmentsController.getDepartmentPrograms
);

/**
 * GET /api/v2/departments/:id/staff
 * Get all staff members assigned to a department
 * Access Right: staff:department:read
 * Service Layer: Hierarchical scoping - Top-level members see all subdepartments
 */
router.get('/:id/staff',
  authorize('staff:department:read'),
  departmentsController.getDepartmentStaff
);

/**
 * GET /api/v2/departments/:id/stats
 * Get statistical overview of department activity and performance
 * Access Right: reports:department:read
 */
router.get('/:id/stats',
  authorize('reports:department:read'),
  departmentsController.getDepartmentStats
);

/**
 * GET /api/v2/departments/:id
 * Get detailed information about a specific department
 * Access Right: None (Public - all authenticated users)
 */
router.get('/:id', departmentsController.getDepartmentById);

/**
 * PUT /api/v2/departments/:id
 * Update department information
 * Access Right: system:department-settings:manage
 * Middleware: requireEscalation
 * Service Layer: Department-admin can update own dept, system-admin can update all
 */
router.put('/:id',
  requireEscalation,
  authorize('system:department-settings:manage'),
  departmentsController.updateDepartment
);

/**
 * DELETE /api/v2/departments/:id
 * Delete a department (soft delete)
 * Access Right: system:department-settings:manage
 * Middleware: requireEscalation + requireAdminRole(['system-admin'])
 */
router.delete('/:id',
  requireEscalation,
  requireAdminRole(['system-admin']),
  authorize('system:department-settings:manage'),
  departmentsController.deleteDepartment
);

export default router;
