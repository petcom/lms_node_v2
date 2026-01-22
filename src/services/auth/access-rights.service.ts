/**
 * AccessRightsService
 *
 * Service for managing and checking access rights in the role-based access control system.
 * Provides methods for querying role definitions, expanding wildcards, and checking permissions.
 *
 * Features:
 * - Query access rights for single or multiple roles
 * - Expand wildcard access rights (e.g., 'system:*' -> all system rights)
 * - Check if user has specific access rights
 * - Support for wildcard matching in permission checks
 * - Caching layer for performance optimization
 *
 * @module services/auth/access-rights
 */

import { RoleDefinition } from '@/models/RoleDefinition.model';
import { AccessRight } from '@/models/AccessRight.model';
import { Cache } from '@/config/redis';
import { logger } from '@/config/logger';

/**
 * Cache TTL for role access rights mappings (5 minutes)
 */
const CACHE_TTL = 300; // 5 minutes in seconds

/**
 * Cache key prefix for role access rights
 */
const CACHE_KEY_PREFIX = 'access_rights:role:';

/**
 * Cache key for all access rights (used in wildcard expansion)
 */
const ALL_RIGHTS_CACHE_KEY = 'access_rights:all';

/**
 * AccessRightsService
 * Handles all access rights related operations
 */
export class AccessRightsService {
  /**
   * Get access rights for a single role
   *
   * Queries the RoleDefinition model to retrieve the access rights array for a given role.
   * Returns empty array if role is not found (no error thrown).
   * Results are cached for performance.
   *
   * @param roleName - Name of the role (e.g., 'instructor', 'content-admin')
   * @returns Promise<string[]> - Array of access right strings
   *
   * @example
   * const rights = await AccessRightsService.getAccessRightsForRole('instructor');
   * // Returns: ['content:courses:read', 'content:lessons:read', ...]
   */
  static async getAccessRightsForRole(roleName: string): Promise<string[]> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_KEY_PREFIX}${roleName.toLowerCase()}`;
      const cached = await Cache.get<string[]>(cacheKey);

      if (cached) {
        logger.debug(`Cache hit for role access rights: ${roleName}`);
        return cached;
      }

      // Query database
      logger.debug(`Cache miss for role access rights: ${roleName}`);
      const role = await RoleDefinition.findOne({
        name: roleName.toLowerCase(),
        isActive: true
      }).select('accessRights');

      // Return empty array if role not found
      if (!role) {
        logger.warn(`Role not found: ${roleName}`);
        return [];
      }

      const accessRights = role.accessRights || [];

      // Cache the result
      await Cache.set(cacheKey, accessRights, CACHE_TTL);

      return accessRights;
    } catch (error) {
      logger.error(`Error getting access rights for role ${roleName}:`, error);
      return [];
    }
  }

  /**
   * Get combined access rights for multiple roles
   *
   * Queries access rights for multiple roles and returns the union of all rights.
   * Duplicates are automatically removed. Gracefully handles roles that don't exist.
   *
   * @param roles - Array of role names
   * @returns Promise<string[]> - Deduplicated array of access rights
   *
   * @example
   * const rights = await AccessRightsService.getAccessRightsForRoles([
   *   'instructor',
   *   'content-admin'
   * ]);
   * // Returns union of both roles' rights with no duplicates
   */
  static async getAccessRightsForRoles(roles: string[]): Promise<string[]> {
    try {
      // Handle empty input
      if (!roles || roles.length === 0) {
        return [];
      }

      // Get access rights for each role in parallel
      const rightsArrays = await Promise.all(
        roles.map(role => this.getAccessRightsForRole(role))
      );

      // Combine all rights and deduplicate using Set
      const allRights = new Set<string>();
      for (const rightsArray of rightsArrays) {
        for (const right of rightsArray) {
          allRights.add(right);
        }
      }

      const combinedRights = Array.from(allRights);

      logger.debug(
        `Combined access rights for ${roles.length} roles: ${combinedRights.length} unique rights`
      );

      return combinedRights;
    } catch (error) {
      logger.error(`Error getting access rights for multiple roles:`, error);
      return [];
    }
  }

  /**
   * Expand wildcard access rights to all matching rights
   *
   * Takes an array of access rights that may contain wildcards (e.g., 'system:*', 'content:*')
   * and expands them to include all matching access rights from the AccessRight model.
   *
   * Examples:
   * - 'system:*' expands to all rights starting with 'system:'
   * - 'content:courses:*' would expand to all actions on content:courses
   * - Non-wildcard rights are returned as-is
   *
   * @param rights - Array of access rights (may include wildcards)
   * @returns Promise<string[]> - Expanded array with wildcards replaced by actual rights
   *
   * @example
   * const rights = ['content:courses:read', 'system:*'];
   * const expanded = await AccessRightsService.expandWildcards(rights);
   * // Returns: ['content:courses:read', 'system:settings:read', 'system:settings:write', ...]
   */
  static async expandWildcards(rights: string[]): Promise<string[]> {
    try {
      // Handle empty input
      if (!rights || rights.length === 0) {
        return [];
      }

      // Separate wildcards from regular rights
      const wildcardRights: string[] = [];
      const regularRights: string[] = [];

      for (const right of rights) {
        if (right.includes('*')) {
          wildcardRights.push(right);
        } else {
          regularRights.push(right);
        }
      }

      // If no wildcards, return original array
      if (wildcardRights.length === 0) {
        return rights;
      }

      // Get all available access rights from database (with caching)
      const allAvailableRights = await this.getAllAccessRights();

      // Expand each wildcard
      const expandedRights = new Set<string>(regularRights);

      for (const wildcardRight of wildcardRights) {
        // Convert wildcard pattern to matching logic
        const matchingRights = this.matchWildcardPattern(wildcardRight, allAvailableRights);

        for (const right of matchingRights) {
          expandedRights.add(right);
        }
      }

      const result = Array.from(expandedRights);

      logger.debug(
        `Expanded ${wildcardRights.length} wildcards from ${rights.length} rights to ${result.length} total rights`
      );

      return result;
    } catch (error) {
      logger.error('Error expanding wildcard access rights:', error);
      // Fallback to non-wildcard rights (filter out wildcards from original array)
      return rights.filter(right => !right.includes('*'));
    }
  }

  /**
   * Check if user has a specific access right
   *
   * Checks if the user's access rights include the required right.
   * Supports wildcard matching (e.g., user with 'system:*' has 'system:settings:read').
   *
   * @param userRights - Array of access rights the user has
   * @param required - The required access right to check
   * @returns boolean - True if user has the required right
   *
   * @example
   * const hasRight = AccessRightsService.hasAccessRight(
   *   ['content:courses:read', 'system:*'],
   *   'system:settings:read'
   * );
   * // Returns: true (because 'system:*' matches)
   */
  static hasAccessRight(userRights: string[], required: string): boolean {
    try {
      // Handle empty cases
      if (!userRights || userRights.length === 0) {
        return false;
      }

      if (!required) {
        return false;
      }

      // Check for exact match first (most common case)
      if (userRights.includes(required)) {
        return true;
      }

      // Check for wildcard matches
      for (const userRight of userRights) {
        if (this.matchesWildcard(userRight, required)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error(`Error checking access right ${required}:`, error);
      return false;
    }
  }

  /**
   * Check if user has ANY of the required access rights
   *
   * Returns true if the user has at least one of the required rights.
   * Supports wildcard matching.
   *
   * @param userRights - Array of access rights the user has
   * @param required - Array of required access rights (user needs at least one)
   * @returns boolean - True if user has at least one of the required rights
   *
   * @example
   * const hasAny = AccessRightsService.hasAnyAccessRight(
   *   ['content:courses:read'],
   *   ['content:courses:write', 'content:courses:read']
   * );
   * // Returns: true (has the read right)
   */
  static hasAnyAccessRight(userRights: string[], required: string[]): boolean {
    try {
      // Handle empty cases
      if (!userRights || userRights.length === 0) {
        return false;
      }

      if (!required || required.length === 0) {
        return false;
      }

      // Check if user has any of the required rights
      for (const requiredRight of required) {
        if (this.hasAccessRight(userRights, requiredRight)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking any access rights:', error);
      return false;
    }
  }

  /**
   * Check if user has ALL required access rights
   *
   * Returns true only if the user has every one of the required rights.
   * Supports wildcard matching.
   *
   * @param userRights - Array of access rights the user has
   * @param required - Array of required access rights (user needs all of them)
   * @returns boolean - True if user has all required rights
   *
   * @example
   * const hasAll = AccessRightsService.hasAllAccessRights(
   *   ['content:courses:read', 'content:courses:write'],
   *   ['content:courses:read', 'content:courses:write']
   * );
   * // Returns: true (has both required rights)
   */
  static hasAllAccessRights(userRights: string[], required: string[]): boolean {
    try {
      // Handle empty cases
      if (!required || required.length === 0) {
        return true; // No requirements means always authorized
      }

      if (!userRights || userRights.length === 0) {
        return false;
      }

      // Check if user has all required rights
      for (const requiredRight of required) {
        if (!this.hasAccessRight(userRights, requiredRight)) {
          return false; // Missing at least one required right
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking all access rights:', error);
      return false;
    }
  }

  /**
   * Clear cached access rights for a specific role
   *
   * Useful when a role's access rights are updated.
   *
   * @param roleName - Name of the role to clear from cache
   * @returns Promise<void>
   */
  static async clearRoleCache(roleName: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${roleName.toLowerCase()}`;
      await Cache.del(cacheKey);
      logger.debug(`Cleared cache for role: ${roleName}`);
    } catch (error) {
      logger.error(`Error clearing cache for role ${roleName}:`, error);
    }
  }

  /**
   * Clear all cached access rights
   *
   * Useful when role definitions or access rights are bulk updated.
   *
   * @returns Promise<void>
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Clear all role caches
      await Cache.delPattern(`${CACHE_KEY_PREFIX}*`);
      // Clear all rights cache
      await Cache.del(ALL_RIGHTS_CACHE_KEY);
      logger.info('Cleared all access rights caches');
    } catch (error) {
      logger.error('Error clearing all access rights caches:', error);
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get all available access rights from the database
   *
   * @private
   * @returns Promise<string[]> - Array of all access right names
   */
  private static async getAllAccessRights(): Promise<string[]> {
    try {
      // Check cache first
      const cached = await Cache.get<string[]>(ALL_RIGHTS_CACHE_KEY);

      if (cached) {
        logger.debug('Cache hit for all access rights');
        return cached;
      }

      // Query database
      logger.debug('Cache miss for all access rights');
      const accessRights = await AccessRight.find({ isActive: true })
        .select('name')
        .lean();

      const rightNames = accessRights.map(ar => ar.name);

      // Cache the result (longer TTL since this changes rarely)
      await Cache.set(ALL_RIGHTS_CACHE_KEY, rightNames, CACHE_TTL * 2);

      return rightNames;
    } catch (error) {
      logger.error('Error getting all access rights:', error);
      return [];
    }
  }

  /**
   * Match a wildcard pattern against all available rights
   *
   * @private
   * @param wildcardPattern - Pattern with wildcard (e.g., 'system:*')
   * @param allRights - All available access rights
   * @returns string[] - Rights that match the pattern
   */
  private static matchWildcardPattern(wildcardPattern: string, allRights: string[]): string[] {
    try {
      // Handle system:* - matches everything
      if (wildcardPattern === 'system:*') {
        return allRights;
      }

      // Handle domain:* pattern (e.g., 'content:*')
      if (wildcardPattern.endsWith(':*')) {
        const domain = wildcardPattern.replace(':*', '');
        return allRights.filter(right => right.startsWith(`${domain}:`));
      }

      // Handle domain:resource:* pattern (e.g., 'content:courses:*')
      const parts = wildcardPattern.split(':');
      if (parts.length === 3 && parts[2] === '*') {
        const prefix = `${parts[0]}:${parts[1]}:`;
        return allRights.filter(right => right.startsWith(prefix));
      }

      // If pattern doesn't match expected formats, return empty array
      logger.warn(`Unexpected wildcard pattern: ${wildcardPattern}`);
      return [];
    } catch (error) {
      logger.error(`Error matching wildcard pattern ${wildcardPattern}:`, error);
      return [];
    }
  }

  /**
   * Check if a user's right (potentially with wildcard) matches a required right
   *
   * @private
   * @param userRight - User's access right (may contain wildcard)
   * @param requiredRight - The specific right being checked
   * @returns boolean - True if the user right matches the required right
   */
  private static matchesWildcard(userRight: string, requiredRight: string): boolean {
    try {
      // Exact match
      if (userRight === requiredRight) {
        return true;
      }

      // No wildcard in user right
      if (!userRight.includes('*')) {
        return false;
      }

      // system:* matches everything
      if (userRight === 'system:*') {
        return true;
      }

      // domain:* matches domain:anything
      if (userRight.endsWith(':*')) {
        const domain = userRight.replace(':*', '');
        return requiredRight.startsWith(`${domain}:`);
      }

      // domain:resource:* matches domain:resource:anything
      const parts = userRight.split(':');
      if (parts.length === 3 && parts[2] === '*') {
        const prefix = `${parts[0]}:${parts[1]}:`;
        return requiredRight.startsWith(prefix);
      }

      return false;
    } catch (error) {
      logger.error(`Error checking wildcard match:`, error);
      return false;
    }
  }
}

export default AccessRightsService;
