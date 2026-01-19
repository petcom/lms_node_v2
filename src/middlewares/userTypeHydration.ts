/**
 * User Type Hydration Middleware
 *
 * Hydrates userTypes from token strings to UserTypeObject[] with displayAs values.
 * This middleware extends the isAuthenticated middleware by transforming
 * the userTypes field from string[] to UserTypeObject[].
 *
 * Part of the LookupValues migration (Stream C - API Layer)
 *
 * Usage:
 * ```typescript
 * router.get('/api/v2/profile',
 *   isAuthenticated,
 *   hydrateUserTypes,  // Add this after isAuthenticated
 *   getProfile
 * );
 * ```
 *
 * The middleware expects req.user to already be set by isAuthenticated.
 * It transforms req.user.userTypes from string[] to UserTypeObject[].
 *
 * @module middlewares/userTypeHydration
 */

import { Request, Response, NextFunction } from 'express';
import { UserTypeObject } from '@contracts/api/lookup-values.contract';
import { UserType } from '@/models/auth/User.model';
import { logger } from '@/config/logger';

/**
 * IRoleRegistry Interface (mocked initially)
 *
 * During Stream C, we use a mock. During integration, this will be replaced
 * with the actual RoleRegistry from Stream B.
 */
export interface IRoleRegistry {
  /**
   * Convert string userTypes to UserTypeObject[] with displayAs values
   */
  hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[];

  /**
   * Get display value for a single userType
   */
  getUserTypeDisplay(userType: string): string;
}

/**
 * Extended user context with hydrated userTypes
 */
export interface HydratedAuthenticatedUser {
  userId: string;
  email: string;
  userTypes: UserTypeObject[]; // Changed from string[] to UserTypeObject[]
  userTypeStrings: string[]; // Original string array (for backward compatibility)
  allAccessRights: string[];
  canEscalateToAdmin: boolean;
  defaultDashboard: 'learner' | 'staff';
  lastSelectedDepartment?: string;
  roles?: string[]; // V1 compatibility (deprecated)
}

/**
 * Extend Express Request with hydrated user context
 */
declare global {
  namespace Express {
    interface Request {
      hydratedUser?: HydratedAuthenticatedUser;
    }
  }
}

/**
 * Mock RoleRegistry for Stream C development
 */
class MockRoleRegistry implements IRoleRegistry {
  private static readonly USER_TYPE_DISPLAY: Record<string, string> = {
    'learner': 'Learner',
    'staff': 'Staff',
    'global-admin': 'System Admin'
  };

  hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[] {
    return userTypeStrings.map(ut => ({
      _id: ut as 'learner' | 'staff' | 'global-admin',
      displayAs: this.getUserTypeDisplay(ut)
    }));
  }

  getUserTypeDisplay(userType: string): string {
    return MockRoleRegistry.USER_TYPE_DISPLAY[userType] || userType;
  }
}

/**
 * Global registry instance (will be replaced during integration)
 */
let registryInstance: IRoleRegistry = new MockRoleRegistry();

/**
 * Set the RoleRegistry instance
 *
 * This will be called during integration to replace the mock with the real registry.
 *
 * @param registry - RoleRegistry instance
 */
export function setRoleRegistry(registry: IRoleRegistry): void {
  registryInstance = registry;
}

/**
 * Get the current RoleRegistry instance
 */
export function getRoleRegistry(): IRoleRegistry {
  return registryInstance;
}

/**
 * Middleware: Hydrate User Types
 *
 * Transforms req.user.userTypes from string[] to UserTypeObject[].
 * This middleware should be used after isAuthenticated.
 *
 * Before:
 * req.user.userTypes = ['staff', 'global-admin']
 *
 * After:
 * req.hydratedUser.userTypes = [
 *   { _id: 'staff', displayAs: 'Staff' },
 *   { _id: 'global-admin', displayAs: 'System Admin' }
 * ]
 * req.hydratedUser.userTypeStrings = ['staff', 'global-admin'] // Preserved for backward compat
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * // In routes
 * router.get('/profile',
 *   isAuthenticated,
 *   hydrateUserTypes,
 *   getProfile
 * );
 *
 * // In controller
 * function getProfile(req: Request, res: Response) {
 *   const { userTypes } = req.hydratedUser;
 *   // userTypes is now UserTypeObject[]
 * }
 */
export const hydrateUserTypes = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('hydrateUserTypes middleware called without authenticated user');
      return next();
    }

    // Get userTypes from authenticated user
    const userTypeStrings = req.user.userTypes as UserType[];

    // Hydrate userTypes using registry
    const hydratedUserTypes = registryInstance.hydrateUserTypes(userTypeStrings);

    // Create hydrated user context
    const hydratedUser: HydratedAuthenticatedUser = {
      ...req.user,
      userTypes: hydratedUserTypes,
      userTypeStrings: userTypeStrings // Preserve original strings
    };

    // Attach hydrated user to request
    req.hydratedUser = hydratedUser;

    logger.debug(
      `User types hydrated: ${userTypeStrings.join(', ')} -> ${hydratedUserTypes.map(ut => ut.displayAs).join(', ')}`
    );

    next();
  } catch (error) {
    logger.error(`Error hydrating user types: ${error}`);
    next(error);
  }
};

/**
 * Middleware: Hydrate User Types In-Place
 *
 * Similar to hydrateUserTypes, but modifies req.user in-place instead of creating
 * a separate req.hydratedUser. This is useful for routes that expect the hydrated
 * format directly in req.user.
 *
 * WARNING: This mutates req.user.userTypes from string[] to UserTypeObject[].
 * Only use this if you're sure the downstream code expects UserTypeObject[].
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const hydrateUserTypesInPlace = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('hydrateUserTypesInPlace middleware called without authenticated user');
      return next();
    }

    // Get userTypes from authenticated user
    const userTypeStrings = req.user.userTypes as UserType[];

    // Hydrate userTypes using registry
    const hydratedUserTypes = registryInstance.hydrateUserTypes(userTypeStrings);

    // Store original strings for backward compatibility
    (req.user as any).userTypeStrings = userTypeStrings;

    // Replace userTypes with hydrated version
    (req.user as any).userTypes = hydratedUserTypes;

    logger.debug(
      `User types hydrated in-place: ${userTypeStrings.join(', ')} -> ${hydratedUserTypes.map(ut => ut.displayAs).join(', ')}`
    );

    next();
  } catch (error) {
    logger.error(`Error hydrating user types in-place: ${error}`);
    next(error);
  }
};

/**
 * Helper: Check if user types are already hydrated
 *
 * @param userTypes - The userTypes field from req.user
 * @returns True if userTypes are already hydrated (objects, not strings)
 */
export function areUserTypesHydrated(userTypes: any[]): userTypes is UserTypeObject[] {
  if (!userTypes || userTypes.length === 0) {
    return false;
  }

  // Check if first element has displayAs property
  return typeof userTypes[0] === 'object' && 'displayAs' in userTypes[0];
}

/**
 * Helper: Get user type strings from hydrated or non-hydrated format
 *
 * @param userTypes - UserTypeObject[] or string[]
 * @returns Array of userType strings
 */
export function getUserTypeStrings(userTypes: UserTypeObject[] | string[]): string[] {
  if (areUserTypesHydrated(userTypes)) {
    return userTypes.map(ut => ut._id);
  }
  return userTypes as string[];
}

/**
 * Export default
 */
export default hydrateUserTypes;
