import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { authorize } from '@/middlewares/authorize';
import { requireEscalation } from '@/middlewares/requireEscalation';
import * as auditLogsController from '@/controllers/system/audit-logs.controller';

const router = Router();

/**
 * Audit Logs Routes
 * Base path: /api/v2/audit-logs
 *
 * All routes require authentication and appropriate permissions.
 * Audit logs are immutable - no POST, PUT, or DELETE operations.
 *
 * Authorization:
 * - ALL audit log endpoints require escalation (admin token)
 * - Access Rights: audit:logs:read (system-admin) OR domain-specific audit rights
 * - Instructors CANNOT view audit logs, even for their own content
 * - Department-scoped for non-system-admins
 *
 * Access control:
 * - System-admin: See all logs across all departments
 * - Content-admin: See content-related audit logs in their department
 * - Enrollment-admin: See enrollment-related audit logs
 * - Financial-admin: See billing-related audit logs
 * - Instructors: NO ACCESS
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/audit-logs
 * List audit logs with advanced filtering and search
 * Access Rights: audit:logs:read
 * Roles: system-admin
 * Requires: Escalation
 */
router.get('/',
  requireEscalation,
  authorize('audit:logs:read'),
  auditLogsController.listAuditLogs
);

/**
 * GET /api/v2/audit-logs/:id
 * Get detailed information for a specific audit log entry
 * Access Rights: audit:logs:read
 * Roles: system-admin
 * Requires: Escalation
 */
router.get('/:id',
  requireEscalation,
  authorize('audit:logs:read'),
  auditLogsController.getAuditLogById
);

/**
 * GET /api/v2/audit-logs/export
 * Export audit logs in various formats (JSON, CSV, XLSX, PDF)
 * Must be defined after /:id route to avoid conflict with dynamic route
 * Access Rights: audit:logs:export
 * Roles: system-admin
 * Requires: Escalation
 */
router.get('/export',
  requireEscalation,
  authorize('audit:logs:export'),
  auditLogsController.exportAuditLogs
);

/**
 * GET /api/v2/audit-logs/user/:userId
 * Get comprehensive activity audit trail for a specific user
 * Access Rights: audit:logs:read
 * Roles: system-admin
 * Requires: Escalation
 */
router.get('/user/:userId',
  requireEscalation,
  authorize('audit:logs:read'),
  auditLogsController.getUserActivity
);

/**
 * GET /api/v2/audit-logs/entity/:entityType/:entityId
 * Get complete audit history for a specific entity
 * Access Rights: Domain-specific audit rights
 * - content-admin: audit:content:read
 * - enrollment-admin: audit:enrollment:read
 * - financial-admin: audit:billing:read
 * - system-admin: audit:logs:read (all)
 * Roles: content-admin, enrollment-admin, financial-admin, system-admin
 * Requires: Escalation
 * Note: Instructors CANNOT view audit logs even for their own content
 */
router.get('/entity/:entityType/:entityId',
  requireEscalation,
  authorize.anyOf(['audit:logs:read', 'audit:content:read', 'audit:enrollment:read', 'audit:billing:read']),
  auditLogsController.getEntityHistory
);

export default router;
