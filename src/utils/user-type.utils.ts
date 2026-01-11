/**
 * UserType Transformation Utilities
 *
 * Provides utility functions for transforming userTypes between different formats:
 * - string[] ↔ UserTypeObject[]
 * - Display label lookups
 * - Validation helpers
 *
 * These utilities are used primarily for:
 * - API response transformation (login, /me endpoints)
 * - Middleware hydration (converting JWT userTypes to objects)
 * - Frontend compatibility (providing displayAs labels)
 *
 * Reference:
 * - devdocs/plans/UserType_Validation_Lookup_Migration_Plan.md Section 3
 * - contracts/api/lookup-values.contract.ts
 */

/**
 * UserType object format for API responses
 */
export interface UserTypeObject {
  /**
   * The userType key (matches LookupValue.key)
   */
  _id: 'learner' | 'staff' | 'global-admin';

  /**
   * Human-readable display label
   */
  displayAs: string;
}

/**
 * Role object format for department memberships
 */
export interface RoleObject {
  /**
   * The role key
   */
  _id: string;

  /**
   * Human-readable display label
   */
  displayAs: string;
}

/**
 * Default display labels for user types
 * These are fallbacks when RoleRegistry is not available
 */
export const USER_TYPE_DISPLAY: Record<string, string> = {
  'learner': 'Learner',
  'staff': 'Staff',
  'global-admin': 'System Admin'
};

/**
 * Default display labels for roles
 * These are fallbacks when RoleRegistry is not available
 */
export const ROLE_DISPLAY: Record<string, string> = {
  // Staff Roles
  'instructor': 'Instructor',
  'department-admin': 'Department Admin',
  'content-admin': 'Content Admin',
  'billing-admin': 'Billing Admin',
  // Learner Roles
  'course-taker': 'Course Taker',
  'auditor': 'Auditor',
  'learner-supervisor': 'Learner Supervisor',
  // GlobalAdmin Roles
  'system-admin': 'System Admin',
  'enrollment-admin': 'Enrollment Admin',
  'course-admin': 'Course Admin',
  'theme-admin': 'Theme Admin',
  'financial-admin': 'Financial Admin'
};

/**
 * Convert string userTypes to UserTypeObject[]
 *
 * Transforms an array of userType strings into enriched objects
 * with display labels. Used in API responses.
 *
 * @param userTypeStrings - Array of userType keys ['learner', 'staff']
 * @returns Array of UserTypeObject with _id and displayAs
 *
 * @example
 * const userTypes = toUserTypeObjects(['learner', 'staff']);
 * // Returns: [
 * //   { _id: 'learner', displayAs: 'Learner' },
 * //   { _id: 'staff', displayAs: 'Staff' }
 * // ]
 */
export function toUserTypeObjects(userTypeStrings: string[]): UserTypeObject[] {
  if (!Array.isArray(userTypeStrings)) {
    return [];
  }

  return userTypeStrings.map(ut => ({
    _id: ut as any,
    displayAs: USER_TYPE_DISPLAY[ut] || ut
  }));
}

/**
 * Convert UserTypeObject[] back to string[]
 *
 * Extracts just the keys from UserTypeObject array.
 * Useful for reverse transformation when needed.
 *
 * @param userTypeObjects - Array of UserTypeObject
 * @returns Array of userType keys as strings
 *
 * @example
 * const keys = toUserTypeStrings([
 *   { _id: 'learner', displayAs: 'Learner' },
 *   { _id: 'staff', displayAs: 'Staff' }
 * ]);
 * // Returns: ['learner', 'staff']
 */
export function toUserTypeStrings(userTypeObjects: UserTypeObject[]): string[] {
  if (!Array.isArray(userTypeObjects)) {
    return [];
  }

  return userTypeObjects.map(uto => uto._id);
}

/**
 * Convert role strings to RoleObject[]
 *
 * Transforms an array of role strings into enriched objects
 * with display labels.
 *
 * @param roleStrings - Array of role keys
 * @returns Array of RoleObject with _id and displayAs
 *
 * @example
 * const roles = toRoleObjects(['instructor', 'department-admin']);
 * // Returns: [
 * //   { _id: 'instructor', displayAs: 'Instructor' },
 * //   { _id: 'department-admin', displayAs: 'Department Admin' }
 * // ]
 */
export function toRoleObjects(roleStrings: string[]): RoleObject[] {
  if (!Array.isArray(roleStrings)) {
    return [];
  }

  return roleStrings.map(r => ({
    _id: r,
    displayAs: ROLE_DISPLAY[r] || r
  }));
}

