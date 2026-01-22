/**
 * Permission Cache Utility
 *
 * Redis-based caching layer for user permissions as part of the
 * Unified Authorization Model (Phase 1).
 *
 * Cache Key Schema:
 * - auth:permissions:{userId}     - User's computed permissions
 * - auth:user:{userId}:version    - User's permission version (for cache invalidation)
 *
 * @see agent_coms/api/specs/UNIFIED_AUTHORIZATION_MODEL.md
 * @see contracts/api/authorization.contract.ts
 */

import { redis, isRedisAvailable, Cache } from '@/config/redis';
import { logger } from '@/config/logger';

// ============================================================================
// TYPES (inlined from contracts/api/authorization.contract.ts)
// ============================================================================

/**
 * Permission scope types
 */
type PermissionScope = '*' | `dept:${string}` | 'own';

/**
 * A single permission with its scope
 */
interface Permission {
  right: string;
  scope: PermissionScope;
  source: {
    role: string;
    departmentId?: string;
  };
}

/**
 * User's computed permissions (cached structure)
 */
export interface UserPermissions {
  userId: string;
  permissions: Permission[];
  globalRights: string[];
  departmentRights: Record<string, string[]>;
  departmentHierarchy: Record<string, string[]>;
  computedAt: string;
  expiresAt: string;
  version: number;
}

// ============================================================================
// CACHE KEY CONSTANTS
// ============================================================================

/**
 * Cache key for user permissions
 * Format: auth:permissions:{userId}
 */
const USER_PERMISSIONS_KEY = (userId: string) => `auth:permissions:${userId}`;

/**
 * Cache key for user permission version
 * Format: auth:user:{userId}:version
 */
const USER_VERSION_KEY = (userId: string) => `auth:user:${userId}:version`;

/**
 * Pattern for all permission cache keys (used for bulk invalidation)
 */
const ALL_PERMISSIONS_PATTERN = 'auth:permissions:*';

/**
 * TTL for user permissions cache in seconds (15 minutes)
 */
const PERMISSIONS_TTL = 900;

// ============================================================================
// CACHE FUNCTIONS
// ============================================================================

/**
 * Get cached user permissions
 *
 * Retrieves the user's computed permissions from Redis cache.
 * Returns null if not cached or Redis is unavailable.
 *
 * @param userId - The user ID to get permissions for
 * @returns The cached permissions or null if not found/unavailable
 *
 * @example
 * const permissions = await getUserPermissions('user-123');
 * if (permissions) {
 *   console.log('Cache hit:', permissions.globalRights);
 * }
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  if (!isRedisAvailable()) {
    logger.debug(`[PermissionCache] Redis unavailable, skipping cache lookup for user ${userId}`);
    return null;
  }

  try {
    const cacheKey = USER_PERMISSIONS_KEY(userId);
    const cached = await Cache.get<UserPermissions>(cacheKey);

    if (cached) {
      logger.debug(`[PermissionCache] Cache HIT for user ${userId}`);
      return cached;
    }

    logger.debug(`[PermissionCache] Cache MISS for user ${userId}`);
    return null;
  } catch (error) {
    logger.error(`[PermissionCache] Error getting permissions for user ${userId}:`, error);
    return null;
  }
}

/**
 * Set user permissions in cache
 *
 * Stores the user's computed permissions in Redis with a 15-minute TTL.
 * Silently fails if Redis is unavailable (graceful degradation).
 *
 * @param userId - The user ID to set permissions for
 * @param permissions - The computed permissions to cache
 *
 * @example
 * await setUserPermissions('user-123', {
 *   userId: 'user-123',
 *   permissions: [...],
 *   globalRights: ['system:settings:read'],
 *   departmentRights: { 'dept-123': ['content:courses:read'] },
 *   departmentHierarchy: {},
 *   computedAt: new Date().toISOString(),
 *   expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
 *   version: 1
 * });
 */
export async function setUserPermissions(
  userId: string,
  permissions: UserPermissions
): Promise<void> {
  if (!isRedisAvailable()) {
    logger.debug(`[PermissionCache] Redis unavailable, skipping cache set for user ${userId}`);
    return;
  }

  try {
    const cacheKey = USER_PERMISSIONS_KEY(userId);
    await Cache.set(cacheKey, permissions, PERMISSIONS_TTL);
    logger.debug(`[PermissionCache] Cached permissions for user ${userId} (TTL: ${PERMISSIONS_TTL}s)`);
  } catch (error) {
    logger.error(`[PermissionCache] Error setting permissions for user ${userId}:`, error);
  }
}

/**
 * Invalidate cached permissions for a specific user
 *
 * Deletes the user's cached permissions from Redis.
 * Should be called when:
 * - User's role membership changes
 * - User's department membership changes
 * - User logs out
 *
 * @param userId - The user ID to invalidate permissions for
 *
 * @example
 * // After updating user's roles
 * await invalidateUserPermissions('user-123');
 */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  if (!isRedisAvailable()) {
    logger.debug(`[PermissionCache] Redis unavailable, skipping invalidation for user ${userId}`);
    return;
  }

  try {
    const cacheKey = USER_PERMISSIONS_KEY(userId);
    await Cache.del(cacheKey);
    logger.info(`[PermissionCache] Invalidated permissions for user ${userId}`);
  } catch (error) {
    logger.error(`[PermissionCache] Error invalidating permissions for user ${userId}:`, error);
  }
}

