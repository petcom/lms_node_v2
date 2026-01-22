/**
 * Test Routes for Middleware Testing
 *
 * These routes are ONLY loaded in test environment and are used to test
 * authorization middleware functionality.
 *
 * DO NOT use these in production.
 */

import { Router, Request, Response } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireDepartmentMembership } from '@/middlewares/requireDepartmentMembership';
import { requireDepartmentRole } from '@/middlewares/requireDepartmentRole';
import { requireEscalation } from '@/middlewares/requireEscalation';
import { requireAdminRole } from '@/middlewares/requireAdminRole';
import { authorize } from '@/middlewares/authorize';
import { ApiResponse } from '@/utils/ApiResponse';

const router = Router();

// Only load test routes in test environment
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Test routes should only be loaded in test environment');
}

// ===================================================================
// Department Membership Tests
// ===================================================================

// Test requireDepartmentMembership
router.get(
  '/departments/:departmentId/courses',
  isAuthenticated,
  requireDepartmentMembership,
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ courses: [] }));
  }
);

// ===================================================================
// Department Role Tests
// ===================================================================

// Test requireDepartmentRole with content-admin or department-admin
router.post(
  '/departments/:departmentId/courses',
  isAuthenticated,
  requireDepartmentMembership,
  requireDepartmentRole(['content-admin', 'department-admin']),
  (req: Request, res: Response) => {
    res.status(201).json(ApiResponse.success({ course: { id: '123', title: req.body.title } }));
  }
);

// Test requireDepartmentRole with department-admin only
router.put(
  '/departments/:departmentId/settings',
  isAuthenticated,
  requireDepartmentMembership,
  requireDepartmentRole(['department-admin']),
  (req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ settings: req.body }));
  }
);

// ===================================================================
// Escalation Tests
// ===================================================================

// Test requireEscalation
router.get(
  '/admin/settings',
  isAuthenticated,
  requireEscalation,
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ settings: {} }));
  }
);

// ===================================================================
// Admin Role Tests
// ===================================================================

// Test requireAdminRole with system-admin
router.put(
  '/admin/system-settings',
  isAuthenticated,
  requireEscalation,
  requireAdminRole(['system-admin']),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ updated: true }));
  }
);

// Test requireAdminRole with system-admin or enrollment-admin
router.get(
  '/admin/users',
  isAuthenticated,
  requireEscalation,
  requireAdminRole(['system-admin', 'enrollment-admin']),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ users: [] }));
  }
);

// ===================================================================
// Access Right Tests
// ===================================================================

// Test authorize with content:courses:manage
router.put(
  '/departments/:departmentId/courses/:courseId',
  isAuthenticated,
  requireDepartmentMembership,
  authorize('content:courses:manage'),
  (req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ course: { id: req.params.courseId, updated: true } }));
  }
);

// Test authorize.anyOf (staff:department:manage OR reports:department:read)
router.get(
  '/departments/:departmentId/reports',
  isAuthenticated,
  requireDepartmentMembership,
  authorize.anyOf(['staff:department:manage', 'reports:department:read']),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ reports: [] }));
  }
);

// Test authorize.allOf (both rights required)
router.post(
  '/departments/:departmentId/courses/bulk-update',
  isAuthenticated,
  requireDepartmentMembership,
  authorize.allOf(['content:courses:manage', 'content:lessons:manage']),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ updated: true }));
  }
);

// ===================================================================
// Wildcard Access Rights Tests
// ===================================================================

// Test system:* wildcard
router.get(
  '/admin/system-info',
  isAuthenticated,
  requireEscalation,
  authorize('system:*'),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ systemInfo: {} }));
  }
);

// Test content:* wildcard
router.delete(
  '/admin/content/purge',
  isAuthenticated,
  requireEscalation,
  authorize('content:*'),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ purged: true }));
  }
);

// Test content:* wildcard for various operations
router.get(
  '/admin/content/courses',
  isAuthenticated,
  requireEscalation,
  authorize('content:*'),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ courses: [] }));
  }
);

router.get(
  '/admin/content/lessons',
  isAuthenticated,
  requireEscalation,
  authorize('content:*'),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ lessons: [] }));
  }
);

router.get(
  '/admin/content/materials',
  isAuthenticated,
  requireEscalation,
  authorize('content:*'),
  (_req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ materials: [] }));
  }
);

// ===================================================================
// Context Inspection Endpoints
// ===================================================================

// Return department context (for testing req.department)
router.get(
  '/departments/:departmentId/context',
  isAuthenticated,
  requireDepartmentMembership,
  (req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ departmentContext: req.department }));
  }
);

// Return user roles in department (for testing req.department.roles)
router.get(
  '/departments/:departmentId/my-roles',
  isAuthenticated,
  requireDepartmentMembership,
  (req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({ roles: req.department?.roles || [] }));
  }
);

// Return user access rights (for testing access rights in req.user)
router.get(
  '/departments/:departmentId/my-access',
  isAuthenticated,
  requireDepartmentMembership,
  (req: Request, res: Response) => {
    const allAccessRights = (req.user as any)?.allAccessRights || [];
    res.status(200).json(ApiResponse.success({ accessRights: allAccessRights }));
  }
);

// Return admin context (for testing req.adminRoles and req.adminAccessRights)
router.get(
  '/admin/context',
  isAuthenticated,
  requireEscalation,
  (req: Request, res: Response) => {
    res.status(200).json(ApiResponse.success({
      isAdminContext: true,
      adminRoles: req.adminRoles || [],
      adminAccessRights: req.adminAccessRights || []
    }));
  }
);

export default router;
