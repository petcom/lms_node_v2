/**
 * Department Membership Validator Factory
 *
 * Provides validation functions for department membership roles.
 * Uses RoleRegistry to validate roles against database-loaded lookup values
 * instead of hardcoded constants.
 *
 * This factory pattern allows:
 * - Dependency injection of RoleRegistry for testing
 * - Dynamic validation based on database values
 * - Consistent validation across Staff, Learner, and GlobalAdmin models
 * - Easy integration with Mongoose validators
 *
 * Reference: devdocs/plans/UserType_Validation_Lookup_Migration_Plan.md Section 3.4
 */

import { IRoleRegistry } from '../services/role-registry.interface';

/**
 * Validation result with detailed error information
 */
export interface RoleValidationResult {
  /**
   * Whether all roles are valid for the userType
   */
  isValid: boolean;

  /**
   * Array of invalid role keys (empty if all valid)
   */
  invalidRoles: string[];

  /**
   * Human-readable error message (null if valid)
   */
  errorMessage: string | null;
}

/**
 * Validate roles for a specific user type
 *
 * This is the core validation logic used by all validator functions.
 * It checks each role against the RoleRegistry to ensure it's valid
 * for the specified userType.
 *
 * @param registry - The RoleRegistry instance to use for validation
 * @param userType - The user type to validate against ('learner', 'staff', 'global-admin')
 * @param roles - Array of role keys to validate
 * @returns Validation result with details
 *
 * @example
 * const result = validateRolesForUserType(registry, 'staff', ['instructor', 'invalid-role']);
 * if (!result.isValid) {
 *   console.error(result.errorMessage);
 *   // "Invalid staff roles: invalid-role. Valid roles are: instructor, department-admin, content-admin, billing-admin"
 * }
 */
export function validateRolesForUserType(
  registry: IRoleRegistry,
  userType: string,
  roles: string[]
): RoleValidationResult {
  // Empty roles array is invalid
  if (!roles || roles.length === 0) {
    return {
      isValid: false,
      invalidRoles: [],
      errorMessage: `At least one role is required for ${userType}`
    };
  }

  // Check if userType is valid
  if (!registry.isValidUserType(userType)) {
    return {
      isValid: false,
      invalidRoles: roles,
      errorMessage: `Invalid user type: ${userType}`
    };
  }

  // Get valid roles for this userType
  const validRoles = registry.getValidRolesForUserType(userType);

  // Find invalid roles
  const invalidRoles = roles.filter(role => !validRoles.includes(role));

  if (invalidRoles.length > 0) {
    const userTypeDisplay = registry.getUserTypeDisplay(userType);
    return {
      isValid: false,
      invalidRoles,
      errorMessage: `Invalid ${userTypeDisplay} role(s): ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`
    };
  }

  // All roles are valid
  return {
    isValid: true,
    invalidRoles: [],
    errorMessage: null
  };
}

/**
 * Create a Mongoose validator function for a specific user type
 *
 * This factory function creates a validator that can be used directly
 * in Mongoose schemas. The validator uses the RoleRegistry to perform
 * dynamic validation based on database values.
 *
 * @param registry - The RoleRegistry instance to use for validation
 * @param userType - The user type to validate against
 * @returns Mongoose validator function that returns boolean
 *
 * @example
 * // In Staff.model.ts
 * import { RoleRegistry } from '../services/role-registry.service';
 * import { createMongooseValidator } from '../validators/department-membership.validator';
 *
 * const staffSchema = new Schema({
 *   departmentMemberships: {
 *     type: [departmentMembershipSchema],
 *     validate: {
 *       validator: function(memberships) {
 *         const validator = createMongooseValidator(RoleRegistry.getInstance(), 'staff');
 *         return memberships.every(m => validator(m.roles));
 *       },
 *       message: 'Invalid staff roles in department memberships'
 *     }
 *   }
 * });
 */
export function createMongooseValidator(
  registry: IRoleRegistry,
  userType: string
): (roles: string[]) => boolean {
  return function(roles: string[]): boolean {
    const result = validateRolesForUserType(registry, userType, roles);
    return result.isValid;
  };
}

/**
 * Create a detailed Mongoose validator with custom error message
 *
 * Similar to createMongooseValidator but allows the error message
 * to be dynamically generated based on the validation result.
 *
 * @param registry - The RoleRegistry instance to use for validation
 * @param userType - The user type to validate against
 * @returns Object with validator function and message function
 *
 * @example
 * // In Learner.model.ts
 * import { RoleRegistry } from '../services/role-registry.service';
 * import { createDetailedMongooseValidator } from '../validators/department-membership.validator';
 *
 * const validator = createDetailedMongooseValidator(RoleRegistry.getInstance(), 'learner');
 *
 * const learnerSchema = new Schema({
 *   departmentMemberships: {
 *     type: [departmentMembershipSchema],
 *     validate: {
 *       validator: function(memberships) {
 *         return memberships.every(m => validator.validator(m.roles));
 *       },
 *       message: validator.message
 *     }
 *   }
 * });
 */
export function createDetailedMongooseValidator(
  registry: IRoleRegistry,
  userType: string
): {
  validator: (roles: string[]) => boolean;
  message: string;
} {
  const validRoles = registry.getValidRolesForUserType(userType);
  const userTypeDisplay = registry.getUserTypeDisplay(userType);

  return {
    validator: function(roles: string[]): boolean {
      const result = validateRolesForUserType(registry, userType, roles);
      return result.isValid;
    },
    message: `Invalid ${userTypeDisplay} role(s). Valid roles are: ${validRoles.join(', ')}`
  };
}

/**
 * Validate roles in a department membership array
 *
 * Helper function for validating roles across multiple department memberships.
 * Useful for model-level validation that checks all memberships at once.
 *
 * @param registry - The RoleRegistry instance to use for validation
 * @param userType - The user type to validate against
 * @param memberships - Array of department memberships with roles
 * @returns Validation result with details
 *
 * @example
 * const result = validateDepartmentMemberships(
 *   registry,
 *   'staff',
 *   staffDoc.departmentMemberships
 * );
 * if (!result.isValid) {
 *   throw new Error(result.errorMessage);
 * }
 */
export function validateDepartmentMemberships(
  registry: IRoleRegistry,
  userType: string,
  memberships: Array<{ roles: string[] }>
): RoleValidationResult {
  // Validate each membership's roles
  for (const membership of memberships) {
    const result = validateRolesForUserType(registry, userType, membership.roles);
    if (!result.isValid) {
      return result;
    }
  }

  // All memberships are valid
  return {
    isValid: true,
    invalidRoles: [],
    errorMessage: null
  };
}

/**
 * Get validation error message for display
 *
 * Helper function to generate a user-friendly error message
 * from a validation result.
 *
 * @param result - The validation result
 * @returns Error message string or null if valid
 */
export function getValidationErrorMessage(result: RoleValidationResult): string | null {
  return result.errorMessage;
}