/**
 * Invalidate all cached permissions
 *
 * Clears all user permission caches from Redis.
 * Should be called when:
 * - Role definitions are updated
 * - Department hierarchy changes
 * - System-wide permission recalculation is needed
 *
 * WARNING: This can be expensive if many users are cached.
 * Use sparingly for bulk operations only.
 *
 * @example
 * // After updating role definitions
 * await invalidateAllPermissions();
 */
export async function invalidateAllPermissions(): Promise<void> {
  if (!isRedisAvailable()) {
    logger.debug('[PermissionCache] Redis unavailable, skipping bulk invalidation');
    return;
  }

  try {
    await Cache.delPattern(ALL_PERMISSIONS_PATTERN);
    logger.info('[PermissionCache] Invalidated ALL permission caches');
  } catch (error) {
    logger.error('[PermissionCache] Error invalidating all permissions:', error);
  }
}

/**
 * Get the permission version for a user
 *
 * Permission versions are used to detect when cached permissions are stale.
 * When a user's roles/memberships change, the version is incremented.
 * The JWT can include this version to validate cache freshness.
 *
 * @param userId - The user ID to get version for
 * @returns The current version number or null if not set/unavailable
 *
 * @example
 * const version = await getUserPermissionVersion('user-123');
 * if (version !== jwtPermissionVersion) {
 *   // Permissions have changed, need to recompute
 * }
 */
export async function getUserPermissionVersion(userId: string): Promise<number | null> {
  if (!isRedisAvailable()) {
    logger.debug(`[PermissionCache] Redis unavailable, skipping version lookup for user ${userId}`);
    return null;
  }

  try {
    const versionKey = USER_VERSION_KEY(userId);
    const version = await redis.get(versionKey);

    if (version === null) {
      logger.debug(`[PermissionCache] No version found for user ${userId}`);
      return null;
    }

    const versionNum = parseInt(version, 10);
    logger.debug(`[PermissionCache] Got version ${versionNum} for user ${userId}`);
    return versionNum;
  } catch (error) {
    logger.error(`[PermissionCache] Error getting version for user ${userId}:`, error);
    return null;
  }
}

/**
 * Increment the permission version for a user
 *
 * Atomically increments the user's permission version counter.
 * This should be called whenever the user's permissions change:
 * - Role assignment/removal
 * - Department membership change
 * - Role definition update (affects all users with that role)
 *
 * The new version is returned and should be included in any new JWT tokens.
 *
 * @param userId - The user ID to increment version for
 * @returns The new version number
 *
 * @example
 * // After updating user's roles
 * const newVersion = await incrementUserPermissionVersion('user-123');
 * // Include newVersion in the next JWT refresh
 */
export async function incrementUserPermissionVersion(userId: string): Promise<number> {
  if (!isRedisAvailable()) {
    logger.debug(`[PermissionCache] Redis unavailable, returning version 1 for user ${userId}`);
    return 1;
  }

  try {
    const versionKey = USER_VERSION_KEY(userId);
    const newVersion = await redis.incr(versionKey);
    logger.info(`[PermissionCache] Incremented version to ${newVersion} for user ${userId}`);
    return newVersion;
  } catch (error) {
    logger.error(`[PermissionCache] Error incrementing version for user ${userId}:`, error);
    // Return 1 as fallback - this will cause a cache refresh on next check
    return 1;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Invalidate user permissions and increment version
 *
 * Convenience function that both invalidates the cached permissions
 * and increments the version counter. Use this when user permissions change.
 *
 * @param userId - The user ID to invalidate
 * @returns The new version number
 *
 * @example
 * // After changing user's department membership
 * const newVersion = await invalidateAndIncrementVersion('user-123');
 */
export async function invalidateAndIncrementVersion(userId: string): Promise<number> {
  await invalidateUserPermissions(userId);
  return incrementUserPermissionVersion(userId);
}

/**
 * Check if cached permissions are valid against a version
 *
 * Compares the cached permission version with the expected version
 * (typically from the JWT). Returns false if versions mismatch or
 * if permissions are not cached.
 *
 * @param userId - The user ID to check
 * @param expectedVersion - The expected version (from JWT)
 * @returns True if cached version matches expected version
 *
 * @example
 * if (!await isPermissionVersionValid('user-123', jwtVersion)) {
 *   // Need to recompute permissions
 *   const freshPermissions = await computeUserPermissions(userId);
 *   await setUserPermissions(userId, freshPermissions);
 * }
 */
export async function isPermissionVersionValid(
  userId: string,
  expectedVersion: number
): Promise<boolean> {
  const currentVersion = await getUserPermissionVersion(userId);

  if (currentVersion === null) {
    // No version stored, consider invalid (new user or cache cleared)
    return false;
  }

  return currentVersion === expectedVersion;
}

/**
 * Get cached permissions if version matches
 *
 * Combines version check and permission retrieval into a single operation.
 * Returns permissions only if the cached version matches the expected version.
 *
 * @param userId - The user ID to get permissions for
 * @param expectedVersion - The expected version (from JWT)
 * @returns The cached permissions if version matches, null otherwise
 *
 * @example
 * const permissions = await getValidatedPermissions('user-123', jwtVersion);
 * if (!permissions) {
 *   // Cache miss or version mismatch - need to recompute
 * }
 */
export async function getValidatedPermissions(
  userId: string,
  expectedVersion: number
): Promise<UserPermissions | null> {
  // First check if version is valid
  const isValid = await isPermissionVersionValid(userId, expectedVersion);
  if (!isValid) {
    logger.debug(`[PermissionCache] Version mismatch for user ${userId}, cache invalid`);
    return null;
  }

  // Version matches, get the permissions
  return getUserPermissions(userId);
}
