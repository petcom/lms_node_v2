/**
 * LookupValues Controller
 *
 * Handles API requests for centralized lookup values (constants).
 * Provides endpoints for querying userTypes, roles, and other enumerated values.
 *
 * Part of the LookupValues migration (Stream C - API Layer)
 *
 * Endpoints:
 * - GET /api/v2/lookup-values - List all lookup values with filters
 * - GET /api/v2/lookup-values/:lookupId - Get single lookup by ID
 * - GET /api/v2/lists/user-types - Get all user types
 * - GET /api/v2/lists/roles/:userType - Get roles for a user type
 *
 * @module controllers/lookup-values
 */

import { Request, Response, NextFunction } from 'express';
import { UserTypeObject, RoleObject } from '@contracts/api/lookup-values.contract';
import { ApiError } from '@/utils/ApiError';

/**
 * IRoleRegistry Interface (mocked initially)
 *
 * During Stream C, we use a mock. During integration, this will be replaced
 * with the actual RoleRegistry from Stream B.
 */
export interface IRoleRegistry {
  /**
   * Get all valid userTypes
   */
  getValidUserTypes(): string[];

  /**
   * Get all valid roles for a userType
   */
  getValidRolesForUserType(userType: string): string[];

  /**
   * Check if a userType is valid
   */
  isValidUserType(userType: string): boolean;

  /**
   * Get display value for a userType
   */
  getUserTypeDisplay(userType: string): string;

  /**
   * Get display value for a role
   */
  getRoleDisplay(role: string): string;

  /**
   * Convert userTypes to objects
   */
  hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[];
}

/**
 * Mock RoleRegistry for Stream C development
 *
 * This provides a simple in-memory implementation for testing.
 * Will be replaced with real RoleRegistry during integration.
 */
class MockRoleRegistry implements IRoleRegistry {
  private static readonly USER_TYPES = ['learner', 'staff', 'global-admin'];

  private static readonly USER_TYPE_DISPLAY: Record<string, string> = {
    'learner': 'Learner',
    'staff': 'Staff',
    'global-admin': 'System Admin'
  };

  private static readonly ROLES_BY_USER_TYPE: Record<string, string[]> = {
    'learner': ['course-taker', 'auditor', 'learner-supervisor'],
    'staff': ['instructor', 'department-admin', 'content-admin', 'billing-admin'],
    'global-admin': ['system-admin', 'enrollment-admin', 'course-admin', 'theme-admin', 'financial-admin']
  };

  private static readonly ROLE_DISPLAY: Record<string, string> = {
    // Learner roles
    'course-taker': 'Course Taker',
    'auditor': 'Auditor',
    'learner-supervisor': 'Learner Supervisor',
    // Staff roles
    'instructor': 'Instructor',
    'department-admin': 'Department Admin',
    'content-admin': 'Content Admin',
    'billing-admin': 'Billing Admin',
    // GlobalAdmin roles
    'system-admin': 'System Admin',
    'enrollment-admin': 'Enrollment Admin',
    'course-admin': 'Course Admin',
    'theme-admin': 'Theme Admin',
    'financial-admin': 'Financial Admin'
  };

  getValidUserTypes(): string[] {
    return [...MockRoleRegistry.USER_TYPES];
  }

  getValidRolesForUserType(userType: string): string[] {
    return MockRoleRegistry.ROLES_BY_USER_TYPE[userType] || [];
  }

  isValidUserType(userType: string): boolean {
    return MockRoleRegistry.USER_TYPES.includes(userType);
  }

  getUserTypeDisplay(userType: string): string {
    return MockRoleRegistry.USER_TYPE_DISPLAY[userType] || userType;
  }

  getRoleDisplay(role: string): string {
    return MockRoleRegistry.ROLE_DISPLAY[role] || role;
  }

  hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[] {
    return userTypeStrings.map(ut => ({
      _id: ut as 'learner' | 'staff' | 'global-admin',
      displayAs: this.getUserTypeDisplay(ut)
    }));
  }
}

/**
 * LookupValues Controller Class
 *
 * Handles all lookup-values related API requests.
 */
export class LookupValuesController {
  private static registry: IRoleRegistry = new MockRoleRegistry();

  /**
   * Set the RoleRegistry instance
   *
   * This will be called during integration to replace the mock with the real registry.
   *
   * @param registry - RoleRegistry instance
   */
  static setRegistry(registry: IRoleRegistry): void {
    LookupValuesController.registry = registry;
  }