/**
 * Convert RoleObject[] back to string[]
 *
 * Extracts just the keys from RoleObject array.
 *
 * @param roleObjects - Array of RoleObject
 * @returns Array of role keys as strings
 *
 * @example
 * const keys = toRoleStrings([
 *   { _id: 'instructor', displayAs: 'Instructor' }
 * ]);
 * // Returns: ['instructor']
 */
export function toRoleStrings(roleObjects: RoleObject[]): string[] {
  if (!Array.isArray(roleObjects)) {
    return [];
  }

  return roleObjects.map(ro => ro._id);
}

/**
 * Get display label for a user type
 *
 * @param userType - The user type key
 * @returns Display label or the key itself if not found
 *
 * @example
 * getUserTypeDisplay('staff'); // Returns: "Staff"
 * getUserTypeDisplay('unknown'); // Returns: "unknown"
 */
export function getUserTypeDisplay(userType: string): string {
  return USER_TYPE_DISPLAY[userType] || userType;
}

/**
 * Get display label for a role
 *
 * @param role - The role key
 * @returns Display label or the key itself if not found
 *
 * @example
 * getRoleDisplay('instructor'); // Returns: "Instructor"
 * getRoleDisplay('unknown'); // Returns: "unknown"
 */
export function getRoleDisplay(role: string): string {
  return ROLE_DISPLAY[role] || role;
}

/**
 * Check if a string is a valid userType key
 *
 * @param value - The value to check
 * @returns true if value is a valid userType key
 *
 * @example
 * isValidUserType('staff'); // Returns: true
 * isValidUserType('invalid'); // Returns: false
 */
export function isValidUserType(value: string): boolean {
  return value in USER_TYPE_DISPLAY;
}

/**
 * Check if a string is a valid role key
 *
 * @param value - The value to check
 * @returns true if value is a valid role key
 *
 * @example
 * isValidRole('instructor'); // Returns: true
 * isValidRole('invalid'); // Returns: false
 */
export function isValidRole(value: string): boolean {
  return value in ROLE_DISPLAY;
}

/**
 * Validate and transform userTypes with error handling
 *
 * Safely converts userTypes to objects, filtering out invalid values.
 * Useful when data integrity is uncertain.
 *
 * @param userTypeStrings - Array of userType keys (may contain invalid values)
 * @returns Object with valid UserTypeObjects and array of invalid keys
 *
 * @example
 * const result = validateAndTransformUserTypes(['learner', 'invalid', 'staff']);
 * // Returns: {
 * //   valid: [
 * //     { _id: 'learner', displayAs: 'Learner' },
 * //     { _id: 'staff', displayAs: 'Staff' }
 * //   ],
 * //   invalid: ['invalid']
 * // }
 */
export function validateAndTransformUserTypes(
  userTypeStrings: string[]
): {
  valid: UserTypeObject[];
  invalid: string[];
} {
  if (!Array.isArray(userTypeStrings)) {
    return { valid: [], invalid: [] };
  }

  const valid: UserTypeObject[] = [];
  const invalid: string[] = [];

  for (const ut of userTypeStrings) {
    if (isValidUserType(ut)) {
      valid.push({
        _id: ut as any,
        displayAs: USER_TYPE_DISPLAY[ut]
      });
    } else {
      invalid.push(ut);
    }
  }

  return { valid, invalid };
}

/**
 * Hydrate department memberships with role display names
 *
 * Transforms department membership objects to include displayAs for roles.
 * Useful for API responses that need to show role labels.
 *
 * @param memberships - Array of department membership objects
 * @returns Hydrated memberships with role objects instead of strings
 *
 * @example
 * const hydrated = hydrateDepartmentMemberships([
 *   {
 *     departmentId: '123',
 *     roles: ['instructor', 'content-admin'],
 *     isPrimary: true
 *   }
 * ]);
 * // Returns: [{
 * //   departmentId: '123',
 * //   roles: [
 * //     { _id: 'instructor', displayAs: 'Instructor' },
 * //     { _id: 'content-admin', displayAs: 'Content Admin' }
 * //   ],
 * //   isPrimary: true
 * // }]
 */
export function hydrateDepartmentMemberships<T extends { roles: string[] }>(
  memberships: T[]
): Array<Omit<T, 'roles'> & { roles: RoleObject[] }> {
  if (!Array.isArray(memberships)) {
    return [];
  }

  return memberships.map(m => ({
    ...m,
    roles: toRoleObjects(m.roles)
  }));
}
