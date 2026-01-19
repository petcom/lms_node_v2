/**
 * requireEscalation Middleware
 *
 * Verifies that the user has escalated to admin mode with a valid admin session.
 * This middleware enforces the escalation requirement for admin-only operations.
 *
 * How it works:
 * 1. Checks for X-Admin-Token header
 * 2. Validates admin token using EscalationService
 * 3. Verifies user has an active GlobalAdmin record
 * 4. Attaches admin roles and access rights to req.adminRoles and req.adminAccessRights
 * 5. Returns 401 if no valid admin session
 *
 * Usage:
 * ```typescript
 * router.put('/admin/settings',
 *   authenticate,
 *   requireEscalation,
 *   requireAdminRole(['system-admin']),
 *   updateSystemSettings
 * );
 * ```
 *
 * Phase 5, Task 5.3 - Full Implementation
 *
 * @module middlewares/requireEscalation
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { EscalationService } from '@/services/auth/escalation.service';
import { GlobalAdmin } from '@/models/GlobalAdmin.model';
import { RoleDefinition } from '@/models/RoleDefinition.model';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Extend Express Request with admin context
 */
declare global {
  namespace Express {
    interface Request {
      adminRoles?: string[];
      adminAccessRights?: string[];
      adminSessionExpiry?: Date;
    }
  }
}

/**
 * Middleware: Require admin escalation
 *
 * Enforces that the user has escalated to admin mode with a valid admin token.
 * The admin token is separate from the regular access token and has a shorter TTL.
 *
 * Prerequisites:
 * - authenticate middleware should run first (to set req.user)
 *
 * Security features:
 * - Validates admin token in X-Admin-Token header
 * - Checks token has not expired
 * - Verifies user has active GlobalAdmin record
 * - Verifies admin session is active in cache/database
 *
 * Sets on request:
 * - req.adminRoles: Array of global admin roles (e.g., ['system-admin', 'course-admin'])
 * - req.adminAccessRights: Array of access rights from admin roles
 * - req.adminSessionExpiry: When the admin session expires
 *
 * @throws ApiError 401 if no admin token provided
 * @throws ApiError 401 if admin token is invalid or expired
 * @throws ApiError 401 if user is not a GlobalAdmin
 * @throws ApiError 403 if GlobalAdmin record is not active
 *
 * @example
 * // Basic admin route
 * router.get('/admin/users',
 *   authenticate,
 *   requireEscalation,
 *   listAllUsers
 * );
 *
 * @example
 * // Admin route with role check
 * router.put('/admin/system/settings',
 *   authenticate,
 *   requireEscalation,
 *   requireAdminRole(['system-admin']),
 *   updateSystemSettings
 * );
 */
export const requireEscalation = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get admin token from header
    const adminToken = req.headers['x-admin-token'] as string;

    if (!adminToken) {
      logger.warn(
        `Escalation required: No admin token provided for ${req.method} ${req.path}`
      );
      throw ApiError.unauthorized(
        'Admin escalation required. Please escalate to admin mode first.'
      );
    }

    // Validate admin token using EscalationService
    let tokenPayload;
    try {
      tokenPayload = await EscalationService.validateAdminToken(adminToken);
    } catch (error) {
      logger.warn(`Invalid admin token: ${error}`);
      throw ApiError.unauthorized(
        'Invalid or expired admin token. Please escalate again.'
      );
    }

    // Extract userId from token
    const userId = new Types.ObjectId(tokenPayload.userId);

    // Verify user has GlobalAdmin record
    const globalAdmin = await GlobalAdmin.findById(userId);

    if (!globalAdmin) {
      logger.error(
        `Escalation denied: User ${userId} has valid admin token but no GlobalAdmin record`
      );
      throw ApiError.unauthorized('Admin credentials not found');
    }

    // Check if GlobalAdmin is active
    if (!globalAdmin.isActive) {
      logger.warn(`Escalation denied: GlobalAdmin ${userId} is not active`);
      throw ApiError.forbidden('Admin account is not active');
    }

    // Verify admin session is still active
    const isSessionActive = await EscalationService.isAdminSessionActive(userId);

    if (!isSessionActive) {
      logger.warn(`Escalation denied: Admin session expired for user ${userId}`);
      throw ApiError.unauthorized(
        'Admin session has expired. Please escalate again.'
      );
    }

    // Get admin roles from GlobalAdmin record
    const adminRoles = globalAdmin.getAllRoles();

    if (adminRoles.length === 0) {
      logger.error(`GlobalAdmin ${userId} has no active roles`);
      throw ApiError.forbidden('No active admin roles found');
    }

    // Get access rights for admin roles
    const adminAccessRights = await RoleDefinition.getCombinedAccessRights(adminRoles);

    // Calculate session expiry
    const sessionTimeoutMinutes = globalAdmin.sessionTimeout || 15;
    const sessionExpiry = new Date(Date.now() + sessionTimeoutMinutes * 60 * 1000);

    // Attach admin context to request
    req.adminRoles = adminRoles;
    req.adminAccessRights = adminAccessRights;
    req.adminSessionExpiry = sessionExpiry;

    logger.debug(
      `Admin escalation verified: User ${userId} with roles [${adminRoles.join(', ')}] ` +
        `accessing ${req.method} ${req.path}`
    );

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Check if request has admin escalation
 *
 * Utility function to check if user is in escalated admin mode.
 * Useful for conditional logic in controllers without throwing errors.
 *
 * @param req - Express request
 * @returns True if user is in escalated admin mode
 *
 * @example
 * if (isEscalated(req)) {
 *   // Show admin features
 * }
 */
export function isEscalated(req: Request): boolean {
  return !!(req.adminRoles && req.adminRoles.length > 0);
}

/**
 * Helper: Get admin roles from request
 *
 * @param req - Express request
 * @returns Array of admin roles, or empty array if not escalated
 *
 * @example
 * const roles = getAdminRoles(req);
 * if (roles.includes('system-admin')) {
 *   // User has system-admin role
 * }
 */
export function getAdminRoles(req: Request): string[] {
  return req.adminRoles || [];
}

/**
 * Helper: Get admin access rights from request
 *
 * @param req - Express request
 * @returns Array of access rights, or empty array if not escalated
 *
 * @example
 * const rights = getAdminAccessRights(req);
 * if (rights.includes('system:settings:write')) {
 *   // User can write system settings
 * }
 */
export function getAdminAccessRights(req: Request): string[] {
  return req.adminAccessRights || [];
}

/**
 * Helper: Check if admin session is about to expire
 *
 * @param req - Express request
 * @param warningMinutes - Minutes before expiry to warn (default 5)
 * @returns True if session expires within warning period
 *
 * @example
 * if (isSessionExpiringSoon(req)) {
 *   // Warn user to refresh session
 * }
 */
export function isSessionExpiringSoon(
  req: Request,
  warningMinutes: number = 5
): boolean {
  if (!req.adminSessionExpiry) {
    return false;
  }

  const warningMs = warningMinutes * 60 * 1000;
  const expiryTime = req.adminSessionExpiry.getTime();
  const warningTime = Date.now() + warningMs;

  return expiryTime <= warningTime;
}

/**
 * Export default
 */
export default requireEscalation;