  /**
   * GET /api/v2/lookup-values
   *
   * List all lookup values with optional filtering.
   *
   * Query parameters:
   * - category: Filter by category (userType, role)
   * - parentLookupId: Filter by parent (e.g., 'userType.staff')
   * - isActive: Filter by active status (default: true)
   *
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function
   */
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, parentLookupId, isActive } = req.query;

      // Note: This is a placeholder implementation.
      // In integration phase, this will query the LookupValue model.
      // For now, we return mock data based on the registry.

      let data: any[] = [];

      // If parentLookupId is specified, only return roles (not userTypes)
      if (!parentLookupId && (category === 'userType' || !category)) {
        // Get all userTypes
        const userTypes = LookupValuesController.registry.getValidUserTypes();
        const userTypeRecords = userTypes.map((ut, index) => ({
          _id: `mock-id-${ut}`,
          lookupId: `userType.${ut}`,
          category: 'userType',
          key: ut,
          parentLookupId: null,
          displayAs: LookupValuesController.registry.getUserTypeDisplay(ut),
          sortOrder: index + 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        data.push(...userTypeRecords);
      }

      if (category === 'role' || !category || parentLookupId) {
        // Get all roles (or filtered by parent)
        const userTypes = LookupValuesController.registry.getValidUserTypes();
        let roleIndex = 1;

        for (const ut of userTypes) {
          const utLookupId = `userType.${ut}`;

          // Skip if parentLookupId filter doesn't match
          if (parentLookupId && parentLookupId !== utLookupId) {
            continue;
          }

          const roles = LookupValuesController.registry.getValidRolesForUserType(ut);
          const roleRecords = roles.map(role => ({
            _id: `mock-id-${role}`,
            lookupId: `role.${role}`,
            category: 'role',
            key: role,
            parentLookupId: utLookupId,
            displayAs: LookupValuesController.registry.getRoleDisplay(role),
            sortOrder: roleIndex++,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          data.push(...roleRecords);
        }
      }

      // Apply isActive filter
      if (isActive !== undefined) {
        const activeFilter = isActive === 'true' || isActive === true;
        data = data.filter(item => item.isActive === activeFilter);
      }

      res.json({
        success: true,
        data,
        count: data.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/lookup-values/:lookupId
   *
   * Get a single lookup value by its lookupId.
   *
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function
   */
  static async getByLookupId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lookupId } = req.params;

      // Parse lookupId (format: "category.key")
      const [category, key] = lookupId.split('.');

      if (!category || !key) {
        throw ApiError.badRequest('Invalid lookupId format. Expected: category.key');
      }

      let record: any = null;

      if (category === 'userType') {
        if (LookupValuesController.registry.isValidUserType(key)) {
          record = {
            _id: `mock-id-${key}`,
            lookupId: `userType.${key}`,
            category: 'userType',
            key,
            parentLookupId: null,
            displayAs: LookupValuesController.registry.getUserTypeDisplay(key),
            sortOrder: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      } else if (category === 'role') {
        // Check all userTypes for this role
        const userTypes = LookupValuesController.registry.getValidUserTypes();
        for (const ut of userTypes) {
          const roles = LookupValuesController.registry.getValidRolesForUserType(ut);
          if (roles.includes(key)) {
            record = {
              _id: `mock-id-${key}`,
              lookupId: `role.${key}`,
              category: 'role',
              key,
              parentLookupId: `userType.${ut}`,
              displayAs: LookupValuesController.registry.getRoleDisplay(key),
              sortOrder: 1,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            break;
          }
        }
      }

      if (!record) {
        throw ApiError.notFound('Lookup value not found');
      }

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/lists/user-types
   *
   * Get all active user types as UserTypeObject[].
   * This is a convenience endpoint for UI consumption.
   *
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function
   */
  static async listUserTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userTypes = LookupValuesController.registry.getValidUserTypes();
      const userTypeObjects: UserTypeObject[] = userTypes.map(ut => ({
        _id: ut as 'learner' | 'staff' | 'global-admin',
        displayAs: LookupValuesController.registry.getUserTypeDisplay(ut)
      }));

      res.json({
        success: true,
        data: userTypeObjects
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v2/lists/roles/:userType
   *
   * Get all valid roles for a specific user type.
   * Returns roles as RoleObject[] with displayAs values.
   *
   * @param req - Express request
   * @param res - Express response
   * @param next - Express next function
   */
  static async listRolesForUserType(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userType } = req.params;

      // Validate userType
      if (!LookupValuesController.registry.isValidUserType(userType)) {
        throw ApiError.badRequest(
          `Invalid user type: ${userType}. Valid types: learner, staff, global-admin`
        );
      }

      // Get roles for this userType
      const roles = LookupValuesController.registry.getValidRolesForUserType(userType);
      const roleObjects: RoleObject[] = roles.map(role => ({
        _id: role,
        displayAs: LookupValuesController.registry.getRoleDisplay(role)
      }));

      res.json({
        success: true,
        data: roleObjects
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Export controller methods
 */
export const {
  list,
  getByLookupId,
  listUserTypes,
  listRolesForUserType
} = LookupValuesController;

/**
 * Export default
 */
export default LookupValuesController;
