/**
 * requireDepartmentMembership Middleware
 *
 * Verifies that the authenticated user has active membership in a specific department.
 * Supports role cascading from parent departments using RoleService.
 *
 * How it works:
 * 1. Extracts departmentId from request (params, query, or body)
 * 2. Verifies user has active membership in the department (direct or cascaded)
 * 3. Attaches department context to req.department
 * 4. Returns 403 if user is not a member
 *
 * Usage:
 * ```typescript
 * router.post('/departments/:departmentId/courses',
 *   authenticate,
 *   requireDepartmentMembership,
 *   createCourse
 * );
 * ```
 *
 * Phase 5, Task 5.1 - Full Implementation
 *
 * @module middlewares/requireDepartmentMembership
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { RoleService } from '@/services/auth/role.service';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';
import { logger } from '@/config/logger';

/**
 * Department context attached to request
 */
export interface DepartmentContext {
  departmentId: Types.ObjectId;
  departmentName: string;
  departmentCode: string;
  roles: string[];
  isPrimary: boolean;
  isCascaded: boolean;
  level: number;
}

/**
 * Extend Express Request with department context
 */
declare global {
  namespace Express {
    interface Request {
      department?: DepartmentContext;
    }
  }
}

/**
 * Extract departmentId from request
 * Checks params.departmentId, query.departmentId, and body.departmentId
 *
 * @param req - Express request
 * @returns ObjectId or null if not found
 */
function extractDepartmentId(req: Request): Types.ObjectId | null {
  const departmentId =
    req.params.departmentId ||
    (req.query.departmentId as string) ||
    req.body.departmentId;

  if (!departmentId) {
    return null;
  }

  if (!Types.ObjectId.isValid(departmentId)) {
    return null;
  }

  return new Types.ObjectId(departmentId);
}

/**
 * Middleware: Require department membership
 *
 * Verifies user has active membership in the specified department.
 * Supports role cascading from parent departments.
 *
 * Requirements:
 * - User must be authenticated (req.user must exist)
 * - departmentId must be provided in params, query, or body
 * - User must have active membership (direct or cascaded)
 *
 * Sets req.department with:
 * - departmentId: The department ObjectId
 * - departmentName: Department name
 * - departmentCode: Department code
 * - roles: Array of roles user has in this department
 * - isPrimary: Whether this is user's primary department
 * - isCascaded: Whether roles are from parent department
 * - level: Hierarchy level (0 = direct, 1+ = cascaded)
 *
 * @throws ApiError 400 if departmentId is missing or invalid
 * @throws ApiError 401 if user is not authenticated
 * @throws ApiError 403 if user is not a member of the department
 * @throws ApiError 404 if department not found
 */
export const requireDepartmentMembership = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check authentication
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    // Extract departmentId
    const departmentId = extractDepartmentId(req);
    if (!departmentId) {
      throw ApiError.badRequest('Department ID is required');
    }

    const userId = new Types.ObjectId(req.user.userId);

    // Fetch department
    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Check if department is active
    if (!department.isActive) {
      throw ApiError.forbidden('Department is not active');
    }

    // Get user's roles in this department (with cascading)
    // Try all userTypes to find membership
    let roles: string[] = [];
    let isPrimary = false;
    let isCascaded = false;
    let level = 0;

    // Check Staff membership
    const staffRoles = await RoleService.getRolesForDepartment(
      userId,
      departmentId,
      'staff'
    );
    if (staffRoles.length > 0) {
      roles = staffRoles;
    }

    // If no staff roles, check Learner membership
    if (roles.length === 0) {
      const learnerRoles = await RoleService.getRolesForDepartment(
        userId,
        departmentId,
        'learner'
      );
      if (learnerRoles.length > 0) {
        roles = learnerRoles;
      }
    }

    // Check if user has no membership in department
    if (roles.length === 0) {
      logger.warn(
        `Department membership denied: User ${userId} has no roles in department ${departmentId}`
      );
      throw ApiError.forbidden(
        'You do not have permission to access this department'
      );
    }

    // Check role cascading to determine if membership is cascaded
    const cascadedRoles = await RoleService.checkRoleCascading(
      userId,
      departmentId,
      'staff'
    );

    if (cascadedRoles.length > 0) {
      isCascaded = true;
      // Calculate level based on department hierarchy
      const parentDept = await Department.findById(department.parentDepartmentId);
      if (parentDept) {
        level = 1; // Simple implementation - could be enhanced for multi-level
      }
    }

    // Attach department context to request
    req.department = {
      departmentId,
      departmentName: department.name,
      departmentCode: department.code,
      roles,
      isPrimary,
      isCascaded,
      level
    };

    logger.debug(
      `Department membership verified: User ${userId} has roles [${roles.join(', ')}] in department ${department.name}`
    );

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Export for testing and external use
 */
export default requireDepartmentMembership;
