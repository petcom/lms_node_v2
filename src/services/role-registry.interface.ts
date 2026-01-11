/**
 * RoleRegistry Interface
 *
 * Defines the contract for the RoleRegistry service which provides
 * centralized access to user types and roles loaded from the LookupValue collection.
 *
 * The RoleRegistry:
 * - Initializes on server startup
 * - Caches lookup values in memory for fast access
 * - Provides validation methods for userTypes and roles
 * - Transforms string userTypes to UserTypeObject[] format
 * - Can be refreshed without server restart
 *
 * Reference: devdocs/plans/UserType_Validation_Lookup_Migration_Plan.md Section 3.2
 */

/**
 * UserType object format for API responses
 * Replaces string[] userTypes with enriched objects
 */
export interface UserTypeObject {
  /**
   * The userType key (matches LookupValue.key)
   */
  _id: 'learner' | 'staff' | 'global-admin';

  /**
   * Human-readable display label (from LookupValue.displayAs)
   */
  displayAs: string;
}

/**
 * Role object format for department memberships
 */
export interface RoleObject {
  /**
   * The role key (matches LookupValue.key)
   */
  _id: string;

  /**
   * Human-readable display label (from LookupValue.displayAs)
   */
  displayAs: string;
}

/**
 * RoleRegistry Interface
 *
 * Provides centralized access to userType and role lookups
 * with in-memory caching for performance.
 */
export interface IRoleRegistry {
  /**
   * Initialize the registry by loading all lookup values from the database
   * This should be called during server startup, before accepting requests.
   *
   * @throws Error if no lookup values found or database error occurs
   */
  initialize(): Promise<void>;

  /**
   * Check if the registry has been successfully initialized
   *
   * @returns true if registry is loaded and ready to use
   */
  isInitialized(): boolean;

  /**
   * Get all valid user type keys
   *
   * @returns Array of valid userType keys ['learner', 'staff', 'global-admin']
   * @throws Error if registry not initialized
   */
  getValidUserTypes(): string[];

  /**
   * Get all valid roles for a specific user type
   *
   * @param userType - The user type key ('learner', 'staff', 'global-admin')
   * @returns Array of valid role keys for that userType
   * @throws Error if registry not initialized
   */
  getValidRolesForUserType(userType: string): string[];

  /**
   * Check if a userType key is valid
   *
   * @param userType - The user type key to validate
   * @returns true if userType is valid
   */
  isValidUserType(userType: string): boolean;

  /**
   * Check if a role is valid for a specific user type
   *
   * @param userType - The user type key
   * @param role - The role key to validate
   * @returns true if role is valid for that userType
   */
  isValidRoleForUserType(userType: string, role: string): boolean;

  /**
   * Get the display label for any lookup by its lookupId
   *
   * @param lookupId - The lookupId in format "category.key" (e.g., "userType.staff")
   * @returns The display label or the lookupId if not found
   */
  getDisplayAs(lookupId: string): string;

  /**
   * Get the display label for a user type
   *
   * @param userType - The user type key
   * @returns The display label or the userType if not found
   */
  getUserTypeDisplay(userType: string): string;

  /**
   * Get the display label for a role
   *
   * @param role - The role key
   * @returns The display label or the role if not found
   */
  getRoleDisplay(role: string): string;

  /**
   * Transform string userTypes to UserTypeObject[] format
   * This is used in API responses to provide enriched userType data
   *
   * @param userTypeStrings - Array of userType keys ['learner', 'staff']
   * @returns Array of UserTypeObject with _id and displayAs
   * @example
   * hydrateUserTypes(['learner', 'staff'])
   * // Returns: [
   * //   { _id: 'learner', displayAs: 'Learner' },
   * //   { _id: 'staff', displayAs: 'Staff' }
   * // ]
   */
  hydrateUserTypes(userTypeStrings: string[]): UserTypeObject[];

  /**
   * Transform role strings to RoleObject[] format
   * This is used in API responses to provide enriched role data
   *
   * @param roleStrings - Array of role keys
   * @returns Array of RoleObject with _id and displayAs
   */
  hydrateRoles(roleStrings: string[]): RoleObject[];

  /**
   * Refresh the registry by reloading all lookup values from the database
   * This allows runtime updates without server restart
   *
   * @throws Error if database error occurs
   */
  refresh(): Promise<void>;
}
