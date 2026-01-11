/**
 * Auth Transform Service
 *
 * Transforms authentication responses to include hydrated UserTypeObjects
 * instead of plain string arrays.
 *
 * This service is part of the LookupValues migration (Stream C) and works
 * with the RoleRegistry to convert userTypes from string[] to UserTypeObject[].
 *
 * Key Features:
 * - Transforms login response userTypes
 * - Transforms getCurrentUser response userTypes
 * - Uses RoleRegistry for displayAs values
 * - Maintains backward compatibility during migration
 *
 * @module services/auth/auth-transform
 */

import { UserTypeObject } from '@contracts/api/lookup-values.contract';

/**
 * IRoleRegistry Interface (mocked initially, will be replaced by real RoleRegistry)
 *
 * This interface defines the contract for the RoleRegistry service.
 * During Stream C implementation, we use a mock. During integration phase,
 * this will be replaced with the actual RoleRegistry from Stream B.
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
 * Raw login response (before transformation)
 * This is the current format returned by auth.service.ts
 */
export interface RawLoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer' | 'DPoP';
  };
  userTypes: string[]; // This will be transformed
  defaultDashboard: 'learner' | 'staff';
  canEscalateToAdmin: boolean;
  departmentMemberships: any[];
  allAccessRights: string[];
  lastSelectedDepartment: string | null;
}

/**
 * Transformed login response (after transformation)
 * This is the target format per auth-v2.contract.ts
 */
export interface TransformedLoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer' | 'DPoP';
  };
  userTypes: UserTypeObject[]; // Transformed to objects
  defaultDashboard: 'learner' | 'staff';
  canEscalateToAdmin: boolean;
  departmentMemberships: any[];
  allAccessRights: string[];
  lastSelectedDepartment: string | null;
}

/**
 * Raw getCurrentUser response (before transformation)
 */
export interface RawGetCurrentUserResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
  };
  userTypes: string[]; // This will be transformed
  defaultDashboard: 'learner' | 'staff';
  canEscalateToAdmin: boolean;
  departmentMemberships: any[];
  allAccessRights: string[];
  lastSelectedDepartment: string | null;
  isAdminSessionActive: boolean;
  adminSessionExpiresAt: string | null;
}

/**
 * Transformed getCurrentUser response (after transformation)
 */
export interface TransformedGetCurrentUserResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
  };
  userTypes: UserTypeObject[]; // Transformed to objects
  defaultDashboard: 'learner' | 'staff';
  canEscalateToAdmin: boolean;
  departmentMemberships: any[];
  allAccessRights: string[];
  lastSelectedDepartment: string | null;
  isAdminSessionActive: boolean;
  adminSessionExpiresAt: string | null;
}

/**
 * Auth Transform Service
 *
 * Provides transformation methods for auth responses to convert
 * userTypes from string[] to UserTypeObject[].
 */
export class AuthTransformService {
  private registry: IRoleRegistry;

  /**
   * Create a new AuthTransformService
   *
   * @param registry - RoleRegistry instance for hydrating userTypes
   */
  constructor(registry: IRoleRegistry) {
    this.registry = registry;
  }

  /**
   * Transform login response
   *
   * Converts userTypes from string[] to UserTypeObject[] using the RoleRegistry.
   *
   * @param rawResponse - Raw login response from auth.service.ts
   * @returns Transformed response with UserTypeObject[]
   *
   * @example
   * const raw = {
   *   user: { ... },
   *   session: { ... },
   *   userTypes: ['staff', 'global-admin'],
   *   ...
   * };
   *
   * const transformed = transformService.transformLoginResponse(raw);
   * // transformed.userTypes = [
   * //   { _id: 'staff', displayAs: 'Staff' },
   * //   { _id: 'global-admin', displayAs: 'System Admin' }
   * // ]
   */
  transformLoginResponse(rawResponse: RawLoginResponse): TransformedLoginResponse {
    return {
      ...rawResponse,
      userTypes: this.registry.hydrateUserTypes(rawResponse.userTypes)
    };
  }

  /**
   * Transform getCurrentUser response
   *
   * Converts userTypes from string[] to UserTypeObject[] using the RoleRegistry.
   *
   * @param rawResponse - Raw getCurrentUser response from auth.service.ts
   * @returns Transformed response with UserTypeObject[]
   *
   * @example
   * const raw = {
   *   user: { ... },
   *   userTypes: ['learner'],
   *   ...
   * };
   *
   * const transformed = transformService.transformGetCurrentUserResponse(raw);
   * // transformed.userTypes = [
   * //   { _id: 'learner', displayAs: 'Learner' }
   * // ]
   */
  transformGetCurrentUserResponse(
    rawResponse: RawGetCurrentUserResponse
  ): TransformedGetCurrentUserResponse {
    return {
      ...rawResponse,
      userTypes: this.registry.hydrateUserTypes(rawResponse.userTypes)
    };
  }

  /**
   * Transform userTypes array directly
   *
   * Utility method for transforming just the userTypes array.
   *
   * @param userTypes - Array of userType strings
   * @returns Array of UserTypeObject with displayAs values
   *
   * @example
   * const transformed = transformService.transformUserTypes(['staff']);
   * // => [{ _id: 'staff', displayAs: 'Staff' }]
   */
  transformUserTypes(userTypes: string[]): UserTypeObject[] {
    return this.registry.hydrateUserTypes(userTypes);
  }
}

/**
 * Mock RoleRegistry for Stream C testing
 *
 * This mock will be replaced with the real RoleRegistry during integration.
 * It provides basic functionality for transforming userTypes to objects.
 */
export class MockRoleRegistry implements IRoleRegistry {
  private static readonly USER_TYPE_DISPLAY: Record<string, string> = {
    'learner': 'Learner',
    'staff': 'Staff',
    'global-admin': 'System Admin'
  };

  /**
   * Hydrate userTypes from strings to objects
   */
  hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[] {
    return userTypeStrings.map(ut => ({
      _id: ut as 'learner' | 'staff' | 'global-admin',
      displayAs: this.getUserTypeDisplay(ut)
    }));
  }

  /**
   * Get display value for a userType
   */
  getUserTypeDisplay(userType: string): string {
    return MockRoleRegistry.USER_TYPE_DISPLAY[userType] || userType;
  }
}

/**
 * Create a default AuthTransformService instance with mock registry
 *
 * This is used for Stream C development. During integration, this will be
 * replaced with a factory that uses the real RoleRegistry.
 */
export function createAuthTransformService(): AuthTransformService {
  return new AuthTransformService(new MockRoleRegistry());
}

/**
 * Export default AuthTransformService
 */
export default AuthTransformService;
